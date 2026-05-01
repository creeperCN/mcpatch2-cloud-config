import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getPublicKeyFingerprint } from '@/lib/crypto-utils'

// GET /api/security/public-key — 导出 RSA 公钥（管理员）
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
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
