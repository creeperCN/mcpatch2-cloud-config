import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// GET /api/keys - 获取API密钥列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ keys })
  } catch (error: any) {
    console.error('[/api/keys GET] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/keys - 创建新API密钥
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    // 验证 name 长度
    const keyName = (name && typeof name === 'string') ? name.substring(0, 100) : '新密钥'

    const newKey = `mcpatch_${crypto.randomBytes(24).toString('hex')}`

    const key = await db.apiKey.create({
      data: {
        key: newKey,
        name: keyName,
      },
    })

    return NextResponse.json({ key, message: '密钥创建成功' })
  } catch (error: any) {
    console.error('[/api/keys POST] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// DELETE /api/keys - 删除API密钥
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: '请指定要删除的密钥' }, { status: 400 })
    }

    await db.apiKey.delete({
      where: { id: keyId },
    })

    return NextResponse.json({ message: '密钥已删除' })
  } catch (error: any) {
    console.error('[/api/keys DELETE] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT /api/keys - 切换密钥状态
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId, isActive } = body

    if (!keyId || typeof keyId !== 'string') {
      return NextResponse.json({ error: '请指定密钥' }, { status: 400 })
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive 必须为布尔值' }, { status: 400 })
    }

    await db.apiKey.update({
      where: { id: keyId },
      data: { isActive },
    })

    return NextResponse.json({ message: `密钥已${isActive ? '启用' : '禁用'}` })
  } catch (error: any) {
    console.error('[/api/keys PUT] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
