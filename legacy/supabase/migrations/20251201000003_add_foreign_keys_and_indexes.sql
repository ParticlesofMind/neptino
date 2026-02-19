-- ================================================================
-- ADD MISSING FOREIGN KEYS AND PERFORMANCE INDEXES
-- ================================================================

-- Ensure templates.course_id has proper CASCADE constraint
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_course_id_fkey;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Ensure templates defaults are set
ALTER TABLE public.templates
  ALTER COLUMN template_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Create performance indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_templates_course ON public.templates(course_id);

-- Ensure enrollments has unique constraint (may already exist, but ensure it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enrollments_unique'
    AND conrelid = 'public.enrollments'::regclass
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_unique UNIQUE (student_id, course_id);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON INDEX idx_courses_teacher IS 'Fast lookup of courses by teacher';
COMMENT ON INDEX idx_enrollments_user IS 'Fast lookup of enrollments by student';
COMMENT ON INDEX idx_enrollments_course IS 'Fast lookup of enrollments by course';
COMMENT ON INDEX idx_templates_course IS 'Fast lookup of templates by course';

