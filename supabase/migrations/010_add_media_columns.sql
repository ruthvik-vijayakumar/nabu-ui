-- 010_add_media_columns.sql
-- Add missing media-related columns to document table if they don't exist

-- Add media_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE document ADD COLUMN media_type VARCHAR(50);
    RAISE NOTICE 'Added media_type column to document table';
  END IF;
END $$;

-- Add media_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE document ADD COLUMN media_url TEXT;
    RAISE NOTICE 'Added media_url column to document table';
  END IF;
END $$;

-- Add thumbnail_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE document ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE 'Added thumbnail_url column to document table';
  END IF;
END $$;

-- Add file_size column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE document ADD COLUMN file_size BIGINT;
    RAISE NOTICE 'Added file_size column to document table';
  END IF;
END $$;

-- Add duration column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'duration'
  ) THEN
    ALTER TABLE document ADD COLUMN duration INTEGER;
    RAISE NOTICE 'Added duration column to document table';
  END IF;
END $$;

-- Add source_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE document ADD COLUMN source_url TEXT;
    RAISE NOTICE 'Added source_url column to document table';
  END IF;
END $$;

-- Ensure storage_object_path exists (some minimal schemas might not have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document' AND column_name = 'storage_object_path'
  ) THEN
    ALTER TABLE document ADD COLUMN storage_object_path TEXT;
    RAISE NOTICE 'Added storage_object_path column to document table';
  END IF;
END $$;

