-- Create a function to ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id uuid, user_email text, user_role text DEFAULT 'teacher')
RETURNS void AS $$
BEGIN
  -- Try to insert the user profile, ignore if it already exists
  INSERT INTO public.users (id, first_name, last_name, email, role, institution)
  VALUES (
    user_id,
    COALESCE(NULLIF(split_part(user_email, '@', 1), ''), 'User'),
    '',
    user_email,
    user_role,
    'Independent'
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically create user profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile when a new user is created in auth.users
  INSERT INTO public.users (id, first_name, last_name, email, role, institution)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'User')),
    '',
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'user_role', ''), 'teacher'),
    'Independent'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure the current user has a profile (for existing users)
-- This will be executed when the migration runs
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Loop through auth users that don't have profiles
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    INSERT INTO public.users (id, first_name, last_name, email, role, institution)
    VALUES (
      auth_user.id,
      COALESCE(NULLIF(auth_user.raw_user_meta_data->>'full_name', ''), COALESCE(NULLIF(split_part(auth_user.email, '@', 1), ''), 'User')),
      '',
      auth_user.email,
      COALESCE(NULLIF(auth_user.raw_user_meta_data->>'user_role', ''), 'teacher'),
      'Independent'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
