-- 008_document_vector.sql
-- Create entity to store vector data for saved content

-- Ensure vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table
CREATE TABLE IF NOT EXISTS document_vector (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_vector_document_id ON document_vector(document_id);
CREATE INDEX IF NOT EXISTS idx_document_vector_user_id ON document_vector(user_id);
CREATE INDEX IF NOT EXISTS idx_document_vector_chunk_index ON document_vector(chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_vector_embedding ON document_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE document_vector ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_vector' AND policyname = 'Document vectors: select own'
  ) THEN
    CREATE POLICY "Document vectors: select own" ON document_vector FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_vector' AND policyname = 'Document vectors: insert own'
  ) THEN
    CREATE POLICY "Document vectors: insert own" ON document_vector FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_vector' AND policyname = 'Document vectors: delete own'
  ) THEN
    CREATE POLICY "Document vectors: delete own" ON document_vector FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


