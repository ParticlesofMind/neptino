-- ================================================================
-- RECOVER STUDENTS FROM BACKUP (IF AVAILABLE)
-- This migration can be used to recover students data if you have a backup
-- ================================================================
--
-- INSTRUCTIONS:
-- 1. If you have a backup of the students table, restore it first:
--    CREATE TABLE public.students_backup AS SELECT * FROM [your_backup];
--
-- 2. Then run this migration to migrate all students (including orphans)
--
-- 3. This will create users for students without matching emails
-- ================================================================

-- Step 1: Check if students_backup table exists
DO $$
DECLARE
  backup_exists boolean;
  student_count integer;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'students_backup'
  ) INTO backup_exists;

  IF NOT backup_exists THEN
    RAISE NOTICE 'No students_backup table found.';
    RAISE NOTICE 'To recover students:';
    RAISE NOTICE '1. Restore your students table backup as "students_backup"';
    RAISE NOTICE '2. Run this migration again';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO student_count FROM public.students_backup;
  RAISE NOTICE 'Found % students in backup. Starting recovery...', student_count;

  -- Step 2: Create users for all students (even without emails)
  INSERT INTO public.users (id, email, first_name, last_name, role, created_at)
  SELECT DISTINCT ON (COALESCE(sb.email, 'student_' || sb.id::text))
    gen_random_uuid() as id,
    COALESCE(
      sb.email,
      'student_' || sb.id::text || '@migrated.local'
    ) as email,
    sb.first_name,
    sb.last_name,
    'student'::user_role as role,
    COALESCE(sb.created_at, now()) as created_at
  FROM public.students_backup sb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = COALESCE(sb.email, 'student_' || sb.id::text || '@migrated.local')
  )
  ON CONFLICT (email) DO NOTHING;

  -- Step 3: Create enrollments for all students
  INSERT INTO public.enrollments (student_id, course_id, enrolled_at, status, metadata)
  SELECT 
    u.id as student_id,
    sb.course_id,
    COALESCE(sb.enrollment_date::timestamptz, sb.created_at, now()) as enrolled_at,
    'active'::enrollment_status as status,
    jsonb_build_object(
      'first_name', sb.first_name,
      'last_name', sb.last_name,
      'email', sb.email,
      'grade_level', sb.grade_level,
      'learning_style', sb.learning_style,
      'notes', sb.notes,
      'assessment_score', sb.assessment_score,
      'enrollment_date', sb.enrollment_date,
      'student_id', sb.student_id,
      'created_by', sb.created_by,
      'synced_at', sb.synced_at,
      'recovered_from_backup', true,
      'recovered_at', now()
    ) as metadata
  FROM public.students_backup sb
  INNER JOIN public.users u ON u.email = COALESCE(
    sb.email,
    'student_' || sb.id::text || '@migrated.local'
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = u.id AND e.course_id = sb.course_id
  )
  ON CONFLICT (student_id, course_id) DO NOTHING;

  RAISE NOTICE 'Recovery complete!';
  RAISE NOTICE 'You can now drop the students_backup table if recovery was successful.';
END $$;

