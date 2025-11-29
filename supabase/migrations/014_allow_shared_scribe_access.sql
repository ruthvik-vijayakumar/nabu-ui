
DO $$
BEGIN
  IF to_regclass('public.scribe') IS NOT NULL THEN
    -- Drop the existing "Scribes: select own" policy if it exists
    EXECUTE 'DROP POLICY IF EXISTS "Scribes: select own" ON scribe';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own scribes" ON scribe';

    -- Create a new policy that allows users to view owned or shared scribes
    EXECUTE $policy$
      CREATE POLICY "Users can view own and shared scribes" ON scribe
        FOR SELECT USING (
          auth.uid() = user_id OR
          EXISTS (
            SELECT 1 FROM scribe_share
            WHERE scribe_share.scribe_id = scribe.id
            AND scribe_share.shared_with_user_id = auth.uid()
            AND scribe_share.can_view = true
          )
        )
    $policy$;
  ELSE
    RAISE NOTICE 'Table "scribe" does not exist yet. Skipping scribe policy updates.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.scribe_message') IS NOT NULL THEN
    -- Update scribe_message RLS to allow viewing messages for shared scribes
    EXECUTE 'DROP POLICY IF EXISTS "Scribes: select own" ON scribe_message';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own scribe messages" ON scribe_message';
    EXECUTE 'DROP POLICY IF EXISTS "Scribe messages: select own" ON scribe_message';

    EXECUTE $policy$
      CREATE POLICY "Users can view own and shared scribe messages" ON scribe_message
        FOR SELECT USING (
          auth.uid() = user_id OR
          EXISTS (
            SELECT 1 FROM scribe_share
            INNER JOIN scribe ON scribe.id = scribe_share.scribe_id
            WHERE scribe_share.scribe_id = scribe_message.scribe_id
            AND scribe_share.shared_with_user_id = auth.uid()
            AND scribe_share.can_view = true
          )
        )
    $policy$;
  ELSE
    RAISE NOTICE 'Table "scribe_message" does not exist yet. Skipping scribe_message policy updates.';
  END IF;
END $$;

-- Update document RLS to allow viewing documents in shared scribes
-- First, check if the policy exists and drop it
DO $$
BEGIN
  IF to_regclass('public.document') IS NOT NULL THEN
    -- Drop existing document select policies that might conflict
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'document' 
      AND policyname = 'Documents: select own'
    ) THEN
      EXECUTE 'DROP POLICY "Documents: select own" ON document';
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'document' 
      AND policyname = 'Users can view own documents'
    ) THEN
      EXECUTE 'DROP POLICY "Users can view own documents" ON document';
    END IF;

    -- Create new policy that allows viewing documents in shared scribes
    EXECUTE $policy$
      CREATE POLICY "Users can view own and shared documents" ON document
        FOR SELECT USING (
          auth.uid() = user_id OR
          EXISTS (
            SELECT 1 FROM scribe_share
            WHERE scribe_share.scribe_id = document.scribe_id
            AND scribe_share.shared_with_user_id = auth.uid()
            AND scribe_share.can_view = true
          )
        )
    $policy$;
  ELSE
    RAISE NOTICE 'Table "document" does not exist yet. Skipping document policy updates.';
  END IF;
END $$;

