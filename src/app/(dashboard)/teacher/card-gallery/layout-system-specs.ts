import type { CardType } from "@/components/coursebuilder/create/types"

interface LayoutPanelSpec {
  label: string
  note: string
  col?: string
  row?: string
  accent: string
  primary?: boolean
}

export interface LayoutSystemSpec {
  tag: string
  useCase: string
  cols: string
  rows: string
  panels: LayoutPanelSpec[]
}

export const LAYOUT_SYSTEM_SPECS: Partial<Record<CardType, LayoutSystemSpec>> = {
  "layout-split": {
    tag: "Comparison",
    useCase: "Side-by-side document, image, and argument comparison.",
    cols: "1fr 1fr",
    rows: "1fr",
    panels: [
      { label: "Column A", note: "Source A / perspective A", col: "1 / 2", row: "1 / 2", accent: "#3A7AC1", primary: true },
      { label: "Column B", note: "Source B / perspective B", col: "2 / 3", row: "1 / 2", accent: "#C13A3A" },
    ],
  },
  "layout-stack": {
    tag: "Sequence",
    useCase: "Instruction then practice, or context then analysis.",
    cols: "1fr",
    rows: "3fr 2fr",
    panels: [
      { label: "Primary Stage", note: "Main explanation or narrative", col: "1 / 2", row: "1 / 2", accent: "#3A7AC1", primary: true },
      { label: "Secondary Stage", note: "Practice, reflection, or response", col: "1 / 2", row: "2 / 3", accent: "#C17A3A" },
    ],
  },
  "layout-feature": {
    tag: "Map Simulation",
    useCase: "Map-led simulation with controls and a time strip.",
    cols: "200px 1fr",
    rows: "1fr 140px",
    panels: [
      { label: "Legend / Filters", note: "Layer toggles, symbol key", col: "1 / 2", row: "1 / 2", accent: "#C17A3A" },
      { label: "Main Canvas", note: "Dominant spatial or media surface", col: "2 / 3", row: "1 / 2", accent: "#3A7AC1", primary: true },
      { label: "Timeline Strip", note: "Chronology / navigation rail", col: "1 / 3", row: "2 / 3", accent: "#6B3AC1" },
    ],
  },
  "layout-sidebar": {
    tag: "Sidebar",
    useCase: "One dominant canvas with supporting context panel.",
    cols: "3fr 7fr",
    rows: "1fr",
    panels: [
      { label: "Sidebar", note: "Legend, glossary, controls", col: "1 / 2", row: "1 / 2", accent: "#555555" },
      { label: "Main Stage", note: "Primary teaching surface", col: "2 / 3", row: "1 / 2", accent: "#3A7AC1", primary: true },
    ],
  },
  "layout-quad": {
    tag: "Quad",
    useCase: "Four equal regions for balanced multi-source analysis.",
    cols: "1fr 1fr",
    rows: "1fr 1fr",
    panels: [
      { label: "Panel 1", note: "Source / view", col: "1 / 2", row: "1 / 2", accent: "#3A7AC1" },
      { label: "Panel 2", note: "Source / view", col: "2 / 3", row: "1 / 2", accent: "#C13A3A" },
      { label: "Panel 3", note: "Source / view", col: "1 / 2", row: "2 / 3", accent: "#2D6A4F" },
      { label: "Panel 4", note: "Source / view", col: "2 / 3", row: "2 / 3", accent: "#C17A3A" },
    ],
  },
  "layout-mosaic": {
    tag: "Mosaic",
    useCase: "Dense gallery or source browser over many small frames.",
    cols: "1fr 1fr 1fr",
    rows: "1fr 1fr 1fr",
    panels: Array.from({ length: 9 }, (_, i) => ({
      label: `Cell ${i + 1}`,
      note: "Thumbnail / quick reference",
      accent: i % 2 === 0 ? "#3A7AC1" : "#555555",
    })),
  },
  "layout-triptych": {
    tag: "Triptych",
    useCase: "Three-column narrative, timeline, or evidence arrangement.",
    cols: "1fr 1fr 1fr",
    rows: "1fr",
    panels: [
      { label: "Left", note: "Context", col: "1 / 2", row: "1 / 2", accent: "#555555" },
      { label: "Center", note: "Primary focus", col: "2 / 3", row: "1 / 2", accent: "#3A7AC1", primary: true },
      { label: "Right", note: "Evidence / reflection", col: "3 / 4", row: "1 / 2", accent: "#C17A3A" },
    ],
  },
  "layout-trirow": {
    tag: "Tri-Row",
    useCase: "Top-to-bottom sequencing in three phases.",
    cols: "1fr",
    rows: "1fr 1fr 1fr",
    panels: [
      { label: "Row 1", note: "Activation", col: "1 / 2", row: "1 / 2", accent: "#C13A3A" },
      { label: "Row 2", note: "Instruction", col: "1 / 2", row: "2 / 3", accent: "#3A7AC1", primary: true },
      { label: "Row 3", note: "Practice / feedback", col: "1 / 2", row: "3 / 4", accent: "#2D6A4F" },
    ],
  },
  "layout-banner": {
    tag: "Banner",
    useCase: "Top summary band over two deep working panels.",
    cols: "1fr 1fr",
    rows: "90px 1fr",
    panels: [
      { label: "Header Banner", note: "Prompt / objective", col: "1 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Left Stage", note: "Primary content", col: "1 / 2", row: "2 / 3", accent: "#3A7AC1", primary: true },
      { label: "Right Stage", note: "Companion content", col: "2 / 3", row: "2 / 3", accent: "#C17A3A" },
    ],
  },
  "layout-broadside": {
    tag: "Broadside",
    useCase: "Wide heading zone with three aligned content panels.",
    cols: "1fr 1fr 1fr",
    rows: "120px 1fr",
    panels: [
      { label: "Header", note: "Theme, question, or orientation", col: "1 / 4", row: "1 / 2", accent: "#555555" },
      { label: "Panel A", note: "Evidence / media", col: "1 / 2", row: "2 / 3", accent: "#3A7AC1", primary: true },
      { label: "Panel B", note: "Evidence / media", col: "2 / 3", row: "2 / 3", accent: "#2D6A4F" },
      { label: "Panel C", note: "Evidence / media", col: "3 / 4", row: "2 / 3", accent: "#C17A3A" },
    ],
  },
  "layout-tower": {
    tag: "Tower",
    useCase: "Primary narrative rail with stacked support cards.",
    cols: "2fr 1fr",
    rows: "1fr 1fr 1fr",
    panels: [
      { label: "Primary Rail", note: "Main story / flow", col: "1 / 2", row: "1 / 4", accent: "#3A7AC1", primary: true },
      { label: "Support 1", note: "Reference", col: "2 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Support 2", note: "Reference", col: "2 / 3", row: "2 / 3", accent: "#C17A3A" },
      { label: "Support 3", note: "Reference", col: "2 / 3", row: "3 / 4", accent: "#6B3AC1" },
    ],
  },
  "layout-pinboard": {
    tag: "Pinboard",
    useCase: "Headline strip over clustered sources and notes.",
    cols: "1fr 1fr",
    rows: "90px 1fr 1fr",
    panels: [
      { label: "Header", note: "Prompt / framing", col: "1 / 3", row: "1 / 2", accent: "#555555" },
      { label: "Pin A", note: "Card slot", col: "1 / 2", row: "2 / 3", accent: "#3A7AC1", primary: true },
      { label: "Pin B", note: "Card slot", col: "2 / 3", row: "2 / 3", accent: "#C17A3A" },
      { label: "Pin C", note: "Card slot", col: "1 / 2", row: "3 / 4", accent: "#2D6A4F" },
      { label: "Pin D", note: "Card slot", col: "2 / 3", row: "3 / 4", accent: "#6B3AC1" },
    ],
  },
  "layout-annotated": {
    tag: "Annotated",
    useCase: "Glossary rail plus four detailed evidence panels.",
    cols: "1fr 2fr 2fr",
    rows: "1fr 1fr",
    panels: [
      { label: "Legend", note: "Terms and context", col: "1 / 2", row: "1 / 3", accent: "#6B3AC1" },
      { label: "Panel A", note: "Main evidence", col: "2 / 3", row: "1 / 2", accent: "#3A7AC1", primary: true },
      { label: "Panel B", note: "Main evidence", col: "3 / 4", row: "1 / 2", accent: "#C17A3A" },
      { label: "Panel C", note: "Reference", col: "2 / 3", row: "2 / 3", accent: "#2D6A4F" },
      { label: "Panel D", note: "Reference", col: "3 / 4", row: "2 / 3", accent: "#555555" },
    ],
  },
  "layout-sixgrid": {
    tag: "Six Grid",
    useCase: "Uniform six-cell structure for balanced coverage.",
    cols: "1fr 1fr 1fr",
    rows: "1fr 1fr",
    panels: Array.from({ length: 6 }, (_, i) => ({
      label: `Grid ${i + 1}`,
      note: "Content block",
      accent: i === 0 ? "#3A7AC1" : "#555555",
      primary: i === 0,
    })),
  },
}
