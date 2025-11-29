-- 006_align_schema.sql
-- Align schema with app code: document.scribe_id (FK) and scribe without document_id
-- Also ensure updated_at trigger function, RLS policies, and helpful indexes exist

-- 1) Helper function for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column' AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- 2) Add document.scribe_id if missing
ALTER TABLE document ADD COLUMN IF NOT EXISTS scribe_id UUID;

-- 3) Backfill document.scribe_id from legacy scribe.document_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'scribe' AND column_name = 'document_id'
  ) THEN
    WITH latest_scribes AS (
      SELECT DISTINCT ON (document_id)
        id AS scribe_id,
        document_id
      FROM scribe
      WHERE document_id IS NOT NULL
      ORDER BY document_id, updated_at DESC
    )
    UPDATE document d
    SET scribe_id = ls.scribe_id
    FROM latest_scribes ls
    WHERE d.id = ls.document_id
      AND d.scribe_id IS NULL;
  END IF;
END $$;

-- 4) Ensure FK from document.scribe_id to scribe(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_scribe_id_fkey'
  ) THEN
    ALTER TABLE document
      ADD CONSTRAINT document_scribe_id_fkey
      FOREIGN KEY (scribe_id) REFERENCES scribe(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5) Drop legacy scribe.document_id and its FK if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'scribe' AND column_name = 'document_id'
  ) THEN
    BEGIN
      ALTER TABLE scribe DROP CONSTRAINT IF EXISTS scribe_document_id_fkey;
      ALTER TABLE scribe DROP COLUMN IF EXISTS document_id;
    EXCEPTION WHEN undefined_table THEN
      -- ignore
    END;
  END IF;
END $$;

-- 6) Triggers to keep updated_at fresh
DO $$
BEGIN
  BEGIN
    CREATE TRIGGER scribe_updated_at_trigger
      BEFORE UPDATE ON scribe
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION WHEN duplicate_object THEN
    -- already exists
  END;

  BEGIN
    CREATE TRIGGER document_updated_at_trigger
      BEFORE UPDATE ON document
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  EXCEPTION WHEN duplicate_object THEN
    -- already exists
  END;
END $$;

-- 7) RLS policies (idempotent) for scribe and document
ALTER TABLE scribe ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scribe' AND policyname = 'Scribes: select own'
  ) THEN
    CREATE POLICY "Scribes: select own" ON scribe FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scribe' AND policyname = 'Scribes: insert own'
  ) THEN
    CREATE POLICY "Scribes: insert own" ON scribe FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scribe' AND policyname = 'Scribes: update own'
  ) THEN
    CREATE POLICY "Scribes: update own" ON scribe FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scribe' AND policyname = 'Scribes: delete own'
  ) THEN
    CREATE POLICY "Scribes: delete own" ON scribe FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document' AND policyname = 'Documents: select own'
  ) THEN
    CREATE POLICY "Documents: select own" ON document FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document' AND policyname = 'Documents: insert own'
  ) THEN
    CREATE POLICY "Documents: insert own" ON document FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document' AND policyname = 'Documents: update own'
  ) THEN
    CREATE POLICY "Documents: update own" ON document FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document' AND policyname = 'Documents: delete own'
  ) THEN
    CREATE POLICY "Documents: delete own" ON document FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_document_scribe_id ON document(scribe_id);
CREATE INDEX IF NOT EXISTS idx_scribe_user_lowername ON scribe (user_id, lower(coalesce(name, 'Untitled Conversation')));


