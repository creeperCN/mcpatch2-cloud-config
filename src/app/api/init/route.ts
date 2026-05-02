import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import yaml from 'js-yaml'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateRSAKeyPair,
  generateHMACSecret,
  generateAESKey,
  splitKeyTo3Fragments,
  generateCertFingerprint,
} from '@/lib/crypto-utils'

// POST /api/init - 初始化系统（从 Casdoor SSO 会话自动获取管理员信息）
export async function POST(request: Request) {
  try {
    // ============ 认证校验：必须已通过 Casdoor SSO 登录 ============
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '请先通过统一通行证登录后再初始化系统' }, { status: 401 })
    }

    // 从 Casdoor SSO 会话中获取用户名
    const username = session.user.name || (session.user as any).id || 'admin'
    if (!username || username.length < 1) {
      return NextResponse.json({ error: '无法从登录会话中获取用户信息，请重新登录' }, { status: 400 })
    }

    // ============ 检查是否已初始化 ============
    const existingAdmin = await db.adminUser.findFirst()
    if (existingAdmin) {
      return NextResponse.json({ error: '系统已初始化，已有管理员账户' }, { status: 400 })
    }

    // ============ 6 层安全防护密钥生成（事务外，纯 CPU 操作） ============
    const { publicKey: rsaPublicKey, privateKey: rsaPrivateKey } = generateRSAKeyPair()
    const hmacSecret = generateHMACSecret()
    const hmacFrags = splitKeyTo3Fragments(hmacSecret)
    const rsaPrivHex = Buffer.from(rsaPrivateKey, 'utf8').toString('hex')
    const rsaPrivFrags = splitKeyTo3Fragments(rsaPrivHex)
    const aesKey = generateAESKey()
    const certFingerprint = generateCertFingerprint()
    const defaultKey = `mcpatch_${crypto.randomBytes(24).toString('hex')}`
    const defaultYaml = getDefaultYaml()
    const parsedData = yaml.load(defaultYaml, { schema: yaml.JSON_SCHEMA }) as object

    // ============ 使用完整事务确保所有初始化操作原子性 ============
    // 密码生成随机占位符（Casdoor SSO 模式下不使用密码登录）
    const randomPassword = crypto.randomBytes(32).toString('hex')
    const passwordHash = await bcrypt.hash(randomPassword, 12)

    const admin = await db.$transaction(async (tx) => {
      const newAdmin = await tx.adminUser.create({
        data: { username, passwordHash },
      })

      // 创建默认配置
      await tx.cloudConfig.create({
        data: {
          version: 1,
          yamlData: defaultYaml,
          jsonData: JSON.stringify(parsedData),
          isActive: true,
          changeNote: '系统初始化 - 默认配置',
        },
      })

      // 创建默认 API 密钥
      await tx.apiKey.create({
        data: { key: defaultKey, name: '默认密钥' },
      })

      // 存储安全配置（私钥和 HMAC 密钥不存储完整形式）
      await tx.securityConfig.create({
        data: {
          rsaPublicKey,
          rsaPrivateKey: '',
          hmacSecret: '',
          hmacFrag1: hmacFrags.frag1,
          hmacFrag2: hmacFrags.frag2,
          hmacFrag3: hmacFrags.frag3,
          rsaPrivFrag1: rsaPrivFrags.frag1,
          rsaPrivFrag2: rsaPrivFrags.frag2,
          rsaPrivFrag3: rsaPrivFrags.frag3,
          aesKey,
          certFingerprint,
        },
      })

      return newAdmin
    })

    return NextResponse.json({
      success: true,
      message: '系统初始化完成（已启用 6 层安全防护）',
      admin: { id: admin.id, username: admin.username },
      apiKey: defaultKey,
      security: {
        rsaKeyGenerated: true,
        hmacSecretGenerated: true,
        aesKeyGenerated: true,
        keyFragmentationEnabled: true,
        certFingerprintGenerated: true,
      },
    })
  } catch (error: any) {
    console.error('[/api/init POST] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// GET /api/init - 检查系统是否已初始化
export async function GET() {
  try {
    const adminCount = await db.adminUser.count()
    return NextResponse.json({ initialized: adminCount > 0 })
  } catch (error: any) {
    console.error('[/api/init GET] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

function getDefaultYaml(): string {
  return `# Mcpatch 云控配置文件
# 此文件由云控管理后台生成和管理

# 更新服务器地址
urls:
  - mcpatch://127.0.0.1:6700

# 客户端版本号文件路径
version-file-path: version-label.txt

# 更新失败时是否允许继续进入游戏
allow-error: false

# 无更新时是否显示提示
show-no-update-message: true

# 有更新时是否显示更新日志
show-has-update-message: true

# 自动关闭更新日志的时间（毫秒），0为手动关闭
auto-close-changelogs: 0

# 安静模式，仅下载时显示窗口
silent-mode: false

# 是否禁用界面主题
disable-theme: false

# 窗口标题
window-title: Mcpatch

# 更新起始目录
base-path: ''

# 私有协议超时时间（毫秒）
private-timeout: 7000

# HTTP协议超时时间（毫秒）
http-timeout: 7000

# HTTP自定义请求头
http-headers: {}

# 重试次数
retries: 3

# 是否忽略SSL证书验证
ignore-ssl-cert: false

# 是否忽略HTTP Content-Length校验
ignore-http-content-length: false

# 测试模式
test-mode: false

# 最大并行下载线程数（0为自动）
max-threads: 0

# 分片下载大小（字节）
chunk-size: 1048576

# 最大分片数
max-chunks: 16

# 是否启用分片下载
enable-chunked-download: true

# 是否启用防盗链鉴权
anti-hotlink-enabled: true

# 鉴权API地址
anti-hotlink-auth-url: https://auth-api.mxzysoa.com/generate-auth-url

# 鉴权有效期（秒）
anti-hotlink-expire-time: 3600

# 鉴权用户ID
anti-hotlink-uid: "0"
`
}
