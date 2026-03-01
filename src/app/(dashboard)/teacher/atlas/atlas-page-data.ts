import { createClient } from "@/lib/supabase/server"
import { ISCED_DOMAINS } from "@/types/atlas"
import {
  getSingleParam, normalizeFilter, parsePositiveInt, uniqueSorted,
  buildQueryString, getVisiblePages, formatMetadataValue, capitalize,
  buildTimelineEventsWithFallback,
  isLikelyImageMediaType, readMediaImageUrl, getWikidataCardData,
} from "./atlas-page-utils"
import type {
  SearchParams, EncyclopediaItemRow, WikidataCardData, TimelineEvent,
  MediaRow, PanelItemRow, PanelMediaRow,
} from "./atlas-page-utils"

const PAGE_SIZE = 24

export type AtlasPageData = {
  // Params
  params: SearchParams
  queryText: string; displayMode: string; selectedItemSlug: string | null
  activePage: number; totalPages: number; totalCount: number
  selectedDomain: string | null; selectedDomainNarrow: string | null; selectedDomainDetail: string | null
  selectedType: string | null; selectedSubtype: string | null; selectedLayer: string | null
  selectedMediaType: string | null; selectedEra: string | null; selectedOrder: string | null
  // Options
  domainOptions: string[]; eraOptions: string[]
  // Items
  items: EncyclopediaItemRow[]; rangeStart: number; rangeEnd: number
  visiblePages: number[]; isLarge: boolean
  // Media lookups
  mediaCountByItem: Map<string, number>; mediaTypesByItem: Map<string, string[]>
  mediaPreviewByItem: Map<string, { url: string; title: string }>
  hasCompendiumByItem: Map<string, boolean>
  wikidataCardByItem: Map<string, WikidataCardData>
  wikimediaPreviewByItem: Map<string, { url: string; title: string }>
  // Media filter helpers
  mediaFilterActive: boolean; filteredMediaCards: Array<{ item: EncyclopediaItemRow; resource: MediaRow }>
  displayedCardsCount: number; mediaByItem: Map<string, MediaRow[]>
  // Panel
  panelItem: PanelItemRow | null; panelMediaByType: Array<{ mediaType: string; resources: PanelMediaRow[] }>
  // Helpers
  formatMetadataValue: (v: unknown) => string; capitalize: (s: string) => string
  buildQueryString: typeof buildQueryString; buildTimelineEventsWithFallback: typeof buildTimelineEventsWithFallback
  PAGE_SIZE: number
}

export async function fetchAtlasPageData(rawParams: SearchParams): Promise<AtlasPageData> {
  const queryText             = getSingleParam(rawParams.q).trim()
  const displayMode           = getSingleParam(rawParams.display) === "large" ? "large" : "small"
  const selectedItemSlug      = getSingleParam(rawParams.item)
  const requestedPage         = parsePositiveInt(getSingleParam(rawParams.page), 1)
  const selectedDomain        = normalizeFilter(getSingleParam(rawParams.domain))
  const selectedDomainNarrow  = normalizeFilter(getSingleParam(rawParams.domain_narrow))
  const selectedDomainDetail  = normalizeFilter(getSingleParam(rawParams.domain_detail))
  const selectedType          = normalizeFilter(getSingleParam(rawParams.type))
  const selectedEra           = normalizeFilter(getSingleParam(rawParams.era))
  const selectedMediaType     = normalizeFilter(getSingleParam(rawParams.media))
  const selectedLayer         = normalizeFilter(getSingleParam(rawParams.layer))
  const selectedSubtype       = normalizeFilter(getSingleParam(rawParams.subtype))
  const selectedOrder         = normalizeFilter(getSingleParam(rawParams.order))
  const isLarge               = displayMode === "large"

  const supabase      = await createClient()
  const domainOptions = ISCED_DOMAINS

  const eraOrder = ["ancient", "early-modern", "modern", "contemporary"]
  const [eraOptionsRes] = await Promise.all([
    supabase.from("encyclopedia_items").select("era_group").not("era_group", "is", null),
  ])
  const rawEraOptions = uniqueSorted((eraOptionsRes.data ?? []).map(r => r.era_group))
  const eraOptions = [
    ...eraOrder.filter(era => rawEraOptions.includes(era)),
    ...rawEraOptions.filter(era => !eraOrder.includes(era)),
  ]

  let itemIdsForMediaType: string[] | null = null
  if (selectedMediaType) {
    const mediaFiltered = await supabase.from("encyclopedia_media").select("item_id").ilike("media_type", selectedMediaType)
    itemIdsForMediaType = [...new Set((mediaFiltered.data ?? []).map(row => row.item_id))]
  }

  let itemIdsForLayer: string[] | null = null
  if (selectedLayer) {
    const layerNum = Number.parseInt(selectedLayer, 10)
    if (!Number.isNaN(layerNum)) {
      const layerFiltered = await supabase.from("encyclopedia_media").select("item_id").eq("layer", layerNum)
      itemIdsForLayer = [...new Set((layerFiltered.data ?? []).map(row => row.item_id))]
    }
  }

  const buildItemsQuery = (page: number) => {
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    let query = supabase
      .from("encyclopedia_items")
      .select("id,wikidata_id,title,knowledge_type,sub_type,domain,secondary_domains,era_group,era_label,depth,summary,tags,metadata", { count: "exact" })
      .order("title", { ascending: selectedOrder !== "desc" })
      .range(from, to)
    if (queryText.length > 2) query = query.textSearch("search_vector", queryText, { type: "websearch", config: "english" })
    if (selectedDomain)  query = query.or(`domain.eq.${selectedDomain},secondary_domains.cs.{"${selectedDomain}"}`)
    if (selectedType)    query = query.eq("knowledge_type", selectedType)
    if (selectedEra)     query = query.eq("era_group", selectedEra)
    if (itemIdsForMediaType) query = query.in("id", itemIdsForMediaType.length ? itemIdsForMediaType : ["__no_items__"])
    if (itemIdsForLayer)     query = query.in("id", itemIdsForLayer.length ? itemIdsForLayer : ["__no_items__"])
    return query
  }

  let activePage = requestedPage
  let { count: totalCount, data: initialRows } = await buildItemsQuery(activePage)
  let items = (initialRows ?? []) as EncyclopediaItemRow[]
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE))
  if (items.length === 0 && (totalCount ?? 0) > 0 && activePage > totalPages) {
    activePage = totalPages
    const retry = await buildItemsQuery(activePage)
    items = (retry.data ?? []) as EncyclopediaItemRow[]
  }

  const availableCount = totalCount ?? 0
  const rangeStart = availableCount > 0 ? (activePage - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd   = availableCount > 0 ? Math.min(activePage * PAGE_SIZE, availableCount) : 0
  const visiblePages = getVisiblePages(activePage, totalPages)

  const itemIds = items.map(i => i.id)
  const mediaCountByItem    = new Map<string, number>()
  const mediaTypesByItem    = new Map<string, string[]>()
  const mediaByItem         = new Map<string, MediaRow[]>()
  const mediaPreviewByItem  = new Map<string, { url: string; title: string }>()
  const hasCompendiumByItem = new Map<string, boolean>()
  const wikidataCardByItem         = new Map<string, WikidataCardData>()
  const wikimediaPreviewByItem = new Map<string, { url: string; title: string }>()

  await Promise.all(items.map(async item => {
    if (!item.wikidata_id) return
    const cardData = await getWikidataCardData(item.wikidata_id, item.title)
    wikidataCardByItem.set(item.id, cardData)
    if (cardData.imageUrl) wikimediaPreviewByItem.set(item.id, { url: cardData.imageUrl, title: `${item.title} image` })
  }))

  if (itemIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from("encyclopedia_media")
      .select("id,item_id,media_type,layer,title,description,url,metadata")
      .in("item_id", itemIds)

    for (const row of (mediaRows ?? []) as MediaRow[]) {
      mediaByItem.set(row.item_id, [...(mediaByItem.get(row.item_id) ?? []), row])
      mediaCountByItem.set(row.item_id, (mediaCountByItem.get(row.item_id) ?? 0) + 1)
      const types = mediaTypesByItem.get(row.item_id) ?? []
      if (!types.includes(row.media_type)) types.push(row.media_type)
      mediaTypesByItem.set(row.item_id, types)
      if (row.media_type.toLowerCase() === "compendium") hasCompendiumByItem.set(row.item_id, true)
      const imageUrl = readMediaImageUrl(row)
      if (imageUrl && !mediaPreviewByItem.has(row.item_id) && isLikelyImageMediaType(row.media_type)) {
        mediaPreviewByItem.set(row.item_id, { url: imageUrl, title: row.title })
      }
    }
    for (const row of (mediaRows ?? []) as MediaRow[]) {
      const imageUrl = readMediaImageUrl(row)
      if (!mediaPreviewByItem.has(row.item_id) && imageUrl) {
        mediaPreviewByItem.set(row.item_id, { url: imageUrl, title: row.title })
      }
    }
  }

  const mediaFilterActive = Boolean(selectedMediaType && selectedMediaType.toLowerCase() !== "compendium")
  const filteredMediaCards = mediaFilterActive
    ? items.flatMap(item =>
        (mediaByItem.get(item.id) ?? [])
          .filter(r => r.media_type.toLowerCase() === selectedMediaType!.toLowerCase())
          .map(resource => ({ item, resource })),
      )
    : []
  const displayedCardsCount = mediaFilterActive ? filteredMediaCards.length : items.length

  let panelItem: PanelItemRow | null = null
  let panelMediaByType: Array<{ mediaType: string; resources: PanelMediaRow[] }> = []
  if (selectedItemSlug) {
    const [{ data: panelItemData }, { data: panelMediaRows }] = await Promise.all([
      supabase.from("encyclopedia_items")
        .select("id,title,knowledge_type,sub_type,domain,era_label,depth,summary,tags,metadata")
        .eq("id", selectedItemSlug).single(),
      supabase.from("encyclopedia_media")
        .select("id,media_type,layer,title,description,url")
        .eq("item_id", selectedItemSlug)
        .order("media_type", { ascending: true })
        .order("title", { ascending: true }),
    ])
    panelItem = (panelItemData ?? null) as PanelItemRow | null
    const grouped = new Map<string, PanelMediaRow[]>()
    for (const resource of (panelMediaRows ?? []) as PanelMediaRow[]) {
      const group = grouped.get(resource.media_type) ?? []
      group.push(resource); grouped.set(resource.media_type, group)
    }
    panelMediaByType = [...grouped.entries()].map(([mediaType, resources]) => ({ mediaType, resources }))
  }

  return {
    params: rawParams, queryText, displayMode, selectedItemSlug,
    activePage, totalPages, totalCount: availableCount,
    selectedDomain, selectedDomainNarrow, selectedDomainDetail,
    selectedType, selectedSubtype, selectedLayer,
    selectedMediaType, selectedEra, selectedOrder,
    domainOptions, eraOptions,
    items, rangeStart, rangeEnd, visiblePages, isLarge,
    mediaCountByItem, mediaTypesByItem, mediaPreviewByItem, hasCompendiumByItem,
    wikidataCardByItem, wikimediaPreviewByItem,
    mediaFilterActive, filteredMediaCards, displayedCardsCount, mediaByItem,
    panelItem, panelMediaByType,
    formatMetadataValue, capitalize, buildQueryString, buildTimelineEventsWithFallback,
    PAGE_SIZE,
  }
}
