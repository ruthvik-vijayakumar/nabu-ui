-- Allow users to select scribes that have been shared with them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'scribe' 
      AND policyname = 'Users can view own and shared scribes'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view own and shared scribes" ON scribe';
  END IF;
END $$;

CREATE POLICY "Users can view own and shared scribes" ON scribe
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM scribe_share
      WHERE scribe_share.scribe_id = scribe.id
        AND scribe_share.shared_with_user_id = auth.uid()
        AND scribe_share.can_view = true
    )
  );

