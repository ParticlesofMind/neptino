// Server-side utility functions and local types for the teacher Atlas page.
// Extracted from the page component to keep page.tsx focused on rendering logic.
import type { EntityType, AtlasLayer, AtlasContentType } from "@/types/atlas"

export type SearchParams = Record<string, string | string[] | undefined>

export type EncyclopediaItemRow = {
  id: string
  wikidata_id: string | null
  title: string
  knowledge_type: EntityType
  sub_type: string | null
  domain: string | null
  secondary_domains: string[] | null
  era_group: string | null
  era_label: string | null
  depth: string | null
  summary: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

export type WikidataCardData = {
  imageUrl: string | null
  description: string | null
  longDescription: string | null
  profile: {
    birthDate: string | null
    deathDate: string | null
    birthPlace: string | null
    deathPlace: string | null
    occupation: string | null
  }
}

export type TimelineEvent = {
  year: number
  headline: string
  text?: string
}

export type WikidataEntityClaims = {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
}

export type MediaRow = {
  id: string
  item_id: string
  media_type: AtlasContentType
  layer: AtlasLayer | null
  title: string
  description: string | null
  url: string | null
  metadata: Record<string, unknown> | null
}

export type PanelItemRow = {
  id: string
  title: string
  knowledge_type: EntityType
  sub_type: string | null
  domain: string | null
  era_label: string | null
  depth: string | null
  summary: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

export type PanelMediaRow = {
  id: string
  media_type: AtlasContentType
  layer: AtlasLayer | null
  title: string
  description: string | null
  url: string | null
}

export function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }
  return value ?? ""
}

export function normalizeFilter(value: string): string | null {
  const normalized = value.trim()
  if (!normalized || normalized === "all") {
    return null
  }
  return normalized
}

export function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback
  }
  return parsed
}

export function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))].sort(
    (a, b) => a.localeCompare(b),
  )
}

export function buildQueryString(
  searchParams: SearchParams,
  overrides: Record<string, string | null | undefined> = {},
): string {
  const params = new URLSearchParams()
  const keys = ["q", "domain", "domain_narrow", "domain_detail", "type", "subtype", "era", "media", "layer", "order", "display", "page", "item"]

  for (const key of keys) {
    const value = getSingleParam(searchParams[key])
    if (value) {
      params.set(key, value)
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  return params.toString()
}

export function getVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages = new Set<number>([1, totalPages])
  for (let value = start; value <= end; value += 1) {
    pages.add(value)
  }
  return [...pages].sort((a, b) => a - b)
}

export function formatMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

export function capitalize(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function normalizeEntityTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function titlesLikelyMatch(expectedTitle: string, entityTitle: string): boolean {
  const expected = normalizeEntityTitle(expectedTitle)
  const actual = normalizeEntityTitle(entityTitle)
  if (!expected || !actual) {
    return false
  }
  return expected === actual || expected.includes(actual) || actual.includes(expected)
}

export function parseYearValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d{1,4}/)
    if (!match) {
      return null
    }
    const parsed = Number.parseInt(match[0], 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function buildTimelineEvents(metadata: Record<string, unknown>, itemTitle: string): TimelineEvent[] {
  const candidates: Array<{ year: number | null; headline: string; text?: string }> = [
    { year: parseYearValue(metadata.birthYear ?? metadata.birthDate), headline: "Birth", text: `Birth of ${itemTitle}` },
    { year: parseYearValue(metadata.inventionYear), headline: "Invention", text: `${itemTitle} invention milestone` },
    { year: parseYearValue(metadata.foundedYear), headline: "Founded", text: `${itemTitle} founding year` },
    { year: parseYearValue(metadata.publicationYear), headline: "Publication", text: `${itemTitle} publication milestone` },
    { year: parseYearValue(metadata.startYear), headline: "Beginning", text: `${itemTitle} begins` },
    { year: parseYearValue(metadata.endYear), headline: "Conclusion", text: `${itemTitle} concludes` },
    { year: parseYearValue(metadata.deathYear ?? metadata.deathDate), headline: "Death", text: `Death of ${itemTitle}` },
  ]

  return candidates
    .filter((entry): entry is { year: number; headline: string; text?: string } => entry.year !== null)
    .sort((a, b) => a.year - b.year)
    .slice(0, 7)
}

export function buildTimelineEventsWithFallback(
  metadata: Record<string, unknown>,
  itemTitle: string,
  wikidataProfile?: {
    birthDate: string | null
    deathDate: string | null
  },
  eraGroup?: string | null,
  eraLabel?: string | null,
): TimelineEvent[] {
  const events = buildTimelineEvents(metadata, itemTitle)

  const birthYear = parseYearValue(wikidataProfile?.birthDate)
  const deathYear = parseYearValue(wikidataProfile?.deathDate)

  if (birthYear !== null && !events.some((e) => e.year === birthYear && e.headline === "Birth")) {
    events.push({ year: birthYear, headline: "Birth", text: `Birth of ${itemTitle}` })
  }
  if (deathYear !== null && !events.some((e) => e.year === deathYear && e.headline === "Death")) {
    events.push({ year: deathYear, headline: "Death", text: `Death of ${itemTitle}` })
  }

  if (events.length === 0) {
    const eraYearFallback: Record<string, number> = {
      ancient: -500,
      "early-modern": 1600,
      modern: 1900,
      contemporary: 2000,
    }
    const fallbackYear = eraGroup ? eraYearFallback[eraGroup] : null
    if (typeof fallbackYear === "number") {
      events.push({ year: fallbackYear, headline: eraLabel ?? "Era context", text: `${itemTitle} in historical context` })
    }
  }

  return events.sort((a, b) => a.year - b.year).slice(0, 7)
}

export function readClaimString(
  entities: Record<string, WikidataEntityClaims> | undefined,
  wikidataId: string,
  claimId: string,
): string | null {
  const value = entities?.[wikidataId]?.claims?.[claimId]?.[0]?.mainsnak?.datavalue?.value
  if (typeof value === "string") {
    return value
  }
  if (value && typeof value === "object") {
    const typedValue = value as { time?: string }
    if (typeof typedValue.time === "string") {
      return typedValue.time.replace(/^\+/, "").split("T")[0]
    }
  }
  return null
}

export function isLikelyImageMediaType(mediaType: string): boolean {
  const normalized = mediaType.toLowerCase()
  return ["image", "photo", "portrait", "illustration", "painting", "map", "diagram"].some((token) =>
    normalized.includes(token),
  )
}

export function isLikelyImageUrl(url: string): boolean {
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"].some((ext) => url.toLowerCase().includes(ext))
}

export function isLikelyVideoUrl(url: string): boolean {
  return [".mp4", ".webm", ".ogg", "youtube.com", "youtu.be", "vimeo.com"].some((token) => url.toLowerCase().includes(token))
}

export function isLikelyAudioUrl(url: string): boolean {
  return [".mp3", ".wav", ".ogg", ".m4a", ".aac"].some((token) => url.toLowerCase().includes(token))
}

export function readMediaImageUrl(media: MediaRow): string | null {
  const metadataImage = media.metadata && typeof media.metadata === "object"
    ? media.metadata.thumbnail_url ?? media.metadata.image_url ?? media.metadata.cover_image
    : null

  if (typeof metadataImage === "string" && metadataImage.trim()) {
    return metadataImage
  }

  if (media.url && isLikelyImageUrl(media.url)) {
    return media.url
  }

  return null
}

export async function getWikidataCardData(wikidataId: string, expectedTitle: string): Promise<WikidataCardData> {
  const empty: WikidataCardData = {
    imageUrl: null,
    description: null,
    longDescription: null,
    profile: { birthDate: null, deathDate: null, birthPlace: null, deathPlace: null, occupation: null },
  }

  try {
    const response = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`,
      { next: { revalidate: 60 * 60 * 24 } },
    )
    if (!response.ok) return empty

    const payload = (await response.json()) as Record<string, unknown>
    const entities = payload.entities as | Record<string, {
      labels?: Record<string, { value?: string }>
      sitelinks?: Record<string, { title?: string }>
      descriptions?: Record<string, { value?: string }>
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
    }> | undefined

    const entityLabel = entities?.[wikidataId]?.labels?.en?.value ?? null
    if (!entityLabel || !titlesLikelyMatch(expectedTitle, entityLabel)) return empty

    const enwikiTitle = entities?.[wikidataId]?.sitelinks?.enwiki?.title
    const description = entities?.[wikidataId]?.descriptions?.en?.value ?? null
    let longDescription: string | null = null

    if (enwikiTitle) {
      const summaryResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enwikiTitle)}`,
        { next: { revalidate: 60 * 60 * 24 } },
      )
      if (summaryResponse.ok) {
        const summaryPayload = (await summaryResponse.json()) as { extract?: string }
        if (typeof summaryPayload.extract === "string" && summaryPayload.extract.trim()) {
          longDescription = summaryPayload.extract.trim()
        }
      }
    }

    const imageFileName = entities?.[wikidataId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
    const profile = {
      birthDate: readClaimString(entities, wikidataId, "P569"),
      deathDate: readClaimString(entities, wikidataId, "P570"),
      birthPlace: readClaimString(entities, wikidataId, "P19"),
      deathPlace: readClaimString(entities, wikidataId, "P20"),
      occupation: readClaimString(entities, wikidataId, "P106"),
    }

    if (typeof imageFileName !== "string" || !imageFileName.trim()) {
      return { imageUrl: null, description, longDescription, profile }
    }

    const normalized = imageFileName.replace(/\s+/g, "_")
    return {
      imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=1200`,
      description,
      longDescription,
      profile,
    }
  } catch {
    return empty
  }
}
