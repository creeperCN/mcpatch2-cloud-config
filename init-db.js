#!/usr/bin/env node
/**
 * 数据库初始化脚本（不依赖 prisma CLI）
 * 使用 PrismaClient.$executeRawUnsafe 直接建表（与 db.ts 的 ensureDatabase 保持一致）
 * start.sh 会在启动 server.js 之前自动调用此脚本
 */
const path = require('path');
const fs = require('fs');

const APP_DIR = path.resolve(__dirname);
const DB_DIR = path.join(APP_DIR, 'db');
const DB_PATH = path.join(DB_DIR, 'custom.db');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * 使用 better-sqlite3 直接建表（不依赖 PrismaClient，更轻量）
 * 建表语句与 Prisma schema 完全对应，确保 PrismaClient 可以正常使用
 */
function initWithSqlite3() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    return false;
  }

  const db = new Database(DB_PATH);

  // 启用 WAL 模式提升并发性能
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const sqls = [
    `CREATE TABLE IF NOT EXISTS "AdminUser" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_username_key" ON "AdminUser"("username")`,

    `CREATE TABLE IF NOT EXISTS "CloudConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "version" INTEGER NOT NULL,
      "yamlData" TEXT NOT NULL,
      "jsonData" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 0,
      "changeNote" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CloudConfig_version_key" ON "CloudConfig"("version")`,
    `CREATE INDEX IF NOT EXISTS "CloudConfig_isActive_idx" ON "CloudConfig"("isActive")`,
    `CREATE INDEX IF NOT EXISTS "CloudConfig_version_idx" ON "CloudConfig"("version" DESC)`,

    `CREATE TABLE IF NOT EXISTS "ClientPullLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ipAddress" TEXT NOT NULL,
      "userAgent" TEXT NOT NULL DEFAULT '',
      "configId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClientPullLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "CloudConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "ClientPullLog_createdAt_idx" ON "ClientPullLog"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "ClientPullLog_configId_idx" ON "ClientPullLog"("configId")`,

    `CREATE TABLE IF NOT EXISTS "ApiKey" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL,
      "name" TEXT NOT NULL DEFAULT '默认密钥',
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key")`,

    `CREATE TABLE IF NOT EXISTS "SecurityConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "rsaPublicKey" TEXT NOT NULL DEFAULT '',
      "rsaPrivateKey" TEXT NOT NULL DEFAULT '',
      "hmacSecret" TEXT NOT NULL DEFAULT '',
      "hmacFrag1" TEXT NOT NULL DEFAULT '',
      "hmacFrag2" TEXT NOT NULL DEFAULT '',
      "hmacFrag3" TEXT NOT NULL DEFAULT '',
      "rsaPrivFrag1" TEXT NOT NULL DEFAULT '',
      "rsaPrivFrag2" TEXT NOT NULL DEFAULT '',
      "rsaPrivFrag3" TEXT NOT NULL DEFAULT '',
      "aesKey" TEXT NOT NULL DEFAULT '',
      "certFingerprint" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME NOT NULL,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT NOT NULL,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`,
  ];

  for (const sql of sqls) {
    db.exec(sql);
  }

  db.close();
  return true;
}

/**
 * 使用 PrismaClient 直接建表（备用方案）
 * 适用于 better-sqlite3 不可用但 @prisma/client 可用的情况
 */
async function initWithPrismaClient() {
  let PrismaClient;
  try {
    const mod = require('@prisma/client');
    PrismaClient = mod.PrismaClient;
  } catch {
    return false;
  }

  const dbUrl = 'file:' + DB_PATH;
  const prisma = new PrismaClient({
    datasourceUrl: dbUrl,
    log: [],
  });

  try {
    const sqls = [
      `CREATE TABLE IF NOT EXISTS "AdminUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_username_key" ON "AdminUser"("username")`,

      `CREATE TABLE IF NOT EXISTS "CloudConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "version" INTEGER NOT NULL,
        "yamlData" TEXT NOT NULL,
        "jsonData" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT 0,
        "changeNote" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "CloudConfig_version_key" ON "CloudConfig"("version")`,
      `CREATE INDEX IF NOT EXISTS "CloudConfig_isActive_idx" ON "CloudConfig"("isActive")`,
      `CREATE INDEX IF NOT EXISTS "CloudConfig_version_idx" ON "CloudConfig"("version" DESC)`,

      `CREATE TABLE IF NOT EXISTS "ClientPullLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ipAddress" TEXT NOT NULL,
        "userAgent" TEXT NOT NULL DEFAULT '',
        "configId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClientPullLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "CloudConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "ClientPullLog_createdAt_idx" ON "ClientPullLog"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ClientPullLog_configId_idx" ON "ClientPullLog"("configId")`,

      `CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL DEFAULT '默认密钥',
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key")`,

      `CREATE TABLE IF NOT EXISTS "SecurityConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "rsaPublicKey" TEXT NOT NULL DEFAULT '',
        "rsaPrivateKey" TEXT NOT NULL DEFAULT '',
        "hmacSecret" TEXT NOT NULL DEFAULT '',
        "hmacFrag1" TEXT NOT NULL DEFAULT '',
        "hmacFrag2" TEXT NOT NULL DEFAULT '',
        "hmacFrag3" TEXT NOT NULL DEFAULT '',
        "rsaPrivFrag1" TEXT NOT NULL DEFAULT '',
        "rsaPrivFrag2" TEXT NOT NULL DEFAULT '',
        "rsaPrivFrag3" TEXT NOT NULL DEFAULT '',
        "aesKey" TEXT NOT NULL DEFAULT '',
        "certFingerprint" TEXT NOT NULL DEFAULT '',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME NOT NULL,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT NOT NULL,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`,
    ];

    for (const sql of sqls) {
      await prisma.$executeRawUnsafe(sql);
    }

    await prisma.$disconnect();
    return true;
  } catch (error) {
    try { await prisma.$disconnect(); } catch {}
    return false;
  }
}

async function main() {
  ensureDbDir();

  // 数据库已存在且有表 -> 跳过
  if (fs.existsSync(DB_PATH)) {
    try {
      const stat = fs.statSync(DB_PATH);
      if (stat.size > 4096) {
        console.log('  [db] 数据库已存在，跳过初始化');
        return;
      }
    } catch {}
  }

  console.log('  [db] 正在初始化数据库表结构...');

  // 方式1: better-sqlite3（同步、轻量、不需要额外依赖）
  const ok1 = initWithSqlite3();
  if (ok1) {
    console.log('  [db] 数据库初始化完成 (better-sqlite3)');
    return;
  }

  // 方式2: PrismaClient（异步、依赖 @prisma/client）
  const ok2 = await initWithPrismaClient();
  if (ok2) {
    console.log('  [db] 数据库初始化完成 (PrismaClient)');
    return;
  }

  // 两种方式都失败 -> 不阻塞启动，应用自身的 ensureDatabase() 会在运行时建表
  console.log('  [db] 预初始化未完成，将由应用运行时自动建表');
}

main().catch(err => {
  console.error('  [db] 初始化异常:', err.message);
  // 不退出，让应用运行时处理
});
