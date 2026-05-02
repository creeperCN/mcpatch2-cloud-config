'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCasdoorLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await signIn('casdoor', {
        callbackUrl: '/',
      })

      if (result === undefined) {
        // signIn 返回 undefined 表示发生了重定向（正常流程）
        // NextAuth 会自动跳转到 Casdoor，无需额外操作
        return
      }

      // 如果 signIn 返回了结果且没有错误，说明已经登录成功
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (e: any) {
      setError(e.message || '登录过程中发生错误')
      setLoading(false)
    }
  }

  // 从 URL 参数中读取错误信息（NextAuth OAuth 错误会通过回调 URL 传递）
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    if (urlError && !error) {
      const errorMessages: Record<string, string> = {
        OAuthSignin: 'OAuth 登录初始化失败，请检查 Casdoor 配置',
        OAuthCallback: 'OAuth 回调处理失败，请重试',
        OAuthCreateAccount: '创建 OAuth 账户失败',
        EmailCreateAccount: '创建邮箱账户失败',
        Callback: '回调处理异常，请重试',
        OAuthAccountNotLinked: '该账户尚未关联，请联系管理员',
        SessionRequired: '请先登录后再访问此页面',
        Configuration: '认证配置错误，请检查服务器环境变量',
        AccessDenied: '访问被拒绝，您没有权限登录',
        Verification: '验证失败，请重试',
        Default: '登录失败，请重试',
      }
      setError(errorMessages[urlError] || `登录错误: ${urlError}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Mcpatch 云控管理</h1>
          <p className="text-slate-400 mt-2">MCPATCH.YML 配置管理中心</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <div className="space-y-5">
            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <button
              onClick={handleCasdoorLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  正在跳转登录...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  冒险之源统一通行证登录
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Mcpatch Cloud Control Panel
        </p>
      </div>
    </div>
  )
}
