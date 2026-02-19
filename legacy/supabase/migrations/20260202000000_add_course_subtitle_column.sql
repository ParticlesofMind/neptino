-- ================================================================
-- ADD COURSE_SUBTITLE COLUMN TO COURSES TABLE
-- ================================================================

-- Add course_subtitle column as optional (nullable) text field
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_subtitle text;

-- Add comment to document the column
COMMENT ON COLUMN public.courses.course_subtitle IS 'Optional subtitle for the course';

