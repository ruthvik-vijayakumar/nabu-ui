// Process Document Edge Function
// Chunks documents and generates embeddings for vector storage

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY'),
      supabaseUrlLength: supabaseUrl.length,
      serviceKeyLength: supabaseServiceKey.length
    })
    
    if (!supabaseUrl) {
      console.error('❌ SUPABASE_URL not set')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get embedding provider (default to OpenAI, can be 'openai', 'huggingface', 'cohere')
    const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'openai'
    
    // Get API keys based on provider
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    const cohereApiKey = Deno.env.get('COHERE_API_KEY')
    
    console.log('🔧 Embedding provider:', embeddingProvider)
    console.log('🔧 API keys available:', {
      openai: !!openaiApiKey,
      huggingface: !!huggingfaceApiKey,
      cohere: !!cohereApiKey
    })
    
    // Validate API key for selected provider
    if (embeddingProvider === 'openai' && !openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured. Set it with: supabase secrets set OPENAI_API_KEY=sk-...' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (embeddingProvider === 'huggingface' && !huggingfaceApiKey) {
      console.error('❌ HUGGINGFACE_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'HUGGINGFACE_API_KEY not configured. Set it with: supabase secrets set HUGGINGFACE_API_KEY=hf_...' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (embeddingProvider === 'cohere' && !cohereApiKey) {
      console.error('❌ COHERE_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'COHERE_API_KEY not configured. Set it with: supabase secrets set COHERE_API_KEY=...' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { documentId } = await req.json()

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 Processing document:', documentId)

    // Get document
    const { data: document, error: docError } = await supabaseClient
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('❌ Document not found:', docError)
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!document.content || document.content.trim().length === 0) {
      console.log('⚠️ Document has no content to process')
      return new Response(
        JSON.stringify({ message: 'Document has no content to process', chunksProcessed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Document content length:', document.content.length)

    // Chunk the document
    const chunks = chunkDocument(document.content, {
      chunkSize: 1000,
      chunkOverlap: 200,
      pageNumber: document.metadata?.page_number,
      sectionTitle: document.title
    })

    console.log('✂️ Generated', chunks.length, 'chunks')

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No chunks generated', chunksProcessed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embeddings using selected provider
    const texts = chunks.map(chunk => chunk.text)
    console.log('🔢 Generating embeddings for', texts.length, 'chunks using', embeddingProvider, '...')
    
    let embeddings: number[][]
    
    if (embeddingProvider === 'huggingface') {
      // Hugging Face embeddings
      embeddings = await generateHuggingFaceEmbeddings(texts, huggingfaceApiKey!)
    } else if (embeddingProvider === 'cohere') {
      // Cohere embeddings
      embeddings = await generateCohereEmbeddings(texts, cohereApiKey!)
    } else {
      // OpenAI embeddings (default)
      embeddings = await generateOpenAIEmbeddings(texts, openaiApiKey!)
    }

    console.log('✅ Generated', embeddings.length, 'embeddings with', embeddings[0]?.length || 0, 'dimensions')

    // Validate embedding dimensions match database schema
    const embeddingDim = embeddings[0]?.length || 0
    console.log('📐 Embedding dimensions:', embeddingDim)
    
    // Note: Database expects 1536 dimensions, but Hugging Face returns 384
    // We'll store whatever we get - may need to adjust database schema for different providers
    if (embeddingDim !== 1536 && embeddingDim !== 384 && embeddingDim !== 768 && embeddingDim !== 1024) {
      console.warn(`⚠️ Unexpected embedding dimension: ${embeddingDim}. Expected 1536, 384, 768, or 1024.`)
    }
    
    // Prepare vectors for storage
    const vectors = chunks.map((chunk, index) => {
      const vectorData: any = {
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
          embedding_provider: embeddingProvider,
          embedding_dimensions: embeddingDim
        }
      }
      
      // Also store in separate columns if they exist (for easier querying)
      // These columns were added in migration 011_flexible_embedding_dimensions.sql
      vectorData.embedding_provider = embeddingProvider
      vectorData.embedding_dimensions = embeddingDim
      
      return vectorData
    })

    // Delete existing vectors for this document (in case of reprocessing)
    await supabaseClient
      .from('document_vector')
      .delete()
      .eq('document_id', documentId)

    console.log('🗑️ Deleted existing vectors for document')

    // Insert new vectors
    const { error: vectorError } = await supabaseClient
      .from('document_vector')
      .insert(vectors)

    if (vectorError) {
      console.error('❌ Error inserting vectors:', vectorError)
      throw vectorError
    }

    console.log('✅ Stored', vectors.length, 'vectors in database')

    return new Response(
      JSON.stringify({ 
        message: 'Document processed successfully',
        chunksProcessed: chunks.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing document:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    })
    
    // Return detailed error for debugging
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        errorType: error.name || 'Error',
        details: process.env.DENO_ENV === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Embedding generation functions

async function generateOpenAIEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

async function generateHuggingFaceEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  // Hugging Face Inference API - free tier available
  // Using sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
  const model = 'sentence-transformers/all-MiniLM-L6-v2'
  
  const embeddings: number[][] = []
  
  // Hugging Face API can process multiple texts in one request
  // But for reliability, we'll process in smaller batches
  const batchSize = 10
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          inputs: batch.length === 1 ? batch[0] : batch,
          options: { wait_for_model: true } // Wait if model is loading
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Hugging Face API error:', errorText)
      
      // If model is loading, wait and retry
      if (response.status === 503) {
        console.log('⏳ Model is loading, waiting 10 seconds...')
        await new Promise(resolve => setTimeout(resolve, 10000))
        // Retry once
        const retryResponse = await fetch(
          `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              inputs: batch.length === 1 ? batch[0] : batch,
              options: { wait_for_model: true }
            })
          }
        )
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.text()
          throw new Error(`Hugging Face API error: ${retryError}`)
        }
        
        const retryData = await retryResponse.json()
        const batchEmbeddings = Array.isArray(retryData) 
          ? (Array.isArray(retryData[0]) ? retryData : [retryData])
          : [retryData]
        embeddings.push(...batchEmbeddings)
        continue
      }
      
      throw new Error(`Hugging Face API error: ${errorText}`)
    }

    const data = await response.json()
    
    // Handle different response formats
    // Single text: returns array of numbers
    // Multiple texts: returns array of arrays
    if (batch.length === 1) {
      // Single text - response is array of numbers
      embeddings.push(Array.isArray(data) ? data : [data])
    } else {
      // Multiple texts - response is array of arrays
      const batchEmbeddings = Array.isArray(data) 
        ? (Array.isArray(data[0]) ? data : data.map((e: any) => [e]))
        : [[data]]
      embeddings.push(...batchEmbeddings)
    }
  }
  
  return embeddings
}

async function generateCohereEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  // Cohere Embed API
  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'embed-english-light-v3.0', // or 'embed-english-v3.0' for better quality
      texts: texts,
      input_type: 'search_document' // or 'search_query' for queries
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Cohere API error:', error)
    throw new Error(`Cohere API error: ${error}`)
  }

  const data = await response.json()
  return data.embeddings
}

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

  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim()

  while (start < cleanText.length) {
    let end = start + size

    // Try to break at sentence boundaries
    if (end < cleanText.length) {
      const lastPeriod = cleanText.lastIndexOf('.', end)
      const lastNewline = cleanText.lastIndexOf('\n', end)
      const lastExclamation = cleanText.lastIndexOf('!', end)
      const lastQuestion = cleanText.lastIndexOf('?', end)
      const breakPoint = Math.max(lastPeriod, lastNewline, lastExclamation, lastQuestion)

      // Only use break point if it's not too close to the start
      if (breakPoint > start + size * 0.5) {
        end = breakPoint + 1
      }
    }

    const chunkText = cleanText.slice(start, Math.min(end, cleanText.length)).trim()

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index,
        pageNumber: options.pageNumber,
        sectionTitle: options.sectionTitle
      })
    }

    // Move start position with overlap
    start = end - overlap
    index++
  }

  return chunks
}
