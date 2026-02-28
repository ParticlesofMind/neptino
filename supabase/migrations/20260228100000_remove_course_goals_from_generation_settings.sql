-- Remove course_goals from generation_settings JSONB for all existing courses.
-- Course Goals / Outcomes has been removed from the Essentials setup UI and
-- should no longer be stored in the database.
UPDATE courses
SET generation_settings = generation_settings - 'course_goals'
WHERE generation_settings ? 'course_goals';
