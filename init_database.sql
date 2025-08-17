-- ================================================================
-- CREATE BASIC TABLES FOR DOCKER POSTGRESQL
-- ================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    role text DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    institution text,
    language text DEFAULT 'en',
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
    course_language text DEFAULT 'en',
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

-- Create templates table
CREATE TABLE IF NOT EXISTS public.course_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name text NOT NULL,
    template_description text,
    template_data jsonb NOT NULL DEFAULT '{}',
    category text DEFAULT 'general',
    is_public boolean DEFAULT false,
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add course_sessions column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_sessions integer DEFAULT NULL;

-- Update default course settings with margin values
UPDATE public.courses 
SET course_settings = COALESCE(course_settings, '{}'::jsonb) || jsonb_build_object(
    'margins', jsonb_build_object(
        'top', 50,
        'right', 50,
        'bottom', 50,
        'left', 50
    )
)
WHERE course_settings IS NULL OR course_settings->>'margins' IS NULL;
