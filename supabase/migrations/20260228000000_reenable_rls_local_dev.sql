-- ================================================================
-- RE-ENABLE ROW LEVEL SECURITY FOR ALL TABLES
-- Counterpart to 20251201000012_disable_rls_for_local_dev.sql
--
-- Apply this migration when you want local behaviour to match
-- production (recommended). The RLS policies themselves were
-- already created by earlier migrations; this simply activates them.
-- ================================================================

-- Re-enable RLS
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS private.user_integrations ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (matches production Supabase behaviour)
ALTER TABLE IF EXISTS public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvases FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shares FORCE ROW LEVEL SECURITY;

-- Revoke the blanket anon grants added by the disable migration
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Restore standard least-privilege grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
