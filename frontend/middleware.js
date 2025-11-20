import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Get token from cookie
  const token = request.cookies.get('token')?.value
  
  // Protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard')
  
  // Block access to /dashboard without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // If logged in and accessing /login, redirect to dashboard
  if (pathname === '/login' && token) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}