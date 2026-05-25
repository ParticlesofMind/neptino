# Atlas Data Repository Build Instructions

Instruction date: 2026-05-24

## Purpose

Build the first version of the Atlas data repository without waiting for a complete taxonomy redesign.

Atlas is the foundation of Neptino. It should become the source-backed compendium from which teachers assemble knowledge-driven and task-driven course content quickly. The goal is not to create another manual encyclopedia editor. The goal is to create a provenance-aware knowledge and content substrate that already contains reusable entities, claims, media, displays, datasets, and task patterns before a teacher begins a course.

The repository must support Neptino's core promise: teachers should spend their time selecting, adapting, sequencing, and contextualizing high-quality material, not hunting for sources and rebuilding standard educational displays from scratch.

## Core Decision

Start the Atlas data repository now, but do not pour imported data directly into the current final Atlas tables as if the current taxonomy were settled.

Use a staged architecture:

1. Ingest source records into flexible staging tables.
2. Preserve raw source payloads, licenses, citations, confidence, and revision metadata.
3. Suggest taxonomy classifications without treating them as final.
4. Promote reviewed records into the current Atlas-facing tables only when they fit.
5. Continue taxonomy redesign in parallel.

This gives Neptino momentum while avoiding a future cleanup disaster.

## Non-Goals

Do not begin with a massive one-shot scrape of the internet.

Do not use an LLM as the source of truth for geography, history, dates, statistics, biographies, or educational facts.

Do not make the current `encyclopedia_items` and `encyclopedia_media` schema carry every future Atlas concern immediately.

Do not block all data work on a perfect ontology. The taxonomy will evolve.

Do not treat card types as the taxonomy. Cards are UI implementations of deeper knowledge, display, and task types.

## Design Principles

| Principle | Instruction |
|---|---|
| Provenance first | Every imported record must know where it came from, when it was retrieved, what license applies, and what revision/version was used if available. |
| Staging before canon | Imported data lands in candidate tables before becoming canonical Atlas data. |
| Taxonomy-flexible | Store suggested types and facets, not just final hardcoded categories. |
| Source-ranked | Prefer authoritative, open, machine-readable, revision-aware sources. |
| Demand-driven | Ingest around educational use cases and teacher searches, not abstract completeness. |
| Reviewable | Records should have review status, warnings, confidence, and promotion history. |
| Reusable | The main product output is Atlas packs and reusable task/display patterns, not isolated facts. |
| Reversible | Imports and promotions must be traceable and undoable. |

## Relationship To Current Atlas

Current Atlas-facing prototype tables:

| Current table | Current role |
|---|---|
| `encyclopedia_items` | Atlas Layer 1 entity entries shown in Atlas UI. |
| `encyclopedia_media` | Layer 2-4 media/product/activity rows attached to entities. |

Keep these tables working for the UI. Do not break the current Atlas sidebar, Make panel, or course builder.

Add a repository layer around them:

| New layer | Role |
|---|---|
| Source registry | Knows which external providers exist and how trusted they are. |
| Source records | Stores external records and raw payloads. |
| Candidate staging | Holds imported entity/asset/product/task candidates before review. |
| Promotion layer | Moves reviewed candidates into Atlas-facing tables. |
| Pack layer | Groups entities, claims, assets, products, and tasks into reusable course-starting bundles. |

## Minimum Schema To Build First

The first migration should create staging/source tables. Names can be refined, but the responsibilities should remain.

### `atlas_sources`

Registry of external and internal sources.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Stable source key, e.g. `wikidata`, `commons`, `loc`, `owid`, `natural_earth`. |
| `label` | Human-readable source name. |
| `base_url` | Provider URL. |
| `source_rank` | S/A/B/C/D rank from the resource audit. |
| `default_license` | Default license label if provider-wide; nullable because many sources vary per item. |
| `default_license_url` | Default license URL. |
| `requires_attribution` | Whether attribution is expected by default. |
| `commercial_use_status` | `allowed`, `restricted`, `mixed`, `unknown`. |
| `api_kind` | `sparql`, `rest`, `download`, `file`, `manual`, `other`. |
| `notes` | Caveats and integration notes. |
| `enabled` | Whether this source is active. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

### `atlas_source_records`

Stores individual records retrieved from a source.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `source_id` | References `atlas_sources.id`. |
| `external_id` | Provider identifier, e.g. Wikidata QID, Commons file title, LOC item ID. |
| `external_url` | Human-verifiable source URL. |
| `record_type` | `entity`, `media`, `dataset`, `geometry`, `document`, `claim`, `product`, `task`, `unknown`. |
| `title` | Best available label/title. |
| `description` | Best available short description. |
| `language` | Language code if relevant. |
| `license` | Item-level license label. |
| `license_url` | Item-level license URL. |
| `attribution` | Preformatted attribution if available. |
| `revision_id` | Source revision/version if available. |
| `retrieved_at` | Timestamp of retrieval. |
| `raw_payload` | JSONB source response or parsed payload. |
| `content_hash` | Hash for deduping and change detection. |
| `created_at` | Audit timestamp. |

Unique constraint:

`(source_id, external_id)`

### `atlas_entity_candidates`

Flexible staging for possible Atlas Layer 1 entities.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `primary_source_record_id` | Main source record. |
| `wikidata_id` | QID when available. |
| `title` | Candidate title. |
| `aliases` | Text array. |
| `description` | Candidate short summary. |
| `suggested_entity_type` | Current best guess from taxonomy. |
| `suggested_subtype` | Current best subtype guess. |
| `suggested_domains` | ISCED/domain labels or codes. |
| `spatial_profile` | JSONB: point, bounds, geometry availability, uncertainty. |
| `temporal_profile` | JSONB: dates, ranges, precision, uncertainty. |
| `source_confidence` | Confidence from source/reconciliation. |
| `classification_confidence` | Confidence in Atlas taxonomy placement. |
| `review_status` | `new`, `needs_review`, `approved`, `rejected`, `promoted`. |
| `warnings` | JSONB array of caveats. |
| `raw_merge_context` | JSONB reconciliation notes across sources. |
| `promoted_item_id` | Link to `encyclopedia_items.id` after promotion. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

### `atlas_asset_candidates`

Flexible staging for media and raw resource forms.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `source_record_id` | Source record. |
| `linked_entity_candidate_id` | Optional candidate entity link. |
| `linked_item_id` | Optional promoted Atlas item link. |
| `title` | Asset title. |
| `description` | Asset description. |
| `suggested_media_type` | Text, Image, Audio, Video, Dataset, 3D Model, Document, Animation, Code Snippet, Embed. |
| `url` | Source or asset URL. |
| `storage_path` | Optional Supabase Storage path if cached. |
| `mime_type` | MIME type if known. |
| `license` | License label. |
| `license_url` | License URL. |
| `attribution` | Attribution string. |
| `quality_score` | Internal quality score. |
| `review_status` | `new`, `needs_review`, `approved`, `rejected`, `promoted`. |
| `warnings` | JSONB caveats. |
| `metadata` | JSONB typed metadata, e.g. dimensions, duration, schema, model format. |
| `promoted_media_id` | Link to `encyclopedia_media.id` after promotion. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

### `atlas_product_candidates`

Flexible staging for generated or imported displays.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `linked_entity_candidate_id` | Entity candidate anchor. |
| `linked_item_id` | Promoted Atlas item anchor. |
| `title` | Product title. |
| `description` | Product description. |
| `suggested_product_type` | Map, Timeline, Chart, Table, Diagram, Profile, Narrative, Documentary, Simulation, Gallery. |
| `input_record_ids` | Source records/assets/claims used. |
| `render_payload` | JSONB data needed to render the product. |
| `source_summary` | JSONB citations and source list. |
| `confidence` | Product confidence. |
| `review_status` | `new`, `needs_review`, `approved`, `rejected`, `promoted`. |
| `warnings` | JSONB caveats. |
| `promoted_media_id` | Link to `encyclopedia_media.id` after promotion. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

### `atlas_task_candidates`

Flexible staging for reusable task-driven content.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `linked_entity_candidate_id` | Entity candidate anchor. |
| `linked_item_id` | Promoted Atlas item anchor. |
| `title` | Task title. |
| `description` | Task description. |
| `activity_family` | Recall, Identify, Classify, Compare, Interpret, Explain, Model, Argue, Create, Reflect, Assess, Converse. |
| `student_action` | More specific learner action. |
| `pedagogical_role` | Activation, Instruction, Practice, Feedback, Assessment, Reflection, Review. |
| `input_record_ids` | Source records/assets/products used. |
| `task_payload` | JSONB card/task configuration. |
| `rubric_payload` | JSONB rubric/scoring where relevant. |
| `review_status` | `new`, `needs_review`, `approved`, `rejected`, `promoted`. |
| `warnings` | JSONB caveats. |
| `promoted_media_id` | Link to `encyclopedia_media.id` after promotion. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

### `atlas_import_jobs`

Tracks import/reconciliation jobs.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID. |
| `source_id` | Source being queried/imported. |
| `job_kind` | `search`, `import`, `refresh`, `reconcile`, `promote`. |
| `query` | Search/import query. |
| `status` | `queued`, `running`, `succeeded`, `failed`, `cancelled`. |
| `started_at` | Timestamp. |
| `finished_at` | Timestamp. |
| `records_seen` | Count. |
| `records_created` | Count. |
| `records_updated` | Count. |
| `error_message` | Failure detail. |
| `metadata` | JSONB job details. |

### `atlas_packs`

Reusable educational bundles.

Recommended fields:

| Field | Purpose |
|---|---|
| `id` | Internal UUID or stable slug. |
| `title` | Pack title. |
| `description` | Pack description. |
| `pack_type` | Entity, Place, Event, Work, Concept, Process, Dataset, Activity, CourseSeed. |
| `anchor_item_id` | Promoted Atlas item if available. |
| `anchor_entity_candidate_id` | Candidate anchor if not yet promoted. |
| `domain` | Primary domain. |
| `secondary_domains` | Additional domains. |
| `era_group` | Optional era grouping. |
| `difficulty_band` | Optional grade/level band. |
| `entity_ids` | Included promoted entities. |
| `asset_ids` | Included assets. |
| `product_ids` | Included products. |
| `task_ids` | Included tasks. |
| `source_summary` | JSONB citations and licenses. |
| `quality_score` | Internal quality score. |
| `review_status` | `draft`, `needs_review`, `approved`, `retired`. |
| `created_at` | Audit timestamp. |
| `updated_at` | Audit timestamp. |

## Source Ranking

Use the ranking from `docs/resource-data-source-audit.md`.

Initial S/A priority sources:

| Source | First use |
|---|---|
| Wikidata | Entity spine, aliases, relations, claims, dates, identifiers. |
| Natural Earth | Baseline modern maps and geographic boundaries. |
| OpenHistoricalMap | Historical geography and time-aware map features. |
| Wikimedia Commons | Images, maps, audio, video, public-domain and CC media. |
| Library of Congress | Primary-source documents, maps, images, media. |
| Our World in Data | Chart-ready datasets. |
| World Bank | Official country indicators. |
| OECD | Policy/economic/statistical datasets. |
| UNESCO UIS | Education and culture statistics. |
| Internet Archive | Public-domain scans, audio, video, documents. |
| Project Gutenberg | Public-domain texts. |

Do not start with broad web search. Generic search can be a discovery aid, but it should not create canonical records automatically.

## Canonical Taxonomy Work In Parallel

While building the repository, also create a single canonical taxonomy source in TypeScript.

Recommended file:

`src/lib/atlas/taxonomy.ts`

It should define:

| Taxonomy section | Purpose |
|---|---|
| Entity types | Current accepted Layer 1 types and subtypes. |
| Media/resource types | Layer 2 accepted and provisional raw material types. |
| Product/display types | Layer 3 displays and generated products. |
| Activity families | Layer 4 task families independent of UI card names. |
| Pedagogical roles | Activation, Instruction, Practice, Feedback, Assessment, Reflection, Review. |
| Student actions | Recall, identify, classify, compare, interpret, model, argue, create, reflect. |
| Aliases | Mappings from old names, source names, and card names to canonical names. |
| Status | `active`, `provisional`, `deprecated`. |

Do not require the taxonomy to be perfect before ingestion. Require only that imports store suggested classifications and aliases clearly.

## Promotion Flow

Promotion is the path from candidate/staging to teacher-visible Atlas.

1. Source connector retrieves a record.
2. Record is stored in `atlas_source_records`.
3. Reconciliation checks existing source records and current Atlas items.
4. Candidate is created or updated.
5. System suggests entity type, subtype, domain, temporal profile, spatial profile, and warnings.
6. Reviewer or trusted automation approves candidate.
7. Candidate is promoted into current Atlas-facing tables:
   - Entity candidate -> `encyclopedia_items`
   - Asset/product/task candidate -> `encyclopedia_media`
8. Promotion stores back-links:
   - candidate has `promoted_item_id` or `promoted_media_id`
   - promoted Atlas row metadata includes source/candidate IDs
9. Atlas sidebar and course builder use promoted rows.

Promotion should be idempotent. Running it twice should update the same promoted record, not create duplicates.

## LLM Policy

LLMs may:

| Allowed | Example |
|---|---|
| Summarize source-backed records | Turn Wikidata + LOC metadata into a teacher-friendly summary. |
| Suggest taxonomy classification | Suggest `Institution`, `Time/Event`, `Work`, etc. |
| Generate task drafts from cited data | Create a compare task from two source-backed maps. |
| Explain uncertainty | Summarize conflicting sources or weak geometry. |
| Create display labels and alt text | Draft labels from known metadata. |

LLMs may not:

| Not allowed | Reason |
|---|---|
| Invent historical boundaries | High factual risk. |
| Invent statistics | High factual risk. |
| Invent citations | Unacceptable provenance failure. |
| Replace source retrieval | Atlas must know where facts came from. |
| Promote unverified source data silently | Teachers and students need trust signals. |

## First Vertical Slice

Build one narrow slice before broad ingestion.

Recommended slice:

`Ottoman Empire`

Expected flow:

1. Search `Ottoman Empire`.
2. Query Wikidata.
3. Store Wikidata source record.
4. Create entity candidate with QID, aliases, summary, suggested type, temporal profile.
5. Query Wikimedia Commons for related images/maps.
6. Store media source records and asset candidates.
7. Query OpenHistoricalMap for historical geography candidates.
8. Store geometry/product candidates with warnings and confidence.
9. Promote the entity candidate into `encyclopedia_items`.
10. Promote a small number of reviewed media/product candidates into `encyclopedia_media`.
11. Show the promoted entity in the Atlas sidebar.
12. Let a Map or Timeline resource retrieve source-backed candidates from Atlas metadata.

This proves the full loop without boiling the ocean.

## Second Vertical Slice

Recommended slice:

`William Shakespeare`

Expected flow:

1. Search/import Wikidata entity.
2. Attach Work entities: `Romeo and Juliet`, `Hamlet`, `Macbeth`, etc.
3. Attach public-domain text/document candidates from Project Gutenberg, Internet Archive, LOC, Wikisource if added later.
4. Attach Commons/LOC imagery.
5. Generate a Work pack and Activity pack:
   - identify character relationships
   - compare historical context
   - interpret a passage
   - timeline Elizabethan theatre

This validates humanities use cases, not just maps/data.

## Database Safety

Because this is Supabase/Postgres:

1. Use a new migration for schema changes.
2. Enable RLS on new public-schema tables.
3. Public/client access should usually be read-only and limited to approved/promoted data.
4. Staging tables should not be broadly writable from clients.
5. Do not expose service-role keys to the browser.
6. Keep raw source payloads in server-controlled tables.
7. Consider private schema for import internals if staging should not be exposed through the Data API.

## UI Implications

Do not build a giant admin UI first.

Build small, useful surfaces:

| Surface | Purpose |
|---|---|
| Atlas source search | Search local Atlas first, then external source connectors. |
| Candidate review panel | View source, license, warnings, suggested classification, promote/reject. |
| Source badges | Show source rank, license, citation, confidence, review state. |
| Pack preview | Show what a teacher gets before importing into a course. |
| Resource import picker | Search constrained by resource type, e.g. map sources for Map, data sources for Chart. |

## Definition Of Done For Repository V1

Atlas Data Repository V1 is ready when:

1. Sources can be registered with rank/license/caveats.
2. At least one external connector creates source records.
3. Entity candidates can be created from source records.
4. Asset/product candidates can be attached to an entity candidate.
5. Candidates preserve raw payload, license, retrieval date, source URL, and warnings.
6. Approved candidates can be promoted into the current Atlas tables.
7. Promoted records appear in the existing Atlas sidebar.
8. One Atlas pack can be assembled from promoted records.
9. The flow works for one history/geography example and one humanities example.

## Recommended Build Order

1. Add `docs/atlas-knowledge-content-taxonomy-review.md` and `docs/resource-data-source-audit.md` to the implementation context.
2. Create `src/lib/atlas/taxonomy.ts` as a canonical taxonomy config.
3. Add migration for `atlas_sources`, `atlas_source_records`, `atlas_import_jobs`.
4. Add migration for candidate tables.
5. Seed `atlas_sources` with top-ranked providers.
6. Implement Wikidata connector first.
7. Implement local source-record upsert and content hashing.
8. Implement entity candidate creation and reconciliation.
9. Implement promotion into `encyclopedia_items`.
10. Replace stub Atlas entity search with an API-backed search.
11. Add Wikimedia Commons connector for asset candidates.
12. Add promotion into `encyclopedia_media`.
13. Build minimal candidate review UI.
14. Build first Atlas pack preview.

## Bottom Line

Start the Atlas data repository now, but make it a staging-first, provenance-first system. Do not wait for the final taxonomy, and do not pretend the current taxonomy is final.

The correct architecture lets Neptino ingest useful source-backed material today while preserving enough metadata to reclassify, reconcile, and improve it as the Atlas taxonomy matures.
