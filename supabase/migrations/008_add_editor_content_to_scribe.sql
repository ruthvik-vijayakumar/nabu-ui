-- 008_add_editor_content_to_scribe.sql
-- Add editor_content column to scribe table for storing Tiptap editor content

ALTER TABLE scribe 
ADD COLUMN IF NOT EXISTS editor_content TEXT;

-- Add index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_scribe_editor_content ON scribe(editor_content) WHERE editor_content IS NOT NULL;

