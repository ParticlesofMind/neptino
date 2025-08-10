-- Enable RLS on courses table (if not already enabled)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Add missing UPDATE policy for courses
CREATE POLICY "Teachers may update their own courses" ON public.courses 
FOR UPDATE USING (auth.uid() = teacher_id);

-- Ensure we have all necessary policies
-- (INSERT and SELECT policies should already exist, but let's verify they're correct)

-- Update the existing policies to be more explicit
DROP POLICY IF EXISTS "Teachers may insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers may read their own courses" ON public.courses;

-- Recreate with better names and explicit checks
CREATE POLICY "teachers_can_insert_own_courses" ON public.courses 
FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "teachers_can_select_own_courses" ON public.courses 
FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "teachers_can_update_own_courses" ON public.courses 
FOR UPDATE USING (auth.uid() = teacher_id);

-- Optional: Add DELETE policy if needed
CREATE POLICY "teachers_can_delete_own_courses" ON public.courses 
FOR DELETE USING (auth.uid() = teacher_id);
