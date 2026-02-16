-- Check enrollments with metadata
SELECT 
  e.id,
  e.course_id,
  e.student_id,
  e.status,
  e.metadata->>'first_name' as first_name,
  e.metadata->>'last_name' as last_name,
  e.metadata->>'email' as email_from_metadata,
  u.email as user_email,
  c.course_name
FROM public.enrollments e
LEFT JOIN public.users u ON e.student_id = u.id
LEFT JOIN public.courses c ON e.course_id = c.id
LIMIT 20;

-- Count enrollments
SELECT COUNT(*) as enrollment_count FROM public.enrollments;

-- Check if students table still exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'students'
) as students_table_exists;

-- If students table exists, check its data
SELECT COUNT(*) as students_count FROM public.students;
