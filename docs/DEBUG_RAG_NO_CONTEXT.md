# Debugging: RAG Chat Returns 0 Context Chunks

If your RAG chat is returning 0 context chunks even after processing documents, follow these steps:

## Step 1: Check Edge Function Logs

1. Go to **Supabase Dashboard → Edge Functions → rag-chat → Logs**
2. Look for these log messages:
   - `📊 User has X total vectors in database`
   - `📐 Stored vector dimensions: X`
   - `📐 Query embedding dimensions: X`
   - `❌ DIMENSION MISMATCH!` (if present)

## Step 2: Verify Embedding Dimensions Match

The most common issue is **embedding dimension mismatch**:

- **Query embeddings** must have the **same dimensions** as **stored vectors**
- If documents were processed with Hugging Face (384 dims), queries must also use Hugging Face
- If documents were processed with OpenAI (1536 dims), queries must also use OpenAI

### Check What Provider Was Used

Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  metadata->>'embedding_provider' as provider,
  metadata->>'embedding_dimensions' as dimensions,
  COUNT(*) as count
FROM document_vector
WHERE user_id = auth.uid()
GROUP BY provider, dimensions;
```

### Check Current Embedding Provider

The edge function uses the `EMBEDDING_PROVIDER` secret. Check it:

```bash
supabase secrets list
```

Or in Dashboard: **Edge Functions → Settings → Secrets**

## Step 3: Fix Dimension Mismatch

### Option A: Reprocess Documents with Matching Provider

1. Set the embedding provider to match your query:
   ```bash
   supabase secrets set EMBEDDING_PROVIDER=openai  # or huggingface, cohere
   ```

2. Reprocess all documents (delete vectors first, then reprocess):
   ```sql
   -- Delete existing vectors
   DELETE FROM document_vector WHERE user_id = auth.uid();
   ```

3. Then use the "Process Documents" button in the RAG Chat Test component

### Option B: Use Matching Provider for Queries

1. Check what provider was used for documents (see SQL above)
2. Set `EMBEDDING_PROVIDER` to match that provider
3. Redeploy `rag-chat` function:
   ```bash
   supabase functions deploy rag-chat
   ```

## Step 4: Check Vector Count

Run this SQL to verify vectors exist:

```sql
SELECT 
  COUNT(*) as total_vectors,
  COUNT(DISTINCT document_id) as documents_with_vectors
FROM document_vector
WHERE user_id = auth.uid();
```

If this returns 0, documents haven't been processed.

## Step 5: Test Semantic Search Directly

Test the search function with a sample query:

```sql
-- First, get a sample embedding (you'll need to generate this via the edge function)
-- Then test the search:

SELECT * FROM search_documents_semantic(
  query_embedding := '[your-embedding-array-here]'::vector(1536),
  match_threshold := 0.3,
  match_count := 10,
  user_filter := auth.uid()
);
```

## Step 6: Check Document Content

Verify documents actually have content:

```sql
SELECT 
  id,
  title,
  type,
  LENGTH(content) as content_length,
  LEFT(content, 100) as preview
FROM document
WHERE user_id = auth.uid()
  AND type IN ('text', 'page', 'pdf')
  AND content IS NOT NULL
  AND LENGTH(content) > 0
ORDER BY created_at DESC
LIMIT 10;
```

## Step 7: Check Processing Status

Verify documents were actually processed:

```sql
SELECT 
  d.id,
  d.title,
  d.type,
  COUNT(dv.id) as vector_count,
  MAX(dv.created_at) as last_processed
FROM document d
LEFT JOIN document_vector dv ON d.id = dv.document_id
WHERE d.user_id = auth.uid()
  AND d.type IN ('text', 'page', 'pdf')
  AND d.content IS NOT NULL
  AND LENGTH(d.content) > 0
GROUP BY d.id, d.title, d.type
ORDER BY vector_count DESC;
```

## Common Issues

### Issue 1: Dimension Mismatch
**Symptoms:** Vectors exist but search returns 0 results  
**Fix:** Ensure `EMBEDDING_PROVIDER` matches how documents were processed

### Issue 2: No Vectors
**Symptoms:** Documents exist but no vectors  
**Fix:** Process documents using the "Process Documents" button

### Issue 3: Threshold Too High
**Symptoms:** Vectors exist, dimensions match, but no results  
**Fix:** The function now tries lower thresholds (0.5, then 0.3) automatically

### Issue 4: Wrong User Filter
**Symptoms:** Vectors exist but not for your user  
**Fix:** Check `user_id` in `document_vector` table matches your user ID

## Quick Fix Checklist

- [ ] Check edge function logs for dimension mismatch errors
- [ ] Verify `EMBEDDING_PROVIDER` secret is set correctly
- [ ] Check that vectors exist: `SELECT COUNT(*) FROM document_vector WHERE user_id = auth.uid()`
- [ ] Verify embedding dimensions match (query vs stored)
- [ ] Try reprocessing documents with matching provider
- [ ] Check that documents have content and are type `text`, `page`, or `pdf`

## Still Not Working?

1. Check browser console for errors
2. Check Supabase edge function logs
3. Verify API keys are set correctly
4. Try processing a single document manually via edge function invoke
5. Check that the `search_documents_semantic` function exists in your database

