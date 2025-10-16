-- ================================================================
-- ALIGN STUDENTS UPSERT CONSTRAINT WITH APPLICATION LOGIC
-- ================================================================

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_email_key;

ALTER TABLE public.students
  ADD CONSTRAINT students_course_id_email_key UNIQUE (course_id, email);
