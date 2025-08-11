-- ================================================================
-- ADD DEFAULT COURSE SETTINGS WITH MARGINS
-- ================================================================

-- Update the courses table to have default course_settings with margin values
-- First, ensure the column exists (it should from the basic tables migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'course_settings'
    ) THEN
        -- Update the default value for the course_settings column
        ALTER TABLE public.courses 
        ALTER COLUMN course_settings 
        SET DEFAULT '{
          "margins": {
            "top": 2.54,
            "bottom": 2.54,
            "left": 2.54,
            "right": 2.54,
            "unit": "centimeters"
          }
        }'::jsonb;
        
        -- Update existing courses that have empty, null, or missing margin settings
        UPDATE public.courses 
        SET course_settings = COALESCE(course_settings, '{}'::jsonb) || '{
          "margins": {
            "top": 2.54,
            "bottom": 2.54,
            "left": 2.54,
            "right": 2.54,
            "unit": "centimeters"
          }
        }'::jsonb
        WHERE course_settings IS NULL 
           OR course_settings = '{}'::jsonb 
           OR NOT (course_settings ? 'margins');
           
        -- Ensure the column cannot be null
        ALTER TABLE public.courses 
        ALTER COLUMN course_settings 
        SET NOT NULL;
        
        -- Add a comment to document the default structure
        COMMENT ON COLUMN public.courses.course_settings IS 'JSONB column containing course configuration settings. Default includes margins in centimeters: {"margins": {"top": 2.54, "bottom": 2.54, "left": 2.54, "right": 2.54, "unit": "centimeters"}}';
        
        RAISE NOTICE 'Successfully updated course_settings column with default margin values';
    ELSE
        RAISE EXCEPTION 'course_settings column does not exist in courses table';
    END IF;
END
$$;
