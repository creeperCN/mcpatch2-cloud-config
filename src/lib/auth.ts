import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// 启动时校验必要环境变量
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('[auth] 警告: NEXTAUTH_SECRET 未设置，JWT 签名可能不安全。请在 .env 中配置此变量。')
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('请输入用户名和密码')
        }

        const user = await db.adminUser.findUnique({
          where: { username: credentials.username },
        })

        if (!user) {
          throw new Error('用户名或密码错误')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('用户名或密码错误')
        }

        return {
          id: user.id,
          name: user.username,
          email: `${user.username}@mcpatch.local`,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
