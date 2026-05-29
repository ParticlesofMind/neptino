ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS education_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS syllabus jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credential_label text,
  ADD COLUMN IF NOT EXISTS progression_policy text;

COMMENT ON COLUMN public.programs.education_context IS 'Shared education context inherited by courses in the program unless overridden.';
COMMENT ON COLUMN public.programs.syllabus IS 'Program-level syllabus overview, outcomes, admission expectations, and assessment notes.';
COMMENT ON COLUMN public.programs.credential_label IS 'Optional credential, certificate, pathway, or outcome label for the program.';
COMMENT ON COLUMN public.programs.progression_policy IS 'Program course progression policy such as recommended order, required order, or prerequisites required.';
