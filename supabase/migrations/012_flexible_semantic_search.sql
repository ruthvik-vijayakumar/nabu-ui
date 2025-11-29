-- 012_flexible_semantic_search.sql
-- Create flexible semantic search function that handles different embedding dimensions

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS search_documents_semantic(VECTOR, FLOAT, INT, UUID);

-- Create a flexible semantic search function that accepts any vector dimension
-- Note: PostgreSQL's VECTOR type can store different dimensions, but function signatures
-- need to match. We'll use a generic approach.

CREATE OR REPLACE FUNCTION search_documents_semantic(
  query_embedding VECTOR,
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
DECLARE
  query_dim INT;
  stored_dim INT;
BEGIN
  -- Get query embedding dimension
  query_dim := array_length(query_embedding::float[], 1);
  
  -- Get stored vector dimension (from first vector)
  SELECT array_length(embedding::float[], 1) INTO stored_dim
  FROM document_vector
  WHERE (user_filter IS NULL OR user_id = user_filter)
    AND embedding IS NOT NULL
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
  WHERE
    (user_filter IS NULL OR dv.user_id = user_filter)
    AND dv.embedding IS NOT NULL
    AND array_length(dv.embedding::float[], 1) = query_dim  -- Ensure dimension match
    AND 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Also create dimension-specific functions for backward compatibility
-- These will be used if the flexible one doesn't work

CREATE OR REPLACE FUNCTION search_documents_semantic_1536(
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

CREATE OR REPLACE FUNCTION search_documents_semantic_384(
  query_embedding VECTOR(384),
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

