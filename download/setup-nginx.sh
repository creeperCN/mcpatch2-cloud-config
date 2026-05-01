#!/bin/bash
# ================================================================
#  Mcpatch 云控管理端 — Nginx 反向代理配置生成器
#  自动生成 Nginx 配置并安装
# ================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# 配置
APP_PORT="${APP_PORT:-3000}"
NGINX_CONF_NAME="mcpatch-cloud-control.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_CONF_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_CONF_NAME}"

read -rp "请输入域名（留空则使用 IP 模式）: " DOMAIN
read -rp "请输入服务端口 [${APP_PORT}]: " INPUT_PORT
APP_PORT="${INPUT_PORT:-$APP_PORT}"

# 生成配置
if [ -n "$DOMAIN" ]; then
    cat > /tmp/${NGINX_CONF_NAME} << NGINXEOF
# Mcpatch 云控管理端 — Nginx 反向代理
# 域名: ${DOMAIN}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL 证书（请使用 certbot 申请 Let's Encrypt 证书）
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 反向代理
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
    }

    # 限制请求体大小
    client_max_body_size 10m;

    # 访问日志
    access_log /var/log/nginx/mcpatch-cloud-control.access.log;
    error_log /var/log/nginx/mcpatch-cloud-control.error.log;
}
NGINXEOF
    info "已生成 HTTPS 配置（域名: ${DOMAIN}）"
    echo ""
    echo "    申请 SSL 证书命令:"
    echo "    sudo apt install certbot python3-certbot-nginx"
    echo "    sudo certbot --nginx -d ${DOMAIN}"
    echo ""
else
    cat > /tmp/${NGINX_CONF_NAME} << NGINXEOF
# Mcpatch 云控管理端 — Nginx 反向代理（IP 模式）

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 反向代理
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
    }

    client_max_body_size 10m;

    access_log /var/log/nginx/mcpatch-cloud-control.access.log;
    error_log /var/log/nginx/mcpatch-cloud-control.error.log;
}
NGINXEOF
    info "已生成 HTTP 配置（IP 模式，端口 ${APP_PORT}）"
fi

# 安装配置
if command -v nginx &>/dev/null; then
    sudo cp /tmp/${NGINX_CONF_NAME} "$NGINX_AVAILABLE"
    sudo ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    sudo nginx -t 2>&1 && {
        info "Nginx 配置测试通过"
        sudo systemctl reload nginx
        ok "Nginx 已重载"
    } || {
        warn "Nginx 配置测试失败，请手动检查"
    }
else
    warn "未检测到 Nginx，配置文件已保存到 /tmp/${NGINX_CONF_NAME}"
fi
