# Card Hierarchy

This file is the canonical reference for how cards in the Make panel are organised.
It maps the **builder card types** (`CardType` in `types.ts`) to their position in
the **Atlas knowledge system** (`src/types/atlas.ts`) so the two stay in sync.

---

## Atlas Layer Overview

| Layer | Name        | Question it answers                    |
|-------|-------------|----------------------------------------|
| 1     | Entity      | What is the knowledge about?           |
| 2     | Media       | What raw format does it arrive in?     |
| 3     | Products    | How is it assembled for delivery?      |
| 4     | Activities  | What does the student have to do?      |

Cards in the Make panel represent **Layers 2 – 4**.
Layer 1 entities surface in two ways: as **inline entity references** within card
content, and as the **Atlas** — see below.

---

## Category: Media  *(Atlas Layer 2)*

Passive, raw-material cards. No student response required.

| Card label  | `CardType`   | Atlas `MediaType`  | Notes                                          |
|-------------|--------------|--------------------|------------------------------------------------|
| Text        | `text`       | Text               | Rich-text (TipTap); AI generation supported    |
| Image       | `image`      | Image              | Upload or URL; alt text required               |
| Audio       | `audio`      | Audio              | Waveform player; chapter markers; transcript   |
| Video       | `video`      | Video              | YouTube / Vimeo / hosted; captions; chapters   |
| Animation   | `animation`  | —                  | Lottie / GIF / SVG; not a distinct Atlas type  |
| 3D Model    | `model-3d`   | 3D Model           | WebGL viewer (React Three Fiber)               |
| Document    | `document`   | —                  | PDF / slide deck / article embed               |

> **Atlas gap:** Animation and Document are builder conveniences not listed in
> `MediaType`. They may warrant addition to Atlas Layer 2 in a future schema update.

---

## Category: Data  *(Atlas Layer 3 — structured views)*

Products that organise data visually. Delivered passively.

| Card label | `CardType` | Atlas `ProductType` | Notes                                              |
|------------|------------|---------------------|----------------------------------------------------|
| Map        | `map`      | Map                 | Spatial view over Place entities; OSM embed        |
| Chart      | `chart`    | —                   | Recharts editor; Line / Bar / Area / Scatter / Pie |
| Diagram    | `diagram`  | Diagram             | SVG node-edge builder; flowchart / concept map     |
| Table      | `table`    | —                   | Inline spreadsheet editor; sortable rows           |
| Dataset    | `dataset`  | —                   | Metadata reference; row/col counts; format tag     |

> **Atlas gap:** Chart, Table, and Dataset have no direct `ProductType` equivalent.
> Timeline (a `ProductType`) has no card yet — candidate for addition.
>
> **Note on Dataset placement:** `Dataset` is classified as a `MediaType` in
> `atlas.ts` (Layer 2 — raw material), but sits in the Data category here as a
> structured view. This inconsistency should be resolved: if Dataset is raw
> material it belongs in Media; if it is a structured view it should be added to
> `ProductType`. Decision pending.

---

## Category: Products  *(Atlas Layer 3 — assembled content)*

Finished, authored products assembled from media. Delivered **passively** — no
student response required.

| Card label  | `CardType` | Atlas `ProductType` | Notes                                                    |
|-------------|------------|---------------------|----------------------------------------------------------|
| Simulation  | `rich-sim` | Simulation          | Embeddable / iframe widget; passive observation only     |

> **Missing Atlas Products without cards yet:**
> - `Timeline` — visual chronology of Event / Period entities
> - `Documentary` — authored narrative video + text composition
> - `Narrative` — long-form story structure with chapters
> - `Profile` — structured biographical or entity profile page

---

## Category: Activities  *(Atlas Layer 4 — student response required)*

Cards that require the student to **do** something. The defining trait is that
completion, correctness, or interaction state is tracked.

| Card label             | `CardType`    | Atlas `ActivityType`        | Notes                                                    |
|------------------------|---------------|-----------------------------|----------------------------------------------------------|
| Quiz                   | `interactive` | Quiz                        | Graded questions; MCQ / T-F / Short Answer / Ranking     |
| Game                   | `games`       | Game                        | Word Match / Memory / Fill-in-the-Blank / Drag-and-Drop  |
| AI Chat                | `chat`        | AI Chat                     | Student-driven; Socratic / role-play / Q&A modes         |
| Exercise               | —             | Exercise                    | Open-ended written response; no card yet                 |
| Assessment             | —             | Assessment                  | Graded artefact (essay, portfolio, submission); no card  |
| Interactive Simulation | —             | Interactive Simulation      | Student-steered variant of `rich-sim`; no card yet       |

> **Note:** Game spans Atlas Layer 3 (Product) and Layer 4 (Activity). In the
> builder it is an **Activity** — the student must play, not just observe.
> The `atlas.ts` schema lists Game in both `ProductType` and `ActivityType`;
> this is intentional — it can be delivered passively (Product) or require student
> interaction (Activity). Filtering logic should check both layers when needed.

---

## Category: Knowledge  *(Atlas Layer 1 — Entity Types)*

**Resolved: Knowledge entities do not exist as standalone draggable cards.**

Layer 1 entities surface in two distinct ways, both of which are structurally
separate from the Make panel card system:

### 1. Inline entity references *(annotation layer on card content)*

Any card whose content includes prose — Text, Audio transcript, Video caption,
Narrative, Documentary — can carry **inline entity references**: tappable
annotations that link a word or phrase to an Atlas Layer 1 entity. These are not
cards. They are a content primitive that lives inside a card's rich-text field.

When a student taps "Janissaries" in a Text card, a side drawer opens with the
Atlas entry. The lesson is not interrupted. The card is not replaced.

- Implemented as the `EntityRefMark` TipTap extension (`src/lib/tiptap/EntityRefMark.ts`)
- Stored as a `<span data-entity-id="..." data-entity-type="...">` in the card's
  rich-text HTML — no separate data field on the `DroppedCard` content object
- The teacher annotates during authoring; the student reads during delivery
- Drives no coordination logic; structurally inert at the card level

### 2. The Atlas *(course-level persistent reference layer)*

The **Atlas** is a course-level reference work — always accessible,
never part of the linear card sequence. It is consulted on demand, not read
in order. Think: dictionary, glossary, encyclopaedia of figures, cast of
characters.

It is architecturally separate from the canvas. The canvas is where learning
*happens*. The Atlas is where students and teachers *look things up*.

See the **Three-tier course structure** section below.

### What this means for `CardType`

No new `CardType` values are added for Knowledge entities. The one exception:
a single generic `"entity"` card may be warranted as an **Activation-specific
escape hatch** — "here is who Darwin was, before we study his theory" — where
the point of the lesson moment *is* the entity. This is scoped narrowly to
Activation and is not a general-purpose card type.

---

## Atomic vs Compound cards

Cards in the Make panel are either **atomic** or **compound**.

| Kind | Definition | Example |
|------|-----------|---------|
| **Atomic** | A single, independently deliverable card. Dropped alone on a canvas, it is complete and self-contained. | Text, Image, Map, Chart |
| **Compound** | A pre-wired blueprint of two or more atomic cards sharing coordinated state. Proximity of atoms is **not** the same as coordination — atoms must be explicitly wired together in a blueprint. | Ottoman Empire Simulation (Timeline + Map + Text, all driven by a shared era state) |

> **Key rule:** An atomic card placed next to another atomic card on the canvas
> does **not** become a compound. Compounds are explicit blueprints, not inferred
> from spatial arrangement.

### Which cards are typically atomic vs compound

| Typically atomic | Typically compound |
|------------------|--------------------|
| Text, Image, Audio, Video, Animation, 3D Model, Document | Simulation (Timeline + Map + Text wired together) |
| Map (standalone embed) | Documentary (Video + Text panel) |
| Chart, Diagram, Table, Dataset | Profile (Image + Text + Timeline) |
| Quiz, Game, AI Chat (Activities — self-contained by definition) | Interactive Simulation (Map + Chart + Controls) |

---

## Entity attachment model (Option D)

Atlas Layer 1 entities (fetched from Wikidata/Wikipedia) can attach to cards in
two structurally different ways:

### Entity tag — atomic cards (metadata only)

- **Optional**; does not change the card's behaviour
- Drives **search and filtering** in the file browser (e.g. show only Maps tagged
  with a Place entity, or Text cards tagged with a Concept)
- **No `onEntityChange` handler** — structurally inert at the type level; an entity
  tag cannot wire into coordination logic by design
- Stored as `entityTag?: AtlasItem` on the card's content object

### Entity scope — compound blueprints (behavioural)

- **Required** for a compound; defines the subject the compound is about
- **Drives constituent coordination** — the scope entity's properties set the shared
  state that all constituents read. For example:
  - A `Place` scope entity provides: geographic bounds → Map card
  - A `Time` / `Period` scope entity provides: date range → Timeline card
  - An `Institution` with spatial + temporal extent provides both
- **One scope entity per compound**; shared state is readable by all constituents
- Stored as `entityScope: AtlasItem` on the compound's blueprint

### Why the distinction matters

```
Atomic card:   [ Map ] ←── entity tag (metadata, inert)
                               No handler defined at type level.
                               Cannot coordinate with other cards.

Compound:  entity scope ──►[ Shared State ]
                                 │            │            │
                             [ Timeline ]  [ Map ]    [ Text ]
                             (era range)  (bounds)  (narrative)
```

The collapse risk — an atomic card accidentally becoming wired — is prevented at
the type level: atomic `CardType` values have no `onEntityChange` handler defined.
Behavioural attachment is structurally impossible on an atomic card.

---

## Three-tier course structure

A course is more than its canvases. Three layers operate in parallel:

```
Tier A — Sessions / Canvases / Tasks
         The linear instructional sequence.
         Where learning happens.
         Built from cards in the Make panel.

Tier B — Atlas  (reference layer)
         Course-scoped persistent reference work.
         Always accessible; never part of the card sequence.
         Where students and teachers look things up.

Tier C — Atlas  (global entity graph)
         Wikidata-anchored; community-contributed; editorially moderated.
         The substrate that Tier B draws from.
         Not course-specific; shared across all courses.
```

### Atlas detail

The Atlas surfaces as a **persistent panel or overlay** available
throughout the course — not a canvas page, not a card. Its entries are:

| Entry kind | Source | Who authors it |
|---|---|---|
| **Atlas stub** | Pulled from Atlas Layer 1 on entity link | Community / editorial |
| **Course extension** | Teacher annotation on top of an Atlas stub | Course teacher |
| **Custom entry** | Fully teacher-authored; no Atlas anchor | Course teacher |

A student in a course sees the Atlas global layer plus the teacher's course-scoped
enrichment. The global Atlas entry stays clean; course-specific elaboration is
layered on top.

Inline entity references (see Knowledge section above) link directly into the
Atlas: tapping an annotated word in a Text card opens the corresponding
Atlas entry in a side drawer.

**Implementation:** See `src/types/atlas.ts` (`AtlasReferenceEntry` union type) and
`src/components/atlas/AtlasDrawer.tsx`.

---

## Atlas contribution model

Atlas is a **community-contributed, editorially moderated** knowledge base
anchored to Wikidata where possible.

### Creation flow

1. Teacher types the entity name in the search field
2. System resolves against existing Atlas entries **and** Wikidata simultaneously
3. If a match exists → teacher enriches the existing entry (course extension)
4. If no match exists → teacher creates a new entry, which requires:
   - Selecting an `EntityType` (11 categories)
   - Selecting a `sub_type` where applicable
   - Providing a title, summary, and at least one domain tag
5. New entries enter **editorial review** before becoming globally visible
   (course-scoped immediately; Atlas-global after approval)

### Deduplication

`wikidata_id` is the canonical deduplication key. "Napoleon", "Napoleon I",
"Napoleon Bonaparte", and "Emperor Napoleon" all resolve to the same Wikidata
QID and therefore the same Atlas entry. Free-text entries without a Wikidata
anchor are deduplicated by title + `EntityType` + domain during editorial review.

---

## Three-tier card model

```
Tier 1 — Entity    (Atlas Layer 1 — what the content is about)
         Fetched from Wikidata / Wikipedia. Not authored by the teacher.
         Surfaces as inline annotations and Atlas entries.
         Attaches to cards as a tag (atomic) or scope (compound).

Tier 2 — Card      (Atlas Layers 2 – 4 — how content is delivered)
         Atomic builder cards dragged from the Make panel.
         May carry an optional entity tag.
         May carry inline entity reference annotations in rich-text fields.

Tier 3 — Compound  (pre-wired blueprint of cards + one entity scope)
         Named blueprints assembled from atomic cards.
         Entity scope drives coordinated shared state across constituents.
         Has a layout descriptor that controls spatial arrangement.
```

---

## Compound layout

How atomic cards are arranged spatially *inside* a compound is separate from the
**page layout engine** (`layoutEngine.ts`), which handles block pagination across
canvas pages. The page layout engine sees a compound as one opaque block.

### Layout descriptor

Each compound blueprint carries a `CompoundLayout` descriptor:

```ts
type CompoundLayout =
  | { kind: "stack" }
  // Vertical, each constituent full-width. Default for simple stacks.

  | { kind: "columns"; split: [number, number] }
  // Side-by-side. split = [leftPercent, rightPercent]. E.g. [60, 40].

  | { kind: "grid"; columns: 2 | 3 }
  // Equal-area grid. Suitable for galleries or multi-chart compounds.

  | { kind: "sidebar"; primary: string; panel: string }
  // Large focal area (primary) + narrower side panel (panel).
  // primary / panel = constituent keys within the blueprint.

  | { kind: "sticky-panel"; scroll: string; fixed: string }
  // One constituent scrolls with content (scroll); the other is pinned (fixed).
```

### Entity scope → default layout

The scope entity's type implies a canonical default layout:

| Scope entity type | Implied dominant constituent | Default layout |
|---|---|---|
| `Place` | Map | `sidebar` (Map as primary) |
| `Time` / `Period` / `Epoch` | Timeline | `stack` (Timeline on top) |
| `Institution` (spatial + temporal) | Map + Timeline | `columns` [60, 40] |
| `Person` | Profile image + text | `sidebar` (Text as primary) |
| `Concept` / `Process` | Text / Diagram | `stack` |

The blueprint encodes the canonical layout; the teacher can override it.

### Relationship to the existing layout engine

```
Page layout engine (layoutEngine.ts)
  └── sees the compound as ONE block with a measured height
        └── Compound layout (CompoundLayout)
              ├── constituent A
              ├── constituent B
              └── constituent C
```

The two levels are orthogonal and do not interfere.

---

## Full category summary

```
Make Panel
├── Media            (Layer 2 — raw formats)
│   ├── Text
│   ├── Image
│   ├── Audio
│   ├── Video
│   ├── Animation
│   ├── 3D Model
│   └── Document
│
├── Data             (Layer 3 — structured data views)
│   ├── Map
│   ├── Chart
│   ├── Diagram
│   ├── Table
│   └── Dataset
│
├── Products         (Layer 3 — assembled content, passive)
│   └── Simulation
│       (Timeline, Documentary, Narrative, Profile — not yet built)
│
└── Activities       (Layer 4 — student response required)
    ├── Quiz
    ├── Game
    ├── AI Chat
    └── (Exercise, Assessment, Interactive Simulation — not yet built)

─── NOT in the Make panel ──────────────────────────────────────────────

Atlas (reference layer)    (course-level persistent reference layer)
    Inline entity references — annotation primitive inside card content
    Course extensions — teacher elaboration on Atlas stubs
    Custom entries — fully teacher-authored

Atlas              (global entity graph — Layer 1)
    Concept       (Theory, Theorem, Law, Principle, Model, Definition)
    Process
    Instance
    Person
    State
    Time          (Event, Period, Epoch)
    Environment   (Place, Organism, Matter)
    Work
    Institution
    Technology
    Movement
```

---

## Atlas types not yet in the builder

The following Atlas types exist in `atlas.ts` but have no card representation:

| Atlas layer | Type                   | Priority | Notes                                          |
|-------------|------------------------|----------|------------------------------------------------|
| Layer 3     | Timeline               | High     | Read-only chronology; pairs with Time entities |
| Layer 3     | Documentary            | Medium   | Authored video + text narrative                |
| Layer 3     | Narrative              | Medium   | Chapter-based long-form content                |
| Layer 3     | Profile                | Medium   | Structured entity biography / fact sheet       |
| Layer 4     | Exercise               | High     | Open-ended practice task with written response; Activities category |
| Layer 4     | Assessment             | High     | Graded artefact (essay, portfolio, submission); Activities category |
| Layer 4     | Interactive Simulation | Medium   | Student-steered; separate from passive `rich-sim`; Activities category |

---

## Task field model

The field structure of a task depends on its **template type**. Each template type
answers a different pedagogical question and therefore exposes a different set of
task fields. Cards are dragged into whichever fields the active template type exposes.

### Current template types

| Template type | Purpose | Task fields |
|---|---|---|
| `lesson` | Active learning session | Activation (opt), Instruction, Practice, Feedback |
| `quiz` | Rapid knowledge check | Question, Feedback |
| `assessment` | Graded submission | Brief, Submission, Rubric |
| `exam` | Formal summative test | Question, Feedback, Scoring |
| `certificate` | Completion credential | — (no tasks; structural only) |

> **Not yet built — likely future types:**
> `reflection` (Prompt, Response, Synthesis), `workshop` (Brief, Build, Review),
> `tutorial` (Step, Try-it, Check), `project` (Goal, Deliverable, Criteria, Review)

---

### Lesson task fields *(template type: `lesson`)*

The `lesson` template uses a four-field active learning cycle. Transfer is modelled
as a second task with a harder Practice, not a fifth field.

```
[ Activation ]  →  [ Instruction ]  →  [ Practice ]  →  [ Feedback ]
  (optional)         (required)          (required)       (required)
```

| Field | Question it answers | Who acts |
|---|---|---|
| **Activation** | Why should I care? What problem can't I solve yet? | Student attempts before knowing the answer |
| **Instruction** | Here is the explanation / demonstration | Teacher delivers |
| **Practice** | Now you apply it | Student acts |
| **Feedback** | Here is whether you were right, and why | System or teacher evaluates |

**Activation** is the Feynman step: pose the question *before* the answer. The student
attempts it knowing they may fail — that failure is the pedagogical mechanism; it makes
the subsequent instruction land. Teachers who skip it leave the field blank; the task
still functions.

---

## Card field affinity

Each card type has a primary field affinity *per template type*. The table below
covers `lesson` fields. Other template types will define their own affinity mappings
when built.

The Make panel uses affinity to surface contextual guidance — cards are not locked to
a field, but affinity tells the teacher "this card is most at home here."

A **Text** card in Activation is a provocative question. In Instruction it is an
explanation. In Feedback it is an answer key. Same card type, different field, different
pedagogical role.

### Lesson field affinity

| Card | Primary affinity | Secondary affinities | Notes |
|---|---|---|---|
| **Text** | Instruction | Activation, Feedback | In Feedback: answer key or rubric |
| **Image** | Instruction | Activation | In Activation: a puzzle or unlabelled diagram |
| **Audio** | Instruction | — | Narration, primary source clip |
| **Video** | Instruction | — | Lecture excerpt, documentary clip |
| **Animation** | Instruction | — | Process visualisation |
| **3D Model** | Instruction | Practice | In Practice: identify / manipulate |
| **Document** | Instruction | — | Reading / reference material |
| **Map** | Instruction | Practice | In Practice: annotate / identify a location |
| **Chart** | Instruction | Practice | In Practice: read and interpret data |
| **Diagram** | Instruction | Activation | In Activation: incomplete diagram to complete |
| **Table** | Instruction | Practice | In Practice: fill missing cells |
| **Dataset** | Instruction | Practice | In Practice: run a query or identify a pattern |
| **Simulation** | Instruction | — | Passive observation; embeddable widget |
| **Timeline** | Instruction | Activation | In Activation: what happened next? |
| **Documentary** | Instruction | — | Authored video narrative |
| **Narrative** | Instruction | — | Long-form structured reading |
| **Profile** | Instruction | Activation | In Activation: who is this person, before the reveal |
| **Quiz** | Practice | Activation, Feedback | In Activation: diagnostic pre-test |
| **Game** | Practice | — | Competitive or gamified reinforcement |
| **AI Chat** | Practice | Activation, Feedback | In Activation: Socratic probe; in Feedback: tutor mode |
| **Exercise** | Practice | — | Open-ended written response |
| **Assessment** | Feedback | — | Graded submission artefact |
| **Interactive Sim** | Practice | — | Student-steered exploration |
| **Entity card** | Activation | — | Narrow escape hatch only; see Knowledge section |

---

## Marketplace

The **Marketplace** is a separate surface — distinct from Atlas — where teachers can
browse, acquire, and optionally sell content assets created by other teachers.

- Similar to Atlas in visual design but with transactional affordances (preview,
  acquire, purchase)
- Assets include simulations, compound blueprints, full lesson templates, game
  configurations, and other teacher-created content
- Free and paid listings; teachers can monetise their own creations
- Assets are imported into the teacher's own course builder on acquisition;
  they are not live-linked to the seller's originals

> **Relationship to Atlas:** Atlas is a knowledge graph (Layer 1 entities and their
> associated media). The Marketplace is a content asset store (Layers 2–4 card
> configurations). The two are complementary, not overlapping.

**Implementation:** See `src/types/marketplace.ts` for asset types and
`src/components/coursebuilder/sections/marketplace-section.tsx` for the existing
setup UI entry point.

---

## Open questions

1. Should **Dataset** move from the Data category to the Media category to align
   with its `MediaType` classification in `atlas.ts`?
2. Should **Timeline** be in the **Data** category (passive view) or **Products**
   (it can be interactive)?
3. ~~Should **Exercise** and **Assessment** form a fifth category?~~ **Resolved:**
   Activities is now a first-class fifth category (Layer 4). Exercise and Assessment
   belong there alongside Quiz, Game, and AI Chat.
4. ~~Does **AI Chat** belong in Products or Activities?~~ **Resolved:** Activities.
   AI Chat requires student interaction and tracks conversation state.
