# Vector Database & RAG Implementation Guide

This guide explains how to implement vector storage for RAG (Retrieval-Augmented Generation) in Supabase and integrate conversational AI services like Groq, OpenAI, or Anthropic.

## Table of Contents

1. [Overview](#overview)
2. [Vector Database Setup](#vector-database-setup)
3. [Supabase Edge Functions (Recommended)](#supabase-edge-functions-recommended)
4. [Generating Embeddings](#generating-embeddings)
5. [Chunking Documents](#chunking-documents)
6. [Storing Vectors in Supabase](#storing-vectors-in-supabase)
7. [Semantic Search with RAG](#semantic-search-with-rag)
8. [Integrating Groq for Conversational AI](#integrating-groq-for-conversational-ai)
9. [Alternative AI Services](#alternative-ai-services)
10. [Complete RAG Implementation](#complete-rag-implementation)
11. [Best Practices](#best-practices)

---

## Overview

RAG (Retrieval-Augmented Generation) combines:
- **Vector Database**: Stores document embeddings for semantic search
- **AI Service**: Generates responses using retrieved context (Groq, OpenAI, etc.)

### Architecture Flow

```
Document → Chunk Text → Generate Embeddings → Store in Supabase
                                                        ↓
User Query → Generate Query Embedding → Semantic Search → Retrieve Relevant Chunks
                                                        ↓
                                              Build Context + Query → AI Service (Groq/OpenAI)
                                                        ↓
                                              Return AI Response
```

---

## Vector Database Setup

### Prerequisites

1. **Supabase Project**: Already set up (see `SUPABASE_SETUP.md`)
2. **pgvector Extension**: Already enabled in migrations
3. **Database Schema**: `document_vector` table already exists

### Verify Setup

Run this SQL in Supabase SQL Editor:

```sql
-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify document_vector table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_vector';

-- Check if vector index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'document_vector';
```

You should see:
- `vector` extension enabled
- `embedding` column with type `USER-DEFINED` (vector)
- `idx_document_vector_embedding` index

---

## Supabase Edge Functions (Recommended)

**Yes, you can and should run this in Edge Functions!** This is the recommended approach for several reasons:

### Why Edge Functions?

✅ **Security**: API keys stay on the server, never exposed to clients  
✅ **Performance**: Server-side processing is faster for batch operations  
✅ **Cost**: More efficient API usage, better rate limiting  
✅ **Background Processing**: Can process documents asynchronously  
✅ **Database Triggers**: Automatically process documents when saved  

### Architecture with Edge Functions

```
Client Extension
    ↓ (saves document)
Supabase Database (document table)
    ↓ (database trigger)
Edge Function: process-document
    ↓ (chunks + embeddings)
Supabase Database (document_vector table)
    ↓
Client Query → Edge Function: rag-chat
    ↓ (semantic search + AI)
Response to Client
```

### Setup Edge Functions

1. **Install Supabase CLI**:
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

4. **Initialize functions** (if not already done):
```bash
supabase functions new process-document
supabase functions new rag-chat
supabase functions new generate-embeddings
```

### Edge Function 1: Process Document (Generate Vectors)

**Location**: `supabase/functions/process-document/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Chunk {
  text: string
  index: number
  pageNumber?: number
  sectionTitle?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    // Parse request
    const { documentId } = await req.json()

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get document
    const { data: document, error: docError } = await supabaseClient
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!document.content || document.content.trim().length === 0) {
      return new Response(
        JSON.stringify({ message: 'Document has no content to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Chunk the document
    const chunks = chunkDocument(document.content, {
      chunkSize: 1000,
      chunkOverlap: 200,
      pageNumber: document.metadata?.page_number,
      sectionTitle: document.title
    })

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No chunks generated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embeddings (batch)
    const texts = chunks.map(chunk => chunk.text)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536
    })

    const embeddings = embeddingResponse.data.map(item => item.embedding)

    // Store vectors in database
    const vectors = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: document.user_id,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      embedding: embeddings[index],
      page_number: chunk.pageNumber,
      section_title: chunk.sectionTitle || document.title,
      word_count: chunk.text.split(/\s+/).length,
      metadata: {
        document_type: document.type,
        document_url: document.url,
      }
    }))

    // Delete existing vectors for this document
    await supabaseClient
      .from('document_vector')
      .delete()
      .eq('document_id', documentId)

    // Insert new vectors
    const { error: vectorError } = await supabaseClient
      .from('document_vector')
      .insert(vectors)

    if (vectorError) {
      throw vectorError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Document processed successfully',
        chunksProcessed: chunks.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Chunking function
function chunkDocument(
  text: string,
  options: {
    chunkSize?: number
    chunkOverlap?: number
    pageNumber?: number
    sectionTitle?: string
  }
): Chunk[] {
  const size = options.chunkSize || 1000
  const overlap = options.chunkOverlap || 200
  const chunks: Chunk[] = []
  let start = 0
  let index = 0

  while (start < text.length) {
    let end = start + size

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end)
      const lastNewline = text.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > start + size * 0.5) {
        end = breakPoint + 1
      }
    }

    const chunkText = text.slice(start, Math.min(end, text.length)).trim()

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index,
        pageNumber: options.pageNumber,
        sectionTitle: options.sectionTitle
      })
    }

    start = end - overlap
    index++
  }

  return chunks
}
```

### Edge Function 2: RAG Chat (Conversational AI)

**Location**: `supabase/functions/rag-chat/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'
import Groq from 'https://esm.sh/groq-sdk@0.3.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { scribeId, message, useGroq = true } = await req.json()

    if (!scribeId || !message) {
      return new Response(
        JSON.stringify({ error: 'scribeId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get scribe
    const { data: scribe, error: scribeError } = await supabaseClient
      .from('scribe')
      .select('*')
      .eq('id', scribeId)
      .eq('user_id', user.id)
      .single()

    if (scribeError || !scribe) {
      return new Response(
        JSON.stringify({ error: 'Scribe not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Save user message
    await supabaseClient
      .from('scribe_message')
      .insert({
        scribe_id: scribeId,
        user_id: user.id,
        role: 'user',
        content: message
      })

    // Generate query embedding
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
      dimensions: 1536
    })

    // Semantic search
    const { data: searchResults, error: searchError } = await supabaseClient
      .rpc('search_documents_semantic', {
        query_embedding: queryEmbedding.data[0].embedding,
        match_threshold: 0.7,
        match_count: 5,
        user_filter: user.id
      })

    if (searchError) {
      throw searchError
    }

    // Build context
    const contextString = searchResults && searchResults.length > 0
      ? searchResults
          .slice(0, 5)
          .map((result: any, index: number) => {
            let part = `[Context ${index + 1}]\n`
            if (result.section_title) part += `Section: ${result.section_title}\n`
            if (result.page_number) part += `Page: ${result.page_number}\n`
            part += `Content: ${result.chunk_text}\n`
            return part
          })
          .join('\n---\n\n')
      : 'No relevant context found.'

    // Get conversation history
    const { data: messages } = await supabaseClient
      .from('scribe_message')
      .select('*')
      .eq('scribe_id', scribeId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build system prompt
    const systemPrompt = scribe.system_prompt || `You are a helpful AI assistant that answers questions based on the provided context from the user's saved documents.

IMPORTANT: 
- Answer questions using ONLY the information provided in the context below.
- If the context doesn't contain enough information, say so honestly.
- Cite specific sections or pages when referencing information.

CONTEXT FROM USER'S DOCUMENTS:
${contextString}`

    // Generate AI response
    let aiResponse: string
    let tokens: number

    if (useGroq) {
      // Use Groq
      const groq = new Groq({
        apiKey: Deno.env.get('GROQ_API_KEY') ?? '',
      })

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || [])
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({
            role: m.role,
            content: m.content
          })),
        { role: 'user', content: message }
      ]

      const completion = await groq.chat.completions.create({
        model: scribe.model || 'llama-3.1-70b-versatile',
        messages: groqMessages as any,
        temperature: scribe.temperature || 0.7,
        max_tokens: 2000
      })

      aiResponse = completion.choices[0]?.message?.content || ''
      tokens = completion.usage?.total_tokens || 0
    } else {
      // Use OpenAI
      const completion = await openai.chat.completions.create({
        model: scribe.model || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || [])
            .filter((m: any) => m.role !== 'system')
            .map((m: any) => ({
              role: m.role,
              content: m.content
            })),
          { role: 'user', content: message }
        ],
        temperature: scribe.temperature || 0.7
      })

      aiResponse = completion.choices[0]?.message?.content || ''
      tokens = completion.usage?.total_tokens || 0
    }

    // Save AI response
    await supabaseClient
      .from('scribe_message')
      .insert({
        scribe_id: scribeId,
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
        tokens,
        model: scribe.model || (useGroq ? 'llama-3.1-70b-versatile' : 'gpt-4-turbo-preview')
      })

    // Update scribe token count
    await supabaseClient
      .from('scribe')
      .update({
        total_tokens: (scribe.total_tokens || 0) + tokens,
        updated_at: new Date().toISOString()
      })
      .eq('id', scribeId)

    return new Response(
      JSON.stringify({
        message: aiResponse,
        tokens,
        contextChunks: searchResults?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Edge Function 3: Generate Embeddings (Utility)

**Location**: `supabase/functions/generate-embeddings/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.20.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    const { texts } = await req.json()

    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536
    })

    const embeddings = response.data.map(item => item.embedding)

    return new Response(
      JSON.stringify({ embeddings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy process-document
supabase functions deploy rag-chat
supabase functions deploy generate-embeddings

# Or deploy all at once
supabase functions deploy
```

### Set Secrets (API Keys)

```bash
# Set secrets for your project
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set GROQ_API_KEY=your-groq-key
```

### Database Trigger (Auto-process Documents)

Create a database trigger to automatically process documents when saved:

```sql
-- Create function to call Edge Function
CREATE OR REPLACE FUNCTION process_document_vectors()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via HTTP (using pg_net extension)
  PERFORM
    net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/process-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('documentId', NEW.id)
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_document_saved
  AFTER INSERT OR UPDATE OF content ON document
  FOR EACH ROW
  WHEN (NEW.content IS NOT NULL AND NEW.content != '')
  EXECUTE FUNCTION process_document_vectors();
```

**Note**: For the trigger to work, you need to:
1. Enable `pg_net` extension: `CREATE EXTENSION IF NOT EXISTS pg_net;`
2. Set the Edge Function URL in database settings

### Call Edge Functions from Client

```typescript
// src/utils/edgeFunctions.ts
import { supabase } from './supabase'

export class EdgeFunctionService {
  /**
   * Process document and generate vectors
   */
  async processDocument(documentId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: { documentId }
    })

    if (error) throw error
    return data
  }

  /**
   * Send message to scribe with RAG
   */
  async sendRAGMessage(
    scribeId: string,
    message: string,
    useGroq: boolean = true
  ): Promise<{ message: string; tokens: number }> {
    const { data, error } = await supabase.functions.invoke('rag-chat', {
      body: { scribeId, message, useGroq }
    })

    if (error) throw error
    return data
  }

  /**
   * Generate embeddings for texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: { texts }
    })

    if (error) throw error
    return data.embeddings
  }
}

export const edgeFunctionService = new EdgeFunctionService()
```

### Update Client Code to Use Edge Functions

```typescript
// In your document save flow
import { edgeFunctionService } from './utils/edgeFunctions'

// After saving document:
const document = await databaseService.saveDocument(data)

// Process document (triggers Edge Function)
await edgeFunctionService.processDocument(document.id)
```

```typescript
// In your scribe component
import { edgeFunctionService } from './utils/edgeFunctions'

async function sendMessage(scribeId: string, message: string) {
  const response = await edgeFunctionService.sendRAGMessage(scribeId, message)
  // response.message contains AI response
  // response.tokens contains token count
}
```

### Benefits of Edge Functions Approach

1. **Security**: API keys never exposed to client
2. **Performance**: Server-side processing is faster
3. **Scalability**: Handles batch operations efficiently
4. **Cost**: Better rate limiting and API usage
5. **Automatic**: Database triggers can auto-process documents
6. **Type Safety**: Deno TypeScript support

### Edge Functions vs Client-Side

| Aspect | Edge Functions | Client-Side |
|--------|---------------|-------------|
| API Keys | ✅ Secure (server) | ❌ Exposed |
| Performance | ✅ Fast (server) | ⚠️ Depends on client |
| Batch Processing | ✅ Efficient | ⚠️ Limited |
| Background Jobs | ✅ Yes | ❌ No |
| Cost | ✅ Better control | ⚠️ Higher risk |
| Setup | ⚠️ More complex | ✅ Simpler |

---

## Generating Embeddings

### Option 1: OpenAI Embeddings (Recommended for best quality)

**Install dependency:**
```bash
npm install openai
```

**Create embedding service:**

```typescript
// src/utils/embeddings.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
})

export interface EmbeddingOptions {
  model?: string
  dimensions?: number
}

export class EmbeddingService {
  private model: string = 'text-embedding-3-small' // or 'text-embedding-ada-002'
  private dimensions: number = 1536

  /**
   * Generate embedding for a single text chunk
   */
  async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<number[]> {
    try {
      const model = options?.model || this.model
      const response = await openai.embeddings.create({
        model,
        input: text,
        dimensions: options?.dimensions || this.dimensions
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error(`Failed to generate embedding: ${error}`)
    }
  }

  /**
   * Generate embeddings for multiple text chunks (batch processing)
   */
  async generateEmbeddings(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<number[][]> {
    try {
      const model = options?.model || this.model
      const response = await openai.embeddings.create({
        model,
        input: texts,
        dimensions: options?.dimensions || this.dimensions
      })

      return response.data.map(item => item.embedding)
    } catch (error) {
      console.error('Error generating embeddings:', error)
      throw new Error(`Failed to generate embeddings: ${error}`)
    }
  }
}

export const embeddingService = new EmbeddingService()
```

### Option 2: Groq Embeddings (If available)

Groq currently focuses on LLM inference, but you can use their API for embeddings if available. Otherwise, use OpenAI for embeddings and Groq for chat.

### Option 3: Local Embeddings (Alternative)

For privacy or cost savings, use local models:

```bash
npm install @xenova/transformers
```

```typescript
// src/utils/embeddings-local.ts
import { pipeline } from '@xenova/transformers'

let embedder: any = null

export class LocalEmbeddingService {
  async initialize() {
    if (!embedder) {
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }
    return embedder
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = await this.initialize()
    const output = await model(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  }
}
```

**Note**: Local embeddings may have different dimensions. Adjust `document_vector.embedding` column type if needed.

---

## Chunking Documents

Documents need to be split into smaller chunks for embedding. Here's a robust chunking strategy:

```typescript
// src/utils/chunking.ts

export interface Chunk {
  text: string
  index: number
  pageNumber?: number
  sectionTitle?: string
  metadata?: Record<string, any>
}

export class DocumentChunker {
  private chunkSize: number = 1000 // characters
  private chunkOverlap: number = 200 // characters overlap between chunks

  /**
   * Split text into chunks with overlap
   */
  chunkText(
    text: string,
    options?: {
      chunkSize?: number
      chunkOverlap?: number
      pageNumber?: number
      sectionTitle?: string
    }
  ): Chunk[] {
    const size = options?.chunkSize || this.chunkSize
    const overlap = options?.chunkOverlap || this.chunkOverlap

    if (!text || text.length === 0) {
      return []
    }

    const chunks: Chunk[] = []
    let start = 0
    let index = 0

    while (start < text.length) {
      let end = start + size

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end)
        const lastNewline = text.lastIndexOf('\n', end)
        const breakPoint = Math.max(lastPeriod, lastNewline)

        if (breakPoint > start + size * 0.5) {
          end = breakPoint + 1
        }
      }

      const chunkText = text.slice(start, Math.min(end, text.length)).trim()

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          index,
          pageNumber: options?.pageNumber,
          sectionTitle: options?.sectionTitle,
          metadata: {
            start,
            end: Math.min(end, text.length),
            wordCount: chunkText.split(/\s+/).length
          }
        })
      }

      start = end - overlap
      index++
    }

    return chunks
  }

  /**
   * Chunk PDF content by pages
   */
  chunkPDF(
    pages: Array<{ pageNumber: number; text: string }>,
    options?: { chunkSize?: number; chunkOverlap?: number }
  ): Chunk[] {
    const allChunks: Chunk[] = []

    for (const page of pages) {
      const pageChunks = this.chunkText(page.text, {
        ...options,
        pageNumber: page.pageNumber,
        sectionTitle: `Page ${page.pageNumber}`
      })
      allChunks.push(...pageChunks)
    }

    return allChunks
  }

  /**
   * Chunk web page content with section awareness
   */
  chunkWebPage(
    content: string,
    sections?: Array<{ title: string; content: string }>,
    options?: { chunkSize?: number; chunkOverlap?: number }
  ): Chunk[] {
    if (sections && sections.length > 0) {
      const allChunks: Chunk[] = []

      for (const section of sections) {
        const sectionChunks = this.chunkText(section.content, {
          ...options,
          sectionTitle: section.title
        })
        allChunks.push(...sectionChunks)
      }

      return allChunks
    }

    // Fallback to simple chunking
    return this.chunkText(content, options)
  }
}

export const documentChunker = new DocumentChunker()
```

---

## Storing Vectors in Supabase

Create a service to handle the complete flow: chunking → embedding → storing:

```typescript
// src/utils/vectorStorage.ts
import { databaseService } from './database'
import { embeddingService } from './embeddings'
import { documentChunker } from './chunking'
import type { Document } from './types'

export class VectorStorageService {
  /**
   * Process a document: chunk it, generate embeddings, and store in Supabase
   */
  async processAndStoreDocument(document: Document): Promise<void> {
    if (!document.content || document.content.trim().length === 0) {
      console.warn(`Document ${document.id} has no content to process`)
      return
    }

    // Step 1: Chunk the document
    let chunks: Array<{ text: string; index: number; pageNumber?: number; sectionTitle?: string }>
    
    if (document.type === 'pdf') {
      // For PDFs, you might have page-by-page content
      // This is a simplified version - adjust based on your PDF structure
      chunks = documentChunker.chunkText(document.content, {
        pageNumber: 1, // Extract from metadata if available
        sectionTitle: document.title
      })
    } else {
      chunks = documentChunker.chunkText(document.content, {
        sectionTitle: document.title
      })
    }

    if (chunks.length === 0) {
      console.warn(`No chunks generated for document ${document.id}`)
      return
    }

    // Step 2: Generate embeddings (batch for efficiency)
    console.log(`Generating embeddings for ${chunks.length} chunks...`)
    const texts = chunks.map(chunk => chunk.text)
    const embeddings = await embeddingService.generateEmbeddings(texts)

    // Step 3: Store vectors in Supabase
    console.log(`Storing ${embeddings.length} vectors in Supabase...`)
    const promises = chunks.map((chunk, index) => {
      return databaseService.saveDocumentVector({
        document_id: document.id,
        chunk_text: chunk.text,
        chunk_index: chunk.index,
        embedding: embeddings[index],
        page_number: chunk.pageNumber,
        section_title: chunk.sectionTitle || document.title,
        word_count: chunk.text.split(/\s+/).length,
        metadata: {
          document_type: document.type,
          document_url: document.url,
          ...chunk.metadata
        }
      })
    })

    await Promise.all(promises)
    console.log(`Successfully stored ${embeddings.length} vectors for document ${document.id}`)
  }

  /**
   * Process document when it's saved
   */
  async onDocumentSaved(document: Document): Promise<void> {
    try {
      await this.processAndStoreDocument(document)
    } catch (error) {
      console.error(`Error processing document ${document.id}:`, error)
      // Don't throw - allow document to be saved even if vector processing fails
    }
  }

  /**
   * Re-process existing document (useful for updates)
   */
  async reprocessDocument(documentId: string): Promise<void> {
    const document = await databaseService.getDocumentById(documentId)
    if (!document) {
      throw new Error(`Document ${documentId} not found`)
    }

    // Delete existing vectors
    const existingVectors = await databaseService.getDocumentVectorsByDocument(documentId)
    // Note: You may need to add a bulk delete method to databaseService

    // Re-process
    await this.processAndStoreDocument(document)
  }
}

export const vectorStorageService = new VectorStorageService()
```

**Update your document save flow:**

```typescript
// In src/utils/storage.ts or wherever documents are saved
import { vectorStorageService } from './vectorStorage'

// After saving a document:
const savedDocument = await databaseService.saveDocument(documentData)

// Process and store vectors (async, don't block)
vectorStorageService.onDocumentSaved(savedDocument).catch(console.error)
```

---

## Semantic Search with RAG

Retrieve relevant chunks for a user query:

```typescript
// src/utils/ragService.ts
import { databaseService } from './database'
import { embeddingService } from './embeddings'

export interface RAGContext {
  chunks: Array<{
    text: string
    documentId: string
    pageNumber?: number
    sectionTitle?: string
    similarity: number
  }>
  documentIds: string[]
}

export class RAGService {
  /**
   * Retrieve relevant context for a query using semantic search
   */
  async retrieveContext(
    query: string,
    options?: {
      matchThreshold?: number
      matchCount?: number
      documentIds?: string[] // Optionally filter to specific documents
    }
  ): Promise<RAGContext> {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query)

    // Step 2: Search for similar chunks
    const results = await databaseService.semanticSearch(
      queryEmbedding,
      options?.matchThreshold || 0.7,
      options?.matchCount || 10
    )

    // Step 3: Format results
    const chunks = results.map(result => ({
      text: result.chunk_text,
      documentId: result.document_id,
      pageNumber: result.page_number || undefined,
      sectionTitle: result.section_title || undefined,
      similarity: result.similarity
    }))

    // Get unique document IDs
    const documentIds = [...new Set(chunks.map(c => c.documentId))]

    return { chunks, documentIds }
  }

  /**
   * Build context string for AI prompt
   */
  buildContextString(context: RAGContext, maxChunks: number = 5): string {
    const chunks = context.chunks.slice(0, maxChunks)
    
    if (chunks.length === 0) {
      return 'No relevant context found.'
    }

    const contextParts = chunks.map((chunk, index) => {
      let part = `[Context ${index + 1}]\n`
      if (chunk.sectionTitle) {
        part += `Section: ${chunk.sectionTitle}\n`
      }
      if (chunk.pageNumber) {
        part += `Page: ${chunk.pageNumber}\n`
      }
      part += `Content: ${chunk.text}\n`
      return part
    })

    return contextParts.join('\n---\n\n')
  }
}

export const ragService = new RAGService()
```

---

## Integrating Groq for Conversational AI

### Setup Groq

1. **Get API Key**: Sign up at https://console.groq.com
2. **Install SDK**:

```bash
npm install groq-sdk
```

### Create Groq Service

```typescript
// src/utils/groqService.ts
import Groq from 'groq-sdk'
import { ragService } from './ragService'
import { databaseService } from './database'
import type { Scribe, ScribeMessage } from './types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY
})

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export class GroqService {
  private defaultModel = 'llama-3.1-70b-versatile' // or 'mixtral-8x7b-32768', 'gemma-7b-it'
  private defaultTemperature = 0.7

  /**
   * Generate AI response with RAG context
   */
  async generateResponse(
    query: string,
    scribe: Scribe,
    options?: ChatOptions
  ): Promise<{ content: string; tokens: number }> {
    // Step 1: Retrieve relevant context using RAG
    const context = await ragService.retrieveContext(query, {
      matchThreshold: 0.7,
      matchCount: 5,
      documentIds: scribe.document_id ? [scribe.document_id] : undefined
    })

    // Step 2: Build context string
    const contextString = ragService.buildContextString(context, 5)

    // Step 3: Get conversation history
    const messages = await databaseService.getScribeMessages(scribe.id)
    
    // Step 4: Build system prompt with RAG context
    const systemPrompt = options?.systemPrompt || scribe.system_prompt || this.buildDefaultSystemPrompt(contextString)

    // Step 5: Prepare messages for Groq
    const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter(m => m.role !== 'system') // Groq doesn't support system messages in history
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
      { role: 'user', content: query }
    ]

    // Step 6: Call Groq API
    try {
      const completion = await groq.chat.completions.create({
        model: options?.model || scribe.model || this.defaultModel,
        messages: groqMessages as any,
        temperature: options?.temperature || scribe.temperature || this.defaultTemperature,
        max_tokens: options?.maxTokens || 2000
      })

      const content = completion.choices[0]?.message?.content || ''
      const tokens = completion.usage?.total_tokens || 0

      return { content, tokens }
    } catch (error) {
      console.error('Groq API error:', error)
      throw new Error(`Failed to generate response: ${error}`)
    }
  }

  /**
   * Build default system prompt with RAG context
   */
  private buildDefaultSystemPrompt(contextString: string): string {
    return `You are a helpful AI assistant that answers questions based on the provided context from the user's saved documents.

IMPORTANT: 
- Answer questions using ONLY the information provided in the context below.
- If the context doesn't contain enough information to answer the question, say so honestly.
- Cite specific sections or pages when referencing information.
- Be concise but thorough.

CONTEXT FROM USER'S DOCUMENTS:
${contextString}

Your responses should be helpful, accurate, and based on the context provided above.`
  }

  /**
   * Complete RAG conversation flow
   */
  async handleConversation(
    scribeId: string,
    userMessage: string
  ): Promise<ScribeMessage> {
    // Get scribe
    const scribe = await databaseService.getScribeById(scribeId)
    if (!scribe) {
      throw new Error(`Scribe ${scribeId} not found`)
    }

    // Save user message
    const userScribeMessage = await databaseService.saveScribeMessage({
      scribe_id: scribeId,
      role: 'user',
      content: userMessage
    })

    // Generate AI response with RAG
    const { content, tokens } = await this.generateResponse(userMessage, scribe)

    // Save AI response
    const assistantMessage = await databaseService.saveScribeMessage({
      scribe_id: scribeId,
      role: 'assistant',
      content,
      tokens,
      model: scribe.model || this.defaultModel
    })

    // Update scribe token count
    await databaseService.updateScribe(scribeId, {
      total_tokens: (scribe.total_tokens || 0) + tokens
    })

    return assistantMessage
  }
}

export const groqService = new GroqService()
```

### Environment Variables

Add to your `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # For embeddings
```

---

## Alternative AI Services

### OpenAI (ChatGPT)

```typescript
// src/utils/openaiService.ts
import OpenAI from 'openai'
import { ragService } from './ragService'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY
})

export class OpenAIService {
  async generateResponse(
    query: string,
    scribe: Scribe,
    context: RAGContext
  ): Promise<{ content: string; tokens: number }> {
    const contextString = ragService.buildContextString(context, 5)
    
    const messages = [
      {
        role: 'system' as const,
        content: `You are a helpful assistant. Answer questions based on this context:\n\n${contextString}`
      },
      { role: 'user' as const, content: query }
    ]

    const completion = await openai.chat.completions.create({
      model: scribe.model || 'gpt-4-turbo-preview',
      messages,
      temperature: scribe.temperature || 0.7
    })

    return {
      content: completion.choices[0]?.message?.content || '',
      tokens: completion.usage?.total_tokens || 0
    }
  }
}
```

### Anthropic (Claude)

```bash
npm install @anthropic-ai/sdk
```

```typescript
// src/utils/anthropicService.ts
import Anthropic from '@anthropic-ai/sdk'
import { ragService } from './ragService'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY
})

export class AnthropicService {
  async generateResponse(
    query: string,
    scribe: Scribe,
    context: RAGContext
  ): Promise<{ content: string; tokens: number }> {
    const contextString = ragService.buildContextString(context, 5)
    
    const message = await anthropic.messages.create({
      model: scribe.model || 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: scribe.temperature || 0.7,
      system: `You are a helpful assistant. Answer questions based on this context:\n\n${contextString}`,
      messages: [
        { role: 'user', content: query }
      ]
    })

    return {
      content: message.content[0].type === 'text' ? message.content[0].text : '',
      tokens: message.usage.input_tokens + message.usage.output_tokens
    }
  }
}
```

---

## Complete RAG Implementation

### Integration in Scribe Component

```typescript
// src/popup/ScribeDetail.vue (or your scribe component)
import { groqService } from '@/utils/groqService'
import { ref } from 'vue'

export default {
  setup() {
    const isLoading = ref(false)
    const messages = ref([])

    async function sendMessage(scribeId: string, message: string) {
      isLoading.value = true
      try {
        const response = await groqService.handleConversation(scribeId, message)
        messages.value.push(response)
      } catch (error) {
        console.error('Error sending message:', error)
        // Show error to user
      } finally {
        isLoading.value = false
      }
    }

    return { sendMessage, isLoading, messages }
  }
}
```

### Auto-process Documents on Save

```typescript
// src/utils/storage.ts
import { vectorStorageService } from './vectorStorage'

export async function saveDocument(data: CreateDocumentInput): Promise<Document> {
  // Save document
  const document = await databaseService.saveDocument(data)

  // Process and store vectors (async, don't block)
  vectorStorageService.onDocumentSaved(document).catch(error => {
    console.error('Error processing document vectors:', error)
    // Optionally retry or queue for later processing
  })

  return document
}
```

---

## Best Practices

### 1. Chunking Strategy

- **Optimal chunk size**: 500-1000 characters (balance between context and granularity)
- **Overlap**: 10-20% overlap between chunks preserves context
- **Respect boundaries**: Break at sentence/paragraph boundaries when possible

### 2. Embedding Models

- **OpenAI**: `text-embedding-3-small` (1536 dim) - Best balance of cost/quality
- **OpenAI**: `text-embedding-ada-002` (1536 dim) - Legacy but reliable
- **Local**: Use `Xenova/all-MiniLM-L6-v2` for privacy (384 dim - adjust schema)

### 3. Vector Index Tuning

```sql
-- For better search performance, adjust IVFFlat index
DROP INDEX IF EXISTS idx_document_vector_embedding;

-- Recreate with more lists for larger datasets
CREATE INDEX idx_document_vector_embedding 
ON document_vector 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); -- Increase for >100k vectors: lists = sqrt(rows/1000)
```

### 4. Cost Optimization

- **Batch embeddings**: Process multiple chunks at once
- **Cache embeddings**: Don't regenerate if document hasn't changed
- **Lazy processing**: Process vectors in background, don't block saves
- **Groq advantage**: Much cheaper than OpenAI for inference (~$0.27/1M tokens vs $10-30/1M)

### 5. Error Handling

```typescript
// Retry logic for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

### 6. Monitoring

Track:
- Embedding generation time
- Vector storage operations
- Semantic search performance
- AI API costs and latency
- RAG context quality (similarity scores)

### 7. Security

- **API Keys**: Store in environment variables, never commit
- **RLS**: Already enabled - users can only access their own vectors
- **Rate Limiting**: Implement rate limits for API calls
- **Input Validation**: Sanitize user queries before processing

---

## Troubleshooting

### Issue: "Extension 'vector' does not exist"

**Solution**: Run this in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Embeddings dimension mismatch

**Solution**: Ensure embedding service returns 1536 dimensions (or adjust schema):
```sql
-- Check current dimension
SELECT atttypmod FROM pg_attribute 
WHERE attrelid = 'document_vector'::regclass 
AND attname = 'embedding';

-- If needed, alter column
ALTER TABLE document_vector 
ALTER COLUMN embedding TYPE vector(1536);
```

### Issue: Slow semantic search

**Solution**: 
1. Rebuild index with more lists
2. Use `HNSW` index instead of `IVFFlat` (PostgreSQL 12+):
```sql
CREATE INDEX idx_document_vector_embedding_hnsw 
ON document_vector 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Issue: Poor RAG results

**Solutions**:
1. Lower `match_threshold` (try 0.6 instead of 0.7)
2. Increase `match_count` to retrieve more chunks
3. Improve chunking strategy (better boundaries)
4. Use hybrid search (semantic + full-text)

---

## Example: Complete Flow

```typescript
// 1. User saves a document
const document = await databaseService.saveDocument({
  type: 'pdf',
  title: 'Research Paper',
  url: 'https://example.com/paper.pdf',
  content: 'Full text content...',
  tags: ['research']
})

// 2. Process and store vectors (async)
await vectorStorageService.onDocumentSaved(document)

// 3. User asks a question in scribe
const response = await groqService.handleConversation(
  scribeId,
  'What are the main findings?'
)

// Behind the scenes:
// - Query embedding generated
// - Semantic search finds relevant chunks
// - Context built from chunks
// - Groq generates response using context
// - Response saved to database
```

---

## Next Steps

1. ✅ Set up embedding service (OpenAI or local)
2. ✅ Implement chunking logic
3. ✅ Create vector storage service
4. ✅ Integrate Groq/OpenAI for conversational AI
5. ✅ Add RAG to scribe conversations
6. ✅ Test with various document types
7. ✅ Monitor performance and costs
8. ✅ Optimize chunking and retrieval strategies

---

## Resources

- **pgvector**: https://github.com/pgvector/pgvector
- **Groq API Docs**: https://console.groq.com/docs
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **Supabase Vector Search**: https://supabase.com/docs/guides/ai/vector-columns
- **RAG Best Practices**: https://www.pinecone.io/learn/retrieval-augmented-generation/

---

**Ready to implement?** Start with the embedding service and chunking, then integrate with your document save flow. The RAG-powered conversational AI will significantly enhance your scribe feature!

