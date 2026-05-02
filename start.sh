#!/usr/bin/env bash
#
# Mcpatch2 Cloud Control - 进程管理脚本
# 脚本本身作为父进程持续运行，server.js 作为子进程
# 脚本停止 -> 子进程自动跟着停止，不会产生孤儿进程
#
# 使用方法:
#   ./start.sh           后台启动（默认）
#   ./start.sh stop      停止服务
#   ./start.sh restart   重启服务
#   ./start.sh status    查看状态
#   ./start.sh logs      查看日志
#   ./start.sh run       前台运行（调试用）
#

APP_NAME="mcpatch-cloud-control"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$APP_DIR/app.pid"
LOG_FILE="$APP_DIR/server.log"
BIND_HOST="${BIND_HOST:-0.0.0.0}"
PORT="${PORT:-6000}"

RUNTIME_CMD=""
RUNTIME_VER=""
CHILD_PID=""

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
    echo "  ==========================================="
    echo "    Mcpatch2 Cloud Control Panel"
    echo "    Minecraft 云控管理后台"
    echo "  ==========================================="
    echo ""
}

pre_check() {
    if [ ! -f "$APP_DIR/server.js" ]; then
        echo "❌ 未找到 server.js"
        exit 1
    fi
    if [ ! -d "$APP_DIR/node_modules" ]; then
        echo "❌ 未找到 node_modules"
        exit 1
    fi
    if [ ! -d "$APP_DIR/db" ]; then
        mkdir -p "$APP_DIR/db"
    fi

    # 确保 .env 文件存在
    if [ ! -f "$APP_DIR/.env" ]; then
        touch "$APP_DIR/.env"
    fi

    # 自动生成 NEXTAUTH_SECRET（如果 .env 中没有）
    if ! grep -q '^NEXTAUTH_SECRET=' "$APP_DIR/.env" 2>/dev/null; then
        local secret
        secret=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null)
        if [ -n "$secret" ]; then
            echo "NEXTAUTH_SECRET=$secret" >> "$APP_DIR/.env"
            echo "🔑 已自动生成 NEXTAUTH_SECRET"
        fi
    fi

    # 自动设置 NEXTAUTH_URL（回调地址必须与实际访问地址一致）
    if ! grep -q '^NEXTAUTH_URL=' "$APP_DIR/.env" 2>/dev/null; then
        local public_url="${PUBLIC_URL:-https://auth-config.mxzysoa.com}"
        echo "NEXTAUTH_URL=${public_url}" >> "$APP_DIR/.env"
        echo "🔗 已设置 NEXTAUTH_URL=${public_url}"
    fi

    # 检查 Casdoor 配置
    if ! grep -q '^CASDOOR_ENDPOINT=' "$APP_DIR/.env" 2>/dev/null; then
        echo "# Casdoor SSO 服务器地址（注意：不是本应用地址！）" >> "$APP_DIR/.env"
        echo "CASDOOR_ENDPOINT=https://auth.mxzysoa.com" >> "$APP_DIR/.env"
        echo "CASDOOR_CLIENT_ID=902f2f23354d6928ceef" >> "$APP_DIR/.env"
        echo "CASDOOR_CLIENT_SECRET=4f757881c5def9643895eeb98571105aa38d84b1" >> "$APP_DIR/.env"
        echo "🔐 已自动配置 Casdoor 认证"
    fi

    # 确保 DATABASE_URL 指向正确的部署路径
    local expected_db_url="file:$APP_DIR/db/custom.db"
    if ! grep -qF "$expected_db_url" "$APP_DIR/.env" 2>/dev/null; then
        sed -i '/^DATABASE_URL=/d' "$APP_DIR/.env" 2>/dev/null
        echo "DATABASE_URL=$expected_db_url" >> "$APP_DIR/.env"
        echo "📂 已更新 DATABASE_URL -> $expected_db_url"
    fi

    # 自动初始化数据库
    if [ -f "$APP_DIR/init-db.js" ]; then
        "$RUNTIME_CMD" "$APP_DIR/init-db.js"
    fi

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
                    exit 0
                fi
            fi
            echo "❌ 端口 $PORT 已被占用: $(ps -p "${port_pid:-0}" -o args= 2>/dev/null)"
            exit 1
        fi
    fi

    echo "✅ 环境检查通过"
    echo "   运行时: $RUNTIME_CMD $RUNTIME_VER"
    echo "   地址:   http://${BIND_HOST}:${PORT}"
}

detect_runtime() {
    if command -v bun &>/dev/null; then
        RUNTIME_CMD="bun"
    elif command -v node &>/dev/null; then
        RUNTIME_CMD="node"
    else
        echo "❌ 未找到 Node.js 或 Bun"
        exit 1
    fi
    RUNTIME_VER=$("$RUNTIME_CMD" --version 2>/dev/null) || true
    RUNTIME_VER=$(echo "$RUNTIME_VER" | head -1)
    if [ -z "$RUNTIME_VER" ]; then
        echo "❌ $RUNTIME_CMD 版本获取失败"
        exit 1
    fi
    if [ "$RUNTIME_CMD" = "node" ]; then
        local major_ver
        major_ver=$(echo "$RUNTIME_VER" | sed -E 's/^v?([0-9]+).*/\1/')
        if [ -n "$major_ver" ] && [ "$major_ver" -lt 18 ] 2>/dev/null; then
            echo "❌ Node.js 版本过低 ($RUNTIME_VER)，需要 v18+"
            exit 1
        fi
    fi
}

run_server() {
    cd "$APP_DIR"
    > "$LOG_FILE"
    PORT="$PORT" HOSTNAME="$BIND_HOST" "$RUNTIME_CMD" server.js >> "$LOG_FILE" 2>&1 &
    CHILD_PID=$!
    echo $$ > "$PID_FILE"
    trap "
        echo ''; echo '⏹️  正在关闭...';
        kill -TERM $CHILD_PID 2>/dev/null;
        wait $CHILD_PID 2>/dev/null;
        rm -f '$PID_FILE';
        echo '✅ 已停止'; exit 0
    " SIGTERM SIGINT SIGQUIT
    wait "$CHILD_PID"
    local exit_code=$?
    rm -f "$PID_FILE"
    echo ""
    echo "❌ server.js 异常退出! (code: $exit_code)"
    if [ -s "$LOG_FILE" ]; then
        tail -30 "$LOG_FILE"
    fi
    exit 1
}

do_start() {
    print_banner
    if is_running; then
        echo "⚠️  已在运行 (PID: $(cat "$PID_FILE"))"
        return 0
    fi
    detect_runtime
    pre_check
    echo ""
    echo "🚀 启动中..."
    "$0" __daemon_run >> "$APP_DIR/manager.log" 2>&1 &
    local mgr_pid=$!
    local waited=0
    while [ $waited -lt 15 ]; do
        [ -f "$PID_FILE" ] && break
        sleep 0.5
        waited=$((waited + 1))
    done
    if ! is_running; then
        echo "❌ 启动失败:"
        tail -20 "$APP_DIR/manager.log" 2>/dev/null
        exit 1
    fi
    local pid
    pid=$(cat "$PID_FILE")
    for i in $(seq 1 30); do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo ""
            echo "❌ 管理进程异常退出!"
            tail -20 "$APP_DIR/manager.log" 2>/dev/null
            tail -20 "$LOG_FILE" 2>/dev/null
            exit 1
        fi
        if grep -q "Ready in" "$LOG_FILE" 2>/dev/null; then
            echo ""; echo "✅ 启动成功!"
            echo "   PID: $pid | 地址: http://${BIND_HOST}:${PORT}"
            echo "   日志: $LOG_FILE"
            echo "   ./start.sh stop|restart|status|logs"
            echo ""; return 0
        fi
        local http_hit=false
        for host in "127.0.0.1" "${BIND_HOST}"; do
            if command -v curl &>/dev/null && curl -s -o /dev/null "http://${host}:${PORT}/" 2>/dev/null; then
                http_hit=true; break
            fi
        done
        if $http_hit; then
            echo ""; echo "✅ 启动成功!"
            echo "   PID: $pid | 地址: http://${BIND_HOST}:${PORT}"
            echo ""; return 0
        fi
        sleep 1
    done
    if is_running; then
        echo "⚠️  进程运行但 HTTP 未响应，检查 $LOG_FILE"
    else
        echo "❌ 启动超时"; tail -30 "$LOG_FILE"
    fi
}

do_stop() {
    if ! is_running; then
        echo "ℹ️  未运行"; rm -f "$PID_FILE"; return 0
    fi
    local pid; pid=$(cat "$PID_FILE")
    echo "⏹️  停止中 (PID: $pid)..."
    kill -TERM "$pid" 2>/dev/null || true
    local w=0
    while kill -0 "$pid" 2>/dev/null; do
        sleep 1; w=$((w+1))
        [ $w -ge 15 ] && { kill -9 "$pid" 2>/dev/null; break; }
    done
    pgrep -f "server\.js" 2>/dev/null | while read -r op; do kill -9 "$op" 2>/dev/null; done
    rm -f "$PID_FILE"
    echo "✅ 已停止"
}

do_restart() { do_stop; sleep 2; do_start; }

do_status() {
    echo ""
    if is_running; then
        local pid; pid=$(cat "$PID_FILE")
        echo "  状态: ✅ 运行中"
        echo "  PID:  $pid"
        echo "  内存: $(ps -o rss= -p "$pid" 2>/dev/null | awk '{printf "%.1f MB",$1/1024}')"
        echo "  地址: http://${BIND_HOST}:${PORT}"
    else
        echo "  状态: ❌ 未运行"
    fi
    echo ""
}

do_logs() {
    if [ ! -f "$LOG_FILE" ]; then echo "无日志"; return; fi
    if is_running; then tail -f "$LOG_FILE"; else tail -50 "$LOG_FILE"; fi
}

if [ "${1:-}" = "__daemon_run" ]; then
    detect_runtime
    print_banner; pre_check; echo ""; run_server; exit $?
fi

cd "$APP_DIR"
case "${1:-start}" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_restart ;;
    status)  do_status ;;
    logs)    do_logs ;;
    run)     detect_runtime; print_banner; pre_check; echo "📌 前台模式"; run_server ;;
    *)       echo "用法: $0 {start|stop|restart|status|logs|run}"; exit 1 ;;
esac
