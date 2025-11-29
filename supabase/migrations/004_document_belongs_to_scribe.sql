-- 004_document_belongs_to_scribe.sql

-- 1) Add scribe_id to document (nullable for backfill)
ALTER TABLE document ADD COLUMN IF NOT EXISTS scribe_id UUID;

-- 2) Backfill scribe_id from existing scribe.document_id (latest updated wins)
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

-- 3) Optionally create default scribe for documents without one
WITH docs_without_scribe AS (
  SELECT d.id, d.user_id, COALESCE(NULLIF(TRIM(d.title), ''), 'Untitled Document') AS doc_title
  FROM document d
  WHERE d.scribe_id IS NULL
),
created_scribes AS (
  INSERT INTO scribe (user_id, name, model, temperature, system_prompt, message_count, total_tokens)
  SELECT dws.user_id,
         CONCAT('Scribe - ', LEFT(dws.doc_title, 60)),
         'gpt-4', 0.7, NULL, 0, 0
  FROM docs_without_scribe dws
  RETURNING id, user_id
)
UPDATE document d
SET scribe_id = cs.id
FROM created_scribes cs
WHERE d.scribe_id IS NULL
  AND d.user_id = cs.user_id;

-- 4) Enforce NOT NULL + FK on document.scribe_id
ALTER TABLE document
  ALTER COLUMN scribe_id SET NOT NULL;

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

-- 5) Drop old FK/column from scribe -> document
ALTER TABLE scribe DROP CONSTRAINT IF EXISTS scribe_document_id_fkey;
ALTER TABLE scribe DROP COLUMN IF EXISTS document_id;

-- 6) Index for new relation
CREATE INDEX IF NOT EXISTS idx_document_scribe_id ON document(scribe_id);

-- 7) Update dependent function: get_document_stats()
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
    MAX(GREATEST(
      d.updated_at,
      COALESCE((SELECT MAX(created_at) FROM annotation WHERE document_id = p_document_id), '1970-01-01'),
      COALESCE((SELECT MAX(updated_at) FROM scribe s2 WHERE s2.id = d.scribe_id), '1970-01-01')
    )) as last_updated
  FROM document d
  LEFT JOIN annotation a ON a.document_id = d.id
  LEFT JOIN scribe s ON s.id = d.scribe_id
  LEFT JOIN document_vector dv ON dv.document_id = d.id
  WHERE d.id = p_document_id
  GROUP BY d.id;
END;
$$;
