# Vector DB & RAG Quick Reference

## Quick Setup Checklist

### Option A: Edge Functions (Recommended ✅)
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref your-ref`
- [ ] Create functions: `supabase functions new process-document rag-chat generate-embeddings`
- [ ] Set secrets: `supabase secrets set OPENAI_API_KEY=... GROQ_API_KEY=...`
- [ ] Deploy: `supabase functions deploy`
- [ ] Create client service: `src/utils/edgeFunctions.ts`
- [ ] Integrate into document save flow
- [ ] Integrate into scribe conversations

### Option B: Client-Side (Alternative)
- [ ] Install dependencies: `npm install openai groq-sdk`
- [ ] Set environment variables: `GROQ_API_KEY`, `OPENAI_API_KEY`
- [ ] Verify pgvector extension in Supabase
- [ ] Create embedding service (`src/utils/embeddings.ts`)
- [ ] Create chunking service (`src/utils/chunking.ts`)
- [ ] Create vector storage service (`src/utils/vectorStorage.ts`)
- [ ] Create RAG service (`src/utils/ragService.ts`)
- [ ] Create Groq service (`src/utils/groqService.ts`)
- [ ] Integrate vector processing into document save flow
- [ ] Integrate RAG into scribe conversations

## Key Files to Create

### Edge Functions Approach (Recommended)
```
supabase/functions/
├── process-document/      # Chunk & generate vectors
│   └── index.ts
├── rag-chat/              # RAG conversation with Groq/OpenAI
│   └── index.ts
└── generate-embeddings/   # Utility for embeddings
    └── index.ts

src/utils/
└── edgeFunctions.ts       # Client service to call Edge Functions
```

### Client-Side Approach (Alternative)
```
src/utils/
├── embeddings.ts          # Generate embeddings (OpenAI/local)
├── chunking.ts            # Split documents into chunks
├── vectorStorage.ts        # Store vectors in Supabase
├── ragService.ts          # Semantic search & context retrieval
└── groqService.ts         # Conversational AI with RAG
```

## Core Workflows

### Edge Functions Approach

#### 1. Store Document Vectors
```typescript
// When document is saved:
const document = await databaseService.saveDocument(data)
await edgeFunctionService.processDocument(document.id)
// Or use database trigger for automatic processing
```

#### 2. Query with RAG
```typescript
// In scribe conversation:
const response = await edgeFunctionService.sendRAGMessage(scribeId, message)
// response.message = AI response
// response.tokens = token count
```

### Client-Side Approach

#### 1. Store Document Vectors
```typescript
// When document is saved:
const document = await databaseService.saveDocument(data)
await vectorStorageService.onDocumentSaved(document)
```

#### 2. Query with RAG
```typescript
// In scribe conversation:
const response = await groqService.handleConversation(scribeId, userMessage)
// Automatically: retrieves context → generates response
```

## API Services Comparison

| Service | Use Case | Cost | Speed | Best For |
|---------|----------|------|-------|----------|
| **Groq** | LLM Inference | $0.27/1M tokens | Very Fast | Chat, RAG |
| **OpenAI** | Embeddings + Chat | $0.10-30/1M tokens | Fast | Best quality |
| **Anthropic** | Chat | $3-15/1M tokens | Medium | Long context |
| **Local** | Embeddings | Free | Slow | Privacy |

## Groq Models

- `llama-3.1-70b-versatile` - Best overall
- `mixtral-8x7b-32768` - Long context
- `gemma-7b-it` - Fast, smaller

## Embedding Models

- `text-embedding-3-small` (1536 dim) - Recommended
- `text-embedding-ada-002` (1536 dim) - Legacy
- `Xenova/all-MiniLM-L6-v2` (384 dim) - Local

## Chunking Best Practices

- **Size**: 500-1000 characters
- **Overlap**: 10-20% (50-200 chars)
- **Break at**: Sentences, paragraphs
- **Metadata**: Page numbers, section titles

## SQL Queries

### Check Vector Setup
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT COUNT(*) FROM document_vector;
```

### Test Semantic Search
```sql
SELECT * FROM search_documents_semantic(
  query_embedding := '[your 1536-dim vector]',
  match_threshold := 0.7,
  match_count := 10
);
```

### Rebuild Index (if slow)
```sql
DROP INDEX idx_document_vector_embedding;
CREATE INDEX idx_document_vector_embedding 
ON document_vector USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Environment Variables

### Edge Functions (Secrets)
```bash
# Set via Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxxxxxxx
supabase secrets set GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### Client-Side (.env file)
```env
# .env or .env.local
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxx  # For client-side
VITE_OPENAI_API_KEY=sk-xxxxxxxxxxxxx  # For client-side
```

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Extension 'vector' missing | `CREATE EXTENSION vector;` |
| Dimension mismatch | Check embedding service returns 1536 dims |
| Slow search | Rebuild index with more lists |
| Poor RAG results | Lower threshold, increase chunks, improve chunking |

## Cost Estimates

**Embeddings** (OpenAI):
- 1000 documents × 10 chunks = 10k embeddings
- ~$0.10 per 1M tokens → ~$0.02-0.05 for 10k chunks

**Groq Inference**:
- 1M tokens = $0.27
- Typical conversation: 5k tokens = $0.00135

**Total**: Very affordable for most use cases!

## Next Steps

1. **Choose approach**: Edge Functions (recommended) or Client-Side
2. Read full guide: `VECTOR_DB_RAG_GUIDE.md`
3. **Edge Functions**: Deploy functions and set secrets
4. **Client-Side**: Implement services in `src/utils/`
5. Integrate into document save flow
6. Integrate into scribe conversations
7. Test and iterate!

## Why Edge Functions?

✅ **Security**: API keys never exposed  
✅ **Performance**: Server-side processing  
✅ **Cost**: Better rate limiting  
✅ **Automatic**: Database triggers can auto-process  
✅ **Scalable**: Handles batch operations efficiently

