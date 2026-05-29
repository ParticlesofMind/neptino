import type { CardType } from "../types"

export interface CardDimensions {
  width: number
  height: number
}

export const CANVAS_BODY_WIDTH_PX = 642
export const CANVAS_COMPOSITION_CONTENT_WIDTH_PX = 620

export const COMPOSITION_SIZE_PRESETS = [
  { label: "Compact", width: 560, height: 620 },
  { label: "Standard", width: CANVAS_BODY_WIDTH_PX, height: 680 },
  { label: "Tall", width: CANVAS_BODY_WIDTH_PX, height: 760 },
] as const satisfies readonly (CardDimensions & { label: string })[]

export const STANDARD_COMPOSITION_DIMENSIONS: CardDimensions = {
  width: COMPOSITION_SIZE_PRESETS[1].width,
  height: COMPOSITION_SIZE_PRESETS[1].height,
}

export const TALL_COMPOSITION_DIMENSIONS: CardDimensions = {
  width: COMPOSITION_SIZE_PRESETS[2].width,
  height: COMPOSITION_SIZE_PRESETS[2].height,
}

const FIELD_FILL_CARD_TYPES: ReadonlySet<CardType> = new Set([
  "chat",
  "text-editor",
  "code-editor",
  "whiteboard",
])

export function isFieldFillCardType(cardType: CardType): boolean {
  return FIELD_FILL_CARD_TYPES.has(cardType)
}

export function isLayoutCardType(cardType: CardType): boolean {
  return cardType.startsWith("layout-")
}

export function cardAspectRatio(dimensions: CardDimensions): string {
  const width = Number.isFinite(dimensions.width) && dimensions.width > 0
    ? Math.round(dimensions.width)
    : CANVAS_BODY_WIDTH_PX
  const height = Number.isFinite(dimensions.height) && dimensions.height > 0
    ? Math.round(dimensions.height)
    : COMPOSITION_SIZE_PRESETS[1].height

  return `${width} / ${height}`
}
