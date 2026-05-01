# ================================================================
#  Mcpatch 云控管理端 — Docker 部署
#  多阶段构建，最小化镜像体积
# ================================================================

# ---- 构建阶段 ----
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖（利用缓存层）
COPY package.json bun.lock* package-lock.json* ./
RUN npm install 2>/dev/null || bun install

# 复制源代码
COPY prisma ./prisma/
COPY src ./src/
COPY public ./public/
COPY next.config.ts next.config.mjs next.config.js tsconfig.json postcss.config.mjs tailwind.config.ts ./

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js standalone
ENV NODE_ENV=production
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner

# 安全: 使用非 root 用户
RUN addgroup -g 1001 -S mcpatch && \
    adduser -S mcpatch -u 1001 -G mcpatch

WORKDIR /app

# 仅复制运行所需文件
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static/
COPY --from=builder /app/public ./public/
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma/
COPY --from=builder /app/node_modules/.package-lock.json ./node_modules/

# 创建数据目录
RUN mkdir -p /app/data/db /app/data/logs /app/data/backups && \
    chown -R mcpatch:mcpatch /app

# 切换到非 root 用户
USER mcpatch

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/db/custom.db

# 数据卷
VOLUME ["/app/data"]

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/init || exit 1

CMD ["node", "server.js"]
