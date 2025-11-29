-- 000_recreate_full_schema.sql
-- Fresh, idempotent schema aligned with app code

-- Safety: drop in dependency order when starting from scratch
DROP TABLE IF EXISTS document_vector CASCADE;
DROP TABLE IF EXISTS scribe_message CASCADE;
DROP TABLE IF EXISTS annotation CASCADE;
DROP TABLE IF EXISTS share CASCADE;
DROP TABLE IF EXISTS document CASCADE;
DROP TABLE IF EXISTS scribe CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SCRIBE (root of conversations; documents point to it)
CREATE TABLE scribe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- DOCUMENT (belongs to a SCRIBE)
CREATE TABLE document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('page','text','image','video','pdf')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT,
  notes TEXT,
  tags TEXT[],
  storage_object_path TEXT,
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

-- Ensure a default scribe is assigned if missing on document insert
CREATE OR REPLACE FUNCTION ensure_document_scribe()
RETURNS TRIGGER AS $$
DECLARE
  default_scribe_id UUID;
BEGIN
  IF NEW.scribe_id IS NULL THEN
    SELECT id INTO default_scribe_id
    FROM scribe
    WHERE user_id = NEW.user_id AND name = 'Default'
    ORDER BY updated_at DESC
    LIMIT 1;

    IF default_scribe_id IS NULL THEN
      INSERT INTO scribe (user_id, name, model, temperature, system_prompt, message_count, total_tokens)
      VALUES (NEW.user_id, 'Default', 'gpt-4', 0.7, NULL, 0, 0)
      RETURNING id INTO default_scribe_id;
    END IF;

    NEW.scribe_id := default_scribe_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_set_default_scribe
  BEFORE INSERT ON document
  FOR EACH ROW EXECUTE FUNCTION ensure_document_scribe();

-- ANNOTATION
CREATE TABLE annotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('highlight','note','drawing')),
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

-- SCRIBE_MESSAGE
CREATE TABLE scribe_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens INTEGER,
  model VARCHAR(100),
  referenced_annotations UUID[],
  referenced_document_sections INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENT_VECTOR
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

-- SHARE
CREATE TABLE share (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('user','link','public')),
  share_token VARCHAR(255) UNIQUE,
  can_view BOOLEAN DEFAULT true,
  can_annotate BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT true,
  can_scribe BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scribe_user_id ON scribe(user_id);
CREATE INDEX idx_scribe_updated_at ON scribe(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scribe_user_lowername ON scribe (user_id, lower(coalesce(name, 'Untitled Conversation')));

CREATE INDEX idx_document_user_id ON document(user_id);
CREATE INDEX idx_document_scribe_id ON document(scribe_id);
CREATE INDEX idx_document_type ON document(type);
CREATE INDEX idx_document_created_at ON document(created_at DESC);
CREATE INDEX idx_document_tags ON document USING GIN (tags);
CREATE INDEX idx_document_fts ON document USING GIN (to_tsvector('english', title || ' ' || COALESCE(content,'') || ' ' || COALESCE(notes,'')));

CREATE INDEX idx_annotation_document_id ON annotation(document_id);
CREATE INDEX idx_annotation_user_id ON annotation(user_id);
CREATE INDEX idx_annotation_page_number ON annotation(document_id, page_number);
CREATE INDEX idx_annotation_type ON annotation(type);

CREATE INDEX idx_scribe_message_scribe_id ON scribe_message(scribe_id);
CREATE INDEX idx_scribe_message_created_at ON scribe_message(created_at DESC);
CREATE INDEX idx_scribe_message_role ON scribe_message(role);

CREATE INDEX idx_document_vector_document_id ON document_vector(document_id);
CREATE INDEX idx_document_vector_user_id ON document_vector(user_id);
CREATE INDEX idx_document_vector_chunk_index ON document_vector(chunk_index);
CREATE INDEX idx_document_vector_embedding ON document_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_share_document_id ON share(document_id);
CREATE INDEX idx_share_shared_by ON share(shared_by_user_id);
CREATE INDEX idx_share_shared_with ON share(shared_with_user_id);
CREATE INDEX idx_share_token ON share(share_token);

-- Triggers
CREATE TRIGGER scribe_updated_at_trigger
  BEFORE UPDATE ON scribe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_updated_at_trigger
  BEFORE UPDATE ON document
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER annotation_updated_at_trigger
  BEFORE UPDATE ON annotation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS enablement
ALTER TABLE scribe ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE scribe_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_vector ENABLE ROW LEVEL SECURITY;
ALTER TABLE share ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- SCRIBE
CREATE POLICY IF NOT EXISTS "Scribes: select own" ON scribe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Scribes: insert own" ON scribe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Scribes: update own" ON scribe FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Scribes: delete own" ON scribe FOR DELETE USING (auth.uid() = user_id);

-- DOCUMENT
CREATE POLICY IF NOT EXISTS "Documents: select own" ON document FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Documents: insert own" ON document FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Documents: update own" ON document FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Documents: delete own" ON document FOR DELETE USING (auth.uid() = user_id);

-- ANNOTATION
CREATE POLICY IF NOT EXISTS "Annotations: select own" ON annotation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Annotations: insert own" ON annotation FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Annotations: update own" ON annotation FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Annotations: delete own" ON annotation FOR DELETE USING (auth.uid() = user_id);

-- SCRIBE_MESSAGE
CREATE POLICY IF NOT EXISTS "Scribe messages: select own" ON scribe_message FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Scribe messages: insert own" ON scribe_message FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Scribe messages: delete own" ON scribe_message FOR DELETE USING (auth.uid() = user_id);

-- DOCUMENT_VECTOR
CREATE POLICY IF NOT EXISTS "Document vectors: select own" ON document_vector FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Document vectors: insert own" ON document_vector FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Document vectors: delete own" ON document_vector FOR DELETE USING (auth.uid() = user_id);

-- SHARE
CREATE POLICY IF NOT EXISTS "Shares: select own" ON share FOR SELECT USING (auth.uid() = shared_by_user_id);
CREATE POLICY IF NOT EXISTS "Shares: insert own" ON share FOR INSERT WITH CHECK (auth.uid() = shared_by_user_id);
CREATE POLICY IF NOT EXISTS "Shares: delete own" ON share FOR DELETE USING (auth.uid() = shared_by_user_id);


