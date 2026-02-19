-- ================================================================
-- ADD COURSE_TYPE COLUMN TO COURSES TABLE
-- ================================================================

-- Add course_type column to track delivery method
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_type text 
CHECK (course_type IN ('In-person', 'Online', 'Hybrid'));

-- Add comment to document the column purpose
COMMENT ON COLUMN public.courses.course_type IS 'Course delivery method: In-person, Online, or Hybrid';

