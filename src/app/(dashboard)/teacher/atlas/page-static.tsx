import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { TimelineJsCard } from "@/components/encyclopedia/timelinejs-card"
import type { EntityType, AtlasLayer, AtlasContentType } from "@/types/atlas"
import { ENTITY_TYPES, MEDIA_TYPES, PRODUCT_TYPES, ACTIVITY_TYPES, getLayerName } from "@/types/atlas"

const PAGE_SIZE = 24

type SearchParams = Record<string, string | string[] | undefined>

type EncyclopediaItemRow = {
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

type WikidataCardData = {
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

type TimelineEvent = {
  year: number
  headline: string
  text?: string
}

type WikidataEntityClaims = {
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
}

type MediaRow = {
  id: string
  item_id: string
  media_type: AtlasContentType
  layer: AtlasLayer | null
  title: string
  description: string | null
  url: string | null
  metadata: Record<string, unknown> | null
}

type PanelItemRow = {
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

type PanelMediaRow = {
  id: string
  media_type: AtlasContentType
  layer: AtlasLayer | null
  title: string
  description: string | null
  url: string | null
}

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }
  return value ?? ""
}

function normalizeFilter(value: string): string | null {
  const normalized = value.trim()
  if (!normalized || normalized === "all") {
    return null
  }
  return normalized
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback
  }
  return parsed
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))].sort(
    (a, b) => a.localeCompare(b),
  )
}

function buildQueryString(
  searchParams: SearchParams,
  overrides: Record<string, string | null | undefined> = {},
): string {
  const params = new URLSearchParams()
  const keys = ["q", "domain", "type", "era", "media", "layer", "display", "page", "item"]

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

function getVisiblePages(currentPage: number, totalPages: number): number[] {
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

function formatMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function capitalize(value: string): string {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeEntityTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function titlesLikelyMatch(expectedTitle: string, entityTitle: string): boolean {
  const expected = normalizeEntityTitle(expectedTitle)
  const actual = normalizeEntityTitle(entityTitle)
  if (!expected || !actual) {
    return false
  }
  return expected === actual || expected.includes(actual) || actual.includes(expected)
}

function parseYearValue(value: unknown): number | null {
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

function buildTimelineEvents(metadata: Record<string, unknown>, itemTitle: string): TimelineEvent[] {
  const candidates: Array<{ year: number | null; headline: string; text?: string }> = [
    {
      year: parseYearValue(metadata.birthYear ?? metadata.birthDate),
      headline: "Birth",
      text: `Birth of ${itemTitle}`,
    },
    {
      year: parseYearValue(metadata.inventionYear),
      headline: "Invention",
      text: `${itemTitle} invention milestone`,
    },
    {
      year: parseYearValue(metadata.foundedYear),
      headline: "Founded",
      text: `${itemTitle} founding year`,
    },
    {
      year: parseYearValue(metadata.publicationYear),
      headline: "Publication",
      text: `${itemTitle} publication milestone`,
    },
    {
      year: parseYearValue(metadata.startYear),
      headline: "Beginning",
      text: `${itemTitle} begins`,
    },
    {
      year: parseYearValue(metadata.endYear),
      headline: "Conclusion",
      text: `${itemTitle} concludes`,
    },
    {
      year: parseYearValue(metadata.deathYear ?? metadata.deathDate),
      headline: "Death",
      text: `Death of ${itemTitle}`,
    },
  ]

  return candidates
    .filter((entry): entry is { year: number; headline: string; text?: string } => entry.year !== null)
    .sort((a, b) => a.year - b.year)
    .slice(0, 7)
}

function buildTimelineEventsWithFallback(
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

  if (birthYear !== null && !events.some((event) => event.year === birthYear && event.headline === "Birth")) {
    events.push({ year: birthYear, headline: "Birth", text: `Birth of ${itemTitle}` })
  }
  if (deathYear !== null && !events.some((event) => event.year === deathYear && event.headline === "Death")) {
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
      events.push({
        year: fallbackYear,
        headline: eraLabel ?? "Era context",
        text: `${itemTitle} in historical context`,
      })
    }
  }

  return events.sort((a, b) => a.year - b.year).slice(0, 7)
}

function readClaimString(
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

async function getWikidataCardData(wikidataId: string, itemTitle: string): Promise<WikidataCardData> {
  try {
    const detailsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=claims|labels|descriptions&languages=en&format=json`
    const detailsResponse = await fetch(detailsUrl, { next: { revalidate: 86400 } })
    if (!detailsResponse.ok) {
      throw new Error(`Wikidata API returned ${detailsResponse.status}`)
    }
    const detailsData = (await detailsResponse.json()) as {
      entities?: Record<
        string,
        {
          labels?: { en?: { value?: string } }
          descriptions?: { en?: { value?: string } }
          claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
        }
      >
    }

    const entity = detailsData.entities?.[wikidataId]

    if (!entity) {
      return {
        imageUrl: null,
        description: null,
        longDescription: null,
        profile: { birthDate: null, deathDate: null, birthPlace: null, deathPlace: null, occupation: null },
      }
    }

    const label = entity.labels?.en?.value ?? null
    if (label && !titlesLikelyMatch(itemTitle, label)) {
      return {
        imageUrl: null,
        description: null,
        longDescription: null,
        profile: { birthDate: null, deathDate: null, birthPlace: null, deathPlace: null, occupation: null },
      }
    }

    const description = entity.descriptions?.en?.value ?? null
    const entities = detailsData.entities
    const birthDate = readClaimString(entities, wikidataId, "P569")
    const deathDate = readClaimString(entities, wikidataId, "P570")
    const birthPlace = readClaimString(entities, wikidataId, "P19")
    const deathPlace = readClaimString(entities, wikidataId, "P20")
    const occupation = readClaimString(entities, wikidataId, "P106")

    const imageFilenameClaim = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value
    const imageFilename = typeof imageFilenameClaim === "string" ? imageFilenameClaim : null
    let imageUrl: string | null = null
    if (imageFilename) {
      const sanitized = imageFilename.replace(/ /g, "_")
      const hash = await crypto.subtle.digest("MD5", new TextEncoder().encode(sanitized))
      const hashArray = Array.from(new Uint8Array(hash))
      const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("")
      const a = hashHex[0]
      const b = hashHex.slice(0, 2)
      imageUrl = `https://upload.wikimedia.org/wikipedia/commons/${a}/${b}/${encodeURIComponent(sanitized)}`
    }

    return {
      imageUrl,
      description,
      longDescription: description ? `${description} (from Wikidata)` : null,
      profile: { birthDate, deathDate, birthPlace, deathPlace, occupation },
    }
  } catch (error) {
    console.error("Error fetching Wikidata card data:", error)
    return {
      imageUrl: null,
      description: null,
      longDescription: null,
      profile: { birthDate: null, deathDate: null, birthPlace: null, deathPlace: null, occupation: null },
    }
  }
}

function readMediaImageUrl(media: MediaRow): string | null {
  if (media.url && isLikelyImageUrl(media.url)) {
    return media.url
  }
  const metadata = media.metadata ?? {}
  const imageUrl = metadata.imageUrl ?? metadata.thumbnailUrl ?? metadata.previewUrl
  if (typeof imageUrl === "string" && isLikelyImageUrl(imageUrl)) {
    return imageUrl
  }
  return null
}

function isLikelyImageUrl(value: string): boolean {
  const lower = value.toLowerCase()
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(lower) || lower.includes("image")
}

function isLikelyImageMediaType(mediaType: string): boolean {
  const lower = mediaType.toLowerCase()
  return lower.includes("image") || lower.includes("picture") || lower.includes("photo")
}

function isLikelyVideoUrl(value: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(value.toLowerCase())
}

function isLikelyAudioUrl(value: string): boolean {
  return /\.(mp3|wav|ogg|m4a|flac|aac)(\?|$)/i.test(value.toLowerCase())
}

export default async function TeacherAtlasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const queryText = getSingleParam(params.q).trim()
  const displayMode = getSingleParam(params.display) === "large" ? "large" : "small"
  const selectedItemSlug = getSingleParam(params.item)
  const requestedPage = parsePositiveInt(getSingleParam(params.page), 1)
  const selectedDomain = normalizeFilter(getSingleParam(params.domain))
  const selectedType = normalizeFilter(getSingleParam(params.type))
  const selectedEra = normalizeFilter(getSingleParam(params.era))
  const selectedMediaType = normalizeFilter(getSingleParam(params.media))
  const selectedLayer = normalizeFilter(getSingleParam(params.layer))

  const eraOrder = ["ancient", "early-modern", "modern", "contemporary"]
  const eraLabel: Record<string, string> = {
    ancient: "Ancient",
    "early-modern": "Early Modern",
    modern: "Modern",
    contemporary: "Contemporary",
  }
  const eraRangeLabel: Record<string, string> = {
    ancient: "pre-500 CE",
    "early-modern": "1500–1800",
    modern: "1800–1945",
    contemporary: "1945–today",
  }

  const supabase = await createClient()

  const [domainOptionsRes, typeOptionsRes, eraOptionsRes, mediaOptionsRes, layerOptionsRes] = await Promise.all([
    supabase.from("encyclopedia_items").select("domain").not("domain", "is", null),
    supabase.from("encyclopedia_items").select("knowledge_type"),
    supabase.from("encyclopedia_items").select("era_group").not("era_group", "is", null),
    supabase.from("encyclopedia_media").select("media_type,layer").not("layer", "is", null),
    supabase.from("encyclopedia_media").select("layer").not("layer", "is", null),
  ])

  const domainOptions = uniqueSorted((domainOptionsRes.data ?? []).map((row) => row.domain))
  const typeOptions = uniqueSorted((typeOptionsRes.data ?? []).map((row) => row.knowledge_type))
  const rawEraOptions = uniqueSorted((eraOptionsRes.data ?? []).map((row) => row.era_group))
  const eraOptions = [
    ...eraOrder.filter((era) => rawEraOptions.includes(era)),
    ...rawEraOptions.filter((era) => !eraOrder.includes(era)),
  ]
  const mediaOptions = uniqueSorted((mediaOptionsRes.data ?? []).map((row) => row.media_type))
  const layerOptions = uniqueSorted((layerOptionsRes.data ?? []).map((row) => row.layer?.toString()))

  let itemIdsForMediaType: string[] | null = null
  if (selectedMediaType) {
    const mediaFiltered = await supabase
      .from("encyclopedia_media")
      .select("item_id")
      .ilike("media_type", selectedMediaType)

    itemIdsForMediaType = [...new Set((mediaFiltered.data ?? []).map((row) => row.item_id))]
  }

  let itemIdsForLayer: string[] | null = null
  if (selectedLayer) {
    const layerNum = Number.parseInt(selectedLayer, 10)
    if (!Number.isNaN(layerNum)) {
      const layerFiltered = await supabase
        .from("encyclopedia_media")
        .select("item_id")
        .eq("layer", layerNum)

      itemIdsForLayer = [...new Set((layerFiltered.data ?? []).map((row) => row.item_id))]
    }
  }

  const buildItemsQuery = (page: number) => {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from("encyclopedia_items")
      .select("id,wikidata_id,title,knowledge_type,sub_type,domain,secondary_domains,era_group,era_label,depth,summary,tags,metadata", { count: "exact" })
      .order("title", { ascending: true })
      .range(from, to)

    if (queryText.length > 2) {
      query = query.textSearch("search_vector", queryText, { type: "websearch", config: "english" })
    }

    if (selectedDomain) {
      query = query.or(`domain.eq.${selectedDomain},secondary_domains.cs.{"${selectedDomain}"}`)
    }

    if (selectedType) {
      query = query.eq("knowledge_type", selectedType)
    }

    if (selectedEra) {
      query = query.eq("era_group", selectedEra)
    }

    if (itemIdsForMediaType) {
      if (itemIdsForMediaType.length === 0) {
        query = query.in("id", ["__no_items__"])
      } else {
        query = query.in("id", itemIdsForMediaType)
      }
    }

    if (itemIdsForLayer) {
      if (itemIdsForLayer.length === 0) {
        query = query.in("id", ["__no_items__"])
      } else {
        query = query.in("id", itemIdsForLayer)
      }
    }

    return query
  }

  let activePage = requestedPage
  const { count: totalCount, data: initialRows } = await buildItemsQuery(activePage)
  let itemRows = initialRows
  let items = (itemRows ?? []) as EncyclopediaItemRow[]

  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE))
  if (items.length === 0 && (totalCount ?? 0) > 0 && activePage > totalPages) {
    activePage = totalPages
    const retry = await buildItemsQuery(activePage)
    itemRows = retry.data
    items = (itemRows ?? []) as EncyclopediaItemRow[]
  }

  const itemIds = items.map((item) => item.id)
  const mediaCountByItem = new Map<string, number>()
  const mediaTypesByItem = new Map<string, string[]>()
  const mediaByItem = new Map<string, MediaRow[]>()
  const mediaPreviewByItem = new Map<string, { url: string; title: string }>()
  const hasCompendiumByItem = new Map<string, boolean>()

  const wikidataCardByItem = new Map<string, WikidataCardData>()
  const wikimediaPreviewByItem = new Map<string, { url: string; title: string }>()
  await Promise.all(
    items.map(async (item) => {
      if (!item.wikidata_id) {
        return
      }
      const cardData = await getWikidataCardData(item.wikidata_id, item.title)
      wikidataCardByItem.set(item.id, cardData)
      if (cardData.imageUrl) {
        wikimediaPreviewByItem.set(item.id, { url: cardData.imageUrl, title: `${item.title} image` })
      }
    }),
  )

  if (itemIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("encyclopedia_media")
      .select("id,item_id,media_type,layer,title,description,url,metadata")
      .in("item_id", itemIds)

    for (const row of (mediaRows ?? []) as MediaRow[]) {
      const resources = mediaByItem.get(row.item_id) ?? []
      resources.push(row)
      mediaByItem.set(row.item_id, resources)

      mediaCountByItem.set(row.item_id, (mediaCountByItem.get(row.item_id) ?? 0) + 1)
      const types = mediaTypesByItem.get(row.item_id) ?? []
      if (!types.includes(row.media_type)) {
        types.push(row.media_type)
      }
      mediaTypesByItem.set(row.item_id, types)

      if (row.media_type.toLowerCase() === "compendium") {
        hasCompendiumByItem.set(row.item_id, true)
      }

      const imageUrl = readMediaImageUrl(row)
      if (imageUrl && !mediaPreviewByItem.has(row.item_id)) {
        const preferred = isLikelyImageMediaType(row.media_type)
        if (preferred) {
          mediaPreviewByItem.set(row.item_id, { url: imageUrl, title: row.title })
        }
      }
    }

    for (const row of (mediaRows ?? []) as MediaRow[]) {
      const imageUrl = readMediaImageUrl(row)
      if (!mediaPreviewByItem.has(row.item_id) && imageUrl) {
        mediaPreviewByItem.set(row.item_id, { url: imageUrl, title: row.title })
      }
    }
  }

  const availableCount = totalCount ?? 0
  const rangeStart = availableCount > 0 ? (activePage - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = availableCount > 0 ? Math.min(activePage * PAGE_SIZE, availableCount) : 0
  const visiblePages = getVisiblePages(activePage, totalPages)
  const isLarge = displayMode === "large"
  const mediaFilterActive = Boolean(selectedMediaType && selectedMediaType.toLowerCase() !== "compendium")
  const filteredMediaCards = mediaFilterActive
    ? items.flatMap((item) =>
      (mediaByItem.get(item.id) ?? [])
        .filter((resource) => resource.media_type.toLowerCase() === selectedMediaType!.toLowerCase())
        .map((resource) => ({ item, resource })),
    )
    : []
  const displayedCardsCount = mediaFilterActive ? filteredMediaCards.length : items.length

  let panelItem: PanelItemRow | null = null
  let panelMediaByType: Array<{ mediaType: string; resources: PanelMediaRow[] }> = []
  if (selectedItemSlug) {
    const [{ data: panelItemData }, { data: panelMediaRows }] = await Promise.all([
      supabase
        .from("encyclopedia_items")
        .select("id,title,knowledge_type,sub_type,domain,era_label,depth,summary,tags,metadata")
        .eq("id", selectedItemSlug)
        .single(),
      supabase
        .from("encyclopedia_media")
        .select("id,media_type,layer,title,description,url")
        .eq("item_id", selectedItemSlug)
        .order("media_type", { ascending: true })
        .order("title", { ascending: true }),
    ])

    panelItem = (panelItemData ?? null) as PanelItemRow | null
    const mediaRows = (panelMediaRows ?? []) as PanelMediaRow[]
    const grouped = new Map<string, PanelMediaRow[]>()
    for (const resource of mediaRows) {
      const group = grouped.get(resource.media_type) ?? []
      group.push(resource)
      grouped.set(resource.media_type, group)
    }
    panelMediaByType = [...grouped.entries()].map(([mediaType, resources]) => ({ mediaType, resources }))
  }

  return (
    <div className="atlas-page atlas-sans">
      <div className="meridian-line meridian-left" />
      <div className="meridian-line meridian-right" />

      <section className="relative z-10 px-14 space-y-6">
        {/* Classical Header */}
        <header className="pt-10 pb-6 flex justify-between items-start border-b border-[var(--atlas-border)]">
          <div className="flex flex-col gap-0.5">
            <span className="atlas-serif text-[11px] font-light tracking-[0.35em] uppercase text-[var(--atlas-silver-dim)]">
              Neptino
            </span>
            <h1 className="atlas-serif text-[38px] font-light tracking-[0.08em] text-[var(--atlas-gold-light)] leading-none">
              <em>Atlas</em>
            </h1>
            <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[var(--atlas-text-dim)] mt-1">
              4-Layer Educational Knowledge System
            </span>
          </div>

          <div className="flex flex-col gap-1.5 items-end pt-1.5">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[var(--atlas-text-dim)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--atlas-accent-entity)]" />
                Entity Types
              </span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[var(--atlas-text-dim)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--atlas-accent-media)]" />
                Media Types
              </span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[var(--atlas-text-dim)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--atlas-accent-product)]" />
                Products
              </span>
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-[var(--atlas-text-dim)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--atlas-accent-activity)]" />
                Activities
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-14 py-8 flex flex-col gap-8">
          {/* Search Row */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                defaultValue={queryText}
                placeholder="Search knowledge entities, media, products…"
                className="w-full bg-[var(--atlas-surface)] border border-[var(--atlas-border)] rounded-md px-4 py-2.5 pl-10 text-sm text-[var(--atlas-text)] outline-none transition-all focus:border-[var(--atlas-border-hover)] focus:ring-2 focus:ring-[var(--atlas-border)]"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--atlas-silver-dim)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex gap-1.5">
              <button className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] border border-[var(--atlas-border-hover)] bg-[rgba(147,174,210,0.06)] text-[var(--atlas-text)] transition-all hover:bg-[rgba(147,174,210,0.1)]">
                All
              </button>
              <button className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] border border-[var(--atlas-border)] bg-transparent text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-border-hover)] hover:text-[var(--atlas-text)]">
                Entities
              </button>
              <button className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] border border-[var(--atlas-border)] bg-transparent text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-border-hover)] hover:text-[var(--atlas-text)]">
                Media
              </button>
              <button className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] border border-[var(--atlas-border)] bg-transparent text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-border-hover)] hover:text-[var(--atlas-text)]">
                Products
              </button>
              <button className="px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] border border-[var(--atlas-border)] bg-transparent text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-border-hover)] hover:text-[var(--atlas-text)]">
                Activities
              </button>
            </div>
          </div>

          {/* 4-Layer Grid */}
          <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr] gap-4">
            {/* Layer 1 - Entity Types */}
            <div className="border border-[var(--atlas-border)] rounded-xl bg-[rgba(26,37,53,0.6)] backdrop-blur-sm overflow-hidden transition-all hover:border-[rgba(107,159,232,0.25)] hover:shadow-[0_0_30px_rgba(107,159,232,0.05)]">
              <div className="px-5 py-4 border-b border-[var(--atlas-border)] flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[9px] font-normal tracking-[0.3em] uppercase text-[var(--atlas-text-dim)] mb-1">
                    Layer 01
                  </div>
                  <div className="atlas-serif text-[22px] font-normal tracking-[0.02em] text-[var(--atlas-accent-entity)] leading-none">
                    Entity Types
                  </div>
                  <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1.5">
                    What knowledge is <em>about</em> — the fundamental ontological categories
                  </div>
                </div>
                <div className="atlas-serif text-[28px] font-light text-[var(--atlas-text-dim)] leading-none flex-shrink-0">
                  {entityTypeMap.size}
                </div>
              </div>

              <div className="px-5 py-4 space-y-1">
                {["Concept", "Process", "Instance", "Person", "State", "Time", "Environment", "Work", "Technology", "Institution", "Movement"].map(
                  (entityType) => {
                    const count = entityTypeMap.get(entityType) || 0
                    return (
                      <div
                        key={entityType}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-transparent transition-all hover:border-[rgba(107,159,232,0.15)] hover:bg-[rgba(107,159,232,0.06)] cursor-pointer"
                      >
                        <span className="w-1 h-1 rounded-full bg-[var(--atlas-accent-entity)] opacity-70 flex-shrink-0" />
                        <span className="text-[12px] text-[var(--atlas-text)] flex-1">{entityType}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-[var(--atlas-text-dim)]">{count}</span>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
            </div>

            {/* Layer 2 - Media Types */}
            <div className="border border-[var(--atlas-border)] rounded-xl bg-[rgba(26,37,53,0.6)] backdrop-blur-sm overflow-hidden transition-all hover:border-[rgba(126,200,160,0.25)] hover:shadow-[0_0_30px_rgba(126,200,160,0.05)]">
              <div className="px-5 py-4 border-b border-[var(--atlas-border)] flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[9px] font-normal tracking-[0.3em] uppercase text-[var(--atlas-text-dim)] mb-1">
                    Layer 02
                  </div>
                  <div className="atlas-serif text-[22px] font-normal tracking-[0.02em] text-[var(--atlas-accent-media)] leading-none">
                    Media Types
                  </div>
                  <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1.5">
                    The raw material knowledge is made from
                  </div>
                </div>
                <div className="atlas-serif text-[28px] font-light text-[var(--atlas-text-dim)] leading-none flex-shrink-0">
                  {mediaTypeMap.size}
                </div>
              </div>

              <div className="px-5 py-4 space-y-1">
                {[
                  { name: "Text", sub: "Article · Excerpt · Annotation" },
                  { name: "Image", sub: "Photo · Illustration · Chart" },
                  { name: "Audio", sub: "Recording · Podcast · Lecture" },
                  { name: "Video", sub: "Clip · Lecture · Documentary" },
                  { name: "Dataset", sub: "Table · Spreadsheet · Feed" },
                  { name: "3D Model", sub: "Object · Scene · Mesh" },
                ].map((mediaType) => {
                  const count = mediaTypeMap.get(mediaType.name) || 0
                  return (
                    <div
                      key={mediaType.name}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-transparent transition-all hover:border-[var(--atlas-border-hover)] hover:bg-[rgba(147,174,210,0.04)] cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded bg-[rgba(126,200,160,0.12)] flex items-center justify-center flex-shrink-0">
                        <div className="text-[var(--atlas-accent-media)] text-xs">■</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] text-[var(--atlas-text)]">{mediaType.name}</div>
                        {count > 0 && (
                          <div className="text-[10px] text-[var(--atlas-text-dim)]">{mediaType.sub}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Layer 3 - Products */}
            <div className="border border-[var(--atlas-border)] rounded-xl bg-[rgba(26,37,53,0.6)] backdrop-blur-sm overflow-hidden transition-all hover:border-[rgba(232,160,107,0.25)] hover:shadow-[0_0_30px_rgba(232,160,107,0.05)]">
              <div className="px-5 py-4 border-b border-[var(--atlas-border)] flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[9px] font-normal tracking-[0.3em] uppercase text-[var(--atlas-text-dim)] mb-1">
                    Layer 03
                  </div>
                  <div className="atlas-serif text-[22px] font-normal tracking-[0.02em] text-[var(--atlas-accent-product)] leading-none">
                    Products
                  </div>
                  <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1.5">
                    Assembled from media, delivered passively
                  </div>
                </div>
                <div className="atlas-serif text-[28px] font-light text-[var(--atlas-text-dim)] leading-none flex-shrink-0">
                  8
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--atlas-accent-derived)] font-medium mb-2">
                  Derived
                </div>
                <div className="space-y-1 mb-3">
                  {["Map", "Timeline"].map((product) => (
                    <div
                      key={product}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-transparent transition-all hover:border-[var(--atlas-border-hover)] hover:bg-[rgba(147,174,210,0.04)] cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded bg-[rgba(232,201,122,0.12)] flex items-center justify-center flex-shrink-0">
                        <div className="text-[var(--atlas-accent-derived)] text-xs">■</div>
                      </div>
                      <span className="text-[12px] text-[var(--atlas-text)] flex-1">{product}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--atlas-text-dim)] font-normal mb-2">
                  Assembled
                </div>
                <div className="space-y-1">
                  {["Simulation", "Documentary", "Diagram", "Narrative", "Profile", "Game"].map((product) => (
                    <div
                      key={product}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-transparent transition-all hover:border-[var(--atlas-border-hover)] hover:bg-[rgba(147,174,210,0.04)] cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded bg-[rgba(232,160,107,0.12)] flex items-center justify-center flex-shrink-0">
                        <div className="text-[var(--atlas-accent-product)] text-xs">■</div>
                      </div>
                      <span className="text-[12px] text-[var(--atlas-text)] flex-1">{product}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Layer 4 - Activities */}
            <div className="border border-[var(--atlas-border)] rounded-xl bg-[rgba(26,37,53,0.6)] backdrop-blur-sm overflow-hidden transition-all hover:border-[rgba(196,107,232,0.25)] hover:shadow-[0_0_30px_rgba(196,107,232,0.05)]">
              <div className="px-5 py-4 border-b border-[var(--atlas-border)] flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[9px] font-normal tracking-[0.3em] uppercase text-[var(--atlas-text-dim)] mb-1">
                    Layer 04
                  </div>
                  <div className="atlas-serif text-[22px] font-normal tracking-[0.02em] text-[var(--atlas-accent-activity)] leading-none">
                    Activities
                  </div>
                  <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1.5">
                    Performative — demands student response
                  </div>
                </div>
                <div className="atlas-serif text-[28px] font-light text-[var(--atlas-text-dim)] leading-none flex-shrink-0">
                  5
                </div>
              </div>

              <div className="px-5 py-4 space-y-1">
                {[
                  { name: "Exercise", sub: "Practice · Drill · Problem" },
                  { name: "Quiz", sub: "Formative · Auto-graded" },
                  { name: "Assessment", sub: "Summative · Rubric-based" },
                  { name: "Interactive Simulation", sub: "Hypothesis · Exploration" },
                  { name: "Game", sub: "Challenge · Achievement" },
                ].map((activity) => (
                  <div
                    key={activity.name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-transparent transition-all hover:border-[var(--atlas-border-hover)] hover:bg-[rgba(147,174,210,0.04)] cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded bg-[rgba(196,107,232,0.12)] flex items-center justify-center flex-shrink-0">
                      <div className="text-[var(--atlas-accent-activity)] text-xs">■</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] text-[var(--atlas-text)]">{activity.name}</div>
                      <div className="text-[10px] text-[var(--atlas-text-dim)]">{activity.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Statistics Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-[var(--atlas-border)] rounded-lg bg-[rgba(26,37,53,0.4)] px-5 py-4 transition-all hover:border-[var(--atlas-border-hover)]">
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--atlas-text-dim)]">Architecture</div>
              <div className="atlas-serif text-[32px] font-light text-[var(--atlas-gold)] leading-none mt-1">4</div>
              <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1">
                Interconnected layers — Entity, Media, Product, Activity
              </div>
            </div>

            <div className="border border-[var(--atlas-border)] rounded-lg bg-[rgba(26,37,53,0.4)] px-5 py-4 transition-all hover:border-[var(--atlas-border-hover)]">
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--atlas-text-dim)]">Total Entries</div>
              <div className="atlas-serif text-[32px] font-light text-[var(--atlas-silver)] leading-none mt-1">
                {(entityCount || 0) + (mediaCount || 0) + (productCount || 0) + (activityCount || 0)}
              </div>
              <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1">
                Educational content across all layers and disciplines
              </div>
            </div>

            <div className="border border-[var(--atlas-border)] rounded-lg bg-[rgba(26,37,53,0.4)] px-5 py-4 transition-all hover:border-[var(--atlas-border-hover)]">
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--atlas-text-dim)]">Taxonomy Principle</div>
              <div className="text-[19px] font-normal tracking-tight text-[var(--atlas-text-dim)] leading-none mt-3">
                Invisible
              </div>
              <div className="text-[11px] text-[var(--atlas-text-dim)] font-light leading-relaxed mt-1">
                Teachers never see the taxonomy directly — it surfaces contextually
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
