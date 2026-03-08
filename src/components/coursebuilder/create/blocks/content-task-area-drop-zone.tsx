"use client"

import { useDroppable, useDndContext } from "@dnd-kit/core"
import { CardRenderer } from "../cards/CardRenderer"
import type { BlockKey, CanvasId, DroppedCard, SessionId, TaskAreaKind, TaskId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"

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
      {isOver && (
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
  cardIndexById?: Map<string, number>
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
  cardIndexById,
  onRemoveCard,
}: TaskAreaDropZoneProps) {
  const dropId = `${sessionId}:${taskId}:${areaKind}:${blockKey ?? "content"}`
  const hasCards = cards.length > 0
  const hasSingleLayoutCard = cards.length === 1 && cards[0]?.cardType.startsWith("layout-")
  const hasOnlyLayoutCards = hasCards && cards.every((c) => c.cardType.startsWith("layout-"))
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sessionId, canvasId, taskId, areaKind, blockKey },
  })

  // Detect whether the active drag source is a non-layout card (layout-first enforcement)
  const { active } = useDndContext()
  const activeDragType = (active?.data?.current as DragSourceData | undefined)?.cardType
  const dragIsNonLayout = activeDragType != null && !activeDragType.startsWith("layout-")
  // Show the layout-first hint whenever a non-layout card is dragged over a task
  // that has no cards at all, or whose top-level cards are only layout containers
  // (atomic cards must go into slots, not the bare task area).
  const showLayoutFirstHint = dragIsNonLayout && (!hasCards || hasOnlyLayoutCards)

  return (
    <div data-testid={`task-area-${areaKind}`}>
      <div
        ref={setNodeRef}
        data-testid={`task-area-droppable-${areaKind}`}
        className={[
          "min-h-[2rem] rounded-lg border border-border bg-background",
          hasSingleLayoutCard ? "py-0" : "py-1",
          isOver && !showLayoutFirstHint ? "border-blue-300 bg-blue-50" : "",
          showLayoutFirstHint ? "border-amber-300 bg-amber-50/40" : "",
        ].join(" ")}
      >
        <div className={hasSingleLayoutCard ? "space-y-0" : "space-y-1"}>
          {hasCards && (
            <div className={hasSingleLayoutCard ? "space-y-0" : "space-y-0.5"}>
              {cards.map((card, index) => {
                const prevOrder = index > 0 ? cards[index - 1]?.order : undefined
                const cardIdx = cardIndexById?.get(String(card.id))
                return (
                  <div
                    key={card.id}
                    className={hasSingleLayoutCard ? "w-full h-full" : "w-full"}
                    data-card-id={card.id}
                    {...(cardIdx !== undefined ? { "data-card-idx": cardIdx } : {})}
                  >
                    {!hasSingleLayoutCard && (
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
                    )}
                    <div className={hasSingleLayoutCard ? "w-full h-full [&>div]:h-full" : "w-full"}>
                      <CardRenderer
                        card={card}
                        onRemove={() => onRemoveCard(card.id)}
                      />
                    </div>
                  </div>
                )
              })}
              {!hasSingleLayoutCard && (
                <InsertionLineSlot
                  sessionId={sessionId}
                  canvasId={canvasId}
                  taskId={taskId}
                  areaKind={areaKind}
                  blockKey={blockKey}
                  prevOrder={cards[cards.length - 1]?.order}
                  slotIndex={cards.length}
                />
              )}
            </div>
          )}
          {/* Hover feedback is border-only to avoid reflow/jump while dragging. */}
          {showLayoutFirstHint && (
            <div className="flex items-center justify-center px-2 h-10">
              <span className="text-[9px] text-amber-600 italic">
                {hasOnlyLayoutCards
                  ? "Drop into a slot inside the layout"
                  : "Drop a layout container first"}
              </span>
            </div>
          )}
          {/* Idle empty state: plain drop target */}
          {!hasCards && !isOver && !showLayoutFirstHint && (
            <div className="flex items-center justify-center px-2 h-10">
              <span className="text-[9px] italic text-muted-foreground/40">
                {label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
