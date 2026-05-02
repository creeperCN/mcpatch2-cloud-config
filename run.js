/**
 * Mcpatch2 Cloud Control - 环境变量预加载器
 *
 * Next.js standalone 模式不会自动加载 .env 文件，
 * 此脚本在 server.js 启动前将 .env 中的变量注入 process.env，
 * 确保 DATABASE_URL、CASDOOR_* 等关键变量在 Prisma Client 初始化时可用。
 */
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split(/\r?\n/).forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const eqIndex = line.indexOf('=')
    if (eqIndex > 0) {
      const key = line.substring(0, eqIndex).trim()
      const val = line.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
      // 不覆盖已有的环境变量（系统环境变量优先）
      if (!(key in process.env)) {
        process.env[key] = val
      }
    }
  })
  console.log('[run.js] 已从 .env 加载环境变量')
} else {
  console.warn('[run.js] 未找到 .env 文件，使用系统环境变量')
}

require('./server.js')
