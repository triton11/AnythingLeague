'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type LeagueRound = Database['public']['Tables']['league_rounds']['Row']
type Submission = Database['public']['Tables']['submissions']['Row'] & {
  users: {
    username: string
  }
  votes: {
    value: number
    user_id: string
    comment: string | null
    users: {
      username: string
    }
  }[]
}
type League = Database['public']['Tables']['leagues']['Row']
type LocalVote = {
  value: number
  comment?: string
}

export default function RoundDetailPage({
  params,
}: {
  params: { id: string; roundId: string }
}) {
  const router = useRouter()
  const [round, setRound] = useState<LeagueRound | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionContent, setSubmissionContent] = useState('')
  const [submissionType, setSubmissionType] = useState<'URL' | 'TEXT' | 'IMAGE'>('TEXT')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [userSubmission, setUserSubmission] = useState<Submission | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCurrentRound, setIsCurrentRound] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [upvotesRemaining, setUpvotesRemaining] = useState(0)
  const [downvotesRemaining, setDownvotesRemaining] = useState(0)
  const [localVotes, setLocalVotes] = useState<{ [key: string]: LocalVote }>({})
  const [isSubmittingVotes, setIsSubmittingVotes] = useState(false)
  const [hasSubmittedVotes, setHasSubmittedVotes] = useState(false)
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchRoundData = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        // Fetch round data
        const { data: roundData, error: roundError } = await supabase
          .from('league_rounds')
          .select(`
            *,
            league:league_id (
              id,
              name,
              description,
              creator_id,
              created_at,
              league_members (
                user_id
              )
            )
          `)
          .eq('id', params.roundId)
          .single()

        if (roundError) throw roundError
        setRound(roundData)

        // Check if this is the current round
        const { data: currentRoundData, error: currentRoundError } = await supabase
          .from('league_rounds')
          .select('round_number')
          .eq('league_id', params.id)
          .eq('is_submission_open', true)
          .order('round_number', { ascending: true })
          .limit(1)
          .single()

        if (currentRoundError && currentRoundError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw currentRoundError
        }

        // If no rounds have submissions open, find the round with the highest round number
        if (!currentRoundData) {
          const { data: latestRoundData, error: latestRoundError } = await supabase
            .from('league_rounds')
            .select('round_number')
            .eq('league_id', params.id)
            .order('round_number', { ascending: false })
            .limit(1)
            .single()

          if (latestRoundError) throw latestRoundError

          // The current round is the one with the highest round number
          setIsCurrentRound(latestRoundData?.round_number === roundData.round_number)
        } else {
          // Check if the previous round's voting has ended
          if (currentRoundData && currentRoundData.round_number > 1) {
            const { data: previousRoundData } = await supabase
              .from('league_rounds')
              .select('is_voting_open')
              .eq('league_id', params.id)
              .eq('round_number', currentRoundData.round_number - 1)
              .single()

            // Only consider this the current round if the previous round's voting has ended
            setIsCurrentRound(
              currentRoundData?.round_number === roundData.round_number && 
              (!previousRoundData || !previousRoundData.is_voting_open)
            )
          } else {
            // For round 1, just check if it's the round with submissions open
            setIsCurrentRound(currentRoundData?.round_number === roundData.round_number)
          }
        }

        // Fetch league details
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', params.id)
          .single()

        if (leagueError) throw leagueError
        setLeague(leagueData)
        setIsCreator(currentUser?.id === leagueData.creator_id)

        // Initialize remaining votes from league settings
        setUpvotesRemaining(leagueData.upvotes_per_user)
        setDownvotesRemaining(leagueData.downvotes_per_user)

        // Fetch submissions with votes
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            users:user_id (
              username
            ),
            votes (
              value,
              user_id,
              comment,
              users:user_id (
                username
              )
            )
          `)
          .eq('league_round_id', params.roundId)

        if (submissionsError) throw submissionsError
        setSubmissions(submissionsData || [])
        
        // Set local votes by aggregating votes per submission
        const localVotesMap = submissionsData?.reduce((acc, submission) => {
          const userVotes = submission.votes
            ?.filter(vote => vote.user_id === currentUser?.id)
            ?.reduce((sum, vote) => sum + vote.value, 0) || 0
          if (userVotes !== 0) {
            acc[submission.id] = { value: userVotes }
          }
          return acc
        }, {} as { [key: string]: LocalVote }) || {}

        setLocalVotes(localVotesMap)
        setHasSubmittedVotes(Object.keys(localVotesMap).length > 0)

        // Find user's submission if it exists
        if (currentUser) {
          const userSub = submissionsData?.find(s => s.user_id === currentUser.id)
          if (userSub) {
            setUserSubmission(userSub)
            setSubmissionContent(userSub.content)
            setSubmissionType(userSub.content_type)
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch round data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoundData()
  }, [params.roundId, params.id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !round) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (userSubmission) {
        // Update existing submission
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            content: submissionContent,
            content_type: submissionType,
          })
          .eq('id', userSubmission.id)

        if (updateError) throw updateError
      } else {
        // Create new submission
        const { error: submissionError } = await supabase
          .from('submissions')
          .insert([
            {
              league_round_id: round.id,
              user_id: user.id,
              content: submissionContent,
              content_type: submissionType,
            },
          ])

        if (submissionError) throw submissionError
      }

      // Refresh submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          users:user_id (
            username
          ),
          votes (
            value,
            user_id,
            comment
          )
        `)
        .eq('league_round_id', params.roundId)

      if (submissionsError) throw submissionsError
      setSubmissions(submissionsData || [])

      // Update user submission
      const updatedUserSub = submissionsData?.find(s => s.user_id === user.id)
      if (updatedUserSub) {
        setUserSubmission(updatedUserSub)
      }

      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVote = (submissionId: string, value: number) => {
    if (!user || !round || !league || hasSubmittedVotes) return

    // Check if user has reached their vote limit for this type
    if (value === 1 && upvotesRemaining <= 0) {
      setError('You have reached your upvote limit for this round')
      return
    }
    if (value === -1 && downvotesRemaining <= 0) {
      setError('You have reached your downvote limit for this round')
      return
    }

    // Calculate the new vote count and remaining votes
    const currentVote = localVotes[submissionId]?.value || 0
    let newUpvotesRemaining = upvotesRemaining
    let newDownvotesRemaining = downvotesRemaining

    // If changing vote type (from upvote to downvote or vice versa)
    if (currentVote !== 0 && Math.sign(currentVote) !== Math.sign(value)) {
      // Refund all previous votes of the same type as the current vote
      if (currentVote > 0) {
        // Refund all upvotes
        newUpvotesRemaining += Math.abs(currentVote)
      } else {
        // Refund all downvotes
        newDownvotesRemaining += Math.abs(currentVote)
      }
      // Reset the vote count to just the new vote
      const newVotes = {
        ...localVotes,
        [submissionId]: { value }
      }
      setLocalVotes(newVotes)
    } else {
      // Add to existing vote count if same type
      const newVotes = {
        ...localVotes,
        [submissionId]: { 
          value: currentVote + value,
          comment: localVotes[submissionId]?.comment
        }
      }
      setLocalVotes(newVotes)
    }

    // Decrement the appropriate remaining count for the new vote
    if (value === 1) newUpvotesRemaining -= 1
    if (value === -1) newDownvotesRemaining -= 1

    setUpvotesRemaining(newUpvotesRemaining)
    setDownvotesRemaining(newDownvotesRemaining)
  }

  const handleCommentChange = (submissionId: string, comment: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [submissionId]: comment
    }))
  }

  const handleSubmitVotes = async () => {
    if (!user || !round || !league || hasSubmittedVotes) return

    setIsSubmittingVotes(true)
    setError(null)

    try {
      // Create one vote per submission with the total value and comment
      const votes = Object.entries(localVotes).map(([submissionId, vote]) => ({
        submission_id: submissionId,
        user_id: user.id,
        value: vote.value,
        comment: commentInputs[submissionId] || null
      }))

      const { error: voteError } = await supabase
        .from('votes')
        .insert(votes)

      if (voteError) throw voteError

      // Refresh submissions to get updated votes
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          users:user_id (
            username
          ),
          votes (
            value,
            user_id,
            comment
          )
        `)
        .eq('league_round_id', params.roundId)

      if (submissionsError) throw submissionsError
      setSubmissions(submissionsData || [])
      
      // Update local state with the submitted votes
      const submittedVotes = votes.reduce((acc, vote) => {
        acc[vote.submission_id] = { 
          value: vote.value,
          comment: vote.comment
        }
        return acc
      }, {} as { [key: string]: LocalVote })
      
      setLocalVotes(submittedVotes)
      setHasSubmittedVotes(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit votes')
    } finally {
      setIsSubmittingVotes(false)
    }
  }

  const handleStartVoting = async () => {
    if (!round) return

    try {
      const { error: updateError } = await supabase
        .from('league_rounds')
        .update({
          is_submission_open: false,
          is_voting_open: true,
        })
        .eq('id', round.id)

      if (updateError) throw updateError

      // Update local state
      setRound({
        ...round,
        is_submission_open: false,
        is_voting_open: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start voting')
    }
  }

  const handleCloseVoting = async () => {
    if (!round) return

    try {
      // First, close voting for the current round
      const { error: updateError } = await supabase
        .from('league_rounds')
        .update({
          is_voting_open: false,
        })
        .eq('id', round.id)

      if (updateError) throw updateError

      // Check if there is a next round
      const { data: nextRoundData } = await supabase
        .from('league_rounds')
        .select('id')
        .eq('league_id', round.league_id)
        .eq('round_number', round.round_number + 1)
        .single()

      // Only try to open submissions for the next round if it exists
      if (nextRoundData) {
        const { error: openNextRoundError } = await supabase
          .from('league_rounds')
          .update({
            is_submission_open: true,
          })
          .eq('id', nextRoundData.id)

        if (openNextRoundError) throw openNextRoundError
      }

      // Update local state
      setRound({
        ...round,
        is_voting_open: false,
      })

      // Redirect to the league page
      router.push(`/leagues/${round.league_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close voting')
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user) return

    setIsUploading(true)
    setError(null)

    try {
      // Upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)

      setSubmissionContent(publicUrl)
      setSubmissionType('IMAGE')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  if (!round || !league) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">Round not found</div>
      </div>
    )
  }

  const getVoteTotal = (submission: Submission) => {
    return submission.votes.reduce((sum: number, vote: { value: number }) => sum + vote.value, 0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Round Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Round {round.round_number}: {round.theme}
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>Submissions due: {new Date(round.submission_deadline).toLocaleString()}</span>
              <span>•</span>
              <span>Voting ends: {new Date(round.voting_deadline).toLocaleString()}</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {round.is_submission_open && isCurrentRound && (
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
          {isCreator && round.is_submission_open && !round.is_voting_open && (
            <button
              onClick={handleStartVoting}
              className="btn-primary"
            >
              Start Voting
            </button>
          )}
          {isCreator && round.is_voting_open && (
            <button
              onClick={handleCloseVoting}
              className="btn-primary"
            >
              Close Voting
            </button>
          )}
        </div>
      </div>

      {/* Submission Form */}
      {round.is_submission_open && isCurrentRound && (
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {userSubmission ? 'Your Submission' : 'Submit Your Entry'}
            </h2>
            {userSubmission && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
              >
                Edit Submission
              </button>
            )}
          </div>
          {(isEditing || !userSubmission) && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="submissionType" className="block text-sm font-medium text-gray-700">
                  Submission Type
                </label>
                <select
                  id="submissionType"
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value as 'URL' | 'TEXT' | 'IMAGE')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                >
                  <option value="TEXT">Text</option>
                  <option value="URL">URL</option>
                  <option value="IMAGE">Image Upload</option>
                </select>
              </div>

              <div>
                <label htmlFor="submissionContent" className="block text-sm font-medium text-gray-700">
                  Content
                </label>
                {submissionType === 'TEXT' ? (
                  <textarea
                    id="submissionContent"
                    rows={4}
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    required
                  />
                ) : submissionType === 'IMAGE' ? (
                  <div className="mt-1">
                    <input
                      type="file"
                      id="submissionContent"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-purple-50 file:text-purple-700
                        hover:file:bg-purple-100"
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Uploading image...</p>
                      </div>
                    )}
                    {submissionContent && !isUploading && (
                      <div className="mt-2">
                        <img
                          src={submissionContent}
                          alt="Preview"
                          className="max-h-48 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    id="submissionContent"
                    value={submissionContent}
                    onChange={(e) => setSubmissionContent(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter URL"
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-4">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Submit Entry'}
                </button>
              </div>
            </form>
          )}
          {userSubmission && !isEditing && (
            <div className="mt-4">
              <div className="mt-2">
                {userSubmission.content_type === 'URL' ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <a
                      href={userSubmission.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="truncate">{userSubmission.content}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Open in new tab</span>
                        </div>
                      </div>
                    </a>
                  </div>
                ) : userSubmission.content_type === 'IMAGE' ? (
                  <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={userSubmission.content}
                      alt="Your submission"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">{userSubmission.content}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submissions List */}
      {(round.is_voting_open || (!round.is_submission_open && !round.is_voting_open)) && submissions.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Submissions</h2>
            {!hasSubmittedVotes && round.is_voting_open && (
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Upvotes remaining: {upvotesRemaining}</span>
                <span>•</span>
                <span>Downvotes remaining: {downvotesRemaining}</span>
              </div>
            )}
          </div>
          <div className="space-y-6">
            {submissions.map((submission) => {
              const isOwnSubmission = submission.user_id === user?.id
              const canUpvote = !isOwnSubmission && !hasSubmittedVotes && upvotesRemaining > 0
              const canDownvote = !isOwnSubmission && !hasSubmittedVotes && downvotesRemaining > 0
              const totalVotes = getVoteTotal(submission)

              return (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {round.is_voting_open ? (
                        isOwnSubmission ? (
                          <p className="text-sm text-gray-500 mb-2">
                            Your submission
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 mb-2">
                            Submission #{submission.id.slice(0, 8)}
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-gray-500 mb-2">
                          Submitted by {submission.users.username}
                        </p>
                      )}
                      <div className="mt-2">
                        {submission.content_type === 'URL' ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <a
                              href={submission.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:bg-gray-50 transition-colors duration-200"
                            >
                              <div className="p-4">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span className="truncate">{submission.content}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  <span>Open in new tab</span>
                                </div>
                              </div>
                            </a>
                          </div>
                        ) : submission.content_type === 'IMAGE' ? (
                          <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={submission.content}
                              alt="Submission"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <p className="text-gray-600">{submission.content}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-semibold ${round.is_voting_open ? 
                        (localVotes[submission.id]?.value > 0 ? 'text-green-600' : localVotes[submission.id]?.value < 0 ? 'text-red-600' : 'text-gray-900') :
                        (totalVotes > 0 ? 'text-green-600' : totalVotes < 0 ? 'text-red-600' : 'text-gray-900')
                      }`}>
                        {round.is_voting_open ? 
                          (localVotes[submission.id]?.value > 0 ? `+${localVotes[submission.id]?.value}` : localVotes[submission.id]?.value) :
                          (totalVotes > 0 ? `+${totalVotes}` : totalVotes)
                        }
                      </span>
                      {round.is_voting_open && !isOwnSubmission && !hasSubmittedVotes && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVote(submission.id, 1)}
                            disabled={!canUpvote}
                            className={`p-2 rounded-full ${canUpvote ? 'hover:bg-green-100' : 'opacity-50'}`}
                          >
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleVote(submission.id, -1)}
                            disabled={!canDownvote}
                            className={`p-2 rounded-full ${canDownvote ? 'hover:bg-red-100' : 'opacity-50'}`}
                          >
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {round.is_voting_open && !isOwnSubmission && !hasSubmittedVotes && (
                    <div className="mt-4">
                      <textarea
                        value={commentInputs[submission.id] || ''}
                        onChange={(e) => handleCommentChange(submission.id, e.target.value)}
                        placeholder="Add a comment (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                  {!round.is_voting_open && submission.votes.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Vote Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Voter
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Votes
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Comment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Object.entries(
                              submission.votes.reduce((acc, vote) => {
                                acc[vote.user_id] = (acc[vote.user_id] || 0) + vote.value
                                return acc
                              }, {} as { [key: string]: number })
                            ).map(([userId, totalVotes]) => {
                              const voter = submission.votes.find(v => v.user_id === userId)
                              return (
                                <tr key={userId}>
                                  <td className="px-3 py-2 text-sm text-gray-900">
                                    {voter?.users.username || 'Unknown User'}
                                  </td>
                                  <td className="px-3 py-2 text-sm">
                                    <span className={totalVotes > 0 ? 'text-green-600' : totalVotes < 0 ? 'text-red-600' : 'text-gray-900'}>
                                      {totalVotes > 0 ? `+${totalVotes}` : totalVotes}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-600">
                                    {voter?.comment || '-'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!hasSubmittedVotes && Object.keys(localVotes).length > 0 && round.is_voting_open && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmitVotes}
                disabled={isSubmittingVotes}
                className="btn-primary"
              >
                {isSubmittingVotes ? 'Submitting Votes...' : 'Submit Votes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-800 px-4 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
} 