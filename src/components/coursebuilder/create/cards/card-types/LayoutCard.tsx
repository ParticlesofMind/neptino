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
import { X } from "lucide-react"
import type { CardType, DroppedCard, SessionId } from "../../types"
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
  gridStyle: React.CSSProperties
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

// ─── Slot ─────────────────────────────────────────────────────────────────────

function LayoutSlot({
  layoutCard,
  slotIndex,
  sessionId,
  spec,
  slotCards,
}: {
  layoutCard: DroppedCard
  slotIndex: number
  sessionId: SessionId
  spec: SlotSpec
  slotCards: DroppedCard[]
}) {
  const removeCardFromLayoutSlot = useCourseStore((s) => s.removeCardFromLayoutSlot)

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
      style={{
        gridArea: spec.gridArea,
        minHeight: spec.minHeight,
        maxHeight: spec.maxCards != null
          ? spec.maxCards * Math.max(spec.minHeight, 80) + 8
          : spec.minHeight * 5,
      }}
      className={[
        "relative rounded border border-dashed transition-colors overflow-hidden",
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
              sourceLayoutCardId={layoutCard.id}
              sourceSlotIndex={slotIndex}
              onRemove={() =>
                removeCardFromLayoutSlot(
                  sessionId,
                  layoutCard.taskId,
                  layoutCard.id,
                  slotIndex,
                  slotCard.id,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Layout Card ──────────────────────────────────────────────────────────────

export function LayoutCard({ card, onRemove }: CardRenderProps) {
  const kind    = extractLayoutKind(card.cardType)
  const def     = LAYOUT_DEFS[kind]
  const activeSessionId = useCourseStore((s) => s.activeSessionId) as SessionId

  const slots = (card.content.slots ?? {}) as Record<string, DroppedCard[]>

  return (
    <div className="group relative h-full rounded-lg border border-neutral-200 bg-white overflow-hidden shadow-sm">
      {/* Remove button — absolute overlay, visible on hover */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded bg-white/80 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-600 transition-opacity"
          aria-label="Remove layout"
        >
          <X size={10} />
        </button>
      )}

      {/* Grid of droppable slots */}
      <div style={def.gridStyle} className="h-full">
        {def.slots.map((spec, i) => (
          <LayoutSlot
            key={i}
            layoutCard={card}
            slotIndex={i}
            sessionId={activeSessionId}
            spec={spec}
            slotCards={slots[i] ?? []}
          />
        ))}
      </div>
    </div>
  )
}
