-- ================================================================
-- CREATE LESSONS TABLE FOR NORMALIZED LESSON DATA
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL,
  title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT lessons_course_unique_num UNIQUE (course_id, lesson_number)
);

-- Create indexes for performance
CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_course_number ON public.lessons(course_id, lesson_number);

-- Add comments for documentation
COMMENT ON TABLE public.lessons IS 'Normalized lessons table. Each lesson belongs to a course and has a unique lesson_number within that course.';
COMMENT ON COLUMN public.lessons.lesson_number IS 'Lesson number within the course (1, 2, 3, ...)';
COMMENT ON COLUMN public.lessons.payload IS 'JSONB payload for lesson-specific data and metadata';

