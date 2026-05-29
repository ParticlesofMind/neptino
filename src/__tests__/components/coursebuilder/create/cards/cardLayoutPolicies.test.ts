import { describe, expect, it } from "vitest"
import {
  getCardLayoutPolicy,
  resolveCardLayoutDimensions,
} from "@/components/coursebuilder/create/cards/cardLayoutPolicies"
import { computePageZones } from "@/components/coursebuilder/create/layout/pageZones"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import type { DroppedCard } from "@/components/coursebuilder/create/types"

function card(overrides: Partial<DroppedCard>): DroppedCard {
  return {
    id: "dropped-card",
    cardId: "card",
    cardType: "text",
    taskId: "task",
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: { width: 420, height: 120 },
    content: {},
    order: 0,
    ...overrides,
  } as DroppedCard
}

describe("card layout policies", () => {
  const zones = computePageZones(DEFAULT_PAGE_DIMENSIONS)

  it("treats text width as readable instead of full body width", () => {
    const policy = getCardLayoutPolicy("text", {}, zones)
    const resolved = resolveCardLayoutDimensions(card({ cardType: "text", dimensions: { width: 420, height: 160 } }), zones)

    expect(policy.role).toBe("support")
    expect(policy.maxWidth).toBeLessThanOrEqual(321)
    expect(resolved.width).toBe(policy.maxWidth)
  })

  it("clamps layout compositions and slides to the body width", () => {
    const layoutPolicy = getCardLayoutPolicy("layout-feature", { pagePlacement: "full-body" }, zones)
    const slides = resolveCardLayoutDimensions(card({
      cardType: "slides",
      dimensions: { width: 720, height: 430 },
    }), zones)

    expect(layoutPolicy.maxWidth).toBe(zones.bodyBox.width)
    expect(layoutPolicy.preferredWidth).toBe(zones.bodyBox.width)
    expect(slides.width).toBe(zones.bodyBox.width)
  })

  it("allows map-led visuals to be dominant while keeping critical content print-safe", () => {
    const policy = getCardLayoutPolicy("map", {}, zones)

    expect(policy.role).toBe("primary")
    expect(policy.density).toBe("dominant")
    expect(policy.allowedZones).toContain("overlay")
    expect(policy.criticalContentMustStayPrintSafe).toBe(true)
    expect(policy.minWidth).toBeGreaterThanOrEqual(Math.round(zones.bodyBox.width * 0.6))
  })
})
