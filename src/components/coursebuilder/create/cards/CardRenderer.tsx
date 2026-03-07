"use client"

/**
 * Card Renderer
 *
 * Resolves the correct component for a card via the CardRegistry.
 * Adding a new card type:
 *   1. Create the component in ./card-types/
 *   2. Add an entry in CardRegistry.ts
 *   3. Nothing else — this file never needs to change.
 *
 * mode="editor"  (default) — shown in the coursebuilder canvas
 * mode="preview"           — shown in the student-facing published view
 */

import { useDraggable } from "@dnd-kit/core"
import type { DroppedCard } from "../types"
import { DEFAULT_CARD_REGISTRY, resolveCardRenderer } from "./CardRegistry"
import type { CardRenderProps } from "./CardRegistry"
import { useCanvasStore } from "../store/canvasStore"
import type { DragSourceData } from "../hooks/useCardDrop"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardRendererProps {
  card: DroppedCard
  onRemove?: () => void
  /** Render mode — defaults to "editor" */
  mode?: "editor" | "preview"
  /**
   * When true, the card is treated as a placed canvas card and wrapped in
   * useDraggable so it can be re-ordered by dragging.
   * Defaults to true in editor mode; false in preview.
   */
  draggable?: boolean
  /** Set when this card is rendered inside a layout slot so re-drag can remove it from the correct source. */
  sourceLayoutCardId?: string
  sourceSlotIndex?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardRenderer({ card, onRemove, mode = "editor", draggable, sourceLayoutCardId, sourceSlotIndex }: CardRendererProps) {
  const Component   = resolveCardRenderer(DEFAULT_CARD_REGISTRY, card.cardType, mode)
  const selectId    = useCanvasStore((s) => s.selectId)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const isSelected  = selectedIds.includes(card.id)

  const isDraggable = draggable ?? (mode === "editor")

  const dragData: DragSourceData = {
    type:                "card",
    cardId:              card.cardId,
    cardType:            card.cardType,
    title:               typeof card.content["title"] === "string" ? card.content["title"] : undefined,
    content:             card.content,
    droppedCardId:       card.id,
    sourceTaskId:        card.taskId,
    sourceOrder:         card.order,
    sourceLayoutCardId,
    sourceSlotIndex,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:       `placed:${card.id}`,
    data:     dragData,
    disabled: !isDraggable,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectId(card.id, e.metaKey || e.ctrlKey)
  }

  const selectionRing = mode === "editor" && isSelected
    ? "ring-2 ring-blue-500 ring-offset-1 rounded"
    : undefined

  const content = Component
    ? <Component card={card} onRemove={onRemove} />
    : <GenericDomCard card={card} onRemove={onRemove} />

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      className={[selectionRing, isDragging ? "opacity-40" : undefined].filter(Boolean).join(" ")}
      style={{ touchAction: "none" }}
      onClick={handleClick}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      {content}
    </div>
  )
}

// ─── Generic DOM fallback ─────────────────────────────────────────────────────
// Used for card types not yet in the registry (audio, document, table, etc.)

function GenericDomCard({ card, onRemove }: CardRenderProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : card.cardType

  return (
    <div className="group relative flex items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
      <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase font-medium">
        {card.cardType}
      </span>
      <span className="text-neutral-700 truncate">{title}</span>
    </div>
  )
}
