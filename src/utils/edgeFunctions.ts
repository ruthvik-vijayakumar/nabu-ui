// Edge Functions service for calling Supabase Edge Functions
import { supabase } from './supabase'
import { databaseService } from './database'

export interface ProcessDocumentResponse {
  message: string
  chunksProcessed?: number
  error?: string
}

export interface ProcessImageResponse {
  message: string
  chunksProcessed?: number
  extractedTextLength?: number
  error?: string
}

export interface RAGChatResponse {
  message: string
  tokens?: number
  contextChunks?: number
  sources?: Array<{
    document_id: string
    title: string
    chunk_text: string
    similarity: number
  }>
  error?: string
}

export class EdgeFunctionService {
  /**
   * Process a document: chunk it and generate embeddings
   * This should be called after saving a document
   */
  async processDocument(documentId: string): Promise<ProcessDocumentResponse> {
    try {
      console.log('🔄 EdgeFunctionService: Processing document for vector storage:', documentId)
      
      // Check if supabase.functions is available
      if (!supabase.functions) {
        throw new Error('Supabase functions not available. Make sure you are using a recent version of @supabase/supabase-js')
      }
      
      console.log('📡 EdgeFunctionService: Invoking process-document edge function...')
      
      let response: any
      let error: any
      
      try {
        const result = await supabase.functions.invoke('process-document', {
          body: { documentId }
        })
        response = result
        error = result.error
      } catch (invokeError: any) {
        console.error('❌ EdgeFunctionService: Invoke threw exception:', invokeError)
        error = invokeError
      }

      console.log('📡 EdgeFunctionService: Edge function response:', { 
        data: response?.data, 
        error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorContext: error?.context,
        errorStatus: error?.status,
        errorStatusText: error?.statusText
      })

      if (error) {
        console.error('❌ EdgeFunctionService: Error from edge function:', error)
        console.error('❌ EdgeFunctionService: Error details:', {
          message: error.message,
          name: error.name,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack,
          context: error.context,
          error: error
        })
        
        // Try to extract response body if available
        if (error.context?.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body
            console.error('❌ EdgeFunctionService: Error response body:', errorBody)
          } catch (e) {
            console.error('❌ EdgeFunctionService: Error response body (raw):', error.context.body)
          }
        }
        
        // Check if it's an HTTP error with status code
        if (error.message?.includes('non-2xx') || error.status) {
          console.error(`❌ EdgeFunctionService: Edge function returned error status ${error.status || 'non-2xx'}. Check edge function logs in Supabase Dashboard.`)
          console.error('❌ EdgeFunctionService: Common causes:')
          console.error('   - Missing OPENAI_API_KEY secret')
          console.error('   - Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
          console.error('   - Document not found or no content')
          console.error('   - Database permission issues')
        }
        
        throw error
      }
      
      const data = response?.data

      if (!data) {
        throw new Error('No data returned from edge function')
      }

      const result = data as ProcessDocumentResponse
      console.log('✅ EdgeFunctionService: Document processed successfully:', result)
      
      // Verify vectors were stored
      if (result.chunksProcessed && result.chunksProcessed > 0) {
        console.log(`📊 EdgeFunctionService: Stored ${result.chunksProcessed} vectors in document_vector table`)
        
        // Check vectors in database (optional verification)
        try {
          const vectors = await databaseService.getDocumentVectorsByDocument(documentId)
          console.log(`✅ EdgeFunctionService: Verified ${vectors.length} vectors found in database for document ${documentId}`)
        } catch (verifyError) {
          console.warn('⚠️ EdgeFunctionService: Could not verify vectors:', verifyError)
        }
      } else {
        console.warn('⚠️ EdgeFunctionService: No chunks were processed:', result)
      }
      
      return result
    } catch (error: any) {
      console.error('❌ EdgeFunctionService: Failed to process document:', error)
      console.error('❌ EdgeFunctionService: Full error:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        error: error
      })
      return {
        message: 'Failed to process document',
        error: error?.message || 'Unknown error'
      }
    }
  }

  /**
   * Send a RAG chat message
   * Retrieves relevant context and generates AI response
   */
  async sendRAGMessage(
    scribeId: string,
    userMessage: string,
    options?: {
      matchThreshold?: number
      matchCount?: number
      model?: string
    }
  ): Promise<RAGChatResponse> {
    try {
      console.log('💬 Sending RAG message:', { scribeId, userMessage })
      
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: {
          scribeId,
          message: userMessage,
          matchThreshold: options?.matchThreshold || 0.7,
          matchCount: options?.matchCount || 10,
          model: options?.model || 'llama-3.1-70b-versatile'
        }
      })

      if (error) {
        console.error('❌ Error in RAG chat:', error)
        throw error
      }

      console.log('✅ RAG response received:', data)
      return data as RAGChatResponse
    } catch (error: any) {
      console.error('❌ Failed to send RAG message:', error)
      return {
        message: 'Failed to generate response',
        error: error.message || 'Unknown error'
      }
    }
  }

  /**
   * Process an image: extract text/diagrams using Vision API, then generate embeddings
   * This should be called after saving an image document
   */
  async processImage(documentId: string): Promise<ProcessImageResponse> {
    try {
      console.log('🖼️ EdgeFunctionService: Processing image for vector storage:', documentId)
      
      if (!supabase.functions) {
        throw new Error('Supabase functions not available')
      }
      
      console.log('📡 EdgeFunctionService: Invoking process-image edge function...')
      
      const result = await supabase.functions.invoke('process-image', {
        body: { documentId }
      })

      if (result.error) {
        console.error('❌ EdgeFunctionService: Error from process-image:', result.error)
        throw result.error
      }

      const data = result.data as ProcessImageResponse
      console.log('✅ EdgeFunctionService: Image processed successfully:', data)
      
      return data
    } catch (error: any) {
      console.error('❌ EdgeFunctionService: Failed to process image:', error)
      return {
        message: 'Failed to process image',
        error: error?.message || 'Unknown error'
      }
    }
  }

  /**
   * Generate embeddings for a text
   * Utility function for generating embeddings
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log('🔢 Generating embeddings for', texts.length, 'texts')
      
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { texts }
      })

      if (error) {
        console.error('❌ Error generating embeddings:', error)
        throw error
      }

      return data.embeddings as number[][]
    } catch (error: any) {
      console.error('❌ Failed to generate embeddings:', error)
      throw error
    }
  }
}

export const edgeFunctionService = new EdgeFunctionService()

