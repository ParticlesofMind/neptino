-- Atlas repository layer V1
--
-- Imported source-backed data lands here before it is promoted into the
-- existing Atlas compatibility tables: encyclopedia_items and
-- encyclopedia_media.

-- Keep current Atlas compatibility constraints aligned with the expanded
-- repository taxonomy.
ALTER TABLE public.encyclopedia_media
  DROP CONSTRAINT IF EXISTS check_valid_media_type_layer2;

ALTER TABLE public.encyclopedia_media
  DROP CONSTRAINT IF EXISTS check_valid_product_layer3;

ALTER TABLE public.encyclopedia_media
  DROP CONSTRAINT IF EXISTS check_valid_activity_layer4;

ALTER TABLE public.encyclopedia_media
  ADD CONSTRAINT check_valid_media_type_layer2
  CHECK (
    layer != 2 OR media_type IN (
      'Text', 'Image', 'Audio', 'Video', 'Dataset', '3D Model',
      'Document', 'Animation', 'Code Snippet', 'Embed'
    )
  );

ALTER TABLE public.encyclopedia_media
  ADD CONSTRAINT check_valid_product_layer3
  CHECK (
    layer != 3 OR media_type IN (
      'Map', 'Timeline', 'Chart', 'Table', 'Simulation', 'Documentary',
      'Diagram', 'Narrative', 'Profile', 'Gallery', 'Game'
    )
  );

ALTER TABLE public.encyclopedia_media
  ADD CONSTRAINT check_valid_activity_layer4
  CHECK (
    layer != 4 OR media_type IN (
      'Recall', 'Identify', 'Classify', 'Compare', 'Interpret',
      'Explain', 'Model', 'Argue', 'Create', 'Reflect', 'Assess',
      'Converse', 'Exercise', 'Quiz', 'Assessment',
      'Interactive Simulation', 'Game', 'AI Chat'
    )
  );

CREATE TABLE IF NOT EXISTS public.atlas_sources (
  id text PRIMARY KEY,
  label text NOT NULL,
  base_url text,
  source_rank text NOT NULL DEFAULT 'C'
    CHECK (source_rank IN ('S', 'A', 'B', 'C', 'D')),
  default_license text,
  default_license_url text,
  requires_attribution boolean NOT NULL DEFAULT true,
  commercial_use_status text NOT NULL DEFAULT 'unknown'
    CHECK (commercial_use_status IN ('allowed', 'restricted', 'mixed', 'unknown')),
  api_kind text NOT NULL DEFAULT 'other'
    CHECK (api_kind IN ('sparql', 'rest', 'download', 'file', 'manual', 'other')),
  notes text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.atlas_sources(id) ON DELETE RESTRICT,
  external_id text NOT NULL,
  external_url text,
  record_type text NOT NULL DEFAULT 'unknown'
    CHECK (record_type IN (
      'entity', 'media', 'dataset', 'geometry', 'document',
      'claim', 'product', 'task', 'unknown'
    )),
  title text,
  description text,
  language text,
  license text,
  license_url text,
  attribution text,
  revision_id text,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS public.atlas_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text REFERENCES public.atlas_sources(id) ON DELETE SET NULL,
  job_kind text NOT NULL
    CHECK (job_kind IN ('search', 'import', 'refresh', 'reconcile', 'promote')),
  query text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  records_seen integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_created integer NOT NULL DEFAULT 0 CHECK (records_created >= 0),
  records_updated integer NOT NULL DEFAULT 0 CHECK (records_updated >= 0),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.atlas_entity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_source_record_id uuid NOT NULL REFERENCES public.atlas_source_records(id) ON DELETE RESTRICT,
  wikidata_id text,
  title text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}'::text[],
  description text,
  suggested_entity_type text,
  suggested_subtype text,
  suggested_domains text[] NOT NULL DEFAULT '{}'::text[],
  spatial_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  temporal_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_confidence numeric(4,3) CHECK (source_confidence IS NULL OR source_confidence BETWEEN 0 AND 1),
  classification_confidence numeric(4,3) CHECK (classification_confidence IS NULL OR classification_confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'needs_review', 'approved', 'rejected', 'promoted')),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_merge_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  promoted_item_id text REFERENCES public.encyclopedia_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_source_record_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_atlas_entity_candidates_wikidata_id
  ON public.atlas_entity_candidates(wikidata_id)
  WHERE wikidata_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.atlas_asset_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id uuid NOT NULL REFERENCES public.atlas_source_records(id) ON DELETE RESTRICT,
  linked_entity_candidate_id uuid REFERENCES public.atlas_entity_candidates(id) ON DELETE SET NULL,
  linked_item_id text REFERENCES public.encyclopedia_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  suggested_media_type text,
  url text,
  storage_path text,
  mime_type text,
  license text,
  license_url text,
  attribution text,
  quality_score numeric(4,3) CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'needs_review', 'approved', 'rejected', 'promoted')),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  promoted_media_id text REFERENCES public.encyclopedia_media(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_record_id)
);

CREATE TABLE IF NOT EXISTS public.atlas_product_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_entity_candidate_id uuid REFERENCES public.atlas_entity_candidates(id) ON DELETE SET NULL,
  linked_item_id text REFERENCES public.encyclopedia_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  suggested_product_type text,
  input_record_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  render_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'needs_review', 'approved', 'rejected', 'promoted')),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  promoted_media_id text REFERENCES public.encyclopedia_media(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_task_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_entity_candidate_id uuid REFERENCES public.atlas_entity_candidates(id) ON DELETE SET NULL,
  linked_item_id text REFERENCES public.encyclopedia_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  activity_family text,
  student_action text,
  pedagogical_role text,
  input_record_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  task_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  rubric_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'new'
    CHECK (review_status IN ('new', 'needs_review', 'approved', 'rejected', 'promoted')),
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  promoted_media_id text REFERENCES public.encyclopedia_media(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.atlas_packs (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  pack_type text NOT NULL
    CHECK (pack_type IN (
      'Entity', 'Place', 'Event', 'Work', 'Concept', 'Process',
      'Dataset', 'Activity', 'CourseSeed'
    )),
  anchor_item_id text REFERENCES public.encyclopedia_items(id) ON DELETE SET NULL,
  anchor_entity_candidate_id uuid REFERENCES public.atlas_entity_candidates(id) ON DELETE SET NULL,
  domain text,
  secondary_domains text[] NOT NULL DEFAULT '{}'::text[],
  era_group text,
  difficulty_band text,
  entity_ids text[] NOT NULL DEFAULT '{}'::text[],
  asset_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  task_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score numeric(4,3) CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'needs_review', 'approved', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atlas_source_records_source_type
  ON public.atlas_source_records(source_id, record_type);

CREATE INDEX IF NOT EXISTS idx_atlas_source_records_content_hash
  ON public.atlas_source_records(content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atlas_import_jobs_source_status
  ON public.atlas_import_jobs(source_id, status);

CREATE INDEX IF NOT EXISTS idx_atlas_entity_candidates_review
  ON public.atlas_entity_candidates(review_status, title);

CREATE INDEX IF NOT EXISTS idx_atlas_asset_candidates_entity
  ON public.atlas_asset_candidates(linked_entity_candidate_id, review_status);

CREATE INDEX IF NOT EXISTS idx_atlas_product_candidates_entity
  ON public.atlas_product_candidates(linked_entity_candidate_id, review_status);

CREATE INDEX IF NOT EXISTS idx_atlas_task_candidates_entity
  ON public.atlas_task_candidates(linked_entity_candidate_id, review_status);

CREATE INDEX IF NOT EXISTS idx_atlas_packs_review
  ON public.atlas_packs(review_status, title);

CREATE INDEX IF NOT EXISTS idx_atlas_packs_anchor_item
  ON public.atlas_packs(anchor_item_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_sources;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_entity_candidates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_entity_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_asset_candidates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_asset_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_product_candidates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_product_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_task_candidates;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_task_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.atlas_packs;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.atlas_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.atlas_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_entity_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_asset_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_product_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_task_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atlas_sources_enabled_read ON public.atlas_sources;
CREATE POLICY atlas_sources_enabled_read ON public.atlas_sources
  FOR SELECT
  TO anon, authenticated
  USING (enabled);

DROP POLICY IF EXISTS atlas_packs_public_approved_read ON public.atlas_packs;
CREATE POLICY atlas_packs_public_approved_read ON public.atlas_packs
  FOR SELECT
  TO anon, authenticated
  USING (review_status = 'approved');

DROP POLICY IF EXISTS atlas_entity_candidates_review_read ON public.atlas_entity_candidates;
CREATE POLICY atlas_entity_candidates_review_read ON public.atlas_entity_candidates
  FOR SELECT
  TO authenticated
  USING (
    review_status IN ('approved', 'promoted')
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('teacher', 'admin')
    )
  );

DROP POLICY IF EXISTS atlas_asset_candidates_review_read ON public.atlas_asset_candidates;
CREATE POLICY atlas_asset_candidates_review_read ON public.atlas_asset_candidates
  FOR SELECT
  TO authenticated
  USING (
    review_status IN ('approved', 'promoted')
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('teacher', 'admin')
    )
  );

DROP POLICY IF EXISTS atlas_product_candidates_review_read ON public.atlas_product_candidates;
CREATE POLICY atlas_product_candidates_review_read ON public.atlas_product_candidates
  FOR SELECT
  TO authenticated
  USING (
    review_status IN ('approved', 'promoted')
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('teacher', 'admin')
    )
  );

DROP POLICY IF EXISTS atlas_task_candidates_review_read ON public.atlas_task_candidates;
CREATE POLICY atlas_task_candidates_review_read ON public.atlas_task_candidates
  FOR SELECT
  TO authenticated
  USING (
    review_status IN ('approved', 'promoted')
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('teacher', 'admin')
    )
  );

REVOKE ALL ON public.atlas_sources FROM anon, authenticated;
REVOKE ALL ON public.atlas_source_records FROM anon, authenticated;
REVOKE ALL ON public.atlas_import_jobs FROM anon, authenticated;
REVOKE ALL ON public.atlas_entity_candidates FROM anon, authenticated;
REVOKE ALL ON public.atlas_asset_candidates FROM anon, authenticated;
REVOKE ALL ON public.atlas_product_candidates FROM anon, authenticated;
REVOKE ALL ON public.atlas_task_candidates FROM anon, authenticated;
REVOKE ALL ON public.atlas_packs FROM anon, authenticated;

GRANT SELECT ON public.atlas_sources TO anon, authenticated;
GRANT SELECT ON public.atlas_packs TO anon, authenticated;
GRANT SELECT ON public.atlas_entity_candidates TO authenticated;
GRANT SELECT ON public.atlas_asset_candidates TO authenticated;
GRANT SELECT ON public.atlas_product_candidates TO authenticated;
GRANT SELECT ON public.atlas_task_candidates TO authenticated;

GRANT ALL ON public.atlas_sources TO service_role;
GRANT ALL ON public.atlas_source_records TO service_role;
GRANT ALL ON public.atlas_import_jobs TO service_role;
GRANT ALL ON public.atlas_entity_candidates TO service_role;
GRANT ALL ON public.atlas_asset_candidates TO service_role;
GRANT ALL ON public.atlas_product_candidates TO service_role;
GRANT ALL ON public.atlas_task_candidates TO service_role;
GRANT ALL ON public.atlas_packs TO service_role;

INSERT INTO public.atlas_sources (
  id, label, base_url, source_rank, default_license, default_license_url,
  requires_attribution, commercial_use_status, api_kind, notes, enabled
)
VALUES
  (
    'wikidata', 'Wikidata', 'https://www.wikidata.org', 'S',
    'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/',
    false, 'allowed', 'sparql',
    'Primary entity spine, identifiers, claims, dates, aliases, and relations. Data quality varies by item.',
    true
  ),
  (
    'natural_earth', 'Natural Earth', 'https://www.naturalearthdata.com', 'S',
    'Public domain', 'https://www.naturalearthdata.com/about/terms-of-use/',
    false, 'allowed', 'download',
    'Stable modern baseline cartographic data; not a historical boundary source.',
    true
  ),
  (
    'openhistoricalmap', 'OpenHistoricalMap', 'https://www.openhistoricalmap.org', 'A',
    'Mixed public-domain-oriented data', 'https://www.openhistoricalmap.org/copyright',
    true, 'mixed', 'rest',
    'Primary open temporal map source; coverage and object-level sourcing are uneven.',
    true
  ),
  (
    'commons', 'Wikimedia Commons', 'https://commons.wikimedia.org', 'A',
    NULL, NULL,
    true, 'mixed', 'rest',
    'Free media repository. Licenses and attribution requirements must be checked per file.',
    true
  ),
  (
    'loc', 'Library of Congress', 'https://www.loc.gov', 'A',
    NULL, NULL,
    true, 'mixed', 'rest',
    'Primary-source documents, images, maps, audio, and video. Rights advisories vary per item.',
    true
  ),
  (
    'owid', 'Our World in Data', 'https://ourworldindata.org', 'A',
    'CC BY 4.0 / mixed underlying sources', 'https://ourworldindata.org/how-to-use-our-world-in-data',
    true, 'mixed', 'rest',
    'Chart-ready datasets with strong metadata; underlying data-provider terms must be preserved.',
    true
  ),
  (
    'world_bank', 'World Bank Open Data', 'https://data.worldbank.org', 'A',
    'World Bank Open Data terms', 'https://www.worldbank.org/en/about/legal/terms-and-conditions',
    true, 'mixed', 'rest',
    'Official development and economic indicators with attribution requirements.',
    true
  ),
  (
    'oecd', 'OECD Data', 'https://www.oecd.org/en/data.html', 'A',
    'CC BY 4.0 / mixed exceptions', 'https://www.oecd.org/en/about/oecd-open-by-default-policy.html',
    true, 'mixed', 'rest',
    'Policy and economic indicators; exceptions and rate limits need review.',
    true
  ),
  (
    'unesco_uis', 'UNESCO UIS', 'https://databrowser.uis.unesco.org', 'A',
    'CC BY-SA 4.0', 'https://databrowser.uis.unesco.org/terms-and-conditions',
    true, 'restricted', 'rest',
    'Official education, science, and culture statistics; share-alike obligations apply.',
    true
  ),
  (
    'internet_archive', 'Internet Archive', 'https://archive.org', 'A',
    NULL, NULL,
    true, 'mixed', 'rest',
    'Large archival corpus. Rights and metadata quality vary per item.',
    true
  ),
  (
    'project_gutenberg', 'Project Gutenberg', 'https://www.gutenberg.org', 'A',
    'Mostly public domain in the United States', 'https://www.gutenberg.org/policy/license.html',
    true, 'mixed', 'download',
    'Public-domain text corpus with jurisdiction and edition caveats.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  base_url = EXCLUDED.base_url,
  source_rank = EXCLUDED.source_rank,
  default_license = EXCLUDED.default_license,
  default_license_url = EXCLUDED.default_license_url,
  requires_attribution = EXCLUDED.requires_attribution,
  commercial_use_status = EXCLUDED.commercial_use_status,
  api_kind = EXCLUDED.api_kind,
  notes = EXCLUDED.notes,
  enabled = EXCLUDED.enabled,
  updated_at = now();

COMMENT ON TABLE public.atlas_sources IS
  'Atlas source registry: trusted external/internal providers and their license/rank caveats.';

COMMENT ON TABLE public.atlas_source_records IS
  'Raw imported source records with licenses, source URLs, revision IDs, retrieval timestamps, payloads, and content hashes.';

COMMENT ON TABLE public.atlas_entity_candidates IS
  'Flexible staging table for possible Atlas Layer 1 entities before promotion into encyclopedia_items.';

COMMENT ON TABLE public.atlas_asset_candidates IS
  'Flexible staging table for source media/raw resource candidates before promotion into encyclopedia_media.';

COMMENT ON TABLE public.atlas_product_candidates IS
  'Flexible staging table for generated/imported passive display candidates before promotion into encyclopedia_media.';

COMMENT ON TABLE public.atlas_task_candidates IS
  'Flexible staging table for reusable task/activity candidates before promotion into encyclopedia_media.';

COMMENT ON TABLE public.atlas_packs IS
  'Reusable Atlas bundles containing entities, assets, products, tasks, citations, review status, and quality metadata.';
