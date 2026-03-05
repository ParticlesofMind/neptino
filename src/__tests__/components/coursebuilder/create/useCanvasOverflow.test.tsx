import { describe, it, expect } from "vitest"
import { findCardSplitPoint } from "@/components/coursebuilder/create/hooks/useCanvasOverflow"

// Helper to create an element with synthetic offset properties and card index
function makeCard(idx: number, top: number, height: number): HTMLElement {
  const el = document.createElement("div")
  el.dataset.cardIdx = String(idx)
  Object.defineProperty(el, "offsetTop", { value: top, configurable: true })
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true })
  return el
}

describe("findCardSplitPoint helper", () => {
  it("returns null when there are fewer than two card elements", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // no cards
    expect(findCardSplitPoint(body, content, 100)).toBeNull()

    // one card only
    content.appendChild(makeCard(0, 0, 20))
    expect(findCardSplitPoint(body, content, 100)).toBeNull()
  })

  it("returns appropriate split index when cards fit within available height", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // two cards stacked; both fit but second begins at 50 so splitting after first
    content.appendChild(makeCard(0, 0, 50))
    content.appendChild(makeCard(1, 50, 30))
    const available = 60 // enough to show only first card completely
    expect(findCardSplitPoint(body, content, available)).toBe(1)
  })

  it("skips cards that do not fit and returns next possible index", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // three cards; only first two fit
    content.appendChild(makeCard(0, 0, 50))
    content.appendChild(makeCard(1, 50, 40))
    content.appendChild(makeCard(2, 90, 20))
    const available = 100
    // last card bottom = 110 > available, so split at card idx 2
    expect(findCardSplitPoint(body, content, available)).toBe(2)
  })

  it("returns null if no card boundary keeps content within available height", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // two cards but even the first card is too tall for available height
    content.appendChild(makeCard(0, 0, 120))
    content.appendChild(makeCard(1, 120, 10))
    expect(findCardSplitPoint(body, content, 100)).toBeNull()
  })
})
