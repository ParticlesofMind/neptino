-- ================================================================
-- RENAME CONTENT PHASES: instruction_area/student_area/teacher_area
--   → instruction / practice / feedback
--
-- Research basis: "The Science of Lesson Structure" (Neptino, 2026)
-- The three phases are renamed from actor-labels to activity-labels:
--   Instruction Area  → Instruction  (Gagné events 1–5, Rosenshine 1–4)
--   Student Area      → Practice     (Active learning, Rosenshine 5–9)
--   Teacher Area      → Feedback     (Hattie & Timperley 2007, d = 0.73)
--
-- Affected JSONB columns:
--   courses.template_settings   — per-course template field-enabled config
--   templates.template_data     — per-template field-enabled config
--   canvas_documents.document   — stored media drop-zone keys (best-effort)
-- ================================================================

-- ─── Helper: rename the three area keys inside a single fieldEnabled block ───

CREATE OR REPLACE FUNCTION public.rename_task_area_keys(obj jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE WHEN obj IS NULL THEN NULL
    ELSE
      (obj - 'instruction_area' - 'student_area' - 'teacher_area')
      || CASE WHEN obj ? 'instruction_area' THEN jsonb_build_object('instruction', obj->'instruction_area') ELSE '{}'::jsonb END
      || CASE WHEN obj ? 'student_area'     THEN jsonb_build_object('practice',    obj->'student_area')     ELSE '{}'::jsonb END
      || CASE WHEN obj ? 'teacher_area'     THEN jsonb_build_object('feedback',    obj->'teacher_area')     ELSE '{}'::jsonb END
    END
$$;

-- ─── Helper: update fieldEnabled within a single serialised LocalTemplate ────

CREATE OR REPLACE FUNCTION public.update_template_field_enabled(tpl jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE WHEN tpl IS NULL THEN NULL
         WHEN NOT (tpl ? 'fieldEnabled') THEN tpl
    ELSE
      tpl || jsonb_build_object(
        'fieldEnabled',
        (
          SELECT jsonb_object_agg(
            block_key,
            CASE block_key
              WHEN 'content'    THEN public.rename_task_area_keys(block_val)
              WHEN 'assignment' THEN public.rename_task_area_keys(block_val)
              ELSE block_val
            END
          )
          FROM jsonb_each(tpl->'fieldEnabled') AS t(block_key, block_val)
        )
      )
    END
$$;

-- ─── 1. courses.template_settings ────────────────────────────────────────────
-- Structure: { "templates": [ { "fieldEnabled": { "content": {...}, ... } }, ... ], "ui": {...} }

UPDATE public.courses
SET template_settings =
  CASE
    WHEN template_settings ? 'templates' THEN
      (template_settings - 'templates')
      || jsonb_build_object(
           'templates',
           (
             SELECT jsonb_agg(public.update_template_field_enabled(tpl))
             FROM jsonb_array_elements(template_settings->'templates') AS tpl
           )
         )
    ELSE template_settings
  END
WHERE template_settings IS NOT NULL
  AND template_settings != '{}'::jsonb
  AND template_settings::text ~ '(instruction_area|student_area|teacher_area)';

-- ─── 2. templates.template_data ──────────────────────────────────────────────
-- Structure: { "fieldEnabled": { "content": {...}, "assignment": {...}, ... }, ... }

UPDATE public.templates
SET template_data = public.update_template_field_enabled(template_data)
WHERE template_data IS NOT NULL
  AND template_data ? 'fieldEnabled'
  AND template_data::text ~ '(instruction_area|student_area|teacher_area)';

-- ─── 3. canvas_documents.document ────────────────────────────────────────────
-- Drop-zone keys embed the area kind: "content:key:<hash>:student" / ":teacher"
-- Replace suffix patterns that match the task area key format.
-- Pattern is highly specific (block:key:alphanum~:area) — collision risk is minimal.

UPDATE public.canvas_documents
SET document = (
  replace(
    replace(
      document::text,
      ':student"',  ':practice"'
    ),
    ':teacher"',  ':feedback"'
  )
)::jsonb
WHERE document::text ~ ':(student|teacher)"';

-- ─── 4. canvas_document_ops.operation_payload ────────────────────────────────

UPDATE public.canvas_document_ops
SET operation_payload = (
  replace(
    replace(
      operation_payload::text,
      ':student"',  ':practice"'
    ),
    ':teacher"',  ':feedback"'
  )
)::jsonb
WHERE operation_payload::text ~ ':(student|teacher)"';

-- ─── Clean up migration-only helper functions ─────────────────────────────────

DROP FUNCTION IF EXISTS public.update_template_field_enabled(jsonb);
DROP FUNCTION IF EXISTS public.rename_task_area_keys(jsonb);
