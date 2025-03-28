import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  try {
    // Create a response to modify its headers
    const res = NextResponse.next()
    
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Attempt to refresh the session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
      // Token is expired, attempt to refresh
      const { data: { session: newSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError || !newSession) {
        // If refresh fails, redirect to auth page
        const redirectUrl = new URL('/auth', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Public paths that don't require authentication
    const publicPatterns = [
      /^\/$/,                    // home page
      /^\/auth$/,                // auth page
      /^\/leagues\/?$/,          // leagues listing
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