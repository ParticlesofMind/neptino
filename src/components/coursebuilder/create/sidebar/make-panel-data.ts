import type { CardType } from "../types"
export { CARD_SPECS, GROUPS, SUBGROUPS } from "../cards/card-type-registry"
export type { CardGroup, CardSpec, CardSubgroup, CompositionSource } from "../cards/card-type-registry"
import { LAYOUT_SAMPLE_CONTENT } from "./make-panel-sample-content-layouts"
import { MEDIA_SAMPLE_CONTENT } from "./make-panel-sample-content-media"
import { PRODUCT_SAMPLE_CONTENT } from "./make-panel-sample-content-products"

export const SAMPLE_CONTENT: Partial<Record<CardType, Record<string, unknown>>> = {
  ...MEDIA_SAMPLE_CONTENT,
  ...PRODUCT_SAMPLE_CONTENT,
  ...LAYOUT_SAMPLE_CONTENT,
}
