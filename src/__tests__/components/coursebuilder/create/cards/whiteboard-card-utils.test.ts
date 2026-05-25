import { describe, expect, it } from "vitest"

import {
  getWhiteboardHeight,
  resolveWhiteboardPersistenceKey,
} from "@/components/coursebuilder/create/cards/card-types/whiteboard-card-utils"
import type {
  CardId,
  DroppedCard,
  DroppedCardId,
  TaskId,
} from "@/components/coursebuilder/create/types"

function makeWhiteboardCard(overrides: Partial<DroppedCard> = {}): DroppedCard {
  return {
    id: "dropped-whiteboard-1" as DroppedCardId,
    cardId: "library-whiteboard-1" as CardId,
    cardType: "whiteboard",
    taskId: "task-1" as TaskId,
    areaKind: "practice",
    position: { x: 0, y: 0 },
    dimensions: { width: 640, height: 420 },
    content: {},
    order: 0,
    ...overrides,
  }
}

describe("whiteboard card utils", () => {
  it("scopes persistence keys to the explicit board key and dropped card identity", () => {
    const card = makeWhiteboardCard({
      content: { boardKey: "  Systems Sketch! " },
    })

    expect(resolveWhiteboardPersistenceKey(card)).toBe(
      "coursebuilder:whiteboard:systems-sketch:task-1:library-whiteboard-1:dropped-whiteboard-1",
    )
  })

  it("falls back to card identity when no board key is provided", () => {
    expect(resolveWhiteboardPersistenceKey(makeWhiteboardCard())).toBe(
      "coursebuilder:whiteboard:task-1:library-whiteboard-1:dropped-whiteboard-1",
    )
  })

  it("keeps whiteboard heights inside predictable bounds", () => {
    expect(getWhiteboardHeight(makeWhiteboardCard({ dimensions: { width: 640, height: 120 } }), false)).toBe(280)
    expect(getWhiteboardHeight(makeWhiteboardCard({ dimensions: { width: 640, height: 900 } }), false)).toBe(620)
    expect(getWhiteboardHeight(makeWhiteboardCard({ dimensions: { width: 640, height: 0 } }), true)).toBe(340)
  })
})
