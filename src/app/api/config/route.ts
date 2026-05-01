import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// 验证管理员登录
async function verifyAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return null
  }
  return session
}

// GET /api/config - 获取当前生效配置
export async function GET() {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const activeConfig = await db.cloudConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    })

    if (!activeConfig) {
      return NextResponse.json({ error: '暂无生效配置' }, { status: 404 })
    }

    return NextResponse.json({
      id: activeConfig.id,
      version: activeConfig.version,
      yamlData: activeConfig.yamlData,
      jsonData: JSON.parse(activeConfig.jsonData),
      changeNote: activeConfig.changeNote,
      createdAt: activeConfig.createdAt,
      updatedAt: activeConfig.updatedAt,
    })
  } catch (error: any) {
    console.error('[/api/config GET] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/config - 创建新配置版本
export async function POST(request: Request) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { yamlData, changeNote } = body

    if (!yamlData) {
      return NextResponse.json({ error: '请提供配置内容' }, { status: 400 })
    }

    // 验证 YAML 格式（使用 JSON_SCHEMA 防止不安全类型）
    const yamlLib = await import('js-yaml')
    let parsedData: any
    try {
      parsedData = yamlLib.load(yamlData, { schema: yamlLib.JSON_SCHEMA })
    } catch (e: any) {
      return NextResponse.json({ error: 'YAML 格式错误，请检查配置内容' }, { status: 400 })
    }

    // 先验证 JSON 序列化不会失败（防止部分状态损坏）
    let jsonData: string
    try {
      jsonData = JSON.stringify(parsedData)
    } catch {
      return NextResponse.json({ error: '配置数据包含无法序列化的内容' }, { status: 400 })
    }

    // 使用事务确保版本号原子性和状态一致性
    const newConfig = await db.$transaction(async (tx) => {
      // 将当前生效配置设为失效
      await tx.cloudConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      // 获取当前最大版本号（在事务内读取，防止竞态）
      const maxVersion = await tx.cloudConfig.findFirst({
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const nextVersion = (maxVersion?.version || 0) + 1

      // 创建新配置
      return tx.cloudConfig.create({
        data: {
          version: nextVersion,
          yamlData: yamlData,
          jsonData,
          isActive: true,
          changeNote: changeNote || `版本 ${nextVersion} 更新`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `配置已更新至版本 ${newConfig.version}`,
      config: {
        id: newConfig.id,
        version: newConfig.version,
        changeNote: newConfig.changeNote,
        createdAt: newConfig.createdAt,
      },
    })
  } catch (error: any) {
    console.error('[/api/config POST] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT /api/config - 回滚到指定版本
export async function PUT(request: Request) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { configId } = body

    if (!configId) {
      return NextResponse.json({ error: '请指定要回滚的配置版本' }, { status: 400 })
    }

    // 使用事务确保回滚操作原子性
    let targetVersion: number
    const newConfig = await db.$transaction(async (tx) => {
      const targetConfig = await tx.cloudConfig.findUnique({
        where: { id: configId },
      })

      if (!targetConfig) {
        throw new Error('CONFIG_NOT_FOUND')
      }

      // 将当前生效配置设为失效
      await tx.cloudConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })

      // 获取当前最大版本号（在事务内读取，防止竞态）
      const maxVersion = await tx.cloudConfig.findFirst({
        orderBy: { version: 'desc' },
        select: { version: true },
      })
      const nextVersion = (maxVersion?.version || 0) + 1

      // 创建新版本（基于回滚目标）
      targetVersion = targetConfig.version
      return tx.cloudConfig.create({
        data: {
          version: nextVersion,
          yamlData: targetConfig.yamlData,
          jsonData: targetConfig.jsonData,
          isActive: true,
          changeNote: `回滚至版本 ${targetConfig.version}`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `已回滚至版本 ${targetVersion}（新版本号: ${newConfig.version}）`,
    })
  } catch (error: any) {
    if (error.message === 'CONFIG_NOT_FOUND') {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 })
    }
    console.error('[/api/config PUT] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
