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
import { getDefaultCardDimensions } from "../utils/cardDefaults"

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
  /** Order hint from insertion-line drop targets. */
  prevOrder?: number
  /** Order hint from insertion-line drop targets. */
  nextOrder?: number
  /** Optional placement hint inside the canvas (0..1 percentages). */
  dropPosition?: { x: number; y: number; absolute?: boolean }
  /** Block key of the drop zone's parent block */
  blockKey?: BlockKey
  /** Infinite canvas mode - use absolute positioning */
  infiniteMode?: boolean
}

export interface LayoutSlotDropTargetData {
  type: "layout-slot"
  sessionId: SessionId
  taskId: TaskId
  layoutCardId: string
  slotIndex: number
}


type CollisionWithData = {
  id: string | number
  data?: { droppableContainer?: { data?: { current?: unknown } } }
}

function collisionTargetData(collision: CollisionWithData): DropTargetData | undefined {
  return (collision as CollisionWithData).data?.droppableContainer?.data?.current as DropTargetData | undefined
}

function isTaskAreaKind(value: string): value is TaskAreaKind {
  return value === "instruction" || value === "practice" || value === "feedback"
}

function parseDropTargetFromCollisionId(collisionId: string | number): DropTargetData | undefined {
  const id = String(collisionId)
  const parts = id.split(":")

  // task-area IDs are shaped like:
  //   sessionId:taskId:areaKind
  //   sessionId:taskId:areaKind:blockKey
  //   sessionId:taskId:areaKind:blockKey:slot:n
  if (parts.length < 3) return undefined

  const [, taskId, areaKind, blockKey] = parts
  if (!taskId || !areaKind || !isTaskAreaKind(areaKind)) return undefined

  return {
    sessionId: parts[0] as SessionId,
    taskId: taskId as TaskId,
    areaKind,
    blockKey: blockKey && blockKey !== "slot" ? (blockKey as BlockKey) : undefined,
  }
}

function getCollisionTarget(collision: CollisionWithData): DropTargetData | undefined {
  return collisionTargetData(collision) ?? parseDropTargetFromCollisionId(collision.id)
}

function findPreferredCollisionTarget(
  collisions: CollisionWithData[],
  overId: string | null,
  predicate: (collision: CollisionWithData, target: DropTargetData) => boolean,
): DropTargetData | null {
  if (overId) {
    const overCollision = collisions.find((collision) => String(collision.id) === overId)
    if (overCollision) {
      const overTarget = getCollisionTarget(overCollision)
      if (overTarget && predicate(overCollision, overTarget)) {
        return overTarget
      }
    }
  }

  for (const collision of collisions) {
    const target = getCollisionTarget(collision)
    if (target && predicate(collision, target)) {
      return target
    }
  }

  return null
}

function resolveDropTarget(event: DragEndEvent): DropTargetData | null {
  const collisions = (event.collisions ?? []) as CollisionWithData[]
  const overId = event.over ? String(event.over.id) : null

  // dnd-kit's pointerWithin returns droppables in DOM registration order (outer
  // containers before inner ones) because all collision values are 0 and the
  // sort is stable.  We must therefore explicitly prefer the most-specific
  // droppable rather than just taking the first one.
  //
  // Priority order:
  //   1. Insertion-line slots  (:slot: in ID) — carry order hints
  //   2. Task-area droppables  (ID is NOT a catchall, body, or slot)
  //   3. Block catch-alls      (have blockKey, ID ends with :catchall)
  //   4. Anything else with the required fields (fallback for edge cases)

  // 1. Slots
  const slotTarget = findPreferredCollisionTarget(
    collisions,
    overId,
    (collision, target) =>
      String(collision.id).includes(":slot:") && !!target.sessionId && !!target.taskId && !!target.areaKind,
  )
  if (slotTarget) return slotTarget

  // 2. Specific task-area droppables (not catch-all, not slot, not body)
  const specificTaskAreaTarget = findPreferredCollisionTarget(
    collisions,
    overId,
    (collision, target) => {
      const id = String(collision.id)
      return (
        !id.includes(":catchall") &&
        !id.includes(":slot:") &&
        !id.includes(":body") &&
        !!target.sessionId &&
        !!target.taskId &&
        !!target.areaKind
      )
    },
  )
  if (specificTaskAreaTarget) return specificTaskAreaTarget

  // 3. Block catch-all droppables (correct blockKey, but routes to first visible task)
  const catchAllTarget = findPreferredCollisionTarget(
    collisions,
    overId,
    (collision, target) =>
      String(collision.id).includes(":catchall") &&
      !!target.sessionId &&
      !!target.taskId &&
      !!target.areaKind &&
      !!target.blockKey,
  )
  if (catchAllTarget) return catchAllTarget

  // 4. Fallback: any collision or event.over with the required fields
  const genericTarget = findPreferredCollisionTarget(
    collisions,
    overId,
    (_, target) => !!target.sessionId && !!target.taskId && !!target.areaKind,
  )
  if (genericTarget) return genericTarget

  const directTarget = event.over?.data.current as DropTargetData | undefined
  if (directTarget?.sessionId && directTarget?.taskId && directTarget?.areaKind) {
    return directTarget
  }

  return null
}

// After we resolve a target we still want to ensure it includes a blockKey if
// one is available in the collision list.  The body-level droppable has no
// blockKey and was previously being chosen in scenarios where a more specific
// content/assignment collision was also present, leading to cards being stored
// with an undefined blockKey and thus rendering in *both* blocks.  The fix is
// simple: if the selected target lacks a blockKey, look through the original
// collisions for one that does and prefer that instead.
function resolveDropTargetWithBlockKey(event: DragEndEvent): DropTargetData | null {
  const candidate = resolveDropTarget(event)
  if (candidate && !candidate.blockKey) {
    const collisions = (event.collisions ?? []) as CollisionWithData[]
    // try to pick the collision that the pointer was directly over first
    const overId = event.over ? String(event.over.id) : null
    for (const collision of collisions) {
      const d = collisionTargetData(collision)
      if (d?.blockKey && d.sessionId && d.taskId && d.areaKind) {
        if (overId && String(collision.id) === overId) {
          return d
        }
      }
    }
    // otherwise fall back to any collision that carries a blockKey
    for (const collision of collisions) {
      const d = collisionTargetData(collision)
      if (d?.blockKey && d.sessionId && d.taskId && d.areaKind) {
        return d
      }
    }
  }
  return candidate
}

// replace the original call site to use the helper above


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

function computeDropOrderFromHints(target: DropTargetData): number | null {
  const prev = typeof target.prevOrder === "number" ? target.prevOrder : null
  const next = typeof target.nextOrder === "number" ? target.nextOrder : null

  if (prev !== null && next !== null && next > prev) {
    return prev + (next - prev) / 2
  }
  if (prev !== null) return prev + 1
  if (next !== null) return next - 1
  return null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCardDrop() {
  const addDroppedCard = useCourseStore((s) => s.addDroppedCard)
  const addCardToLayoutSlot = useCourseStore((s) => s.addCardToLayoutSlot)
  const sessions = useCourseStore((s) => s.sessions)

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active } = event

      const source = active.data.current as DragSourceData | undefined

      if (!source || source.type !== "card") return

      // Layout-slot drop: card dropped into a layout container's slot
      const overData = event.over?.data.current as LayoutSlotDropTargetData | undefined
      if (overData?.type === "layout-slot") {
        addCardToLayoutSlot(
          overData.sessionId,
          overData.taskId,
          overData.layoutCardId,
          overData.slotIndex,
          {
            id:         crypto.randomUUID() as DroppedCardId,
            cardId:     source.cardId,
            cardType:   source.cardType,
            taskId:     overData.taskId,
            areaKind:   "instruction",
            position:   { x: 0, y: 0 },
            dimensions: getDefaultCardDimensions(source.cardType),
            content:    source.content ?? { title: source.title ?? "" },
            order:      Date.now(),
          },
        )
        return
      }

      const target = resolveDropTargetWithBlockKey(event)
      if (!target) return

      const targetSession = sessions.find((session) => session.id === target.sessionId)
      const targetCanvasId = target.canvasId ?? null
      const visibleTaskIds = targetSession
        ? findVisibleTaskIdsForCanvas(targetSession, targetCanvasId)
        : []
      const dropOrder =
        computeDropOrderFromHints(target) ?? computeDropOrder(targetSession, targetCanvasId)

      const resolvedTaskId =
        visibleTaskIds.length > 0 && !visibleTaskIds.includes(target.taskId)
          ? visibleTaskIds[0]
          : target.taskId

      // For infinite canvas mode, use the actual drop coordinates
      const dropPosition = target.infiniteMode && event.delta
        ? {
            x: event.delta.x,
            y: event.delta.y,
          }
        : target.dropPosition ?? { x: 0, y: 0 }

      addDroppedCard(target.sessionId, resolvedTaskId, {
        id:         crypto.randomUUID() as DroppedCardId,
        cardId:     source.cardId,
        cardType:   source.cardType,
        taskId:     resolvedTaskId,
        areaKind:   target.areaKind,
        blockKey:   target.blockKey,
        position:   dropPosition,
        dimensions: getDefaultCardDimensions(source.cardType),
        content:    source.content ?? { title: source.title ?? "" },
        order:      dropOrder,
      }, targetCanvasId)
    },
    [addDroppedCard, addCardToLayoutSlot, sessions],
  )

  return { onDragEnd }
}
