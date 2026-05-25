# Atlas Knowledge And Content Taxonomy Review

Review date: 2026-05-24

## Product Premise

Neptino's core promise is not merely that teachers can build courses. It is that teachers can assemble high-quality, source-backed knowledge and learning tasks dramatically faster than they could by researching, collecting, formatting, and designing everything manually.

That means Atlas cannot be a side encyclopedia. Atlas has to be the substrate from which course content is found, generated, cited, displayed, transformed, and assessed.

The key distinction:

| Mode | Teacher intent | Neptino should provide |
|---|---|---|
| Knowledge-driven content | "I need to teach the Ottoman Empire, photosynthesis, Shakespeare, or derivatives." | Existing Atlas entities, claims, media, maps, timelines, charts, diagrams, profiles, and explainers. |
| Task-driven content | "I need students to practice, compare, classify, explain, solve, debate, or produce something." | Existing task templates bound to Atlas entities, claims, datasets, and media. |

Most reusable content should exist before a teacher starts a new course. The teacher should spend time selecting, adapting, sequencing, and contextualizing, not hunting for base knowledge and rebuilding standard displays.

## Current Taxonomy Shape

Current Atlas model:

| Layer | Current purpose | Code location |
|---|---|---|
| Layer 1 | Entity types: what knowledge is about | `src/types/atlas.ts` |
| Layer 2 | Media types: raw formats | `src/types/atlas.ts`, `encyclopedia_media.layer = 2` |
| Layer 3 | Products: passive assembled displays | `src/types/atlas.ts`, `encyclopedia_media.layer = 3` |
| Layer 4 | Activities: student response | `src/types/atlas.ts`, `encyclopedia_media.layer = 4` |
| Domain | ISCED-F 2013 broad subject domain | `src/types/atlas.ts`, `src/data/isced-f-2013.ts` |
| Builder cards | Make panel resources, activities, experiences, compositions | `card-type-registry.ts`, `CARD-HIERARCHY.md` |

The four-layer idea is strong. It correctly separates what something is about from how it is delivered. The issue is that the implementation is starting to drift across three separate taxonomies:

1. `src/types/atlas.ts`
2. `src/components/encyclopedia/atlas-taxonomy.ts`
3. `src/components/coursebuilder/create/CARD-HIERARCHY.md` plus `card-type-registry.ts`

Atlas should have one canonical taxonomy source, with UI labels, database constraints, filters, and Make-panel groupings derived from it.

## Main Taxonomy Problems

| Problem | Why it matters | Example |
|---|---|---|
| Subtype drift | `atlas.ts` and `atlas-taxonomy.ts` disagree on subtype coverage. | `Process` subtypes exist in `atlas-taxonomy.ts` but not in `EntitySubType`. |
| Resource/card drift | Builder has useful resource types absent from Atlas media types. | Animation, Document, Embed, Code snippet. |
| Dataset ambiguity | Dataset is a raw resource, but currently appears in Data/product contexts. | A CSV is raw media; a chart made from it is a product. |
| Task taxonomy is underpowered | Neptino's appeal depends on reusable task patterns, not just resource display. | "Compare two maps", "classify organisms", "explain a primary source." |
| `State` is ambiguous | It can mean political state, physical state, mental state, or condition. | The Ottoman Empire is not a `State` in this taxonomy; it is currently closer to `Institution`. |
| `Environment` is overloaded | Place, organism, and matter are very different retrieval problems. | Maps need Places; biology needs organisms; chemistry needs substances. |
| Activities and experiences overlap | The Make panel groups do not map cleanly to Atlas Layer 4. | Game is both Product and Activity; Simulation can be passive or interactive. |
| Domain is too shallow | Broad ISCED labels are useful, but not enough for retrieval or course planning. | Shakespeare needs Literature, Theatre, History, Language, and likely detailed ISCED codes. |
| No explicit source/provenance layer | Imported resources need source, license, confidence, revision, and attribution. | Historical map claims cannot be treated like manually typed card text. |

## Recommended Top-Level Model

Atlas should organize content by five orthogonal axes. These should be stored separately, not collapsed into one "type" field.

| Axis | Question | Examples |
|---|---|---|
| Knowledge object | What is this about? | Person, Place, Event, Concept, Work, Institution. |
| Content form | What format or display is this? | Text, Image, Dataset, Map, Timeline, Chart, Diagram. |
| Pedagogical role | Why is it here in the lesson? | Activate, Explain, Demonstrate, Explore, Practice, Assess, Reflect, Review. |
| Student action | What must the learner do? | Recall, identify, classify, compare, interpret, model, argue, create. |
| Source quality | Why should we trust it? | Source provider, license, revision, confidence, citation, review state. |

This is the shift that unlocks scale. "Map" should not be the only meaningful category. A map can be an explanation, an activation puzzle, a practice object, or an assessment artifact. A dataset can become a chart, a map, a table, a simulation input, or a student investigation.

## Proposed Atlas V2 Taxonomy

### Layer 1: Knowledge Entities

The current entity list is close, but some names should be clarified before Atlas grows.

| Current type | Recommendation | Reason |
|---|---|---|
| Concept | Keep | Strong and broadly useful. |
| Process | Keep | Essential for science, history, methods, procedures, and causality. |
| Instance | Replace or narrow to `Object` / `Case` | `Instance` is too abstract for teachers and search. |
| Person | Keep | Essential. |
| State | Rename to `Condition` or split | Avoid confusion with political states; use for physical, psychological, health, and social states. |
| Time | Consider splitting into `Event` and `Period`, or keep with required subtypes | Timeline generation needs Event and Period as first-class retrieval targets. |
| Environment | Split or enforce subtypes | Place, Organism, and Matter have different data sources and resource needs. |
| Work | Keep | Books, paintings, films, papers, plays, songs. |
| Technology | Keep, but clarify as `Technology/System/Tool` | Useful for STEM and history of technology. |
| Institution | Rename to `Organization` or keep with subtypes | "Institution" is good for schools/states/churches, but companies and armies also appear. |
| Movement | Keep | Political, artistic, intellectual, religious, social movements. |

Recommended practical choice: do not do a huge migration immediately. Keep current top-level types for now, but add a stronger subtype/facet model:

| Facet | Purpose |
|---|---|
| `entity_type` | Broad stable category. |
| `entity_subtype` | Specific kind, validated per type. |
| `spatial_profile` | Whether entity has point, polygon, bounding box, or none. |
| `temporal_profile` | Whether entity has exact dates, date range, approximate era, or none. |
| `agent_profile` | Whether entity can act, create, govern, own, influence. |
| `work_profile` | Whether entity has author, medium, edition/version, language. |

This avoids a brittle ontology war while still making maps, timelines, and resource generation much smarter.

### Layer 2: Source Media / Resources

Atlas Layer 2 should include all reusable raw material forms that can be sourced, stored, linked, or transformed.

| Proposed media/resource type | Current status |
|---|---|
| Text | Present |
| Image | Present |
| Audio | Present |
| Video | Present |
| Dataset | Present |
| 3D Model | Present |
| Document | Builder exists; missing from Atlas type |
| Animation | Builder exists; missing from Atlas type |
| Code Snippet | Builder exists; missing from Atlas type |
| Embed | Builder exists; missing from Atlas type |

Recommended rule: Layer 2 is raw material. It can be cited, attached to entities, and reused across many products and tasks.

### Layer 3: Products / Knowledge Displays

Layer 3 should represent composed or transformed presentations of knowledge. These are still passive unless they track student response.

| Product type | Notes |
|---|---|
| Map | Spatial view over entities, claims, or datasets. |
| Timeline | Temporal view over events, periods, claims, or media. |
| Chart | Visualized dataset or claim series; should be added to Atlas products. |
| Table | Structured view over records; should be added or treated as Dataset display mode. |
| Diagram | Entity/relation/process display. |
| Profile | Structured entity page. |
| Narrative | Long-form structured explanation. |
| Documentary | Video-centered narrative composition. |
| Simulation | Passive model/display with changing state. |
| Gallery | Collection display for images, documents, models, or media. |

Recommended rule: if it organizes knowledge for viewing, it is a Product. If it asks the student to respond and tracks state, it is an Activity.

### Layer 4: Tasks / Activities

Layer 4 should be expanded from card names into reusable task patterns. This is where the "400% faster" promise becomes real.

| Activity family | Examples |
|---|---|
| Recall | Flashcards, quick quiz, label recall. |
| Identify | Point to a map region, identify a structure, select evidence. |
| Classify | Sort, match, categorize, group examples. |
| Compare | Compare maps, sources, theories, works, datasets. |
| Interpret | Read a chart, analyze a primary source, infer from image/audio/video. |
| Explain | Short answer, narrated response, whiteboard explanation. |
| Model | Build a diagram, manipulate a simulation, complete a process. |
| Argue | Debate prompt, claim-evidence-reasoning, source evaluation. |
| Create | Essay, project, code, presentation, design artifact. |
| Reflect | Journal, metacognitive check, self-assessment. |
| Assess | Rubric-scored submission, exam question, portfolio task. |
| Converse | AI chat, role-play, Socratic tutor, interview simulation. |

Recommended rule: builder card types are UI implementations of activity families. They should not be the taxonomy itself.

## Make Panel Reclassification

The Make panel should use teacher-facing groups, but those groups should map cleanly to Atlas.

| Make group | Purpose | Atlas mapping |
|---|---|---|
| Resources | Raw reusable materials | Layer 2 |
| Displays | Passive knowledge views | Layer 3 |
| Activities | Student-response tasks | Layer 4 |
| Experiences | Coordinated multi-card products/tasks | Compound blueprints over Layers 2-4 |
| Compositions | Layout structures only | Not Atlas content; presentation scaffolds |
| Library | Existing saved/imported items | Cross-layer retrieval surface |

Current "Experiences" should be reserved for compound, coordinated, reusable learning moments. "Compositions" should remain layout-only. This prevents layouts from being confused with content.

## Atlas Packs: The Crucial Product Unit

Teachers should rarely start from blank entities. Atlas should offer prebuilt, source-backed packs.

| Pack type | Contents |
|---|---|
| Entity pack | Summary, aliases, timeline facts, related entities, source claims, media. |
| Place pack | Coordinates, boundaries, maps, region hierarchy, historical changes. |
| Event pack | Causes, chronology, participants, locations, primary sources, consequences. |
| Work pack | Author, editions, excerpts, themes, characters, context, criticism. |
| Concept pack | Definition, examples, non-examples, diagrams, common misconceptions. |
| Process pack | Steps, causal model, animation/simulation candidates, assessment prompts. |
| Dataset pack | Variables, schema, source, chart presets, map presets, questions. |
| Activity pack | Reusable task pattern bound to entity/resource inputs. |

This is where Atlas becomes Neptino's compendium rather than a search index. Course creation should start by selecting packs and task patterns, then adapting them to students, schedule, and pedagogy.

## Canonical Data Model Direction

The current `encyclopedia_items` and `encyclopedia_media` tables can support the prototype, but Atlas V2 needs a richer normalized layer.

| Table / concept | Purpose |
|---|---|
| `atlas_entities` | Canonical Layer 1 entries, usually anchored to external IDs. |
| `atlas_entity_aliases` | Names, languages, alternate spellings. |
| `atlas_claims` | Atomic sourced facts about entities. |
| `atlas_relations` | Entity-to-entity edges. |
| `atlas_sources` | Provider registry and rank. |
| `atlas_source_records` | External records: Wikidata QID, Commons file, LOC item, OWID chart. |
| `atlas_assets` | Media/resource links or cached artifacts. |
| `atlas_products` | Maps, timelines, charts, diagrams, narratives generated from resources/claims. |
| `atlas_tasks` | Reusable task definitions bound to entity/resource inputs. |
| `atlas_packs` | Curated bundles for course creation. |
| `course_atlas_extensions` | Teacher/course-specific overlay. |

The existing tables can either be migrated into these names later or treated as compatibility views during transition.

## Recommended Sequence

1. Declare one canonical taxonomy source in TypeScript.
2. Generate UI filters and database constraints from that source.
3. Resolve current taxonomy drift: Animation, Document, Code snippet, Embed, Chart, Table, Dataset, Timeline, Exercise, Assessment.
4. Add pedagogical role and student action as first-class metadata on cards/tasks.
5. Add source/provenance metadata before large-scale ingestion.
6. Build Atlas packs as the main reusable unit.
7. Let course creation start from packs, not blank cards.

## Immediate Decisions Needed

| Decision | Recommendation |
|---|---|
| Is Atlas an encyclopedia or a generation substrate? | Treat it as a generation substrate with encyclopedia UI on top. |
| Are Resources enough? | No. Resources need Products and Activities built from them. |
| Should cards define taxonomy? | No. Cards are UI implementations of deeper content/task types. |
| Should Dataset be Media or Product? | Dataset is Layer 2 media; Chart/Table/Map are Layer 3 products. |
| Should Animation and Document enter Atlas Layer 2? | Yes. They are reusable raw materials. |
| Should Chart and Table enter Atlas Layer 3? | Yes. They are knowledge displays. |
| Should task types be expanded? | Yes. Activity families should drive reusable task generation. |
| Should Atlas ingest everything? | No. Build a curated, source-ranked, demand-driven compendium. |

## Bottom Line

The current Atlas four-layer model is the right foundation, but it needs one more conceptual step: separate knowledge ontology, content form, pedagogical role, student action, and source quality.

If Neptino gets this right, teachers will not begin with a blank Make panel. They will begin with Atlas packs: source-backed knowledge, prebuilt displays, and task patterns already attached to the entity or concept they want to teach.
