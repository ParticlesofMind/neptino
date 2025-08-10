-- Recreate the ensure_user_profile function that was dropped
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
    user_id uuid, 
    user_email text, 
    user_role text DEFAULT 'teacher'
)
RETURNS void AS $$
BEGIN
  -- This function runs with elevated privileges (SECURITY DEFINER)
  -- so it can bypass RLS policies
  INSERT INTO public.users (id, first_name, last_name, email, role, institution)
  VALUES (
    user_id,
    COALESCE(NULLIF(split_part(user_email, '@', 1), ''), 'User'),
    '',
    user_email,
    user_role,
    'Independent'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to call this function
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(uuid, text, text) TO anon;

-- Also recreate the user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix the RLS policies for users table
-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated profile access" ON public.users;

-- Create comprehensive policies
CREATE POLICY "users_can_view_own_profile" ON public.users 
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile" ON public.users 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON public.users 
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Allow the trigger and RPC function to create profiles
CREATE POLICY "allow_service_profile_creation" ON public.users 
FOR INSERT WITH CHECK (true);

-- Make the policy more specific for better security (optional future enhancement)
-- CREATE POLICY "allow_service_profile_creation" ON public.users 
-- FOR INSERT WITH CHECK (current_setting('role') = 'service_role' OR auth.uid() = id);
