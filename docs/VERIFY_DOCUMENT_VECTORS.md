# Verify Document Vectors

This guide shows how to verify that document vectors are being stored correctly in the `document_vector` table.

## Quick Verification

### 1. Check Vectors in Supabase Dashboard

Go to **Supabase Dashboard → Table Editor → `document_vector`**

You should see:
- `document_id` - Links to the document
- `chunk_text` - The text chunk
- `chunk_index` - Order of chunks
- `embedding` - The vector (1536 dimensions)
- `word_count` - Number of words in chunk
- `created_at` - When it was processed

### 2. SQL Queries

#### Count vectors for a document:
```sql
SELECT COUNT(*) as vector_count
FROM document_vector
WHERE document_id = 'your-document-id';
```

#### View all chunks for a document:
```sql
SELECT 
  chunk_index,
  LEFT(chunk_text, 100) as preview,
  word_count,
  created_at
FROM document_vector
WHERE document_id = 'your-document-id'
ORDER BY chunk_index;
```

#### Check if document has vectors:
```sql
SELECT 
  d.id,
  d.title,
  d.type,
  COUNT(dv.id) as vector_count
FROM document d
LEFT JOIN document_vector dv ON d.id = dv.document_id
WHERE d.user_id = auth.uid()
GROUP BY d.id, d.title, d.type
ORDER BY vector_count DESC;
```

#### View sample chunk with embedding info:
```sql
SELECT 
  chunk_index,
  chunk_text,
  word_count,
  CASE 
    WHEN embedding IS NOT NULL THEN 'Has embedding'
    ELSE 'No embedding'
  END as embedding_status,
  array_length(embedding::float[], 1) as embedding_dimensions
FROM document_vector
WHERE document_id = 'your-document-id'
ORDER BY chunk_index
LIMIT 5;
```

### 3. Check Processing Status

#### Documents without vectors:
```sql
SELECT 
  d.id,
  d.title,
  d.type,
  LENGTH(d.content) as content_length
FROM document d
LEFT JOIN document_vector dv ON d.id = dv.document_id
WHERE d.user_id = auth.uid()
  AND dv.id IS NULL
  AND d.content IS NOT NULL
  AND LENGTH(d.content) > 0
  AND d.type IN ('text', 'page', 'pdf')
ORDER BY d.created_at DESC;
```

#### Documents with vectors:
```sql
SELECT 
  d.id,
  d.title,
  d.type,
  COUNT(dv.id) as vector_count,
  MAX(dv.created_at) as last_processed
FROM document d
INNER JOIN document_vector dv ON d.id = dv.document_id
WHERE d.user_id = auth.uid()
GROUP BY d.id, d.title, d.type
ORDER BY last_processed DESC;
```

## Using the Verification Utility

Import and use the verification functions:

```typescript
import { 
  getDocumentVectorStats, 
  verifyDocumentVectors,
  getUserVectorStats 
} from './utils/vectorVerification'

// Check a specific document
const stats = await getDocumentVectorStats('document-id')
console.log('Vector stats:', stats)

// Verify vectors exist
const hasVectors = await verifyDocumentVectors('document-id')
console.log('Has vectors:', hasVectors)

// Get user's overall stats
const userStats = await getUserVectorStats()
console.log('User stats:', userStats)
```

## Expected Behavior

### When a document is saved:

1. ✅ Document saved to `document` table
2. ✅ Edge function `process-document` called
3. ✅ Document chunked (1000 chars, 200 overlap)
4. ✅ Embeddings generated (OpenAI)
5. ✅ Vectors stored in `document_vector` table

### Console Logs to Look For:

```
🔄 Processing document for vector storage: {documentId}
✅ Document processed successfully: { chunksProcessed: 10 }
📊 Stored 10 vectors in document_vector table
✅ Verified: 10 vectors found in database
```

## Troubleshooting

### Issue: No vectors appearing

**Check:**
1. Edge function deployed? `supabase functions list`
2. OpenAI API key set? `supabase secrets list`
3. Document has content? Check `document.content` field
4. Document type is processable? (`text`, `page`, or `pdf`)

**Fix:**
```sql
-- Manually trigger processing for a document
-- (via Edge Function or client code)
```

### Issue: Vectors exist but embeddings are null

**Check:**
```sql
SELECT 
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings
FROM document_vector
WHERE document_id = 'your-document-id';
```

**Fix:** Edge function might have failed during embedding generation. Check edge function logs.

### Issue: Wrong number of chunks

**Expected:** ~1 chunk per 1000 characters (with overlap)

**Check:**
```sql
SELECT 
  d.id,
  d.title,
  LENGTH(d.content) as content_length,
  COUNT(dv.id) as chunk_count,
  ROUND(LENGTH(d.content) / 1000.0) as expected_chunks
FROM document d
LEFT JOIN document_vector dv ON d.id = dv.document_id
WHERE d.id = 'your-document-id'
GROUP BY d.id, d.title, d.content;
```

## Vector Index Performance

Check if the vector index is being used:

```sql
EXPLAIN ANALYZE
SELECT * FROM document_vector
WHERE embedding <-> '[your-query-embedding]'::vector < 0.7
ORDER BY embedding <-> '[your-query-embedding]'::vector
LIMIT 10;
```

Should show `idx_document_vector_embedding` being used.

## Rebuild Index (if slow)

```sql
DROP INDEX IF EXISTS idx_document_vector_embedding;
CREATE INDEX idx_document_vector_embedding 
ON document_vector 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Next Steps

1. ✅ Verify vectors are being stored
2. ✅ Test semantic search
3. ✅ Integrate RAG chat
4. ✅ Monitor vector counts and performance

