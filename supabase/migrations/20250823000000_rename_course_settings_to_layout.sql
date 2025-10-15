-- ================================================================
-- RENAME COURSE_SETTINGS TO COURSE_LAYOUT AND UPDATE STRUCTURE
-- ================================================================

-- Rename the column from course_settings to course_layout
ALTER TABLE public.courses 
RENAME COLUMN course_settings TO course_layout;

-- Update the default value to include orientation and canvas_size
ALTER TABLE public.courses 
ALTER COLUMN course_layout 
SET DEFAULT '{
  "margins": {
    "top": 2.54,
    "bottom": 2.54,
    "left": 2.54,
    "right": 2.54,
    "unit": "mm"
  },
  "orientation": "portrait",
  "canvas_size": "a4"
}'::jsonb;

-- Update existing records to include the new fields while preserving existing margins
UPDATE public.courses 
SET course_layout = COALESCE(course_layout, '{}'::jsonb) || '{
  "orientation": "portrait",
  "canvas_size": "a4"
}'::jsonb
WHERE course_layout IS NOT NULL;

-- Update the comment to reflect the new structure
COMMENT ON COLUMN public.courses.course_layout IS 'JSONB column containing course layout configuration. Structure: {"margins": {"top": 25, "bottom": 25, "left": 25, "right": 25, "unit": "mm"}, "orientation": "portrait|landscape", "canvas_size": "a4|us-letter|a3"}';

-- Create an index on course_layout for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_course_layout_gin ON public.courses USING gin (course_layout);

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Successfully renamed course_settings to course_layout and updated structure';
END
$$;
