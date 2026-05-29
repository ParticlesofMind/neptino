# Course Builder Canvas Layout Design Implementation

## Purpose

Neptino should treat the lesson canvas as a print-native teaching surface, not as a generic dashboard. The canonical page remains A4 or US Letter sized, but the full sheet should become usable design territory. Margins are not dead space. They are controlled zones for legends, captions, metadata, callouts, source notes, thumbnails, page numbers, timelines, and map keys.

The implementation goal is a content-sensitive canvas system inspired by dense atlas and textbook pages such as *History of the World Map by Map*: map-led pages, evidence panels, timelines, pictures, labels, callouts, tables, and concise text blocks arranged inside a disciplined print page.

This document defines the design contract and implementation path.

## Core Principle

Keep A4 and US Letter as canonical page contracts, but let cards negotiate space according to their content role.

The page should not become wider because a monitor is wide. Instead, the authoring surface should use:

- stable print proportions
- flexible card min, preferred, and max dimensions
- active margin zones
- layout recipes chosen by content mix
- expansion modes for immersive media
- print-safe constraints for critical information

## Current Baseline

The current default canvas is approximately A4 at browser pixel scale:

```ts
export const DEFAULT_PAGE_DIMENSIONS = {
  widthPx: 794,
  heightPx: 1123,
  margins: { top: 96, right: 76, bottom: 96, left: 76 },
}
```

That gives the current body width:

```ts
794 - 76 - 76 = 642
```

The current composition width constants already point in the right direction:

```ts
export const CANVAS_BODY_WIDTH_PX = 642
export const CANVAS_COMPOSITION_CONTENT_WIDTH_PX = 620
```

The problem is that this treats margins as unavailable and treats card width as a fixed dimension. We should instead treat card dimensions as layout preferences inside a richer page-zone system.

## Page Zone Model

A page should expose several nested boxes:

```ts
type PageZones = {
  sheetBox: Rect
  printSafeBox: Rect
  textBox: Rect
  bodyBox: Rect
  marginZones: {
    top: Rect
    right: Rect
    bottom: Rect
    left: Rect
  }
}
```

### Zone Meanings

`sheetBox`
: The full A4 or US Letter page. Background maps, full-bleed color fields, large images, and page-wide timelines may use this zone.

`printSafeBox`
: The area that should survive ordinary home and school printers. Critical text, legends, labels, QR codes, page numbers, instructions, and answer fields should remain inside this box.

`textBox`
: The preferred area for long-form reading. This is narrower than the full sheet because line length matters.

`bodyBox`
: The main content field. This is close to the current non-margin area, but it is no longer the only place where cards can live.

`marginZones`
: Active territories for compact supporting content. They are allowed to contain useful information, but they should follow print-safe rules when the content is critical.

## Suggested Default Zone Values

For the current A4-like canvas:

```ts
const PRINT_SAFE_INSET_PX = 32

const pageZones = {
  sheetBox: {
    x: 0,
    y: 0,
    width: dims.widthPx,
    height: dims.heightPx,
  },
  printSafeBox: {
    x: PRINT_SAFE_INSET_PX,
    y: PRINT_SAFE_INSET_PX,
    width: dims.widthPx - PRINT_SAFE_INSET_PX * 2,
    height: dims.heightPx - PRINT_SAFE_INSET_PX * 2,
  },
  bodyBox: {
    x: dims.margins.left,
    y: dims.margins.top,
    width: dims.widthPx - dims.margins.left - dims.margins.right,
    height: dims.heightPx - dims.margins.top - dims.margins.bottom,
  },
}
```

The exact values should be centralized and test-covered. The important design shift is that `bodyBox` is no longer the same thing as "all usable space."

## Card Layout Policy

Every card type should expose a policy. Existing `dimensions.width` and `dimensions.height` should be interpreted as preferred dimensions, not as hard dimensions.

```ts
type CardLayoutRole =
  | "primary"
  | "support"
  | "annotation"
  | "legend"
  | "timeline"
  | "caption"
  | "response"
  | "metadata"

type CardDensity = "compact" | "standard" | "dominant"

type CardLayoutPolicy = {
  role: CardLayoutRole
  density: CardDensity
  minWidth: number
  preferredWidth: number
  maxWidth: number
  minHeight: number
  preferredHeight?: number
  maxHeight?: number
  aspectRatio?: number
  allowedZones: Array<"text" | "body" | "margin" | "overlay" | "sheet">
  criticalContentMustStayPrintSafe: boolean
  canOverlay: boolean
  canPaginate: boolean
  canExpandImmersive: boolean
}
```

### Policy Defaults By Card Type

| Card type | Role | Min width | Preferred width | Max width | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| Map | primary | 60% body | 100% body | sheet or print-safe | Can host labels, callouts, legends, and overlays. |
| Timeline | timeline | 50% body | 100% body | sheet or print-safe | Often works best as a bottom strip. |
| Table | primary/support | 60% body | 100% body | body or print-safe | Should paginate or split if too tall. |
| Text | support | 220px | 280-340px | 50% body | Should avoid full-width paragraphs by default. |
| Legend | legend | 140px | 180-240px | 35% body | Good in margin rail or map overlay. |
| Caption | caption | 180px | 240-320px | 50% body | Can sit in margin zone or under media. |
| Source note | metadata | 160px | 220px | 45% body | Small, print-safe, usually bottom or margin. |
| Image/artifact | support/primary | 30% body | 40-70% body | body or sheet | Aspect-ratio driven. |
| Whiteboard | response | 60% body | 100% body | body | Usually needs immersive expansion. |
| Slides | primary | 60% body | 100% body | body | Current 720px default should be reconciled with page body. |
| Layout composition | primary | 100% body | 100% body | body or sheet | Owns a full page zone or recipe slot. |

Percent values should resolve against `bodyBox.width` unless a policy explicitly opts into `printSafeBox` or `sheetBox`.

## Margin Rules

Margins can contain content, but placement must distinguish decorative, supporting, and critical content.

### Allowed In Margins

- page number
- running header
- source note
- callout number
- mini legend
- thumbnail artifact
- inset map
- short caption
- coordinate/date label
- QR or reference code, if inside print-safe bounds

### Avoid In Margins

- long paragraph text
- primary instructions
- answer fields
- key assessment prompts
- dense tables
- anything that must survive printer clipping unless it is also inside `printSafeBox`

### Bleed-Like Usage

Neptino does not need true commercial-print bleed by default. But it should support "sheet-extending" visuals where a map, image, or color field reaches into the margins. Critical information inside those visuals still needs print-safe placement.

## Content-Sensitive Layout Recipes

The layout engine should choose recipes from the cards present on the page. Recipes should be deterministic enough for print, but flexible enough to adapt to card count and card policy.

### 1. Map-Led Atlas Page

Use when a page contains a map plus legend, timeline, captions, or evidence text.

Behavior:

- map receives dominant space
- map can extend toward the sheet edge or print-safe edge
- legend docks into a margin rail or map overlay
- timeline sits along the bottom as a strip
- short text panels float in a right rail or controlled column
- source note sits in bottom margin or lower-right print-safe area

### 2. Evidence Panel Page

Use when a page contains document excerpts, artifact images, citations, and analysis prompts.

Behavior:

- artifact or source excerpt gets primary placement
- text uses narrow reading columns
- citations and source notes move to margin zones
- response card gets protected body area

### 3. Data Investigation Page

Use when a page contains a dataset, chart, table, and written response.

Behavior:

- table or chart gets full body width if needed
- supporting explanation uses side or top panels
- long tables can paginate
- small summary stats can occupy margin cards

### 4. Comparison Page

Use when a page contains two maps, two sources, or map plus table.

Behavior:

- two primary regions share body width
- shared legend can sit in a margin or between panels
- captions align under each compared item
- text stays brief and symmetrical

### 5. Workbook Page

Use when response cards dominate.

Behavior:

- prompt stays print-safe
- response field gets stable writable area
- supporting media is compact
- margins hold hints, vocabulary, source notes, or teacher metadata

### 6. Spread-Aware Atlas View

Use in large-screen preview or print export when two pages are viewed together.

Behavior:

- left page may be map-led
- right page may carry explanation, source panels, timeline, and tasks
- both pages remain independently printable
- no content may depend on a spread to be understandable

## Layout Engine Responsibilities

The layout engine should answer these questions in order:

1. What is the dominant card on this page?
2. Which cards depend on the dominant card?
3. Which cards are critical and must remain print-safe?
4. Which cards can safely live in margin zones?
5. Which cards can overlay another card?
6. Which cards can shrink?
7. Which cards must paginate or move to the next page?
8. Which recipe best fits the current card mix?

The engine should not start with "what is this card's fixed width?" It should start with "what role does this card play on this page?"

## Implementation Plan

### Phase 1: Add Zone And Policy Primitives

Create a small layout module that computes page zones from `PageDimensions`.

Suggested file:

```txt
src/components/coursebuilder/create/layout/pageZones.ts
```

Create a card policy registry.

Suggested file:

```txt
src/components/coursebuilder/create/cards/cardLayoutPolicies.ts
```

Initial work:

- add `computePageZones(dims)`
- add `getCardLayoutPolicy(cardType, content?)`
- map existing default dimensions into preferred dimensions
- preserve current rendering behavior while policies are introduced

### Phase 2: Reconcile Card Widths

Replace hard width assumptions with resolved width:

```ts
const resolvedWidth = clamp(
  policy.preferredWidth,
  policy.minWidth,
  policy.maxWidth,
)
```

For body-constrained cards:

```ts
policy.maxWidth = pageZones.bodyBox.width
```

For sheet-aware cards:

```ts
policy.maxWidth = pageZones.printSafeBox.width
// or pageZones.sheetBox.width when non-critical visual bleed is allowed
```

Immediate target:

- layout compositions should max at body width by default
- slides should be adjusted to body width or given an explicit presentation policy
- maps and timelines should be allowed to use full body width
- legends, captions, and text should avoid full-width defaults

### Phase 3: Active Margin Rendering

Update `CanvasPage` so margin zones are explicit render layers, not just padding.

The page can keep its current grid, but add named overlay layers:

```txt
sheet background layer
margin layer
body layer
overlay/callout layer
print-safe debug layer
```

Critical content should be constrained to `printSafeBox`. Non-critical visual surfaces may extend into `sheetBox`.

### Phase 4: Recipe-Based Composition

Add a recipe selector that receives visible cards and page zones.

Suggested file:

```txt
src/components/coursebuilder/create/layout/layoutRecipes.ts
```

The first recipes should be:

- map-led atlas page
- evidence panel page
- data investigation page
- comparison page
- workbook page

Do not attempt full automatic magazine layout immediately. Start with deterministic recipes that cover the highest-value teaching surfaces.

### Phase 5: Print Verification

Add stress checks for:

- all pages render in print mode
- no critical card is outside print-safe bounds
- page count parity between editor and print document
- maps/tables/timelines do not overflow the sheet
- long tables and text paginate instead of clipping

Useful test assertions:

```ts
expect(criticalContentOutsidePrintSafe).toBe(0)
expect(sheetOverflowCount).toBe(0)
expect(printPageCount).toBe(editorPageCount)
```

## UX Requirements

Authoring should not expose all of this complexity at once.

The teacher-facing UI should eventually show:

- page size: A4 or US Letter
- page style: standard, atlas, worksheet, presentation
- card role: auto, primary, support, legend, caption, timeline
- expand on lesson: on or off for maps, tables, whiteboards, simulations
- print-safe warnings only when content is at risk

Most card placement should remain automatic.

## Design Guardrails

- Do not make the canonical page wider just because the screen is wider.
- Do not use full-width paragraphs by default.
- Do not treat margins as empty padding.
- Do not put critical text outside print-safe bounds.
- Do not make every card equally important.
- Do not solve map/table readability by abandoning print proportions.
- Do not make a separate print-only layout unless the screen layout cannot preserve print truth.

## Success Criteria

The new canvas system is working when:

- A map-led page can look dense and credible without feeling like a pile of cards.
- A teacher can print the lesson and still get a usable offline resource.
- Large monitors show the page better, not wider.
- Margins carry useful teaching information.
- Text remains readable.
- Maps, tables, timelines, and legends get enough space.
- Card sizing is policy-driven rather than hard-coded per renderer.
- The layout engine can explain why a card was placed where it was.

## Recommended First Build Slice

The smallest valuable implementation slice is:

1. Add `pageZones.ts`.
2. Add `cardLayoutPolicies.ts`.
3. Change card dimensions from hard width to preferred width.
4. Clamp composition cards to `bodyBox.width`.
5. Clamp text cards to a readable max width.
6. Add a map-led recipe that allows map plus legend plus timeline.
7. Add print-safe debug overlay behind a `debugCanvas=1` flag.
8. Add E2E checks for sheet overflow and print-safe critical content.

This gives Neptino the foundation for atlas-quality educational pages while preserving print as a first-class output.
