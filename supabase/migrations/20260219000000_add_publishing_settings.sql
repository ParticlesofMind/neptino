-- Add publishing & communication settings columns to courses table.
-- All columns are JSONB to allow flexible schema evolution.
-- Uses IF NOT EXISTS so it is safe to run against DBs that already have the columns.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS marketplace_settings   jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_settings       jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integration_settings   jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS communication_settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.courses.marketplace_settings   IS 'Marketplace listing status, target audience, revenue share, and distribution channels.';
COMMENT ON COLUMN public.courses.pricing_settings       IS 'Pricing model, base price, currency, trial offer, and discount notes.';
COMMENT ON COLUMN public.courses.integration_settings   IS 'External LMS provider, API access, webhook URL, and integration notes.';
COMMENT ON COLUMN public.courses.communication_settings IS 'Welcome message, announcement channel, weekly digest, and office hours.';
