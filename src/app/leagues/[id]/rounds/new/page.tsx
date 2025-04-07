'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../../../supabaseClient'

const createRoundSchema = z.object({
  theme: z.string().min(3, 'Theme must be at least 3 characters'),
  submission_deadline: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Submission deadline must be in the future',
  }),
  voting_deadline: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Voting deadline must be in the future',
  }),
}).refine((data) => new Date(data.voting_deadline) > new Date(data.submission_deadline), {
  message: 'Voting deadline must be after submission deadline',
  path: ['voting_deadline'],
})

type CreateRoundForm = z.infer<typeof createRoundSchema>

export default function NewRoundPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextRoundNumber, setNextRoundNumber] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRoundForm>({
    resolver: zodResolver(createRoundSchema),
  })

  useEffect(() => {
    const fetchRoundData = async () => {
      try {
        // First, verify the user is the league creator
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth')
          return
        }

        const { data: league, error: leagueError } = await supabase
          .from('leagues')
          .select('creator_id, number_of_rounds')
          .eq('id', params.id)
          .single()

        if (leagueError) throw leagueError

        if (league.creator_id !== user.id) {
          router.push(`/leagues/${params.id}`)
          return
        }

        // Get the current number of rounds
        const { data: rounds, error: roundsError } = await supabase
          .from('league_rounds')
          .select('round_number')
          .eq('league_id', params.id)
          .order('round_number', { ascending: false })
          .limit(1)

        if (roundsError) throw roundsError

        const currentMaxRound = rounds?.[0]?.round_number ?? 0
        if (currentMaxRound >= league.number_of_rounds) {
          router.push(`/leagues/${params.id}`)
          return
        }

        setNextRoundNumber(currentMaxRound + 1)
      } catch (err) {
        console.error('Error fetching round data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    }

    fetchRoundData()
  }, [params.id, router, supabase])

  const onSubmit = async (data: CreateRoundForm) => {
    if (!nextRoundNumber) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: roundError } = await supabase
        .from('league_rounds')
        .insert([
          {
            league_id: params.id,
            round_number: nextRoundNumber,
            theme: data.theme,
            submission_deadline: new Date(data.submission_deadline).toISOString(),
            voting_deadline: new Date(data.voting_deadline).toISOString(),
            is_submission_open: true,
            is_voting_open: false,
          },
        ])

      if (roundError) throw roundError

      router.push(`/leagues/${params.id}`)
    } catch (err) {
      console.error('Error creating round:', err)
      setError(err instanceof Error ? err.message : 'Failed to create round')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!nextRoundNumber) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Round {nextRoundNumber}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
            Theme
          </label>
          <input
            type="text"
            id="theme"
            {...register('theme')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
          {errors.theme && (
            <p className="mt-1 text-sm text-red-600">{errors.theme.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="submission_deadline" className="block text-sm font-medium text-gray-700">
              Submission Deadline
            </label>
            <input
              type="datetime-local"
              id="submission_deadline"
              {...register('submission_deadline')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.submission_deadline && (
              <p className="mt-1 text-sm text-red-600">{errors.submission_deadline.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="voting_deadline" className="block text-sm font-medium text-gray-700">
              Voting Deadline
            </label>
            <input
              type="datetime-local"
              id="voting_deadline"
              {...register('voting_deadline')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.voting_deadline && (
              <p className="mt-1 text-sm text-red-600">{errors.voting_deadline.message}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push(`/leagues/${params.id}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Creating...' : 'Create Round'}
          </button>
        </div>
      </form>
    </div>
  )
} 