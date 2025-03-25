'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch the username from the users table
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .limit(1)

        if (userData && userData.length > 0) {
          setUsername(userData[0].username)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      
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
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="bg-purple-600 sticky top-0 z-50">
      <div className="container-width">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <span className="text-xl font-bold text-white group-hover:text-white/90 transition-colors duration-200">
                AnythingLeague
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