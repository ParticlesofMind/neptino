-- ================================================================
-- MIGRATE CANVASES TO USE LESSON_ID FOREIGN KEY
-- ================================================================

-- Step 1: Add lesson_id column to canvases (nullable initially)
ALTER TABLE public.canvases
  ADD COLUMN IF NOT EXISTS lesson_id uuid;

-- Step 2: Create lesson rows from existing canvas data
-- Group by (course_id, lesson_number) and create one lesson per unique combination
INSERT INTO public.lessons (course_id, lesson_number, title, payload, created_at, updated_at)
SELECT 
  c.course_id,
  c.lesson_number,
  COALESCE(
    (SELECT canvas_metadata->>'title' FROM public.canvases 
     WHERE course_id = c.course_id AND lesson_number = c.lesson_number 
     AND canvas_metadata->>'title' IS NOT NULL 
     LIMIT 1),
    'Lesson ' || c.lesson_number::text
  ) as title,
  jsonb_build_object(
    'canvas_count', COUNT(*),
    'migrated_from_canvases', true
  ) as payload,
  MIN(c.created_at) as created_at,
  MAX(c.updated_at) as updated_at
FROM public.canvases c
WHERE NOT EXISTS (
  SELECT 1 FROM public.lessons l
  WHERE l.course_id = c.course_id AND l.lesson_number = c.lesson_number
)
GROUP BY c.course_id, c.lesson_number
ON CONFLICT (course_id, lesson_number) DO NOTHING;

-- Step 3: Update canvases to set lesson_id
UPDATE public.canvases c
SET lesson_id = l.id
FROM public.lessons l
WHERE c.course_id = l.course_id
  AND c.lesson_number = l.lesson_number
  AND c.lesson_id IS NULL;

-- Step 4: Make lesson_id NOT NULL after migration
ALTER TABLE public.canvases
  ALTER COLUMN lesson_id SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE public.canvases
  ADD CONSTRAINT canvases_lesson_fkey 
  FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Step 6: Drop old unique index and create new one with lesson_id
DROP INDEX IF EXISTS idx_canvases_unique;
CREATE UNIQUE INDEX idx_canvases_unique ON public.canvases(course_id, lesson_id, canvas_index);

-- Step 7: Update existing index to include lesson_id for performance
DROP INDEX IF EXISTS idx_canvases_course_lesson;
CREATE INDEX idx_canvases_course_lesson ON public.canvases(course_id, lesson_id);
CREATE INDEX idx_canvases_lesson_id ON public.canvases(lesson_id);

-- Add comment for documentation
COMMENT ON COLUMN public.canvases.lesson_id IS 'Foreign key to lessons table. Replaces lesson_number as the primary relationship.';
COMMENT ON COLUMN public.canvases.lesson_number IS 'Denormalized lesson number kept for backward compatibility. Should match lessons.lesson_number.';

