-- ================================================================
-- DROP UNUSED CANVAS / TEMPLATE TABLES
--
-- These tables were created speculatively and were never integrated:
--
--   canvas_document_ops  — event-sourcing log, never written to
--   canvas_documents     — CRDT canvas snapshots, never written to
--   canvases             — replaced by lessons.payload for canvas state
--   template_shares      — depends on templates; templates never used
--   templates            — template data lives in courses.template_settings
--
-- Canvas page state is persisted via the lessons table (lesson_number
-- maps to session.order; payload stores the full CourseSession JSON).
-- Template configs are stored in courses.template_settings (JSONB).
-- ================================================================

-- Drop in dependency order (child tables before parent tables).

-- canvas_document_ops references canvas_documents
DROP TABLE IF EXISTS public.canvas_document_ops;

-- canvas_documents standalone
DROP TABLE IF EXISTS public.canvas_documents;

-- canvases referenced nothing still active
DROP TABLE IF EXISTS public.canvases;

-- Drop templates first so that any RLS policies on templates (which may
-- reference template_shares in their USING clause) are removed before
-- template_shares is dropped.  PostgreSQL would otherwise refuse to drop
-- template_shares while a dependent policy still exists.
DROP TABLE IF EXISTS public.templates CASCADE;

-- template_shares is now clear of dependents
DROP TABLE IF EXISTS public.template_shares;
