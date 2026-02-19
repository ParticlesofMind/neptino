-- Migration: Create encyclopedia_media table
-- Stores media resources linked to encyclopedia entities.
-- 7 media types: Compendium, Text, Audio, Video, Maps, Timeline, 3D Model

CREATE TABLE IF NOT EXISTS encyclopedia_media (
  id              TEXT PRIMARY KEY,                  -- slug (e.g. "marie-curie--radioactivity-guide")
  item_id         TEXT NOT NULL REFERENCES encyclopedia_items(id) ON DELETE CASCADE,
  media_type      TEXT NOT NULL,                     -- Compendium | Text | Audio | Video | Maps | Timeline | 3D Model
  title           TEXT NOT NULL,
  description     TEXT,
  url             TEXT,                              -- link to the actual resource (placeholder for now)
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_encyclopedia_media_item_id
  ON encyclopedia_media(item_id);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_media_type
  ON encyclopedia_media(media_type);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_media_item_type
  ON encyclopedia_media(item_id, media_type);

-- ── RLS: allow public read, restrict writes to service role ───────────
ALTER TABLE encyclopedia_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encyclopedia_media_public_read"
  ON encyclopedia_media FOR SELECT
  USING (true);
