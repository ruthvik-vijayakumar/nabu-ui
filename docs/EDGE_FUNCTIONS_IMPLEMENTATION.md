# Edge Functions Implementation Summary

All edge functions from the VECTOR_DB_RAG_GUIDE have been implemented and are ready to deploy.

## Implemented Functions

### 1. ✅ `process-document` 
**Location**: `supabase/functions/process-document/index.ts`

**Purpose**: Chunks documents and generates embeddings for vector storage

**Features**:
- Multi-provider embedding support (OpenAI, Hugging Face, Cohere)
- Intelligent text chunking with sentence boundaries
- Stores vectors in `document_vector` table
- Handles different embedding dimensions (1536, 384, 768, 1024)

**Usage**:
```typescript
await edgeFunctionService.processDocument(documentId)
```

**Secrets Required**:
- `OPENAI_API_KEY` (if using OpenAI)
- `HUGGINGFACE_API_KEY` (if using Hugging Face)
- `COHERE_API_KEY` (if using Cohere)
- `EMBEDDING_PROVIDER` (optional, defaults to 'openai')
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. ✅ `rag-chat`
**Location**: `supabase/functions/rag-chat/index.ts`

**Purpose**: Conversational AI with RAG (Retrieval-Augmented Generation)

**Features**:
- Semantic search using query embeddings
- Retrieves relevant document chunks
- Supports Groq and OpenAI for chat completion
- Maintains conversation history
- Saves messages to database
- Tracks token usage
- Returns sources/citations

**Usage**:
```typescript
const response = await edgeFunctionService.sendRAGMessage(scribeId, userMessage, {
  matchThreshold: 0.7,
  matchCount: 10,
  model: 'llama-3.1-70b-versatile'
})
```

**Request Body**:
```json
{
  "scribeId": "uuid",
  "message": "user question",
  "useGroq": true,
  "matchThreshold": 0.7,
  "matchCount": 10
}
```

**Response**:
```json
{
  "message": "AI response",
  "tokens": 1234,
  "contextChunks": 5,
  "sources": [
    {
      "document_id": "uuid",
      "title": "Document Title",
      "chunk_text": "Relevant text...",
      "similarity": 0.85
    }
  ]
}
```

**Secrets Required**:
- `GROQ_API_KEY` (if using Groq)
- `OPENAI_API_KEY` (for embeddings and/or chat)
- `HUGGINGFACE_API_KEY` (if using Hugging Face for embeddings)
- `COHERE_API_KEY` (if using Cohere for embeddings)
- `EMBEDDING_PROVIDER` (optional, defaults to 'openai')
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

### 3. ✅ `generate-embeddings`
**Location**: `supabase/functions/generate-embeddings/index.ts`

**Purpose**: Utility function for generating embeddings for any text(s)

**Features**:
- Multi-provider support (OpenAI, Hugging Face, Cohere)
- Batch processing
- Handles model loading delays (Hugging Face)

**Usage**:
```typescript
const embeddings = await edgeFunctionService.generateEmbeddings(['text1', 'text2'])
```

**Request Body**:
```json
{
  "texts": ["text to embed", "another text"]
}
```

**Response**:
```json
{
  "embeddings": [
    [0.123, 0.456, ...],
    [0.789, 0.012, ...]
  ]
}
```

**Secrets Required**:
- `OPENAI_API_KEY` (if using OpenAI)
- `HUGGINGFACE_API_KEY` (if using Hugging Face)
- `COHERE_API_KEY` (if using Cohere)
- `EMBEDDING_PROVIDER` (optional, defaults to 'openai')

---

## Database Functions

### ✅ `search_documents_semantic`
**Location**: `supabase/migrations/002_functions.sql`

**Purpose**: Performs semantic search using cosine similarity

**Parameters**:
- `query_embedding`: VECTOR(1536) - The query embedding
- `match_threshold`: FLOAT (default 0.7) - Minimum similarity score
- `match_count`: INT (default 10) - Maximum results
- `user_filter`: UUID (optional) - Filter by user ID

**Returns**: Table with document chunks, similarity scores, and metadata

---

## Deployment

### 1. Set Secrets

**Via Supabase Dashboard** (Recommended):
1. Go to: Edge Functions → Settings → Secrets
2. Add all required secrets

**Via CLI**:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set HUGGINGFACE_API_KEY=hf_...
supabase secrets set EMBEDDING_PROVIDER=huggingface
```

### 2. Deploy Functions

```bash
# Deploy all functions
supabase functions deploy process-document
supabase functions deploy rag-chat
supabase functions deploy generate-embeddings

# Or deploy all at once
supabase functions deploy
```

### 3. Verify Deployment

Check in Supabase Dashboard:
- Edge Functions → Functions
- Should see all three functions listed

---

## Client Integration

The client service is already set up in `src/utils/edgeFunctions.ts`:

```typescript
import { edgeFunctionService } from './utils/edgeFunctions'

// Process document
await edgeFunctionService.processDocument(documentId)

// Send RAG message
const response = await edgeFunctionService.sendRAGMessage(scribeId, message)

// Generate embeddings
const embeddings = await edgeFunctionService.generateEmbeddings(texts)
```

---

## Testing

### Test `process-document`:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-document' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"documentId": "your-document-id"}'
```

### Test `rag-chat`:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/rag-chat' \
  -H 'Authorization: Bearer YOUR_USER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "scribeId": "your-scribe-id",
    "message": "What is this about?",
    "useGroq": true
  }'
```

### Test `generate-embeddings`:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-embeddings' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"texts": ["Hello world", "Test embedding"]}'
```

---

## Architecture Flow

```
1. Document Saved
   ↓
2. process-document Edge Function
   ↓
3. Chunk Text → Generate Embeddings → Store Vectors
   ↓
4. User Query → rag-chat Edge Function
   ↓
5. Generate Query Embedding → Semantic Search
   ↓
6. Retrieve Relevant Chunks → Build Context
   ↓
7. Send to Groq/OpenAI → Generate Response
   ↓
8. Return Response + Sources
```

---

## Next Steps

1. ✅ All edge functions implemented
2. ✅ Client service ready
3. ✅ Database functions exist
4. ⏳ Deploy functions to Supabase
5. ⏳ Set secrets (API keys)
6. ⏳ Test with real documents
7. ⏳ Integrate into UI (scribe conversations)

---

## Troubleshooting

### Function not found
- Verify deployment: `supabase functions list`
- Check function name matches exactly

### Authentication errors
- Ensure `Authorization` header includes valid token
- For `rag-chat`, use user's auth token (not anon key)

### API key errors
- Check secrets are set: `supabase secrets list`
- Verify secret names match exactly (case-sensitive)

### Embedding dimension errors
- Different providers return different dimensions
- Database schema supports variable dimensions
- Check logs for dimension warnings

### Model loading (Hugging Face)
- First request may take 10-20 seconds
- Function automatically retries after waiting
- Consider using OpenAI for faster responses

---

## Support

For issues:
1. Check edge function logs in Supabase Dashboard
2. Verify all secrets are set correctly
3. Test with curl commands above
4. Check database functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%semantic%'`

