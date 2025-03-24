'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

interface LeagueResultsPageProps {
  params: { id: string }
}

type League = Database['public']['Tables']['leagues']['Row']

type UserResult = {
  username: string
  totalVotes: number
  rank: number
}

export default function LeagueResultsPage({ params }: LeagueResultsPageProps) {
  const [league, setLeague] = useState<League | null>(null)
  const [results, setResults] = useState<UserResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Fetch league details
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', params.id)
          .single()

        if (leagueError) throw leagueError
        setLeague(leagueData)

        // First, get all round IDs for this league
        const { data: roundIds, error: roundsError } = await supabase
          .from('league_rounds')
          .select('id')
          .eq('league_id', params.id)

        if (roundsError) throw roundsError

        // Then fetch all submissions with votes for these rounds
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            users:user_id (
              username
            ),
            votes (
              value
            )
          `)
          .in('league_round_id', roundIds.map(round => round.id))

        if (submissionsError) throw submissionsError

        // Calculate total votes per user
        const userTotals = submissionsData.reduce((acc, submission) => {
          const username = submission.users.username
          const totalVotes = submission.votes.reduce((sum, vote) => sum + vote.value, 0)
          acc[username] = (acc[username] || 0) + totalVotes
          return acc
        }, {} as { [key: string]: number })

        // Convert to array and sort by total votes
        const sortedResults = Object.entries(userTotals)
          .map(([username, totalVotes]) => ({ username, totalVotes }))
          .sort((a, b) => b.totalVotes - a.totalVotes)
          .map((result, index) => ({
            ...result,
            rank: index + 1
          }))

        setResults(sortedResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch results')
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [params.id, supabase])

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
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {league.name} - Final Results
            </h1>
            <p className="mt-2 text-gray-600">
              Total votes received across all rounds
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Votes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.username}>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {result.rank <= 3 ? (
                      <span className="text-2xl">
                        {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      result.rank
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {result.username}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className={result.totalVotes > 0 ? 'text-green-600' : result.totalVotes < 0 ? 'text-red-600' : 'text-gray-900'}>
                      {result.totalVotes > 0 ? `+${result.totalVotes}` : result.totalVotes}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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