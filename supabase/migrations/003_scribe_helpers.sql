-- Add helpful index for fast scribe listing by user and name
CREATE INDEX IF NOT EXISTS idx_scribe_user_lowername
ON scribe (user_id, lower(coalesce(name, 'Untitled Conversation')));

-- View: user_scribes_distinct
-- Purpose: Provide one row per (user, scribe name), selecting the most recently updated scribe
CREATE OR REPLACE VIEW user_scribes_distinct AS
SELECT DISTINCT ON (s.user_id, lower(coalesce(s.name, 'Untitled Conversation')))
  s.user_id,
  coalesce(s.name, 'Untitled Conversation') AS name,
  s.id AS scribe_id,
  s.updated_at
FROM scribe s
ORDER BY s.user_id, lower(coalesce(s.name, 'Untitled Conversation')), s.updated_at DESC;

-- RLS passthrough via underlying table policies
-- (No direct RLS on views; the underlying table's policies apply.)
