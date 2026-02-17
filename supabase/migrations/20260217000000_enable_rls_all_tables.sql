-- ================================================================
-- RE-ENABLE RLS ACROSS APP TABLES
-- ================================================================

-- Public schema tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.encyclopedia_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.encyclopedia_media ENABLE ROW LEVEL SECURITY;

-- Private schema tables
ALTER TABLE IF EXISTS private.user_integrations ENABLE ROW LEVEL SECURITY;

-- Keep the view using invoker permissions
ALTER VIEW IF EXISTS public.user_integrations SET (security_invoker = true);
