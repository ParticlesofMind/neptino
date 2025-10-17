-- ================================================================
-- CORE TABLE RLS POLICIES FOR COURSES, USERS, ENROLLMENTS, TEMPLATES
-- ================================================================

-- Ensure row level security is active on all relevant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Users table policies -------------------------------------------------------
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

CREATE POLICY "Users read own profile" ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users update own profile" ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Courses table policies -----------------------------------------------------
DROP POLICY IF EXISTS "Teachers and students read course data" ON public.courses;
DROP POLICY IF EXISTS "Teachers read course data" ON public.courses;
DROP POLICY IF EXISTS "Teachers create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers update their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers delete their courses" ON public.courses;

CREATE POLICY "Teachers read course data" ON public.courses
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers create courses" ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers update their courses" ON public.courses
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers delete their courses" ON public.courses
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- Enrollments table policies -------------------------------------------------
DROP POLICY IF EXISTS "Teachers or students read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students delete enrollments" ON public.enrollments;

CREATE POLICY "Teachers or students read enrollments" ON public.enrollments
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers or students insert enrollments" ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers or students update enrollments" ON public.enrollments
FOR UPDATE
TO authenticated
USING (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.teacher_id = auth.uid()
    )
)
WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.teacher_id = auth.uid()
    )
);

CREATE POLICY "Teachers or students delete enrollments" ON public.enrollments
FOR DELETE
TO authenticated
USING (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = enrollments.course_id
          AND c.teacher_id = auth.uid()
    )
);

-- Templates table policies ---------------------------------------------------
DROP POLICY IF EXISTS "Template owners read templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners insert templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners update templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners delete templates" ON public.templates;

CREATE POLICY "Template owners read templates" ON public.templates
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Template owners insert templates" ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Template owners update templates" ON public.templates
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Template owners delete templates" ON public.templates
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
