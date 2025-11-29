// Process Image Edge Function
// Extracts text and diagrams from images using Vision API, then generates embeddings

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
    
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openaiApiKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured. Required for image processing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const { documentId } = await req.json()
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🖼️ Processing image document:', documentId)

    // Fetch document from database
    const { data: document, error: docError } = await supabaseClient
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('❌ Document not found:', docError)
      return new Response(
        JSON.stringify({ error: 'Document not found', details: docError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if document is an image
    if (document.type !== 'image') {
      return new Response(
        JSON.stringify({ error: 'Document is not an image', type: document.type }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get image URL from storage_object_path or media_url
    let imageUrl = document.media_url || document.storage_object_path
    
    if (!imageUrl) {
      console.error('❌ No image URL found in document')
      return new Response(
        JSON.stringify({ error: 'No image URL found in document' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If storage_object_path, construct full URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      const { data: urlData } = supabaseClient.storage
        .from('nabu-ai-object-storage')
        .getPublicUrl(imageUrl)
      imageUrl = urlData.publicUrl
    }

    console.log('📸 Extracting text from image:', imageUrl)

    // Step 1: Use OpenAI Vision API to extract text and describe diagrams
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or 'gpt-4-vision-preview'
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. If there are diagrams, charts, or visual elements, describe them in detail. Format the output as structured text that can be used for search and retrieval. Include:\n1. All visible text (preserve formatting where possible)\n2. Descriptions of diagrams, charts, or visual elements\n3. Any important visual information that would be useful for understanding the content'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high' // Use 'high' for better OCR accuracy
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      })
    })

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json().catch(() => ({}))
      console.error('❌ Vision API error:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract text from image', 
          details: errorData.error?.message || visionResponse.statusText 
        }),
        { status: visionResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const visionData = await visionResponse.json()
    const extractedText = visionData.choices?.[0]?.message?.content || ''

    if (!extractedText || extractedText.trim().length === 0) {
      console.log('⚠️ No text extracted from image')
      return new Response(
        JSON.stringify({ 
          message: 'No text or content found in image',
          chunksProcessed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Text extracted from image:', extractedText.length, 'characters')

    // Step 2: Update document with extracted text
    const { error: updateError } = await supabaseClient
      .from('document')
      .update({ 
        content: extractedText,
        metadata: {
          ...(document.metadata || {}),
          imageProcessed: true,
          imageProcessedAt: new Date().toISOString(),
          extractedTextLength: extractedText.length
        }
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('❌ Failed to update document with extracted text:', updateError)
      // Continue anyway - we can still process the text
    }

    // Step 3: Chunk the extracted text
    const chunks = chunkText(extractedText, document.title || 'Image')
    console.log('📦 Created', chunks.length, 'chunks from extracted text')

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No chunks created from extracted text',
          chunksProcessed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Generate embeddings for chunks
    const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'openai'
    const embeddings = await generateEmbeddings(
      chunks.map(c => c.text),
      embeddingProvider,
      openaiApiKey,
      Deno.env.get('HUGGINGFACE_API_KEY'),
      Deno.env.get('COHERE_API_KEY')
    )

    if (!embeddings || embeddings.length !== chunks.length) {
      console.error('❌ Embedding generation failed or mismatch')
      return new Response(
        JSON.stringify({ error: 'Failed to generate embeddings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Generated', embeddings.length, 'embeddings')

    // Step 5: Store vectors in database
    const vectorsToInsert = chunks.map((chunk, idx) => ({
      document_id: documentId,
      user_id: document.user_id,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      embedding: embeddings[idx],
      page_number: chunk.pageNumber,
      section_title: chunk.sectionTitle,
      metadata: {
        source: 'image',
        extractedFromImage: true,
        embedding_provider: embeddingProvider,
        embedding_dimensions: embeddings[idx]?.length || 0
      },
      embedding_provider: embeddingProvider,
      embedding_dimensions: embeddings[idx]?.length || 0
    }))

    // Delete existing vectors for this document (in case reprocessing)
    await supabaseClient
      .from('document_vector')
      .delete()
      .eq('document_id', documentId)

    // Insert new vectors
    const { error: vectorError } = await supabaseClient
      .from('document_vector')
      .insert(vectorsToInsert)

    if (vectorError) {
      console.error('❌ Failed to store vectors:', vectorError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store vectors',
          details: vectorError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Stored', vectorsToInsert.length, 'vectors for image document')

    return new Response(
      JSON.stringify({
        message: 'Image processed successfully',
        chunksProcessed: vectorsToInsert.length,
        extractedTextLength: extractedText.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error processing image:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process image',
        message: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function chunkText(text: string, title: string): Chunk[] {
  if (!text || text.trim().length === 0) return []

  // Normalize text
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (normalized.length === 0) return []

  const chunks: Chunk[] = []
  const maxChunkSize = 1000 // Characters per chunk
  const overlap = 200 // Overlap between chunks

  // Split by paragraphs first
  const paragraphs = normalized.split(/\n\n+/).filter(p => p.trim().length > 0)

  let currentChunk = ''
  let chunkIndex = 0

  for (const para of paragraphs) {
    const paraText = para.trim()

    // If paragraph is too large, split it further
    if (paraText.length > maxChunkSize) {
      // Save current chunk if exists
      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          sectionTitle: title
        })
        currentChunk = ''
      }

      // Split large paragraph by sentences
      const sentences = paraText.match(/[^.!?]+[.!?]+/g) || [paraText]
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize && currentChunk.trim().length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            sectionTitle: title
          })
          // Start new chunk with overlap
          const words = currentChunk.split(/\s+/)
          const overlapText = words.slice(-Math.floor(overlap / 10)).join(' ')
          currentChunk = overlapText + ' ' + sentence
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence
        }
      }
    } else {
      // Check if adding this paragraph would exceed chunk size
      if ((currentChunk + '\n\n' + paraText).length > maxChunkSize && currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          sectionTitle: title
        })
        // Start new chunk with overlap
        const words = currentChunk.split(/\s+/)
        const overlapText = words.slice(-Math.floor(overlap / 10)).join(' ')
        currentChunk = overlapText + '\n\n' + paraText
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paraText
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex++,
      sectionTitle: title
    })
  }

  return chunks
}

async function generateEmbeddings(
  texts: string[],
  provider: string,
  openaiKey?: string,
  huggingfaceKey?: string,
  cohereKey?: string
): Promise<number[][]> {
  if (provider === 'openai') {
    if (!openaiKey) throw new Error('OpenAI API key required')
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.data.map((item: any) => item.embedding)
  }

  if (provider === 'huggingface') {
    if (!huggingfaceKey) throw new Error('Hugging Face API key required')
    
    // Hugging Face embeddings
    const embeddings: number[][] = []
    for (const text of texts) {
      const response = await fetch(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingfaceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text })
        }
      )

      if (!response.ok) {
        // Retry after delay if model is loading
        if (response.status === 503) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          const retryResponse = await fetch(
            'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${huggingfaceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ inputs: text })
            }
          )
          if (retryResponse.ok) {
            embeddings.push(await retryResponse.json())
            continue
          }
        }
        throw new Error(`Hugging Face API error: ${response.statusText}`)
      }

      embeddings.push(await response.json())
    }
    return embeddings
  }

  if (provider === 'cohere') {
    if (!cohereKey) throw new Error('Cohere API key required')
    
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'embed-english-light-v3.0',
        texts: texts,
        truncate: 'END'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Cohere API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.embeddings
  }

  throw new Error(`Unsupported embedding provider: ${provider}`)
}

