#!/bin/bash
# ================================================================
#  Mcpatch 云控管理端 — 生产环境启动脚本
#  适用: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Alpine 3.16+
#  用法:
#    ./start.sh              # 前台启动（调试用）
#    ./start.sh -d           # 后台守护进程启动
#    ./start.sh stop         # 停止服务
#    ./start.sh restart      # 重启服务
#    ./start.sh status       # 查看运行状态
#    ./start.sh logs         # 查看实时日志
#    ./start.sh build        # 构建生产版本
#    ./start.sh update       # 拉取代码并重新构建
#    ./start.sh backup       # 备份数据库
# ================================================================

set -euo pipefail

# ===================== 配置区域 =====================
APP_NAME="mcpatch-cloud-control"
APP_DIR="/opt/mcpatch-cloud-control"       # 应用安装目录
DATA_DIR="/opt/mcpatch-cloud-control/data"  # 数据目录（数据库、日志）
LOG_DIR="${DATA_DIR}/logs"
DB_DIR="${DATA_DIR}/db"
PID_FILE="${DATA_DIR}/${APP_NAME}.pid"
LOG_FILE="${LOG_DIR}/server.log"
BACKUP_DIR="${DATA_DIR}/backups"
NODE_ENV="production"
PORT="${PORT:-3000}"
MAX_LOG_SIZE=$((50 * 1024 * 1024))  # 日志轮转: 50MB
MAX_LOG_FILES=5                       # 保留最近 5 个日志文件
# ====================================================

# ===================== 颜色输出 =====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

# ===================== 环境检测 =====================
check_environment() {
    info "检查运行环境..."

    # 检测 Node.js
    if command -v node &>/dev/null; then
        local node_ver
        node_ver=$(node --version 2>/dev/null | sed 's/v//')
        local node_major
        node_major=$(echo "$node_ver" | cut -d. -f1)
        if [ "$node_major" -ge 18 ]; then
            ok "Node.js $(node --version)"
        else
            error "Node.js 版本过低 (当前: $node_ver, 需要 >= 18.0)"
            error "请访问 https://nodejs.org 安装 Node.js 18+"
            exit 1
        fi
    elif command -v bun &>/dev/null; then
        ok "Bun $(bun --version)（将使用 Bun 运行）"
    else
        error "未检测到 Node.js 或 Bun 运行时"
        error "请先安装 Node.js 18+: https://nodejs.org"
        exit 1
    fi

    # 检测包管理器（用于构建）
    if ! command -v npm &>/dev/null && ! command -v bun &>/dev/null && ! command -v yarn &>/dev/null; then
        error "未检测到 npm/bun/yarn 包管理器"
        exit 1
    fi

    # 检测 git（用于更新）
    if ! command -v git &>/dev/null; then
        warn "未检测到 git，update 命令将不可用"
    fi

    # 检测端口占用
    if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
        local occupying_pid
        occupying_pid=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | head -1 | grep -oP 'pid=\K[0-9]+' || echo "")
        if [ -n "$occupying_pid" ] && [ -f "$PID_FILE" ]; then
            local stored_pid
            stored_pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
            if [ "$occupying_pid" = "$stored_pid" ]; then
                warn "端口 $PORT 已被本服务占用 (PID: $occupying_pid)，请先执行 ./start.sh stop"
            else
                warn "端口 $PORT 被其他进程占用 (PID: $occupying_pid)，可能导致启动失败"
            fi
        elif [ -n "$occupying_pid" ]; then
            warn "端口 $PORT 被进程 $occupying_pid 占用"
        fi
    fi

    # 检测可用内存
    local mem_available
    if [ -f /proc/meminfo ]; then
        mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        if [ "$mem_available" -lt 200000 ]; then
            warn "可用内存不足 200MB (${mem_available}KB)，可能出现性能问题"
        fi
    fi
}

# ===================== 目录初始化 =====================
init_directories() {
    info "初始化目录结构..."
    mkdir -p "$DATA_DIR" "$LOG_DIR" "$DB_DIR" "$BACKUP_DIR"
    ok "目录结构已就绪"
}

# ===================== 环境变量 =====================
setup_env() {
    local env_file="${APP_DIR}/.env"
    local env_example="${APP_DIR}/.env.example"

    if [ ! -f "$env_file" ]; then
        info "创建 .env 配置文件..."
        cat > "$env_file" << ENVEOF
# ================================================================
#  Mcpatch 云控管理端 — 环境配置
#  首次部署请根据实际情况修改以下配置
# ================================================================

# 数据库路径（SQLite，推荐使用绝对路径）
DATABASE_URL=file:${DB_DIR}/custom.db

# NextAuth 密钥（JWT 签名使用，必须为随机字符串！）
# 自动生成：
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# 服务端口
PORT=${PORT}

# 运行环境（生产环境请勿修改）
NODE_ENV=production
ENVEOF
        ok ".env 配置文件已创建"
        warn "请检查 ${APP_DIR}/.env 中的配置项"
    else
        ok ".env 配置文件已存在"
    fi

    # 确保 NEXTAUTH_SECRET 存在
    if ! grep -q "NEXTAUTH_SECRET=" "$env_file" || grep -q "NEXTAUTH_SECRET=$" "$env_file"; then
        local new_secret
        new_secret=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=${new_secret}|" "$env_file" || \
            echo "NEXTAUTH_SECRET=${new_secret}" >> "$env_file"
        info "已自动生成 NEXTAUTH_SECRET"
    fi

    # 确保 DATABASE_URL 指向正确路径
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=file:${DB_DIR}/custom.db|" "$env_file" 2>/dev/null || true
}

# ===================== 数据库 =====================
init_database() {
    if [ ! -f "${DB_DIR}/custom.db" ]; then
        info "初始化数据库..."
        cd "$APP_DIR" || exit 1
        npx prisma db push --skip-generate 2>&1 || \
        npx prisma migrate deploy 2>&1 || \
            warn "数据库初始化可能需要手动处理"
        ok "数据库已初始化"
    else
        ok "数据库已存在"
    fi
}

# ===================== 构建生产版本 =====================
do_build() {
    info "开始构建生产版本..."
    cd "$APP_DIR" || exit 1

    # 安装依赖
    info "安装依赖..."
    npm install --production=false 2>&1 || \
    bun install --no-save 2>&1

    # 生成 Prisma Client
    info "生成 Prisma Client..."
    npx prisma generate 2>&1

    # 构建 Next.js
    info "构建 Next.js standalone..."
    NODE_ENV=production npx next build 2>&1

    # 复制静态资源到 standalone 目录
    info "复制静态资源..."
    rm -rf .next/standalone/.next/static 2>/dev/null
    cp -r .next/static .next/standalone/.next/
    cp -r public .next/standalone/ 2>/dev/null || true

    ok "构建完成！输出: ${APP_DIR}/.next/standalone/"
}

# ===================== 日志轮转 =====================
rotate_logs() {
    if [ -f "$LOG_FILE" ]; then
        local log_size
        log_size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
        if [ "$log_size" -gt "$MAX_LOG_SIZE" ]; then
            info "日志文件超过 ${MAX_LOG_SIZE} 字节，执行轮转..."
            for i in $(seq $((MAX_LOG_FILES - 1)) -1 1); do
                [ -f "${LOG_FILE}.${i}" ] && mv "${LOG_FILE}.${i}" "${LOG_FILE}.$((i + 1))"
            done
            mv "$LOG_FILE" "${LOG_FILE}.1"
            ok "日志已轮转"
        fi
    fi
}

# ===================== 进程管理 =====================
get_runtime() {
    if command -v bun &>/dev/null; then
        echo "bun"
    else
        echo "node"
    fi
}

start_server() {
    # 检查是否已在运行
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            error "服务已在运行 (PID: $pid)"
            exit 1
        else
            warn "PID 文件残留，清理..."
            rm -f "$PID_FILE"
        fi
    fi

    check_environment
    init_directories
    setup_env
    init_database
    rotate_logs

    local runtime
    runtime=$(get_runtime)

    info "启动 ${APP_NAME}..."
    info "运行时: $runtime | 端口: $PORT | 模式: $NODE_ENV"

    cd "$APP_DIR" || exit 1

    if [ "$1" = "-d" ] || [ "$1" = "--daemon" ]; then
        # 后台守护进程模式
        export NODE_ENV="$NODE_ENV"
        export PORT="$PORT"
        nohup $runtime .next/standalone/server.js >> "$LOG_FILE" 2>&1 &
        local pid=$!
        echo "$pid" > "$PID_FILE"

        # 等待启动
        local retries=0
        local max_retries=30
        while [ $retries -lt $max_retries ]; do
            if ! kill -0 "$pid" 2>/dev/null; then
                error "服务启动失败！请查看日志: $LOG_FILE"
                rm -f "$PID_FILE"
                exit 1
            fi
            if curl -s --max-time 2 "http://127.0.0.1:${PORT}/api/init" >/dev/null 2>&1; then
                ok "服务已启动 (PID: $pid)"
                ok "访问地址: http://0.0.0.0:${PORT}"
                ok "日志文件: $LOG_FILE"
                return 0
            fi
            sleep 1
            retries=$((retries + 1))
        done
        warn "服务进程已启动 (PID: $pid)，但健康检查超时"
        warn "请手动检查: curl http://127.0.0.1:${PORT}/api/init"
    else
        # 前台模式
        info "前台模式运行，按 Ctrl+C 停止..."
        export NODE_ENV="$NODE_ENV"
        export PORT="$PORT"
        exec $runtime .next/standalone/server.js
    fi
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        # 尝试通过端口查找进程
        local port_pid
        port_pid=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | head -1 | grep -oP 'pid=\K[0-9]+' || echo "")
        if [ -n "$port_pid" ]; then
            info "通过端口找到进程 (PID: $port_pid)，正在停止..."
            kill "$port_pid" 2>/dev/null
            sleep 3
            kill -9 "$port_pid" 2>/dev/null
            ok "服务已停止"
        else
            warn "服务未在运行"
        fi
        return 0
    fi

    local pid
    pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [ -z "$pid" ]; then
        rm -f "$PID_FILE"
        warn "服务未在运行"
        return 0
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$PID_FILE"
        warn "进程 $pid 不存在，清理 PID 文件"
        return 0
    fi

    info "正在停止服务 (PID: $pid)..."
    kill "$pid" 2>/dev/null

    # 等待进程退出（最多 15 秒）
    local retries=0
    while [ $retries -lt 15 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            rm -f "$PID_FILE"
            ok "服务已优雅停止"
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
    done

    warn "进程未响应 SIGTERM，发送 SIGKILL..."
    kill -9 "$pid" 2>/dev/null
    rm -f "$PID_FILE"
    ok "服务已强制停止"
}

restart_server() {
    info "重启服务..."
    stop_server
    sleep 2
    start_server -d
}

show_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Mcpatch 云控管理端 — 服务状态${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    local is_running=false
    local pid=""

    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            is_running=true
        fi
    fi

    if [ "$is_running" = true ]; then
        echo -e "  状态:      ${GREEN}● 运行中${NC}"
        echo -e "  PID:       ${pid}"
        echo -e "  端口:      ${PORT}"
        echo -e "  运行时:    $(get_runtime)"
        echo -e "  数据目录:  ${DATA_DIR}"
        echo -e "  日志文件:  ${LOG_FILE}"
        echo ""

        # 内存占用
        local mem
        mem=$(ps -p "$pid" -o rss= 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' || echo "N/A")
        echo -e "  内存占用:  ${mem}"

        # 运行时长
        local etime
        etime=$(ps -p "$pid" -o etime= 2>/dev/null | xargs || echo "N/A")
        echo -e "  运行时长:  ${etime}"

        # 健康检查
        local http_code
        http_code=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/init" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            echo -e "  健康检查:  ${GREEN}通过${NC}"
        else
            echo -e "  健康检查:  ${RED}失败 (HTTP ${http_code})${NC}"
        fi
    else
        echo -e "  状态:      ${RED}● 未运行${NC}"
        [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi

    # 数据库大小
    if [ -f "${DB_DIR}/custom.db" ]; then
        local db_size
        db_size=$(du -sh "${DB_DIR}/custom.db" 2>/dev/null | cut -f1)
        echo -e "  数据库:    ${db_size}"
    fi

    # 日志大小
    if [ -f "$LOG_FILE" ]; then
        local log_size
        log_size=$(du -sh "$LOG_FILE" 2>/dev/null | cut -f1)
        echo -e "  日志大小:  ${log_size}"
    fi

    # 备份列表
    local backup_count
    backup_count=$(ls -1 "$BACKUP_DIR"/ 2>/dev/null | wc -l)
    echo -e "  备份数量:  ${backup_count}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""
}

show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        warn "日志文件不存在: $LOG_FILE"
        return 1
    fi

    info "实时日志 (按 Ctrl+C 退出)..."
    tail -f "$LOG_FILE"
}

do_backup() {
    init_directories
    if [ ! -f "${DB_DIR}/custom.db" ]; then
        warn "数据库文件不存在，无需备份"
        return 1
    fi

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/custom_${timestamp}.db"

    info "备份数据库..."
    cp "${DB_DIR}/custom.db" "$backup_file"
    ok "备份完成: $backup_file"

    # 压缩旧备份（保留最新 10 个）
    local total_backups
    total_backups=$(ls -1 "$BACKUP_DIR"/custom_*.db 2>/dev/null | wc -l)
    if [ "$total_backups" -gt 10 ]; then
        info "清理旧备份（保留最新 10 个）..."
        ls -1t "$BACKUP_DIR"/custom_*.db | tail -n +11 | xargs rm -f 2>/dev/null
        ok "清理完成"
    fi
}

do_update() {
    if ! command -v git &>/dev/null; then
        error "需要 git 来执行更新"
        exit 1
    fi

    info "停止服务..."
    stop_server

    info "拉取最新代码..."
    cd "$APP_DIR" || exit 1
    git pull origin main 2>&1 || git pull origin master 2>&1 || \
        error "代码拉取失败，请检查 git 仓库配置"

    info "重新构建..."
    do_build

    info "启动服务..."
    start_server -d
    ok "更新完成！"
}

# ===================== 安装向导 =====================
do_install() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Mcpatch 云控管理端 — 部署安装向导${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""

    # 检测是否已安装
    if [ -f "${APP_DIR}/.next/standalone/server.js" ]; then
        warn "检测到已有安装: ${APP_DIR}"
        read -rp "是否重新安装？(y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            info "取消安装"
            return 0
        fi
    fi

    # 确定源代码位置
    local source_dir
    source_dir=$(cd "$(dirname "$0")/.." && pwd)
    if [ ! -f "${source_dir}/package.json" ]; then
        source_dir=$(cd "$(dirname "$0")/../.." && pwd)
    fi

    if [ ! -f "${source_dir}/package.json" ]; then
        echo ""
        read -rp "请输入源代码目录路径 [${source_dir}]: " input_dir
        source_dir="${input_dir:-$source_dir}"
    fi

    if [ ! -f "${source_dir}/package.json" ]; then
        error "未找到 package.json，请确认源代码路径"
        exit 1
    fi

    info "源代码目录: ${source_dir}"

    # 复制或链接代码
    if [ "$source_dir" != "$APP_DIR" ]; then
        info "复制项目文件到 ${APP_DIR}..."
        mkdir -p "$APP_DIR"
        # 复制必要文件
        cp -r "${source_dir}/.next" "$APP_DIR/" 2>/dev/null || true
        cp -r "${source_dir}/prisma" "$APP_DIR/" 2>/dev/null || true
        cp -r "${source_dir}/public" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/package.json" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/next.config.ts" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/next.config.mjs" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/next.config.js" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/tsconfig.json" "$APP_DIR/" 2>/dev/null || true
        cp "${source_dir}/.env" "$APP_DIR/" 2>/dev/null || true

        # 复制 standalone
        if [ -d "${source_dir}/.next/standalone" ]; then
            cp -r "${source_dir}/.next/standalone" "$APP_DIR/.next/" 2>/dev/null || true
            ok "Standalone 构建已复制"
        fi

        # 复制源代码目录（用于后续更新构建）
        cp -r "${source_dir}/src" "$APP_DIR/" 2>/dev/null || true
    else
        ok "已在安装目录中"
    fi

    init_directories
    setup_env
    do_build
    init_database

    echo ""
    ok "安装完成！"
    echo ""
    echo -e "  启动命令: ${GREEN}./start.sh -d${NC}"
    echo -e "  查看状态: ${GREEN}./start.sh status${NC}"
    echo -e "  查看日志: ${GREEN}./start.sh logs${NC}"
    echo -e "  停止服务: ${GREEN}./start.sh stop${NC}"
    echo ""
}

# ===================== 卸载 =====================
do_uninstall() {
    echo ""
    warn "此操作将删除所有应用数据（数据库、日志、备份）！"
    read -rp "确定要卸载吗？输入 'UNINSTALL' 确认: " confirm
    if [ "$confirm" != "UNINSTALL" ]; then
        info "取消卸载"
        return 0
    fi

    stop_server 2>/dev/null
    rm -rf "$DATA_DIR"
    ok "数据已清理"
}

# ===================== 帮助信息 =====================
show_help() {
    echo ""
    echo -e "${CYAN}Mcpatch 云控管理端 — 生产环境管理脚本${NC}"
    echo ""
    echo "用法: $0 <命令>"
    echo ""
    echo -e "  ${GREEN}start -d${NC}       后台启动服务"
    echo -e "  ${GREEN}start${NC}           前台启动服务（调试模式）"
    echo -e "  ${GREEN}stop${NC}            停止服务"
    echo -e "  ${GREEN}restart${NC}         重启服务"
    echo -e "  ${GREEN}status${NC}          查看运行状态和系统信息"
    echo -e "  ${GREEN}logs${NC}            查看实时日志"
    echo -e "  ${GREEN}build${NC}           构建生产版本"
    echo -e "  ${GREEN}backup${NC}          备份数据库"
    echo -e "  ${GREEN}update${NC}          拉取代码并重新构建（需 git）"
    echo -e "  ${GREEN}install${NC}         首次部署安装向导"
    echo -e "  ${GREEN}uninstall${NC}       卸载（删除所有数据）"
    echo -e "  ${GREEN}help${NC}            显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  PORT          服务端口 (默认: 3000)"
    echo "  APP_DIR       应用安装目录 (默认: /opt/mcpatch-cloud-control)"
    echo ""
    echo "示例:"
    echo "  PORT=8080 ./start.sh -d        # 使用 8080 端口启动"
    echo "  ./start.sh status              # 查看状态"
    echo "  ./start.sh logs                # 实时日志"
    echo ""
}

# ===================== 主入口 =====================
case "${1:-}" in
    start)
        start_server "${2:-}"
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    build)
        do_build
        ;;
    backup)
        do_backup
        ;;
    update)
        do_update
        ;;
    install)
        do_install
        ;;
    uninstall)
        do_uninstall
        ;;
    -d|--daemon)
        # 兼容: ./start.sh -d
        start_server -d
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        # 无参数时显示帮助
        show_help
        ;;
    *)
        error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
