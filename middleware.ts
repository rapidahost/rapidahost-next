// middleware.ts — ป้องกัน /admin/* และ /api/admin/* ด้วย x-admin-key
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const protect =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin')

  if (!protect) return NextResponse.next()

  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('x-admin-key')
  if (key && process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY) {
    return NextResponse.next()
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
