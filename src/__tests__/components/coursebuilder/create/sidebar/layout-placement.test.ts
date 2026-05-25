import { describe, expect, it } from "vitest"

import { CARD_SPECS, GROUPS } from "@/components/coursebuilder/create/cards/card-type-registry"
import {
  growResizableGridLayoutForContent,
  LAYOUT_DEFS,
  normalizeResizableGridLayout,
  rowsForResizableGridSlotHeight,
} from "@/components/coursebuilder/create/cards/card-types/LayoutCard"
import { CATEGORIES, LIBRARY_ITEMS } from "@/components/coursebuilder/create/sidebar/files-browser-data"

describe("layout card placement surfaces", () => {
  it("keeps built-in layout selection out of Curate", () => {
    expect(CATEGORIES.some((category) => category.id === "layout")).toBe(false)
    expect(LIBRARY_ITEMS.some((item) => item.cardType.startsWith("layout-"))).toBe(false)
  })

  it("exposes every layout definition in Make", () => {
    expect(GROUPS.find((group) => group.id === "layout")?.label).toBe("Compositions")

    const makeLayoutTypes = CARD_SPECS
      .filter((spec) => spec.group === "layout")
      .map((spec) => spec.cardType)
      .sort()

    const layoutDefTypes = Object.keys(LAYOUT_DEFS)
      .map((kind) => `layout-${kind}`)
      .sort()

    expect(makeLayoutTypes).toEqual(layoutDefTypes)
  })

  it("normalizes the experimental resizable grid layout", () => {
    const layout = normalizeResizableGridLayout([
      { i: "0", x: 20, y: 2, w: 1, h: 1 },
      { i: "2", x: 3, y: 8, w: 7, h: 6 },
      { i: "extra", x: 0, y: 0, w: 12, h: 1 },
    ])

    expect(layout).toHaveLength(LAYOUT_DEFS["resizable-grid"].slotCount)
    expect(layout[0]).toMatchObject({ i: "0", x: 9, y: 2, w: 3, h: 3 })
    expect(layout[2]).toMatchObject({ i: "2", x: 3, y: 8, w: 7, h: 6 })
  })

  it("grows and reflows the experimental grid around measured slot content", () => {
    const layout = normalizeResizableGridLayout(undefined)
    const grown = growResizableGridLayoutForContent(layout, {
      0: rowsForResizableGridSlotHeight(310),
    })

    expect(grown.find((item) => item.i === "0")).toMatchObject({ y: 0, h: 9 })
    expect(grown.find((item) => item.i === "1")).toMatchObject({ y: 0, h: 4 })
    expect(grown.find((item) => item.i === "2")).toMatchObject({ y: 9 })
    expect(grown.find((item) => item.i === "3")).toMatchObject({ y: 9 })
  })
})
