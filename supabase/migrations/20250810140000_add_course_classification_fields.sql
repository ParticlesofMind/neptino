-- Add classification fields to courses table
ALTER TABLE public.courses 
ADD COLUMN class_year text,
ADD COLUMN curricular_framework text,
ADD COLUMN domain text,
ADD COLUMN subject text,
ADD COLUMN topic text,
ADD COLUMN subtopic text,
ADD COLUMN previous_course text,
ADD COLUMN current_course text,
ADD COLUMN next_course text;

-- Add comments for the new columns
COMMENT ON COLUMN public.courses.class_year IS 'Educational level/class year (e.g., primary-1, secondary-10)';
COMMENT ON COLUMN public.courses.curricular_framework IS 'Educational framework being used (e.g., national-curriculum, ib)';
COMMENT ON COLUMN public.courses.domain IS 'ISCED-F 2013 domain classification';
COMMENT ON COLUMN public.courses.subject IS 'ISCED-F 2013 subject classification';
COMMENT ON COLUMN public.courses.topic IS 'ISCED-F 2013 topic classification';
COMMENT ON COLUMN public.courses.subtopic IS 'ISCED-F 2013 subtopic classification (optional)';
COMMENT ON COLUMN public.courses.previous_course IS 'Reference to prerequisite course';
COMMENT ON COLUMN public.courses.current_course IS 'Current course identifier in sequence';
COMMENT ON COLUMN public.courses.next_course IS 'Reference to follow-up course';

-- Create indexes for faster lookups
CREATE INDEX idx_courses_class_year ON public.courses (class_year);
CREATE INDEX idx_courses_domain ON public.courses (domain);
CREATE INDEX idx_courses_subject ON public.courses (subject);
CREATE INDEX idx_courses_topic ON public.courses (topic);
