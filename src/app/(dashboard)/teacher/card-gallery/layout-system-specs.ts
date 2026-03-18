import type { CardType } from "@/components/coursebuilder/create/types"

// ─── Card slot size constraints ───────────────────────────────────────────────
// Minimum pixel width a slot must be to host a given card type.
// All cards support full-layout width as their maximum (no upper bound needed).
// Layout card types are excluded — they cannot be placed inside other slots.
export const CARD_MIN_SLOT_WIDTH_PX: Partial<Record<CardType, number>> = {
  text:        140,
  image:       120,
  audio:       200,
  video:       220,
  animation:   160,
  dataset:     240,
  "model-3d":  220,
  map:         260,
  chart:       220,
  diagram:     200,
  media:       220,
  document:    200,
  table:       240,
  "rich-sim":  300,
  "village-3d": 280,
  interactive: 280,
  games:       260,
  chat:        200,
  timeline:    480,
  legend:      120,
}

// Minimum pixel height a slot must be to host a given card type.
export const CARD_MIN_SLOT_HEIGHT_PX: Partial<Record<CardType, number>> = {
  text:        80,
  image:       80,
  audio:       56,
  video:       120,
  animation:   100,
  dataset:     120,
  "model-3d":  140,
  map:         160,
  chart:       140,
  diagram:     120,
  media:       140,
  document:    100,
  table:       120,
  "rich-sim":  200,
  "village-3d": 180,
  interactive: 180,
  games:       200,
  chat:        140,
  timeline:    80,
  legend:      60,
}

export interface LayoutPanelSpec {
  label: string
  note: string
  col?: string
  row?: string
  accent: string
  primary?: boolean
}

export interface LayoutHeaderSpec {
  label: string
  note: string
  height?: string
}

export interface LayoutSystemSpec {
  tag: string
  useCase: string
  cols: string
  rows: string
  panels: LayoutPanelSpec[]
  header?: LayoutHeaderSpec
}

export const LAYOUT_SYSTEM_SPECS: Partial<Record<CardType, LayoutSystemSpec>> = {
  "layout-split": {
    tag: "Comparison",
    useCase: "Side-by-side document, image, and argument comparison.",
    cols: "1fr 1fr",
    rows: "1fr",
    header: { label: "Header", note: "Framing question or comparison title", height: "44px" },
    panels: [
      { label: "Column A", note: "Source A / perspective A", col: "1 / 2", row: "1 / 2", accent: "#6b8fc4", primary: true },
      { label: "Column B", note: "Source B / perspective B", col: "2 / 3", row: "1 / 2", accent: "#b87070" },
    ],
  },
  "layout-stack": {
    tag: "Sequence",
    useCase: "Instruction then practice, or context then analysis.",
    cols: "1fr",
    rows: "3fr 2fr",
    header: { label: "Header", note: "Session title or learning objective", height: "44px" },
    panels: [
      { label: "Primary Stage", note: "Main explanation or narrative", col: "1 / 2", row: "1 / 2", accent: "#6b8fc4", primary: true },
      { label: "Secondary Stage", note: "Practice, reflection, or response", col: "1 / 2", row: "2 / 3", accent: "#b87c5c" },
    ],
  },
  "layout-feature": {
    tag: "Map Simulation",
    useCase: "Map-led simulation with controls and a time strip.",
    cols: "200px 1fr",
    rows: "1fr 140px",
    header: { label: "Header", note: "Simulation title or scenario brief", height: "44px" },
    panels: [
      { label: "Legend / Filters", note: "Layer toggles, symbol key", col: "1 / 2", row: "1 / 2", accent: "#b87c5c" },
      { label: "Main Canvas", note: "Dominant spatial or media surface", col: "2 / 3", row: "1 / 2", accent: "#6b8fc4", primary: true },
      { label: "Timeline Strip", note: "Chronology / navigation rail", col: "1 / 3", row: "2 / 3", accent: "#6b8fc4" },
    ],
  },
  "layout-sidebar": {
    tag: "Sidebar",
    useCase: "One dominant canvas with supporting context panel.",
    cols: "3fr 7fr",
    rows: "1fr",
    header: { label: "Header", note: "Title bar, navigation, or session title", height: "44px" },
    panels: [
      { label: "Sidebar", note: "Legend, glossary, controls", col: "1 / 2", row: "1 / 2", accent: "#555555" },
      { label: "Main Stage", note: "Primary teaching surface", col: "2 / 3", row: "1 / 2", accent: "#6b8fc4", primary: true },
    ],
  },
  "layout-quad": {
    tag: "Quad",
    useCase: "Four equal regions for balanced multi-source analysis.",
    cols: "1fr 1fr",
    rows: "1fr 1fr",
    header: { label: "Header", note: "Central question or organising theme", height: "44px" },
    panels: [
      { label: "Panel 1", note: "Source / view", col: "1 / 2", row: "1 / 2", accent: "#6b8fc4" },
      { label: "Panel 2", note: "Source / view", col: "2 / 3", row: "1 / 2", accent: "#b87070" },
      { label: "Panel 3", note: "Source / view", col: "1 / 2", row: "2 / 3", accent: "#5c9970" },
      { label: "Panel 4", note: "Source / view", col: "2 / 3", row: "2 / 3", accent: "#b87c5c" },
    ],
  },
  "layout-mosaic": {
    tag: "Mosaic",
    useCase: "Dense gallery or source browser over many small frames.",
    cols: "1fr 1fr 1fr",
    rows: "1fr 1fr 1fr",
    header: { label: "Header", note: "Gallery title or collection name", height: "44px" },
    panels: Array.from({ length: 9 }, (_, i) => ({
      label: `Cell ${i + 1}`,
      note: "Thumbnail / quick reference",
      accent: i % 2 === 0 ? "#6b8fc4" : "#555555",
    })),
  },
  "layout-triptych": {
    tag: "Triptych",
    useCase: "Three-column narrative, timeline, or evidence arrangement.",
    cols: "1fr 1fr 1fr",
    rows: "1fr",
    header: { label: "Header", note: "Narrative title or sequence label", height: "44px" },
    panels: [
      { label: "Left", note: "Context", col: "1 / 2", row: "1 / 2", accent: "#555555" },
      { label: "Center", note: "Primary focus", col: "2 / 3", row: "1 / 2", accent: "#6b8fc4", primary: true },
      { label: "Right", note: "Evidence / reflection", col: "3 / 4", row: "1 / 2", accent: "#b87c5c" },
    ],
  },
  "layout-trirow": {
    tag: "Tri-Row",
    useCase: "Top-to-bottom sequencing in three phases.",
    cols: "1fr",
    rows: "1fr 1fr 1fr",
    header: { label: "Header", note: "Phase or workflow title", height: "44px" },
    panels: [
      { label: "Row 1", note: "Activation", col: "1 / 2", row: "1 / 2", accent: "#b87070" },
      { label: "Row 2", note: "Instruction", col: "1 / 2", row: "2 / 3", accent: "#6b8fc4", primary: true },
      { label: "Row 3", note: "Practice / feedback", col: "1 / 2", row: "3 / 4", accent: "#5c9970" },
    ],
  },
  "layout-banner": {
    tag: "Banner",
    useCase: "Top summary band over two deep working panels.",
    cols: "1fr 1fr",
    rows: "90px 1fr",
    header: { label: "Header", note: "Session or activity title", height: "44px" },
    panels: [
      { label: "Header Banner", note: "Prompt / objective", col: "1 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Left Stage", note: "Primary content", col: "1 / 2", row: "2 / 3", accent: "#6b8fc4", primary: true },
      { label: "Right Stage", note: "Companion content", col: "2 / 3", row: "2 / 3", accent: "#b87c5c" },
    ],
  },
  "layout-broadside": {
    tag: "Broadside",
    useCase: "Wide heading zone with three aligned content panels.",
    cols: "1fr 1fr 1fr",
    rows: "120px 1fr",
    header: { label: "Header", note: "Document title or overarching theme", height: "44px" },
    panels: [
      { label: "Header", note: "Theme, question, or orientation", col: "1 / 4", row: "1 / 2", accent: "#555555" },
      { label: "Panel A", note: "Evidence / media", col: "1 / 2", row: "2 / 3", accent: "#6b8fc4", primary: true },
      { label: "Panel B", note: "Evidence / media", col: "2 / 3", row: "2 / 3", accent: "#5c9970" },
      { label: "Panel C", note: "Evidence / media", col: "3 / 4", row: "2 / 3", accent: "#b87c5c" },
    ],
  },
  "layout-tower": {
    tag: "Tower",
    useCase: "Primary narrative rail with stacked support cards.",
    cols: "2fr 1fr",
    rows: "1fr 1fr 1fr",
    header: { label: "Header", note: "Narrative title or episode name", height: "44px" },
    panels: [
      { label: "Primary Rail", note: "Main story / flow", col: "1 / 2", row: "1 / 4", accent: "#6b8fc4", primary: true },
      { label: "Support 1", note: "Reference", col: "2 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Support 2", note: "Reference", col: "2 / 3", row: "2 / 3", accent: "#b87c5c" },
      { label: "Support 3", note: "Reference", col: "2 / 3", row: "3 / 4", accent: "#6b8fc4" },
    ],
  },
  "layout-pinboard": {
    tag: "Pinboard",
    useCase: "Headline strip over clustered sources and notes.",
    cols: "1fr 1fr",
    rows: "90px 1fr 1fr",
    header: { label: "Header", note: "Inquiry question or board title", height: "44px" },
    panels: [
      { label: "Header", note: "Prompt / framing", col: "1 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Pin A", note: "Card slot", col: "1 / 2", row: "2 / 3", accent: "#6b8fc4", primary: true },
      { label: "Pin B", note: "Card slot", col: "2 / 3", row: "2 / 3", accent: "#b87c5c" },
      { label: "Pin C", note: "Card slot", col: "1 / 2", row: "3 / 4", accent: "#5c9970" },
      { label: "Pin D", note: "Card slot", col: "2 / 3", row: "3 / 4", accent: "#6b8fc4" },
    ],
  },
  "layout-annotated": {
    tag: "Annotated",
    useCase: "Glossary rail plus four detailed evidence panels.",
    cols: "1fr 2fr 2fr",
    rows: "1fr 1fr",
    header: { label: "Header", note: "Document or source study title", height: "44px" },
    panels: [
      { label: "Legend", note: "Terms and context", col: "1 / 2", row: "1 / 3", accent: "#6b8fc4" },
      { label: "Panel A", note: "Main evidence", col: "2 / 3", row: "1 / 2", accent: "#6b8fc4", primary: true },
      { label: "Panel B", note: "Main evidence", col: "3 / 4", row: "1 / 2", accent: "#b87c5c" },
      { label: "Panel C", note: "Reference", col: "2 / 3", row: "2 / 3", accent: "#5c9970" },
      { label: "Panel D", note: "Reference", col: "3 / 4", row: "2 / 3", accent: "#555555" },
    ],
  },
  "layout-sixgrid": {
    tag: "Six Grid",
    useCase: "Uniform six-cell structure for balanced coverage.",
    cols: "1fr 1fr 1fr",
    rows: "1fr 1fr",
    header: { label: "Header", note: "Topic title or grid label", height: "44px" },
    panels: Array.from({ length: 6 }, (_, i) => ({
      label: `Grid ${i + 1}`,
      note: "Content block",
      accent: i === 0 ? "#6b8fc4" : "#555555",
      primary: i === 0,
    })),
  },
}
