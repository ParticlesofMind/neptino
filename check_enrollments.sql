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
  c.course_name,
  e.metadata->>'migrated_from_students' as migrated
FROM public.enrollments e
LEFT JOIN public.users u ON e.student_id = u.id
LEFT JOIN public.courses c ON e.course_id = c.id
ORDER BY e.created_at DESC
LIMIT 20;

-- Count enrollments by course
SELECT 
  c.course_name,
  COUNT(e.id) as enrollment_count
FROM public.courses c
LEFT JOIN public.enrollments e ON e.course_id = c.id
GROUP BY c.id, c.course_name
ORDER BY enrollment_count DESC;
