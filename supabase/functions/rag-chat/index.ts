import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('❌ User auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('👤 Authenticated user:', user.id)

    // Parse request
    const { scribeId, message, useGroq = true, matchThreshold = 0.7, matchCount = 10 } = await req.json()

    if (!scribeId || !message) {
      return new Response(
        JSON.stringify({ error: 'scribeId and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('💬 RAG chat request:', { scribeId, messageLength: message.length, useGroq, matchThreshold, matchCount })

    // Get scribe (RLS will handle access control for owned and shared scribes)
    const { data: scribe, error: scribeError } = await supabaseClient
      .from('scribe')
      .select('*')
      .eq('id', scribeId)
      .single()

    if (scribeError || !scribe) {
      console.error('❌ Scribe not found:', scribeError)
      return new Response(
        JSON.stringify({ error: 'Scribe not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Found scribe:', scribe.name)

    // Save user message
    const { error: messageError } = await supabaseClient
      .from('scribe_message')
      .insert({
        scribe_id: scribeId,
        user_id: user.id,
        role: 'user',
        content: message
      })

    if (messageError) {
      console.error('⚠️ Failed to save user message:', messageError)
      // Continue anyway - not critical
    }

    // Get embedding provider (same as process-document)
    const embeddingProvider = Deno.env.get('EMBEDDING_PROVIDER') || 'openai'
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    const cohereApiKey = Deno.env.get('COHERE_API_KEY')

    // Generate query embedding
    console.log('🔢 Generating query embedding using', embeddingProvider)
    let queryEmbedding: number[]

    if (embeddingProvider === 'huggingface' && huggingfaceApiKey) {
      const response = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingfaceApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            inputs: message,
            options: { wait_for_model: true }
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Hugging Face API error: ${error}`)
      }

      const data = await response.json()
      queryEmbedding = Array.isArray(data) ? data : [data]
    } else if (embeddingProvider === 'cohere' && cohereApiKey) {
      const response = await fetch('https://api.cohere.ai/v1/embed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cohereApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'embed-english-light-v3.0',
          texts: [message],
          input_type: 'search_query'
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Cohere API error: ${error}`)
      }

      const data = await response.json()
      queryEmbedding = data.embeddings[0]
    } else {
      // OpenAI (default)
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: message,
          dimensions: 1536
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${error}`)
      }

      const data = await response.json()
      queryEmbedding = data.data[0].embedding
    }

    console.log('✅ Query embedding generated:', queryEmbedding.length, 'dimensions')

    // Get document IDs for this scribe (RLS will handle access control for shared scribes)
    const { data: scribeDocuments } = await supabaseClient
      .from('document')
      .select('id')
      .eq('scribe_id', scribeId)
      .limit(1000) // Reasonable limit
    
    const documentIds = scribeDocuments?.map(d => d.id) || []
    console.log(`📄 Found ${documentIds.length} documents in scribe ${scribeId}`)
    
    if (documentIds.length === 0) {
      console.log('⚠️ No documents found in scribe')
      return new Response(
        JSON.stringify({
          message: "This scribe doesn't have any documents yet. Please save some documents to this scribe first.",
          tokens: 0,
          contextChunks: 0,
          sources: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if any of these documents have vectors (RLS will handle access)
    console.log(`🔍 Checking for vectors in ${documentIds.length} documents:`, documentIds.slice(0, 5))
    const { data: sampleVectors, count: vectorCount, error: vectorError } = await supabaseClient
      .from('document_vector')
      .select('embedding, metadata, embedding_provider, embedding_dimensions, document_id', { count: 'exact' })
      .in('document_id', documentIds)
      .limit(1)

    if (vectorError) {
      console.error('❌ Error checking for vectors:', vectorError)
    }
    
    console.log('📊 Found', vectorCount || 0, 'vectors for this scribe')
    if (sampleVectors && sampleVectors.length > 0) {
      console.log('📊 Sample vector document_id:', sampleVectors[0].document_id)
      console.log('📊 Sample vector has embedding:', !!sampleVectors[0].embedding)
    } else {
      console.warn('⚠️ No vectors found. This could mean:')
      console.warn('   1. Documents have not been processed for vector storage')
      console.warn('   2. RLS policy is blocking access to vectors')
      console.warn('   3. Documents exist but have no content to vectorize')
      
      // Try to check if documents exist and have content
      const { data: docDetails } = await supabaseClient
        .from('document')
        .select('id, title, type, content')
        .eq('scribe_id', scribeId)
        .limit(5)
      
      console.log('📄 Sample documents in scribe:', docDetails?.map(d => ({
        id: d.id,
        title: d.title,
        type: d.type,
        hasContent: !!d.content,
        contentLength: d.content?.length || 0
      })))
    }
    
    // Check embedding dimensions of stored vectors
    if (sampleVectors && sampleVectors.length > 0) {
      const sample = sampleVectors[0]
      const sampleEmbedding = sample.embedding
      
      // Try to get dimensions from multiple sources (separate column, metadata, or array length)
      const storedDim = sample.embedding_dimensions 
        || sample.metadata?.embedding_dimensions 
        || (Array.isArray(sampleEmbedding) ? sampleEmbedding.length : null)
      
      // Try to get provider from multiple sources (separate column, metadata, or default)
      const storedProvider = sample.embedding_provider 
        || sample.metadata?.embedding_provider 
        || 'unknown'
      
      console.log('📐 Stored vector dimensions:', storedDim || 'unknown')
      console.log('📐 Stored vector provider:', storedProvider)
      console.log('📐 Query embedding dimensions:', queryEmbedding.length)
      console.log('📐 Sample vector data:', {
        hasEmbeddingProviderColumn: !!sample.embedding_provider,
        hasEmbeddingDimensionsColumn: !!sample.embedding_dimensions,
        hasMetadata: !!sample.metadata,
        metadataProvider: sample.metadata?.embedding_provider,
        metadataDimensions: sample.metadata?.embedding_dimensions
      })
      
      // Check for dimension mismatch
      if (storedDim && storedDim !== queryEmbedding.length) {
        console.error('❌ DIMENSION MISMATCH!')
        console.error(`   Query: ${queryEmbedding.length} dimensions`)
        console.error(`   Stored: ${storedDim} dimensions`)
        console.error(`   Provider: ${storedProvider}`)
        
        return new Response(
          JSON.stringify({
            message: `Embedding dimension mismatch detected. Your documents were processed with ${storedProvider} (${storedDim} dimensions), but the query is using ${queryEmbedding.length} dimensions. Please ensure the embedding provider matches. Set EMBEDDING_PROVIDER secret to match how documents were processed.`,
            tokens: 0,
            contextChunks: 0,
            sources: [],
            error: 'Dimension mismatch',
            details: {
              queryDimensions: queryEmbedding.length,
              storedDimensions: storedDim,
              storedProvider: storedProvider
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!vectorCount || vectorCount === 0) {
      console.warn('⚠️ No vectors found for user. Documents may not have been processed.')
      // Return helpful message
  return new Response(
        JSON.stringify({
          message: 'I don\'t have any information from your documents yet. Please save some documents first, and make sure they are processed for vector storage. You can check if documents have been processed in the Supabase dashboard.',
          tokens: 0,
          contextChunks: 0,
          sources: [],
          warning: 'No document vectors found. Documents may need to be processed.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Semantic search - try flexible function first, fall back to dimension-specific
    console.log('🔍 Performing semantic search with threshold:', matchThreshold)
    console.log('🔍 Query embedding dimensions:', queryEmbedding.length)
    
    let searchResults: any[] | null = null
    let searchError: any = null
    
    // First, check what dimensions exist in the database for this scribe
    const { data: dimensionCheck } = await supabaseClient
      .from('document_vector')
      .select('embedding')
      .in('document_id', documentIds)
      .not('embedding', 'is', null)
      .limit(1)
      .single()
    
    if (dimensionCheck?.embedding) {
      const storedDim = Array.isArray(dimensionCheck.embedding) 
        ? dimensionCheck.embedding.length 
        : null
      console.log('📐 Actual stored vector dimension:', storedDim)
      
      if (storedDim && storedDim !== queryEmbedding.length) {
        console.error('❌ Dimension mismatch detected before search!')
        console.error(`   Query: ${queryEmbedding.length} dimensions`)
        console.error(`   Stored: ${storedDim} dimensions`)
      }
    }
    
    // First, verify we can access vectors directly (for debugging)
    const { data: testVectors, count: testCount } = await supabaseClient
      .from('document_vector')
      .select('id, document_id', { count: 'exact' })
      .in('document_id', documentIds)
      .limit(5)
    
    console.log(`🔍 Direct vector query test: Found ${testCount || 0} vectors accessible via RLS`)
    if (testVectors && testVectors.length > 0) {
      console.log('✅ Vectors are accessible! Sample document_ids:', testVectors.map(v => v.document_id))
    } else {
      console.warn('⚠️ Direct vector query returned 0 results - RLS might be blocking or vectors don\'t exist')
    }
    
    // Try the flexible function first
    // Use scribe_filter to limit search to documents in this scribe (works for both owned and shared)
    console.log(`🔍 Searching with scribe_filter: ${scribeId}, documentIds: ${documentIds.length} documents`)
    const { data: flexibleResults, error: flexibleError } = await supabaseClient
      .rpc('search_documents_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        user_filter: null, // RLS will handle access control
        scribe_filter: scribeId
      })
    
    if (flexibleResults) {
      console.log(`📊 Flexible search returned ${flexibleResults.length} results`)
      const resultDocIds = [...new Set(flexibleResults.map((r: any) => r.document_id))]
      console.log(`📊 Results from ${resultDocIds.length} unique documents:`, resultDocIds)
      const invalidDocs = resultDocIds.filter(id => !documentIds.includes(id))
      if (invalidDocs.length > 0) {
        console.warn(`⚠️ Found ${invalidDocs.length} documents not in scribe:`, invalidDocs)
      }
    }
    
    if (flexibleError) {
      console.log('⚠️ Flexible search failed:', flexibleError.message)
      console.log('⚠️ Error details:', JSON.stringify(flexibleError, null, 2))
      
      // Try dimension-specific function based on query dimension
      const functionName = queryEmbedding.length === 1536 
        ? 'search_documents_semantic_1536'
        : queryEmbedding.length === 384
        ? 'search_documents_semantic_384'
        : 'search_documents_semantic'
      
      console.log('🔍 Trying dimension-specific function:', functionName)
      
      const { data: specificResults, error: specificError } = await supabaseClient
        .rpc(functionName, {
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
          user_filter: null, // RLS will handle access control
          scribe_filter: scribeId
        })
      
      if (specificError) {
        console.error('❌ Dimension-specific search also failed:', specificError)
        console.error('❌ Specific error details:', JSON.stringify(specificError, null, 2))
        searchError = specificError
        
        // Last resort: try direct SQL query
        console.log('🔍 Trying direct SQL query as last resort...')
        try {
          const { data: directResults, error: directError } = await supabaseClient
            .from('document_vector')
            .select('id, document_id, chunk_text, page_number, section_title, chunk_index, embedding')
            .in('document_id', documentIds)
            .not('embedding', 'is', null)
            .limit(matchCount)
          
          if (directError) {
            console.error('❌ Direct query also failed:', directError)
          } else {
            console.log('⚠️ Direct query returned', directResults?.length || 0, 'vectors (no similarity calculation)')
            // Calculate similarity manually if possible
            if (directResults && directResults.length > 0) {
              // For now, just return the first few as a fallback
              searchResults = directResults.slice(0, matchCount).map((r: any, idx: number) => ({
                ...r,
                similarity: 0.5 // Placeholder similarity
              }))
              console.log('⚠️ Using direct query results with placeholder similarity')
            }
          }
        } catch (directErr) {
          console.error('❌ Direct query exception:', directErr)
        }
      } else {
        searchResults = specificResults
        console.log('✅ Dimension-specific search succeeded')
      }
    } else {
      searchResults = flexibleResults
      console.log('✅ Flexible search succeeded')
    }

    if (searchError) {
      console.error('❌ Semantic search error:', searchError)
      // Check if it's a dimension mismatch error
      if (searchError.message?.includes('dimension') || searchError.message?.includes('vector')) {
        throw new Error(`Embedding dimension mismatch. Query embedding has ${queryEmbedding.length} dimensions, but stored vectors may have different dimensions. Ensure documents were processed with the same embedding provider.`)
      }
      throw searchError
    }

    console.log('📊 Found', searchResults?.length || 0, 'relevant chunks (threshold:', matchThreshold, ')')

    // If no results but we have vectors, try with lower threshold
    if ((!searchResults || searchResults.length === 0) && vectorCount > 0) {
      console.log('⚠️ No results with threshold', matchThreshold, '- trying lower threshold 0.5')
      
      // Use the same function that worked (or try flexible again)
      const functionName = queryEmbedding.length === 1536 
        ? 'search_documents_semantic_1536'
        : queryEmbedding.length === 384
        ? 'search_documents_semantic_384'
        : 'search_documents_semantic'
      
      const { data: lowerThresholdResults, error: lowerError } = await supabaseClient
        .rpc(functionName, {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: matchCount,
          user_filter: null, // RLS will handle access control
          scribe_filter: scribeId // CRITICAL: Always filter by scribe
        })
      
      if (lowerError) {
        console.error('❌ Lower threshold search also failed:', lowerError)
      } else if (lowerThresholdResults && lowerThresholdResults.length > 0) {
        console.log('✅ Found', lowerThresholdResults.length, 'results with lower threshold')
        searchResults = lowerThresholdResults
      } else {
        console.log('⚠️ Still no results even with threshold 0.5')
        
        // Try even lower threshold (0.3) as last resort
        console.log('⚠️ Trying very low threshold 0.3')
        const { data: veryLowResults } = await supabaseClient
          .rpc(functionName, {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: matchCount,
            user_filter: null, // RLS will handle access control
            scribe_filter: scribeId // CRITICAL: Always filter by scribe
          })
        
        if (veryLowResults && veryLowResults.length > 0) {
          console.log('✅ Found', veryLowResults.length, 'results with very low threshold')
          searchResults = veryLowResults
        } else {
          console.log('⚠️ No results even with threshold 0.3')
          
          // Last resort: try to get ANY results (threshold 0.0)
          console.log('⚠️ Trying absolute minimum threshold 0.0')
          const { data: anyResults } = await supabaseClient
            .rpc(functionName, {
              query_embedding: queryEmbedding,
              match_threshold: 0.0,
              match_count: matchCount,
              user_filter: null, // RLS will handle access control
              scribe_filter: scribeId // CRITICAL: Always filter by scribe
            })
          
          if (anyResults && anyResults.length > 0) {
            console.log('✅ Found', anyResults.length, 'results with minimum threshold')
            searchResults = anyResults
          } else {
            console.error('❌ No results found even with threshold 0.0 - possible dimension mismatch or empty vectors')
          }
        }
      }
    }

    // Validate that all search results belong to documents in this scribe
    if (searchResults && searchResults.length > 0) {
      const validDocumentIds = new Set(documentIds)
      const originalCount = searchResults.length
      
      // Filter out any chunks from documents not in this scribe
      searchResults = searchResults.filter((result: any) => {
        const isValid = validDocumentIds.has(result.document_id)
        if (!isValid) {
          console.warn(`⚠️ Filtered out chunk from document ${result.document_id} (not in scribe ${scribeId})`)
        }
        return isValid
      })
      
      if (searchResults.length < originalCount) {
        console.warn(`⚠️ Filtered out ${originalCount - searchResults.length} chunks that didn't belong to scribe ${scribeId}`)
      }
      
      console.log(`✅ Validated ${searchResults.length} chunks belong to scribe ${scribeId}`)
    }

    // Build context from search results
    let contextString = ''
    let hasContext = false
    
    if (searchResults && searchResults.length > 0) {
      hasContext = true
      contextString = searchResults
        .slice(0, matchCount)
        .map((result: any, index: number) => {
          let part = `[Context ${index + 1}]\n`
          if (result.section_title) part += `Section: ${result.section_title}\n`
          if (result.page_number) part += `Page: ${result.page_number}\n`
          if (result.similarity) part += `Relevance: ${(result.similarity * 100).toFixed(1)}%\n`
          part += `Content: ${result.chunk_text}\n`
          return part
        })
        .join('\n---\n\n')
      
      console.log('📝 Built context from', searchResults.length, 'chunks')
      console.log('📝 Context length:', contextString.length, 'characters')
      console.log('📝 Context preview:', contextString.substring(0, 200) + '...')
    } else {
      contextString = `No relevant context found. You have ${vectorCount} vectors in your database, but none matched your query with similarity above ${matchThreshold}. Try rephrasing your question or check if your documents contain relevant information.`
      console.log('⚠️ No search results - using fallback context message')
    }

    // Get conversation history
    const { data: messages } = await supabaseClient
      .from('scribe_message')
      .select('*')
      .eq('scribe_id', scribeId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build system prompt with context
    const systemPrompt = scribe.system_prompt || (hasContext 
      ? `You are a helpful AI assistant that answers questions based on the provided context from the user's saved documents.

IMPORTANT: 
- Answer questions using ONLY the information provided in the context below.
- If the context doesn't contain enough information, say so honestly.
- Cite specific sections or pages when referencing information.
- Use the context to provide accurate, detailed answers.

CONTEXT FROM USER'S DOCUMENTS:
${contextString}`
      : `You are a helpful AI assistant. The user asked: "${message}"

IMPORTANT:
- The user has documents saved, but no relevant context was found for their question.
- Politely explain that you couldn't find relevant information in their documents.
- Suggest they may need to save more documents or rephrase their question.
- Be helpful and friendly.`)

    console.log('📋 System prompt length:', systemPrompt.length, 'characters')
    console.log('📋 Has context:', hasContext)
    console.log('📋 System prompt preview:', systemPrompt.substring(0, 300) + '...')

    // Generate AI response
    let aiResponse: string
    let tokens: number
    let usedModel: string

    // Groq-compatible models
    const groqModels = [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma-7b-it',
      'llama-3-70b-8192',
      'llama-3-8b-8192'
    ]

    // Function to get valid Groq model
    function getGroqModel(scribeModel: string | null | undefined): string {
      // if (!scribeModel) {
      //   return 'openai/gpt-oss-20b'
      // }
      // // If it's already a Groq model, use it
      // if (groqModels.includes(scribeModel)) {
      //   return scribeModel
      // }
      // // If it's an OpenAI model (starts with gpt-), use default Groq model
      // if (scribeModel.startsWith('gpt-') || scribeModel.includes('openai')) {
      //   console.log(`⚠️ Scribe model "${scribeModel}" is not a Groq model, using default Groq model`)
      //   return 'llama-3.1-70b-versatile'
      // }
      // // Try the model as-is (might be a valid Groq model not in our list)
      // // But log a warning
      // console.log(`⚠️ Using scribe model "${scribeModel}" with Groq - ensure it's a valid Groq model`)
      return 'openai/gpt-oss-20b'
    }

    // Function to get valid OpenAI model
    function getOpenAIModel(scribeModel: string | null | undefined): string {
      if (!scribeModel) {
        return 'gpt-4-turbo-preview'
      }
      // If it's a Groq model, use default OpenAI model
      if (groqModels.includes(scribeModel)) {
        console.log(`⚠️ Scribe model "${scribeModel}" is a Groq model, using default OpenAI model`)
        return 'gpt-4-turbo-preview'
      }
      // Use the model as-is (assume it's an OpenAI model)
      return scribeModel
    }

    if (useGroq) {
      // Use Groq
      const groqApiKey = Deno.env.get('GROQ_API_KEY')
      if (!groqApiKey) {
        throw new Error('GROQ_API_KEY not configured')
      }

      usedModel = getGroqModel(scribe.model)
      console.log('🤖 Generating response with Groq using model:', usedModel)

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

      console.log('📤 Sending to Groq:', {
        model: usedModel,
        messageCount: groqMessages.length,
        systemPromptLength: systemPrompt.length,
        hasContext: hasContext,
        contextChunks: searchResults?.length || 0
      })

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: usedModel,
          messages: groqMessages,
          temperature: scribe.temperature || 0.7,
          max_tokens: 2000
        })
      })

      if (!groqResponse.ok) {
        const error = await groqResponse.text()
        throw new Error(`Groq API error: ${error}`)
      }

      const groqData = await groqResponse.json()
      aiResponse = groqData.choices[0]?.message?.content || ''
      tokens = groqData.usage?.total_tokens || 0

      console.log('✅ Groq response generated:', tokens, 'tokens')
    } else {
      // Use OpenAI
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      usedModel = getOpenAIModel(scribe.model)
      console.log('🤖 Generating response with OpenAI using model:', usedModel)

      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || [])
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => ({
            role: m.role,
            content: m.content
          })),
        { role: 'user', content: message }
      ]

      console.log('📤 Sending to OpenAI:', {
        model: usedModel,
        messageCount: openaiMessages.length,
        systemPromptLength: systemPrompt.length,
        hasContext: hasContext,
        contextChunks: searchResults?.length || 0
      })

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: usedModel,
          messages: openaiMessages,
          temperature: scribe.temperature || 0.7
        })
      })

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text()
        throw new Error(`OpenAI API error: ${error}`)
      }

      const openaiData = await openaiResponse.json()
      aiResponse = openaiData.choices[0]?.message?.content || ''
      tokens = openaiData.usage?.total_tokens || 0

      console.log('✅ OpenAI response generated:', tokens, 'tokens')
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
        model: usedModel
      })

    // Update scribe token count
    await supabaseClient
      .from('scribe')
      .update({
        total_tokens: (scribe.total_tokens || 0) + tokens,
        updated_at: new Date().toISOString()
      })
      .eq('id', scribeId)

    // Get document info for sources
    const sourceDocumentIds = [...new Set(searchResults?.map((r: any) => r.document_id) || [])]
    const { data: documents } = await supabaseClient
      .from('document')
      .select('id, title')
      .in('id', sourceDocumentIds)

    const sources = searchResults?.slice(0, 5).map((result: any) => {
      const doc = documents?.find((d: any) => d.id === result.document_id)
      return {
        document_id: result.document_id,
        title: doc?.title || 'Unknown',
        chunk_text: result.chunk_text.substring(0, 200) + '...',
        similarity: result.similarity
      }
    }) || []

    return new Response(
      JSON.stringify({
        message: aiResponse,
        tokens,
        contextChunks: searchResults?.length || 0,
        sources
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ RAG chat error:', error)
  return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        details: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
