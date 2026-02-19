-- ================================================================
-- FIX RLS RECURSION BETWEEN COURSES AND ENROLLMENTS
-- ================================================================

-- Helper: is the current user the teacher for a course?
CREATE OR REPLACE FUNCTION public.is_course_teacher(course_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_uuid
      AND c.teacher_id = auth.uid()
  );
$$;

-- Helper: is the current user enrolled in a course?
CREATE OR REPLACE FUNCTION public.is_course_enrolled(course_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.course_id = course_uuid
      AND e.student_id = auth.uid()
      AND e.status = 'active'
  );
$$;

-- Reset course policies to avoid recursion
DROP POLICY IF EXISTS courses_owner_all ON public.courses;
DROP POLICY IF EXISTS courses_student_view ON public.courses;
DROP POLICY IF EXISTS "Teachers read course data" ON public.courses;
DROP POLICY IF EXISTS "Teachers create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers update their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers delete their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers and students read course data" ON public.courses;

CREATE POLICY courses_owner_all ON public.courses
  FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY courses_student_view ON public.courses
  FOR SELECT
  USING (public.is_course_enrolled(id));

-- Reset enrollment policies to avoid recursion
DROP POLICY IF EXISTS enrollments_self_view ON public.enrollments;
DROP POLICY IF EXISTS enrollments_self_insert ON public.enrollments;
DROP POLICY IF EXISTS enrollments_self_update ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_view ON public.enrollments;
DROP POLICY IF EXISTS enrollments_teacher_all ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students delete enrollments" ON public.enrollments;

CREATE POLICY enrollments_self_view ON public.enrollments
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY enrollments_self_insert ON public.enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY enrollments_self_update ON public.enrollments
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY enrollments_teacher_view ON public.enrollments
  FOR SELECT
  USING (public.is_course_teacher(course_id));

CREATE POLICY enrollments_teacher_all ON public.enrollments
  FOR ALL
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));
