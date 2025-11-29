import { supabase } from './supabase'
import type {
  Document,
  Annotation,
  Scribe,
  ScribeMessage,
  DocumentVector,
  Share,
  CreateDocumentInput,
  CreateAnnotationInput,
  CreateScribeInput,
  CreateScribeMessageInput,
  CreateDocumentVectorInput,
  CreateShareInput,
  SemanticSearchResult,
  DocumentStats,
  ContentStats,
  HybridSearchResult
} from './types'

export class DatabaseService {
  // Cache for current user to avoid repeated auth requests
  private userCache: { user: any; timestamp: number } | null = null
  private readonly CACHE_TTL = 60000 // 1 minute cache

  // Get current user with caching
  private async getCurrentUserCached() {
    // Check cache first
    if (this.userCache && Date.now() - this.userCache.timestamp < this.CACHE_TTL) {
      return this.userCache.user
    }

    // Try session first (faster, no network request)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      this.userCache = { user: session.user, timestamp: Date.now() }
      return session.user
    }

    // Fallback to getUser if no session
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      this.userCache = { user, timestamp: Date.now() }
      return user
    }

    return null
  }

  // Clear user cache (call on logout or auth errors)
  clearUserCache() {
    this.userCache = null
  }

  // ==================== DOCUMENT OPERATIONS ====================

  async saveDocument(input: CreateDocumentInput): Promise<Document> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')


    console.log('🔍 Saving document:', input, user)
    const { data, error } = await supabase
      .from('document')
      .insert({ user_id: user.id, ...input })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getDocuments(userId?: string): Promise<Document[]> {
    const user = await this.getCurrentUserCached()
    const targetUserId = userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getDocumentsByScribe(scribeId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('scribe_id', scribeId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getDocumentById(documentId: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }

  async updateDocument(documentId: string, updates: Partial<CreateDocumentInput>): Promise<Document> {
    const { data, error } = await supabase
      .from('document')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('document')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('document')
      .select('*')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,notes.ilike.%${query}%,url.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ==================== ANNOTATION OPERATIONS ====================

  async saveAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('annotation')
      .insert({
        user_id: user.id,
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAnnotationsByDocument(documentId: string): Promise<Annotation[]> {
    const { data, error } = await supabase
      .from('annotation')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    const { error } = await supabase
      .from('annotation')
      .delete()
      .eq('id', annotationId)

    if (error) throw error
  }

  // ==================== SCRIBE OPERATIONS ====================

  async createScribe(input: CreateScribeInput): Promise<Scribe> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const targetName = (input.name || 'Untitled Conversation').trim()

    // Check for existing scribe by case-insensitive name for this user
    const { data: existingList, error: existingError } = await supabase
      .from('scribe')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', targetName)
      .limit(1)

    if (existingError) throw existingError

    const existing = existingList && existingList[0]
    if (existing) {
      // Attach to document if provided, then return existing
      if (input.document_id) {
        try {
          await supabase
            .from('document')
            .update({ scribe_id: existing.id } as any)
            .eq('id', input.document_id)
            .select()
            .single()
        } catch (_) {}
      }
      return existing
    }

    const { data, error } = await supabase
      .from('scribe')
      .insert({
        user_id: user.id,
        name: targetName,
        model: input.model || 'gpt-4',
        temperature: input.temperature || 0.7,
        system_prompt: input.system_prompt
      })
      .select()
      .single()

    if (error) throw error

    // If a document_id was provided attach to document
    if (input.document_id && data?.id) {
      try {
        await supabase
          .from('document')
          .update({ scribe_id: data.id } as any)
          .eq('id', input.document_id)
          .select()
          .single()
      } catch (_) {}
    }

    return data
  }

  async getScribesByDocument(documentId: string): Promise<Scribe[]> {
    const { data, error } = await supabase
      .from('scribe')
      .select('*')
      .eq('document_id', documentId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getUserScribes(userId?: string): Promise<Scribe[]> {
    const user = await this.getCurrentUserCached()
    const targetUserId = userId || user?.id
    if (!targetUserId) throw new Error('Not authenticated')

    // Get scribes owned by the user
    const { data: ownedScribes, error: ownedError } = await supabase
      .from('scribe')
      .select('*')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false })

    if (ownedError) throw ownedError

    // Get scribes shared with the user (metadata only)
    const { data: sharedScribesMeta, error: sharedMetaError } = await supabase
      .from('scribe_share')
      .select('scribe_id, shared_by_user_id, can_edit')
      .eq('shared_with_user_id', targetUserId)
      .eq('can_view', true)

    if (sharedMetaError) {
      console.error('Error fetching shared scribes metadata:', sharedMetaError)
    }

    const owned = (ownedScribes || []).map(s => ({ ...s, is_shared: false }))

    let shared: Scribe[] = []

    if (sharedScribesMeta && sharedScribesMeta.length > 0) {
      const uniqueSharedIds = Array.from(
        new Set(sharedScribesMeta.map(item => item.scribe_id).filter(Boolean))
      ) as string[]

      if (uniqueSharedIds.length > 0) {
        // Fetch the actual scribe records
        const { data: sharedScribeRecords, error: sharedScribesError } = await supabase
          .from('scribe')
          .select('*')
          .in('id', uniqueSharedIds)

        if (sharedScribesError) {
          console.error('Error fetching shared scribes:', sharedScribesError)
        } else if (sharedScribeRecords) {
          const metaMap = new Map(
            sharedScribesMeta
              .filter(item => item.scribe_id)
              .map(item => [item.scribe_id as string, item])
          )

          shared = await Promise.all(
            sharedScribeRecords.map(async (scribeRecord) => {
              const meta = metaMap.get(scribeRecord.id)
              let ownerEmail: string | undefined

              if (meta?.shared_by_user_id) {
                try {
                  const { data: email } = await supabase.rpc('get_user_email_by_id', {
                    user_id: meta.shared_by_user_id
                  })
                  if (email) ownerEmail = email as string
                } catch (e) {
                  console.debug('Could not fetch owner email:', e)
                }
              }

              return {
                ...scribeRecord,
                is_shared: true,
                shared_by_user_id: meta?.shared_by_user_id,
                shared_by_user_email: ownerEmail,
                can_edit: meta?.can_edit || false
              }
            })
          )
        }
      }
    }

    // Combine and sort by updated_at
    const allScribes = [...owned, ...shared].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime()
      const dateB = new Date(b.updated_at || b.created_at).getTime()
      return dateB - dateA
    })

    return allScribes
  }

  async getScribeById(scribeId: string): Promise<Scribe | null> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    // Get the scribe (RLS policy will allow if owned or shared)
    const { data: scribe, error } = await supabase
      .from('scribe')
      .select('*')
      .eq('id', scribeId)
      .single()

    if (error) {
      if ((error as any).code === 'PGRST116') return null
      throw error
    }

    if (!scribe) return null

    // Check if this is a shared scribe (not owned by current user)
    if (scribe.user_id !== user.id) {
      // Get share information
      const { data: share } = await supabase
        .from('scribe_share')
        .select('shared_by_user_id, can_edit')
        .eq('scribe_id', scribeId)
        .eq('shared_with_user_id', user.id)
        .eq('can_view', true)
        .maybeSingle()

      if (share) {
        // Try to get owner email (optional - don't fail if it doesn't work)
        let ownerEmail: string | undefined
        try {
          const { data: ownerData } = await supabase.rpc('get_user_by_email', {
            user_email: '' // We can't get email from ID easily, skip for now
          })
          // For now, we'll skip getting the email as it requires another lookup
        } catch (e) {
          // Ignore errors getting owner email
        }

        return {
          ...scribe,
          is_shared: true,
          shared_by_user_id: share.shared_by_user_id,
          can_edit: share.can_edit || false
        }
      } else {
        // Not shared and not owned - return null
        return null
      }
    }

    return { ...scribe, is_shared: false }
  }

  async updateScribe(scribeId: string, updates: Partial<CreateScribeInput>): Promise<Scribe> {
    const { data, error } = await supabase
      .from('scribe')
      .update(updates)
      .eq('id', scribeId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteScribe(scribeId: string): Promise<void> {
    const { error } = await supabase
      .from('scribe')
      .delete()
      .eq('id', scribeId)

    if (error) throw error
  }

  async getLastAssistantMessage(scribeId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('scribe_message')
      .select('content')
      .eq('scribe_id', scribeId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('Failed to fetch last assistant message:', error)
      return null
    }

    return data?.content || null
  }

  // ==================== SCRIBE MESSAGE OPERATIONS ====================

  async saveScribeMessage(input: CreateScribeMessageInput): Promise<ScribeMessage> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('scribe_message')
      .insert({
        user_id: user.id,
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getScribeMessages(scribeId: string): Promise<ScribeMessage[]> {
    const { data, error } = await supabase
      .from('scribe_message')
      .select('*')
      .eq('scribe_id', scribeId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // ==================== DOCUMENT VECTOR OPERATIONS ====================

  async saveDocumentVector(input: CreateDocumentVectorInput): Promise<DocumentVector> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('document_vector')
      .insert({
        user_id: user.id,
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getDocumentVectorsByDocument(documentId: string): Promise<DocumentVector[]> {
    const { data, error } = await supabase
      .from('document_vector')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })

    if (error) throw error
    return data || []
  }

  // ==================== SEMANTIC SEARCH ====================

  async semanticSearch(
    queryEmbedding: number[],
    matchThreshold: number = 0.7,
    matchCount: number = 10
  ): Promise<SemanticSearchResult[]> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .rpc('search_documents_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        user_filter: user.id
      })

    if (error) throw error
    return data || []
  }

  async hybridSearch(
    queryText: string,
    queryEmbedding: number[],
    matchCount: number = 20
  ): Promise<HybridSearchResult[]> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .rpc('search_documents_hybrid', {
        query_text: queryText,
        query_embedding: queryEmbedding,
        user_filter: user.id,
        match_count: matchCount
      })

    if (error) throw error
    return data || []
  }

  // ==================== STATISTICS ====================

  async getDocumentStats(documentId: string): Promise<DocumentStats | null> {
    const { data, error } = await supabase
      .rpc('get_document_stats', {
        p_document_id: documentId
      })

    if (error) throw error
    return data?.[0] || null
  }

  async getUserContentStats(userId?: string): Promise<ContentStats[]> {
    const user = await this.getCurrentUserCached()
    const targetUserId = userId || user?.id

    if (!targetUserId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .rpc('get_user_content_stats', {
        p_user_id: targetUserId
      })

    if (error) throw error
    return data || []
  }

  // ==================== SHARE OPERATIONS ====================

  async createShare(input: CreateShareInput): Promise<Share> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('share')
      .insert({
        shared_by_user_id: user.id,
        document_id: input.document_id,
        share_type: input.share_type,
        shared_with_user_id: input.shared_with_user_id,
        can_view: input.can_view ?? true,
        can_annotate: input.can_annotate ?? false,
        can_comment: input.can_comment ?? true,
        can_scribe: input.can_scribe ?? false,
        expires_at: input.expires_at
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getSharesByDocument(documentId: string): Promise<Share[]> {
    const { data, error } = await supabase
      .from('share')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async deleteShare(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('share')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  }

  // ==================== SCRIBE SHARE OPERATIONS ====================

  // Share scribe with a user by email
  async shareScribe(scribeId: string, email: string): Promise<void> {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    // Check if scribe exists and belongs to current user
    const { data: scribe, error: scribeError } = await supabase
      .from('scribe')
      .select('id, user_id')
      .eq('id', scribeId)
      .single()

    if (scribeError || !scribe) {
      throw new Error('Scribe not found')
    }

    if (scribe.user_id !== user.id) {
      throw new Error('You can only share scribes you own')
    }

    // Find user by email using the database function
    const { data: sharedUserData, error: userError } = await supabase.rpc('get_user_by_email', {
      user_email: email.toLowerCase().trim()
    })

    if (userError) {
      console.error('Error finding user:', userError)
      console.error('Error details:', JSON.stringify(userError, null, 2))
      throw new Error(`Failed to find user: ${userError.message || 'Unknown error'}`)
    }

    // Handle different response formats
    let sharedUser: any = null
    
    if (sharedUserData === null || sharedUserData === undefined) {
      throw new Error(`User with email ${email} not found. Please make sure they have registered an account.`)
    }

    // The function returns a JSON object - Supabase may return it as a string or object
    if (typeof sharedUserData === 'string') {
      try {
        sharedUser = JSON.parse(sharedUserData)
      } catch (parseError) {
        console.error('Error parsing user data:', parseError)
        throw new Error(`Invalid response from server. Please try again.`)
      }
    } else if (typeof sharedUserData === 'object') {
      sharedUser = sharedUserData
    } else {
      console.error('Unexpected user data format:', typeof sharedUserData, sharedUserData)
      throw new Error(`Invalid response format. Please try again.`)
    }

    if (!sharedUser || !sharedUser.id || !sharedUser.email) {
      console.error('Invalid user data structure:', sharedUser)
      throw new Error(`User with email ${email} not found. Please make sure they have registered an account.`)
    }

    // Don't allow sharing with yourself
    if (sharedUser.id === user.id) {
      throw new Error('You cannot share a scribe with yourself')
    }

    // Check if share already exists
    const { data: existingShare } = await supabase
      .from('scribe_share')
      .select('id')
      .eq('scribe_id', scribeId)
      .eq('shared_with_user_id', sharedUser.id)
      .maybeSingle()

    if (existingShare) {
      throw new Error('Scribe is already shared with this user')
    }

    // Create the share
    console.log('Creating share:', {
      scribe_id: scribeId,
      shared_by_user_id: user.id,
      shared_with_user_id: sharedUser.id,
      can_view: true,
      can_edit: false
    })
    
    const { data: shareData, error: shareError } = await supabase
      .from('scribe_share')
      .insert({
        scribe_id: scribeId,
        shared_by_user_id: user.id,
        shared_with_user_id: sharedUser.id,
        can_view: true,
        can_edit: false
      })
      .select()
      .single()

    if (shareError) {
      console.error('Share error:', shareError)
      console.error('Share error details:', JSON.stringify(shareError, null, 2))
      
      if (shareError.code === '23505') { // Unique constraint violation
        throw new Error('Scribe is already shared with this user')
      }
      
      if (shareError.code === '42501') { // Insufficient privilege (RLS)
        throw new Error('Permission denied. You may not have permission to share this scribe.')
      }
      
      if (shareError.code === '23503') { // Foreign key violation
        throw new Error('Invalid user or scribe. Please refresh and try again.')
      }
      
      throw new Error(shareError.message || 'Failed to share scribe')
    }
    
    if (!shareData) {
      throw new Error('Share was created but no data was returned. Please refresh to verify.')
    }
    
    console.log('✅ Share created successfully:', shareData)
  }

  // Get shares for a scribe
  async getScribeShares(scribeId: string) {
    const user = await this.getCurrentUserCached()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('scribe_share')
      .select(`
        id,
        shared_with_user_id,
        can_view,
        can_edit,
        created_at,
        shared_with_user:shared_with_user_id (
          id,
          email
        )
      `)
      .eq('scribe_id', scribeId)
      .eq('shared_by_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()

