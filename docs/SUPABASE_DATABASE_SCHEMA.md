# Supabase Database Schema Design

This document outlines the database design for the NabuAI Chrome Extension, including the main entities for documents, scribes, and vector embeddings for AI-powered search and retrieval.

## Database Entities Overview

```
Users (Supabase Auth)
  ↓
SCRIBE (AI conversational interface per document)
  ↓
DOCUMENT (saved content items)
  ↓
DOCUMENT_VECTOR (vector embeddings for semantic search)
  ↓
ANNOTATION (PDF highlights, notes, drawings)
  ↓
SHARE (document sharing and permissions)
```

---

## Core Tables

### 1. **DOCUMENT**
Main table for all saved content (pages, text, images, videos, PDFs).

```sql
CREATE TABLE document (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Fields
  type VARCHAR(50) NOT NULL CHECK (type IN ('page', 'text', 'image', 'video', 'pdf')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Content Fields
  content TEXT,                    -- Full text content (for pages, text, PDF extracted text)
  notes TEXT,                      -- User notes/context
  tags TEXT[],                     -- Array of tags for filtering
  
  -- Media Fields (for images/videos)
  media_url TEXT,                  -- Direct URL to media file
  media_type VARCHAR(50),          -- MIME type
  thumbnail_url TEXT,              -- Thumbnail/preview URL
  file_size BIGINT,                -- Size in bytes
  duration INTEGER,                -- For videos, duration in seconds
  
  -- Metadata Fields
  metadata JSONB DEFAULT '{}',     -- Flexible JSON for extra data (screenshot coords, device info, etc.)
  source_url TEXT,                 -- Original source URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for Performance
  CONSTRAINT document_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_document_user_id ON document(user_id);
CREATE INDEX idx_document_type ON document(type);
CREATE INDEX idx_document_created_at ON document(created_at DESC);
CREATE INDEX idx_document_tags ON document USING GIN (tags);
CREATE INDEX idx_document_fts ON document USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(notes, '')));

-- RLS (Row Level Security)
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON document
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON document
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON document
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON document
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_updated_at_trigger
  BEFORE UPDATE ON document
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();
```

**Example Data:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "auth-user-uuid",
  "type": "pdf",
  "title": "Understanding TikTok Usage Research Paper",
  "url": "https://pdfs.example.com/tiktok-usage.pdf",
  "content": "Full extracted text from PDF...",
  "notes": "Important findings about algorithmic content delivery",
  "tags": ["research", "social-media", "algorithms", "tiktok"],
  "metadata": {
    "page_count": 227,
    "author": "John Doe",
    "publisher": "Academic Press",
    "pdf_source": "external"
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 2. **SCRIBE**
AI conversational interface for documents. Each document can have one or more scribe conversations.

```sql
CREATE TABLE scribe (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Fields
  name VARCHAR(255) DEFAULT 'Untitled Conversation',
  
  -- AI Configuration
  model VARCHAR(100) DEFAULT 'gpt-4',              -- AI model used
  temperature DECIMAL(3,2) DEFAULT 0.7,            -- AI temperature
  system_prompt TEXT,                              -- Custom system prompt
  
  -- Conversation State
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,                  -- Token usage tracking
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT scribe_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT scribe_document_id_fkey FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_scribe_document_id ON scribe(document_id);
CREATE INDEX idx_scribe_user_id ON scribe(user_id);
CREATE INDEX idx_scribe_updated_at ON scribe(updated_at DESC);
-- New: assists dropdown listing performance
CREATE INDEX IF NOT EXISTS idx_scribe_user_lowername ON scribe (user_id, lower(coalesce(name, 'Untitled Conversation')));

-- RLS
ALTER TABLE scribe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scribes" ON scribe
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scribes" ON scribe
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scribes" ON scribe
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scribes" ON scribe
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER scribe_updated_at_trigger
  BEFORE UPDATE ON scribe
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();
```

**Example Data:**
```json
{
  "id": "987e6543-e89b-12d3-a456-426614174999",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "auth-user-uuid",
  "name": "Discussion on Algorithmic Content",
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "system_prompt": "You are a helpful research assistant analyzing academic papers.",
  "message_count": 12,
  "total_tokens": 8450,
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

---

### 3. **SCRIBE_MESSAGE**
Individual messages in a scribe conversation.

```sql
CREATE TABLE scribe_message (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message Fields
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- AI Metadata
  tokens INTEGER,                                  -- Token count for this message
  model VARCHAR(100),                              -- Model used for response
  
  -- Context/References
  referenced_annotations UUID[],                   -- Array of annotation IDs referenced
  referenced_document_sections INTEGER[],          -- Array of page numbers or section IDs
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT scribe_message_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT scribe_message_scribe_id_fkey FOREIGN KEY (scribe_id) REFERENCES scribe(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_scribe_message_scribe_id ON scribe_message(scribe_id);
CREATE INDEX idx_scribe_message_created_at ON scribe_message(created_at DESC);
CREATE INDEX idx_scribe_message_role ON scribe_message(role);

-- RLS
ALTER TABLE scribe_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scribe messages" ON scribe_message
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scribe messages" ON scribe_message
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scribe messages" ON scribe_message
  FOR DELETE USING (auth.uid() = user_id);
```

**Example Data:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614175111",
  "scribe_id": "987e6543-e89b-12d3-a456-426614174999",
  "user_id": "auth-user-uuid",
  "role": "user",
  "content": "Can you summarize the key findings about TikTok's algorithm?",
  "tokens": 15,
  "model": null,
  "referenced_annotations": ["ann-uuid-1", "ann-uuid-2"],
  "referenced_document_sections": [1, 2, 3],
  "created_at": "2024-01-15T14:00:00Z"
}
```

---

### 4. **DOCUMENT_VECTOR**
Vector embeddings for semantic search and retrieval-augmented generation (RAG).

```sql
CREATE TABLE document_vector (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vector Embedding
  embedding VECTOR(1536),                          -- OpenAI ada-002 embeddings (1536 dimensions)
  
  -- Content Chunk
  chunk_text TEXT NOT NULL,                        -- The text chunk being embedded
  chunk_index INTEGER NOT NULL,                    -- Order of chunk in document
  
  -- Context Metadata
  page_number INTEGER,                             -- For PDFs, which page
  section_title TEXT,                              -- Section/heading context
  word_count INTEGER,                              -- Length of chunk
  
  -- Metadata
  metadata JSONB DEFAULT '{}',                     -- Additional context (line numbers, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT document_vector_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT document_vector_document_id_fkey FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_document_vector_document_id ON document_vector(document_id);
CREATE INDEX idx_document_vector_user_id ON document_vector(user_id);
CREATE INDEX idx_document_vector_chunk_index ON document_vector(chunk_index);

-- Vector Similarity Search Index (pgvector extension required)
CREATE INDEX idx_document_vector_embedding ON document_vector USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RLS
ALTER TABLE document_vector ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document vectors" ON document_vector
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document vectors" ON document_vector
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document vectors" ON document_vector
  FOR DELETE USING (auth.uid() = user_id);
```

**Example Data:**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614175222",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "auth-user-uuid",
  "embedding": [0.123, -0.456, 0.789, ...],  // 1536 dimensional vector
  "chunk_text": "The extensive emphasis on algorithmic generation and dissemination of media is one of the most notable elements for making short videos on this platform...",
  "chunk_index": 5,
  "page_number": 1,
  "section_title": "Introduction",
  "word_count": 127,
  "metadata": {
    "line_start": 1,
    "line_end": 8,
    "paragraph_number": 3
  },
  "created_at": "2024-01-15T10:35:00Z"
}
```

---

### 5. **ANNOTATION**
PDF annotations (highlights, notes, drawings).

```sql
CREATE TABLE annotation (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Fields
  type VARCHAR(20) NOT NULL CHECK (type IN ('highlight', 'note', 'drawing')),
  
  -- Position/Geometry
  page_number INTEGER NOT NULL,
  x_coordinate DECIMAL(10,2),                     -- x position
  y_coordinate DECIMAL(10,2),                     -- y position
  width DECIMAL(10,2),                            -- width of annotation
  height DECIMAL(10,2),                           -- height of annotation
  
  -- Visual Properties
  color VARCHAR(20) DEFAULT 'yellow',             -- yellow, green, blue, red, orange
  
  -- Content
  text_content TEXT,                              -- For highlights: the selected text
  note_text TEXT,                                 -- For notes: the note content
  
  -- Drawing Data
  drawing_path JSONB,                             -- Array of {x, y} coordinates for drawings
  stroke_width DECIMAL(4,2) DEFAULT 2.0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT annotation_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT annotation_document_id_fkey FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_annotation_document_id ON annotation(document_id);
CREATE INDEX idx_annotation_user_id ON annotation(user_id);
CREATE INDEX idx_annotation_page_number ON annotation(document_id, page_number);
CREATE INDEX idx_annotation_type ON annotation(type);

-- RLS
ALTER TABLE annotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own annotations" ON annotation
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own annotations" ON annotation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" ON annotation
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" ON annotation
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER annotation_updated_at_trigger
  BEFORE UPDATE ON annotation
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();
```

**Example Data:**
```json
{
  "id": "ann-uuid-1",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "auth-user-uuid",
  "type": "highlight",
  "page_number": 1,
  "x_coordinate": 260.79,
  "y_coordinate": 628.40,
  "width": 200.0,
  "height": 20.0,
  "color": "yellow",
  "text_content": "Understanding TikTok Usage",
  "created_at": "2024-01-15T11:30:00Z"
}
```

---

### 6. **SHARE**
Document sharing and collaboration.

```sql
CREATE TABLE share (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Share Configuration
  share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('user', 'link', 'public')),
  share_token VARCHAR(255) UNIQUE,                -- For link-based sharing
  
  -- Permissions
  can_view BOOLEAN DEFAULT true,
  can_annotate BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT true,
  can_scribe BOOLEAN DEFAULT false,
  
  -- Access Control
  expires_at TIMESTAMP WITH TIME ZONE,            -- Optional expiration
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT share_document_id_fkey FOREIGN KEY (document_id) REFERENCES document(id) ON DELETE CASCADE,
  CONSTRAINT share_shared_by_fkey FOREIGN KEY (shared_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT share_shared_with_fkey FOREIGN KEY (shared_with_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_share_document_id ON share(document_id);
CREATE INDEX idx_share_shared_by ON share(shared_by_user_id);
CREATE INDEX idx_share_shared_with ON share(shared_with_user_id);
CREATE INDEX idx_share_token ON share(share_token);

-- RLS
ALTER TABLE share ENABLE ROW LEVEL SECURITY;

-- Viewers can view shared documents
CREATE POLICY "Users can view documents shared with them" ON document
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM share
      WHERE share.document_id = document.id
      AND share.shared_with_user_id = auth.uid()
    )
  );
```

---

## Required Extensions

```sql
-- Enable vector similarity search (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## Database Functions
### 0. Scribe Listing Helpers

```sql
-- View exposing one row per (user, scribe name), choosing latest updated scribe
CREATE OR REPLACE VIEW user_scribes_distinct AS
SELECT DISTINCT ON (s.user_id, lower(coalesce(s.name, 'Untitled Conversation')))
  s.user_id,
  coalesce(s.name, 'Untitled Conversation') AS name,
  s.id AS scribe_id,
  s.updated_at
FROM scribe s
ORDER BY s.user_id, lower(coalesce(s.name, 'Untitled Conversation')), s.updated_at DESC;
```

Use this view to power a dropdown of scribes per user without duplicates by name.


### 1. Semantic Search Function

```sql
CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  user_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  page_number INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dv.id,
    dv.document_id,
    dv.chunk_text,
    1 - (dv.embedding <=> query_embedding) as similarity,
    dv.page_number
  FROM document_vector dv
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 2. Get Document Stats

```sql
CREATE OR REPLACE FUNCTION get_document_stats(p_document_id UUID)
RETURNS TABLE (
  total_annotations INT,
  total_scribes INT,
  total_vector_chunks INT,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT a.id)::INT as total_annotations,
    COUNT(DISTINCT s.id)::INT as total_scribes,
    COUNT(DISTINCT dv.id)::INT as total_vector_chunks,
    MAX(GREATEST(d.updated_at, 
                 COALESCE((SELECT MAX(created_at) FROM annotation WHERE document_id = p_document_id), '1970-01-01'),
                 COALESCE((SELECT MAX(updated_at) FROM scribe WHERE document_id = p_document_id), '1970-01-01')
    )) as last_updated
  FROM document d
  LEFT JOIN annotation a ON a.document_id = d.id
  LEFT JOIN scribe s ON s.document_id = d.id
  LEFT JOIN document_vector dv ON dv.document_id = d.id
  WHERE d.id = p_document_id
  GROUP BY d.id;
END;
$$;
```

---

## Data Flow & Relationships

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
└────────┬────────┘
         │
         ├─────────────────────────────────────────┐
         │                                         │
         ↓                                         ↓
┌─────────────────┐                       ┌─────────────────┐
│   DOCUMENT      │                       │    SCRIBE       │
│                 │                       │                 │
│ - id            │◄──────────────────────│ - document_id   │
│ - user_id       │                       │ - user_id       │
│ - type          │                       │ - name          │
│ - title         │                       │ - messages      │
│ - content       │                       │ - model         │
│ - notes         │                       │                 │
│ - tags[]        │                       └────────┬────────┘
│ - url           │                                │
└────────┬────────┘                                │
         │                                         │
         ├────────────────┐                        │
         │                │                        │
         ↓                ↓                        ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ DOCUMENT_VECTOR │  │  ANNOTATION     │  │ SCRIBE_MESSAGE  │
│                 │  │                 │  │                 │
│ - document_id   │  │ - document_id   │  │ - scribe_id     │
│ - embedding[]   │  │ - type          │  │ - role          │
│ - chunk_text    │  │ - page_number   │  │ - content       │
│ - chunk_index   │  │ - text_content  │  │ - tokens        │
│ - page_number   │  │ - color         │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Migration Order

1. Enable extensions (`vector`, `pg_trgm`)
2. Create `document` table
3. Create `document_vector` table
4. Create `annotation` table
5. Create `scribe` table
6. Create `scribe_message` table
7. Create `share` table (optional)
8. Create indexes
9. Enable RLS policies
10. Create functions

---

## Next Steps

1. **Run these migrations** in your Supabase SQL editor
2. **Generate embeddings** when documents are saved
3. **Implement RAG** in the scribe interface
4. **Add full-text search** for hybrid search (semantic + keyword)
5. **Implement sharing** features

For more details, see the individual table comments and example data structures above.

