'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

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