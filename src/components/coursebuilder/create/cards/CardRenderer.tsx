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
import { GripVertical, X } from "lucide-react"
import type { CSSProperties } from "react"
import type { CanvasRenderMode, DroppedCard, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { DEFAULT_CARD_REGISTRY, resolveCardRenderer } from "./CardRegistry"
import type { CardRenderProps } from "./CardRegistry"
import { CardTypePreview } from "./CardTypePreview"
import { useCanvasStore } from "../store/canvasStore"
import type { DragSourceData } from "../hooks/useCardDrop"
import { ResourceCardFrame } from "./card-types/ResourceCardFrame"
import { resolveCardLayoutDimensions } from "./cardLayoutPolicies"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardRendererProps {
  card: DroppedCard
  onRemove?: () => void
  /** Render mode — defaults to "editor" */
  mode?: CanvasRenderMode
  /**
   * When true, the card is treated as a placed canvas card and wrapped in
   * useDraggable so it can be re-ordered by dragging.
   * Defaults to true in editor mode; false in preview.
   */
  draggable?: boolean
  /** Set when this card is rendered inside a layout slot so re-drag can remove it from the correct source. */
  sourceLayoutCardId?: string
  sourceSlotIndex?: number
  /** Block context for legacy cards that do not yet have card.blockKey set. */
  dragSourceBlockKey?: DroppedCard["blockKey"]
  /** Additional sizing/layout class for the placed card wrapper. */
  className?: string
  /** Ask field-aware card renderers to consume the available field height. */
  fillAvailable?: boolean
  /** Canonical page dimensions for resolving policy-driven card width/height. */
  pageDimensions?: PageDimensions
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardRenderer({
  card,
  onRemove,
  mode = "editor",
  draggable,
  sourceLayoutCardId,
  sourceSlotIndex,
  dragSourceBlockKey,
  className,
  fillAvailable,
  pageDimensions = DEFAULT_PAGE_DIMENSIONS,
}: CardRendererProps) {
  const Component   = resolveCardRenderer(DEFAULT_CARD_REGISTRY, card.cardType, mode)
  const selectId    = useCanvasStore((s) => s.selectId)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const isSelected  = selectedIds.includes(card.id)

  const isEditor = mode === "editor"
  const isDraggable = isEditor && (draggable ?? true)
  const showEditorControls = isEditor && (isDraggable || onRemove)

  const dragData: DragSourceData = {
    type:                "card",
    cardId:              card.cardId,
    cardType:            card.cardType,
    title:               typeof card.content["title"] === "string" ? card.content["title"] : undefined,
    content:             card.content,
    position:            card.position,
    dimensions:          card.dimensions,
    droppedCardId:       card.id,
    sourceTaskId:        card.taskId,
    sourceOrder:         card.order,
    sourceAreaKind:      card.areaKind,
    sourceBlockKey:      card.blockKey ?? dragSourceBlockKey,
    sourceLayoutCardId,
    sourceSlotIndex,
  }

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id:       `placed:${card.id}`,
    data:     dragData,
    disabled: !isDraggable,
  })

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditor) return
    e.stopPropagation()
    selectId(card.id, e.metaKey || e.ctrlKey)
  }

  const selectionRing = mode === "editor" && isSelected
    ? "ring-2 ring-primary ring-offset-1 rounded"
    : undefined
  const resolvedLayout = resolveCardLayoutDimensions(card, pageDimensions)
  const cardStyle: CSSProperties | undefined = fillAvailable
    ? undefined
    : {
        width: `min(100%, ${resolvedLayout.width}px)`,
        minHeight: resolvedLayout.height,
      }

  let content: React.ReactElement
  if (Component) {
    // eslint-disable-next-line react-hooks/static-components -- registry entries are static component references.
    content = <Component card={card} fillAvailable={fillAvailable} mode={mode} pageDimensions={pageDimensions} isEditable={isEditor} />
  } else {
    content = <GenericDomCard card={card} fillAvailable={fillAvailable} mode={mode} pageDimensions={pageDimensions} isEditable={isEditor} />
  }

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      className={[
        "group/placed-card relative",
        className,
        selectionRing,
        isDragging ? "opacity-40" : undefined,
      ].filter(Boolean).join(" ")}
      style={cardStyle}
      data-card-layout-role={resolvedLayout.policy.role}
      data-card-id={card.id}
      data-card-layout-density={resolvedLayout.policy.density}
      data-card-layout-zones={resolvedLayout.policy.allowedZones.join(" ")}
      data-print-safe-critical={resolvedLayout.policy.criticalContentMustStayPrintSafe ? "true" : "false"}
      data-card-can-overlay={resolvedLayout.policy.canOverlay ? "true" : "false"}
      data-card-can-paginate={resolvedLayout.policy.canPaginate ? "true" : "false"}
      data-card-can-expand-immersive={resolvedLayout.policy.canExpandImmersive ? "true" : "false"}
      data-resolved-card-width={resolvedLayout.width}
      data-resolved-card-height={resolvedLayout.height}
      onClick={handleClick}
    >
      {showEditorControls && (
        <div className="absolute right-1.5 top-1.5 z-30 flex items-center gap-1">
          {isDraggable && (
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label="Move card"
              title="Move card"
              onClick={(event) => event.stopPropagation()}
              className={[
                "flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-500 shadow-sm backdrop-blur-sm",
                "cursor-grab transition-colors hover:border-neutral-300 hover:bg-white hover:text-neutral-700 active:cursor-grabbing",
                "focus:outline-none focus:ring-[3px] focus:ring-primary/15",
              ].join(" ")}
              style={{ touchAction: "none" }}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={13} strokeWidth={1.75} />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              aria-label="Remove card"
              title="Remove card"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              className={[
                "flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white/95 text-neutral-400 shadow-sm backdrop-blur-sm",
                "transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive",
                "focus:outline-none focus:ring-[3px] focus:ring-primary/15",
              ].join(" ")}
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          )}
        </div>
      )}
      {content}
    </div>
  )
}

// ─── Generic preview fallback ─────────────────────────────────────────────────
// Reuses the gallery-quality preview for types not yet backed by a dedicated
// canvas renderer (audio, document, table, etc.) so curate stays aligned.

function GenericDomCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  return (
    <ResourceCardFrame
      card={card}
      onRemove={onRemove}
      fillAvailable={fillAvailable}
      className={fillAvailable ? "flex h-full min-h-[inherit] flex-col" : undefined}
      bodyClassName={fillAvailable ? "min-h-0 flex-1 p-2.5" : "p-2.5"}
    >
      <div className={fillAvailable ? "h-full min-h-0" : undefined}>
        <CardTypePreview cardType={card.cardType} content={card.content} hideTitle />
      </div>
    </ResourceCardFrame>
  )
}
