// Database entity types matching Supabase schema

export type DocumentType = 'page' | 'text' | 'image' | 'video' | 'pdf'
export type AnnotationType = 'highlight' | 'note' | 'drawing'
export type ShareType = 'user' | 'link' | 'public'
export type ScribeRole = 'user' | 'assistant' | 'system'
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'red' | 'orange'

export interface Document {
  id: string
  user_id: string
  type: DocumentType
  title: string
  url: string
  content?: string
  notes?: string
  tags: string[]
  storage_object_path?: string
  media_url?: string
  media_type?: string
  thumbnail_url?: string
  file_size?: number
  duration?: number
  metadata?: Record<string, any>
  source_url?: string
  created_at: string
  updated_at: string
}

export interface Annotation {
  id: string
  document_id: string
  user_id: string
  type: AnnotationType
  page_number: number
  x_coordinate?: number
  y_coordinate?: number
  width?: number
  height?: number
  color: AnnotationColor | string
  text_content?: string
  note_text?: string
  drawing_path?: Array<{ x: number; y: number }>
  stroke_width?: number
  created_at: string
  updated_at: string
}

export interface Scribe {
  id: string
  document_id?: string
  user_id: string
  name: string
  model: string
  temperature: number
  system_prompt?: string
  editor_content?: string
  message_count: number
  total_tokens: number
  created_at: string
  updated_at: string
  // Share information (if scribe is shared)
  is_shared?: boolean
  shared_by_user_id?: string
  shared_by_user_email?: string
  can_edit?: boolean
}

export interface ScribeMessage {
  id: string
  scribe_id: string
  user_id: string
  role: ScribeRole
  content: string
  tokens?: number
  model?: string
  referenced_annotations?: string[]
  referenced_document_sections?: number[]
  created_at: string
}

export interface DocumentVector {
  id: string
  document_id: string
  user_id: string
  embedding?: number[] // 1536 dimensions for OpenAI ada-002
  chunk_text: string
  chunk_index: number
  page_number?: number
  section_title?: string
  word_count?: number
  metadata?: Record<string, any>
  created_at: string
}

export interface Share {
  id: string
  document_id: string
  shared_by_user_id: string
  shared_with_user_id?: string
  share_type: ShareType
  share_token?: string
  can_view: boolean
  can_annotate: boolean
  can_comment: boolean
  can_scribe: boolean
  expires_at?: string
  created_at: string
}

// Search and query result types
export interface SemanticSearchResult {
  id: string
  document_id: string
  chunk_text: string
  similarity: number
  page_number: number
  section_title?: string
  chunk_index: number
}

export interface DocumentStats {
  total_annotations: number
  total_scribes: number
  total_vector_chunks: number
  last_updated: string
}

export interface ContentStats {
  content_type: string
  count: number
  total_size: number
}

export interface HybridSearchResult {
  id: string
  title: string
  type: string
  url: string
  notes?: string
  tags: string[]
  created_at: string
  semantic_rank: number
  text_rank: number
  combined_score: number
}

// Input types (for creating entities)
export interface CreateDocumentInput {
  type: DocumentType
  title: string
  url: string
  content?: string
  notes?: string
  tags: string[]
  scribe_id?: string // Optional: link to existing scribe
  storage_object_path?: string
  media_url?: string
  media_type?: string
  thumbnail_url?: string
  file_size?: number
  duration?: number
  metadata?: Record<string, any>
  source_url?: string
}

export interface CreateAnnotationInput {
  document_id: string
  type: AnnotationType
  page_number: number
  x_coordinate?: number
  y_coordinate?: number
  width?: number
  height?: number
  color?: AnnotationColor | string
  text_content?: string
  note_text?: string
  drawing_path?: Array<{ x: number; y: number }>
  stroke_width?: number
}

export interface CreateScribeInput {
  document_id?: string
  name?: string
  model?: string
  temperature?: number
  system_prompt?: string
  editor_content?: string
}

export interface CreateScribeMessageInput {
  scribe_id: string
  role: ScribeRole
  content: string
  tokens?: number
  model?: string
  referenced_annotations?: string[]
  referenced_document_sections?: number[]
}

export interface CreateDocumentVectorInput {
  document_id: string
  chunk_text: string
  chunk_index: number
  embedding?: number[]
  page_number?: number
  section_title?: string
  word_count?: number
  metadata?: Record<string, any>
}

export interface CreateShareInput {
  document_id: string
  share_type: ShareType
  shared_with_user_id?: string
  can_view?: boolean
  can_annotate?: boolean
  can_comment?: boolean
  can_scribe?: boolean
  expires_at?: string
}

export interface ScribeShare {
  id: string
  scribe_id: string
  shared_by_user_id: string
  shared_with_user_id: string
  can_view: boolean
  can_edit: boolean
  created_at: string
  updated_at: string
}

