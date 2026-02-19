-- ================================================================
-- FIX handle_new_user() FUNCTION TO USE user_role ENUM
-- ================================================================
-- After migrating role column to user_role enum, the trigger function
-- needs to cast string values to the enum type
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_value text;
  valid_role public.user_role;
BEGIN
  -- Extract and validate user_role from metadata
  user_role_value := new.raw_user_meta_data->>'user_role';
  
  -- Check if the value is a valid enum value, default to 'student' if not
  IF user_role_value IN ('student', 'teacher', 'admin') THEN
    valid_role := user_role_value::public.user_role;
  ELSE
    valid_role := 'student'::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    valid_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    role = valid_role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

