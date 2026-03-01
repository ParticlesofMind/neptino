-- ================================================================
-- CONSOLIDATE COURSES TABLE CLEANUP
--
-- 1. Drop two dead columns:
--    course_pedagogy   — duplicate; pedagogy data lives in course_layout.pedagogy
--    resources_settings — never referenced by any frontend code
--
-- 2. Move visualDensity + bodyBlockGap out of template_settings.ui and into
--    course_layout, where they belong (layout/rendering preferences, not
--    template configuration).
--
-- 3. Strip the ui key from template_settings so that column stores only the
--    templates[] array going forward.
--
-- 4. Update the course_layout column default to include these two keys so
--    every new course row starts with them.
-- ================================================================

-- ── Step 1: Migrate visualDensity + bodyBlockGap into course_layout ──────────
-- Source: template_settings -> 'ui' -> 'visualDensity' / 'bodyBlockGap'
-- All existing rows get the values they already chose (or defaults if absent).

UPDATE public.courses
SET course_layout = course_layout || jsonb_build_object(
  'visualDensity',
    COALESCE(
      template_settings #>> '{ui,visualDensity}',
      'balanced'
    ),
  'bodyBlockGap',
    COALESCE(
      (template_settings #>> '{ui,bodyBlockGap}')::int,
      8
    )
);

-- ── Step 2: Strip the ui sub-key from template_settings ──────────────────────
-- Keep only the templates array; ui state is ephemeral / owned by course_layout.

UPDATE public.courses
SET template_settings = template_settings - 'ui'
WHERE template_settings ? 'ui';

-- ── Step 3: Drop dead columns ─────────────────────────────────────────────────

ALTER TABLE public.courses DROP COLUMN IF EXISTS course_pedagogy;
ALTER TABLE public.courses DROP COLUMN IF EXISTS resources_settings;

-- ── Step 4: Update column default for new course rows ────────────────────────

ALTER TABLE public.courses
  ALTER COLUMN course_layout
  SET DEFAULT '{"margins": {"top": 20, "left": 20, "unit": "mm", "right": 20, "bottom": 20}, "canvas_size": "a4", "orientation": "portrait", "visualDensity": "balanced", "bodyBlockGap": 8}'::jsonb;
