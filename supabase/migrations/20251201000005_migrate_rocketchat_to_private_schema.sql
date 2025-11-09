-- ================================================================
-- MIGRATE ROCKET.CHAT DATA TO PRIVATE SCHEMA
-- ================================================================

-- Step 1: Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Step 2: Create user_integrations table
CREATE TABLE IF NOT EXISTS private.user_integrations (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  rocketchat_user_id text,
  rocketchat_auth_token text,
  rocketchat_username text,
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Migrate Rocket.Chat data from users table
INSERT INTO private.user_integrations (user_id, rocketchat_user_id, rocketchat_auth_token, rocketchat_username, updated_at)
SELECT 
  id,
  rocketchat_user_id,
  rocketchat_auth_token,
  rocketchat_username,
  updated_at
FROM public.users
WHERE rocketchat_user_id IS NOT NULL
   OR rocketchat_auth_token IS NOT NULL
   OR rocketchat_username IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  rocketchat_user_id = EXCLUDED.rocketchat_user_id,
  rocketchat_auth_token = EXCLUDED.rocketchat_auth_token,
  rocketchat_username = EXCLUDED.rocketchat_username,
  updated_at = EXCLUDED.updated_at;

-- Step 4: Drop Rocket.Chat columns from users table
ALTER TABLE public.users
  DROP COLUMN IF EXISTS rocketchat_user_id,
  DROP COLUMN IF EXISTS rocketchat_auth_token,
  DROP COLUMN IF EXISTS rocketchat_username;

-- Step 5: Drop old indexes if they exist
DROP INDEX IF EXISTS idx_users_rocketchat_user_id;
DROP INDEX IF EXISTS idx_users_rocketchat_username;

-- Step 6: Create indexes on new table
CREATE INDEX IF NOT EXISTS idx_user_integrations_rocketchat_user_id 
  ON private.user_integrations(rocketchat_user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_rocketchat_username 
  ON private.user_integrations(rocketchat_username);

-- Step 7: Enable RLS on private.user_integrations
ALTER TABLE private.user_integrations ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
CREATE POLICY user_integrations_self ON private.user_integrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_integrations_self_update ON private.user_integrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_integrations_self_insert ON private.user_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON SCHEMA private IS 'Private schema for sensitive user data like integration tokens';
COMMENT ON TABLE private.user_integrations IS 'Stores external service integration data (Rocket.Chat, etc.) for users';
COMMENT ON COLUMN private.user_integrations.rocketchat_user_id IS 'Rocket.Chat user ID for messaging integration';
COMMENT ON COLUMN private.user_integrations.rocketchat_auth_token IS 'Rocket.Chat authentication token for iframe embedding';
COMMENT ON COLUMN private.user_integrations.rocketchat_username IS 'Rocket.Chat username (usually email prefix)';

