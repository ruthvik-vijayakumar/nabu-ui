import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get embedding provider (default to OpenAI)
    const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'openai'
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    const cohereApiKey = Deno.env.get('COHERE_API_KEY')

    const { texts } = await req.json()

    if (!texts || !Array.isArray(texts)) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔢 Generating embeddings for', texts.length, 'texts using', embeddingProvider)

    let embeddings: number[][]

    if (embeddingProvider === 'huggingface') {
      if (!huggingfaceApiKey) {
        return new Response(
          JSON.stringify({ error: 'HUGGINGFACE_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Hugging Face Inference API
      const model = 'sentence-transformers/all-MiniLM-L6-v2'
      embeddings = []

      // Process in batches
      const batchSize = 10
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)

        const response = await fetch(
          `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${huggingfaceApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: batch.length === 1 ? batch[0] : batch,
              options: { wait_for_model: true }
            })
          }
        )

        if (!response.ok) {
          if (response.status === 503) {
            // Model loading, wait and retry
            console.log('⏳ Model loading, waiting 10 seconds...')
            await new Promise(resolve => setTimeout(resolve, 10000))

            const retryResponse = await fetch(
              `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${huggingfaceApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  inputs: batch.length === 1 ? batch[0] : batch,
                  options: { wait_for_model: true }
                })
              }
            )

            if (!retryResponse.ok) {
              const error = await retryResponse.text()
              throw new Error(`Hugging Face API error: ${error}`)
            }

            const retryData = await retryResponse.json()
            if (batch.length === 1) {
              embeddings.push(Array.isArray(retryData) ? retryData : [retryData])
            } else {
              const batchEmbeddings = Array.isArray(retryData)
                ? (Array.isArray(retryData[0]) ? retryData : retryData.map((e: any) => [e]))
                : [[retryData]]
              embeddings.push(...batchEmbeddings)
            }
            continue
          }

          const error = await response.text()
          throw new Error(`Hugging Face API error: ${error}`)
        }

        const data = await response.json()
        if (batch.length === 1) {
          embeddings.push(Array.isArray(data) ? data : [data])
        } else {
          const batchEmbeddings = Array.isArray(data)
            ? (Array.isArray(data[0]) ? data : data.map((e: any) => [e]))
            : [[data]]
          embeddings.push(...batchEmbeddings)
        }
      }

    } else if (embeddingProvider === 'cohere') {
      if (!cohereApiKey) {
        return new Response(
          JSON.stringify({ error: 'COHERE_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cohereApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'embed-english-light-v3.0',
          texts: texts,
          input_type: 'search_document'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Cohere API error: ${error}`)
      }

      const data = await response.json()
      embeddings = data.embeddings

    } else {
      // OpenAI (default)
      if (!openaiApiKey) {
        return new Response(
          JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
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
        throw new Error(`OpenAI API error: ${error}`)
      }

      const data = await response.json()
      embeddings = data.data.map((item: any) => item.embedding)
    }

    console.log('✅ Generated', embeddings.length, 'embeddings with', embeddings[0]?.length || 0, 'dimensions')

    return new Response(
      JSON.stringify({ embeddings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Generate embeddings error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
