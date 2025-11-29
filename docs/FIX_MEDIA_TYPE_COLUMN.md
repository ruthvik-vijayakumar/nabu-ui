# Fix: Missing media_type Column Error

## Problem
Error: `Could not find the 'media_type' column of 'document' in the schema cache`

This happens when your database schema doesn't have the `media_type` column (and possibly other media-related columns).

## Solution

### Step 1: Run the Migration

Go to your Supabase Dashboard → **SQL Editor** and run this migration:

```sql
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

-- Ensure storage_object_path exists
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
```

### Step 2: Verify Columns Were Added

Run this query to verify all columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document' 
  AND column_name IN ('media_type', 'media_url', 'thumbnail_url', 'file_size', 'duration', 'source_url', 'storage_object_path')
ORDER BY column_name;
```

You should see all 7 columns listed.

### Step 3: Clear Schema Cache (if needed)

If you still see the error after running the migration:

1. Go to Supabase Dashboard → **Settings** → **API**
2. The schema cache should auto-refresh, but you can also:
   - Wait a few seconds
   - Or restart your extension/reload the page

## Why This Happens

Some migration files (like `005_minimal_core.sql` and `007_scribe_document_only.sql`) create a minimal schema without all the media-related columns. The migration above adds them safely without breaking existing data.

## Alternative: Quick Fix SQL

If you just need to add `media_type` quickly:

```sql
ALTER TABLE document ADD COLUMN IF NOT EXISTS media_type VARCHAR(50);
ALTER TABLE document ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE document ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE document ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE document ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE document ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE document ADD COLUMN IF NOT EXISTS storage_object_path TEXT;
```

This will add all missing columns in one go.

