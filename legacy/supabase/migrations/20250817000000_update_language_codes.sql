-- ================================================================
-- UPDATE LANGUAGE DEFAULTS TO USE CODES INSTEAD OF NAMES
-- ================================================================

-- Update users table to use language codes
ALTER TABLE public.users 
ALTER COLUMN language SET DEFAULT 'en';

-- Update courses table to use language codes  
ALTER TABLE public.courses 
ALTER COLUMN course_language SET DEFAULT 'en';

-- Update existing records that have 'English' to use 'en'
UPDATE public.users 
SET language = 'en' 
WHERE language = 'English';

UPDATE public.courses 
SET course_language = 'en' 
WHERE course_language = 'English';

-- Update other common language names to codes
UPDATE public.users 
SET language = CASE 
    WHEN language = 'Spanish' THEN 'es'
    WHEN language = 'French' THEN 'fr' 
    WHEN language = 'German' THEN 'de'
    WHEN language = 'Italian' THEN 'it'
    WHEN language = 'Portuguese' THEN 'pt'
    WHEN language = 'Russian' THEN 'ru'
    WHEN language = 'Japanese' THEN 'ja'
    WHEN language = 'Korean' THEN 'ko'
    WHEN language = 'Chinese' THEN 'zh-CN'
    WHEN language = 'Mandarin Chinese' THEN 'zh-CN'
    ELSE language
END
WHERE language IN ('Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese', 'Mandarin Chinese');

UPDATE public.courses 
SET course_language = CASE 
    WHEN course_language = 'Spanish' THEN 'es'
    WHEN course_language = 'French' THEN 'fr' 
    WHEN course_language = 'German' THEN 'de'
    WHEN course_language = 'Italian' THEN 'it'
    WHEN course_language = 'Portuguese' THEN 'pt'
    WHEN course_language = 'Russian' THEN 'ru'
    WHEN course_language = 'Japanese' THEN 'ja'
    WHEN course_language = 'Korean' THEN 'ko'
    WHEN course_language = 'Chinese' THEN 'zh-CN'
    WHEN course_language = 'Mandarin Chinese' THEN 'zh-CN'
    ELSE course_language
END
WHERE course_language IN ('Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese', 'Mandarin Chinese');

-- Add comment to document the change
COMMENT ON COLUMN public.users.language IS 'User interface language code (ISO 639-1 format, e.g., "en", "es", "fr")';
COMMENT ON COLUMN public.courses.course_language IS 'Course teaching language code (ISO 639-1 format, e.g., "en", "es", "fr")';
