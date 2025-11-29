# Document Vector Storage Setup

This guide explains how to set up automatic document vector storage for RAG (Retrieval-Augmented Generation).

## Overview

When documents are saved, they are automatically processed to:
1. **Chunk** the text into smaller pieces (1000 chars with 200 char overlap)
2. **Generate embeddings** using OpenAI's `text-embedding-3-small` model
3. **Store vectors** in the `document_vector` table for semantic search

## Prerequisites

1. ✅ Supabase project set up
2. ✅ `document_vector` table exists (from migrations)
3. ✅ `pgvector` extension enabled
4. ✅ OpenAI API key

## Setup Steps

### Step 1: Deploy Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase Dashboard → Settings → API)

4. **Set OpenAI API Key as Secret**:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
   ```

5. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy process-document
   ```

### Step 2: Verify Setup

1. **Check Edge Function is Deployed**:
   - Go to Supabase Dashboard → Edge Functions
   - You should see `process-document` listed

2. **Test the Function** (optional):
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/process-document' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"documentId": "your-document-id"}'
   ```

3. **Check Vector Storage**:
   ```sql
   -- Check if vectors are being stored
   SELECT COUNT(*) FROM document_vector;
   
   -- Check vectors for a specific document
   SELECT chunk_index, LEFT(chunk_text, 100) as preview, word_count
   FROM document_vector
   WHERE document_id = 'your-document-id'
   ORDER BY chunk_index;
   ```

## How It Works

### Automatic Processing

When a document is saved:

1. **Document Saved** → `storage.ts` or `background.ts`
2. **Check Content** → Only processes if document has text content
3. **Call Edge Function** → `edgeFunctionService.processDocument(documentId)`
4. **Edge Function**:
   - Fetches document from database
   - Chunks the text (1000 chars, 200 overlap)
   - Generates embeddings via OpenAI API
   - Stores vectors in `document_vector` table

### Document Types Processed

- ✅ `text` - Text selections
- ✅ `page` - Full page content
- ✅ `pdf` - PDF documents (extracted text)

### Document Types NOT Processed

- ❌ `image` - No text content
- ❌ `video` - No text content
- ❌ `screenshot` - No text content

## Chunking Strategy

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Break Points**: Tries to break at sentence boundaries (`.`, `!`, `?`, `\n`)
- **Metadata**: Stores page numbers, section titles, word counts

## Cost Estimate

**OpenAI Embeddings** (`text-embedding-3-small`):
- ~$0.10 per 1M tokens
- Average document: 10 chunks = ~10k tokens = **$0.001 per document**
- Very affordable!

## Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Fix**: Set the secret:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

### Issue: "Document not found"

**Fix**: Make sure the document exists and has content:
```sql
SELECT id, type, content, LENGTH(content) as content_length
FROM document
WHERE id = 'your-document-id';
```

### Issue: "No chunks generated"

**Fix**: Document content might be too short or empty. Check:
```sql
SELECT content FROM document WHERE id = 'your-document-id';
```

### Issue: Vectors not appearing

**Fix**: 
1. Check edge function logs in Supabase Dashboard
2. Check browser console for errors
3. Verify edge function is deployed and accessible

### Issue: Slow processing

**Fix**: 
- Processing happens asynchronously (non-blocking)
- Large documents may take 10-30 seconds
- Check edge function logs for timing

## Manual Processing

If you need to reprocess a document:

```typescript
import { edgeFunctionService } from './utils/edgeFunctions'

// Process a specific document
await edgeFunctionService.processDocument('document-id')
```

Or via SQL trigger (advanced):
```sql
-- Create trigger to auto-process on document insert/update
CREATE OR REPLACE FUNCTION process_document_vectors()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function via HTTP (requires pg_net extension)
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-document',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('documentId', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_process_document_vectors
  AFTER INSERT OR UPDATE ON document
  FOR EACH ROW
  WHEN (NEW.content IS NOT NULL AND LENGTH(NEW.content) > 0)
  EXECUTE FUNCTION process_document_vectors();
```

## Next Steps

1. ✅ Deploy edge function
2. ✅ Set OpenAI API key
3. ✅ Save a test document
4. ✅ Verify vectors are stored
5. ✅ Use semantic search in RAG chat

## Related Files

- `src/utils/edgeFunctions.ts` - Client service for calling edge functions
- `supabase/functions/process-document/index.ts` - Edge function implementation
- `src/utils/storage.ts` - Document save flow (triggers processing)
- `src/background/background.ts` - Background script (triggers processing)

