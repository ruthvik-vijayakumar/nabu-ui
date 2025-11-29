-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create DOCUMENT table
CREATE TABLE document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('page', 'text', 'image', 'video', 'pdf')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT,
  notes TEXT,
  tags TEXT[],
  media_url TEXT,
  media_type VARCHAR(50),
  thumbnail_url TEXT,
  file_size BIGINT,
  duration INTEGER,
  metadata JSONB DEFAULT '{}',
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for DOCUMENT
CREATE INDEX idx_document_user_id ON document(user_id);
CREATE INDEX idx_document_type ON document(type);
CREATE INDEX idx_document_created_at ON document(created_at DESC);
CREATE INDEX idx_document_tags ON document USING GIN (tags);
CREATE INDEX idx_document_fts ON document USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '') || ' ' || COALESCE(notes, '')));

-- RLS for DOCUMENT
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON document
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON document
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON document
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON document
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for DOCUMENT
CREATE TRIGGER document_updated_at_trigger
  BEFORE UPDATE ON document
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create ANNOTATION table
CREATE TABLE annotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('highlight', 'note', 'drawing')),
  page_number INTEGER NOT NULL,
  x_coordinate DECIMAL(10,2),
  y_coordinate DECIMAL(10,2),
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  color VARCHAR(20) DEFAULT 'yellow',
  text_content TEXT,
  note_text TEXT,
  drawing_path JSONB,
  stroke_width DECIMAL(4,2) DEFAULT 2.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ANNOTATION
CREATE INDEX idx_annotation_document_id ON annotation(document_id);
CREATE INDEX idx_annotation_user_id ON annotation(user_id);
CREATE INDEX idx_annotation_page_number ON annotation(document_id, page_number);
CREATE INDEX idx_annotation_type ON annotation(type);

-- RLS for ANNOTATION
ALTER TABLE annotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own annotations" ON annotation
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own annotations" ON annotation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations" ON annotation
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations" ON annotation
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for ANNOTATION
CREATE TRIGGER annotation_updated_at_trigger
  BEFORE UPDATE ON annotation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create SCRIBE table
CREATE TABLE scribe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Untitled Conversation',
  model VARCHAR(100) DEFAULT 'gpt-4',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  system_prompt TEXT,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SCRIBE
CREATE INDEX idx_scribe_document_id ON scribe(document_id);
CREATE INDEX idx_scribe_user_id ON scribe(user_id);
CREATE INDEX idx_scribe_updated_at ON scribe(updated_at DESC);

-- RLS for SCRIBE
ALTER TABLE scribe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scribes" ON scribe
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scribes" ON scribe
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scribes" ON scribe
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scribes" ON scribe
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for SCRIBE
CREATE TRIGGER scribe_updated_at_trigger
  BEFORE UPDATE ON scribe
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create SCRIBE_MESSAGE table
CREATE TABLE scribe_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER,
  model VARCHAR(100),
  referenced_annotations UUID[],
  referenced_document_sections INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SCRIBE_MESSAGE
CREATE INDEX idx_scribe_message_scribe_id ON scribe_message(scribe_id);
CREATE INDEX idx_scribe_message_created_at ON scribe_message(created_at DESC);
CREATE INDEX idx_scribe_message_role ON scribe_message(role);

-- RLS for SCRIBE_MESSAGE
ALTER TABLE scribe_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scribe messages" ON scribe_message
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scribe messages" ON scribe_message
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scribe messages" ON scribe_message
  FOR DELETE USING (auth.uid() = user_id);

-- Create DOCUMENT_VECTOR table
CREATE TABLE document_vector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  word_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for DOCUMENT_VECTOR
CREATE INDEX idx_document_vector_document_id ON document_vector(document_id);
CREATE INDEX idx_document_vector_user_id ON document_vector(user_id);
CREATE INDEX idx_document_vector_chunk_index ON document_vector(chunk_index);

-- Vector similarity search index
CREATE INDEX idx_document_vector_embedding ON document_vector USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RLS for DOCUMENT_VECTOR
ALTER TABLE document_vector ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document vectors" ON document_vector
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document vectors" ON document_vector
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document vectors" ON document_vector
  FOR DELETE USING (auth.uid() = user_id);

-- Create SHARE table (optional)
CREATE TABLE share (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('user', 'link', 'public')),
  share_token VARCHAR(255) UNIQUE,
  can_view BOOLEAN DEFAULT true,
  can_annotate BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT true,
  can_scribe BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SHARE
CREATE INDEX idx_share_document_id ON share(document_id);
CREATE INDEX idx_share_shared_by ON share(shared_by_user_id);
CREATE INDEX idx_share_shared_with ON share(shared_with_user_id);
CREATE INDEX idx_share_token ON share(share_token);

-- RLS for SHARE
ALTER TABLE share ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they created" ON share
  FOR SELECT USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can create shares" ON share
  FOR INSERT WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can delete their shares" ON share
  FOR DELETE USING (auth.uid() = shared_by_user_id);

