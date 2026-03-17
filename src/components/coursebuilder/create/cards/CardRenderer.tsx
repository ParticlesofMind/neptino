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
import { CARD_TYPE_META, CardTypePreview } from "./CardTypePreview"
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

// ─── Generic preview fallback ─────────────────────────────────────────────────
// Reuses the gallery-quality preview for types not yet backed by a dedicated
// canvas renderer (audio, document, table, etc.) so curate stays aligned.

function GenericDomCard({ card, onRemove }: CardRenderProps) {
  const meta = CARD_TYPE_META[card.cardType]
  const title = typeof card.content["title"] === "string" && card.content["title"]
    ? card.content["title"]
    : meta.label

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 hidden h-5 w-5 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 group-hover:flex"
          aria-label="Remove block"
        >
          &times;
        </button>
      )}
      <div className="mb-3 flex items-center gap-2 pr-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
          <meta.icon size={14} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-neutral-900">{title}</p>
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">{meta.label}</p>
        </div>
      </div>
      <CardTypePreview cardType={card.cardType} content={card.content} hideTitle />
    </div>
  )
}
