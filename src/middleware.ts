import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  try {
    // Create a response to modify its headers
    const res = NextResponse.next()
    
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Refresh the session - this will update the response headers
    const { data: { session }, error } = await supabase.auth.getSession()

    // Debug logging
    console.log('Middleware auth check:', {
      path: req.nextUrl.pathname,
      hasSession: !!session,
      sessionId: session?.user?.id,
      error: error?.message
    })

    // Public paths that don't require authentication
    const publicPatterns = [
      /^\/$/,                    // home page
      /^\/auth$/,                // auth page
      /^\/leagues\/?$/,          // leagues listing (with optional trailing slash)
      /^\/leagues\/completed$/   // completed leagues
    ]
    const isPublicPath = publicPatterns.some(pattern => pattern.test(req.nextUrl.pathname))

    // If no session and trying to access a protected route, redirect to /auth
    if (!session && !isPublicPath) {
      const redirectUrl = new URL('/auth', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Return the response with the session cookie
    return res

  } catch (error) {
    console.error('Middleware error:', error)
    const redirectUrl = new URL('/auth', req.url)
    return NextResponse.redirect(redirectUrl)
  }
}

// Specify which routes should be handled by this middleware
export const config = {
  matcher: [
    // Match all routes except static files, images, favicon, and public files
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
} 