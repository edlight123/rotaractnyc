import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // For demo purposes - in production, use database
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@rotaractnyc.org'
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

        if (credentials.email === adminEmail) {
          const isValid = await bcrypt.compare(credentials.password, await bcrypt.hash(adminPassword, 10))
          
          if (isValid || credentials.password === adminPassword) {
            return {
              id: '1',
              email: adminEmail,
              name: 'Admin',
            }
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
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
        session.user.id = token.id as string
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
