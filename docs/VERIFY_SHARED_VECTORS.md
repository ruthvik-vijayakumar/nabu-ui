# Verify Shared Vectors Access

## Step 1: Check if RLS Policy is Applied

Run this in Supabase SQL Editor:

```sql
-- Check if the shared document vectors policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'document_vector'
  AND policyname = 'Users can view own and shared document vectors';
```

If this returns no rows, the migration `018_allow_shared_document_vectors.sql` was not applied.

## Step 2: Check if Vectors Exist for Documents

```sql
-- Replace with your scribe_id
SELECT 
  d.id as document_id,
  d.title,
  d.scribe_id,
  COUNT(dv.id) as vector_count
FROM document d
LEFT JOIN document_vector dv ON dv.document_id = d.id
WHERE d.scribe_id = 'YOUR_SCRIBE_ID_HERE'
GROUP BY d.id, d.title, d.scribe_id
ORDER BY vector_count DESC;
```

## Step 3: Check RLS Policy Details

```sql
-- View the actual policy definition
SELECT 
  policyname,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'document_vector'::regclass
  AND policyname = 'Users can view own and shared document vectors';
```

## Step 4: Test RLS Access (as shared user)

If you're testing as a shared user, run this to see if RLS allows access:

```sql
-- This should return vectors if RLS is working
SELECT 
  dv.id,
  dv.document_id,
  d.scribe_id,
  d.title
FROM document_vector dv
JOIN document d ON d.id = dv.document_id
WHERE d.scribe_id = 'YOUR_SCRIBE_ID_HERE'
LIMIT 10;
```

If this returns 0 rows but you know vectors exist, the RLS policy is blocking access.

## Step 5: Apply Migration if Needed

If the policy doesn't exist, run migration `018_allow_shared_document_vectors.sql`:

```sql
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

-- Create new policy
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
```

## Step 6: Check Edge Function Logs

After redeploying the `rag-chat` function, check the logs for:
- `📄 Found X documents in scribe`
- `📊 Found X vectors for this scribe`
- `🔍 Direct vector query test: Found X vectors accessible via RLS`
- `📊 Flexible search returned X results`

If you see "Found 0 vectors" but documents exist, either:
1. Documents haven't been processed (no vectors created)
2. RLS is blocking access
3. Documents have no content to vectorize

