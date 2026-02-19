-- ================================================================
-- CREATE PUBLIC VIEW FOR PRIVATE.USER_INTEGRATIONS
-- ================================================================
-- Supabase client accesses tables in public schema by default
-- This view provides access to user_integrations with RLS applied

CREATE OR REPLACE VIEW public.user_integrations AS
SELECT 
  user_id,
  rocketchat_user_id,
  rocketchat_auth_token,
  rocketchat_username,
  updated_at
FROM private.user_integrations;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_integrations TO authenticated;

-- Enable RLS on the view (inherits from underlying table)
ALTER VIEW public.user_integrations SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW public.user_integrations IS 'Public view of private.user_integrations for Supabase client access';

