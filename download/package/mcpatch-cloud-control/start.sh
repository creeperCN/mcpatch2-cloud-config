#!/usr/bin/env bash
#
# Mcpatch2 Cloud Control - 进程管理脚本
#
# 核心设计：脚本本身作为父进程持续运行，server.js 作为子进程
# 脚本停止 → 子进程自动跟着停止，不会产生孤儿进程
#
# 使用方法:
#   ./start.sh           后台启动（默认）
#   ./start.sh stop      停止服务
#   ./start.sh restart   重启服务
#   ./start.sh status    查看状态
#   ./start.sh logs      查看日志
#   ./start.sh run       前台运行（调试用，Ctrl+C 停止）
#

# ============================================================
# 配置区域（可按需修改）
# ============================================================
APP_NAME="mcpatch-cloud-control"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$APP_DIR/app.pid"
LOG_FILE="$APP_DIR/server.log"
BIND_HOST="${BIND_HOST:-0.0.0.0}"
PORT="${PORT:-6000}"

# 全局运行时变量
RUNTIME_CMD=""
RUNTIME_VER=""
CHILD_PID=""

# ============================================================
# 工具函数
# ============================================================
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

print_banner() {
    echo ""
    echo "  ╔═══════════════════════════════════════════╗"
    echo "  ║   Mcpatch2 Cloud Control Panel            ║"
    echo "  ║   Minecraft 云控管理后台                   ║"
    echo "  ╚═══════════════════════════════════════════╝"
    echo ""
}

# ============================================================
# 预检查（纯检测，不启动任何东西）
# ============================================================
pre_check() {
    if [ ! -f "$APP_DIR/server.js" ]; then
        echo "❌ 未找到 server.js，请确保在项目根目录运行此脚本"
        exit 1
    fi

    if [ ! -d "$APP_DIR/node_modules" ]; then
        echo "❌ 未找到 node_modules，文件可能不完整"
        exit 1
    fi

    if [ ! -d "$APP_DIR/db" ]; then
        mkdir -p "$APP_DIR/db"
    fi

    # 检测运行时
    RUNTIME_CMD=""
    RUNTIME_VER=""
    if command -v bun &>/dev/null; then
        RUNTIME_CMD="bun"
    elif command -v node &>/dev/null; then
        RUNTIME_CMD="node"
    else
        echo "❌ 未找到 Node.js 或 Bun 运行时"
        echo "   请先安装 Node.js (https://nodejs.org/) 或 Bun (https://bun.sh/)"
        exit 1
    fi

    RUNTIME_VER=$("$RUNTIME_CMD" --version 2>/dev/null) || true
    RUNTIME_VER=$(echo "$RUNTIME_VER" | head -1)
    if [ -z "$RUNTIME_VER" ]; then
        echo "❌ $RUNTIME_CMD 存在但无法获取版本号，运行时可能已损坏"
        exit 1
    fi

    if [ "$RUNTIME_CMD" = "node" ]; then
        local major_ver
        major_ver=$(echo "$RUNTIME_VER" | sed -E 's/^v?([0-9]+).*/\1/')
        if [ -n "$major_ver" ] && [ "$major_ver" -lt 18 ] 2>/dev/null; then
            echo "❌ Node.js 版本过低 ($RUNTIME_VER)，最低需要 v18"
            exit 1
        fi
    fi

    # 端口检查：自己的进程占了不报错
    if command -v ss &>/dev/null; then
        local port_in_use
        port_in_use=$(ss -tlnp 2>/dev/null | grep ":${PORT} " || true)
        if [ -n "$port_in_use" ]; then
            local port_pid
            port_pid=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | grep -oP 'pid=\K[0-9]+' | head -1 || true)
            if [ -n "$port_pid" ]; then
                local port_cmd
                port_cmd=$(ps -p "$port_pid" -o args= 2>/dev/null || true)
                if echo "$port_cmd" | grep -q "server\.js"; then
                    echo "$port_pid" > "$PID_FILE"
                    echo "✅ 服务已在运行中 (PID: $port_pid)"
                    echo "   地址: http://${BIND_HOST}:${PORT}"
                    echo "   (PID 文件已自动恢复)"
                    exit 0
                fi
            fi
            echo "❌ 端口 $PORT 已被其他程序占用"
            echo "   $port_in_use"
            if [ -n "$port_pid" ]; then
                echo "   占用进程 (PID $port_pid): $(ps -p "$port_pid" -o args= 2>/dev/null || echo '未知')"
            fi
            exit 1
        fi
    fi

    echo "✅ 环境检查通过"
    echo "   运行时: $RUNTIME_CMD $RUNTIME_VER"
    echo "   地址:   http://${BIND_HOST}:${PORT}"
}

# ============================================================
# 核心运行逻辑（脚本作为父进程，管理 server.js 子进程）
# 此函数会阻塞，直到子进程退出
# ============================================================
run_server() {
    cd "$APP_DIR"
    > "$LOG_FILE"

    # 启动 server.js 作为本脚本的子进程（不用 nohup，保持父子关系）
    PORT="$PORT" HOSTNAME="$BIND_HOST" "$RUNTIME_CMD" server.js >> "$LOG_FILE" 2>&1 &
    CHILD_PID=$!
    echo $$ > "$PID_FILE"

    # 注册信号处理：收到终止信号 → 转发给子进程 → 等子进程退出 → 自己退出
    trap "
        echo ''
        echo '⏹️  收到停止信号，正在关闭服务...'
        if kill -0 $CHILD_PID 2>/dev/null; then
            kill -TERM $CHILD_PID 2>/dev/null
        fi
        wait $CHILD_PID 2>/dev/null
        rm -f '$PID_FILE'
        echo '✅ 服务已停止'
        exit 0
    " SIGTERM SIGINT SIGQUIT

    # 阻塞等待子进程
    wait "$CHILD_PID"
    local exit_code=$?

    # 子进程退出了（异常崩溃）
    rm -f "$PID_FILE"
    echo ""
    echo "❌ server.js 异常退出! (exit code: $exit_code)"
    echo ""
    echo "═══ 错误日志 ═══"
    if [ -s "$LOG_FILE" ]; then
        tail -30 "$LOG_FILE"
    else
        echo "   (日志为空)"
    fi
    echo "═══════════════"
    exit 1
}

# ============================================================
# 后台启动
# ============================================================
do_start() {
    print_banner

    if is_running; then
        local pid
        pid=$(cat "$PID_FILE")
        echo "⚠️  服务已在运行中 (PID: $pid)"
        echo "   地址: http://${BIND_HOST}:${PORT}"
        return 0
    fi

    pre_check

    echo ""
    echo "🚀 正在启动服务..."
    echo ""

    # 后台启动脚本自身（脚本持续运行作为父进程）
    "$0" __daemon_run >> "$APP_DIR/manager.log" 2>&1 &
    local mgr_pid=$!

    # 等待 PID 文件出现
    local waited=0
    while [ $waited -lt 15 ]; do
        if [ -f "$PID_FILE" ]; then
            break
        fi
        sleep 0.5
        waited=$((waited + 1))
    done

    if ! is_running; then
        echo "❌ 启动失败，查看 manager.log:"
        echo ""
        tail -20 "$APP_DIR/manager.log" 2>/dev/null || echo "   (无日志)"
        rm -f "$PID_FILE"
        exit 1
    fi

    local pid
    pid=$(cat "$PID_FILE")

    # 等待 HTTP 就绪
    echo "   等待服务就绪..."
    for i in $(seq 1 30); do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo ""
            echo "❌ 管理进程异常退出!"
            echo ""
            echo "═══ manager.log ═══"
            tail -20 "$APP_DIR/manager.log" 2>/dev/null || echo "   (无日志)"
            echo "══════════════════"
            echo ""
            echo "═══ server.log ═══"
            tail -20 "$LOG_FILE" 2>/dev/null || echo "   (无日志)"
            echo "═════════════════"
            rm -f "$PID_FILE"
            exit 1
        fi

        if grep -q "Ready in" "$LOG_FILE" 2>/dev/null; then
            echo ""
            echo ""
            echo "✅ 服务启动成功!"
            echo "   管理进程 PID: $pid"
            echo "   地址:        http://${BIND_HOST}:${PORT}"
            echo "   服务日志:    $LOG_FILE"
            echo "   管理日志:    $APP_DIR/manager.log"
            echo ""
            echo "   命令:"
            echo "   ./start.sh stop     - 停止服务"
            echo "   ./start.sh restart  - 重启服务"
            echo "   ./start.sh status   - 查看状态"
            echo "   ./start.sh logs     - 查看服务日志"
            echo ""
            return 0
        fi

        local http_hit=false
        for host in "127.0.0.1" "${BIND_HOST}"; do
            if command -v curl &>/dev/null; then
                if curl -s -o /dev/null "http://${host}:${PORT}/" 2>/dev/null; then
                    http_hit=true
                    break
                fi
            elif command -v wget &>/dev/null; then
                if wget -q -O /dev/null "http://${host}:${PORT}/" 2>/dev/null; then
                    http_hit=true
                    break
                fi
            fi
        done
        if $http_hit; then
            echo ""
            echo ""
            echo "✅ 服务启动成功!"
            echo "   管理进程 PID: $pid"
            echo "   地址:        http://${BIND_HOST}:${PORT}"
            echo "   服务日志:    $LOG_FILE"
            echo "   管理日志:    $APP_DIR/manager.log"
            echo ""
            return 0
        fi

        echo -ne "   ($i/30) 等待中...\r"
        sleep 1
    done

    if is_running; then
        echo ""
        echo ""
        echo "⚠️  服务可能已启动但 HTTP 未响应"
        echo "   管理进程仍在运行 (PID: $pid)"
        echo "   日志: $LOG_FILE"
    else
        echo ""
        echo "❌ 启动超时"
        echo "═══ server.log ═══"
        tail -30 "$LOG_FILE" 2>/dev/null || echo "   (无日志)"
        echo "═════════════════"
    fi
}

# ============================================================
# 停止（杀死管理进程 → trap 自动杀 server.js）
# ============================================================
do_stop() {
    if ! is_running; then
        echo "ℹ️  服务未在运行"
        rm -f "$PID_FILE"
        return 0
    fi

    local pid
    pid=$(cat "$PID_FILE")
    echo "⏹️  正在停止服务 (PID: $pid)..."

    kill -TERM "$pid" 2>/dev/null || true

    local waited=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1
        waited=$((waited + 1))
        if [ $waited -ge 15 ]; then
            echo "   进程未响应，强制终止..."
            local children
            children=$(pgrep -P "$pid" 2>/dev/null || true)
            if [ -n "$children" ]; then
                for child_pid in $children; do
                    kill -9 "$child_pid" 2>/dev/null || true
                done
            fi
            kill -9 "$pid" 2>/dev/null || true
            break
        fi
        echo -ne "   等待进程退出... (${waited}s)\r"
    done

    local orphans
    orphans=$(pgrep -f "server\.js" 2>/dev/null | head -5 || true)
    if [ -n "$orphans" ]; then
        echo ""
        echo "   清理残留 server.js 进程..."
        echo "$orphans" | while read -r opid; do
            kill -9 "$opid" 2>/dev/null || true
        done
    fi

    rm -f "$PID_FILE"
    echo ""
    echo "✅ 服务已停止"
}

# ============================================================
# 重启
# ============================================================
do_restart() {
    echo "🔄 正在重启服务..."
    do_stop
    echo ""
    sleep 2
    do_start
}

# ============================================================
# 状态
# ============================================================
do_status() {
    echo ""
    echo "  Mcpatch2 Cloud Control - 服务状态"
    echo "  ────────────────────────────────────"
    echo ""

    if is_running; then
        local pid
        pid=$(cat "$PID_FILE")
        local mem
        mem=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' || echo "N/A")
        local uptime
        uptime=$(ps -o etime= -p "$pid" 2>/dev/null | xargs || echo "N/A")

        local child_pid=""
        local child_mem="N/A"
        local children
        children=$(pgrep -P "$pid" 2>/dev/null || true)
        if [ -n "$children" ]; then
            child_pid=$(echo "$children" | head -1)
            child_mem=$(ps -o rss= -p "$child_pid" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}' 2>/dev/null || echo "N/A")
        fi

        echo "  状态:        ✅ 运行中"
        echo "  管理进程 PID: $pid"
        echo "  管理进程内存: $mem"
        if [ -n "$child_pid" ]; then
            echo "  工作进程 PID: $child_pid"
            echo "  工作进程内存: $child_mem"
        fi
        echo "  运行时间:    $uptime"
        echo "  地址:        http://${BIND_HOST}:${PORT}"
        echo "  服务日志:    $LOG_FILE"
        echo "  管理日志:    $APP_DIR/manager.log"
    else
        echo "  状态:  ❌ 未运行"
        echo ""
        echo "  使用 ./start.sh 启动服务"
    fi
    echo ""
}

# ============================================================
# 日志
# ============================================================
do_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "ℹ️  暂无日志文件"
        return 0
    fi

    if is_running; then
        echo "📄 实时日志 (Ctrl+C 退出):"
        echo "───────────────────────────────────"
        tail -f "$LOG_FILE"
    else
        echo "📄 历史日志 (最后 50 行):"
        echo "───────────────────────────────────"
        tail -50 "$LOG_FILE"
    fi
}

# ============================================================
# 隐藏的 daemon 运行模式
# ============================================================
if [ "${1:-}" = "__daemon_run" ]; then
    print_banner
    pre_check
    echo ""
    run_server
    exit $?
fi

# ============================================================
# 主入口
# ============================================================
cd "$APP_DIR"

case "${1:-start}" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    status)
        do_status
        ;;
    logs)
        do_logs
        ;;
    run)
        print_banner
        pre_check
        echo ""
        echo "📌 前台模式运行中 (Ctrl+C 停止)"
        echo ""
        run_server
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|run}"
        echo ""
        echo "  start   - 后台启动服务（默认）"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看状态"
        echo "  logs    - 查看/跟踪服务日志"
        echo "  run     - 前台运行（调试用）"
        exit 1
        ;;
esac
