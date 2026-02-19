-- ================================================================
-- ADD COURSE_DAYS COLUMN FOR SCHEDULE MANAGEMENT
-- ================================================================

-- Add course_days column to track total number of scheduled lessons
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_days integer DEFAULT NULL;

-- Update any existing courses that have schedule_settings but no course_days
UPDATE public.courses 
SET course_days = (
    CASE 
        WHEN schedule_settings IS NOT NULL AND schedule_settings != '{}'::jsonb
        THEN jsonb_array_length(schedule_settings)
        ELSE NULL
    END
)
WHERE course_days IS NULL AND schedule_settings IS NOT NULL;
