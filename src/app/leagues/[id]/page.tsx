'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import Link from 'next/link'

type League = Database['public']['Tables']['leagues']['Row']
type LeagueMember = Database['public']['Tables']['league_members']['Row'] & {
  users: {
    username: string
  }
}
type LeagueRound = Database['public']['Tables']['league_rounds']['Row']

interface LeagueDetailPageProps {
  params: { id: string }
}

export default function LeagueDetailPage({ params }: LeagueDetailPageProps) {
  const router = useRouter()
  const [league, setLeague] = useState<League | null>(null)
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [rounds, setRounds] = useState<LeagueRound[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number | null>(null)
  const [isLeagueComplete, setIsLeagueComplete] = useState(false)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        // Fetch league details
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select(`
            *,
            league_members (
              id,
              user_id,
              total_points,
              users:user_id (
                username
              )
            )
          `)
          .eq('id', params.id)
          .single()

        if (leagueError) throw leagueError
        setLeague(leagueData)
        setIsCreator(currentUser?.id === leagueData.creator_id)

        // Set members from league data
        setMembers(leagueData.league_members || [])

        // Fetch rounds
        const { data: roundsData, error: roundsError } = await supabase
          .from('league_rounds')
          .select('*')
          .eq('league_id', params.id)
          .order('round_number', { ascending: true })

        if (roundsError) throw roundsError
        setRounds(roundsData || [])

        // Find the current round (lowest round number with submissions open)
        const { data: currentRoundData } = await supabase
          .from('league_rounds')
          .select('round_number')
          .eq('league_id', params.id)
          .eq('is_submission_open', true)
          .order('round_number', { ascending: true })
          .limit(1)
          .single()

        if (currentRoundData) {
          // Check if the previous round's voting has ended
          if (currentRoundData.round_number > 1) {
            const { data: previousRoundData } = await supabase
              .from('league_rounds')
              .select('is_voting_open')
              .eq('league_id', params.id)
              .eq('round_number', currentRoundData.round_number - 1)
              .single()

            // Only consider this the current round if the previous round's voting has ended
            if (!previousRoundData || !previousRoundData.is_voting_open) {
              setCurrentRoundNumber(currentRoundData.round_number)
            }
          } else {
            // For round 1, just check if it has submissions open
            setCurrentRoundNumber(currentRoundData.round_number)
          }
        }

        // Check if current user is a member
        if (currentUser) {
          const memberData = leagueData.league_members.find(
            (member: { user_id: string }) => member.user_id === currentUser.id
          )
          setIsMember(!!memberData)
        }

        // Check if all rounds are complete
        const allRoundsComplete = roundsData?.every(round => 
          !round.is_submission_open && !round.is_voting_open
        )
        setIsLeagueComplete(allRoundsComplete || false)
      } catch (err) {
        console.error('Error fetching league data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, supabase])

  const handleJoinLeague = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    try {
      const { error } = await supabase
        .from('league_members')
        .insert([{ user_id: user.id, league_id: params.id }])

      if (error) throw error

      // Refresh the members list
      const { data: membersData, error: membersError } = await supabase
        .from('league_members')
        .select(`
          *,
          users:user_id (
            username
          )
        `)
        .eq('league_id', params.id)
        .not('users', 'is', null)

      if (membersError) throw membersError
      setMembers(membersData)
      setIsMember(true)
    } catch (err) {
      console.error('Error joining league:', err)
      setError(err instanceof Error ? err.message : 'Failed to join league')
    }
  }

  const handleLeaveLeague = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('user_id', user.id)
        .eq('league_id', params.id)

      if (error) throw error

      // Refresh the members list
      const { data: membersData, error: membersError } = await supabase
        .from('league_members')
        .select(`
          *,
          users:user_id (
            username
          )
        `)
        .eq('league_id', params.id)
        .not('users', 'is', null)

      if (membersError) throw membersError
      setMembers(membersData)
      setIsMember(false)
    } catch (err) {
      console.error('Error leaving league:', err)
      setError(err instanceof Error ? err.message : 'Failed to leave league')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">League not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* League Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{league.name}</h1>
            <p className="mt-2 text-gray-600">{league.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{league.number_of_rounds} rounds</span>
              <span className="hidden sm:inline">•</span>
              <span>Starts {new Date(league.start_date).toLocaleDateString()}</span>
              <span className="hidden sm:inline">•</span>
              <span>{members.length} members</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {isLeagueComplete && (
              <Link
                href={`/leagues/${params.id}/results`}
                className="btn-primary w-full sm:w-auto text-center"
              >
                View Final Results
              </Link>
            )}
            <div className="w-full sm:w-auto">
              {isMember ? (
                <button
                  onClick={handleLeaveLeague}
                  className="btn-secondary w-full sm:w-auto text-center"
                >
                  Leave League
                </button>
              ) : (
                <button
                  onClick={handleJoinLeague}
                  className="btn-primary w-full sm:w-auto text-center"
                >
                  Join League
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* League Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rounds Section */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Rounds</h2>
              {isCreator && rounds.length < league.number_of_rounds && (
                <button
                  onClick={() => router.push(`/leagues/${params.id}/rounds/new`)}
                  className="btn-primary"
                >
                  Create Round
                </button>
              )}
            </div>
            {rounds.length > 0 ? (
              <div className="space-y-4">
                {rounds.map((round) => (
                  <div
                    key={round.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-200 transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/leagues/${params.id}/rounds/${round.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Round {round.round_number}: {round.theme}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500">
                          <p>Submissions due: {new Date(round.submission_deadline).toLocaleString()}</p>
                          <p>Voting ends: {new Date(round.voting_deadline).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {round.is_submission_open && round.round_number === currentRoundNumber && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Submissions Open
                          </span>
                        )}
                        {round.is_voting_open && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Voting Open
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No rounds have been created yet.
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Members</h2>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {member.users?.username || 'Anonymous User'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-800 px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
} 