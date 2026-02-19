-- ================================================================
-- CREATE POSTGRESQL ENUMS AND MIGRATE EXISTING DATA
-- ================================================================

-- Create enum types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE template_kind AS ENUM ('lesson', 'module_orientation', 'assessment', 'worksheet');

-- Migrate users.role to enum
-- First drop CHECK constraint, default, change type, then restore default
DO $$ 
BEGIN
  -- Drop CHECK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.users'::regclass 
    AND conname LIKE '%role%' 
    AND contype = 'c'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE public.users 
  ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users 
  ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'student'::user_role;

-- Migrate enrollments.status to enum
-- First drop CHECK constraint, default, change type, then restore default
DO $$ 
BEGIN
  -- Drop CHECK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.enrollments'::regclass 
    AND conname LIKE '%status%' 
    AND contype = 'c'
  ) THEN
    ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_status_check;
  END IF;
END $$;

ALTER TABLE public.enrollments 
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.enrollments 
  ALTER COLUMN status TYPE enrollment_status USING status::enrollment_status;
ALTER TABLE public.enrollments 
  ALTER COLUMN status SET DEFAULT 'active'::enrollment_status;

-- Migrate templates.template_type to enum
-- First drop the default, change type, then restore default
ALTER TABLE public.templates 
  ALTER COLUMN template_type DROP DEFAULT;
ALTER TABLE public.templates 
  ALTER COLUMN template_type TYPE template_kind USING template_type::template_kind;
ALTER TABLE public.templates 
  ALTER COLUMN template_type SET DEFAULT 'lesson'::template_kind;

-- Add comments for documentation
COMMENT ON TYPE user_role IS 'User role in the system: student, teacher, or admin';
COMMENT ON TYPE enrollment_status IS 'Enrollment status: active, completed, or dropped';
COMMENT ON TYPE template_kind IS 'Template type: lesson, module_orientation, assessment, or worksheet';

