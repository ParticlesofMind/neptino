# Atlas — Neptino Knowledge System

Atlas is Neptino's comprehensive knowledge organization system that structures all educational content into four interconnected layers. This document explains the system architecture, design principles, and implementation details.

## Overview

Atlas organizes educational knowledge into a clear, hierarchical 4-layer taxonomy:

- **Layer 1**: Entity Types (what knowledge is about)
- **Layer 2**: Media Types (raw materials)
- **Layer 3**: Products (assembled, passive)
- **Layer 4**: Activities (require response)

## Core Principle

**Teachers never interact with the taxonomy directly.** The classification system runs underneath the surface and contextually surfaces the right types based on the subject and level being taught. Teachers simply work with content, and Atlas intelligently categorizes it.

---

## Layer 1 — Entity Types

**What knowledge is about** — the fundamental ontological categories.

### The 11 Top-Level Types

1. **Concept** — abstract ideas, theories, principles
2. **Process** — methods, procedures, operations
3. **Instance** — specific examples, cases
4. **Person** — individuals, biographical subjects
5. **State** — conditions, situations, statuses
6. **Time** — temporal entities, events, periods
7. **Environment** — spatial/physical contexts
8. **Work** — created artifacts, publications
9. **Technology** — tools, inventions, systems
10. **Institution** — organizations, structures
11. **Movement** — collective phenomena, trends

### Sub-Types

Some Entity Types have specialized sub-types:

**Concept:**
- Theory
- Theorem
- Law
- Principle
- Model
- Definition

**Time:**
- Event
- Period
- Epoch

**Environment:**
- Place
- Organism
- Matter

### Database Structure

Entity Types are stored in the `encyclopedia_items` table:

```sql
CREATE TABLE encyclopedia_items (
  id              TEXT PRIMARY KEY,
  wikidata_id     TEXT,
  title           TEXT NOT NULL,
  knowledge_type  TEXT NOT NULL,  -- Entity Type (Concept, Person, Time, etc.)
  sub_type        TEXT,           -- Sub-type (Theory, Event, Place, etc.)
  domain          TEXT,
  secondary_domains TEXT[],
  era_group       TEXT,
  era_label       TEXT,
  depth           TEXT,
  summary         TEXT,
  tags            TEXT[],
  metadata        JSONB DEFAULT '{}',
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## Layer 2 — Media Types

**The raw material** — primitive formats that knowledge arrives in. These are the atoms.

### The 6 Media Types

1. **Text** — articles, excerpts, annotations
2. **Image** — photos, illustrations, charts
3. **Audio** — recordings, podcasts, lectures
4. **Video** — clips, documentaries, recordings
5. **Dataset** — tables, spreadsheets, data feeds
6. **3D Model** — objects, scenes, meshes

Media Types represent unassembled source material. They are not yet complete educational products.

---

## Layer 3 — Products

**Assembled from media, delivered passively to students** — finished things that don't require a response.

### The 8 Product Types

1. **Map** — spatial view over Place entities (derived)
2. **Timeline** — temporal view over Event/Period entities (derived)
3. **Simulation** — passive visualization of processes
4. **Documentary** — assembled video narrative
5. **Diagram** — visual explanation/relationship
6. **Narrative** — comprehensive text story
7. **Profile** — structured entity overview
8. **Game** — story-driven experience (passive mode)

### Special Note: Map and Timeline

**Map** and **Timeline** are NOT media types even though they might look like one. They are:
- **Derived products** — structured views assembled from entity data
- **Map**: spatial visualization over Place entities
- **Timeline**: temporal visualization over Event and Period entities
- Teachers select them as **output formats**, not as source material

### Flow Direction

Products → Student (one-way, passive consumption)

---

## Layer 4 — Activities

**Things that demand something back from the student** — performative engagement.

### The 5 Activity Types

1. **Exercise** — practice, drill, problem sets
2. **Quiz** — formative assessment, auto-graded
3. **Assessment** — summative evaluation, rubric-based
4. **Interactive Simulation** — hypothesis testing, exploration
5. **Game** — challenge-based with achievements/scoring

### Flow Direction

Activity ↔ Student (two-way, requires response)

### The Product vs Activity Distinction

The key difference is **direction of engagement**:

- **Product (Layer 3)**: Student receives and consumes
  - Example: Documentary about photosynthesis (passive viewing)
  - Example: Game with story mode (watch/navigate)
  
- **Activity (Layer 4)**: Student performs and responds
  - Example: Interactive simulation manipulating photosynthesis variables
  - Example: Game requiring decisions and strategy

Note: "Game" appears in both layers — differentiated by interactivity level.

---

## Database Structure

### Content Storage (Layers 2, 3, 4)

All content types (Media, Products, Activities) are stored in the `encyclopedia_media` table with layer tracking:

```sql
CREATE TABLE encyclopedia_media (
  id          TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL REFERENCES encyclopedia_items(id) ON DELETE CASCADE,
  media_type  TEXT NOT NULL,  -- Content type name
  layer       INTEGER CHECK (layer IN (2, 3, 4)),  -- Layer identifier
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Layer Constraints

The database enforces valid types per layer:

**Layer 2** (Media Types):
- Text, Image, Audio, Video, Dataset, 3D Model

**Layer 3** (Products):
- Map, Timeline, Simulation, Documentary, Diagram, Narrative, Profile, Game

**Layer 4** (Activities):
- Exercise, Quiz, Assessment, Interactive Simulation, Game

---

## TypeScript Types

### Entity Types

```typescript
export type EntityType =
  | "Concept"
  | "Process"
  | "Instance"
  | "Person"
  | "State"
  | "Time"
  | "Environment"
  | "Work"
  | "Technology"
  | "Institution"
  | "Movement"

export type EntitySubType =
  | "Theory" | "Theorem" | "Law" | "Principle" | "Model" | "Definition"
  | "Event" | "Period" | "Epoch"
  | "Place" | "Organism" | "Matter"
```

### Content Types

```typescript
export type MediaType = 
  | "Text" | "Image" | "Audio" | "Video" | "Dataset" | "3D Model"

export type ProductType = 
  | "Map" | "Timeline" | "Simulation" | "Documentary" 
  | "Diagram" | "Narrative" | "Profile" | "Game"

export type ActivityType = 
  | "Exercise" | "Quiz" | "Assessment" | "Interactive Simulation" | "Game"

export type AtlasContentType = MediaType | ProductType | ActivityType
export type AtlasLayer = 2 | 3 | 4
```

### Data Interfaces

```typescript
export interface AtlasItem {
  id: string
  title: string
  knowledge_type: EntityType
  sub_type: EntitySubType | null
  domain: string | null
  summary: string | null
  // ... other fields
}

export interface AtlasContent {
  id: string
  item_id: string
  media_type: AtlasContentType
  layer: AtlasLayer
  title: string
  description: string | null
  // ... other fields
}
```

---

## Migration Guide

### Database Migration

The Atlas system was implemented through database migrations:

1. **`20260227000000_migrate_to_atlas_taxonomy.sql`**
   - Adds `layer` column to `encyclopedia_media`
   - Adds `sub_type` column to `encyclopedia_items`
   - Updates existing data to new taxonomy
   - Adds validation constraints

2. **`20260227000001_seed_atlas_test_data.sql`**
   - Seeds comprehensive test data for all 4 layers
   - Demonstrates proper entity-content relationships

### Code Changes

1. **Type System** (`src/types/atlas.ts`)
   - Defines all Atlas types and interfaces
   - Provides helper functions for layer detection

2. **Atlas Page** (`src/app/(dashboard)/teacher/atlas/`)
   - Updated to use Atlas types
   - Added layer-based filtering
   - Updated UI labels to reflect Atlas terminology

3. **Navigation** (`src/app/(dashboard)/teacher/layout.tsx`)
   - Renamed "Encyclopedia" to "Atlas" in header

### Running Migrations

```bash
# Apply database migrations
supabase db push

# Or if using migration commands
npx supabase migration up
```

---

## UI Design Principles

### Visual Identity

Atlas uses a distinct color palette for each layer:

```css
--accent-entity:   #6b9fe8  /* Layer 1: Blue */
--accent-media:    #7ec8a0  /* Layer 2: Green */
--accent-product:  #e8a06b  /* Layer 3: Orange */
--accent-activity: #c46be8  /* Layer 4: Purple */
```

### Filters

The Atlas interface provides contextual filtering:

1. **Entity Type Filter** (Layer 1)
   - Dropdown showing 11 entity types
   - "All entity types" default option

2. **Layer Filter** (Layers 2-4)
   - Dropdown: "Layer 2 — Media", "Layer 3 — Products", "Layer 4 — Activities"
   - Filters content by layer

3. **Content Type Filter** (Layers 2-4)
   - Shows all available content types across layers
   - Labeled "All content types" (not "media types")

4. **Domain Filter**
   - Subject area classification

5. **Era Filter**
   - Timeline-based filtering (Ancient → Contemporary)

---

## Example Data

### Layer 1 — Entity Example

```json
{
  "id": "atlas-marie-curie",
  "title": "Marie Curie",
  "knowledge_type": "Person",
  "sub_type": null,
  "domain": "Natural Sciences",
  "summary": "Pioneered research on radioactivity...",
  "tags": ["radioactivity", "chemistry", "physics", "nobel-prize"]
}
```

### Layer 2 — Media Example

```json
{
  "id": "atlas-media-curie-biography",
  "item_id": "atlas-marie-curie",
  "media_type": "Text",
  "layer": 2,
  "title": "Marie Curie Biography",
  "description": "Comprehensive biography covering her life..."
}
```

### Layer 3 — Product Example

```json
{
  "id": "atlas-product-curie-narrative",
  "item_id": "atlas-marie-curie",
  "media_type": "Narrative",
  "layer": 3,
  "title": "Marie Curie: A Life of Discovery",
  "description": "Comprehensive narrative assembled from text, images...",
  "metadata": {
    "assembled_from": ["Text", "Image", "Audio"],
    "chapters": 8
  }
}
```

### Layer 4 — Activity Example

```json
{
  "id": "atlas-activity-curie-quiz",
  "item_id": "atlas-marie-curie",
  "media_type": "Quiz",
  "layer": 4,
  "title": "Marie Curie: Life and Discoveries Quiz",
  "description": "Quick quiz on Marie Curie's life, research...",
  "metadata": {
    "questions": 10,
    "type": "mixed",
    "auto_graded": true
  }
}
```

---

## Key Design Decisions

### 1. Single Content Table

All content (Media, Products, Activities) lives in one table (`encyclopedia_media`) with layer tracking. This:
- Simplifies queries (one table to join)
- Allows flexible categorization
- Enables layer-based filtering

### 2. Invisible Taxonomy

Teachers never see terms like "Layer 2" or "primitive" in the interface. The system:
- Shows contextual type lists
- Surfaces relevant options based on subject
- Hides complexity behind intuitive labels

### 3. Derived Products

Map and Timeline are special Products that:
- Are NOT raw media types
- Are derived from Entity data (Places, Events)
- Teachers select them as output formats
- System generates them from structured data

### 4. Game Ambiguity

"Game" appears in both Layer 3 and Layer 4:
- **Layer 3**: Passive story-driven games (watch/navigate)
- **Layer 4**: Interactive challenge games (perform/compete)
- `metadata` field clarifies: `{"passive": true}` or `{"scoring": true}`

---

## Future Enhancements

### Potential Additions

1. **Entity Sub-types Expansion**
   - More granular Process sub-types
   - Institution classifications
   - Work categorizations

2. **Content Assembly Tracking**
   - Record which Media items compose each Product
   - Visualize content dependency graphs

3. **Activity Scaffolding**
   - Link prerequisite Activities
   - Track difficulty progression

4. **ISCED Integration**
   - Map domains to ISCED-2011 categories
   - Discipline-specific type surfacing

---

## Technical Reference

### Key Files

- **Types**: `src/types/atlas.ts`
- **Main Page**: `src/app/(dashboard)/teacher/atlas/page.tsx`
- **Detail Page**: `src/app/(dashboard)/teacher/atlas/[slug]/page.tsx`
- **Migration**: `supabase/migrations/20260227000000_migrate_to_atlas_taxonomy.sql`
- **Seed Data**: `supabase/migrations/20260227000001_seed_atlas_test_data.sql`

### Color Constants

```typescript
export const LAYER_COLORS = {
  1: { accent: "#6b9fe8", glow: "rgba(107, 159, 232, 0.15)", name: "Entity Types" },
  2: { accent: "#7ec8a0", glow: "rgba(126, 200, 160, 0.15)", name: "Media Types" },
  3: { accent: "#e8a06b", glow: "rgba(232, 160, 107, 0.15)", name: "Products" },
  4: { accent: "#c46be8", glow: "rgba(196, 107, 232, 0.15)", name: "Activities" },
} as const
```

### Helper Functions

```typescript
// Check content type layer
isMediaType(type: string): boolean
isProductType(type: string): boolean
isActivityType(type: string): boolean
getLayerForType(type: string): AtlasLayer | null

// Get layer info
getLayerName(layer: AtlasLayer): string
getLayerDescription(layer: AtlasLayer): string
```

---

## Summary

Atlas is a comprehensive, principled approach to organizing educational knowledge. By structuring content into 4 clear layers — Entity Types, Media Types, Products, and Activities — it provides a robust taxonomy that remains invisible to teachers while powering intelligent content management and delivery.

The system's elegance lies in its simplicity: **11 entity types, 6 media types, 8 products, 5 activities** — a complete ontology for educational content that scales from individual concepts to entire curricula.
