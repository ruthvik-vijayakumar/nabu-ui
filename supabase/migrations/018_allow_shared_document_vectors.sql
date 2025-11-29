-- 018_allow_shared_document_vectors.sql
-- Update RLS policy on document_vector to allow viewing vectors for documents in shared scribes

-- Drop existing policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'document_vector' 
      AND policyname = 'Document vectors: select own'
  ) THEN
    DROP POLICY "Document vectors: select own" ON document_vector;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'document_vector' 
      AND policyname = 'Users can view own document vectors'
  ) THEN
    DROP POLICY "Users can view own document vectors" ON document_vector;
  END IF;
END $$;

-- Create new policy that allows viewing vectors for:
-- 1. Documents owned by the user
-- 2. Documents in scribes shared with the user
CREATE POLICY "Users can view own and shared document vectors" ON document_vector
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM document d
      JOIN scribe_share ss ON ss.scribe_id = d.scribe_id
      WHERE d.id = document_vector.document_id
        AND ss.shared_with_user_id = auth.uid()
        AND ss.can_view = true
    )
  );

