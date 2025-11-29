-- Minimal core schema: SCRIBE and DOCUMENT only

-- Drop existing (safe if starting fresh)
DROP TABLE IF EXISTS document CASCADE;
DROP TABLE IF EXISTS scribe CASCADE;

-- Helper trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SCRIBE (one scribe can have many documents)
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

-- DOCUMENT (belongs to SCRIBE)
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
  -- Reference to object in Supabase Storage (e.g., 'bucket/folder/file.ext')
  storage_object_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_document_storage_object_path ON document(storage_object_path);

-- Triggers
CREATE TRIGGER scribe_updated_at_trigger
  BEFORE UPDATE ON scribe
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_updated_at_trigger
  BEFORE UPDATE ON document
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-assign a default scribe on document insert when none provided
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

-- RLS
ALTER TABLE scribe ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

-- SCRIBE RLS
CREATE POLICY "Scribes: select own" ON scribe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Scribes: insert own" ON scribe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scribes: update own" ON scribe FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Scribes: delete own" ON scribe FOR DELETE USING (auth.uid() = user_id);

-- DOCUMENT RLS
CREATE POLICY "Documents: select own" ON document FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Documents: insert own" ON document FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Documents: update own" ON document FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Documents: delete own" ON document FOR DELETE USING (auth.uid() = user_id);
