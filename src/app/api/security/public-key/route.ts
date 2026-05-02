import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getPublicKeyFingerprint } from '@/lib/crypto-utils'

/**
 * 验证请求身份：管理员 Session 或 API 密钥（任一即可）
 * 管理员通过后台界面访问时使用 Session，客户端通过 API 访问时使用 API Key
 */
async function verifyAccess(request: Request): Promise<'session' | 'apikey' | null> {
  // 1. 优先检查管理员 Session
  const session = await getServerSession(authOptions)
  if (session?.user) return 'session'

  // 2. 检查 API 密钥（Authorization: Bearer <key>）
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const apiKey = authHeader.replace('Bearer ', '').trim()
    if (apiKey) {
      const keyRecord = await db.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
      })
      if (keyRecord) return 'apikey'
    }
  }

  // 3. 兼容 X-API-Key 头
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey) {
    const keyRecord = await db.apiKey.findUnique({
      where: { key: xApiKey.trim(), isActive: true },
    })
    if (keyRecord) return 'apikey'
  }

  return null
}

// GET /api/security/public-key — 导出 RSA 公钥（需管理员登录或 API 密钥认证）
export async function GET(request: Request) {
  try {
    // ============ 身份认证 ============
    const authMethod = await verifyAccess(request)
    if (!authMethod) {
      return NextResponse.json({ error: '必须提供有效的管理员登录或 API 密钥' }, { status: 403 })
    }

    const secConfig = await db.securityConfig.findFirst()
    if (!secConfig) {
      return NextResponse.json({ error: '安全配置未初始化' }, { status: 404 })
    }

    if (!secConfig.rsaPublicKey) {
      return NextResponse.json({ error: 'RSA 公钥未生成' }, { status: 404 })
    }

    const fingerprint = getPublicKeyFingerprint(secConfig.rsaPublicKey)

    return NextResponse.json({
      publicKey: secConfig.rsaPublicKey,
      format: 'PEM (SPKI)',
      keyType: 'RSA-2048',
      fingerprint,
      verification: {
        algorithm: 'RSA-SHA256',
        padding: 'PKCS1',
        header: 'X-Config-Signature',
        encoding: 'base64',
      },
      usage: '使用此公钥验证配置内容签名，确保数据未被篡改。签名附加在响应头 X-Config-Signature 中。',
    })
  } catch (error: any) {
    console.error('[/api/security/public-key] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
