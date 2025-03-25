-- Drop existing constraints and policies
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_submission_id_user_id_key;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_value_check;
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON votes;

-- Add unique constraint to ensure one vote per user per submission
ALTER TABLE votes ADD CONSTRAINT votes_submission_id_user_id_key UNIQUE (submission_id, user_id);

-- Update RLS policies to allow users to update their own votes
CREATE POLICY "Users can update their own votes"
ON votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to delete their own votes
CREATE POLICY "Users can delete their own votes"
ON votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id); 