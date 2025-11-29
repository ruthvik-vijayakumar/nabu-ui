-- 017_add_scribe_filter_to_semantic_search.sql
-- Update semantic search functions to support filtering by scribe_id for shared scribes

-- Drop existing functions
DROP FUNCTION IF EXISTS search_documents_semantic(VECTOR, FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS search_documents_semantic_1536(VECTOR(1536), FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS search_documents_semantic_384(VECTOR(384), FLOAT, INT, UUID);

-- Create updated flexible semantic search function with scribe_id support
CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding VECTOR,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  user_filter UUID DEFAULT NULL,
  scribe_filter UUID DEFAULT NULL
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
DECLARE
  query_dim INT;
  stored_dim INT;
BEGIN
  -- Get query embedding dimension
  query_dim := array_length(query_embedding::float[], 1);
  
  -- Get stored vector dimension (from first vector)
  SELECT array_length(dv.embedding::float[], 1) INTO stored_dim
  FROM document_vector dv
  JOIN document d ON dv.document_id = d.id
  WHERE (user_filter IS NULL OR dv.user_id = user_filter)
    AND (scribe_filter IS NULL OR d.scribe_id = scribe_filter)
    AND dv.embedding IS NOT NULL
  LIMIT 1;
  
  -- Check dimension match
  IF stored_dim IS NOT NULL AND query_dim != stored_dim THEN
    RAISE EXCEPTION 'Embedding dimension mismatch: query has % dimensions but stored vectors have % dimensions', 
      query_dim, stored_dim;
  END IF;
  
  -- Perform semantic search
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
  JOIN document d ON dv.document_id = d.id
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND (scribe_filter IS NULL OR d.scribe_id = scribe_filter)
    AND dv.embedding IS NOT NULL
    AND array_length(dv.embedding::float[], 1) = query_dim  -- Ensure dimension match
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create updated dimension-specific function for 1536 dimensions
CREATE OR REPLACE FUNCTION search_documents_semantic_1536(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  user_filter UUID DEFAULT NULL,
  scribe_filter UUID DEFAULT NULL
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
  JOIN document d ON dv.document_id = d.id
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND (scribe_filter IS NULL OR d.scribe_id = scribe_filter)
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create updated dimension-specific function for 384 dimensions
CREATE OR REPLACE FUNCTION search_documents_semantic_384(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  user_filter UUID DEFAULT NULL,
  scribe_filter UUID DEFAULT NULL
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
  JOIN document d ON dv.document_id = d.id
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND (scribe_filter IS NULL OR d.scribe_id = scribe_filter)
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

