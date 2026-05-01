#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 首次启动时自动创建 SQLite 数据库表结构
 * 关键：DATABASE_URL 必须用绝对路径，因为 Prisma 将相对路径解析为相对于 schema.prisma 的位置
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const APP_DIR = path.resolve(__dirname);
const DB_DIR = path.join(APP_DIR, 'db');
const DB_PATH = path.join(DB_DIR, 'custom.db');
const SCHEMA_PATH = path.join(APP_DIR, 'prisma', 'schema.prisma');

// 确保用绝对路径，避免 Prisma 相对路径解析问题
const ABS_DB_URL = 'file:' + DB_PATH;

function checkNeedsInit() {
    // 数据库文件不存在 -> 需要初始化
    if (!fs.existsSync(DB_PATH)) return true;
    // 尝试用 PrismaClient 查询，失败说明表不存在
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({ datasourceUrl: ABS_DB_URL });
        return prisma.adminUser
            .count()
            .then(() => { prisma.$disconnect(); return false; })
            .catch(() => { prisma.$disconnect(); return true; });
    } catch {
        return true;
    }
}

function runDbPush() {
    const env = { ...process.env, DATABASE_URL: ABS_DB_URL };

    // 方式1: 通过 .bin/prisma
    const prismaBin = path.join(APP_DIR, 'node_modules', '.bin', 'prisma');
    if (fs.existsSync(prismaBin)) {
        execSync(`"${process.execPath}" "${prismaBin}" db push --skip-generate --accept-data-loss`, {
            cwd: APP_DIR,
            env,
            stdio: 'inherit',
            timeout: 30000,
        });
        return true;
    }

    // 方式2: 直接调用 prisma build 入口
    const prismaMain = path.join(APP_DIR, 'node_modules', 'prisma', 'build', 'index.js');
    if (fs.existsSync(prismaMain)) {
        execSync(`"${process.execPath}" "${prismaMain}" db push --skip-generate --accept-data-loss`, {
            cwd: APP_DIR,
            env,
            stdio: 'inherit',
            timeout: 30000,
        });
        return true;
    }

    return false;
}

// 修正 .env 中的 DATABASE_URL 为绝对路径
function fixEnvDbUrl() {
    const envPath = path.join(APP_DIR, '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }
    // 移除旧的 DATABASE_URL 行
    content = content.replace(/^DATABASE_URL=.*$/m, '');
    // 追加绝对路径
    content = content.trimEnd() + '\nDATABASE_URL=' + ABS_DB_URL + '\n';
    fs.writeFileSync(envPath, content, 'utf8');
}

async function main() {
    if (!fs.existsSync(SCHEMA_PATH)) {
        console.log('  [db] 未找到 prisma/schema.prisma，跳过');
        return;
    }

    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

    const needsInit = await checkNeedsInit();
    if (!needsInit) {
        // 即使不需要建表，也确保 .env 中的 URL 是绝对路径
        fixEnvDbUrl();
        console.log('  [db] 数据库已就绪');
        return;
    }

    console.log('  [db] 正在初始化数据库表结构...');

    const ok = runDbPush();
    if (ok) {
        fixEnvDbUrl();
        console.log('  [db] ✅ 数据库初始化完成');
    } else {
        console.log('  [db] ⚠️  prisma CLI 未找到，请手动执行:');
        console.log('  [db]    DATABASE_URL="' + ABS_DB_URL + '" npx prisma db push');
    }
}

main().catch(e => {
    console.error('  [db] 初始化失败:', e.message);
    process.exit(1);
});
