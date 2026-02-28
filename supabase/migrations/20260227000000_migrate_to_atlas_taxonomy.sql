-- Migration: Migrate Encyclopedia to Atlas 4-Layer Knowledge System
-- This migration transforms the encyclopedia into Atlas, organizing all educational
-- knowledge into four layers:
-- Layer 1 — Entity Types (11 types): what knowledge is about
-- Layer 2 — Media Types (6 types): raw material formats
-- Layer 3 — Products (8 types): assembled from media, delivered passively
-- Layer 4 — Activities (5 types): demand response from student

-- ───────────────────────────────────────────────────────────────────────
-- Step 1: Add layer tracking to encyclopedia_media
-- ───────────────────────────────────────────────────────────────────────

-- Add layer column to track which layer each media/product/activity belongs to
ALTER TABLE encyclopedia_media 
ADD COLUMN IF NOT EXISTS layer INTEGER CHECK (layer IN (2, 3, 4));

-- Add comment explaining layers
COMMENT ON COLUMN encyclopedia_media.layer IS 
'Layer 2 = Media Types (raw material)
Layer 3 = Products (assembled, passive)
Layer 4 = Activities (require student response)';

-- ───────────────────────────────────────────────────────────────────────
-- Step 2: Update existing media_type values to Atlas taxonomy
-- ───────────────────────────────────────────────────────────────────────

-- Classify existing media types into appropriate layers:
-- Layer 2 (Media Types): Text, Audio, Video, Image, Dataset, 3D Model
-- Layer 3 (Products): Map, Timeline, Simulation, Documentary, Diagram, Narrative, Profile, Game
-- Layer 4 (Activities): Exercise, Quiz, Assessment, Interactive Simulation, Game

-- Update Text -> Layer 2
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE 'Text' AND layer IS NULL;

-- Update Audio -> Layer 2
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE 'Audio' AND layer IS NULL;

-- Update Video -> Layer 2
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE 'Video' AND layer IS NULL;

-- Update 3D Model -> Layer 2
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE '3D Model' AND layer IS NULL;

-- Update Image -> Layer 2 (if exists)
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE 'Image' AND layer IS NULL;

-- Update Dataset -> Layer 2 (if exists)
UPDATE encyclopedia_media 
SET layer = 2 
WHERE media_type ILIKE 'Dataset' AND layer IS NULL;

-- Update Maps -> Map (Layer 3 - Products)
UPDATE encyclopedia_media 
SET media_type = 'Map', layer = 3 
WHERE media_type ILIKE 'Maps' AND layer IS NULL;

-- Update Timeline -> Layer 3 (Products)
UPDATE encyclopedia_media 
SET layer = 3 
WHERE media_type ILIKE 'Timeline' AND layer IS NULL;

-- Update Compendium -> Narrative (Layer 3 - Products)
-- Compendium is a comprehensive narrative about a topic
UPDATE encyclopedia_media 
SET media_type = 'Narrative', layer = 3 
WHERE media_type ILIKE 'Compendium' AND layer IS NULL;

-- ───────────────────────────────────────────────────────────────────────
-- Step 3: Update knowledge_type values to Atlas Entity Types
-- ───────────────────────────────────────────────────────────────────────

-- Current values might include: Person, Event, Location, Concept / Theory, etc.
-- Atlas Layer 1 Entity Types: Concept, Process, Instance, Person, State, 
--                              Time, Environment, Work, Technology, Institution, Movement

-- Person -> Person (no change needed)
-- Event -> Time (Event is a subtype of Time)
-- Location -> Environment (Place is a subtype of Environment)
-- Concept / Theory -> Concept (Theory is a subtype of Concept)

-- Update Location -> Environment
UPDATE encyclopedia_items 
SET knowledge_type = 'Environment' 
WHERE knowledge_type ILIKE '%Location%';

-- Update Event -> Time
UPDATE encyclopedia_items 
SET knowledge_type = 'Time' 
WHERE knowledge_type ILIKE '%Event%';

-- Update Concept / Theory -> Concept
UPDATE encyclopedia_items 
SET knowledge_type = 'Concept' 
WHERE knowledge_type ILIKE '%Concept%' OR knowledge_type ILIKE '%Theory%';

-- ───────────────────────────────────────────────────────────────────────
-- Step 4: Add indexes for layer-based queries
-- ───────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_encyclopedia_media_layer
  ON encyclopedia_media(layer);

CREATE INDEX IF NOT EXISTS idx_encyclopedia_media_layer_type
  ON encyclopedia_media(layer, media_type);

-- ───────────────────────────────────────────────────────────────────────
-- Step 5: Add constraints to ensure valid Atlas taxonomy
-- ───────────────────────────────────────────────────────────────────────

-- Valid Entity Types (Layer 1)
DO $$ BEGIN
  ALTER TABLE encyclopedia_items
  ADD CONSTRAINT check_valid_entity_type
  CHECK (knowledge_type IN (
    'Concept', 'Process', 'Instance', 'Person', 'State', 
    'Time', 'Environment', 'Work', 'Technology', 'Institution', 'Movement'
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Valid Media Types (Layer 2)
DO $$ BEGIN
  ALTER TABLE encyclopedia_media
  ADD CONSTRAINT check_valid_media_type_layer2
  CHECK (
    layer != 2 OR media_type IN ('Text', 'Image', 'Audio', 'Video', 'Dataset', '3D Model')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Valid Products (Layer 3)
DO $$ BEGIN
  ALTER TABLE encyclopedia_media
  ADD CONSTRAINT check_valid_product_layer3
  CHECK (
    layer != 3 OR media_type IN ('Map', 'Timeline', 'Simulation', 'Documentary', 'Diagram', 'Narrative', 'Profile', 'Game')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Valid Activities (Layer 4)
DO $$ BEGIN
  ALTER TABLE encyclopedia_media
  ADD CONSTRAINT check_valid_activity_layer4
  CHECK (
    layer != 4 OR media_type IN ('Exercise', 'Quiz', 'Assessment', 'Interactive Simulation', 'Game')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- Step 6: Add metadata to track sub-types
-- ───────────────────────────────────────────────────────────────────────

-- Add sub_type column for tracking sub-types within main types
ALTER TABLE encyclopedia_items 
ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- Update sub_types based on existing metadata
-- For Concept: Theory, Theorem, Law, Principle, Model, Definition
-- For Time: Event, Period, Epoch
-- For Environment: Place, Organism, Matter

-- Populate sub_types from existing data patterns
UPDATE encyclopedia_items 
SET sub_type = 'Event' 
WHERE knowledge_type = 'Time' AND metadata ? 'date';

UPDATE encyclopedia_items 
SET sub_type = 'Place' 
WHERE knowledge_type = 'Environment' AND metadata ? 'country';

UPDATE encyclopedia_items 
SET sub_type = 'Theory' 
WHERE knowledge_type = 'Concept' AND tags && ARRAY['theory'];

-- ───────────────────────────────────────────────────────────────────────
-- Step 7: Update comments for clarity
-- ───────────────────────────────────────────────────────────────────────

COMMENT ON TABLE encyclopedia_items IS 
'Atlas Layer 1 — Entity Types
What knowledge is about: 11 fundamental ontological categories
Concept, Process, Instance, Person, State, Time, Environment, Work, Technology, Institution, Movement';

COMMENT ON TABLE encyclopedia_media IS 
'Atlas Layers 2, 3, 4 — Media, Products, Activities
Layer 2: Raw material formats (Text, Image, Audio, Video, Dataset, 3D Model)
Layer 3: Assembled products delivered passively (Map, Timeline, Simulation, Documentary, Diagram, Narrative, Profile, Game)
Layer 4: Activities requiring student response (Exercise, Quiz, Assessment, Interactive Simulation, Game)';

COMMENT ON COLUMN encyclopedia_items.knowledge_type IS 
'Layer 1 Entity Type: Concept | Process | Instance | Person | State | Time | Environment | Work | Technology | Institution | Movement';

COMMENT ON COLUMN encyclopedia_items.sub_type IS 
'Sub-type within Entity Type. Examples:
- Concept: Theory, Theorem, Law, Principle, Model, Definition
- Time: Event, Period, Epoch
- Environment: Place, Organism, Matter';

COMMENT ON COLUMN encyclopedia_media.media_type IS 
'Type name within layer:
- Layer 2: Text | Image | Audio | Video | Dataset | 3D Model
- Layer 3: Map | Timeline | Simulation | Documentary | Diagram | Narrative | Profile | Game
- Layer 4: Exercise | Quiz | Assessment | Interactive Simulation | Game';
