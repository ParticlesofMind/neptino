import { describe, expect, it } from "vitest"

import { CARD_SPECS, GROUPS } from "@/components/coursebuilder/create/cards/card-type-registry"
import {
  growResizableGridLayoutForContent,
  LAYOUT_DEFS,
  normalizeResizableGridLayout,
  rowsForResizableGridSlotHeight,
} from "@/components/coursebuilder/create/cards/card-types/LayoutCard"
import { CATEGORIES, LIBRARY_ITEMS } from "@/components/coursebuilder/create/sidebar/files-browser-data"
import { buildCompositionPresetContent, getCompositionPreset } from "@/components/coursebuilder/create/sidebar/composition-presets"
import { getDefaultCardDimensions } from "@/components/coursebuilder/create/utils/cardDefaults"

describe("layout card placement surfaces", () => {
  it("weaves built-in layout selection into the composition category", () => {
    expect(CATEGORIES.map((category) => String(category.id))).not.toContain("layout")
    expect(CATEGORIES.find((category) => category.id === "compositions")?.types).toContain("layout-split")
    expect(LIBRARY_ITEMS.every((item) => item.group === "compositions")).toBe(true)
    expect(LIBRARY_ITEMS.find((item) => item.id === "composition-preset-cartographic-simulation")).toMatchObject({
      cardType: "layout-feature",
      group: "compositions",
      subgroup: "simulation",
      title: "Cartographic simulation",
    })
  })

  it("exposes every layout definition in Make", () => {
    expect(GROUPS.find((group) => group.id === "compositions")?.label).toBe("Compositions")

    const makeLayoutTypes = CARD_SPECS
      .filter((spec) => spec.cardType.startsWith("layout-"))
      .map((spec) => spec.cardType)
      .sort()

    const layoutDefTypes = Object.keys(LAYOUT_DEFS)
      .map((kind) => `layout-${kind}`)
      .sort()

    expect(makeLayoutTypes).toEqual(layoutDefTypes)
  })

  it("builds cartographic simulation with legend, map, and timeline child cards", () => {
    const preset = getCompositionPreset("cartographic-simulation")
    expect(preset).toBeDefined()

    const content = buildCompositionPresetContent(preset!, "layout-feature")
    expect(content).toMatchObject({
      compositionPresetId: "cartographic-simulation",
      pagePlacement: "full-body",
    })
    expect(content.slots).toMatchObject({
      0: [expect.objectContaining({ cardType: "legend", content: expect.objectContaining({ title: "Map legend" }) })],
      1: [expect.objectContaining({ cardType: "map", content: expect.objectContaining({ title: "Scenario map" }) })],
      2: [expect.objectContaining({ cardType: "timeline", content: expect.objectContaining({ title: "Change over time" }) })],
    })
  })

  it("uses a portrait default surface for cartographic compositions", () => {
    expect(getDefaultCardDimensions("layout-feature")).toMatchObject({
      width: 642,
      height: 680,
    })
    const map = getDefaultCardDimensions("map")
    expect(map.width).toBeLessThanOrEqual(642)
    expect(map.height).toBeGreaterThan(360)
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
