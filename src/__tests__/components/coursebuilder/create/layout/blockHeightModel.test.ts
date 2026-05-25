import { describe, expect, it } from "vitest"
import { estimateDroppedCardHeight } from "@/components/coursebuilder/create/layout/blockHeightModel"
import type { CardId, DroppedCard, DroppedCardId, TaskId } from "@/components/coursebuilder/create/types"

function makeCard(
  cardType: DroppedCard["cardType"],
  height: number,
): DroppedCard {
  return {
    id: `dropped-${cardType}-${height}` as DroppedCardId,
    cardId: `card-${cardType}-${height}` as CardId,
    cardType,
    taskId: "task-1" as TaskId,
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: { width: 320, height },
    content: { title: `${cardType} sample` },
    order: 0,
  }
}

describe("estimateDroppedCardHeight", () => {
  it("preserves declared canvas height for fixed-height product cards", () => {
    expect(estimateDroppedCardHeight(makeCard("text-editor", 360))).toBeGreaterThanOrEqual(360)
    expect(estimateDroppedCardHeight(makeCard("code-editor", 380))).toBeGreaterThanOrEqual(380)
    expect(estimateDroppedCardHeight(makeCard("whiteboard", 420))).toBeGreaterThanOrEqual(420)
    expect(estimateDroppedCardHeight(makeCard("rich-sim", 320))).toBeGreaterThanOrEqual(320)
    expect(estimateDroppedCardHeight(makeCard("interactive", 280))).toBeGreaterThanOrEqual(280)
  })

  it("reserves a page-scale height for chat cards", () => {
    expect(estimateDroppedCardHeight(makeCard("chat", 320))).toBeGreaterThanOrEqual(640)
  })

  it("uses more conservative estimates for tall media cards", () => {
    expect(estimateDroppedCardHeight(makeCard("video", 270))).toBeGreaterThanOrEqual(270)
    expect(estimateDroppedCardHeight(makeCard("image", 300))).toBeGreaterThanOrEqual(260)
    expect(estimateDroppedCardHeight(makeCard("audio", 180))).toBeGreaterThanOrEqual(150)
    expect(estimateDroppedCardHeight(makeCard("model-3d", 280))).toBeGreaterThanOrEqual(250)
  })

  it("expands layout card estimates to include tall slot content", () => {
    const tallChild = makeCard("text-editor", 520)
    const layoutCard = {
      ...makeCard("layout-split", 260),
      content: {
        slots: {
          0: [tallChild],
          1: [tallChild],
        },
      },
    }

    expect(estimateDroppedCardHeight(layoutCard)).toBeGreaterThan(520)
  })

  it("uses resizable grid geometry instead of forcing the declared card height", () => {
    const layoutCard = {
      ...makeCard("layout-resizable-grid", 900),
      content: {
        gridLayout: [
          { i: "0", x: 0, y: 0, w: 6, h: 12 },
        ],
      },
    }

    expect(estimateDroppedCardHeight(layoutCard)).toBeLessThan(900)
    expect(estimateDroppedCardHeight(layoutCard)).toBeGreaterThan(420)
  })
})
