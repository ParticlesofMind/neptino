-- ================================================================
-- RENAME COURSE_DAYS COLUMN TO COURSE_SESSIONS
-- ================================================================

-- Rename the course_days column to course_sessions
ALTER TABLE public.courses 
RENAME COLUMN course_days TO course_sessions;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.courses.course_sessions IS 'Total number of scheduled sessions/lessons in the course';
