# How RAG Works in This Setup

## RAG (Retrieval-Augmented Generation) Flow

### 1. Document Processing (Vector Storage)
```
Document Saved → process-document Edge Function
  ↓
Chunk Text (1000 chars, 200 overlap)
  ↓
Generate Embeddings (OpenAI/Hugging Face/Cohere)
  ↓
Store Vectors in document_vector table
```

### 2. Query Processing (RAG Chat)
```
User Question → rag-chat Edge Function
  ↓
Generate Query Embedding (same provider as documents)
  ↓
Semantic Search (cosine similarity)
  ↓
Retrieve Top-K Relevant Chunks
  ↓
Build Context String
  ↓
Include Context in System Prompt
  ↓
Send to AI (Groq/OpenAI) with Context
  ↓
Return AI Response
```

## Current Implementation

### Context Building

The context is built from semantic search results:

```typescript
// 1. Perform semantic search
const searchResults = await supabaseClient.rpc('search_documents_semantic', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
  match_count: 10,
  user_filter: user.id
})

// 2. Build context string
const contextString = searchResults
  .map((result, index) => {
    return `[Context ${index + 1}]
Section: ${result.section_title}
Page: ${result.page_number}
Content: ${result.chunk_text}`
  })
  .join('\n---\n\n')

// 3. Include in system prompt
const systemPrompt = `You are a helpful AI assistant...

CONTEXT FROM USER'S DOCUMENTS:
${contextString}`
```

### Message Structure

Messages sent to AI:

```typescript
[
  { role: 'system', content: systemPrompt },  // Contains context!
  ...conversationHistory,
  { role: 'user', content: userQuestion }
]
```

## Why Context Might Not Be Working

### Issue 1: No Search Results (0 chunks)
**Symptoms:** `contextChunks: 0` in response

**Causes:**
- No vectors in database (documents not processed)
- Embedding dimension mismatch
- Threshold too high (no matches above 0.7)
- Query doesn't match document content

**Fix:**
- Process documents
- Fix dimension mismatch
- Lower threshold (function tries 0.5, then 0.3 automatically)

### Issue 2: Context Not Included in System Prompt
**Symptoms:** AI responds but doesn't use document information

**Causes:**
- `hasContext` flag is false
- `contextString` contains "No relevant context found"
- System prompt not being sent correctly

**Fix:**
- Check edge function logs for:
  - `📝 Built context from X chunks`
  - `📋 Has context: true`
  - `📋 System prompt preview: ...`

### Issue 3: AI Ignoring Context
**Symptoms:** Context is sent but AI doesn't reference it

**Causes:**
- System prompt not strong enough
- Context not formatted clearly
- AI model not following instructions

**Fix:**
- Strengthen system prompt instructions
- Format context more clearly
- Try different AI model

## Debugging Steps

### 1. Check Edge Function Logs

Go to **Supabase Dashboard → Edge Functions → rag-chat → Logs**

Look for:
- `📊 Found X relevant chunks` - Should be > 0
- `📝 Built context from X chunks` - Should match chunks found
- `📋 Has context: true` - Should be true if chunks found
- `📤 Sending to Groq/OpenAI: { hasContext: true, contextChunks: X }`

### 2. Verify Context is Being Built

The logs should show:
```
📝 Built context from 5 chunks
📝 Context length: 2345 characters
📝 Context preview: [Context 1]...
```

### 3. Verify System Prompt Includes Context

The logs should show:
```
📋 System prompt length: 3456 characters
📋 Has context: true
📋 System prompt preview: You are a helpful AI assistant...CONTEXT FROM USER'S DOCUMENTS: [Context 1]...
```

### 4. Check What's Sent to AI

The logs should show:
```
📤 Sending to Groq: {
  hasContext: true,
  contextChunks: 5,
  systemPromptLength: 3456
}
```

## Expected Behavior

### When Context is Found:
1. ✅ Semantic search finds relevant chunks
2. ✅ Context string is built from chunks
3. ✅ System prompt includes context
4. ✅ AI receives context in system message
5. ✅ AI responds using document information

### When No Context is Found:
1. ⚠️ Search returns 0 results
2. ⚠️ Context string = "No relevant context found..."
3. ⚠️ System prompt tells AI no context available
4. ⚠️ AI responds saying it can't find information

## Testing RAG

### Test 1: Verify Context is Built
```bash
# Check edge function logs after sending a message
# Should see: "📝 Built context from X chunks"
```

### Test 2: Verify Context is Sent
```bash
# Check logs for: "📤 Sending to Groq/OpenAI: { hasContext: true }"
```

### Test 3: Verify AI Uses Context
```typescript
// Ask a question that should be answerable from your documents
// AI should reference the document content in its response
```

## Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| No vectors | 0 chunks | Process documents |
| Dimension mismatch | Error or 0 chunks | Match embedding provider |
| Threshold too high | 0 chunks | Function auto-lowers to 0.5, then 0.3 |
| Context not sent | hasContext: false | Check search results |
| AI ignores context | Response doesn't use docs | Strengthen system prompt |

## Next Steps

1. **Redeploy function:**
   ```bash
   supabase functions deploy rag-chat
   ```

2. **Check logs** after sending a message:
   - Look for context building logs
   - Verify `hasContext: true`
   - Check system prompt includes context

3. **Test with a question** that should match your documents

4. **If still not working:**
   - Check if search results are actually being found
   - Verify context string is being built
   - Confirm system prompt includes the context

