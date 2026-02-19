-- ================================================================
-- ADD CURRICULUM CONSISTENCY VALIDATION TRIGGER
-- ================================================================

-- Step 1: Create function to validate course_sessions matches lesson count
CREATE OR REPLACE FUNCTION validate_course_sessions()
RETURNS TRIGGER AS $$
DECLARE 
  lesson_count integer;
BEGIN
  -- Only validate if course_sessions is not NULL
  IF NEW.course_sessions IS NOT NULL THEN
    -- Count lessons for this course
    SELECT COUNT(*) INTO lesson_count
    FROM public.lessons
    WHERE course_id = NEW.id;
    
    -- If course_sessions doesn't match lesson count, raise exception
    -- Allow some flexibility: if no lessons exist yet, course_sessions can be set
    IF lesson_count > 0 AND NEW.course_sessions <> lesson_count THEN
      RAISE EXCEPTION 'course_sessions (%) must equal lessons count (%) for course %', 
        NEW.course_sessions, lesson_count, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on courses table
DROP TRIGGER IF EXISTS courses_session_check ON public.courses;
CREATE TRIGGER courses_session_check
  BEFORE UPDATE ON public.courses
  FOR EACH ROW 
  WHEN (NEW.course_sessions IS DISTINCT FROM OLD.course_sessions)
  EXECUTE FUNCTION validate_course_sessions();

-- Step 3: Create function to auto-update course_sessions when lessons change
-- This is optional but helpful for maintaining consistency
CREATE OR REPLACE FUNCTION sync_course_sessions_from_lessons()
RETURNS TRIGGER AS $$
DECLARE
  lesson_count integer;
BEGIN
  -- Count lessons for the affected course
  SELECT COUNT(*) INTO lesson_count
  FROM public.lessons
  WHERE course_id = COALESCE(NEW.course_id, OLD.course_id);
  
  -- Update course_sessions to match lesson count
  UPDATE public.courses
  SET course_sessions = lesson_count
  WHERE id = COALESCE(NEW.course_id, OLD.course_id)
    AND (course_sessions IS NULL OR course_sessions <> lesson_count);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create triggers to sync course_sessions when lessons are added/removed
DROP TRIGGER IF EXISTS sync_sessions_on_lesson_insert ON public.lessons;
CREATE TRIGGER sync_sessions_on_lesson_insert
  AFTER INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION sync_course_sessions_from_lessons();

DROP TRIGGER IF EXISTS sync_sessions_on_lesson_delete ON public.lessons;
CREATE TRIGGER sync_sessions_on_lesson_delete
  AFTER DELETE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION sync_course_sessions_from_lessons();

-- Add comments for documentation
COMMENT ON FUNCTION validate_course_sessions() IS 'Validates that course_sessions matches the count of lessons for a course';
COMMENT ON FUNCTION sync_course_sessions_from_lessons() IS 'Automatically syncs course_sessions with lesson count when lessons are added or removed';

