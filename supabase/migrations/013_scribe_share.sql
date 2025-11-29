-- Migration: Add scribe_share table for sharing scribes with other users
-- This allows users to share their scribes with registered users by email

-- Create scribe_share table
CREATE TABLE IF NOT EXISTS scribe_share (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scribe_id UUID NOT NULL REFERENCES scribe(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scribe_id, shared_with_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scribe_share_scribe_id ON scribe_share(scribe_id);
CREATE INDEX IF NOT EXISTS idx_scribe_share_shared_by ON scribe_share(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_scribe_share_shared_with ON scribe_share(shared_with_user_id);

-- Enable RLS
ALTER TABLE scribe_share ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view shares they created or shares shared with them
CREATE POLICY "Users can view their own shares" ON scribe_share
  FOR SELECT USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

-- Users can create shares for scribes they own
CREATE POLICY "Users can create shares for their scribes" ON scribe_share
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM scribe 
      WHERE scribe.id = scribe_share.scribe_id 
      AND scribe.user_id = auth.uid()
    )
  );

-- Users can update shares they created
CREATE POLICY "Users can update their own shares" ON scribe_share
  FOR UPDATE USING (auth.uid() = shared_by_user_id);

-- Users can delete shares they created
CREATE POLICY "Users can delete their own shares" ON scribe_share
  FOR DELETE USING (auth.uid() = shared_by_user_id);

-- Function to get user by email (for sharing)
-- Note: This requires the function to be created with SECURITY DEFINER
-- to access auth.users table
-- Drop the function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);

CREATE FUNCTION get_user_by_email(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT 
    au.id,
    au.email::TEXT
  INTO user_record
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(user_email)
  LIMIT 1;
  
  IF user_record.id IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN json_build_object(
    'id', user_record.id,
    'email', user_record.email
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scribe_share_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scribe_share_updated_at
  BEFORE UPDATE ON scribe_share
  FOR EACH ROW
  EXECUTE FUNCTION update_scribe_share_updated_at();

