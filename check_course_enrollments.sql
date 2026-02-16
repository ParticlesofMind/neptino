-- Check if the course exists
SELECT id, course_name, teacher_id FROM public.courses WHERE id = '3b6a216a-3f4c-45bc-953c-68cb0003a18d';

-- Check all enrollments for this course
SELECT 
  e.id,
  e.course_id,
  e.student_id,
  e.status,
  e.metadata->>'first_name' as first_name,
  e.metadata->>'last_name' as last_name,
  e.metadata->>'email' as email,
  e.metadata->>'migrated_from_students' as migrated,
  u.email as user_email
FROM public.enrollments e
LEFT JOIN public.users u ON e.student_id = u.id
WHERE e.course_id = '3b6a216a-3f4c-45bc-953c-68cb0003a18d';

-- Check all enrollments (to see if any exist at all)
SELECT COUNT(*) as total_enrollments FROM public.enrollments;

-- Check all courses
SELECT id, course_name FROM public.courses LIMIT 10;

-- Check if there are any enrollments with different course_ids that might be the old data
SELECT DISTINCT course_id, COUNT(*) as count 
FROM public.enrollments 
GROUP BY course_id;
