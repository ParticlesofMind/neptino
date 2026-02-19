-- ================================================================
-- ADD TEMPLATE SHARING FUNCTIONALITY
-- ================================================================

-- Step 1: Create template_shares table
CREATE TABLE IF NOT EXISTS public.template_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_level text CHECK (permission_level IN ('view', 'edit', 'admin')) DEFAULT 'view',
  shared_by uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(template_id, shared_with)
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_template_shares_template ON public.template_shares(template_id);
CREATE INDEX idx_template_shares_shared_with ON public.template_shares(shared_with);
CREATE INDEX idx_template_shares_shared_by ON public.template_shares(shared_by);

-- Step 3: Create GIN index on templates for full-text search
CREATE INDEX IF NOT EXISTS idx_templates_search ON public.templates
USING gin (to_tsvector('english', 
  coalesce(template_id::text, '') || ' ' || 
  coalesce(template_description, '')
));

-- Step 4: Enable RLS on template_shares
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for template_shares
-- Users can see shares they created or shares with them
CREATE POLICY template_shares_self_view ON public.template_shares
  FOR SELECT USING (
    shared_by = auth.uid() OR shared_with = auth.uid()
  );

-- Users can create shares for templates they own
CREATE POLICY template_shares_create ON public.template_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = template_shares.template_id
        AND t.created_by = auth.uid()
    )
    AND shared_by = auth.uid()
  );

-- Template owners can update/delete shares
CREATE POLICY template_shares_owner_manage ON public.template_shares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.templates t
      WHERE t.id = template_shares.template_id
        AND t.created_by = auth.uid()
    )
  );

-- Update templates RLS to allow viewing shared templates
DROP POLICY IF EXISTS templates_owner_all ON public.templates;
CREATE POLICY templates_owner_all ON public.templates
  FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.template_shares ts
      WHERE ts.template_id = templates.id
        AND ts.shared_with = auth.uid()
        AND ts.permission_level IN ('view', 'edit', 'admin')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.template_shares IS 'Tracks template sharing between users with permission levels';
COMMENT ON COLUMN public.template_shares.permission_level IS 'Permission level: view (read-only), edit (can modify), admin (full control)';
COMMENT ON INDEX idx_templates_search IS 'Full-text search index on template_id and template_description';

