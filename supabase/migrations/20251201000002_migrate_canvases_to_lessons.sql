-- ================================================================
-- MIGRATE CANVASES TO USE LESSON_ID FOREIGN KEY
-- Idempotent: creates canvases table fresh on a clean DB;
-- runs the full data migration if the table already exists from a live system.
-- ================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'canvases'
  ) THEN
    -- ---- Live-system migration path ----

    -- Step 1: Add lesson_id column (nullable initially)
    ALTER TABLE public.canvases
      ADD COLUMN IF NOT EXISTS lesson_id uuid;

    -- Step 2: Back-fill lessons from canvas data
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
      ) AS title,
      jsonb_build_object(
        'canvas_count', COUNT(*),
        'migrated_from_canvases', true
      ) AS payload,
      MIN(c.created_at) AS created_at,
      MAX(c.updated_at) AS updated_at
    FROM public.canvases c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.course_id = c.course_id AND l.lesson_number = c.lesson_number
    )
    GROUP BY c.course_id, c.lesson_number
    ON CONFLICT (course_id, lesson_number) DO NOTHING;

    -- Step 3: Set lesson_id on each canvas row
    UPDATE public.canvases c
    SET lesson_id = l.id
    FROM public.lessons l
    WHERE c.course_id = l.course_id
      AND c.lesson_number = l.lesson_number
      AND c.lesson_id IS NULL;

    -- Step 4: Make lesson_id NOT NULL
    ALTER TABLE public.canvases
      ALTER COLUMN lesson_id SET NOT NULL;

    -- Step 5: Add foreign key
    ALTER TABLE public.canvases
      ADD CONSTRAINT canvases_lesson_fkey
      FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

    -- Step 6-7: Indexes
    DROP INDEX IF EXISTS idx_canvases_unique;
    CREATE UNIQUE INDEX idx_canvases_unique ON public.canvases(course_id, lesson_id, canvas_index);
    DROP INDEX IF EXISTS idx_canvases_course_lesson;
    CREATE INDEX idx_canvases_course_lesson ON public.canvases(course_id, lesson_id);
    CREATE INDEX idx_canvases_lesson_id ON public.canvases(lesson_id);

  ELSE
    -- ---- Fresh-database path: create canvases from scratch ----
    CREATE TABLE public.canvases (
      id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id      uuid        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
      lesson_id      uuid        NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
      lesson_number  integer,
      canvas_index   integer     NOT NULL DEFAULT 0,
      canvas_data    jsonb       NOT NULL DEFAULT '{}'::jsonb,
      canvas_metadata jsonb      NOT NULL DEFAULT '{}'::jsonb,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX idx_canvases_unique
      ON public.canvases(course_id, lesson_id, canvas_index);
    CREATE INDEX idx_canvases_course_lesson
      ON public.canvases(course_id, lesson_id);
    CREATE INDEX idx_canvases_lesson_id
      ON public.canvases(lesson_id);

  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.canvases.lesson_id IS 'Foreign key to lessons table. Replaces lesson_number as the primary relationship.';
COMMENT ON COLUMN public.canvases.lesson_number IS 'Denormalized lesson number kept for backward compatibility. Should match lessons.lesson_number.';

