"use client"

/**
 * Layout Card
 *
 * Renders one of six structural layout containers:
 *   split   — two equal columns (50/50)
 *   stack   — two rows (60% top / 40% bottom)
 *   feature — narrow-left anchor + large-right upper + thin-right lower strip
 *   sidebar — asymmetric columns (30/70)
 *   quad    — 2×2 equal grid (four cells)
 *   mosaic  — 3×3 equal grid (nine cells)
 *
 * Each slot is a dnd-kit droppable. Cards dropped into a slot are stored
 * inside the layout card's `content.slots` record (keyed by slot index).
 * Slot child-cards render via CardRenderer for full type support.
 */

import { useDroppable, useDndContext } from "@dnd-kit/core"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from "react"
import ReactGridLayout, {
  noCompactor,
  useContainerWidth,
  type Layout as ReactGridLayoutItems,
  type LayoutItem as ReactGridLayoutItem,
} from "react-grid-layout"
import type { CanvasRenderMode, CardType, DroppedCard, SessionId } from "../../types"
import type { CardRenderProps } from "../CardRegistry"
import type { DragSourceData, LayoutSlotDropTargetData } from "../../hooks/useCardDrop"
import { useCourseStore } from "../../store/courseStore"
import { CardRenderer } from "../CardRenderer"

// ─── Layout definitions ───────────────────────────────────────────────────────

export type LayoutKind =
  | "split"
  | "stack"
  | "feature"
  | "sidebar"
  | "quad"
  | "mosaic"
  | "triptych"
  | "trirow"
  | "banner"
  | "broadside"
  | "tower"
  | "pinboard"
  | "annotated"
  | "sixgrid"
  | "comparison"
  | "stepped"
  | "hero"
  | "dialogue"
  | "gallery"
  | "spotlight"
  | "flipcard"
  | "resizable-grid"

export type SlotConstraint = "hard" | "soft"

export interface SlotSpec {
  /** Semantic purpose of this slot in the layout. */
  role: string
  /** Visual weight hint shown in the empty-state copy. */
  sizeClass?: string
  /** Hard slots reject incompatible card types; soft slots only prefer them. */
  constraint?: SlotConstraint
  /** Optional explanatory reason shown for hard rejections. */
  incompatibleHint?: string
  /** CSS grid-area shorthand; omit for natural flow */
  gridArea?: string
  minHeight: number
  /** Accessible label for the slot drop zone */
  label: string
  /** Card types permitted in this slot. Empty array = no restrictions. */
  accepts: CardType[]
  /** Maximum number of cards this slot may hold. undefined = unlimited. */
  maxCards?: number
}

export interface LayoutDef {
  kind: LayoutKind
  label: string
  slotCount: number
  gridStyle: CSSProperties
  slots: SlotSpec[]
}

// ─── Slot type groups (reused across layout definitions) ─────────────────────

const ANY_CONTENT: CardType[] = [
  "text", "image", "audio", "video", "animation", "dataset", "embed", "flashcards", "code-snippet",
  "model-3d", "map", "chart", "diagram", "media", "document", "table", "rich-sim", "village-3d",
  "interactive", "form", "voice-recorder", "sorter", "games", "chat", "text-editor", "code-editor",
  "whiteboard", "timeline", "legend",
]

// Symmetric content types suitable for split/equal comparisons
const SPLIT_ACCEPTS: CardType[] = ANY_CONTENT
// Supporting content types for secondary slots
const SUPPORT_CONTENT: CardType[] = [
  "text", "audio", "chart", "table", "dataset", "document",
]
// Compact types for small cells (quad, sidebar)
const COMPACT: CardType[] = ["text", "image", "audio", "chart", "diagram"]

export const LAYOUT_DEFS: Record<LayoutKind, LayoutDef> = {
  split: {
    kind: "split",
    label: "Split",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" },
    slots: [
      { role: "left", minHeight: 120, label: "Left",  accepts: SPLIT_ACCEPTS },
      { role: "right", minHeight: 120, label: "Right", accepts: SPLIT_ACCEPTS },
    ],
  },
  stack: {
    kind: "stack",
    label: "Stack",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateRows: "3fr 2fr", gap: "2px" },
    slots: [
      {
        role: "hero",
        minHeight: 150,
        label: "Primary (top)",
        accepts: ["image", "video", "animation", "chart", "diagram", "map", "audio", "rich-sim", "model-3d", "interactive"],
      },
      {
        role: "support",
        minHeight: 100,
        label: "Secondary (bottom)",
        accepts: SUPPORT_CONTENT,
      },
    ],
  },
  feature: {
    kind: "feature",
    label: "Feature",
    slotCount: 3,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 3fr",
      gridTemplateRows: "3fr 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "hero",
        gridArea: "1 / 1 / 3 / 2",
        minHeight: 220,
        label: "Hero",
        accepts: ["image", "video", "animation"],
        maxCards: 1,
      },
      {
        role: "headline",
        gridArea: "1 / 2 / 2 / 3",
        minHeight: 84,
        label: "Headline",
        accepts: ["text"],
        maxCards: 1,
      },
      {
        role: "body",
        gridArea: "2 / 2 / 3 / 3",
        minHeight: 120,
        label: "Body",
        accepts: ["text", "document", "chart", "dataset", "diagram"],
      },
    ],
  },
  sidebar: {
    kind: "sidebar",
    label: "Sidebar",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "3fr 7fr", gap: "2px" },
    slots: [
      {
        role: "sidebar",
        minHeight: 120,
        label: "Sidebar (30%)",
        accepts: COMPACT,
      },
      {
        role: "main",
        minHeight: 120,
        label: "Main (70%)",
        accepts: ["text", "image", "video", "animation", "document", "table", "dataset", "chart", "diagram", "map", "interactive", "rich-sim", "audio"],
      },
    ],
  },
  quad: {
    kind: "quad",
    label: "Quad",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "2px",
    },
    slots: [
      { role: "panel", minHeight: 110, label: "Top-left",     accepts: COMPACT },
      { role: "panel", minHeight: 110, label: "Top-right",    accepts: COMPACT },
      { role: "panel", minHeight: 110, label: "Bottom-left",  accepts: COMPACT },
      { role: "panel", minHeight: 110, label: "Bottom-right", accepts: COMPACT },
    ],
  },
  mosaic: {
    kind: "mosaic",
    label: "Mosaic",
    slotCount: 9,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      gap: "2px",
    },
    slots: Array.from({ length: 9 }, (_, i) => ({
      role: "cell",
      minHeight: 72,
      label: `Cell ${i + 1}`,
      accepts: ["image", "audio"] as CardType[],
      maxCards: 1,
    })),
  },

  // ── New layouts ────────────────────────────────────────────────────────────

  triptych: {
    kind: "triptych",
    label: "Triptych",
    slotCount: 3,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px" },
    slots: [
      { role: "column", minHeight: 120, label: "Left",   accepts: SPLIT_ACCEPTS },
      { role: "column", minHeight: 120, label: "Centre", accepts: SPLIT_ACCEPTS },
      { role: "column", minHeight: 120, label: "Right",  accepts: SPLIT_ACCEPTS },
    ],
  },

  trirow: {
    kind: "trirow",
    label: "Trirow",
    slotCount: 3,
    gridStyle: { display: "grid", gridTemplateRows: "auto 1fr auto", gap: "2px" },
    slots: [
      { role: "header", minHeight: 56,  label: "Header", accepts: ["text", "audio", "image"] as CardType[], maxCards: 1 },
      { role: "body", minHeight: 180, label: "Body",   accepts: SPLIT_ACCEPTS },
      { role: "footer", minHeight: 56,  label: "Footer", accepts: ["text", "audio", "document", "dataset"] as CardType[], maxCards: 1 },
    ],
  },

  banner: {
    kind: "banner",
    label: "Banner",
    slotCount: 3,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "auto 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "header",
        gridArea: "1 / 1 / 2 / 3",
        minHeight: 72,
        label: "Header banner",
        accepts: ["text", "image", "audio", "video"] as CardType[],
        maxCards: 1,
      },
      { role: "left", gridArea: "2 / 1 / 3 / 2", minHeight: 140, label: "Left column",  accepts: SPLIT_ACCEPTS },
      { role: "right", gridArea: "2 / 2 / 3 / 3", minHeight: 140, label: "Right column", accepts: SPLIT_ACCEPTS },
    ],
  },

  broadside: {
    kind: "broadside",
    label: "Broadside",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gridTemplateRows: "auto 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "header",
        gridArea: "1 / 1 / 2 / 4",
        minHeight: 64,
        label: "Header banner",
        accepts: ["text", "image", "audio", "video"] as CardType[],
        maxCards: 1,
      },
      { role: "left", gridArea: "2 / 1 / 3 / 2", minHeight: 120, label: "Left column",   accepts: COMPACT },
      { role: "centre", gridArea: "2 / 2 / 3 / 3", minHeight: 120, label: "Centre column", accepts: COMPACT },
      { role: "right", gridArea: "2 / 3 / 3 / 4", minHeight: 120, label: "Right column",  accepts: COMPACT },
    ],
  },

  tower: {
    kind: "tower",
    label: "Tower",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gridTemplateRows: "1fr 1fr 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "feature",
        gridArea: "1 / 1 / 4 / 2",
        minHeight: 240,
        label: "Main content",
        accepts: ["text", "image", "video", "audio", "animation", "document", "map", "diagram", "chart"] as CardType[],
      },
      { role: "sidebar", gridArea: "1 / 2 / 2 / 3", minHeight: 72, label: "Top panel",    accepts: COMPACT, maxCards: 1 },
      { role: "sidebar", gridArea: "2 / 2 / 3 / 3", minHeight: 72, label: "Middle panel", accepts: COMPACT, maxCards: 1 },
      { role: "sidebar", gridArea: "3 / 2 / 4 / 3", minHeight: 72, label: "Bottom panel", accepts: COMPACT, maxCards: 1 },
    ],
  },

  pinboard: {
    kind: "pinboard",
    label: "Pinboard",
    slotCount: 5,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "auto 1fr 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "header",
        gridArea: "1 / 1 / 2 / 3",
        minHeight: 56,
        label: "Header",
        accepts: ["text", "audio"] as CardType[],
        maxCards: 1,
      },
      { role: "card", gridArea: "2 / 1 / 3 / 2", minHeight: 100, label: "Top-left",     accepts: COMPACT, maxCards: 1 },
      { role: "card", gridArea: "2 / 2 / 3 / 3", minHeight: 100, label: "Top-right",    accepts: COMPACT, maxCards: 1 },
      { role: "card", gridArea: "3 / 1 / 4 / 2", minHeight: 100, label: "Bottom-left",  accepts: COMPACT, maxCards: 1 },
      { role: "card", gridArea: "3 / 2 / 4 / 3", minHeight: 100, label: "Bottom-right", accepts: COMPACT, maxCards: 1 },
    ],
  },

  annotated: {
    kind: "annotated",
    label: "Annotated",
    slotCount: 5,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr 2fr",
      gridTemplateRows: "1fr 1fr",
      gap: "2px",
    },
    slots: [
      {
        role: "annotation",
        gridArea: "1 / 1 / 3 / 2",
        minHeight: 200,
        label: "Annotation column",
        accepts: ["text", "audio", "document"] as CardType[],
      },
      { role: "content", gridArea: "1 / 2 / 2 / 3", minHeight: 100, label: "Top-centre",  accepts: COMPACT, maxCards: 1 },
      { role: "content", gridArea: "1 / 3 / 2 / 4", minHeight: 100, label: "Top-right",   accepts: COMPACT, maxCards: 1 },
      { role: "content", gridArea: "2 / 2 / 3 / 3", minHeight: 100, label: "Bottom-centre", accepts: COMPACT, maxCards: 1 },
      { role: "content", gridArea: "2 / 3 / 3 / 4", minHeight: 100, label: "Bottom-right", accepts: COMPACT, maxCards: 1 },
    ],
  },

  sixgrid: {
    kind: "sixgrid",
    label: "Six Grid",
    slotCount: 6,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(2, 1fr)",
      gap: "2px",
    },
    slots: Array.from({ length: 6 }, (_, i) => ({
      role: "panel",
      sizeClass: "Sixth",
      minHeight: 88,
      label: `Panel ${i + 1}`,
      accepts: ANY_CONTENT,
      maxCards: 1,
    })),
  },

  comparison: {
    kind: "comparison",
    label: "Comparison",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "auto 1fr",
      gap: "2px",
    },
    slots: [
      { role: "label", sizeClass: "Narrow header", gridArea: "1 / 1 / 2 / 2", minHeight: 54, label: "Label A", accepts: ["text"], constraint: "hard", incompatibleHint: "Label slot only accepts text." },
      { role: "label", sizeClass: "Narrow header", gridArea: "1 / 2 / 2 / 3", minHeight: 54, label: "Label B", accepts: ["text"], constraint: "hard", incompatibleHint: "Label slot only accepts text." },
      { role: "content", sizeClass: "Half", gridArea: "2 / 1 / 3 / 2", minHeight: 140, label: "Content A", accepts: ANY_CONTENT, constraint: "soft" },
      { role: "content", sizeClass: "Half", gridArea: "2 / 2 / 3 / 3", minHeight: 140, label: "Content B", accepts: ANY_CONTENT, constraint: "soft" },
    ],
  },

  stepped: {
    kind: "stepped",
    label: "Stepped",
    slotCount: 4,
    gridStyle: { display: "grid", gridTemplateRows: "repeat(4, minmax(88px, auto))", gap: "2px" },
    slots: Array.from({ length: 4 }, (_, i) => ({
      role: "step",
      sizeClass: "Full",
      minHeight: 88,
      label: `Step ${i + 1}`,
      accepts: ANY_CONTENT,
      constraint: "soft" as SlotConstraint,
      maxCards: 1,
    })),
  },

  hero: {
    kind: "hero",
    label: "Hero",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "2fr auto auto",
      gap: "2px",
    },
    slots: [
      { role: "background", sizeClass: "Full bleed", gridArea: "1 / 1 / 2 / 3", minHeight: 190, label: "Background", accepts: ["image", "video", "animation"], constraint: "hard", incompatibleHint: "Background only accepts visual media." },
      { role: "headline", sizeClass: "Overlaid large", gridArea: "2 / 1 / 3 / 2", minHeight: 64, label: "Headline", accepts: ["text"], constraint: "hard", maxCards: 1 },
      { role: "subtext", sizeClass: "Overlaid small", gridArea: "2 / 2 / 3 / 3", minHeight: 64, label: "Subtext", accepts: ["text"], constraint: "hard", maxCards: 1 },
      { role: "action", sizeClass: "Overlaid CTA", gridArea: "3 / 1 / 4 / 3", minHeight: 72, label: "Action", accepts: ["interactive", "form", "voice-recorder", "sorter", "chat", "whiteboard", "text-editor", "code-editor"], constraint: "hard", incompatibleHint: "Action slot accepts activities only." },
    ],
  },

  dialogue: {
    kind: "dialogue",
    label: "Dialogue",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" },
    slots: [
      { role: "persona", sizeClass: "Half", minHeight: 170, label: "Persona", accepts: ["chat"], constraint: "hard", incompatibleHint: "Persona slot accepts Character activity only." },
      { role: "context", sizeClass: "Half", minHeight: 170, label: "Context", accepts: ["text", "document", "image", "diagram"], constraint: "soft" },
    ],
  },

  gallery: {
    kind: "gallery",
    label: "Gallery",
    slotCount: 6,
    gridStyle: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: "2px" },
    slots: Array.from({ length: 6 }, (_, i) => ({
      role: "item",
      sizeClass: "Grid cell",
      minHeight: 90,
      label: `Item ${i + 1}`,
      accepts: ["image", "video", "animation", "model-3d", "embed"],
      constraint: "hard" as SlotConstraint,
      incompatibleHint: "Gallery items accept media only.",
      maxCards: 1,
    })),
  },

  spotlight: {
    kind: "spotlight",
    label: "Spotlight",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "2px",
    },
    slots: [
      { role: "context", sizeClass: "Small", gridArea: "1 / 1 / 2 / 2", minHeight: 92, label: "Context A", accepts: ["text", "image", "chart"], constraint: "soft" },
      { role: "focus", sizeClass: "Center large", gridArea: "1 / 2 / 3 / 3", minHeight: 220, label: "Focus", accepts: ANY_CONTENT, constraint: "soft" },
      { role: "context", sizeClass: "Small", gridArea: "1 / 3 / 2 / 4", minHeight: 92, label: "Context B", accepts: ["text", "image", "chart"], constraint: "soft" },
      { role: "context", sizeClass: "Small", gridArea: "2 / 1 / 3 / 2", minHeight: 92, label: "Context C", accepts: ["text", "image", "chart"], constraint: "soft" },
    ],
  },

  flipcard: {
    kind: "flipcard",
    label: "Flipcard",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" },
    slots: [
      { role: "front", sizeClass: "Full", minHeight: 170, label: "Front", accepts: ANY_CONTENT, constraint: "soft" },
      { role: "back", sizeClass: "Full", minHeight: 170, label: "Back", accepts: ANY_CONTENT, constraint: "soft" },
    ],
  },

  "resizable-grid": {
    kind: "resizable-grid",
    label: "Resizable Grid",
    slotCount: 4,
    gridStyle: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "2px",
    },
    slots: [
      { role: "grid-cell", sizeClass: "Resizable", minHeight: 120, label: "Cell 1", accepts: ANY_CONTENT, maxCards: 1 },
      { role: "grid-cell", sizeClass: "Resizable", minHeight: 120, label: "Cell 2", accepts: ANY_CONTENT, maxCards: 1 },
      { role: "grid-cell", sizeClass: "Resizable", minHeight: 120, label: "Cell 3", accepts: ANY_CONTENT, maxCards: 1 },
      { role: "grid-cell", sizeClass: "Resizable", minHeight: 120, label: "Cell 4", accepts: ANY_CONTENT, maxCards: 1 },
    ],
  },
}

function formatSlotAccepts(accepts: CardType[]): string {
  if (accepts.length === 0 || accepts.length === ANY_CONTENT.length) {
    return "Any"
  }

  const labels: Partial<Record<CardType, string>> = {
    text: "Text",
    image: "Image",
    audio: "Audio",
    video: "Video",
    animation: "Animation",
    document: "Document",
    chart: "Chart",
    dataset: "Dataset",
    diagram: "Diagram",
    map: "Map",
  }

  const shown = accepts.slice(0, 3).map((type) => labels[type] ?? type)
  return accepts.length > 3 ? `${shown.join(" | ")} +${accepts.length - 3}` : shown.join(" | ")
}

function extractLayoutKind(cardType: string): LayoutKind {
  const kind = cardType.replace("layout-", "") as LayoutKind
  return kind in LAYOUT_DEFS ? kind : "split"
}

const RESIZABLE_GRID_COLS = 12
const RESIZABLE_GRID_ROW_HEIGHT = 34
const RESIZABLE_GRID_MARGIN = [8, 8] as const
const RESIZABLE_GRID_MAX_ROWS = 120
const RESIZABLE_GRID_SLOT_HEADER_HEIGHT = 28
const RESIZABLE_GRID_SLOT_BODY_VERTICAL_PADDING = 12

const DEFAULT_RESIZABLE_GRID_LAYOUT: ReactGridLayoutItems = [
  { i: "0", x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3, maxW: 12, maxH: RESIZABLE_GRID_MAX_ROWS },
  { i: "1", x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3, maxW: 12, maxH: RESIZABLE_GRID_MAX_ROWS },
  { i: "2", x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3, maxW: 12, maxH: RESIZABLE_GRID_MAX_ROWS },
  { i: "3", x: 4, y: 4, w: 8, h: 4, minW: 3, minH: 3, maxW: 12, maxH: RESIZABLE_GRID_MAX_ROWS },
]

function isStoredGridLayoutItem(value: unknown): value is ReactGridLayoutItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<ReactGridLayoutItem>
  return (
    typeof item.i === "string" &&
    typeof item.x === "number" &&
    typeof item.y === "number" &&
    typeof item.w === "number" &&
    typeof item.h === "number"
  )
}

export function normalizeResizableGridLayout(raw: unknown): ReactGridLayoutItems {
  const storedItems = Array.isArray(raw)
    ? raw.filter(isStoredGridLayoutItem)
    : []
  const byId = new Map(storedItems.map((item) => [item.i, item]))

  return DEFAULT_RESIZABLE_GRID_LAYOUT.map((defaultItem) => {
    const stored = byId.get(defaultItem.i)
    const minW = defaultItem.minW ?? 1
    const maxW = Math.max(defaultItem.maxW ?? RESIZABLE_GRID_COLS, stored?.maxW ?? 0)
    const minH = defaultItem.minH ?? 1
    const maxH = Math.max(defaultItem.maxH ?? RESIZABLE_GRID_MAX_ROWS, stored?.maxH ?? 0, RESIZABLE_GRID_MAX_ROWS)
    const x = Math.max(0, Math.min(RESIZABLE_GRID_COLS - minW, stored?.x ?? defaultItem.x))
    return {
      ...defaultItem,
      ...stored,
      minH,
      maxH,
      x,
      y: Math.max(0, stored?.y ?? defaultItem.y),
      w: Math.max(minW, Math.min(maxW, RESIZABLE_GRID_COLS - x, stored?.w ?? defaultItem.w)),
      h: Math.max(minH, Math.min(maxH, stored?.h ?? defaultItem.h)),
    }
  })
}

export function rowsForResizableGridSlotHeight(contentHeight: number): number {
  const safeContentHeight = Math.max(0, Math.ceil(contentHeight))
  const itemHeight = RESIZABLE_GRID_SLOT_HEADER_HEIGHT + RESIZABLE_GRID_SLOT_BODY_VERTICAL_PADDING + safeContentHeight
  const rowUnit = RESIZABLE_GRID_ROW_HEIGHT + RESIZABLE_GRID_MARGIN[1]
  return Math.max(1, Math.ceil((itemHeight + RESIZABLE_GRID_MARGIN[1]) / rowUnit))
}

function gridItemsOverlap(a: ReactGridLayoutItem, b: ReactGridLayoutItem): boolean {
  if (a.i === b.i) return false
  const aRight = a.x + a.w
  const bRight = b.x + b.w
  const aBottom = a.y + a.h
  const bBottom = b.y + b.h
  return a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y
}

export function growResizableGridLayoutForContent(
  layout: ReactGridLayoutItems,
  measuredRows: Record<string, number>,
): ReactGridLayoutItems {
  const grown = layout.map((item) => {
    const requiredRows = measuredRows[item.i] ?? 0
    const minH = item.minH ?? 1
    const maxH = Math.max(item.maxH ?? RESIZABLE_GRID_MAX_ROWS, requiredRows, RESIZABLE_GRID_MAX_ROWS)
    return {
      ...item,
      minH,
      maxH,
      h: Math.max(minH, item.h, requiredRows),
    }
  })

  const placed: ReactGridLayoutItem[] = []
  const sorted = [...grown].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))

  sorted.forEach((item) => {
    const next = { ...item }
    let changed = true

    while (changed) {
      changed = false
      placed.forEach((placedItem) => {
        if (!gridItemsOverlap(next, placedItem)) return
        next.y = Math.max(next.y, placedItem.y + placedItem.h)
        changed = true
      })
    }

    placed.push(next)
  })

  const byId = new Map(placed.map((item) => [item.i, item]))
  return grown.map((item) => byId.get(item.i) ?? item)
}

function sameMeasuredRows(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key) => left[key] === right[key])
}

function readLayoutSlotRange(content: DroppedCard["content"]): { start: number; end?: number } | null {
  const raw = content.__layoutSlotRange
  if (!raw || typeof raw !== "object") return null
  const range = raw as Record<string, unknown>
  const start = Number(range.start)
  const end = range.end === undefined ? undefined : Number(range.end)
  if (!Number.isFinite(start) || start < 0) return null
  if (end !== undefined && (!Number.isFinite(end) || end < start)) return null
  return { start, ...(end !== undefined ? { end } : {}) }
}

function visibleSlotIndexesFromOrder(order: number[], range: { start: number; end?: number } | null): Set<number> {
  if (!range) return new Set(order)
  const start = Math.max(0, range.start)
  const end = Math.min(order.length, range.end ?? order.length)
  return new Set(order.slice(start, end))
}

function shiftVisibleLayoutToTop(layout: ReactGridLayoutItems): ReactGridLayoutItems {
  if (layout.length === 0) return layout
  const minY = Math.min(...layout.map((item) => item.y))
  return layout.map((item) => ({ ...item, y: Math.max(0, item.y - minY) }))
}

function toStoredResizableGridLayout(layout: ReactGridLayoutItems): ReactGridLayoutItems {
  return layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
  }))
}

// ─── Slot ─────────────────────────────────────────────────────────────────────

function LayoutSlot({
  layoutCard,
  slotIndex,
  sessionId,
  spec,
  slotCards,
  mode,
}: {
  layoutCard: DroppedCard
  slotIndex: number
  sessionId: SessionId
  spec: SlotSpec
  slotCards: DroppedCard[]
  mode: CanvasRenderMode
}) {
  const removeCardFromLayoutSlot = useCourseStore((s) => s.removeCardFromLayoutSlot)
  const isEditor = mode === "editor"

  const { active } = useDndContext()
  const activeCardType = (active?.data?.current as DragSourceData | undefined)?.cardType
  const isDragActive  = activeCardType != null
  const constraint: SlotConstraint = spec.constraint ?? "soft"
  const isPreferred = activeCardType == null || spec.accepts.length === 0 || spec.accepts.includes(activeCardType)
  const isCompatible  = activeCardType == null || constraint === "soft" || isPreferred
  const hardAccepts = constraint === "hard" ? spec.accepts : []

  const slotData: LayoutSlotDropTargetData = {
    type: "layout-slot",
    sessionId,
    taskId: layoutCard.taskId,
    layoutCardId: layoutCard.id,
    slotIndex,
    accepts: hardAccepts,
    maxCards: spec.maxCards,
    currentCardCount: slotCards.length,
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `layout-slot:${sessionId}:${layoutCard.taskId}:${layoutCard.id}:${slotIndex}`,
    data: slotData,
  })

  const isFull = slotCards.length >= (spec.maxCards ?? 1)

  const isNonLayoutDrag = isDragActive && activeCardType != null && !activeCardType.startsWith("layout-")
  const shouldPulse = isNonLayoutDrag && isCompatible && !isFull && slotCards.length === 0

  const borderClass =
    isOver && isCompatible && !isFull ? "border-primary/50 bg-primary/5" :
    isOver && (!isCompatible || isFull) ? "border-destructive/50 bg-destructive/5" :
    isDragActive && constraint === "soft" && !isPreferred ? "border-amber-300/70 bg-amber-50/50 opacity-80" :
    isDragActive && (!isCompatible || isFull) ? "border-neutral-200 bg-neutral-50/30 opacity-40" :
    shouldPulse ? "border-primary/30 bg-primary/5 animate-pulse" :
    "border-neutral-200 bg-neutral-50/60"

  const labelClass =
    isOver && isCompatible && !isFull  ? "text-primary" :
    isOver && (!isCompatible || isFull) ? "text-destructive" :
    isDragActive && constraint === "soft" && !isPreferred ? "text-amber-700" :
    shouldPulse ? "text-primary/60" :
    "text-neutral-300"

  const labelText =
    isOver && isFull         ? "Slot full" :
    isOver && !isCompatible  ? (spec.incompatibleHint ?? "Not allowed") :
    isDragActive && !isCompatible ? (spec.incompatibleHint ?? "Not allowed") :
    spec.label

  const acceptsText = formatSlotAccepts(spec.accepts)
  const sizeText = spec.sizeClass ?? "Auto"

  return (
    <div
      ref={setNodeRef}
      aria-label={spec.label}
      data-layout-card-id={layoutCard.id}
      data-layout-slot-idx={slotIndex}
      data-layout-slot-frame
      style={{
        gridArea: spec.gridArea,
        minHeight: spec.minHeight,
      }}
      className={[
        "relative rounded border border-dashed transition-colors overflow-visible",
        borderClass,
      ].join(" ")}
    >
      {slotCards.length === 0 ? (
        <div
          className={[
            "flex h-full flex-col items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-wide select-none pointer-events-none",
            labelClass,
          ].join(" ")}
          style={{ minHeight: spec.minHeight }}
        >
          <span>{labelText}</span>
          <span className="text-[8px] normal-case tracking-normal opacity-80">{spec.role} • {acceptsText} • {sizeText}</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {slotCards.map((slotCard) => (
            <CardRenderer
              key={slotCard.id}
              card={slotCard}
              mode={mode}
              sourceLayoutCardId={layoutCard.id}
              sourceSlotIndex={slotIndex}
              onRemove={isEditor
                ? () =>
                    removeCardFromLayoutSlot(
                      sessionId,
                      layoutCard.taskId,
                      layoutCard.id,
                      slotIndex,
                      slotCard.id,
                    )
                : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ResizableGridLayoutCard({
  card,
  def,
  sessionId,
  slots,
  mode,
  editable,
}: {
  card: DroppedCard
  def: LayoutDef
  sessionId: SessionId
  slots: Record<string, DroppedCard[]>
  mode: CanvasRenderMode
  editable: boolean
}) {
  const updateLayoutCardContent = useCourseStore((s) => s.updateLayoutCardContent)
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: card.dimensions.width || 640 })
  const normalizedLayout = useMemo(
    () => normalizeResizableGridLayout(card.content.gridLayout),
    [card.content.gridLayout],
  )
  const [gridLayout, setGridLayout] = useState<ReactGridLayoutItems>(normalizedLayout)
  const [measuredRows, setMeasuredRows] = useState<Record<string, number>>({})
  const slotContentRefs = useRef(new Map<string, HTMLDivElement>())
  const slotRange = readLayoutSlotRange(card.content)
  const displayLayout = useMemo(
    () => growResizableGridLayoutForContent(gridLayout, measuredRows),
    [gridLayout, measuredRows],
  )
  const visualSlotOrder = useMemo(
    () => [...displayLayout].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)).map((item) => Number(item.i)),
    [displayLayout],
  )
  const visibleSlotIndexes = useMemo(
    () => visibleSlotIndexesFromOrder(visualSlotOrder, slotRange),
    [visualSlotOrder, slotRange],
  )
  const visibleDisplayLayout = useMemo(
    () => shiftVisibleLayoutToTop(displayLayout.filter((item) => visibleSlotIndexes.has(Number(item.i)))),
    [displayLayout, visibleSlotIndexes],
  )
  const canEditGrid = editable && !slotRange

  useEffect(() => {
    setGridLayout(normalizedLayout)
  }, [normalizedLayout])

  useEffect(() => {
    if (!mounted) return

    const measure = () => {
      const nextRows: Record<string, number> = {}
      slotContentRefs.current.forEach((element, slotIndex) => {
        nextRows[slotIndex] = rowsForResizableGridSlotHeight(element.scrollHeight)
      })
      setMeasuredRows((current) => sameMeasuredRows(current, nextRows) ? current : nextRows)
    }

    measure()

    const observer = new ResizeObserver(measure)
    slotContentRefs.current.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  })

  const stopCanvasEvent = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  const persistLayout = (nextLayout: ReactGridLayoutItems) => {
    updateLayoutCardContent(
      sessionId,
      card.taskId,
      card.id,
      { gridLayout: toStoredResizableGridLayout(normalizeResizableGridLayout(nextLayout)) },
    )
  }

  const commitUserLayout = (nextLayout: ReactGridLayoutItems) => {
    const normalized = normalizeResizableGridLayout(nextLayout)
    setGridLayout(normalized)
    persistLayout(normalized)
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-[320px] overflow-visible bg-neutral-50/70 p-1.5"
      onPointerDown={stopCanvasEvent}
      onClick={stopCanvasEvent}
      onDoubleClick={stopCanvasEvent}
      onWheel={stopCanvasEvent}
    >
      {!mounted ? (
        <div className="flex min-h-[320px] items-center justify-center rounded border border-dashed border-neutral-200 bg-white text-[11px] text-neutral-400">
          Measuring grid
        </div>
      ) : (
        <ReactGridLayout
          width={width}
          layout={visibleDisplayLayout}
          autoSize
          compactor={noCompactor}
          gridConfig={{
            cols: RESIZABLE_GRID_COLS,
            rowHeight: RESIZABLE_GRID_ROW_HEIGHT,
            margin: RESIZABLE_GRID_MARGIN,
            containerPadding: [0, 0],
            maxRows: RESIZABLE_GRID_MAX_ROWS,
          }}
          dragConfig={{
            enabled: canEditGrid,
            bounded: true,
            handle: ".rgl-slot-handle",
            cancel: ".rgl-slot-body",
            threshold: 4,
          }}
          resizeConfig={{
            enabled: canEditGrid,
            handles: ["se"],
          }}
          onDragStop={(nextLayout) => commitUserLayout(nextLayout)}
          onResizeStop={(nextLayout) => commitUserLayout(nextLayout)}
        >
          {def.slots.map((spec, index) => visibleSlotIndexes.has(index) && (
            <div
              key={String(index)}
              data-layout-card-id={card.id}
              data-layout-slot-idx={index}
              data-layout-slot-frame
              className="overflow-visible rounded-md border border-neutral-200 bg-white shadow-sm"
            >
              <div className="rgl-slot-handle flex h-7 cursor-move items-center justify-between border-b border-neutral-100 bg-white px-2 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                <span>{spec.label}</span>
                <span className="text-neutral-300">Resize</span>
              </div>
              <div className="rgl-slot-body h-[calc(100%-1.75rem)] p-1.5" data-no-grid-drag="true">
                <div
                  ref={(element) => {
                    const slotKey = String(index)
                    if (element) {
                      slotContentRefs.current.set(slotKey, element)
                    } else {
                      slotContentRefs.current.delete(slotKey)
                    }
                  }}
                >
                  <LayoutSlot
                    layoutCard={card}
                    slotIndex={index}
                    sessionId={sessionId}
                    spec={{ ...spec, minHeight: 54 }}
                    slotCards={slots[index] ?? []}
                    mode={mode}
                  />
                </div>
              </div>
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  )
}

// ─── Layout Card ──────────────────────────────────────────────────────────────

export function LayoutCard({ card, mode = "editor", isEditable }: CardRenderProps) {
  const kind    = extractLayoutKind(card.cardType)
  const def     = LAYOUT_DEFS[kind]
  const activeSessionId = useCourseStore((s) => s.activeSessionId) as SessionId
  const editable = isEditable ?? mode === "editor"

  const slots = (card.content.slots ?? {}) as Record<string, DroppedCard[]>
  const slotRange = readLayoutSlotRange(card.content)
  const visibleSlotIndexes = visibleSlotIndexesFromOrder(
    def.slots.map((_, index) => index),
    slotRange,
  )

  return (
    <div className="group relative rounded-lg border border-neutral-200 bg-white overflow-visible shadow-sm">
      {kind === "resizable-grid" ? (
        <ResizableGridLayoutCard
          card={card}
          def={def}
          sessionId={activeSessionId}
          slots={slots}
          mode={mode}
          editable={editable}
        />
      ) : (
        <div style={def.gridStyle}>
          {def.slots.map((spec, i) => visibleSlotIndexes.has(i) && (
            <LayoutSlot
              key={i}
              layoutCard={card}
              slotIndex={i}
              sessionId={activeSessionId}
              spec={spec}
              slotCards={slots[i] ?? []}
              mode={mode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
