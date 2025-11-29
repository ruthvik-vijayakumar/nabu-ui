// Utility to verify and inspect document vectors
import { databaseService } from './database'
import { supabase } from './supabase'

export interface VectorStats {
  documentId: string
  totalVectors: number
  totalChunks: number
  averageChunkSize: number
  totalWords: number
  hasEmbeddings: boolean
  sampleChunk?: {
    index: number
    text: string
    wordCount: number
  }
}

/**
 * Get statistics about vectors for a document
 */
export async function getDocumentVectorStats(documentId: string): Promise<VectorStats | null> {
  try {
    const vectors = await databaseService.getDocumentVectorsByDocument(documentId)
    
    if (vectors.length === 0) {
      return null
    }

    const totalWords = vectors.reduce((sum, v) => sum + (v.word_count || 0), 0)
    const totalChars = vectors.reduce((sum, v) => sum + (v.chunk_text.length), 0)
    const hasEmbeddings = vectors.some(v => v.embedding && Array.isArray(v.embedding) && v.embedding.length > 0)

    return {
      documentId,
      totalVectors: vectors.length,
      totalChunks: vectors.length,
      averageChunkSize: Math.round(totalChars / vectors.length),
      totalWords,
      hasEmbeddings,
      sampleChunk: vectors[0] ? {
        index: vectors[0].chunk_index,
        text: vectors[0].chunk_text.substring(0, 200) + '...',
        wordCount: vectors[0].word_count || 0
      } : undefined
    }
  } catch (error) {
    console.error('❌ Error getting vector stats:', error)
    return null
  }
}

/**
 * Verify vectors exist for a document
 */
export async function verifyDocumentVectors(documentId: string): Promise<boolean> {
  try {
    const vectors = await databaseService.getDocumentVectorsByDocument(documentId)
    return vectors.length > 0
  } catch (error) {
    console.error('❌ Error verifying vectors:', error)
    return false
  }
}

/**
 * Get all vector counts for user's documents
 */
export async function getUserVectorStats(): Promise<{
  totalDocuments: number
  documentsWithVectors: number
  totalVectors: number
  averageVectorsPerDocument: number
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get all documents
    const documents = await databaseService.getDocuments()
    
    // Count vectors for each document
    let documentsWithVectors = 0
    let totalVectors = 0

    for (const doc of documents) {
      const vectors = await databaseService.getDocumentVectorsByDocument(doc.id)
      if (vectors.length > 0) {
        documentsWithVectors++
        totalVectors += vectors.length
      }
    }

    return {
      totalDocuments: documents.length,
      documentsWithVectors,
      totalVectors,
      averageVectorsPerDocument: documentsWithVectors > 0 
        ? Math.round(totalVectors / documentsWithVectors) 
        : 0
    }
  } catch (error) {
    console.error('❌ Error getting user vector stats:', error)
    throw error
  }
}

/**
 * Check if edge function processed a document
 */
export async function checkDocumentProcessingStatus(documentId: string): Promise<{
  hasVectors: boolean
  vectorCount: number
  lastProcessed?: string
}> {
  try {
    const vectors = await databaseService.getDocumentVectorsByDocument(documentId)
    
    if (vectors.length === 0) {
      return {
        hasVectors: false,
        vectorCount: 0
      }
    }

    // Get the most recent vector creation time
    const lastProcessed = vectors
      .map(v => v.created_at)
      .sort()
      .reverse()[0]

    return {
      hasVectors: true,
      vectorCount: vectors.length,
      lastProcessed
    }
  } catch (error) {
    console.error('❌ Error checking processing status:', error)
    return {
      hasVectors: false,
      vectorCount: 0
    }
  }
}

