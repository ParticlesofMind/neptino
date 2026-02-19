-- Update default course layout margins to match new header/footer sizing

ALTER TABLE public.courses
ALTER COLUMN course_layout SET DEFAULT '{
  "margins": {
    "top": 25.4,
    "bottom": 25.4,
    "left": 25.4,
    "right": 25.4,
    "unit": "mm"
  },
  "orientation": "portrait",
  "canvas_size": "a4"
}'::jsonb;

WITH normalized AS (
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
            normalized.layout,
            '{margins,top}',         to_jsonb(25.4::numeric), true
          ),
          '{margins,bottom}',      to_jsonb(25.4::numeric), true
        ),
        '{margins,left}',         to_jsonb(25.4::numeric), true
      ),
      '{margins,right}',          to_jsonb(25.4::numeric), true
    ),
    '{margins,unit}',             to_jsonb('mm'::text), true
  )
FROM normalized
WHERE c.id = normalized.id
    AND (
      normalized.layout = '{}'::jsonb
    OR (
      COALESCE((normalized.layout->'margins'->>'top')::numeric,    25.4) = 25.4
      AND COALESCE((normalized.layout->'margins'->>'bottom')::numeric, 25.4) = 25.4
      AND COALESCE((normalized.layout->'margins'->>'left')::numeric,   25.4) = 25.4
      AND COALESCE((normalized.layout->'margins'->>'right')::numeric,  25.4) = 25.4
    )
  );
