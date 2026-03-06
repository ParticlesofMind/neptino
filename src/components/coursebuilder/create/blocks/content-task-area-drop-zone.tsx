"use client"

import { useDroppable } from "@dnd-kit/core"
import { CardRenderer } from "../cards/CardRenderer"
import { useCanvasStore } from "../store/canvasStore"
import type { BlockKey, CanvasId, DroppedCard, SessionId, TaskAreaKind, TaskId } from "../types"

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
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sessionId, canvasId, taskId, areaKind, blockKey },
  })

  const mediaDragActive = useCanvasStore((s) => s.mediaDragActive)

  return (
    <div data-testid={`task-area-${areaKind}`}>
      <div
        ref={setNodeRef}
        data-testid={`task-area-droppable-${areaKind}`}
        className={[
          "rounded-lg border border-neutral-200 bg-white py-1 transition-colors",
          mediaDragActive ? "min-h-[2.5rem]" : "min-h-[2rem]",
          isOver ? "border-blue-300 bg-blue-50" : "",
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
          {isOver && (
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
          {!hasCards && !isOver && (
            <div className={`flex items-center px-2 ${mediaDragActive ? "h-10" : "h-6"}`}>
              <span className={`text-[9px] italic ${mediaDragActive ? "text-blue-300" : "text-neutral-300"}`}>
                {mediaDragActive ? "Drop here" : label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
