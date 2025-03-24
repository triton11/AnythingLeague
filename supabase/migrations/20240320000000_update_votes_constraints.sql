-- Drop the unique constraint that prevents multiple votes from the same user on the same submission
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_submission_id_user_id_key;

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