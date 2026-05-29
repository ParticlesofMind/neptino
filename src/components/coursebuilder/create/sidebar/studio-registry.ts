import type { CardType } from "../types"
import type { CardId, DroppedCard, DroppedCardId, TaskId } from "../types"
import { CARD_TYPE_META } from "../cards/card-type-registry"
import { getDefaultCardDimensions, getSampleCardContent } from "../utils/cardDefaults"
import { withDefaultSourceProvenance } from "@/lib/atlas/source-provenance"
import { normalizeOverlayLayers } from "./editors/map-editor-config"
import {
  CODE_SNIPPET_PROFILE,
  BIBLIOGRAPHY_PROFILE,
  CITATION_PROFILE,
  DATASET_PROFILE,
  DOCUMENT_PROFILE,
  EMBED_PROFILE,
  FLASHCARDS_PROFILE,
  FORM_PROFILE,
  GIS_LAYER_PROFILE,
  INTERACTIVE_PROFILE,
  LEGEND_PROFILE,
  SOURCE_EXCERPT_PROFILE,
  SORTER_PROFILE,
  TABLE_PROFILE,
  TIMELINE_PROFILE,
  VOICE_RECORDER_PROFILE,
} from "./make-studio-additional-profiles"
import { ANIMATION_PROFILE, AUDIO_PROFILE, IMAGE_PROFILE, MAP_PROFILE, MODEL_3D_PROFILE, TEXT_PROFILE, VIDEO_PROFILE } from "./make-studio-media-profiles"
import { CHART_PROFILE, CHAT_PROFILE, DEFAULT_PROFILE, DIAGRAM_PROFILE, GAMES_PROFILE, SLIDES_PROFILE } from "./make-studio-product-profiles"
import type { StudioProfile } from "./studio-profile-types"

const STUDIO_PROFILES: Partial<Record<CardType, StudioProfile>> = {
  text: TEXT_PROFILE,
  image: IMAGE_PROFILE,
  audio: AUDIO_PROFILE,
  video: VIDEO_PROFILE,
  animation: ANIMATION_PROFILE,
  embed: EMBED_PROFILE,
  flashcards: FLASHCARDS_PROFILE,
  "code-snippet": CODE_SNIPPET_PROFILE,
  "model-3d": MODEL_3D_PROFILE,
  map: MAP_PROFILE,
  chart: CHART_PROFILE,
  diagram: DIAGRAM_PROFILE,
  dataset: DATASET_PROFILE,
  media: DOCUMENT_PROFILE,
  document: DOCUMENT_PROFILE,
  table: TABLE_PROFILE,
  "source-excerpt": SOURCE_EXCERPT_PROFILE,
  citation: CITATION_PROFILE,
  bibliography: BIBLIOGRAPHY_PROFILE,
  "gis-layer": GIS_LAYER_PROFILE,
  interactive: INTERACTIVE_PROFILE,
  form: FORM_PROFILE,
  "voice-recorder": VOICE_RECORDER_PROFILE,
  sorter: SORTER_PROFILE,
  "rich-sim": INTERACTIVE_PROFILE,
  "village-3d": INTERACTIVE_PROFILE,
  games: GAMES_PROFILE,
  chat: CHAT_PROFILE,
  slides: SLIDES_PROFILE,
  timeline: TIMELINE_PROFILE,
  legend: LEGEND_PROFILE,
}

function isLayoutCardType(cardType: CardType): boolean {
  return cardType.startsWith("layout-")
}

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface SlotDraftEntry {
  cardType: CardType
  title?: string
}

function readSlotDraft(value: unknown): Record<string, SlotDraftEntry[]> {
  if (!value || typeof value !== "object") return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([slotKey, entries]) => [
        slotKey,
        Array.isArray(entries)
          ? entries.flatMap((entry): SlotDraftEntry[] => {
            if (typeof entry === "string") return [{ cardType: entry as CardType }]
            if (!entry || typeof entry !== "object") return []
            const candidate = entry as Record<string, unknown>
            return typeof candidate.cardType === "string"
              ? [{ cardType: candidate.cardType as CardType, title: typeof candidate.title === "string" ? candidate.title : undefined }]
              : []
          })
          : [],
      ])
      .filter(([, entries]) => entries.length > 0),
  )
}

function buildLayoutSlots(content: Record<string, unknown>): Record<string, DroppedCard[]> {
  const existingSlots = (content.slots && typeof content.slots === "object")
    ? content.slots as Record<string, DroppedCard[]>
    : {}
  const slotDraft = readSlotDraft(content.slotDraft)
  const draftSlots = Object.fromEntries(
    Object.entries(slotDraft).map(([slotKey, cardTypes]) => [
      slotKey,
      cardTypes.map((slotEntry, index) => {
        const slotCardType = slotEntry.cardType
        const title = slotEntry.title ?? getSampleCardContent(slotCardType, "").title
        const fallbackTitle = typeof title === "string" && title.trim() ? title : slotCardType
        return {
          id: randomId(`layout-slot-${slotKey}-${index}`) as DroppedCardId,
          cardId: randomId(`layout-slot-source-${slotKey}-${index}`) as CardId,
          cardType: slotCardType,
          taskId: "__layout_slot_draft__" as TaskId,
          areaKind: "instruction",
          position: { x: 0, y: 0 },
          dimensions: getDefaultCardDimensions(slotCardType),
          content: withDefaultSourceProvenance(getSampleCardContent(slotCardType, fallbackTitle)),
          order: index,
        } satisfies DroppedCard
      }),
    ]),
  )

  return { ...existingSlots, ...draftSlots }
}

function normalizeLayoutCardContent(
  cardType: CardType,
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (!isLayoutCardType(cardType)) return content

  const rest = { ...content }
  delete rest.slotDraft
  return {
    ...rest,
    slots: buildLayoutSlots(content),
  }
}

export function getStudioProfile(cardType: CardType): StudioProfile {
  return STUDIO_PROFILES[cardType] ?? DEFAULT_PROFILE
}

export function getStudioDefaults(cardType: CardType): Record<string, unknown> {
  if (isLayoutCardType(cardType)) {
    const label = CARD_TYPE_META[cardType]?.label ?? "Custom"
    return { title: `${label} composition`, slots: {}, slotDraft: {} }
  }

  return { ...getStudioProfile(cardType).defaults }
}

export function buildStudioCardContent(
  cardType: CardType,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const base = {
    ...getStudioDefaults(cardType),
    ...draft,
  }

  if (isLayoutCardType(cardType)) {
    return normalizeLayoutCardContent(cardType, base)
  }

  const sourceAwareBase = withDefaultSourceProvenance(base)

  if (cardType !== "map") {
    return sourceAwareBase
  }

  if (typeof sourceAwareBase.layers === "string" || Array.isArray(sourceAwareBase.layers)) {
    return {
      ...sourceAwareBase,
      layers: normalizeOverlayLayers(sourceAwareBase.layers),
    }
  }

  return sourceAwareBase
}
