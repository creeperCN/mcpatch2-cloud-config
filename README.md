# Mcpatch2 Cloud Control Panel

> Minecraft 云控配置管理后台 — 为 [Mcpatch2 Java Client](https://github.com/mxzyTeam/Mcpatch2JavaClient) 提供云端配置下发、加密传输与安全防护。

## 项目简介

Mcpatch2 Cloud Control Panel 是一个基于 Next.js 16 构建的 Web 管理后台，用于集中管理 Mcpatch2 Java 客户端的运行配置。管理员通过 Web 界面发布配置版本，Java 客户端启动时从云端拉取加密配置，实现配置的统一管理和安全分发。

### 核心能力

- **配置版本管理** — YAML 配置的创建、编辑、版本控制、一键切换活跃版本
- **六层安全防护** — RSA 签名、HMAC 请求签名、密钥碎片化存储、AES 加密传输、时间戳防重放、HTTPS 证书锁定
- **API 密钥管理** — 生成、启用/禁用、删除 API 密钥，控制客户端访问权限
- **客户端拉取日志** — 记录每次客户端拉取的 IP、User-Agent、配置版本、时间
- **仪表盘统计** — 拉取总量、今日拉取、7 天趋势图、最近拉取记录
- **Casdoor SSO 集成** — 支持通过 Casdoor 统一认证平台登录
- **一键启动部署** — 内置 start.sh 脚本，支持启动/停止/重启/状态查看/日志查看

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16.1 (App Router) |
| UI 组件 | React 19 + Tailwind CSS 4 + shadcn/ui |
| 后端运行时 | Node.js 18+ / Bun |
| 数据库 | SQLite (通过 Prisma ORM) |
| 认证 | NextAuth v4 (Credentials + Casdoor OAuth) |
| 部署方式 | Standalone 模式 (一键脚本) |

## 快速开始

### 环境要求

- Node.js >= 18 或 Bun
- 服务器需开放指定端口（默认 6000）

### 一键部署（推荐）

```bash
# 1. 下载并解压
tar -xzf mcpatch-cloud-control.tar.gz
cd mcpatch-cloud-control

# 2. 编辑环境配置（按需修改）
vim .env

# 3. 启动服务
chmod +x start.sh
./start.sh

# 4. 访问 Web 界面
# 浏览器打开 http://你的服务器IP:6000
```

### start.sh 管理命令

```bash
./start.sh           # 后台启动（默认）
./start.sh stop      # 停止服务
./start.sh restart   # 重启服务
./start.sh status    # 查看运行状态
./start.sh logs      # 实时查看日志
./start.sh run       # 前台运行（调试用）
```

### 环境变量配置

首次启动时 `start.sh` 会自动生成 `NEXTAUTH_SECRET` 和 `CASDOOR_*` 配置。如需手动配置：

```bash
# .env 文件
DATABASE_URL=file:./db/custom.db          # SQLite 数据库路径
NEXTAUTH_SECRET=your-random-secret         # JWT 签名密钥
NEXTAUTH_URL=https://your-domain.com       # 你的域名（Casdoor 回调需要）
PORT=6000                                  # 服务端口
CASDOOR_ENDPOINT=https://auth.example.com  # Casdoor SSO 地址
CASDOOR_CLIENT_ID=your-client-id          # Casdoor 应用 ID
CASDOOR_CLIENT_SECRET=your-client-secret  # Casdoor 应用密钥
```

## 首次使用流程

1. **访问页面** — 浏览器打开 `http://服务器IP:6000`
2. **系统初始化** — 首次访问会进入初始化向导，设置管理员用户名和密码
3. **完成初始化** — 系统自动生成 API 密钥和六层安全密钥，记录好 API 密钥
4. **登录管理** — 使用管理员账号登录后即可管理配置
5. **发布配置** — 在「配置管理」中创建配置版本，粘贴 mcpatch.yml 内容并发布
6. **安全初始化** — 在「安全防护」中查看六层安全密钥状态，完成密钥轮换等操作

## 功能模块

### 仪表盘

- 拉取总量、今日拉取数、活跃配置版本号
- 最近 7 天拉取趋势图
- 最近 10 条拉取记录（快速跳转到完整日志）

### 配置管理

- 创建新的配置版本（版本号自动递增）
- YAML 编辑器，支持配置预览
- 配置版本历史，显示每个版本的创建时间、修改时间、被拉取次数
- 一键切换活跃版本（客户端将拉取活跃版本的配置）
- 配置差异对比

### API 密钥管理

- 生成新的 API 密钥（自动生成高熵随机密钥）
- 启用/禁用密钥（禁用后客户端无法使用该密钥拉取配置）
- 删除密钥
- 显示密钥创建时间和状态

### 拉取日志

- 记录每次客户端拉取的详细信息：IP 地址、User-Agent、配置版本、时间
- 分页展示，支持刷新

### 安全防护（六层防御体系）

| 层级 | 防护 | 说明 |
|------|------|------|
| Layer 1 | RSA-2048 签名 | 服务端使用 RSA 私钥对配置内容签名，客户端用公钥验证，防止配置被中间人篡改 |
| Layer 2 | HMAC-SHA256 请求签名 | 客户端请求时附带 HMAC 签名，防止 API 被第三方直接调用 |
| Layer 3 | 密钥碎片化存储 | HMAC 密钥和 RSA 私钥被拆分为 3 个 XOR 碎片存储在数据库中，运行时动态还原 |
| Layer 4 | AES-128-CBC 加密 | 客户端请求加密响应时，服务端使用 AES 加密配置内容，防止传输中被窃听 |
| Layer 5 | 时间戳防重放 | 请求签名中包含时间戳，5 分钟窗口验证 + 签名去重缓存，防止重放攻击 |
| Layer 6 | HTTPS 证书锁定 | 支持配置服务端 HTTPS 证书的 SHA-256 指纹，客户端可据此进行证书锁定验证 |

安全模块功能：
- 查看 RSA 公钥/私钥指纹
- 查看/复制 AES 密钥指纹（用于客户端验证密钥一致性）
- 查看/复制 HMAC 密钥碎片
- 查看/复制 RSA 私钥碎片
- 轮换 HMAC 密钥（自动生成新密钥并碎片化存储）
- 轮换 AES 密钥
- 配置 HTTPS 证书指纹

## 客户端 API 接口

### 拉取配置（明文）

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://your-server:6000/api/client
```

响应头：
```
X-Config-Version: 5
X-Config-Signature: <RSA-SHA256 Base64>
X-Signature-Algorithm: RSA-SHA256
```

响应体：`text/yaml` 明文 YAML 配置

### 拉取配置（AES 加密）

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://your-server:6000/api/client?encrypt=true \
     --output encrypted_config.bin
```

响应头：
```
Content-Type: application/octet-stream
X-AES-IV: <32位十六进制IV>
X-AES-Fingerprint: <AES密钥SHA-256指纹，格式 AA:BB:CC:...>
X-Config-Version: 5
X-Config-Signature: <RSA-SHA256 Base64>
```

响应体：Base64 编码的 AES-128-CBC 密文

### HMAC 签名请求（完整安全模式）

```bash
# 计算签名
TIMESTAMP=$(date +%s)
API_KEY="your-api-key"
HMAC_SECRET="your-hmac-secret"
REQUEST_PATH="/api/client"
SIGNATURE=$(echo -n "${TIMESTAMP}${API_KEY}${REQUEST_PATH}" | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print $2}')

# 发起请求
curl -H "Authorization: Bearer $API_KEY" \
     -H "X-Timestamp: $TIMESTAMP" \
     -H "X-Signature: $SIGNATURE" \
     "http://your-server:6000/api/client?encrypt=true"
```

## 开发指南

### 项目结构

```
mcpatch-cloud-control/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 主页面（仪表盘、配置管理、API 密钥、拉取日志、安全防护）
│   │   ├── login/page.tsx      # 登录页
│   │   └── api/                # API 路由
│   │       ├── client/route.ts       # 客户端拉取配置接口（六层安全防护）
│   │       ├── config/route.ts       # 配置 CRUD
│   │       ├── config/history/route.ts  # 配置版本历史
│   │       ├── init/route.ts         # 系统初始化
│   │       ├── keys/route.ts         # API 密钥管理
│   │       ├── logs/route.ts         # 拉取日志查询
│   │       ├── security/route.ts     # 安全配置管理
│   │       ├── security/public-key/route.ts   # RSA 公钥查询
│   │       ├── security/details/route.ts      # 安全密钥详情
│   │       ├── security/cert-fingerprint/route.ts  # 证书指纹
│   │       ├── security/rotate-hmac/route.ts    # HMAC 密钥轮换
│   │       ├── security/rotate-aes/route.ts     # AES 密钥轮换
│   │       └── stats/route.ts        # 统计数据
│   ├── components/              # React 组件
│   │   └── ui/                   # shadcn/ui 组件库
│   ├── lib/
│   │   ├── auth.ts              # NextAuth 认证配置
│   │   ├── db.ts                # Prisma 数据库连接 + 自动建表
│   │   ├── crypto-utils.ts      # 六层安全加密工具
│   │   └── utils.ts             # 通用工具函数
│   └── hooks/                   # React Hooks
├── prisma/
│   └── schema.prisma            # 数据库模型定义
├── init-db.js                   # 数据库初始化脚本（不依赖 prisma CLI）
├── start.sh                     # 一键启动/管理脚本
├── .env.example                 # 环境变量模板
└── package.json
```

### 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma generate

# 复制环境变量
cp .env.example .env
# 编辑 .env 填入实际配置

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 构建 Standalone 包

```bash
npm run build -- --webpack
cp -a .next/standalone/. package/
cp -r .next/static package/.next/
cp -r public package/
cp init-db.js package/
cp start.sh package/

# 打包
tar -czf mcpatch-cloud-control.tar.gz package/
```

## 数据库模型

| 模型 | 说明 |
|------|------|
| `AdminUser` | 管理员账户（用户名 + bcrypt 密码哈希） |
| `CloudConfig` | 云控配置版本（YAML 数据 + JSON 数据 + 版本号 + 活跃标记） |
| `ClientPullLog` | 客户端拉取日志（IP + User-Agent + 配置版本 + 时间） |
| `ApiKey` | API 访问密钥（密钥值 + 名称 + 启用状态） |
| `SecurityConfig` | 安全配置（RSA 密钥对 + HMAC 密钥碎片 + AES 密钥 + 证书指纹） |

## 相关项目

- [Mcpatch2JavaClient](https://github.com/mxzyTeam/Mcpatch2JavaClient) — Mcpatch2 Java 更新客户端

## 许可证

MIT License
