import { describe, expect, it } from "vitest"
import { courseEditorCollisionDetection } from "@/components/coursebuilder/create/drag/course-editor-collision"
import type { CardId, CardType } from "@/components/coursebuilder/create/types"
import type { DragSourceData } from "@/components/coursebuilder/create/hooks/useCardDrop"

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  }
}

function container(id: string, current: Record<string, unknown>) {
  return {
    id,
    data: { current },
  }
}

function dragSource(cardType: CardType, extras: Partial<DragSourceData> = {}): DragSourceData {
  return {
    type: "card",
    cardId: `${cardType}-card` as CardId,
    cardType,
    ...extras,
  }
}

function runCollision({
  activeData,
  pointer,
  containers,
  rects,
}: {
  activeData: DragSourceData
  pointer: { x: number; y: number }
  containers: Array<ReturnType<typeof container>>
  rects: Array<[string, ReturnType<typeof rect>]>
}) {
  return courseEditorCollisionDetection({
    active: {
      id: "active-card",
      data: { current: activeData },
    },
    collisionRect: rect(pointer.x, pointer.y, 1, 1),
    droppableContainers: containers,
    droppableRects: new Map(rects),
    pointerCoordinates: pointer,
  } as never)
}

describe("courseEditorCollisionDetection", () => {
  it("selects the nearest insertion slot while the pointer is inside a task area", () => {
    const parentId = "session-1:task-1:instruction:content"
    const slotAId = `${parentId}:slot:0`
    const slotBId = `${parentId}:slot:1`
    const targetData = {
      sessionId: "session-1",
      taskId: "task-1",
      areaKind: "instruction",
      blockKey: "content",
    }

    const collisions = runCollision({
      activeData: dragSource("layout-split"),
      pointer: { x: 160, y: 278 },
      containers: [
        container(parentId, targetData),
        container(slotAId, { ...targetData, nextOrder: 10 }),
        container(slotBId, { ...targetData, prevOrder: 10 }),
      ],
      rects: [
        [parentId, rect(100, 100, 360, 360)],
        [slotAId, rect(100, 118, 360, 6)],
        [slotBId, rect(100, 288, 360, 6)],
      ],
    })

    expect(collisions.map((collision) => collision.id)).toEqual([slotBId])
  })

  it("keeps layout-slot targets ahead of top-level insertion slots", () => {
    const parentId = "session-1:task-1:instruction:content"
    const slotId = `${parentId}:slot:0`
    const layoutSlotId = "layout-slot:session-1:task-1:layout-1:0"

    const collisions = runCollision({
      activeData: dragSource("text"),
      pointer: { x: 180, y: 180 },
      containers: [
        container(parentId, {
          sessionId: "session-1",
          taskId: "task-1",
          areaKind: "instruction",
          blockKey: "content",
        }),
        container(slotId, {
          sessionId: "session-1",
          taskId: "task-1",
          areaKind: "instruction",
          blockKey: "content",
        }),
        container(layoutSlotId, {
          type: "layout-slot",
          sessionId: "session-1",
          taskId: "task-1",
          layoutCardId: "layout-1",
          slotIndex: 0,
          accepts: [],
          currentCardCount: 0,
          maxCards: 1,
        }),
      ],
      rects: [
        [parentId, rect(100, 100, 360, 360)],
        [slotId, rect(100, 118, 360, 6)],
        [layoutSlotId, rect(120, 140, 160, 160)],
      ],
    })

    expect(collisions.map((collision) => collision.id)).toEqual([layoutSlotId])
  })
})
