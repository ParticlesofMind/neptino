import {
  pointerWithin,
  rectIntersection,
  type Collision,
  type CollisionDetection,
} from "@dnd-kit/core"
import type { DragSourceData } from "../hooks/useCardDrop"

type CollisionData = {
  droppableContainer?: {
    data?: {
      current?: unknown
    }
  }
  value?: number
}

type DroppableData = {
  type?: string
  accepts?: string[]
  maxCards?: number
  currentCardCount?: number
  sessionId?: string
  taskId?: string
  areaKind?: string
  blockKey?: string
}

type CollisionArgs = Parameters<CollisionDetection>[0]
type PointerCoordinates = NonNullable<CollisionArgs["pointerCoordinates"]>
type DroppableRect = NonNullable<ReturnType<CollisionArgs["droppableRects"]["get"]>>

function getCollisionData(collision: Collision): DroppableData {
  return ((collision.data as CollisionData | undefined)?.droppableContainer?.data?.current ?? {}) as DroppableData
}

function getCollisionValue(collision: Collision): number {
  const value = (collision.data as CollisionData | undefined)?.value
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER
}

function isLayoutSlotCollision(collision: Collision): boolean {
  const id = String(collision.id)
  const data = getCollisionData(collision)
  return data.type === "layout-slot" || id.startsWith("layout-slot:")
}

function rankCollision(collision: Collision, activeData: DragSourceData | undefined): number {
  const id = String(collision.id)
  const data = getCollisionData(collision)
  const activeCardType = activeData?.cardType
  const isLayoutCard = activeCardType?.startsWith("layout-") ?? false
  const isPlacedCard = activeData?.droppedCardId != null
  const isLayoutSlot = isLayoutSlotCollision(collision)
  const isInsertionSlot = id.includes(":slot:")
  const isCatchAll = id.includes(":catchall")
  const isBody = id.includes(":body")
  const isSpecificTaskArea = !isLayoutSlot && !isInsertionSlot && !isCatchAll && !isBody && data.sessionId && data.taskId && data.areaKind

  if (isLayoutSlot) {
    if (!activeCardType || isLayoutCard) return -1
    const accepts = data.accepts ?? []
    const isAccepted = accepts.length === 0 || accepts.includes(activeCardType)
    const isFull =
      typeof data.maxCards === "number" &&
      typeof data.currentCardCount === "number" &&
      data.currentCardCount >= data.maxCards
    return isAccepted && !isFull ? 500 : -1
  }

  if (!isLayoutCard && activeCardType && !isPlacedCard) {
    return -1
  }

  if (isInsertionSlot) return 400
  if (isSpecificTaskArea) return 300
  if (isCatchAll && data.blockKey) return 200
  if (isBody) return 100
  return 0
}

function chooseSingleCollision(collisions: Collision[], activeData: DragSourceData | undefined): Collision[] {
  let best: Collision | null = null
  let bestRank = -1
  let bestValue = Number.MAX_SAFE_INTEGER

  for (const collision of collisions) {
    const rank = rankCollision(collision, activeData)
    if (rank < 0) continue

    const value = getCollisionValue(collision)
    if (rank > bestRank || (rank === bestRank && value < bestValue)) {
      best = collision
      bestRank = rank
      bestValue = value
    }
  }

  return best ? [best] : []
}

function pointInsideRect(point: PointerCoordinates, rect: DroppableRect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
}

function insertionParentIds(insertionId: string): string[] {
  const slotIndex = insertionId.indexOf(":slot:")
  if (slotIndex === -1) return []

  const prefix = insertionId.slice(0, slotIndex)
  const parentIds = [prefix]
  const parts = prefix.split(":")

  if (parts[1] === "body" && parts[0]) {
    parentIds.push(`${parts[0]}:body`)
  }

  return parentIds
}

function distanceToInsertionSlot(point: PointerCoordinates, rect: DroppableRect): number {
  const centerY = rect.top + rect.height / 2
  const horizontalDistance =
    point.x < rect.left
      ? rect.left - point.x
      : point.x > rect.right
        ? point.x - rect.right
        : 0

  return Math.abs(point.y - centerY) + horizontalDistance * 0.25
}

function findNearestInsertionSlot(args: CollisionArgs, activeData: DragSourceData | undefined): Collision | null {
  const point = args.pointerCoordinates
  const activeCardType = activeData?.cardType
  if (!point || !activeCardType) return null

  const canUseTopLevelInsertion = activeCardType.startsWith("layout-") || activeData?.droppedCardId != null
  if (!canUseTopLevelInsertion) return null

  let best: Collision | null = null
  let bestValue = Number.MAX_SAFE_INTEGER

  for (const droppableContainer of args.droppableContainers) {
    const id = String(droppableContainer.id)
    if (!id.includes(":slot:")) continue

    const rect = args.droppableRects.get(droppableContainer.id)
    if (!rect) continue

    const parentRect = insertionParentIds(id)
      .map((parentId) => args.droppableRects.get(parentId))
      .find((candidate): candidate is DroppableRect => Boolean(candidate))
    if (!parentRect || !pointInsideRect(point, parentRect)) continue

    const collision: Collision = {
      id: droppableContainer.id,
      data: {
        droppableContainer,
        value: distanceToInsertionSlot(point, rect),
      },
    }

    if (rankCollision(collision, activeData) < 0) continue

    const value = getCollisionValue(collision)
    if (value < bestValue) {
      best = collision
      bestValue = value
    }
  }

  return best
}

export const courseEditorCollisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current as DragSourceData | undefined
  const pointerHits = pointerWithin(args)

  const layoutSlotHit = chooseSingleCollision(pointerHits.filter(isLayoutSlotCollision), activeData)
  if (layoutSlotHit.length > 0) return layoutSlotHit

  const nearestInsertionSlot = findNearestInsertionSlot(args, activeData)
  if (nearestInsertionSlot) return [nearestInsertionSlot]

  const pointerHit = chooseSingleCollision(pointerHits, activeData)
  if (pointerHit.length > 0) return pointerHit

  if (activeData?.droppedCardId != null) return []

  return chooseSingleCollision(rectIntersection(args), activeData)
}
