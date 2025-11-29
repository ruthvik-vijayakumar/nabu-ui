-- Semantic search function
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
  page_number INT,
  section_title TEXT,
  chunk_index INT
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
    dv.page_number,
    dv.section_title,
    dv.chunk_index
  FROM document_vector dv
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Get document stats function
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

-- Function to update scribe message count
CREATE OR REPLACE FUNCTION update_scribe_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE scribe 
  SET message_count = (
    SELECT COUNT(*) FROM scribe_message WHERE scribe_id = NEW.scribe_id
  ),
  updated_at = NOW()
  WHERE id = NEW.scribe_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating message count
CREATE TRIGGER scribe_message_count_trigger
  AFTER INSERT OR DELETE ON scribe_message
  FOR EACH ROW
  EXECUTE FUNCTION update_scribe_message_count();

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
DECLARE
  token VARCHAR(255);
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  -- Remove any characters that might cause issues in URLs
  token := replace(replace(token, '/', '_'), '+', '-');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate share token on insert
CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL AND NEW.share_type IN ('link', 'public') THEN
    NEW.share_token := generate_share_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating share tokens
CREATE TRIGGER set_share_token_trigger
  BEFORE INSERT ON share
  FOR EACH ROW
  EXECUTE FUNCTION set_share_token();

-- Function to get user's document count by type
CREATE OR REPLACE FUNCTION get_user_content_stats(p_user_id UUID)
RETURNS TABLE (
  content_type VARCHAR(50),
  count BIGINT,
  total_size BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.type::VARCHAR(50) as content_type,
    COUNT(*)::BIGINT as count,
    SUM(COALESCE(d.file_size, LENGTH(COALESCE(d.content, ''))))::BIGINT as total_size
  FROM document d
  WHERE d.user_id = p_user_id
  GROUP BY d.type
  ORDER BY count DESC;
END;
$$;

-- Function to search documents with hybrid search (semantic + full-text)
CREATE OR REPLACE FUNCTION search_documents_hybrid(
  query_text TEXT,
  query_embedding VECTOR(1536),
  user_filter UUID DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type VARCHAR(50),
  url TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  semantic_rank INT,
  text_rank REAL,
  combined_score REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT DISTINCT ON (dv.document_id)
      dv.document_id,
      ROW_NUMBER() OVER (ORDER BY 1 - (dv.embedding <=> query_embedding))::INT as semantic_rank
    FROM document_vector dv
    WHERE user_filter IS NULL OR dv.user_id = user_filter
    ORDER BY dv.document_id, dv.embedding <=> query_embedding
  ),
  text_results AS (
    SELECT
      d.id,
      ts_rank(d.fts, plainto_tsquery('english', query_text)) as text_rank
    FROM document d
    WHERE user_filter IS NULL OR d.user_id = user_filter
    AND d.fts @@ plainto_tsquery('english', query_text)
  )
  SELECT
    d.id,
    d.title,
    d.type,
    d.url,
    d.notes,
    d.tags,
    d.created_at,
    COALESCE(sr.semantic_rank, 999)::INT as semantic_rank,
    COALESCE(tr.text_rank, 0)::REAL as text_rank,
    (COALESCE(1.0 / NULLIF(sr.semantic_rank, 0), 0) * 0.6 + COALESCE(tr.text_rank, 0) * 0.4)::REAL as combined_score
  FROM document d
  LEFT JOIN semantic_results sr ON sr.document_id = d.id
  LEFT JOIN text_results tr ON tr.id = d.id
  WHERE (sr.document_id IS NOT NULL OR tr.id IS NOT NULL)
    AND (user_filter IS NULL OR d.user_id = user_filter)
  ORDER BY combined_score DESC, d.created_at DESC
  LIMIT match_count;
END;
$$;

