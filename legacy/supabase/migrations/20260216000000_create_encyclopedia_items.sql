-- Migration: Create encyclopedia_items table
-- Supports 500k+ records with full-text search, era/domain filtering,
-- and flexible per-knowledge-type metadata via JSONB.

CREATE TABLE IF NOT EXISTS encyclopedia_items (
  id              TEXT PRIMARY KEY,                  -- slug (e.g. "albert-einstein")
  wikidata_id     TEXT,
  title           TEXT NOT NULL,
  knowledge_type  TEXT NOT NULL,                     -- Person | Event | Location | etc.
  domain          TEXT,
  secondary_domains TEXT[],
  era_group       TEXT,
  era_label       TEXT,
  depth           TEXT,
  summary         TEXT,
  tags            TEXT[],
  metadata        JSONB DEFAULT '{}',                -- flexible per knowledge_type
  search_vector   TSVECTOR,                          -- populated by trigger
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Full-text search index (the heavy lifter) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_encyclopedia_fts
  ON encyclopedia_items USING GIN(search_vector);

-- ── Filtering indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_encyclopedia_knowledge_type
  ON encyclopedia_items(knowledge_type);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_domain
  ON encyclopedia_items(domain);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_era_group
  ON encyclopedia_items(era_group);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_depth
  ON encyclopedia_items(depth);

-- ── Composite for the most common combined filter ─────────────────────
CREATE INDEX IF NOT EXISTS idx_encyclopedia_type_domain_era
  ON encyclopedia_items(knowledge_type, domain, era_group);

-- ── Auto-populate the search vector via trigger ───────────────────────
CREATE OR REPLACE FUNCTION update_encyclopedia_search_vector()
  RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_encyclopedia_search_vector ON encyclopedia_items;
CREATE TRIGGER trg_encyclopedia_search_vector
  BEFORE INSERT OR UPDATE ON encyclopedia_items
  FOR EACH ROW EXECUTE FUNCTION update_encyclopedia_search_vector();

-- ── RLS: allow public read (anon key), restrict writes to service role ─
ALTER TABLE encyclopedia_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "encyclopedia_items_public_read"
    ON encyclopedia_items FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service-role inserts/updates bypass RLS automatically via service key.
