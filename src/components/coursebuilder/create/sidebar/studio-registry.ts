import type { CardType } from "../types"
import { normalizeOverlayLayers } from "./editors/map-editor-config"
import {
  CODE_SNIPPET_PROFILE,
  DATASET_PROFILE,
  DOCUMENT_PROFILE,
  EMBED_PROFILE,
  FLASHCARDS_PROFILE,
  FORM_PROFILE,
  INTERACTIVE_PROFILE,
  SORTER_PROFILE,
  TABLE_PROFILE,
  TIMELINE_PROFILE,
  VOICE_RECORDER_PROFILE,
} from "./make-studio-additional-profiles"
import { ANIMATION_PROFILE, AUDIO_PROFILE, IMAGE_PROFILE, MAP_PROFILE, MODEL_3D_PROFILE, TEXT_PROFILE, VIDEO_PROFILE } from "./make-studio-media-profiles"
import { CHART_PROFILE, CHAT_PROFILE, DEFAULT_PROFILE, DIAGRAM_PROFILE, GAMES_PROFILE } from "./make-studio-product-profiles"
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
  interactive: INTERACTIVE_PROFILE,
  form: FORM_PROFILE,
  "voice-recorder": VOICE_RECORDER_PROFILE,
  sorter: SORTER_PROFILE,
  "rich-sim": INTERACTIVE_PROFILE,
  "village-3d": INTERACTIVE_PROFILE,
  games: GAMES_PROFILE,
  chat: CHAT_PROFILE,
  timeline: TIMELINE_PROFILE,
}

export function getStudioProfile(cardType: CardType): StudioProfile {
  return STUDIO_PROFILES[cardType] ?? DEFAULT_PROFILE
}

export function getStudioDefaults(cardType: CardType): Record<string, unknown> {
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

  if (cardType !== "map") {
    return base
  }

  if (typeof base.layers === "string" || Array.isArray(base.layers)) {
    return {
      ...base,
      layers: normalizeOverlayLayers(base.layers),
    }
  }

  return base
}
