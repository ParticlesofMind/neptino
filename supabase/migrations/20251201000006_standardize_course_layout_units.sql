-- ================================================================
-- STANDARDIZE COURSE_LAYOUT UNITS TO MILLIMETERS
-- ================================================================

-- Convert any "cm" values to "mm" (multiply by 10) and update unit field
UPDATE public.courses
SET course_layout = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          course_layout,
          '{margins,top}',
          to_jsonb(COALESCE((course_layout->'margins'->>'top')::numeric * 10, 25))
        ),
        '{margins,bottom}',
        to_jsonb(COALESCE((course_layout->'margins'->>'bottom')::numeric * 10, 25))
      ),
      '{margins,left}',
      to_jsonb(COALESCE((course_layout->'margins'->>'left')::numeric * 10, 25))
    ),
    '{margins,right}',
    to_jsonb(COALESCE((course_layout->'margins'->>'right')::numeric * 10, 25))
  ),
  '{margins,unit}',
  '"mm"'
)
WHERE course_layout->'margins'->>'unit' = 'cm'
   OR course_layout->'margins'->>'unit' IS NULL
   OR (course_layout->'margins'->>'unit' IS NOT NULL 
       AND course_layout->'margins'->>'unit' != 'mm');

-- Ensure all courses have unit set to "mm" even if margins don't exist
UPDATE public.courses
SET course_layout = COALESCE(course_layout, '{}'::jsonb) || 
  jsonb_build_object(
    'margins', COALESCE(course_layout->'margins', '{}'::jsonb) || 
      jsonb_build_object('unit', 'mm')
  )
WHERE course_layout->'margins'->>'unit' IS NULL
   OR course_layout->'margins' IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.course_layout IS 'JSONB layout configuration. Margins are always in millimeters (mm).';

