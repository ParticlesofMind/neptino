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
Knowledge cards (new, see below) expose **Layer 1** entities directly.

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
| AI Chat                | `chat`        | —                           | Student-driven; Socratic / role-play / Q&A modes         |
| Exercise               | —             | Exercise                    | Open-ended written response; no card yet                 |
| Assessment             | —             | Assessment                  | Graded artefact (essay, portfolio, submission); no card  |
| Interactive Simulation | —             | Interactive Simulation      | Student-steered variant of `rich-sim`; no card yet       |

> **Note:** Game spans Atlas Layer 3 (Product) and Layer 4 (Activity). In the
> builder it is an **Activity** — the student must play, not just observe.
> AI Chat has no Atlas `ActivityType` equivalent — candidate for addition.
>
> **Simulation split:** The `rich-sim` card covers the *passive* (Product) variant.
> An interactive student-steered simulation is a separate Activity card, not yet built.

---

## Category: Knowledge  *(Atlas Layer 1 — Entity Types)*

Cards that surface a named Atlas entity directly, letting a teacher reference
"a concept", "a person", "a place", etc. without authoring raw media.

These do **not** yet exist as `CardType` values — they are the next tier to build.

### Entity Types (the 11 ontological categories)

| Entity          | Sub-types                                         | Typical use in a lesson                            |
|-----------------|---------------------------------------------------|----------------------------------------------------|
| **Concept**     | Theory, Theorem, Law, Principle, Model, Definition | Define a key idea; link to encyclopedia entry      |
| **Process**     | —                                                 | Explain a sequence of steps or a mechanism        |
| **Instance**    | —                                                 | A concrete example of a concept or process        |
| **Person**      | —                                                 | Biographical reference; link to timeline / profile |
| **State**       | —                                                 | A condition or situation (e.g. a country's status) |
| **Time**        | Event, Period, Epoch                              | Anchor to a point or span on a timeline            |
| **Environment** | Place, Organism, Matter                           | Geographic, ecological, or physical reference      |
| **Work**        | —                                                 | A book, artwork, law, treaty, or other artefact    |
| **Institution** | —                                                 | Organisation, school, government body              |
| **Technology**  | —                                                 | Tool, system, invention, platform                  |
| **Movement**    | —                                                 | Intellectual, social, or political movement        |

### Proposed Knowledge `CardType` values

```
"entity-concept"
"entity-process"
"entity-instance"
"entity-person"
"entity-state"
"entity-time"
"entity-environment"
"entity-work"
"entity-institution"
"entity-technology"
"entity-movement"
```

Or, if a single generic card is preferred:

```
"entity"   // with a `entityType: EntityType` field in content
```

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

## Three-tier model

```
Tier 1 — Entity    (Atlas Layer 1 — what the content is about)
         Fetched from Wikidata / Wikipedia. Not authored by the teacher.
         Attaches to cards as a tag (atomic) or scope (compound).

Tier 2 — Card      (Atlas Layers 2 – 4 — how content is delivered)
         Atomic builder cards dragged from the Make panel.
         May carry an optional entity tag.

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
├── Activities       (Layer 4 — student response required)
│   ├── Quiz
│   ├── Game
│   ├── AI Chat
│   └── (Exercise, Assessment, Interactive Simulation — not yet built)
│
└── Knowledge        (Layer 1 — entity references)  ← to be built
    ├── Concept       (Theory, Theorem, Law, Principle, Model, Definition)
    ├── Process
    ├── Instance
    ├── Person
    ├── State
    ├── Time          (Event, Period, Epoch)
    ├── Environment   (Place, Organism, Matter)
    ├── Work
    ├── Institution
    ├── Technology
    └── Movement
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
| **Knowledge entity** | Instruction | Activation | In Activation: here is the entity with gaps to fill |

---

## Open questions

1. Should **Knowledge** cards be standalone drag-and-drop cards, or a sub-panel
   that enriches an existing card with entity metadata?
2. Should **Timeline** be in the **Data** category (passive view) or **Products**
   (it can be interactive)?
3. ~~Should **Exercise** and **Assessment** form a fifth category?~~ **Resolved:**
   Activities is now a first-class fifth category (Layer 4). Exercise and Assessment
   belong there alongside Quiz, Game, and AI Chat.
4. ~~Does **AI Chat** belong in Products or Activities?~~ **Resolved:** Activities.
   AI Chat requires student interaction and tracks conversation state.
