-- Add institution column to users table
ALTER TABLE public.users 
ADD COLUMN institution text DEFAULT 'Independent';

-- Add course_language column to courses table  
ALTER TABLE public.courses
ADD COLUMN course_language text;

-- Add comment for the new columns
COMMENT ON COLUMN public.users.institution IS 'Institution the user belongs to, defaults to Independent for freelance teachers';
COMMENT ON COLUMN public.courses.course_language IS 'Primary language the course is taught in';
