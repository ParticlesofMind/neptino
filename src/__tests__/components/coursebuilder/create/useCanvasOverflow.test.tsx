import { describe, it, expect } from "vitest"
import {
  findCardSplitPoint,
  findLayoutSlotSplitPoint,
  findTaskRowSplitPoint,
  measureCanvasContentHeight,
} from "@/components/coursebuilder/create/hooks/useCanvasOverflow"

// Helper to create an element with synthetic offset properties and card index
function makeCard(idx: number, top: number, height: number): HTMLElement {
  const el = document.createElement("div")
  el.dataset.cardIdx = String(idx)
  el.dataset.cardId = `card-${idx}`
  Object.defineProperty(el, "offsetTop", { value: top, configurable: true })
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true })
  return el
}

function makeLayoutSlot(idx: number, top: number, height: number): HTMLElement {
  const el = document.createElement("div")
  el.dataset.layoutSlotIdx = String(idx)
  el.dataset.layoutSlotFrame = ""
  Object.defineProperty(el, "offsetTop", { value: top, configurable: true })
  Object.defineProperty(el, "offsetLeft", { value: 0, configurable: true })
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true })
  return el
}

describe("measureCanvasContentHeight helper", () => {
  it("uses marked descendants when the wrapper scrollHeight is blind to overflow", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 260)

    Object.defineProperty(body, "clientHeight", { value: 100, configurable: true })
    Object.defineProperty(content, "scrollHeight", { value: 100, configurable: true })

    content.appendChild(card)
    body.appendChild(content)

    expect(measureCanvasContentHeight(body, content)).toBe(260)
  })

  it("trusts marked descendants when wrapper scrollHeight is inflated by page scaffolding", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 260)

    Object.defineProperty(body, "clientHeight", { value: 500, configurable: true })
    Object.defineProperty(content, "scrollHeight", { value: 620, configurable: true })

    content.appendChild(card)
    body.appendChild(content)

    expect(measureCanvasContentHeight(body, content)).toBe(260)
  })
})

describe("findCardSplitPoint helper", () => {
  it("returns null when there are no card elements", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // no cards
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

    // first card starts at top and is too tall for a page: guarded as unsplittable
    content.appendChild(makeCard(0, 0, 120))
    content.appendChild(makeCard(1, 120, 10))
    expect(findCardSplitPoint(body, content, 100)).toBeNull()
  })

  it("falls back to splitting at the first overflowing card when none fully fit", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    body.appendChild(content)

    // neither card fully fits; split should move the first overflowing card
    content.appendChild(makeCard(0, 90, 40))
    content.appendChild(makeCard(1, 130, 40))

    expect(findCardSplitPoint(body, content, 100)).toBe(0)
  })
})

describe("findLayoutSlotSplitPoint helper", () => {
  it("splits an oversized layout card at the last fitting internal slot", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 260)

    card.appendChild(makeLayoutSlot(0, 0, 80))
    card.appendChild(makeLayoutSlot(1, 84, 80))
    card.appendChild(makeLayoutSlot(2, 168, 80))
    content.appendChild(card)
    body.appendChild(content)

    expect(findCardSplitPoint(body, content, 170)).toBeNull()
    expect(findLayoutSlotSplitPoint(body, content, 170)).toEqual({
      cardId: "card-0",
      cardIdx: 0,
      splitAt: 2,
      slotCount: 3,
    })
  })

  it("counts duplicate slot frame markers only once", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 360)

    card.appendChild(makeLayoutSlot(0, 0, 140))
    card.appendChild(makeLayoutSlot(0, 12, 110))
    card.appendChild(makeLayoutSlot(1, 150, 140))
    card.appendChild(makeLayoutSlot(1, 162, 110))
    card.appendChild(makeLayoutSlot(2, 300, 60))
    content.appendChild(card)
    body.appendChild(content)

    expect(findLayoutSlotSplitPoint(body, content, 145)).toEqual({
      cardId: "card-0",
      cardIdx: 0,
      splitAt: 1,
      slotCount: 3,
    })
  })

  it("returns an absolute slot split index for continuation slices", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 260)

    card.appendChild(makeLayoutSlot(1, 0, 80))
    card.appendChild(makeLayoutSlot(2, 84, 80))
    card.appendChild(makeLayoutSlot(3, 168, 80))
    content.appendChild(card)
    body.appendChild(content)

    expect(findLayoutSlotSplitPoint(body, content, 170)).toEqual({
      cardId: "card-0",
      cardIdx: 0,
      splitAt: 3,
      slotCount: 3,
    })
  })

  it("returns null when the first internal slot is already too tall", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")
    const card = makeCard(0, 0, 260)

    card.appendChild(makeLayoutSlot(0, 0, 220))
    card.appendChild(makeLayoutSlot(1, 224, 40))
    content.appendChild(card)
    body.appendChild(content)

    expect(findLayoutSlotSplitPoint(body, content, 170)).toBeNull()
  })
})

describe("findTaskRowSplitPoint helper", () => {
  function makeRow(idx: number, top: number, height: number): HTMLElement {
    const el = document.createElement("div")
    el.dataset.taskRowIdx = String(idx)
    Object.defineProperty(el, "offsetTop", { value: top, configurable: true })
    Object.defineProperty(el, "offsetHeight", { value: height, configurable: true })
    return el
  }

  it("returns a progress-making index when first overflowing row is at range start", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")

    const row0 = makeRow(0, 0, 220)
    const row1 = makeRow(1, 220, 20)

    content.appendChild(row0)
    content.appendChild(row1)
    body.appendChild(content)

    const split = findTaskRowSplitPoint(body, content, 100, 0, undefined)
    expect(split).toBe(1)
  })

  it("returns null when only one overflowing row is available in the range", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")

    const row0 = makeRow(0, 0, 220)
    content.appendChild(row0)
    body.appendChild(content)

    const split = findTaskRowSplitPoint(body, content, 100, 0, 1)
    expect(split).toBeNull()
  })

  it("returns first overflowing row when it's not at the current range start", () => {
    const body = document.createElement("div")
    const content = document.createElement("div")

    content.appendChild(makeRow(0, 0, 20))
    content.appendChild(makeRow(1, 20, 20))
    content.appendChild(makeRow(2, 220, 220))
    body.appendChild(content)

    const split = findTaskRowSplitPoint(body, content, 120, 0, 3)
    expect(split).toBe(2)
  })
})
