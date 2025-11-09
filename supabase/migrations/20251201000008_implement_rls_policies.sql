-- ================================================================
-- IMPLEMENT COMPREHENSIVE RLS POLICIES
-- ================================================================

-- Step 1: Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies that we'll replace
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Users insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Teachers read course data" ON public.courses;
DROP POLICY IF EXISTS "Teachers create courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers update their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers delete their courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view canvases for their courses" ON public.canvases;
DROP POLICY IF EXISTS "Users can insert canvases for their courses" ON public.canvases;
DROP POLICY IF EXISTS "Users can update canvases for their courses" ON public.canvases;
DROP POLICY IF EXISTS "Users can delete canvases for their courses" ON public.canvases;
DROP POLICY IF EXISTS "Template owners read templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners insert templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners update templates" ON public.templates;
DROP POLICY IF EXISTS "Template owners delete templates" ON public.templates;
DROP POLICY IF EXISTS "Teachers or students read enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers or students delete enrollments" ON public.enrollments;

-- Step 3: Users table policies - self access only
CREATE POLICY users_self_select ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY users_self_insert ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Step 4: Courses table policies - teacher owns, students can view if enrolled
CREATE POLICY courses_owner_all ON public.courses
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY courses_student_view ON public.courses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = courses.id 
      AND e.student_id = auth.uid() 
      AND e.status = 'active'
  ));

-- Step 5: Lessons table policies - inherit course permissions
CREATE POLICY lessons_course_perm ON public.lessons
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = lessons.course_id 
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.enrollments e 
          WHERE e.course_id = c.id 
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
      )
  ));

-- Step 6: Canvases table policies - inherit course permissions
CREATE POLICY canvases_course_perm ON public.canvases
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = canvases.course_id 
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.enrollments e 
          WHERE e.course_id = c.id 
            AND e.student_id = auth.uid()
            AND e.status = 'active'
        )
      )
  ));

-- Step 7: Templates table policies - owner access
CREATE POLICY templates_owner_all ON public.templates
  FOR ALL USING (created_by = auth.uid());

-- Step 8: Enrollments table policies - self-view and teacher view
CREATE POLICY enrollments_self_view ON public.enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY enrollments_self_insert ON public.enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY enrollments_self_update ON public.enrollments
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY enrollments_teacher_view ON public.enrollments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = enrollments.course_id 
      AND c.teacher_id = auth.uid()
  ));

CREATE POLICY enrollments_teacher_all ON public.enrollments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.courses c 
    WHERE c.id = enrollments.course_id 
      AND c.teacher_id = auth.uid()
  ));

