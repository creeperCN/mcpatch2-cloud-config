import type { NextAuthOptions } from 'next-auth'

// 启动时校验必要环境变量
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('[auth] 警告: NEXTAUTH_SECRET 未设置，JWT 签名可能不安全。请在 .env 中配置此变量。')
}

// 检查 Casdoor 配置是否完整
const casdoorEndpoint = process.env.CASDOOR_ENDPOINT
const casdoorClientId = process.env.CASDOOR_CLIENT_ID
const casdoorClientSecret = process.env.CASDOOR_CLIENT_SECRET
const casdoorOrg = process.env.CASDOOR_ORGANIZATION || 'built-in'
const casdoorApp = process.env.CASDOOR_APPLICATION || 'app-built-in'

const isCasdoorConfigured = !!(casdoorEndpoint && casdoorClientId && casdoorClientSecret)

if (!isCasdoorConfigured) {
  console.warn('[auth] 警告: Casdoor SSO 配置不完整，请在 .env 中配置 CASDOOR_ENDPOINT、CASDOOR_CLIENT_ID、CASDOOR_CLIENT_SECRET')
}

export const authOptions: NextAuthOptions = {
  providers: isCasdoorConfigured
    ? [
        {
          id: 'casdoor',
          name: 'Casdoor',
          type: 'oauth',
          clientId: casdoorClientId,
          clientSecret: casdoorClientSecret,
          // 使用 wellKnown 让 openid-client 自动发现 OIDC 配置
          // 包含 jwks_uri、issuer 等，解决 ID Token 签名验证和 iss 校验问题
          wellKnown: `${casdoorEndpoint}/.well-known/openid-configuration`,
          authorization: {
            url: `${casdoorEndpoint}/login/oauth/authorize`,
            params: {
              scope: 'openid profile email',
              // Casdoor 要求在授权 URL 中传递组织和应用参数
              organization: casdoorOrg,
              application: casdoorApp,
            },
          },
          token: `${casdoorEndpoint}/api/login/oauth/access_token`,
          userinfo: `${casdoorEndpoint}/api/userinfo`,
          // issuer 与 Casdoor OIDC Discovery 返回的 issuer 一致
          // 用于 ID Token 中的 iss 声明验证
          issuer: casdoorEndpoint,
          checks: ['state'],
          profile(profile) {
            // Casdoor /api/userinfo 返回自有 User 对象（非标准 OIDC userinfo）
            const id = profile.sub || profile.id || profile.name || ''
            const name = profile.displayName || profile.name || profile.preferred_username || ''
            const email = profile.email || null
            let image: string | null = null
            if (profile.avatar) {
              image = profile.avatar.startsWith('http')
                ? profile.avatar
                : `${casdoorEndpoint}${profile.avatar}`
            } else if (profile.picture) {
              image = profile.picture
            }
            return { id, name, email, image }
          },
        },
      ]
    : [],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'casdoor') {
        if (!user?.id) {
          console.error('[auth] Casdoor 登录失败: 用户信息不完整')
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.name = user.name
      }
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).accessToken = token.accessToken
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
