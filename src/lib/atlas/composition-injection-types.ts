import type { CardType } from "@/components/coursebuilder/create/types"

export interface AtlasInjectionCardPatch {
  cardType: CardType
  matchTitle?: string
  content: Record<string, unknown>
}

export interface AtlasInjectionOption {
  id: string
  label: string
  description: string
  sourceLabel: string
  compositionPresetId: string
  patches: AtlasInjectionCardPatch[]
}
