'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../app/supabaseClient'


export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  const handleSignOut = useCallback(async () => {
    try {
      console.log('Signing out...')

      // Clear Supabase cookies manually
      document.cookie.split(';').forEach(cookie => {
        if (cookie.includes('sb-')) {
          const [name] = cookie.split('=')
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
      
      // Create a promise that rejects after 5 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      })

      // Race between sign out and timeout
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]) as { error: Error }

      if (error) throw error
      
      // Clear local state
      setUser(null)
      setUsername(null)
      
      // Force a hard refresh of the page
      window.location.href = '/'
    } catch (err) {
      console.error('Error signing out:', err)
      // Even if there's an error or timeout, try to clear cookies and refresh
      document.cookie.split(';').forEach(cookie => {
        if (cookie.includes('sb-')) {
          const [name] = cookie.split('=')
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
      window.location.href = '/'
    }
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
          // Token is expired, attempt to refresh
          const { data: { session: newSession }, error: refreshError } = 
            await supabase.auth.refreshSession()
          
          if (refreshError || !newSession) {
            // If refresh fails, sign out
            await handleSignOut()
            return
          }
          
          setUser(newSession.user)
        } else {
          setUser(session?.user ?? null)
        }

        if (session?.user) {
          // Fetch the username from the users table
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', session.user.id)
            .limit(1)
          
          if (userData && userData.length > 0) {
            setUsername(userData[0].username)
          }
        }
      } catch (err) {
        console.error('Error getting user:', err)
        await handleSignOut()
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
        // Token is expired, attempt to refresh
        const { data: { session: newSession }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !newSession) {
          // If refresh fails, sign out
          await handleSignOut()
          return
        }
        
        setUser(newSession.user)
      } else {
        setUser(session?.user ?? null)
      }
      
      if (session?.user) {
        // Fetch the username when auth state changes
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', session.user.id)
          .limit(1)
        
        if (userData && userData.length > 0) {
          setUsername(userData[0].username)
        }
      } else {
        setUsername(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, handleSignOut])

  return (
    <nav className="bg-purple-600 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold text-white group-hover:text-white/90 transition-colors duration-200">
                Anything League
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            {user ? (
              <>
                <Link
                  href="/leagues"
                  className="nav-link"
                >
                  My Leagues
                </Link>
                <span className="nav-link">
                  {username || user.email?.split('@')[0] || 'User'}
                </span>
                <button
                  onClick={handleSignOut}
                  className="nav-link"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="nav-link"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 