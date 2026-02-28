import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { TimelineJsCard } from "@/components/encyclopedia/timelinejs-card"
import type { EntityType, AtlasLayer, AtlasContentType, ISCEDDomain } from "@/types/atlas"
import { ENTITY_TYPES, MEDIA_TYPES, PRODUCT_TYPES, ACTIVITY_TYPES, ISCED_DOMAINS, getLayerName } from "@/types/atlas"

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

function isLikelyImageMediaType(mediaType: string): boolean {
  const normalized = mediaType.toLowerCase()
  return ["image", "photo", "portrait", "illustration", "painting", "map", "diagram"].some((token) =>
    normalized.includes(token),
  )
}

function isLikelyImageUrl(url: string): boolean {
  const normalized = url.toLowerCase()
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"].some((ext) =>
    normalized.includes(ext),
  )
}

function isLikelyVideoUrl(url: string): boolean {
  const normalized = url.toLowerCase()
  return [".mp4", ".webm", ".ogg", "youtube.com", "youtu.be", "vimeo.com"].some((token) =>
    normalized.includes(token),
  )
}

function isLikelyAudioUrl(url: string): boolean {
  const normalized = url.toLowerCase()
  return [".mp3", ".wav", ".ogg", ".m4a", ".aac"].some((token) => normalized.includes(token))
}

function readMediaImageUrl(media: MediaRow): string | null {
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

async function getWikidataCardData(wikidataId: string, expectedTitle: string): Promise<WikidataCardData> {
  try {
    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      return {
        imageUrl: null,
        description: null,
        longDescription: null,
        profile: {
          birthDate: null,
          deathDate: null,
          birthPlace: null,
          deathPlace: null,
          occupation: null,
        },
      }
    }

    const payload = (await response.json()) as Record<string, unknown>
    const entities = payload.entities as
      | Record<string, {
        labels?: Record<string, { value?: string }>
        sitelinks?: Record<string, { title?: string }>
        descriptions?: Record<string, { value?: string }>
        claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>
      }>
      | undefined

    const entityLabel = entities?.[wikidataId]?.labels?.en?.value ?? null
    if (!entityLabel || !titlesLikelyMatch(expectedTitle, entityLabel)) {
      return {
        imageUrl: null,
        description: null,
        longDescription: null,
        profile: {
          birthDate: null,
          deathDate: null,
          birthPlace: null,
          deathPlace: null,
          occupation: null,
        },
      }
    }

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
    if (typeof imageFileName !== "string" || !imageFileName.trim()) {
      return {
        imageUrl: null,
        description,
        longDescription,
        profile: {
          birthDate: readClaimString(entities, wikidataId, "P569"),
          deathDate: readClaimString(entities, wikidataId, "P570"),
          birthPlace: readClaimString(entities, wikidataId, "P19"),
          deathPlace: readClaimString(entities, wikidataId, "P20"),
          occupation: readClaimString(entities, wikidataId, "P106"),
        },
      }
    }

    const normalized = imageFileName.replace(/\s+/g, "_")
    return {
      imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=1200`,
      description,
      longDescription,
      profile: {
        birthDate: readClaimString(entities, wikidataId, "P569"),
        deathDate: readClaimString(entities, wikidataId, "P570"),
        birthPlace: readClaimString(entities, wikidataId, "P19"),
        deathPlace: readClaimString(entities, wikidataId, "P20"),
        occupation: readClaimString(entities, wikidataId, "P106"),
      },
    }
  } catch {
    return {
      imageUrl: null,
      description: null,
      longDescription: null,
      profile: {
        birthDate: null,
        deathDate: null,
        birthPlace: null,
        deathPlace: null,
        occupation: null,
      },
    }
  }
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

  // Use ISCED domains instead of dynamic database lookup
  const domainOptions = ISCED_DOMAINS

  const [typeOptionsRes, eraOptionsRes, mediaOptionsRes, layerOptionsRes] = await Promise.all([
    supabase.from("encyclopedia_items").select("knowledge_type"),
    supabase.from("encyclopedia_items").select("era_group").not("era_group", "is", null),
    supabase.from("encyclopedia_media").select("media_type,layer").not("layer", "is", null),
    supabase.from("encyclopedia_media").select("layer").not("layer", "is", null),
  ])

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

        <form className="mt-6 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-5 backdrop-blur-sm" method="get">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="display" value={displayMode} />
          <input type="hidden" name="era" value={selectedEra ?? "all"} />

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <input
              name="q"
              defaultValue={queryText}
              placeholder="Names, events, concepts..."
              className="min-w-[280px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 py-2 text-sm text-[var(--atlas-text)] placeholder:text-[var(--atlas-text-dim)]"
            />

            <select
              name="domain"
              defaultValue={selectedDomain ?? "all"}
              className="min-w-[170px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 py-2 text-sm text-[var(--atlas-text)]"
            >
              <option value="all">All domains</option>
              {domainOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select
              name="type"
              defaultValue={selectedType ?? "all"}
              className="min-w-[170px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 py-2 text-sm text-[var(--atlas-text)]"
            >
              <option value="all">All entity types</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select
              name="layer"
              defaultValue={selectedLayer ?? "all"}
              className="min-w-[150px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 py-2 text-sm text-[var(--atlas-text)]"
            >
            <option value="all">All layers</option>
            {layerOptions.map((option) => {
              const layerNum = Number.parseInt(option, 10)
              const layerLabel = layerNum === 2 ? "Layer 2 — Media" :
                                layerNum === 3 ? "Layer 3 — Products" :
                                layerNum === 4 ? "Layer 4 — Activities" : option
              return (
                <option key={option} value={option}>{layerLabel}</option>
              )
            })}
          </select>

            <select
              name="media"
              defaultValue={selectedMediaType ?? "all"}
              className="min-w-[160px] rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 py-2 text-sm text-[var(--atlas-text)]"
            >
              <option value="all">All content types</option>
              {mediaOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <button
              type="submit"
              className="shrink-0 rounded-md bg-[var(--atlas-gold)] px-6 py-2.5 text-sm font-semibold text-[var(--atlas-ink)] transition-all hover:bg-[var(--atlas-gold-light)]"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-6 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/30 px-4 py-3.5 backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text)]">
            <span>Era Timeline</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--atlas-border)] via-transparent to-transparent" />
            <span className="text-[10px] text-[var(--atlas-text-dim)]">Older → Newer</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Link
              href={`/teacher/atlas?${buildQueryString(params, { era: null, page: "1", item: null })}`}
              className={
                !selectedEra
                  ? "shrink-0 rounded-full border border-[var(--atlas-gold)] bg-[var(--atlas-gold)]/10 px-4 py-2 text-xs font-semibold text-[var(--atlas-gold)] transition-all"
                  : "shrink-0 rounded-full border border-[var(--atlas-border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-gold)]/50 hover:text-[var(--atlas-text)]"
              }
            >
              Any era
            </Link>
            {eraOptions.map((era) => {
              const isActive = selectedEra === era
              return (
                <Link
                  key={era}
                  href={`/teacher/atlas?${buildQueryString(params, { era, page: "1", item: null })}`}
                  className={
                    isActive
                      ? "shrink-0 rounded-full border border-[var(--atlas-gold)] bg-[var(--atlas-gold)]/10 px-4 py-2 text-xs font-semibold text-[var(--atlas-gold)] transition-all"
                      : "shrink-0 rounded-full border border-[var(--atlas-border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--atlas-text-dim)] transition-all hover:border-[var(--atlas-gold)]/50 hover:text-[var(--atlas-text)]"
                  }
                >
                  <span>{eraLabel[era] ?? era}</span>
                  {eraRangeLabel[era] && <span className="ml-1 text-[10px] opacity-75"> · {eraRangeLabel[era]}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--atlas-border)]/50 bg-[var(--atlas-bg-elevated)]/20 px-3 py-2 text-xs text-[var(--atlas-text-dim)] backdrop-blur-sm">
          <span>
            Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {availableCount.toLocaleString()} · Page {activePage} / {totalPages}
          </span>
          <div className="flex items-center gap-1 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] p-1">
            <Link
              href={`/teacher/atlas?${buildQueryString(params, { display: "small", page: String(activePage) })}`}
              className={displayMode === "small"
                ? "rounded-md bg-[var(--atlas-gold)]/20 px-3 py-1 text-xs font-medium text-[var(--atlas-gold)]"
                : "rounded-md px-3 py-1 text-xs text-[var(--atlas-text-dim)] hover:bg-[var(--atlas-bg-elevated)]/50"
              }
            >
              Small
            </Link>
            <Link
              href={`/teacher/atlas?${buildQueryString(params, { display: "large", page: String(activePage) })}`}
              className={displayMode === "large"
                ? "rounded-md bg-[var(--atlas-gold)]/20 px-3 py-1 text-xs font-medium text-[var(--atlas-gold)]"
                : "rounded-md px-3 py-1 text-xs text-[var(--atlas-text-dim)] hover:bg-[var(--atlas-bg-elevated)]/50"
              }
            >
              Large
            </Link>
          </div>
        </div>

        {panelItem && (
          <section className="mt-4 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="atlas-serif text-lg font-light tracking-[0.05em] text-[var(--atlas-text)]">{panelItem.title}</h2>
                <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">
                  {[panelItem.knowledge_type, panelItem.domain, panelItem.era_label, panelItem.depth]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/atlas/${panelItem.id}?${buildQueryString(params, {
                    page: String(activePage),
                    display: displayMode,
                    item: null,
                  })}`}
                  className="rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] hover:bg-[var(--atlas-bg-elevated)]/40 transition-all"
                >
                  Full page
                </Link>
                <Link
                  href={`/teacher/atlas?${buildQueryString(params, { item: null, page: String(activePage), display: displayMode })}`}
                  className="rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] hover:bg-[var(--atlas-bg-elevated)]/40 transition-all"
                >
                  Close
                </Link>
              </div>
            </div>

            <p className="mt-3 text-sm text-[var(--atlas-text-dim)] leading-relaxed">
              {panelItem.summary ?? "No summary available yet."}
            </p>

            {panelItem.tags && panelItem.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {panelItem.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[11px] text-[var(--atlas-text-dim)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {panelMediaByType.length > 0 && (
              <div className="mt-4 space-y-3">
                {panelMediaByType.map((group) => (
                  <div key={group.mediaType} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">
                      {group.mediaType}
                    </h3>
                    <div className="mt-2 space-y-2">
                      {group.resources.map((resource) => (
                        <div key={resource.id} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-2.5">
                          <p className="text-sm font-medium text-[var(--atlas-text)]">{resource.title}</p>
                          {resource.description && (
                            <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">{resource.description}</p>
                          )}
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-block text-xs font-medium text-[var(--atlas-gold)] hover:underline"
                            >
                              Open resource
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panelItem.metadata && Object.keys(panelItem.metadata).length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Object.entries(panelItem.metadata)
                  .filter(([, value]) => value !== null && value !== undefined)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 p-2.5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">{key}</p>
                      <p className="mt-1 text-xs text-[var(--atlas-text)] break-words">{formatMetadataValue(value)}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

      <div className={isLarge ? "mt-4 grid gap-5" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
        {mediaFilterActive
          ? filteredMediaCards.map(({ item, resource }, index) => {
            const mediaTitle = resource.title || `${resource.media_type} resource`
            const mediaDescription = resource.description || "No description available yet."
            const mediaUrl = resource.url

            return (
              <article
                key={resource.id}
                className={isLarge
                  ? "rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-6 backdrop-blur-sm"
                  : "rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm"
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={isLarge ? "text-xl font-semibold text-foreground" : "text-base font-semibold text-foreground"}>{mediaTitle}</h2>
                  <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs text-muted-foreground">{resource.media_type}</span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.title} · {item.knowledge_type}
                </p>

                <p className={isLarge ? "mt-3 text-sm leading-relaxed text-muted-foreground" : "mt-3 text-sm line-clamp-3 text-muted-foreground"}>
                  {mediaDescription}
                </p>

                {mediaUrl && (
                  <div className="mt-3 rounded-xl border border-border/30 bg-background/70 p-3">
                    {resource.media_type.toLowerCase() === "video" && isLikelyVideoUrl(mediaUrl) && (
                      <video controls preload="metadata" className="w-full rounded-lg" src={mediaUrl} />
                    )}
                    {resource.media_type.toLowerCase() === "audio" && isLikelyAudioUrl(mediaUrl) && (
                      <audio controls preload="metadata" className="w-full" src={mediaUrl} />
                    )}
                    {(resource.media_type.toLowerCase() === "maps" || resource.media_type.toLowerCase() === "image") && isLikelyImageUrl(mediaUrl) && (
                      <img src={mediaUrl} alt={mediaTitle} className="w-full rounded-lg object-cover" />
                    )}
                    {resource.media_type.toLowerCase() !== "video"
                      && resource.media_type.toLowerCase() !== "audio"
                      && !((resource.media_type.toLowerCase() === "maps" || resource.media_type.toLowerCase() === "image") && isLikelyImageUrl(mediaUrl))
                      && (
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs font-medium text-primary hover:underline"
                        >
                          Open {resource.media_type}
                        </a>
                      )}
                  </div>
                )}

                <div className="mt-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
                  Media card #{index + 1}
                </div>
              </article>
            )
          })
          : items.map((item, index) => {
          const mediaCount = mediaCountByItem.get(item.id) ?? 0
          const mediaTypes = mediaTypesByItem.get(item.id) ?? []
          const previewMedia = wikimediaPreviewByItem.get(item.id) ?? mediaPreviewByItem.get(item.id)
          const wikidataCard = wikidataCardByItem.get(item.id)
          const hasCompendium = hasCompendiumByItem.get(item.id) ?? false
          const metadata = item.metadata ?? {}
          const getMeta = (...keys: string[]) => {
            for (const key of keys) {
              const value = metadata[key]
              if (value !== null && value !== undefined && value !== "") {
                return formatMetadataValue(value)
              }
            }
            return null
          }
          const domainBadges = [item.domain, ...(item.secondary_domains ?? [])].filter(Boolean) as string[]
          const timelineEvents = buildTimelineEventsWithFallback(
            metadata,
            item.title,
            wikidataCard?.profile,
            item.era_group,
            item.era_label,
          )
          const profileRows = [
            { label: "Full name", value: item.title },
            {
              label: "Place of birth",
              value: wikidataCard?.profile.birthPlace ?? getMeta("birthPlace", "country") ?? "Not provided",
            },
            {
              label: "Place of death",
              value: wikidataCard?.profile.deathPlace ?? getMeta("deathPlace") ?? "Not provided",
            },
            {
              label: "Occupation",
              value: wikidataCard?.profile.occupation ?? getMeta("occupation", "field") ?? item.knowledge_type,
            },
            { label: "Era", value: item.era_label ?? "Not provided" },
            { label: "Depth", value: item.depth ? capitalize(item.depth) : "Not provided" },
          ]
            if (isLarge) {
              return (
                <article key={item.id} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-6 backdrop-blur-sm">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--atlas-accent-entity)] bg-[var(--atlas-accent-entity)]/10 px-2 py-0.5 text-xs text-[var(--atlas-accent-entity)]">{item.knowledge_type}</span>
                        {item.era_label && (
                          <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-xs text-[var(--atlas-text-dim)]">{item.era_label}</span>
                        )}
                        {item.depth && (
                          <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-xs text-[var(--atlas-text-dim)]">{capitalize(item.depth)}</span>
                        )}
                        <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-xs text-[var(--atlas-text-dim)]">Card #{index + 1}</span>
                      </div>

                      <h2 className="atlas-serif mt-3 text-2xl font-light tracking-[0.05em] text-[var(--atlas-text)] leading-tight">{item.title}</h2>

                      <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">
                        {[item.domain, item.era_label, item.depth].filter(Boolean).join(" · ") || "No metadata"}
                      </p>
                      <p className="mt-3 text-sm text-[var(--atlas-text-dim)] leading-relaxed">
                        {wikidataCard?.longDescription ?? wikidataCard?.description ?? item.summary ?? "No summary available yet."}
                      </p>

                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                      {domainBadges.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {domainBadges.map((domain) => (
                            <span key={`${item.id}-${domain}`} className="rounded-full border border-[var(--atlas-gold)] bg-[var(--atlas-gold)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--atlas-gold)]">
                              {domain}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">Timeline</p>
                          <TimelineJsCard itemId={item.id} events={timelineEvents} />
                        </div>

                        <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">Knowledge</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(domainBadges.length > 0 ? domainBadges : [item.knowledge_type]).slice(0, 7).map((entry) => (
                            <span key={`${item.id}-knowledge-${entry}`} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {entry}
                            </span>
                          ))}
                        </div>
                      </div>

                        <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">Related</p>
                          {item.tags && item.tags.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 7).map((tag) => (
                                <Link
                                  key={`${item.id}-related-${tag}`}
                                  href={`/teacher/atlas?${buildQueryString(params, {
                                    q: tag,
                                    page: "1",
                                    item: null,
                                    display: displayMode,
                                  })}`}
                                  className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[11px] text-[var(--atlas-text-dim)] hover:border-[var(--atlas-gold)]/50 hover:text-[var(--atlas-text)] transition-all"
                                >
                                  {tag}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-[var(--atlas-text-dim)] italic">No related items available.</p>
                          )}
                        </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                    {previewMedia && (
                      <div className="w-full max-w-xs justify-self-start overflow-hidden rounded-xl border border-border/30 bg-accent/20 lg:justify-self-end">
                        <img
                          src={previewMedia.url}
                          alt={previewMedia.title || `${item.title} image`}
                          className="aspect-[4/5] w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {!previewMedia && hasCompendium && (
                      <div className="w-full max-w-xs aspect-[4/5] justify-self-start overflow-hidden rounded-xl border border-border/30 bg-accent/20 lg:justify-self-end">
                        <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
                          <img
                            src="/icons-coursebuilder/media/media-image.svg"
                            alt=""
                            aria-hidden="true"
                            className="h-6 w-6 opacity-80"
                          />
                          <span className="text-xs font-medium">Compendium preview</span>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-border/30 bg-accent/20 px-4 py-3 space-y-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profile</div>
                      {profileRows.map((row) => (
                        <div key={`${item.id}-${row.label}`} className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span className="text-xs">{row.label}</span>
                          <span className="text-xs font-semibold text-foreground text-right">{row.value}</span>
                        </div>
                      ))}
                      {item.wikidata_id && (
                        <div className="pt-2 border-t border-border/30">
                          <a
                            className="text-xs text-primary font-semibold hover:underline"
                            href={`https://www.wikidata.org/wiki/${item.wikidata_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Wikidata ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
                  {mediaCount > 0
                    ? `${mediaCount} media item${mediaCount > 1 ? "s" : ""} · ${mediaTypes.join(", ")}`
                    : "No linked media"}
                </div>
              </article>
            )
          }

            return (
              <article key={item.id} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm">
                {previewMedia && (
                  <div className="mb-3 w-full overflow-hidden rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/20">
                    <img
                      src={previewMedia.url}
                      alt={previewMedia.title || `${item.title} image`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {!previewMedia && hasCompendium && (
                  <div className="mb-3 w-full aspect-[4/3] overflow-hidden rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/20">
                    <div className="flex h-full w-full items-center justify-center gap-2 text-[var(--atlas-text-dim)]">
                      <img src="/icons-coursebuilder/media/media-image.svg" alt="" aria-hidden="true" className="h-5 w-5 opacity-80" />
                      <span className="text-xs font-medium">Compendium preview</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="atlas-serif text-base font-light tracking-[0.05em] text-[var(--atlas-text)]">{item.title}</h2>
                  <span className="rounded-full border border-[var(--atlas-accent-entity)] bg-[var(--atlas-accent-entity)]/10 px-2 py-0.5 text-xs text-[var(--atlas-accent-entity)]">
                    {item.knowledge_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">
                  {[item.domain, item.era_label, item.depth].filter(Boolean).join(" · ") || "No metadata"}
                </p>
                <p className="mt-3 text-sm text-[var(--atlas-text-dim)] line-clamp-3">
                  {item.summary ?? "No summary available yet."}
                </p>

              {item.tags && item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>

        {availableCount > PAGE_SIZE && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`/teacher/atlas?${buildQueryString(params, { page: String(Math.max(1, activePage - 1)), display: displayMode })}`}
              className={`rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all ${
                activePage <= 1 ? "pointer-events-none opacity-30" : "hover:border-[var(--atlas-gold)]/50 hover:bg-[var(--atlas-bg-elevated)]/30"
              }`}
            >
              Previous
            </Link>

            {visiblePages.map((pageNumber) => (
              <Link
                key={pageNumber}
                href={`/teacher/atlas?${buildQueryString(params, { page: String(pageNumber), display: displayMode })}`}
                className={
                  pageNumber === activePage
                    ? "rounded-md bg-[var(--atlas-gold)]/20 border border-[var(--atlas-gold)] px-3 py-1.5 text-xs font-medium text-[var(--atlas-gold)]"
                    : "rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all hover:border-[var(--atlas-gold)]/50 hover:bg-[var(--atlas-bg-elevated)]/30"
                }
              >
                {pageNumber}
              </Link>
            ))}

            <Link
              href={`/teacher/atlas?${buildQueryString(params, { page: String(Math.min(totalPages, activePage + 1)), display: displayMode })}`}
              className={`rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all ${
                activePage >= totalPages ? "pointer-events-none opacity-30" : "hover:border-[var(--atlas-gold)]/50 hover:bg-[var(--atlas-bg-elevated)]/30"
              }`}
            >
              Next
            </Link>
          </div>
        )}

        {displayedCardsCount === 0 && (
          <div className="mt-8 rounded-lg border-2 border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/20 p-12 text-center backdrop-blur-sm">
            <div className="mx-auto max-w-md space-y-3">
              <h3 className="atlas-serif text-lg font-light tracking-[0.1em] text-[var(--atlas-text)]">
                No Atlas Entries Found
              </h3>
              <p className="text-sm text-[var(--atlas-text-dim)] leading-relaxed">
                Try adjusting your filters or search terms to discover more educational content across the 4-layer knowledge system.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
