import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateCertFingerprint, formatFingerprintForJava, normalizeFingerprint } from '@/lib/crypto-utils'

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

// GET /api/security/cert-fingerprint — 获取证书指纹（需管理员登录或 API 密钥认证，客户端证书锁定用）
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

    const fingerprint = secConfig.certFingerprint

    return NextResponse.json({
      fingerprint: fingerprint || null,
      javaFormatted: fingerprint ? formatFingerprintForJava(fingerprint) : null,
      algorithm: 'SHA-256',
      description: 'HTTPS 证书 SHA-256 指纹，客户端可用于证书固定(Certificate Pinning)',
    })
  } catch (error: any) {
    console.error('[/api/security/cert-fingerprint GET] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT /api/security/cert-fingerprint — 手动设置证书指纹（管理员）
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { fingerprint } = body

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: '请提供有效的证书指纹' }, { status: 400 })
    }

    let formatted: string
    try {
      formatted = normalizeFingerprint(fingerprint)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const secConfig = await db.securityConfig.findFirst()
    if (!secConfig) {
      return NextResponse.json({ error: '安全配置未初始化' }, { status: 404 })
    }

    await db.securityConfig.update({
      where: { id: secConfig.id },
      data: { certFingerprint: formatted },
    })

    return NextResponse.json({
      success: true,
      message: '证书指纹已更新',
      fingerprint: formatted,
      javaFormatted: formatFingerprintForJava(formatted),
    })
  } catch (error: any) {
    console.error('[/api/security/cert-fingerprint] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/security/cert-fingerprint — 自动生成证书指纹（管理员）
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const secConfig = await db.securityConfig.findFirst()
    if (!secConfig) {
      return NextResponse.json({ error: '安全配置未初始化' }, { status: 404 })
    }

    const newFingerprint = generateCertFingerprint()

    await db.securityConfig.update({
      where: { id: secConfig.id },
      data: { certFingerprint: newFingerprint },
    })

    return NextResponse.json({
      success: true,
      message: '证书指纹已重新生成',
      fingerprint: newFingerprint,
      javaFormatted: formatFingerprintForJava(newFingerprint),
    })
  } catch (error: any) {
    console.error('[/api/security/cert-fingerprint POST] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
