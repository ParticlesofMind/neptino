-- Let QR/link visitors read launched courses before they are enrolled.
-- Enrollment itself is still limited by the enrollments table policies.

DROP POLICY IF EXISTS courses_published_join_view ON public.courses;

CREATE POLICY courses_published_join_view ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (
    visibility_settings @> '{"visible": true, "enrollment": true}'::jsonb
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
  END IF;
END $$;
