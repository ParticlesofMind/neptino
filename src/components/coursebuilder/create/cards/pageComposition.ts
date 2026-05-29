import type { DroppedCard } from "../types"

export const PAGE_COMPOSITION_PLACEMENT = "full-body" as const

export function isPageCompositionCard(card: DroppedCard): boolean {
  return card.cardType.startsWith("layout-") && card.content.pagePlacement === PAGE_COMPOSITION_PLACEMENT
}
