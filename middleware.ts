export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/members/:path*', '/admin/events/:path*']
}
