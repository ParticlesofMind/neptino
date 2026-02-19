-- ================================================================
-- ADD COURSE VIEW SETTINGS COLUMNS
-- ================================================================

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS generation_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS students_overview jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS visibility_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS marketplace_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS resources_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS pricing_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS integration_settings jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS communication_settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.courses.generation_settings IS 'AI generation preferences captured from the generation view.';
COMMENT ON COLUMN public.courses.students_overview IS 'Aggregated roster snapshot for the students view.';
COMMENT ON COLUMN public.courses.visibility_settings IS 'Course visibility and enrollment controls.';
COMMENT ON COLUMN public.courses.marketplace_settings IS 'Marketplace configuration (listing status, revenue share, channels).';
COMMENT ON COLUMN public.courses.resources_settings IS 'Resource library configuration and sharing policy.';
COMMENT ON COLUMN public.courses.pricing_settings IS 'Pricing & monetization configuration.';
COMMENT ON COLUMN public.courses.integration_settings IS 'External integrations & API configuration.';
COMMENT ON COLUMN public.courses.communication_settings IS 'Communication preferences and messaging defaults.';

