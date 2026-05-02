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
        // Casdoor OAuth2 Provider（仅第三方登录，无账密表单）
        // 手动指定所有端点，不使用 wellKnown（Casdoor OIDC Discovery 与 NextAuth 预期不完全兼容）
        {
          id: 'casdoor',
          name: 'Casdoor',
          type: 'oauth',
          authorization: {
            url: `${casdoorEndpoint}/login/oauth/authorize`,
            params: {
              scope: 'openid profile email',
              // Casdoor 要求在授权 URL 中传递组织和应用参数
              organization: casdoorOrg,
              application: casdoorApp,
            },
          },
          // 字符串格式 URL：NextAuth 自动用 HTTP Basic Auth 发送 clientId:clientSecret
          // 并在 form body 中发送 grant_type + code + redirect_uri
          token: `${casdoorEndpoint}/api/login/oauth/access_token`,
          userinfo: `${casdoorEndpoint}/api/userinfo`,
          clientId: casdoorClientId,
          clientSecret: casdoorClientSecret,
          // 告知 NextAuth 该 Provider 会返回 ID Token，需验证 iss 声明
          idToken: true,
          // Casdoor 的 issuer 标识，与 ID Token 中的 iss 声明匹配
          // 不设置此值会导致验证报错：unexpected iss value, expected undefined
          issuer: casdoorEndpoint,
          checks: ['state'],
          profile(profile) {
            // Casdoor /api/userinfo 返回自有 User 对象（非标准 OIDC userinfo）
            // 常见字段: name, displayName, email, avatar, sub 等
            const id = profile.sub || profile.id || profile.name || ''
            const name = profile.displayName || profile.name || profile.preferred_username || ''
            const email = profile.email || null
            let image: string | null = null
            if (profile.picture) {
              image = profile.picture
            } else if (profile.avatar) {
              image = profile.avatar.startsWith('http')
                ? profile.avatar
                : `${casdoorEndpoint}${profile.avatar}`
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
