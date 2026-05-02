'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// ============ Types ============
interface Stats {
  configCount: number
  activeConfig: { version: number; updatedAt: string } | null
  totalPulls: number
  todayPulls: number
  pullTrend: Array<{ date: string; count: number }>
  recentPulls: Array<{
    id: string
    ipAddress: string
    userAgent: string
    createdAt: string
    config: { version: number }
  }>
}

interface ConfigHistory {
  id: string
  version: number
  isActive: boolean
  changeNote: string
  createdAt: string
  updatedAt: string
  _count: { pullLogs: number }
}

interface ApiKey {
  id: string
  key: string
  name: string
  isActive: boolean
  createdAt: string
}

interface SecurityLayer {
  enabled: boolean
  status: string
  description: string
  algorithm?: string
  keyType?: string
  fingerprint?: string | null
  fragmentsCount?: number
  hmacFragments?: number
  rsaFragments?: number
  keyLength?: string
  timestampWindow?: string
  signatureCache?: string
  cacheTTL?: string
  // 碎片值（客户端配置用）
  rsaPrivFrag1?: string
  rsaPrivFrag2?: string
  rsaPrivFrag3?: string
  hmacFrag1?: string
  hmacFrag2?: string
  hmacFrag3?: string
  aesKey?: string
  aesFingerprint?: string
}

interface SecurityOverview {
  initialized: boolean
  layers: Record<string, SecurityLayer>
  createdAt?: string
  updatedAt?: string
}

// ============ Main App ============
export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'history' | 'logs' | 'keys' | 'security'>('dashboard')

  // States
  const [stats, setStats] = useState<Stats | null>(null)
  const [currentYaml, setCurrentYaml] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [history, setHistory] = useState<ConfigHistory[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Security state
  const [securityOverview, setSecurityOverview] = useState<SecurityOverview | null>(null)

  // Init check
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/init')
      .then(r => r.json())
      .then(d => setIsInitialized(typeof d.initialized === 'boolean' ? d.initialized : false))
      .catch(() => setIsInitialized(false))
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session && activeTab === 'dashboard') fetchStats()
  }, [session, activeTab])

  useEffect(() => {
    if (session && activeTab === 'editor') fetchCurrentConfig()
  }, [session, activeTab])

  useEffect(() => {
    if (session && activeTab === 'history') fetchHistory()
  }, [session, activeTab])

  useEffect(() => {
    if (session && activeTab === 'logs') fetchLogs()
  }, [session, activeTab])

  useEffect(() => {
    if (session && activeTab === 'keys') fetchKeys()
  }, [session, activeTab])

  useEffect(() => {
    if (session && activeTab === 'security') fetchSecurityOverview()
  }, [session, activeTab])

  const showToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError(msg)
      setTimeout(() => setError(''), 5000)
    }
  }

  // ============ API Calls ============
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) setStats(await res.json())
    } catch (e: any) { showToast('获取统计数据失败', 'error') }
  }

  const fetchCurrentConfig = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        setCurrentYaml(data.yamlData)
      } else {
        setCurrentYaml('# 暂无配置，请粘贴或编辑 YAML 内容')
      }
    } catch (e: any) { showToast('获取配置失败', 'error') }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/config/history?pageSize=50')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.configs)
      }
    } catch (e: any) { showToast('获取历史记录失败', 'error') }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs?pageSize=50')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      }
    } catch (e: any) { showToast('获取日志失败', 'error') }
  }

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || data)
      }
    } catch (e: any) { showToast('获取密钥失败', 'error') }
  }

  const saveConfig = async () => {
    if (!currentYaml.trim()) { showToast('配置内容不能为空', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yamlData: currentYaml, changeNote: changeNote || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'success')
        setChangeNote('')
      } else {
        showToast(data.error, 'error')
      }
    } catch (e: any) { showToast('保存失败', 'error') }
    finally { setLoading(false) }
  }

  const rollbackConfig = async (configId: string) => {
    if (!confirm('确定要回滚到此版本吗？')) return
    setLoading(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId }),
      })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchHistory(); fetchCurrentConfig() }
      else showToast(data.error, 'error')
    } catch { showToast('回滚失败', 'error') }
    finally { setLoading(false) }
  }

  const createKey = async () => {
    const name = prompt('请输入密钥名称', '新密钥')
    if (!name) return
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) { showToast('密钥创建成功', 'success'); fetchKeys() }
      else showToast(data.error, 'error')
    } catch { showToast('创建失败', 'error') }
  }

  const deleteKey = async (keyId: string) => {
    if (!confirm('确定要删除此密钥吗？')) return
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchKeys() }
      else showToast(data.error, 'error')
    } catch { showToast('删除失败', 'error') }
  }

  const toggleKey = async (keyId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, isActive: !isActive }),
      })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchKeys() }
      else showToast(data.error, 'error')
    } catch { showToast('操作失败', 'error') }
  }

  const fetchSecurityOverview = async () => {
    try {
      const res = await fetch('/api/security')
      if (res.ok) setSecurityOverview(await res.json())
    } catch { showToast('获取安全状态失败', 'error') }
  }

  const rotateRSA = async () => {
    if (!confirm('轮换 RSA 密钥后，所有客户端必须更新公钥才能正常验签。确定继续？')) return
    try {
      const res = await fetch('/api/security', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchSecurityOverview() }
      else showToast(data.error, 'error')
    } catch { showToast('RSA 密钥轮换失败', 'error') }
  }

  const rotateHMAC = async () => {
    if (!confirm('轮换 HMAC 密钥后，所有客户端必须更新密钥才能正常请求。确定继续？')) return
    try {
      const res = await fetch('/api/security/rotate-hmac', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchSecurityOverview() }
      else showToast(data.error, 'error')
    } catch { showToast('HMAC 密钥轮换失败', 'error') }
  }

  const rotateAES = async () => {
    if (!confirm('轮换 AES 密钥后，已有加密缓存将无法解密。确定继续？')) return
    try {
      const res = await fetch('/api/security/rotate-aes', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchSecurityOverview() }
      else showToast(data.error, 'error')
    } catch { showToast('AES 密钥轮换失败', 'error') }
  }

  const copyPublicKey = async () => {
    try {
      const res = await fetch('/api/security/public-key')
      const data = await res.json()
      if (res.ok && data.publicKey) {
        await navigator.clipboard.writeText(data.publicKey)
        showToast('RSA 公钥已复制到剪贴板', 'success')
      } else {
        showToast(data.error || '获取公钥失败', 'error')
      }
    } catch { showToast('复制失败', 'error') }
  }

  // 一键复制文本到剪贴板
  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} 已复制到剪贴板`, 'success')
    } catch { showToast('复制失败', 'error') }
  }

  const regenerateCertFingerprint = async () => {
    try {
      const res = await fetch('/api/security/cert-fingerprint', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { showToast(data.message, 'success'); fetchSecurityOverview() }
      else showToast(data.error, 'error')
    } catch { showToast('操作失败', 'error') }
  }

  const initSystem = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        showToast('系统初始化成功！API密钥已生成，请妥善保管', 'success')
        setIsInitialized(true)
        alert(`API 密钥（请保存好）：\n${data.apiKey}\n\n管理员：${data.admin?.username || '未知'}`)
      } else {
        showToast(data.error, 'error')
      }
    } catch { showToast('初始化失败', 'error') }
    finally { setLoading(false) }
  }

  // ============ Init Screen ============
  if (isInitialized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-md px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Mcpatch 云控管理</h1>
            <p className="text-slate-400 mt-2">首次使用，需要初始化系统</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
            <p className="text-slate-300 mb-2">点击下方按钮初始化系统，将自动完成以下操作：</p>
            <ul className="text-slate-400 text-sm space-y-1.5 mb-6 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>使用当前统一通行证账户作为管理员</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>创建默认配置文件</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>生成 API 密钥</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>启用 6 层安全防护（RSA/HMAC/AES/碎片化/防重放/证书锁定）</span>
              </li>
            </ul>
            <button
              onClick={initSystem}
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  正在初始化...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  一键初始化系统
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // ============ Format Date ============
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch { return dateStr }
  }

  const formatShortDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    } catch { return dateStr }
  }

  // ============ Tabs Config ============
  const tabs = [
    { id: 'dashboard' as const, label: '仪表盘', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'editor' as const, label: '配置编辑', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'history' as const, label: '版本历史', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'logs' as const, label: '拉取日志', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'keys' as const, label: 'API 密钥', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { id: 'security' as const, label: '安全中心', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/80 border-r border-slate-700/50 flex flex-col min-h-screen shrink-0">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Mcpatch 云控</h1>
              <p className="text-slate-500 text-xs">配置管理中心</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-xs font-bold">{session.user?.name?.[0]?.toUpperCase() || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{session.user?.name}</p>
              <p className="text-slate-500 text-xs">管理员</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="退出登录"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Toast Messages */}
        {error && (
          <div className="fixed top-4 right-4 z-50 bg-red-500/90 backdrop-blur text-white px-5 py-3 rounded-xl shadow-lg text-sm animate-in slide-in-from-right">
            {error}
          </div>
        )}
        {success && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 backdrop-blur text-white px-5 py-3 rounded-xl shadow-lg text-sm animate-in slide-in-from-right">
            {success}
          </div>
        )}

        <div className="p-8 max-w-6xl">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">仪表盘</h2>
                <p className="text-slate-400 mt-1">系统概览与运行状态</p>
              </div>

              {stats && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">配置版本数</p>
                          <p className="text-3xl font-bold text-white mt-1">{stats.configCount}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">当前版本</p>
                          <p className="text-3xl font-bold text-emerald-400 mt-1">v{stats.activeConfig?.version || '-'}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      {stats.activeConfig && (
                        <p className="text-slate-500 text-xs mt-3">更新于 {formatShortDate(stats.activeConfig.updatedAt)}</p>
                      )}
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">总拉取次数</p>
                          <p className="text-3xl font-bold text-white mt-1">{stats.totalPulls}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">今日拉取</p>
                          <p className="text-3xl font-bold text-amber-400 mt-1">{stats.todayPulls}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pull Trend Chart */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                    <h3 className="text-white font-semibold mb-4">近 7 天拉取趋势</h3>
                    <div className="flex items-end gap-3 h-40">
                      {stats.pullTrend.map((item) => {
                        const maxCount = Math.max(...stats.pullTrend.map(t => t.count), 1)
                        const height = Math.max((item.count / maxCount) * 100, 4)
                        return (
                          <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-xs text-slate-400">{item.count}</span>
                            <div
                              className="w-full bg-emerald-500/30 rounded-t-lg transition-all hover:bg-emerald-500/50"
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-slate-500">{item.date.slice(5)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recent Pulls */}
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold">最近拉取记录</h3>
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="text-emerald-400 text-sm hover:text-emerald-300"
                      >
                        查看全部
                      </button>
                    </div>
                    {stats.recentPulls.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">暂无拉取记录</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.recentPulls.map((log) => (
                          <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-white text-sm">{log.ipAddress}</p>
                                <p className="text-slate-500 text-xs">{log.userAgent ? log.userAgent.substring(0, 60) : 'Unknown'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 text-xs">v{log.config.version}</p>
                              <p className="text-slate-500 text-xs">{formatShortDate(log.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Config Editor */}
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">配置编辑</h2>
                <p className="text-slate-400 mt-1">编辑 MCPATCH.YML 配置内容，保存后立即对所有客户端生效</p>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">变更备注</label>
                  <input
                    type="text"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="描述本次变更内容..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">YAML 配置内容</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const defaultConfig = `# Mcpatch 云控配置文件\n# 此文件由云控管理后台生成和管理\n\n# 更新服务器地址\nurls:\n  - mcpatch://127.0.0.1:6700\n\n# 客户端版本号文件路径\nversion-file-path: version-label.txt\n\n# 更新失败时是否允许继续进入游戏\nallow-error: false\n\n# 无更新时是否显示提示\nshow-no-update-message: true\n\n# 有更新时是否显示更新日志\nshow-has-update-message: true\n\n# 自动关闭更新日志的时间（毫秒）\nauto-close-changelogs: 0\n\n# 安静模式\nsilent-mode: false\n\n# 是否禁用界面主题\ndisable-theme: false\n\n# 窗口标题\nwindow-title: Mcpatch\n\n# 更新起始目录\nbase-path: ''\n\n# 私有协议超时时间（毫秒）\nprivate-timeout: 7000\n\n# HTTP协议超时时间（毫秒）\nhttp-timeout: 7000\n\n# HTTP自定义请求头\nhttp-headers: {}\n\n# 重试次数\nretries: 3\n\n# 是否忽略SSL证书验证\nignore-ssl-cert: false\n\n# 是否忽略HTTP Content-Length校验\nignore-http-content-length: false\n\n# 测试模式\ntest-mode: false\n\n# 最大并行下载线程数（0为自动）\nmax-threads: 0\n\n# 分片下载大小（字节）\nchunk-size: 1048576\n\n# 最大分片数\nmax-chunks: 16\n\n# 是否启用分片下载\nenable-chunked-download: true\n\n# 是否启用防盗链鉴权\nanti-hotlink-enabled: true\n\n# 鉴权API地址\nanti-hotlink-auth-url: https://auth-api.mxzysoa.com/generate-auth-url\n\n# 鉴权有效期（秒）\nanti-hotlink-expire-time: 3600\n\n# 鉴权用户ID\nanti-hotlink-uid: "0"\n`
                          setCurrentYaml(defaultConfig)
                          showToast('已加载默认配置模板', 'success')
                        }}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                      >
                        重置模板
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentYaml)
                          showToast('已复制到剪贴板', 'success')
                        }}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={currentYaml}
                    onChange={(e) => setCurrentYaml(e.target.value)}
                    rows={25}
                    spellCheck={false}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white font-mono text-sm leading-relaxed placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-y"
                    placeholder="请输入 YAML 配置内容..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-slate-500 text-xs">
                    保存后将创建新版本，所有客户端下次启动时将获取此配置
                  </p>
                  <button
                    onClick={saveConfig}
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    发布配置
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Version History */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">版本历史</h2>
                <p className="text-slate-400 mt-1">查看配置变更记录，支持回滚到历史版本</p>
              </div>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                    <p className="text-slate-500">暂无历史版本</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-slate-800/50 rounded-xl border p-5 transition-all hover:bg-slate-800/80 ${
                        item.isActive ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            item.isActive ? 'bg-emerald-500/20' : 'bg-slate-700/50'
                          }`}>
                            {item.isActive ? (
                              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <span className="text-slate-400 text-sm font-bold">v{item.version}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-semibold">
                                {item.isActive ? '当前版本' : `版本 ${item.version}`}
                              </h4>
                              {item.isActive && (
                                <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full">生效中</span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mt-1">{item.changeNote}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>创建于 {formatDate(item.createdAt)}</span>
                              <span>拉取 {item._count.pullLogs} 次</span>
                            </div>
                          </div>
                        </div>
                        {!item.isActive && (
                          <button
                            onClick={() => rollbackConfig(item.id)}
                            disabled={loading}
                            className="px-4 py-2 text-sm text-amber-400 hover:text-white hover:bg-amber-500/15 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                          >
                            回滚到此版本
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Pull Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">拉取日志</h2>
                  <p className="text-slate-400 mt-1">客户端拉取配置的详细记录</p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-slate-500">暂无拉取日志</p>
                  <p className="text-slate-600 text-sm mt-1">客户端通过 API 拉取配置后，记录将显示在此处</p>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">IP 地址</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">User-Agent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">配置版本</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log: any) => (
                          <tr key={log.id} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20">
                            <td className="px-6 py-3 text-white text-sm font-mono">{log.ipAddress}</td>
                            <td className="px-6 py-3 text-slate-400 text-sm max-w-xs truncate">{log.userAgent || '-'}</td>
                            <td className="px-6 py-3">
                              <span className="text-emerald-400 text-sm">v{log.config.version}</span>
                            </td>
                            <td className="px-6 py-3 text-slate-400 text-sm">{formatShortDate(log.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API Keys */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">API 密钥</h2>
                  <p className="text-slate-400 mt-1">管理客户端访问 API 的密钥</p>
                </div>
                <button
                  onClick={createKey}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  创建密钥
                </button>
              </div>

              {/* Usage Guide */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-3">客户端接入说明</h3>
                <div className="bg-slate-900/80 rounded-xl p-4 font-mono text-sm text-slate-300 space-y-2">
                  <p className="text-emerald-400"># 客户端拉取 API（GET 请求）</p>
                  <p>GET /api/client</p>
                  <p className="text-slate-500 mt-2"># 带 API 密钥鉴权</p>
                  <p>GET /api/client</p>
                  <p>Authorization: Bearer {'{your-api-key}'}</p>
                  <p className="text-slate-500 mt-2"># Java 客户端集成示例</p>
                  <p className="text-amber-300">{'//'} 在 Mcpatch 启动时，通过 HTTP 请求获取远程配置</p>
                  <p className="text-amber-300">{'//'} 替代本地 mcpatch.yml 的读取逻辑</p>
                </div>
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-300 text-sm">
                    <strong>提示：</strong>客户端应在每次启动时向此 API 发送 GET 请求获取最新配置，将返回的 YAML 内容作为 mcpatch.yml 使用。API 密钥为可选项，不设置时允许无密钥访问。
                  </p>
                </div>
              </div>

              {/* Keys List */}
              <div className="space-y-3">
                {apiKeys.length === 0 ? (
                  <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 text-center">
                    <p className="text-slate-500">暂无密钥，点击上方按钮创建</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className={`bg-slate-800/50 rounded-xl border p-5 ${
                      key.isActive ? 'border-slate-700/50' : 'border-red-500/30 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            key.isActive ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                            <svg className={`w-5 h-5 ${key.isActive ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium">{key.name}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                key.isActive
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-red-500/15 text-red-400'
                              }`}>
                                {key.isActive ? '启用' : '禁用'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-slate-400 text-xs bg-slate-900/50 px-2 py-1 rounded-lg font-mono select-all">
                                {key.key}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(key.key)
                                  showToast('密钥已复制', 'success')
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-slate-600 text-xs mt-1">创建于 {formatDate(key.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleKey(key.id, key.isActive)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              key.isActive
                                ? 'text-amber-400 hover:bg-amber-500/15'
                                : 'text-emerald-400 hover:bg-emerald-500/15'
                            }`}
                          >
                            {key.isActive ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => deleteKey(key.id)}
                            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Security Center */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">安全中心</h2>
                  <p className="text-slate-400 mt-1">6 层安全防护体系 — 防篡改 / 防伪造 / 防重放</p>
                </div>
                <button onClick={fetchSecurityOverview} className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">刷新状态</button>
              </div>

              {!securityOverview ? (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-slate-500">加载安全状态...</p>
                </div>
              ) : !securityOverview.initialized ? (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                  <p className="text-slate-500">安全模块未初始化</p>
                  <p className="text-slate-600 text-sm mt-1">请重新初始化系统以启用 6 层安全防护</p>
                </div>
              ) : (
                <>
                  {/* 6-Layer Overview Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {securityOverview.layers && Object.entries(securityOverview.layers).map(([key, layer]) => (
                      <div key={key} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">{layer.description}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            layer.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                            layer.status === 'partial' ? 'bg-amber-500/15 text-amber-400' :
                            'bg-slate-700/50 text-slate-500'
                          }`}>
                            {layer.status === 'active' ? '已启用' : layer.status === 'partial' ? '部分启用' : '未启用'}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs space-y-1">
                          {layer.algorithm && <p>算法: <span className="text-slate-400">{layer.algorithm}</span></p>}
                          {layer.keyType && <p>密钥: <span className="text-slate-400">{layer.keyType}</span></p>}
                          {layer.fragmentsCount && <p>碎片数: <span className="text-emerald-400">{layer.fragmentsCount}</span></p>}
                          {layer.timestampWindow && <p>窗口: <span className="text-slate-400">{layer.timestampWindow}</span></p>}
                          {layer.keyLength && <p>密钥长度: <span className="text-slate-400">{layer.keyLength}</span></p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detail Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* RSA Key */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">RSA-2048 签名密钥</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={copyPublicKey} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">复制公钥</button>
                          <button onClick={rotateRSA} className="text-xs text-amber-400 hover:text-white px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">轮换密钥</button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">状态: <span className={securityOverview.layers.rsaSignature?.enabled ? 'text-emerald-400' : 'text-slate-500'}>{securityOverview.layers.rsaSignature?.enabled ? '已生成' : '未生成'}</span></p>
                        {securityOverview.layers.rsaSignature?.fingerprint && (
                          <p className="text-slate-400">指纹: <span className="text-slate-300 text-xs font-mono max-w-[400px] block truncate">{securityOverview.layers.rsaSignature.fingerprint}</span></p>
                        )}
                        {securityOverview.layers.rsaSignature?.rsaPrivFrag1 && (
                          <div className="mt-2 pt-2 border-t border-slate-700/50">
                            <p className="text-slate-400 text-xs mb-2">私钥碎片 (3个 XOR 片段)</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG1: {securityOverview.layers.rsaSignature.rsaPrivFrag1.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.rsaSignature!.rsaPrivFrag1!, 'RSA FRAG1')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG2: {securityOverview.layers.rsaSignature.rsaPrivFrag2?.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.rsaSignature!.rsaPrivFrag2!, 'RSA FRAG2')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG3: {securityOverview.layers.rsaSignature.rsaPrivFrag3?.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.rsaSignature!.rsaPrivFrag3!, 'RSA FRAG3')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* HMAC Secret */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">HMAC 请求签名</h3>
                        <button onClick={rotateHMAC} className="text-xs text-amber-400 hover:text-white px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">轮换密钥</button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">状态: <span className={securityOverview.layers.hmacSigning?.enabled ? 'text-emerald-400' : 'text-slate-500'}>{securityOverview.layers.hmacSigning?.enabled ? '已启用' : '未启用'}</span></p>
                        {securityOverview.layers.hmacSigning?.algorithm && <p className="text-slate-400">算法: <span className="text-slate-300">{securityOverview.layers.hmacSigning.algorithm}</span></p>}
                        {securityOverview.layers.hmacSigning?.hmacFrag1 && (
                          <div className="mt-2 pt-2 border-t border-slate-700/50">
                            <p className="text-slate-400 text-xs mb-2">碎片 (3个 XOR 片段)</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG1: {securityOverview.layers.hmacSigning.hmacFrag1.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.hmacSigning!.hmacFrag1!, 'HMAC FRAG1')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG2: {securityOverview.layers.hmacSigning.hmacFrag2?.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.hmacSigning!.hmacFrag2!, 'HMAC FRAG2')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate flex-1">FRAG3: {securityOverview.layers.hmacSigning.hmacFrag3?.substring(0, 20)}...</span>
                                <button onClick={() => copyText(securityOverview.layers.hmacSigning!.hmacFrag3!, 'HMAC FRAG3')} className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0">复制</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AES Encryption */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">AES-128 缓存加密</h3>
                        <div className="flex items-center gap-2">
                          {securityOverview.layers.aesEncryption?.aesKey && (
                            <button onClick={() => copyText(securityOverview.layers.aesEncryption!.aesKey!, 'AES 密钥')} className="text-xs text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">复制密钥</button>
                          )}
                          <button onClick={rotateAES} className="text-xs text-amber-400 hover:text-white px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">轮换密钥</button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">状态: <span className={securityOverview.layers.aesEncryption?.enabled ? 'text-emerald-400' : 'text-slate-500'}>{securityOverview.layers.aesEncryption?.enabled ? '已启用' : '未启用'}</span></p>
                        {securityOverview.layers.aesEncryption?.algorithm && <p className="text-slate-400">算法: <span className="text-slate-300">{securityOverview.layers.aesEncryption.algorithm}</span></p>}
                        {securityOverview.layers.aesEncryption?.keyLength && <p className="text-slate-400">密钥长度: <span className="text-slate-300">{securityOverview.layers.aesEncryption.keyLength}</span></p>}
                        {securityOverview.layers.aesEncryption?.aesFingerprint && (
                          <p className="text-slate-400">指纹: <span className="text-slate-300 text-xs font-mono">{securityOverview.layers.aesEncryption.aesFingerprint}</span></p>
                        )}
                        {securityOverview.layers.aesEncryption?.aesKey && (
                          <p className="text-xs font-mono text-slate-500 truncate">密钥: {securityOverview.layers.aesEncryption.aesKey.substring(0, 16)}...</p>
                        )}
                      </div>
                    </div>

                    {/* Anti-Replay */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <h3 className="text-white font-semibold mb-4">时间戳防重放</h3>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">状态: <span className={securityOverview.layers.antiReplay?.enabled ? 'text-emerald-400' : 'text-slate-500'}>{securityOverview.layers.antiReplay?.enabled ? '已启用' : '未启用'}</span></p>
                        {securityOverview.layers.antiReplay?.timestampWindow && <p className="text-slate-400">时间窗口: <span className="text-slate-300">{securityOverview.layers.antiReplay.timestampWindow}</span></p>}
                        {securityOverview.layers.antiReplay?.cacheTTL && <p className="text-slate-400">缓存 TTL: <span className="text-slate-300">{securityOverview.layers.antiReplay.cacheTTL}</span></p>}
                        {securityOverview.layers.antiReplay?.signatureCache && <p className="text-slate-400">存储: <span className="text-slate-300">{securityOverview.layers.antiReplay.signatureCache}</span></p>}
                      </div>
                    </div>

                    {/* Certificate Pinning */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-semibold">HTTPS 证书锁定</h3>
                        <div className="flex items-center gap-2">
                          {securityOverview.layers.certPinning?.fingerprint && (
                            <button onClick={() => copyText(securityOverview.layers.certPinning!.fingerprint!, '证书指纹')} className="text-xs text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">复制指纹</button>
                          )}
                          <button onClick={regenerateCertFingerprint} className="text-xs text-amber-400 hover:text-white px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">重新生成</button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-400">状态: <span className={securityOverview.layers.certPinning?.enabled ? 'text-emerald-400' : 'text-slate-500'}>{securityOverview.layers.certPinning?.enabled ? '已配置' : '未配置'}</span></p>
                        {securityOverview.layers.certPinning?.algorithm && <p className="text-slate-400">算法: <span className="text-slate-300">{securityOverview.layers.certPinning.algorithm}</span></p>}
                        {securityOverview.layers.certPinning?.fingerprint && (
                          <p className="text-slate-400">指纹: <code className="text-slate-300 text-xs font-mono bg-slate-900/50 px-2 py-1 rounded-lg select-all block mt-1 break-all">{securityOverview.layers.certPinning.fingerprint}</code></p>
                        )}
                      </div>
                    </div>

                    {/* Key Timeline */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                      <h3 className="text-white font-semibold mb-4">密钥时间线</h3>
                      <div className="space-y-2 text-sm">
                        {securityOverview.createdAt && <p className="text-slate-400">创建于: <span className="text-slate-300">{formatDate(securityOverview.createdAt)}</span></p>}
                        {securityOverview.updatedAt && <p className="text-slate-400">最后更新: <span className="text-slate-300">{formatDate(securityOverview.updatedAt)}</span></p>}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
