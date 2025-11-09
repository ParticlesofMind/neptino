-- Check if there are any users in the database
SELECT id, email, role FROM public.users LIMIT 5;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'courses';

-- Check RLS policies on courses
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'courses';
