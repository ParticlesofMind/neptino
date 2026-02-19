-- ================================================================
-- ADD ROCKET.CHAT INTEGRATION COLUMNS
-- ================================================================

-- Add Rocket.Chat user ID and auth token columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS rocketchat_user_id text,
ADD COLUMN IF NOT EXISTS rocketchat_auth_token text,
ADD COLUMN IF NOT EXISTS rocketchat_username text;

-- Add indexes for Rocket.Chat lookups
CREATE INDEX IF NOT EXISTS idx_users_rocketchat_user_id ON public.users(rocketchat_user_id);
CREATE INDEX IF NOT EXISTS idx_users_rocketchat_username ON public.users(rocketchat_username);

-- Add comments for documentation
COMMENT ON COLUMN public.users.rocketchat_user_id IS 'Rocket.Chat user ID for messaging integration';
COMMENT ON COLUMN public.users.rocketchat_auth_token IS 'Rocket.Chat authentication token for iframe embedding';
COMMENT ON COLUMN public.users.rocketchat_username IS 'Rocket.Chat username (usually email prefix)';
