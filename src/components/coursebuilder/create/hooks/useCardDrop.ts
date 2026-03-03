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
import type {
  SessionId,
  CanvasId,
  TaskId,
  TaskAreaKind,
  CardType,
  DroppedCardId,
  CardId,
  BlockKey,
  CourseSession,
} from "../types"
import { useCourseStore } from "../store/courseStore"
import { useCanvasStore } from "../store/canvasStore"

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
  canvasId?: CanvasId
  taskId:    TaskId
  areaKind:  TaskAreaKind
  /** Block key of the drop zone's parent block */
  blockKey?: BlockKey
}

const AREA_KINDS: ReadonlySet<string> = new Set(["instruction", "practice", "feedback"])

function parseSpecificDropId(rawId: string): DropTargetData | null {
  const parts = rawId.split(":")
  if (parts.length !== 3) return null

  const [sessionIdRaw, taskIdRaw, areaKindRaw] = parts
  if (!sessionIdRaw || !taskIdRaw || !AREA_KINDS.has(areaKindRaw)) return null

  return {
    sessionId: sessionIdRaw as SessionId,
    taskId: taskIdRaw as TaskId,
    areaKind: areaKindRaw as TaskAreaKind,
  }
}

function resolveDropTarget(event: DragEndEvent): DropTargetData | null {
  const candidates = [event.over?.id, ...(event.collisions?.map((c) => c.id) ?? [])]

  for (const candidate of candidates) {
    if (candidate == null) continue
    const parsed = parseSpecificDropId(String(candidate))
    if (parsed) return parsed
  }

  const target = event.over?.data.current as DropTargetData | undefined
  if (!target?.sessionId || !target?.taskId || !target?.areaKind) return null
  return target
}

function findVisibleTaskIdsForCanvas(session: CourseSession, canvasId: CanvasId | null): TaskId[] {
  if (!canvasId) {
    return session.topics.flatMap((topic) =>
      topic.objectives.flatMap((objective) => objective.tasks.map((task) => task.id)),
    )
  }

  const canvas = session.canvases.find((page) => page.id === canvasId)
  if (!canvas) return []

  const topicStart = canvas.contentTopicRange?.start ?? 0
  const topicEnd = canvas.contentTopicRange?.end ?? session.topics.length
  const objectiveStart = canvas.contentObjectiveRange?.start ?? 0
  const objectiveEnd = canvas.contentObjectiveRange?.end

  const visibleTaskIds: TaskId[] = []
  let flatObjectiveIndex = 0

  for (let topicIndex = 0; topicIndex < session.topics.length; topicIndex += 1) {
    const topic = session.topics[topicIndex]
    const inTopicRange = topicIndex >= topicStart && topicIndex < topicEnd

    for (const objective of topic.objectives) {
      const inObjectiveRange =
        flatObjectiveIndex >= objectiveStart &&
        (objectiveEnd === undefined || flatObjectiveIndex < objectiveEnd)

      if (inTopicRange && inObjectiveRange) {
        for (const task of objective.tasks) {
          visibleTaskIds.push(task.id)
        }
      }

      flatObjectiveIndex += 1
    }
  }

  return visibleTaskIds
}

function computeDropOrder(
  session: CourseSession | undefined,
  canvasId: CanvasId | null,
): number {
  if (!session) return Date.now()

  const cards = session.topics
    .flatMap((topic) => topic.objectives)
    .flatMap((objective) => objective.tasks)
    .flatMap((task) => task.droppedCards)
    .sort((a, b) => a.order - b.order)

  if (!canvasId) return Date.now()
  const canvas = session.canvases.find((page) => page.id === canvasId)
  if (!canvas) return Date.now()

  const start = canvas.contentCardRange?.start ?? 0
  const end = canvas.contentCardRange?.end ?? cards.length

  const insertIndex = Math.max(start, Math.min(end, cards.length))
  const prev = cards[insertIndex - 1]
  const next = cards[insertIndex]

  if (prev && next && next.order > prev.order) {
    return prev.order + (next.order - prev.order) / 2
  }
  if (prev) return prev.order + 1
  if (next) return next.order - 1
  return Date.now()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCardDrop() {
  const addDroppedCard = useCourseStore((s) => s.addDroppedCard)
  const sessions = useCourseStore((s) => s.sessions)
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active } = event

      const source = active.data.current as DragSourceData | undefined
      const target = resolveDropTarget(event)

      if (!source || source.type !== "card") return
      if (!target) return

      const targetSession = sessions.find((session) => session.id === target.sessionId)
      const targetCanvasId = target.canvasId ?? activeCanvasId
      const visibleTaskIds = targetSession
        ? findVisibleTaskIdsForCanvas(targetSession, targetCanvasId)
        : []
      const dropOrder = computeDropOrder(targetSession, targetCanvasId)

      const resolvedTaskId =
        visibleTaskIds.length > 0 && !visibleTaskIds.includes(target.taskId)
          ? visibleTaskIds[0]
          : target.taskId

      addDroppedCard(target.sessionId, resolvedTaskId, {
        id:         crypto.randomUUID() as DroppedCardId,
        cardId:     source.cardId,
        cardType:   source.cardType,
        taskId:     resolvedTaskId,
        areaKind:   target.areaKind,
        position:   { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        content:    source.content ?? { title: source.title ?? "" },
        order:      dropOrder,
      })
    },
    [activeCanvasId, addDroppedCard, sessions],
  )

  return { onDragEnd }
}
