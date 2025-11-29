-- Migration: Add function to get user email by ID
-- This is needed because PostgREST doesn't expose foreign key relationships to auth.users

-- Function to get user email by ID
DROP FUNCTION IF EXISTS get_user_email_by_id(UUID);

CREATE FUNCTION get_user_email_by_id(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT 
    au.email::TEXT
  INTO user_email
  FROM auth.users au
  WHERE au.id = user_id
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_by_id(UUID) TO authenticated;

