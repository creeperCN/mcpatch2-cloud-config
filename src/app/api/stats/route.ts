import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/stats - 获取统计数据
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 统一使用 UTC 时区，与 raw SQL 的 datetime('now') 保持一致
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [
      configCount,
      activeConfig,
      totalPulls,
      todayPulls,
      recentLogs,
    ] = await Promise.all([
      db.cloudConfig.count(),
      db.cloudConfig.findFirst({
        where: { isActive: true },
        select: { version: true, updatedAt: true },
      }),
      db.clientPullLog.count(),
      db.clientPullLog.count({
        where: { createdAt: { gte: today } },
      }),
      db.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM ClientPullLog
        WHERE createdAt >= datetime('now', '-7 days')
        GROUP BY DATE(createdAt)
        ORDER BY date
      `,
    ])

    const pullTrend: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const found = recentLogs.find((r) => r.date === dateStr)
      pullTrend.push({
        date: dateStr,
        count: found ? Number(found.count) : 0,
      })
    }

    const recentPulls = await db.clientPullLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { config: { select: { version: true } } },
    })

    return NextResponse.json({
      configCount,
      activeConfig,
      totalPulls,
      todayPulls,
      pullTrend,
      recentPulls,
    })
  } catch (error: any) {
    console.error('[/api/stats] 内部错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
