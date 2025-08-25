-- Debug script to check schedule_settings in courses table
SELECT 
    id,
    course_name,
    schedule_settings,
    course_sessions,
    created_at
FROM courses 
WHERE schedule_settings IS NOT NULL
ORDER BY created_at DESC;

-- Also check if there are any courses at all
SELECT COUNT(*) as total_courses FROM courses;

-- Check the structure of schedule_settings
SELECT 
    id,
    course_name,
    jsonb_array_length(schedule_settings) as session_count,
    schedule_settings->0 as first_session_sample
FROM courses 
WHERE schedule_settings IS NOT NULL 
  AND jsonb_typeof(schedule_settings) = 'array'
LIMIT 3;
