-- ================================================================
-- CREATE BASIC TABLES FOR TESTING (NO RLS)
-- ================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT auth.uid(),
    email text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    role text DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    institution text,
    language text DEFAULT 'English',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name text NOT NULL,
    course_description text,
    teacher_id uuid REFERENCES public.users(id),
    institution text,
    course_language text DEFAULT 'English',
    course_image text,
    classification_data jsonb DEFAULT '{}',
    template_settings jsonb DEFAULT '{}',
    schedule_settings jsonb DEFAULT '{}',
    curriculum_data jsonb DEFAULT '{}',
    course_settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.users(id),
    course_id uuid REFERENCES public.courses(id),
    enrolled_at timestamptz DEFAULT now(),
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    UNIQUE(student_id, course_id)
);

-- NO RLS POLICIES - Full access for testing
-- Grant all permissions to everyone
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create storage bucket for courses
INSERT INTO storage.buckets (id, name)
VALUES ('courses', 'courses')
ON CONFLICT (id) DO NOTHING;

-- Create a simple function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'user_role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    role = COALESCE(EXCLUDED.role, users.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
