-- ================================================================
-- CREATE ensure_user_profile RPC FUNCTION
-- ================================================================
-- This function ensures a user profile exists in the users table
-- Used by the course creation flow
-- ================================================================

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_id uuid,
  user_email text,
  user_role text DEFAULT 'teacher'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  valid_role public.user_role;
BEGIN
  -- Validate and cast role to enum
  IF user_role IN ('student', 'teacher', 'admin') THEN
    valid_role := user_role::public.user_role;
  ELSE
    valid_role := 'teacher'::public.user_role;
  END IF;

  -- Upsert user profile
  INSERT INTO public.users (id, email, role, institution)
  VALUES (user_id, user_email, valid_role, 'Independent')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, users.role),
    institution = COALESCE(EXCLUDED.institution, users.institution);
END;
$$;

COMMENT ON FUNCTION public.ensure_user_profile IS 'Ensures a user profile exists in the users table';
