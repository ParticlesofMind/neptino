import { describe, expect, it } from "vitest"
import {
  getRecipeCardPlacement,
  selectLayoutRecipe,
} from "@/components/coursebuilder/create/layout/layoutRecipes"
import { computePageZones } from "@/components/coursebuilder/create/layout/pageZones"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import type { CardType, DroppedCard } from "@/components/coursebuilder/create/types"

function card(cardType: CardType, order: number): DroppedCard {
  return {
    id: `${cardType}-${order}`,
    cardId: `source-${cardType}-${order}`,
    cardType,
    taskId: "task",
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: { width: 320, height: 180 },
    content: { title: cardType },
    order,
  } as DroppedCard
}

describe("layout recipe selector", () => {
  const zones = computePageZones(DEFAULT_PAGE_DIMENSIONS)

  it("selects a map-led atlas recipe for map, legend, and timeline pages", () => {
    const cards = [card("map", 0), card("legend", 1), card("timeline", 2)]
    const recipe = selectLayoutRecipe(cards, zones)

    expect(recipe.id).toBe("map-led-atlas")
    expect(recipe.dominantCardId).toBe("map-0")
    expect(getRecipeCardPlacement(cards[0]!, recipe).slot).toBe("primary")
    expect(getRecipeCardPlacement(cards[1]!, recipe).slot).toBe("legend")
    expect(getRecipeCardPlacement(cards[2]!, recipe).slot).toBe("timeline")
  })

  it("selects data investigation before evidence when a table is present", () => {
    const recipe = selectLayoutRecipe([card("source-excerpt", 0), card("table", 1), card("text-editor", 2)], zones)

    expect(recipe.id).toBe("data-investigation")
  })

  it("selects workbook when response surfaces dominate", () => {
    const recipe = selectLayoutRecipe([card("text-editor", 0), card("whiteboard", 1), card("text", 2)], zones)

    expect(recipe.id).toBe("workbook")
    expect(getRecipeCardPlacement(card("text-editor", 0), recipe).slot).toBe("response")
  })
})
