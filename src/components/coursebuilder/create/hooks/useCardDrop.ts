"use client"

/**
 * useCardDrop
 *
 * dnd-kit drop handler for task-area drop zones.
 * Attaches a `DragEndEvent` listener via the DndContext provided by the
 * parent editor layout and dispatches the result to the course store.
 *
 * Usage:
 *   Wrap the editor in <DndContext onDragEnd={onCardDrop}>.
 *   Drag sources (FilesBrowser) produce items shaped as `DragSourceData`.
 *   Drop targets (Content block task areas) expose `DropTargetData`.
 */

import { useCallback } from "react"
import type { DragEndEvent } from "@dnd-kit/core"
import type { SessionId, TaskId, TaskAreaKind, CardType, DroppedCardId, CardId } from "../types"
import { useCourseStore } from "../store/courseStore"

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface DragSourceData {
  type: "card"
  cardId:    CardId
  cardType:  CardType
  title?:    string
  content?:  Record<string, unknown>
}

export interface DropTargetData {
  sessionId: SessionId
  taskId:    TaskId
  areaKind:  TaskAreaKind
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCardDrop() {
  const addDroppedCard = useCourseStore((s) => s.addDroppedCard)

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const source = active.data.current as DragSourceData | undefined
      const target = over.data.current   as DropTargetData | undefined

      if (!source || source.type !== "card") return
      if (!target?.sessionId || !target?.taskId || !target?.areaKind) return

      addDroppedCard(target.sessionId, target.taskId, {
        id:         crypto.randomUUID() as DroppedCardId,
        cardId:     source.cardId,
        cardType:   source.cardType,
        taskId:     target.taskId,
        areaKind:   target.areaKind,
        position:   { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        content:    source.content ?? { title: source.title ?? "" },
        order:      Date.now(),
      })
    },
    [addDroppedCard],
  )

  return { onDragEnd }
}
