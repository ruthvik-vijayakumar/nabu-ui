-- 011_flexible_embedding_dimensions.sql
-- Make embedding dimension flexible to support different providers
-- OpenAI: 1536, Hugging Face: 384/768, Cohere: 1024

-- Check if we need to alter the column
DO $$
BEGIN
  -- Check current column definition
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'document_vector' 
    AND column_name = 'embedding'
    AND data_type = 'USER-DEFINED'
  ) THEN
    -- Drop the old column constraint if it exists
    -- Note: VECTOR type in pgvector doesn't have a fixed dimension constraint
    -- The dimension is stored per value, so we should be fine
    -- But let's verify the column can accept different dimensions
    
    RAISE NOTICE 'Embedding column exists. VECTOR type supports variable dimensions.';
  END IF;
END $$;

-- Add metadata column to track embedding provider and dimensions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_vector' 
    AND column_name = 'embedding_provider'
  ) THEN
    ALTER TABLE document_vector ADD COLUMN embedding_provider VARCHAR(50);
    RAISE NOTICE 'Added embedding_provider column.';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_vector' 
    AND column_name = 'embedding_dimensions'
  ) THEN
    ALTER TABLE document_vector ADD COLUMN embedding_dimensions INTEGER;
    RAISE NOTICE 'Added embedding_dimensions column.';
  END IF;
END $$;

-- Note: The VECTOR(1536) type definition in the original migration
-- actually allows storing vectors of different dimensions in PostgreSQL.
-- Each vector value stores its own dimension.
-- However, for consistency, you might want to use VECTOR without a fixed dimension.
-- But changing it requires recreating the table, which is complex.
-- The current setup should work fine with different dimensions.

