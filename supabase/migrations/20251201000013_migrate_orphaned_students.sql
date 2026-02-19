-- ================================================================
-- MIGRATE ORPHANED STUDENTS (STUDENTS WITHOUT MATCHING USERS)
-- This migration handles students that don't have matching user accounts
-- ================================================================

-- Step 1: Check if students table still exists
DO $$
DECLARE
  students_table_exists boolean;
  orphan_count integer;
BEGIN
  -- Check if students table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'students'
  ) INTO students_table_exists;

  IF NOT students_table_exists THEN
    RAISE NOTICE 'Students table does not exist. Migration may have already run.';
    RETURN;
  END IF;

  -- Count orphaned students (students without matching users)
  SELECT COUNT(*) INTO orphan_count
  FROM public.students s
  WHERE s.email IS NULL 
     OR NOT EXISTS (
       SELECT 1 FROM public.users u WHERE u.email = s.email
     );

  IF orphan_count = 0 THEN
    RAISE NOTICE 'No orphaned students found.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % orphaned students. Creating users and enrollments...', orphan_count;

  -- Step 2: Create users for students that don't have matching users
  -- Use email if available, otherwise generate a placeholder
  INSERT INTO public.users (id, email, first_name, last_name, role, created_at)
  SELECT 
    gen_random_uuid() as id,
    COALESCE(
      s.email,
      'student_' || s.id::text || '@migrated.local'
    ) as email,
    s.first_name,
    s.last_name,
    'student'::user_role as role,
    COALESCE(s.created_at, now()) as created_at
  FROM public.students s
  WHERE (s.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = s.email
  ))
  AND NOT EXISTS (
    -- Don't create duplicate users
    SELECT 1 FROM public.users u 
    WHERE u.email = COALESCE(s.email, 'student_' || s.id::text || '@migrated.local')
  )
  ON CONFLICT (email) DO NOTHING;

  -- Step 3: Create enrollments for all students (including newly created users)
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
      'migrated_at', now(),
      'was_orphaned', (s.email IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.users u2 WHERE u2.email = s.email
      ))
    ) as metadata
  FROM public.students s
  INNER JOIN public.users u ON u.email = COALESCE(
    s.email,
    'student_' || s.id::text || '@migrated.local'
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = u.id AND e.course_id = s.course_id
  )
  ON CONFLICT (student_id, course_id) DO NOTHING;

  RAISE NOTICE 'Migration complete. Created users and enrollments for orphaned students.';
END $$;

