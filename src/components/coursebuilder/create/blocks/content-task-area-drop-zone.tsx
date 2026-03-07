"use client"

import { useDroppable, useDndContext } from "@dnd-kit/core"
import { CardRenderer } from "../cards/CardRenderer"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"
import { getDefaultCardDimensions, getSampleCardContent } from "../utils/cardDefaults"
import type { BlockKey, CanvasId, CardId, CardType, DroppedCard, DroppedCardId, SessionId, TaskAreaKind, TaskId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"

// ─── Quick-pick layout chips shown in the empty state ─────────────────────────

const QUICK_PICK_LAYOUTS: { cardType: CardType; label: string }[] = [
  { cardType: "layout-split",   label: "Split" },
  { cardType: "layout-stack",   label: "Stack" },
  { cardType: "layout-banner",  label: "Banner" },
  { cardType: "layout-quad",    label: "Quad" },
]

interface InsertionLineSlotProps {
  sessionId: SessionId
  canvasId?: CanvasId
  taskId: TaskId
  areaKind: TaskAreaKind
  blockKey?: BlockKey
  prevOrder?: number
  nextOrder?: number
  slotIndex: number
}

function InsertionLineSlot({
  sessionId,
  canvasId,
  taskId,
  areaKind,
  blockKey,
  prevOrder,
  nextOrder,
  slotIndex,
}: InsertionLineSlotProps) {
  const mediaDragActive = useCanvasStore((s) => s.mediaDragActive)
  const { isOver, setNodeRef } = useDroppable({
    id: `${sessionId}:${taskId}:${areaKind}:${blockKey ?? "content"}:slot:${slotIndex}`,
    data: { sessionId, canvasId, taskId, areaKind, blockKey, prevOrder, nextOrder },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid="drop-insertion-line"
      data-area-kind={areaKind}
      data-slot-index={slotIndex}
      className="relative h-2"
    >
      {(mediaDragActive || isOver) && (
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-t ${isOver ? "border-blue-400" : "border-blue-200"}`} />
      )}
    </div>
  )
}

interface TaskAreaDropZoneProps {
  sessionId: SessionId
  canvasId?: CanvasId
  taskId: TaskId
  areaKind: TaskAreaKind
  blockKey?: BlockKey
  label: string
  cards?: DroppedCard[]
  onRemoveCard: (cardId: string) => void
}

export function TaskAreaDropZone({
  sessionId,
  canvasId,
  taskId,
  areaKind,
  blockKey,
  label,
  cards = [],
  onRemoveCard,
}: TaskAreaDropZoneProps) {
  const dropId = `${sessionId}:${taskId}:${areaKind}:${blockKey ?? "content"}`
  const hasCards = cards.length > 0
  const hasOnlyLayoutCards = hasCards && cards.every((c) => c.cardType.startsWith("layout-"))
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sessionId, canvasId, taskId, areaKind, blockKey },
  })

  const mediaDragActive = useCanvasStore((s) => s.mediaDragActive)
  const addDroppedCard  = useCourseStore((s) => s.addDroppedCard)

  // Detect whether the active drag source is a non-layout card (layout-first enforcement)
  const { active } = useDndContext()
  const activeDragType = (active?.data?.current as DragSourceData | undefined)?.cardType
  const dragIsNonLayout = activeDragType != null && !activeDragType.startsWith("layout-")
  // Show the layout-first hint whenever a non-layout card is dragged over a task
  // that has no cards at all, or whose top-level cards are only layout containers
  // (atomic cards must go into slots, not the bare task area).
  const showLayoutFirstHint = dragIsNonLayout && (!hasCards || hasOnlyLayoutCards)

  function placeQuickLayout(cardType: CardType) {
    addDroppedCard(
      sessionId,
      taskId,
      {
        id:         crypto.randomUUID() as DroppedCardId,
        cardId:     crypto.randomUUID() as CardId,
        cardType,
        taskId,
        areaKind,
        blockKey,
        position:   { x: 0, y: 0 },
        dimensions: getDefaultCardDimensions(cardType),
        content:    getSampleCardContent(cardType, cardType.replace("layout-", "")),
        order:      Date.now(),
      },
      canvasId,
    )
  }

  return (
    <div data-testid={`task-area-${areaKind}`}>
      <div
        ref={setNodeRef}
        data-testid={`task-area-droppable-${areaKind}`}
        className={[
          "rounded-lg border border-border bg-background py-1 transition-colors",
          mediaDragActive ? "min-h-[2.5rem]" : "min-h-[2rem]",
          isOver && !showLayoutFirstHint ? "border-blue-300 bg-blue-50" : "",
          showLayoutFirstHint ? "border-amber-300 bg-amber-50/40" : "",
        ].join(" ")}
      >
        <div className="space-y-1">
          {hasCards && (
            <div className="space-y-0.5">
              {cards.map((card, index) => {
                const prevOrder = index > 0 ? cards[index - 1]?.order : undefined
                return (
                  <div key={card.id} className="w-full">
                    <InsertionLineSlot
                      sessionId={sessionId}
                      canvasId={canvasId}
                      taskId={taskId}
                      areaKind={areaKind}
                      blockKey={blockKey}
                      prevOrder={prevOrder}
                      nextOrder={card.order}
                      slotIndex={index}
                    />
                    <div className="w-full">
                      <CardRenderer
                        card={card}
                        onRemove={() => onRemoveCard(card.id)}
                      />
                    </div>
                  </div>
                )
              })}
              <InsertionLineSlot
                sessionId={sessionId}
                canvasId={canvasId}
                taskId={taskId}
                areaKind={areaKind}
                blockKey={blockKey}
                prevOrder={cards[cards.length - 1]?.order}
                slotIndex={cards.length}
              />
            </div>
          )}
          {isOver && !showLayoutFirstHint && (
            <div
              className={[
                "rounded border-2 border-dashed border-blue-300 bg-blue-50/60",
                "flex items-center justify-center",
                hasCards ? "h-6" : "h-8",
              ].join(" ")}
            >
              <span className="text-[9px] text-blue-400">
                {hasCards ? "Add here" : "Drop here"}
              </span>
            </div>
          )}
          {showLayoutFirstHint && (
            <div className="flex items-center justify-center px-2 h-10">
              <span className="text-[9px] text-amber-600 italic">
                {hasOnlyLayoutCards
                  ? "Drop into a slot inside the layout"
                  : "Drop a layout container first"}
              </span>
            </div>
          )}
          {/* Idle empty state: quick-pick layout chips ─────────────────── */}
          {!hasCards && !isOver && !showLayoutFirstHint && (
            mediaDragActive ? (
              <div className="flex items-center justify-center px-2 h-10">
                <span className="text-[9px] italic text-blue-300">Drop here</span>
              </div>
            ) : (
              <div className="px-2 py-2 space-y-1.5">
                <span className="text-[9px] italic text-muted-foreground/40">{label}</span>
                <div className="grid grid-cols-2 gap-1">
                  {QUICK_PICK_LAYOUTS.map(({ cardType, label: chipLabel }) => (
                    <button
                      key={cardType}
                      type="button"
                      onClick={() => placeQuickLayout(cardType)}
                      className="text-left truncate rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[9px] text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-100"
                    >
                      {chipLabel}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
