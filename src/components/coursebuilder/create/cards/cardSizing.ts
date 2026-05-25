import type { CardType } from "../types"

const FIELD_FILL_CARD_TYPES: ReadonlySet<CardType> = new Set([
  "chat",
  "text-editor",
  "code-editor",
  "whiteboard",
])

export function isFieldFillCardType(cardType: CardType): boolean {
  return FIELD_FILL_CARD_TYPES.has(cardType)
}
