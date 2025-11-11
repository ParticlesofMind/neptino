-- Adjust default course layout margins from 25.4mm (1") to 20mm

ALTER TABLE public.courses
ALTER COLUMN course_layout SET DEFAULT '{
  "margins": {
    "top": 20,
    "bottom": 20,
    "left": 20,
    "right": 20,
    "unit": "mm"
  },
  "orientation": "portrait",
  "canvas_size": "a4"
}'::jsonb;

WITH standardized AS (
  SELECT
    id,
    COALESCE(course_layout, '{}'::jsonb) AS layout
  FROM public.courses
)
UPDATE public.courses AS c
SET course_layout = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            standardized.layout,
            '{margins,top}', to_jsonb(20::numeric), true
          ),
          '{margins,bottom}', to_jsonb(20::numeric), true
        ),
        '{margins,left}', to_jsonb(20::numeric), true
      ),
      '{margins,right}', to_jsonb(20::numeric), true
    ),
    '{margins,unit}', to_jsonb('mm'::text), true
  )
FROM standardized
WHERE c.id = standardized.id
  AND (
    standardized.layout = '{}'::jsonb
    OR (
      (standardized.layout->'margins'->>'top')::numeric = 25.4
      AND (standardized.layout->'margins'->>'bottom')::numeric = 25.4
      AND (standardized.layout->'margins'->>'left')::numeric = 25.4
      AND (standardized.layout->'margins'->>'right')::numeric = 25.4
    )
  );
