import type { CardType } from "../types"

export interface BlockReadiness {
  title: string
  hasTitle: boolean
  hasContent: boolean
  canAddToCanvas: boolean
}

const LAYOUT_CARD_TYPES = new Set<CardType>([
  "layout-split",
  "layout-stack",
  "layout-feature",
  "layout-sidebar",
  "layout-quad",
  "layout-mosaic",
  "layout-triptych",
  "layout-trirow",
  "layout-banner",
  "layout-broadside",
  "layout-tower",
  "layout-pinboard",
  "layout-annotated",
  "layout-sixgrid",
  "layout-comparison",
  "layout-stepped",
  "layout-hero",
  "layout-dialogue",
  "layout-gallery",
  "layout-spotlight",
  "layout-flipcard",
])

export function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

function hasNamedEntries(value: unknown): boolean {
  if (!Array.isArray(value)) return false

  return value.some((entry) => {
    if (typeof entry === "string") return entry.trim().length > 0
    if (!entry || typeof entry !== "object") return false
    return Object.values(entry).some((field) => typeof field === "string" && field.trim().length > 0)
  })
}

function hasEntriesWithRequiredText(value: unknown, requiredKeys: string[]): boolean {
  if (!Array.isArray(value)) return false

  return value.some((entry) => {
    if (!entry || typeof entry !== "object") return false
    return requiredKeys.some((key) => readTrimmedString((entry as Record<string, unknown>)[key]).length > 0)
  })
}

export function hasActualContent(cardType: CardType, content: Record<string, unknown>): boolean {
  if (LAYOUT_CARD_TYPES.has(cardType)) return true

  switch (cardType) {
    case "text":
      return stripHtml(readTrimmedString(content.text)).length > 0
    case "image":
    case "audio":
    case "video":
    case "animation":
    case "embed":
    case "model-3d":
    case "document":
    case "media":
    case "rich-sim":
    case "village-3d":
      return readTrimmedString(content.url).length > 0
    case "flashcards":
      return hasNamedEntries(content.pairs)
    case "code-snippet":
      return readTrimmedString(content.code).length > 0
    case "map":
      return true
    case "chart":
    case "table":
      return hasNamedEntries(content.rows)
    case "diagram":
      return Array.isArray(content.nodes) && content.nodes.length > 0
    case "dataset":
      return readTrimmedString(content.source).length > 0
    case "interactive":
    case "form":
      return readTrimmedString(content.prompt).length > 0
    case "voice-recorder":
      return readTrimmedString(content.prompt).length > 0 || readTrimmedString(content.transcript).length > 0
    case "sorter":
      return hasNamedEntries(content.pairs) || hasNamedEntries(content.items)
    case "games":
      return hasNamedEntries(content.pairs) || hasNamedEntries(content.items) || readTrimmedString(content.fillText).length > 0
    case "chat":
      return readTrimmedString(content.topic).length > 0 || readTrimmedString(content.openingMessage).length > 0
    case "text-editor":
      return stripHtml(readTrimmedString(content.document)).length > 0
    case "code-editor":
      return readTrimmedString(content.code).length > 0
    case "whiteboard":
      return readTrimmedString(content.boardKey).length > 0 || readTrimmedString(content.prompt).length > 0
    case "timeline":
      return hasNamedEntries(content.events)
    case "legend":
      return hasEntriesWithRequiredText(content.items, ["label"])
    default:
      return Object.entries(content).some(
        ([key, value]) => key !== "title" && typeof value === "string" && value.trim().length > 0,
      )
  }
}

export function getBlockReadiness(cardType: CardType, content: Record<string, unknown>): BlockReadiness {
  const title = readTrimmedString(content.title)
  const hasTitle = title.length > 0
  const hasContent = hasActualContent(cardType, content)

  return {
    title,
    hasTitle,
    hasContent,
    canAddToCanvas: hasTitle && hasContent,
  }
}