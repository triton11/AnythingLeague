'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

type League = Database['public']['Tables']['leagues']['Row']

type LeagueMemberWithLeague = {
  league: League
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function fetchUserLeagues() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        if (!currentUser) {
          setLoading(false)
          return
        }

        // Fetch leagues where user is a member
        const { data: membersData, error: membersError } = await supabase
          .from('league_members')
          .select(`
            league:leagues (
              id,
              name,
              description,
              number_of_rounds,
              start_date,
              is_active,
              creator_id,
              upvotes_per_user,
              downvotes_per_user,
              created_at
            )
          `)
          .eq('user_id', currentUser.id)
          .eq('leagues.is_active', true) as { data: LeagueMemberWithLeague[] | null, error: Error }

        if (membersError) throw membersError

        // Transform the data to get just the league objects
        const userLeagues = (membersData || []).map(member => member.league)
        setLeagues(userLeagues)
      } catch (error) {
        console.error('Error fetching leagues:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserLeagues()
  }, [supabase])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          Loading...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          Please sign in to view your leagues.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {leagues && leagues.length > 0 ? (
          leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600">
                  {league.name}
                </h2>
                <p className="mt-2 text-gray-600 line-clamp-2">
                  {league.description}
                </p>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <span>
                    {league.number_of_rounds} rounds •{' '}
                    {new Date(league.start_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Leagues Yet
              </h3>
              <p className="text-gray-600 mb-6">
                You have not joined any leagues yet. Ask a friend to share a league link with you!
              </p>
              <Link
                href="/leagues/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                Create Your Own League
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 