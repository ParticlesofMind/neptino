import type { CardType, DroppedCard, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { computePageZones, type PageZones } from "../layout/pageZones"
import type { CardDimensions } from "./cardSizing"

export type CardLayoutRole =
  | "primary"
  | "support"
  | "annotation"
  | "legend"
  | "timeline"
  | "caption"
  | "response"
  | "metadata"

export type CardDensity = "compact" | "standard" | "dominant"
export type CardAllowedZone = "text" | "body" | "margin" | "overlay" | "sheet"

export interface CardLayoutPolicy {
  role: CardLayoutRole
  density: CardDensity
  minWidth: number
  preferredWidth: number
  maxWidth: number
  minHeight: number
  preferredHeight?: number
  maxHeight?: number
  aspectRatio?: number
  allowedZones: CardAllowedZone[]
  criticalContentMustStayPrintSafe: boolean
  canOverlay: boolean
  canPaginate: boolean
  canExpandImmersive: boolean
}

export interface ResolvedCardLayoutDimensions {
  width: number
  height: number
  policy: CardLayoutPolicy
}

export const DEFAULT_CARD_PREFERRED_DIMENSIONS: Record<CardType, CardDimensions> = {
  text: { width: 320, height: 320 },
  image: { width: 420, height: 300 },
  audio: { width: 420, height: 180 },
  video: { width: 480, height: 270 },
  animation: { width: 480, height: 270 },
  dataset: { width: 520, height: 260 },
  embed: { width: 520, height: 320 },
  flashcards: { width: 520, height: 340 },
  "code-snippet": { width: 560, height: 300 },
  "model-3d": { width: 520, height: 280 },
  map: { width: 642, height: 380 },
  chart: { width: 520, height: 320 },
  diagram: { width: 480, height: 320 },
  media: { width: 460, height: 240 },
  document: { width: 420, height: 560 },
  table: { width: 642, height: 360 },
  "source-excerpt": { width: 340, height: 300 },
  citation: { width: 220, height: 180 },
  bibliography: { width: 320, height: 320 },
  "gis-layer": { width: 420, height: 260 },
  "rich-sim": { width: 520, height: 320 },
  "village-3d": { width: 560, height: 360 },
  interactive: { width: 480, height: 280 },
  form: { width: 500, height: 320 },
  "voice-recorder": { width: 420, height: 220 },
  sorter: { width: 520, height: 320 },
  games: { width: 560, height: 360 },
  chat: { width: 642, height: 640 },
  "text-editor": { width: 520, height: 360 },
  "code-editor": { width: 560, height: 380 },
  whiteboard: { width: 640, height: 420 },
  slides: { width: 642, height: 430 },
  timeline: { width: 642, height: 180 },
  legend: { width: 220, height: 320 },
  "layout-split": { width: 642, height: 680 },
  "layout-stack": { width: 642, height: 680 },
  "layout-feature": { width: 642, height: 680 },
  "layout-sidebar": { width: 642, height: 680 },
  "layout-quad": { width: 642, height: 680 },
  "layout-mosaic": { width: 642, height: 760 },
  "layout-triptych": { width: 642, height: 680 },
  "layout-trirow": { width: 642, height: 680 },
  "layout-banner": { width: 642, height: 680 },
  "layout-broadside": { width: 642, height: 680 },
  "layout-tower": { width: 642, height: 680 },
  "layout-pinboard": { width: 642, height: 680 },
  "layout-annotated": { width: 642, height: 760 },
  "layout-sixgrid": { width: 642, height: 760 },
  "layout-comparison": { width: 642, height: 680 },
  "layout-stepped": { width: 642, height: 680 },
  "layout-hero": { width: 642, height: 680 },
  "layout-dialogue": { width: 642, height: 680 },
  "layout-gallery": { width: 642, height: 760 },
  "layout-spotlight": { width: 642, height: 760 },
  "layout-flipcard": { width: 642, height: 680 },
  "layout-resizable-grid": { width: 642, height: 680 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundedPercent(width: number, percent: number): number {
  return Math.round(width * percent)
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function bodyPolicyBase(zones: PageZones, preferred: CardDimensions): CardLayoutPolicy {
  const maxWidth = zones.bodyBox.width
  const minWidth = Math.min(220, maxWidth)
  return {
    role: "support",
    density: "standard",
    minWidth,
    preferredWidth: clamp(preferred.width, minWidth, maxWidth),
    maxWidth,
    minHeight: Math.min(44, preferred.height),
    preferredHeight: preferred.height,
    allowedZones: ["body"],
    criticalContentMustStayPrintSafe: true,
    canOverlay: false,
    canPaginate: true,
    canExpandImmersive: false,
  }
}

export function getPreferredCardDimensions(cardType: CardType): CardDimensions {
  return { ...(DEFAULT_CARD_PREFERRED_DIMENSIONS[cardType] ?? { width: 420, height: 220 }) }
}

export function getCardLayoutPolicy(
  cardType: CardType,
  content: Record<string, unknown> = {},
  pageZones: PageZones = computePageZones(DEFAULT_PAGE_DIMENSIONS),
): CardLayoutPolicy {
  const preferred = getPreferredCardDimensions(cardType)
  const bodyWidth = pageZones.bodyBox.width
  const textMaxWidth = Math.min(pageZones.textBox.width, roundedPercent(bodyWidth, 0.5))
  const printSafeWidth = pageZones.printSafeBox.width
  const sheetWidth = pageZones.sheetBox.width
  const policy = bodyPolicyBase(pageZones, preferred)

  if (cardType.startsWith("layout-")) {
    return {
      ...policy,
      role: "primary",
      density: "dominant",
      minWidth: bodyWidth,
      preferredWidth: bodyWidth,
      maxWidth: bodyWidth,
      minHeight: 320,
      preferredHeight: preferred.height,
      allowedZones: content.pagePlacement === "sheet" ? ["body", "sheet"] : ["body"],
      canPaginate: true,
      canExpandImmersive: true,
    }
  }

  switch (cardType) {
    case "map":
      return {
        ...policy,
        role: "primary",
        density: "dominant",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.6), bodyWidth),
        preferredWidth: bodyWidth,
        maxWidth: content.sheetExtent === true ? sheetWidth : printSafeWidth,
        minHeight: 260,
        preferredHeight: preferred.height,
        allowedZones: ["body", "overlay", "sheet"],
        canOverlay: true,
        canExpandImmersive: true,
      }
    case "timeline":
      return {
        ...policy,
        role: "timeline",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.5), bodyWidth),
        preferredWidth: bodyWidth,
        maxWidth: printSafeWidth,
        minHeight: 120,
        preferredHeight: preferred.height,
        allowedZones: ["body", "margin", "sheet"],
        canOverlay: true,
        canExpandImmersive: true,
      }
    case "table":
    case "dataset":
    case "chart":
      return {
        ...policy,
        role: cardType === "chart" ? "support" : "primary",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.6), bodyWidth),
        preferredWidth: bodyWidth,
        maxWidth: bodyWidth,
        minHeight: 160,
        preferredHeight: preferred.height,
        canPaginate: true,
      }
    case "text":
      return {
        ...policy,
        role: "support",
        minWidth: Math.min(220, textMaxWidth),
        preferredWidth: clamp(320, Math.min(220, textMaxWidth), textMaxWidth),
        maxWidth: textMaxWidth,
        minHeight: 64,
        preferredHeight: preferred.height,
        allowedZones: ["text", "body"],
      }
    case "legend":
      return {
        ...policy,
        role: "legend",
        density: "compact",
        minWidth: Math.min(140, bodyWidth),
        preferredWidth: Math.min(220, roundedPercent(bodyWidth, 0.35)),
        maxWidth: Math.min(roundedPercent(bodyWidth, 0.35), 240),
        minHeight: 100,
        preferredHeight: preferred.height,
        allowedZones: ["margin", "overlay", "body"],
        canOverlay: true,
      }
    case "citation":
    case "bibliography":
      return {
        ...policy,
        role: "metadata",
        density: "compact",
        minWidth: Math.min(160, bodyWidth),
        preferredWidth: Math.min(preferred.width, 240),
        maxWidth: Math.min(roundedPercent(bodyWidth, 0.45), 320),
        minHeight: 72,
        preferredHeight: preferred.height,
        allowedZones: ["margin", "body"],
      }
    case "source-excerpt":
    case "document":
      return {
        ...policy,
        role: "support",
        minWidth: Math.min(220, bodyWidth),
        preferredWidth: Math.min(preferred.width, roundedPercent(bodyWidth, 0.7)),
        maxWidth: Math.min(bodyWidth, roundedPercent(bodyWidth, 0.75)),
        minHeight: 160,
        preferredHeight: preferred.height,
        canPaginate: true,
      }
    case "image":
    case "video":
    case "animation":
    case "model-3d":
    case "media":
    case "diagram":
    case "gis-layer":
      return {
        ...policy,
        role: "support",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.3), bodyWidth),
        preferredWidth: Math.min(preferred.width, roundedPercent(bodyWidth, 0.7)),
        maxWidth: content.sheetExtent === true ? sheetWidth : bodyWidth,
        minHeight: 160,
        preferredHeight: preferred.height,
        aspectRatio: preferred.width / preferred.height,
        allowedZones: ["body", "sheet"],
        canExpandImmersive: true,
      }
    case "whiteboard":
    case "text-editor":
    case "code-editor":
    case "chat":
    case "interactive":
    case "form":
    case "voice-recorder":
    case "sorter":
    case "games":
    case "rich-sim":
    case "village-3d":
      return {
        ...policy,
        role: "response",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.6), bodyWidth),
        preferredWidth: Math.min(preferred.width, bodyWidth),
        maxWidth: bodyWidth,
        minHeight: cardType === "chat" ? 320 : 180,
        preferredHeight: preferred.height,
        allowedZones: ["body"],
        canExpandImmersive: true,
      }
    case "slides":
      return {
        ...policy,
        role: "primary",
        density: "dominant",
        minWidth: Math.min(roundedPercent(bodyWidth, 0.6), bodyWidth),
        preferredWidth: bodyWidth,
        maxWidth: bodyWidth,
        minHeight: 260,
        preferredHeight: preferred.height,
        aspectRatio: 16 / 9,
        canExpandImmersive: true,
      }
    default:
      return policy
  }
}

export function resolveCardLayoutDimensions(
  card: DroppedCard,
  pageDimensionsOrZones: PageDimensions | PageZones = DEFAULT_PAGE_DIMENSIONS,
): ResolvedCardLayoutDimensions {
  const pageZones = "sheetBox" in pageDimensionsOrZones
    ? pageDimensionsOrZones
    : computePageZones(pageDimensionsOrZones)
  const policy = getCardLayoutPolicy(card.cardType, card.content, pageZones)
  const declaredWidth = finitePositive(card.dimensions?.width)
    ? card.dimensions.width
    : policy.preferredWidth
  const declaredHeight = finitePositive(card.dimensions?.height)
    ? card.dimensions.height
    : (policy.preferredHeight ?? policy.minHeight)
  const maxHeight = policy.maxHeight ?? Math.max(declaredHeight, policy.minHeight)

  return {
    width: Math.round(clamp(declaredWidth, policy.minWidth, policy.maxWidth)),
    height: Math.round(clamp(declaredHeight, policy.minHeight, maxHeight)),
    policy,
  }
}
