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

import { useDroppable } from "@dnd-kit/core"
import { X } from "lucide-react"
import type { DroppedCard, SessionId } from "../../types"
import type { CardRenderProps } from "../CardRegistry"
import type { LayoutSlotDropTargetData } from "../../hooks/useCardDrop"
import { useCourseStore } from "../../store/courseStore"
import { CardRenderer } from "../CardRenderer"

// ─── Layout definitions ───────────────────────────────────────────────────────

type LayoutKind = "split" | "stack" | "feature" | "sidebar" | "quad" | "mosaic"

interface SlotSpec {
  /** CSS grid-area shorthand; omit for natural flow */
  gridArea?: string
  minHeight: number
  /** Accessible label for the slot drop zone */
  label: string
}

interface LayoutDef {
  kind: LayoutKind
  label: string
  slotCount: number
  gridStyle: React.CSSProperties
  slots: SlotSpec[]
}

const LAYOUT_DEFS: Record<LayoutKind, LayoutDef> = {
  split: {
    kind: "split",
    label: "Split",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" },
    slots: [
      { minHeight: 120, label: "Left" },
      { minHeight: 120, label: "Right" },
    ],
  },
  stack: {
    kind: "stack",
    label: "Stack",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateRows: "3fr 2fr", gap: "2px" },
    slots: [
      { minHeight: 150, label: "Primary (top)" },
      { minHeight: 100, label: "Secondary (bottom)" },
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
      { gridArea: "1 / 1 / 3 / 2", minHeight: 220, label: "Left anchor" },
      { gridArea: "1 / 2 / 2 / 3", minHeight: 150, label: "Main content" },
      { gridArea: "2 / 2 / 3 / 3", minHeight: 48,  label: "Caption strip" },
    ],
  },
  sidebar: {
    kind: "sidebar",
    label: "Sidebar",
    slotCount: 2,
    gridStyle: { display: "grid", gridTemplateColumns: "3fr 7fr", gap: "2px" },
    slots: [
      { minHeight: 120, label: "Sidebar (30%)" },
      { minHeight: 120, label: "Main (70%)" },
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
      { minHeight: 110, label: "Top-left" },
      { minHeight: 110, label: "Top-right" },
      { minHeight: 110, label: "Bottom-left" },
      { minHeight: 110, label: "Bottom-right" },
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

  const slotData: LayoutSlotDropTargetData = {
    type: "layout-slot",
    sessionId,
    taskId: layoutCard.taskId,
    layoutCardId: layoutCard.id,
    slotIndex,
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `layout-slot:${sessionId}:${layoutCard.taskId}:${layoutCard.id}:${slotIndex}`,
    data: slotData,
  })

  return (
    <div
      ref={setNodeRef}
      aria-label={spec.label}
      style={{ gridArea: spec.gridArea, minHeight: spec.minHeight }}
      className={[
        "relative rounded border border-dashed transition-colors overflow-hidden",
        isOver
          ? "border-blue-400 bg-blue-50/50"
          : "border-neutral-200 bg-neutral-50/60",
      ].join(" ")}
    >
      {slotCards.length === 0 ? (
        <div
          className={[
            "flex h-full items-center justify-center text-[9px] font-medium uppercase tracking-wide select-none pointer-events-none",
            isOver ? "text-blue-400" : "text-neutral-300",
          ].join(" ")}
          style={{ minHeight: spec.minHeight }}
        >
          {spec.label}
        </div>
      ) : (
        <div className="space-y-0.5">
          {slotCards.map((slotCard) => (
            <CardRenderer
              key={slotCard.id}
              card={slotCard}
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
