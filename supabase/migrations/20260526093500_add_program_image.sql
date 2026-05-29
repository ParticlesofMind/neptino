ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS program_image text;

COMMENT ON COLUMN public.programs.program_image IS 'Public URL for the program cover image.';
