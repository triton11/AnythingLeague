'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const createLeagueSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  number_of_rounds: z.number().min(1, 'Must have at least 1 round'),
  upvotes_per_user: z.number().min(0, 'Cannot be negative'),
  downvotes_per_user: z.number().min(0, 'Cannot be negative'),
  start_date: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Start date must be in the future',
  }),
})

type CreateLeagueForm = z.infer<typeof createLeagueSchema>

export default function NewLeaguePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient<Database>()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLeagueForm>({
    resolver: zodResolver(createLeagueSchema),
  })

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('Auth state:', { user, error }) // Debug log
        if (error) {
          console.error('Auth error:', error)
          setError(error.message)
        } else {
          setUser(user)
        }
      } catch (err) {
        console.error('Auth error:', err)
        setError('Failed to get user')
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state change:', { session }) // Debug log
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const onSubmit = async (data: CreateLeagueForm) => {
    if (!user) {
      setError('You must be logged in to create a league')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create the league
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert([
          {
            name: data.name,
            description: data.description,
            number_of_rounds: data.number_of_rounds,
            start_date: new Date(data.start_date).toISOString(),
            creator_id: user.id,
            upvotes_per_user: data.upvotes_per_user,
            downvotes_per_user: data.downvotes_per_user,
            is_active: true
          }
        ])
        .select()
        .single()

      if (leagueError) throw leagueError

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('league_members')
        .insert([
          {
            league_id: league.id,
            user_id: user.id
          }
        ])

      if (memberError) throw memberError

      router.push(`/leagues/${league.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If we're still checking auth status, show loading
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  // If there's no user after loading is complete, show error
  if (!isLoading && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You must be logged in to create a league. Please sign in and try again.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New League</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            League Name
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="number_of_rounds" className="block text-sm font-medium text-gray-700">
              Number of Rounds
            </label>
            <input
              type="number"
              id="number_of_rounds"
              min="1"
              {...register('number_of_rounds', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.number_of_rounds && (
              <p className="mt-1 text-sm text-red-600">{errors.number_of_rounds.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              {...register('start_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.start_date && (
              <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="upvotes_per_user" className="block text-sm font-medium text-gray-700">
              Upvotes Per User
            </label>
            <input
              type="number"
              id="upvotes_per_user"
              min="0"
              {...register('upvotes_per_user', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.upvotes_per_user && (
              <p className="mt-1 text-sm text-red-600">{errors.upvotes_per_user.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="downvotes_per_user" className="block text-sm font-medium text-gray-700">
              Downvotes Per User
            </label>
            <input
              type="number"
              id="downvotes_per_user"
              min="0"
              {...register('downvotes_per_user', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
            {errors.downvotes_per_user && (
              <p className="mt-1 text-sm text-red-600">{errors.downvotes_per_user.message}</p>
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </form>
    </div>
  )
} 