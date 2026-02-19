-- ================================================================
-- ADD UPDATE TRIGGERS AND VALIDATION FUNCTIONS
-- ================================================================

-- Step 1: Create generic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Apply updated_at triggers to all mutable tables
DO $$
DECLARE t regclass;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.courses'::regclass,
    'public.lessons'::regclass,
    'public.canvases'::regclass,
    'public.templates'::regclass,
    'public.enrollments'::regclass,
    'public.users'::regclass
  ]
  LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS set_updated_at ON %s;
      CREATE TRIGGER set_updated_at 
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    $f$, t, t);
  END LOOP;
END $$;

-- Step 3: Create canvas validation function
CREATE OR REPLACE FUNCTION validate_canvas()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate canvas_index >= 1
  IF NEW.canvas_index < 1 THEN
    RAISE EXCEPTION 'canvas_index must be >= 1';
  END IF;

  -- Enforce lesson_id belongs to course_id
  IF NEW.lesson_id IS NOT NULL AND
     NEW.course_id <> (SELECT course_id FROM public.lessons WHERE id = NEW.lesson_id)
  THEN
     RAISE EXCEPTION 'lesson_id must belong to the same course_id';
  END IF;

  -- Ensure lesson_number matches if both are present
  IF NEW.lesson_id IS NOT NULL AND NEW.lesson_number IS NOT NULL THEN
    IF NEW.lesson_number <> (SELECT lesson_number FROM public.lessons WHERE id = NEW.lesson_id) THEN
      RAISE WARNING 'lesson_number (%) does not match lessons.lesson_number for lesson_id (%)', 
        NEW.lesson_number, NEW.lesson_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create canvas validation trigger
DROP TRIGGER IF EXISTS canvas_data_validation ON public.canvases;
CREATE TRIGGER canvas_data_validation
  BEFORE INSERT OR UPDATE ON public.canvases
  FOR EACH ROW EXECUTE FUNCTION validate_canvas();

-- Add comments for documentation
COMMENT ON FUNCTION set_updated_at() IS 'Generic trigger function to automatically update updated_at timestamp';
COMMENT ON FUNCTION validate_canvas() IS 'Validates canvas data: canvas_index >= 1, lesson_id/course_id consistency';

