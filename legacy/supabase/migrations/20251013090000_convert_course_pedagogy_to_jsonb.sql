-- Migration: Convert course_pedagogy column to JSONB
-- Created: 2025-10-13
-- Purpose: ensure pedagogy coordinates persist as structured data

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'courses'
          AND column_name = 'course_pedagogy_tmp'
    ) THEN
        ALTER TABLE public.courses
        ADD COLUMN course_pedagogy_tmp jsonb;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_course_pedagogy_to_jsonb(value text)
RETURNS jsonb AS $$
DECLARE
    parsed jsonb;
BEGIN
    IF value IS NULL OR length(trim(value)) = 0 THEN
        RETURN NULL;
    END IF;

    BEGIN
        parsed := value::jsonb;
        RETURN parsed;
    EXCEPTION WHEN others THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

UPDATE public.courses
SET course_pedagogy_tmp = COALESCE(
        public.safe_course_pedagogy_to_jsonb(course_pedagogy),
        CASE lower(coalesce(course_pedagogy, ''))
            WHEN 'guided discovery' THEN jsonb_build_object('x', -25, 'y', 75)
            WHEN 'traditional' THEN jsonb_build_object('x', -75, 'y', -75)
            WHEN 'progressive' THEN jsonb_build_object('x', 75, 'y', 75)
            WHEN 'balanced' THEN jsonb_build_object('x', 0, 'y', 0)
            WHEN 'behaviorism' THEN jsonb_build_object('x', -75, 'y', -75)
            WHEN 'cognitivism' THEN jsonb_build_object('x', 0, 'y', 50)
            WHEN 'constructivism' THEN jsonb_build_object('x', 25, 'y', 75)
            WHEN 'connectivism' THEN jsonb_build_object('x', 75, 'y', 50)
            ELSE NULL
        END
    )
WHERE course_pedagogy IS NOT NULL;

UPDATE public.courses
SET course_pedagogy_tmp = jsonb_build_object('x', 0, 'y', 0)
WHERE course_pedagogy_tmp IS NULL;

ALTER TABLE public.courses
ALTER COLUMN course_pedagogy_tmp SET DEFAULT jsonb_build_object('x', 0, 'y', 0);

ALTER TABLE public.courses
DROP COLUMN course_pedagogy;

ALTER TABLE public.courses
RENAME COLUMN course_pedagogy_tmp TO course_pedagogy;

DROP FUNCTION IF EXISTS public.safe_course_pedagogy_to_jsonb(text);
