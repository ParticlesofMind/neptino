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

type LayoutKind =
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

interface SlotSpec {
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

interface LayoutDef {
  kind: LayoutKind
  label: string
  slotCount: number
  gridStyle: React.CSSProperties
  slots: SlotSpec[]
}

// ─── Slot type groups (reused across layout definitions) ─────────────────────

// Symmetric content types suitable for split/equal comparisons
const SPLIT_ACCEPTS: CardType[] = [
  "text", "image", "video", "audio", "animation",
  "chart", "diagram", "map", "table", "dataset", "document",
]
// Visual/media types for dominant slots (top, left anchor)
const VISUAL_ANCHOR: CardType[] = [
  "image", "video", "animation", "chart", "diagram", "map",
]
// Supporting content types for secondary slots
const SUPPORT_CONTENT: CardType[] = [
  "text", "audio", "chart", "table", "dataset", "document",
]
// Compact types for small cells (quad, sidebar)
const COMPACT: CardType[] = ["text", "image", "audio", "chart", "diagram"]

const LAYOUT_DEFS: Record<LayoutKind, LayoutDef> = {
  split: {
    kind: "split",
    label: "Split",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" },
    slots: [
      { minHeight: 120, label: "Left",  accepts: SPLIT_ACCEPTS },
      { minHeight: 120, label: "Right", accepts: SPLIT_ACCEPTS },
    ],
  },
  stack: {
    kind: "stack",
    label: "Stack",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateRows: "3fr 2fr", gap: "2px" },
    slots: [
      {
        minHeight: 150,
        label: "Primary (top)",
        accepts: ["image", "video", "animation", "chart", "diagram", "map", "audio", "rich-sim", "model-3d", "interactive"],
      },
      {
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
        gridArea: "1 / 1 / 3 / 2",
        minHeight: 220,
        label: "Left anchor",
        accepts: VISUAL_ANCHOR,
      },
      {
        gridArea: "1 / 2 / 2 / 3",
        minHeight: 150,
        label: "Main content",
        accepts: ["text", "document", "table", "dataset", "chart", "diagram"],
      },
      {
        gridArea: "2 / 2 / 3 / 3",
        minHeight: 48,
        label: "Caption strip",
        accepts: ["audio", "text"],
        maxCards: 1,
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
        minHeight: 120,
        label: "Sidebar (30%)",
        accepts: COMPACT,
      },
      {
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
      { minHeight: 110, label: "Top-left",     accepts: COMPACT },
      { minHeight: 110, label: "Top-right",    accepts: COMPACT },
      { minHeight: 110, label: "Bottom-left",  accepts: COMPACT },
      { minHeight: 110, label: "Bottom-right", accepts: COMPACT },
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
      { minHeight: 120, label: "Left",   accepts: SPLIT_ACCEPTS },
      { minHeight: 120, label: "Centre", accepts: SPLIT_ACCEPTS },
      { minHeight: 120, label: "Right",  accepts: SPLIT_ACCEPTS },
    ],
  },

  trirow: {
    kind: "trirow",
    label: "Trirow",
    slotCount: 3,
    gridStyle: { display: "grid", gridTemplateRows: "auto 1fr auto", gap: "2px" },
    slots: [
      { minHeight: 56,  label: "Header", accepts: ["text", "audio", "image"] as CardType[], maxCards: 1 },
      { minHeight: 180, label: "Body",   accepts: SPLIT_ACCEPTS },
      { minHeight: 56,  label: "Footer", accepts: ["text", "audio", "document", "dataset"] as CardType[], maxCards: 1 },
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
        gridArea: "1 / 1 / 2 / 3",
        minHeight: 72,
        label: "Header banner",
        accepts: ["text", "image", "audio", "video"] as CardType[],
        maxCards: 1,
      },
      { gridArea: "2 / 1 / 3 / 2", minHeight: 140, label: "Left column",  accepts: SPLIT_ACCEPTS },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 140, label: "Right column", accepts: SPLIT_ACCEPTS },
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
        gridArea: "1 / 1 / 2 / 4",
        minHeight: 64,
        label: "Header banner",
        accepts: ["text", "image", "audio", "video"] as CardType[],
        maxCards: 1,
      },
      { gridArea: "2 / 1 / 3 / 2", minHeight: 120, label: "Left column",   accepts: COMPACT },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 120, label: "Centre column", accepts: COMPACT },
      { gridArea: "2 / 3 / 3 / 4", minHeight: 120, label: "Right column",  accepts: COMPACT },
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
        gridArea: "1 / 1 / 4 / 2",
        minHeight: 240,
        label: "Main content",
        accepts: ["text", "image", "video", "audio", "animation", "document", "map", "diagram", "chart"] as CardType[],
      },
      { gridArea: "1 / 2 / 2 / 3", minHeight: 72, label: "Top panel",    accepts: COMPACT, maxCards: 1 },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 72, label: "Middle panel", accepts: COMPACT, maxCards: 1 },
      { gridArea: "3 / 2 / 4 / 3", minHeight: 72, label: "Bottom panel", accepts: COMPACT, maxCards: 1 },
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
        gridArea: "1 / 1 / 2 / 3",
        minHeight: 56,
        label: "Header",
        accepts: ["text", "audio"] as CardType[],
        maxCards: 1,
      },
      { gridArea: "2 / 1 / 3 / 2", minHeight: 100, label: "Top-left",     accepts: COMPACT, maxCards: 1 },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 100, label: "Top-right",    accepts: COMPACT, maxCards: 1 },
      { gridArea: "3 / 1 / 4 / 2", minHeight: 100, label: "Bottom-left",  accepts: COMPACT, maxCards: 1 },
      { gridArea: "3 / 2 / 4 / 3", minHeight: 100, label: "Bottom-right", accepts: COMPACT, maxCards: 1 },
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
        gridArea: "1 / 1 / 3 / 2",
        minHeight: 200,
        label: "Annotation column",
        accepts: ["text", "audio", "document"] as CardType[],
      },
      { gridArea: "1 / 2 / 2 / 3", minHeight: 100, label: "Top-centre",  accepts: COMPACT, maxCards: 1 },
      { gridArea: "1 / 3 / 2 / 4", minHeight: 100, label: "Top-right",   accepts: COMPACT, maxCards: 1 },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 100, label: "Bottom-centre", accepts: COMPACT, maxCards: 1 },
      { gridArea: "2 / 3 / 3 / 4", minHeight: 100, label: "Bottom-right", accepts: COMPACT, maxCards: 1 },
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
      minHeight: 88,
      label: `Panel ${i + 1}`,
      accepts: COMPACT,
      maxCards: 1,
    })),
  },
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
  const isCompatible  = activeCardType == null || spec.accepts.includes(activeCardType)

  const slotData: LayoutSlotDropTargetData = {
    type: "layout-slot",
    sessionId,
    taskId: layoutCard.taskId,
    layoutCardId: layoutCard.id,
    slotIndex,
    accepts: spec.accepts,
    maxCards: spec.maxCards,
    currentCardCount: slotCards.length,
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `layout-slot:${sessionId}:${layoutCard.taskId}:${layoutCard.id}:${slotIndex}`,
    data: slotData,
  })

  const isFull = slotCards.length >= (spec.maxCards ?? 1)

  // When a non-layout card is being dragged, pulse compatible empty slots to
  // redirect the user's attention toward valid drop targets.
  const isNonLayoutDrag = isDragActive && activeCardType != null && !activeCardType.startsWith("layout-")
  const shouldPulse = isNonLayoutDrag && isCompatible && !isFull && slotCards.length === 0

  const borderClass =
    isOver && isCompatible && !isFull ? "border-blue-400 bg-blue-50/50" :
    isOver && (!isCompatible || isFull) ? "border-red-300 bg-red-50/30" :
    isDragActive && (!isCompatible || isFull) ? "border-neutral-200 bg-neutral-50/30 opacity-40" :
    shouldPulse ? "border-blue-300 bg-blue-50/30 animate-pulse" :
    "border-neutral-200 bg-neutral-50/60"

  const labelClass =
    isOver && isCompatible && !isFull  ? "text-blue-400" :
    isOver && (!isCompatible || isFull) ? "text-red-400" :
    shouldPulse ? "text-blue-300" :
    "text-neutral-300"

  const labelText =
    isOver && isFull         ? "Slot full" :
    isOver && !isCompatible  ? "Not allowed" : spec.label

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
            "flex h-full items-center justify-center text-[9px] font-medium uppercase tracking-wide select-none pointer-events-none",
            labelClass,
          ].join(" ")}
          style={{ minHeight: spec.minHeight }}
        >
          {labelText}
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
    <div className="group relative rounded-lg border border-neutral-200 bg-white overflow-hidden shadow-sm">
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
      <div style={def.gridStyle}>
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
