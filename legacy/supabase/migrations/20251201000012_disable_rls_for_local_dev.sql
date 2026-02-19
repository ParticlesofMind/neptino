-- ================================================================
-- DISABLE RLS FOR LOCAL DEVELOPMENT
-- Run this migration if you need to disable RLS for local testing
-- ================================================================
-- 
-- NOTE: This is for LOCAL DEVELOPMENT ONLY
-- DO NOT run this on production databases
-- ================================================================

-- Disable RLS on all tables
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS private.user_integrations DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on private schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

