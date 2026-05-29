import { describe, expect, it } from "vitest"
import { computePageZones, rectContainsRect } from "@/components/coursebuilder/create/layout/pageZones"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"

describe("computePageZones", () => {
  it("derives sheet, print-safe, body, text, and active margin zones", () => {
    const zones = computePageZones(DEFAULT_PAGE_DIMENSIONS)

    expect(zones.sheetBox).toEqual({ x: 0, y: 0, width: 794, height: 1123 })
    expect(zones.printSafeBox).toEqual({ x: 32, y: 32, width: 730, height: 1059 })
    expect(zones.bodyBox).toEqual({ x: 76, y: 96, width: 642, height: 931 })
    expect(zones.textBox).toEqual({ x: 76, y: 96, width: 360, height: 931 })
    expect(zones.marginZones.top).toEqual({ x: 0, y: 0, width: 794, height: 96 })
    expect(zones.marginZones.right).toEqual({ x: 718, y: 96, width: 76, height: 931 })
    expect(zones.marginZones.bottom).toEqual({ x: 0, y: 1027, width: 794, height: 96 })
    expect(zones.marginZones.left).toEqual({ x: 0, y: 96, width: 76, height: 931 })
  })

  it("keeps the body inside the print-safe area for the default page", () => {
    const zones = computePageZones(DEFAULT_PAGE_DIMENSIONS)

    expect(rectContainsRect(zones.printSafeBox, zones.bodyBox)).toBe(true)
  })
})
