-- ================================================================
-- CREATE STUDENTS TABLE FOR COURSE BUILDER ROSTERS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text UNIQUE,
    student_id text,
    grade_level text,
    learning_style jsonb DEFAULT '[]'::jsonb,
    assessment_score numeric,
    enrollment_date date DEFAULT (CURRENT_DATE),
    notes text,
    created_by uuid DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_students_course_id ON public.students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON public.students(grade_level);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_students_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE PROCEDURE public.set_students_updated_at();

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage roster" ON public.students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = students.course_id
        AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = students.course_id
        AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students read their own record" ON public.students
  FOR SELECT
  USING (
    email IS NOT NULL AND email = auth.email()
  );
