import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateRSAKeyPair, splitKeyTo3Fragments, getPublicKeyFingerprint, getAesKeyFingerprint } from '@/lib/crypto-utils'

// GET /api/security — 获取 6 层安全防护状态总览（管理员）
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const secConfig = await db.securityConfig.findFirst()
    if (!secConfig) {
      return NextResponse.json({
        initialized: false,
        layers: {
          rsaSignature:    { enabled: false, status: 'not_initialized', description: 'RSA-2048 配置签名验证' },
          hmacSigning:     { enabled: false, status: 'not_initialized', description: 'HMAC-SHA256 请求签名' },
          keyFragmentation:{ enabled: false, status: 'not_initialized', description: '密钥碎片化分散存储' },
          aesEncryption:   { enabled: false, status: 'not_initialized', description: 'AES-128 缓存加密' },
          antiReplay:      { enabled: false, status: 'not_initialized', description: '时间戳防重放' },
          certPinning:     { enabled: false, status: 'not_initialized', description: 'HTTPS 证书锁定' },
        },
      })
    }

    const hasHMACFrags = !!(secConfig.hmacFrag1 && secConfig.hmacFrag2 && secConfig.hmacFrag3)
    const hasRSAFrags = !!(secConfig.rsaPrivFrag1 && secConfig.rsaPrivFrag2 && secConfig.rsaPrivFrag3)

    let rsaFingerprint = ''
    if (secConfig.rsaPublicKey) {
      rsaFingerprint = getPublicKeyFingerprint(secConfig.rsaPublicKey)
    }

    let aesFingerprint = ''
    if (secConfig.aesKey) {
      aesFingerprint = getAesKeyFingerprint(secConfig.aesKey)
    }

    return NextResponse.json({
      initialized: true,
      layers: {
        rsaSignature: {
          enabled: !!secConfig.rsaPublicKey,
          status: secConfig.rsaPublicKey ? 'active' : 'not_initialized',
          description: 'RSA-2048 配置签名验证',
          keyType: 'RSA-2048',
          algorithm: 'SHA256',
          fingerprint: rsaFingerprint,
          // RSA 私钥碎片值（客户端配置用）
          rsaPrivFrag1: secConfig.rsaPrivFrag1 || '',
          rsaPrivFrag2: secConfig.rsaPrivFrag2 || '',
          rsaPrivFrag3: secConfig.rsaPrivFrag3 || '',
        },
        hmacSigning: {
          enabled: hasHMACFrags,
          status: hasHMACFrags ? 'active' : 'not_initialized',
          description: 'HMAC-SHA256 请求签名',
          algorithm: 'HMAC-SHA256',
          fragmentsCount: hasHMACFrags ? 3 : 0,
          // HMAC 碎片值（客户端配置用）
          hmacFrag1: secConfig.hmacFrag1 || '',
          hmacFrag2: secConfig.hmacFrag2 || '',
          hmacFrag3: secConfig.hmacFrag3 || '',
        },
        keyFragmentation: {
          enabled: hasHMACFrags && hasRSAFrags,
          status: (hasHMACFrags && hasRSAFrags) ? 'active' : 'partial',
          description: '密钥碎片化分散存储',
          hmacFragments: hasHMACFrags ? 3 : 0,
          rsaFragments: hasRSAFrags ? 3 : 0,
        },
        aesEncryption: {
          enabled: !!secConfig.aesKey,
          status: secConfig.aesKey ? 'active' : 'not_initialized',
          description: 'AES-128 缓存加密',
          algorithm: 'AES-128-CBC',
          keyLength: secConfig.aesKey ? `${secConfig.aesKey.length * 4} bits` : undefined,
          // AES 密钥值（客户端配置用）
          aesKey: secConfig.aesKey || '',
          aesFingerprint,
        },
        antiReplay: {
          enabled: hasHMACFrags,
          status: hasHMACFrags ? 'active' : 'not_initialized',
          description: '时间戳防重放',
          timestampWindow: '5 minutes',
          signatureCache: 'in_memory',
          cacheTTL: '6 minutes',
        },
        certPinning: {
          enabled: !!secConfig.certFingerprint,
          status: secConfig.certFingerprint ? 'active' : 'not_configured',
          description: 'HTTPS 证书锁定',
          algorithm: 'SHA-256',
          fingerprint: secConfig.certFingerprint || null,
        },
      },
      createdAt: secConfig.createdAt,
      updatedAt: secConfig.updatedAt,
    })
  } catch (error: any) {
    console.error('[/api/security GET] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/security — 轮换 RSA 密钥对（管理员）
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const secConfig = await db.securityConfig.findFirst()
    if (!secConfig) {
      return NextResponse.json({ error: '安全配置未初始化，请先初始化系统' }, { status: 404 })
    }

    // 生成新 RSA 密钥对
    const { publicKey, privateKey } = generateRSAKeyPair()

    // 将私钥碎片化存储
    const rsaPrivHex = Buffer.from(privateKey, 'utf8').toString('hex')
    const frags = splitKeyTo3Fragments(rsaPrivHex)

    await db.securityConfig.update({
      where: { id: secConfig.id },
      data: {
        rsaPublicKey: publicKey,
        rsaPrivateKey: '', // 不存储完整私钥
        rsaPrivFrag1: frags.frag1,
        rsaPrivFrag2: frags.frag2,
        rsaPrivFrag3: frags.frag3,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'RSA 密钥对已重新生成，客户端需更新公钥',
      fingerprint: getPublicKeyFingerprint(publicKey),
    })
  } catch (error: any) {
    console.error('[/api/security POST] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
