import crypto from 'crypto'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  assembleKeyFrom3Fragments,
  signData,
  verifyHMACSignature,
  validateTimestamp,
  isSignatureReplay,
  encryptConfig,
  getAesKeyFingerprint,
} from '@/lib/crypto-utils'

/**
 * 从数据库碎片还原安全密钥（运行时拼接，单次查询）
 */
async function getSecurityKeys() {
  const secConfig = await db.securityConfig.findFirst()
  if (!secConfig) return null

  // 检查碎片是否完整
  const hasHMACFrags = secConfig.hmacFrag1 && secConfig.hmacFrag2 && secConfig.hmacFrag3
  const hasRSAFrags = secConfig.rsaPrivFrag1 && secConfig.rsaPrivFrag2 && secConfig.rsaPrivFrag3

  let hmacSecret = ''
  let rsaPrivateKey = ''

  try {
    if (hasHMACFrags) {
      hmacSecret = assembleKeyFrom3Fragments(secConfig.hmacFrag1, secConfig.hmacFrag2, secConfig.hmacFrag3)
    }
    if (hasRSAFrags) {
      const rsaPrivHex = assembleKeyFrom3Fragments(secConfig.rsaPrivFrag1, secConfig.rsaPrivFrag2, secConfig.rsaPrivFrag3)
      rsaPrivateKey = Buffer.from(rsaPrivHex, 'hex').toString('utf8')
    }
  } catch {
    // 碎片还原失败
    return null
  }

  return {
    rsaPublicKey: secConfig.rsaPublicKey,
    rsaPrivateKey,
    hmacSecret,
    aesKey: secConfig.aesKey,
    certFingerprint: secConfig.certFingerprint,
  }
}

// GET /api/client - 客户端拉取当前配置（6 层安全防护）
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const requestPath = url.pathname
    const isEncrypted = url.searchParams.get('encrypt') === 'true'

    // 检查安全配置是否已初始化（单次查询）
    const secConfig = await db.securityConfig.findFirst()
    const securityEnabled = !!secConfig && !!secConfig.rsaPublicKey && !!secConfig.hmacFrag1

    // ============ API 密钥验证 ============
    const authHeader = request.headers.get('authorization')
    let apiKey = ''
    if (authHeader) {
      apiKey = authHeader.replace('Bearer ', '')
      const keyRecord = await db.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
      })
      if (!keyRecord) {
        return NextResponse.json({ error: '无效的API密钥' }, { status: 403 })
      }
    }

    // ============ Layer 2 + Layer 5: 安全模式验证 ============
    // 安全模式启用时，必须提供 API 密钥（最低要求）才能访问配置
    if (securityEnabled && !apiKey) {
      return NextResponse.json({ error: '安全模式已启用，必须提供 API 密钥' }, { status: 403 })
    }

    let isSecureMode = false
    const xSignature = request.headers.get('x-signature')
    const xTimestamp = request.headers.get('x-timestamp')

    // 预加载安全密钥（避免多次调用 getSecurityKeys）
    let securityKeys: Awaited<ReturnType<typeof getSecurityKeys>> | null = null

    if (securityEnabled && xSignature && xTimestamp) {
      isSecureMode = true

      securityKeys = await getSecurityKeys()
      if (!securityKeys || !securityKeys.hmacSecret) {
        return NextResponse.json({ error: '安全配置异常：无法还原 HMAC 密钥' }, { status: 500 })
      }

      // Layer 5: 时间戳验证（5分钟窗口）
      const tsResult = validateTimestamp(xTimestamp)
      if (!tsResult.valid) {
        return NextResponse.json({ error: `时间戳验证失败: ${tsResult.error}` }, { status: 401 })
      }

      // Layer 5: 签名去重（防重放攻击）
      if (isSignatureReplay(xSignature)) {
        return NextResponse.json({ error: '重复请求签名（疑似重放攻击）' }, { status: 401 })
      }

      // Layer 2: HMAC-SHA256 签名验证
      const hmacValid = verifyHMACSignature(
        securityKeys.hmacSecret,
        xTimestamp,
        apiKey,
        requestPath,
        xSignature
      )
      if (!hmacValid) {
        return NextResponse.json({ error: 'HMAC 签名验证失败' }, { status: 401 })
      }
    }

    // ============ 获取当前生效配置 ============
    const activeConfig = await db.cloudConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    })

    if (!activeConfig) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Security-Mode': isSecureMode ? 'secure' : 'legacy',
      }
      if (!isSecureMode && securityEnabled) {
        headers['X-Security-Warning'] = 'unsigned-request'
      }
      return NextResponse.json({ error: '暂无可用配置' }, { status: 404, headers })
    }

    // ============ 记录拉取日志 ============
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    await db.clientPullLog.create({
      data: {
        ipAddress: clientIp,
        userAgent: userAgent.substring(0, 500),
        configId: activeConfig.id,
      },
    })

    // ============ 构建响应 ============
    const yamlContent = activeConfig.yamlData
    const responseHeaders: Record<string, string> = {
      'X-Config-Version': String(activeConfig.version),
      'X-Config-Updated': activeConfig.updatedAt.toISOString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Security-Mode': isSecureMode ? 'secure' : 'legacy',
      'X-Timestamp-Server': String(Math.floor(Date.now() / 1000)),
    }

    // 无签名的安全模式下给出警告
    if (!isSecureMode && securityEnabled) {
      responseHeaders['X-Security-Warning'] = 'unsigned-request'
    }

    // ============ Layer 1: RSA-2048 签名 ============
    if (securityEnabled) {
      // 复用已加载的密钥，或重新加载
      if (!securityKeys) securityKeys = await getSecurityKeys()
      if (securityKeys && securityKeys.rsaPrivateKey && securityKeys.rsaPublicKey) {
        try {
          const signature = signData(yamlContent, securityKeys.rsaPrivateKey)
          responseHeaders['X-Config-Signature'] = signature
          responseHeaders['X-Signature-Algorithm'] = 'RSA-SHA256'
        } catch {
          // 签名失败不阻塞响应
        }
      }
    }

    // ============ Layer 4: AES-128-CBC 加密（可选，独立于 RSA/HMAC 安全模式） ============
    // AES 加密层与 securityEnabled（RSA/HMAC 开关）解耦。
    // 只要数据库中存在 aesKey 且客户端请求加密，就执行 AES 加密并返回必要的响应头。
    // 客户端通过 X-AES-Nonce / X-AES-IV 头获取解密参数。
    // AES 密钥本身不通过响应头发送，客户端需在初始化时预共享获取。
    if (isEncrypted) {
      if (!securityKeys) securityKeys = await getSecurityKeys()
      if (securityKeys && securityKeys.aesKey) {
        try {
          const { encrypted, iv } = encryptConfig(yamlContent, securityKeys.aesKey)
          responseHeaders['Content-Type'] = 'application/octet-stream'
          // AES 密钥不放入响应头，客户端需预存此密钥
          // IV 通过响应头发送（IV 本身不需要保密，仅需随机唯一）
          responseHeaders['X-AES-IV'] = iv
          // 生成 Nonce（用于客户端验证加密一致性）
          const nonce = crypto.randomBytes(16).toString('hex')
          responseHeaders['X-AES-Nonce'] = nonce
          responseHeaders['X-Encryption-Algorithm'] = 'AES-128-CBC'
          responseHeaders['X-AES-Fingerprint'] = getAesKeyFingerprint(securityKeys.aesKey)
          return new NextResponse(encrypted, {
            status: 200,
            headers: responseHeaders,
          })
        } catch {
          // 加密失败，回退到明文
        }
      }
    }

    // 返回明文 YAML
    responseHeaders['Content-Type'] = 'text/yaml; charset=utf-8'
    return new NextResponse(yamlContent, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error('[/api/client] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
