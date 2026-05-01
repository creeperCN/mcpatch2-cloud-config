import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateAESKey } from '@/lib/crypto-utils'

// POST /api/security/rotate-aes — 轮换 AES 密钥（管理员）
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

    const newAesKey = generateAESKey()

    await db.securityConfig.update({
      where: { id: secConfig.id },
      data: {
        aesKey: newAesKey,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'AES 密钥已轮换',
    })
  } catch (error: any) {
    console.error('[/api/security/rotate-aes] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
