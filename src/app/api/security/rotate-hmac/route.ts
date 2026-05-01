import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateHMACSecret, splitKeyTo3Fragments, clearSignatureCache } from '@/lib/crypto-utils'

// POST /api/security/rotate-hmac — 轮换 HMAC 密钥（管理员）
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

    // 生成新 HMAC 密钥
    const newSecret = generateHMACSecret()

    // 碎片化存储
    const frags = splitKeyTo3Fragments(newSecret)

    await db.securityConfig.update({
      where: { id: secConfig.id },
      data: {
        hmacSecret: '',    // 不存储完整密钥
        hmacFrag1: frags.frag1,
        hmacFrag2: frags.frag2,
        hmacFrag3: frags.frag3,
      },
    })

    // 清空签名缓存，旧密钥的签名已失效
    clearSignatureCache()

    return NextResponse.json({
      success: true,
      message: 'HMAC 密钥已轮换，客户端需更新密钥',
    })
  } catch (error: any) {
    console.error('[/api/security/rotate-hmac] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
