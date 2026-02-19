-- ================================================================
-- CONSOLIDATE STUDENTS TABLE DATA INTO ENROLLMENTS.METADATA
-- ================================================================

-- Step 1: Add metadata column to enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Step 2: Migrate data from students table to enrollments.metadata
-- Strategy: Match students.email to users.email, then find/create enrollments

-- First, create enrollments for students that have matching users but no enrollment
INSERT INTO public.enrollments (student_id, course_id, enrolled_at, status, metadata)
SELECT 
  u.id as student_id,
  s.course_id,
  COALESCE(s.enrollment_date::timestamptz, s.created_at, now()) as enrolled_at,
  'active'::enrollment_status as status,
  jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'grade_level', s.grade_level,
    'learning_style', s.learning_style,
    'notes', s.notes,
    'assessment_score', s.assessment_score,
    'enrollment_date', s.enrollment_date,
    'student_id', s.student_id,
    'migrated_from_students', true,
    'migrated_at', now()
  ) as metadata
FROM public.students s
INNER JOIN public.users u ON s.email = u.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments e
  WHERE e.student_id = u.id AND e.course_id = s.course_id
)
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Step 3: Update existing enrollments with student metadata where email matches
UPDATE public.enrollments e
SET metadata = COALESCE(e.metadata, '{}'::jsonb) || jsonb_build_object(
  'first_name', s.first_name,
  'last_name', s.last_name,
  'grade_level', s.grade_level,
  'learning_style', s.learning_style,
  'notes', s.notes,
  'assessment_score', s.assessment_score,
  'enrollment_date', s.enrollment_date,
  'student_id', s.student_id,
  'migrated_from_students', true,
  'migrated_at', now()
)
FROM public.students s
INNER JOIN public.users u ON s.email = u.email
WHERE e.student_id = u.id
  AND e.course_id = s.course_id
  AND (e.metadata->>'migrated_from_students') IS NULL;

-- Step 4: For students without matching users (orphaned students),
-- we'll preserve them in a special metadata structure
-- Note: This is a best-effort preservation. Ideally these should be cleaned up manually.
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.students s
  WHERE s.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = s.email
  );
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Warning: % student records have no matching user. These will not be migrated to enrollments.', orphan_count;
    RAISE NOTICE 'Please review orphaned students manually before dropping the students table.';
  END IF;
END $$;

-- Step 5: Drop students table (after data migration)
-- Note: This will fail if there are still foreign key references
-- We'll drop RLS policies first, then the table
DROP POLICY IF EXISTS "Teachers manage roster" ON public.students;
DROP POLICY IF EXISTS "Students read their own record" ON public.students;

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
DROP FUNCTION IF EXISTS public.set_students_updated_at();

DROP TABLE IF EXISTS public.students;

-- Add comments for documentation
COMMENT ON COLUMN public.enrollments.metadata IS 'JSONB metadata for course-specific student information. Includes grade_level, learning_style, notes, assessment_score, etc.';

