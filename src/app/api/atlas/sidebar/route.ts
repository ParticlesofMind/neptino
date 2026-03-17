import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ISCED_DOMAINS } from "@/types/atlas"
import {
  normalizeFilter,
  parsePositiveInt,
  uniqueSorted,
  type EncyclopediaItemRow,
  type MediaRow,
  type PanelItemRow,
  type PanelMediaRow,
} from "@/app/(dashboard)/teacher/atlas/atlas-page-utils"
import type { CreateAtlasSidebarResponse } from "@/components/coursebuilder/create/sidebar/create-atlas-sidebar-types"

const PAGE_SIZE = 12

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const queryText = params.get("q")?.trim() ?? ""
  const selectedCategory = normalizeFilter(params.get("category") ?? "")
  const selectedDomain = normalizeFilter(params.get("domain") ?? "")
  const selectedType = normalizeFilter(params.get("type") ?? "")
  const selectedSubtype = normalizeFilter(params.get("subtype") ?? "")
  const selectedLayer = normalizeFilter(params.get("layer") ?? "")
  const selectedEra = normalizeFilter(params.get("era") ?? "")
  const selectedOrder = normalizeFilter(params.get("order") ?? "")
  const selectedItem = normalizeFilter(params.get("item") ?? "")
  const requestedPage = parsePositiveInt(params.get("page") ?? "1", 1)

  const supabase = await createClient()

  const eraOrder = ["ancient", "early-modern", "modern", "contemporary"]
  const { data: eraRows } = await supabase.from("encyclopedia_items").select("era_group").not("era_group", "is", null)
  const rawEraOptions = uniqueSorted((eraRows ?? []).map((row) => row.era_group))
  const eraOptions = [
    ...eraOrder.filter((era) => rawEraOptions.includes(era)),
    ...rawEraOptions.filter((era) => !eraOrder.includes(era)),
  ]

  let itemIdsForLayer: string[] | null = null
  if (selectedLayer) {
    const layerNumber = Number.parseInt(selectedLayer, 10)
    if (!Number.isNaN(layerNumber)) {
      const { data: layerRows } = await supabase.from("encyclopedia_media").select("item_id").eq("layer", layerNumber)
      itemIdsForLayer = [...new Set((layerRows ?? []).map((row) => row.item_id))]
    }
  }

  let itemIdsForCategory: string[] | null = null
  if (selectedCategory === "media") {
    const { data: categoryRows } = await supabase.from("encyclopedia_media").select("item_id")
    itemIdsForCategory = [...new Set((categoryRows ?? []).map((row) => row.item_id))]
  }

  const buildItemsQuery = (page: number) => {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let query = supabase
      .from("encyclopedia_items")
      .select("id,title,knowledge_type,sub_type,domain,era_label,depth,summary,tags", { count: "exact" })
      .order("title", { ascending: selectedOrder !== "desc" })
      .range(from, to)

    if (queryText.length > 2) query = query.textSearch("search_vector", queryText, { type: "websearch", config: "english" })
    if (selectedDomain) query = query.or(`domain.eq.${selectedDomain},secondary_domains.cs.{"${selectedDomain}"}`)
    if (selectedType) query = query.eq("knowledge_type", selectedType)
    if (selectedSubtype) query = query.eq("sub_type", selectedSubtype)
    if (selectedEra) query = query.eq("era_group", selectedEra)
    if (itemIdsForLayer) query = query.in("id", itemIdsForLayer.length ? itemIdsForLayer : ["__no_items__"])
    if (itemIdsForCategory) query = query.in("id", itemIdsForCategory.length ? itemIdsForCategory : ["__no_items__"])

    return query
  }

  let activePage = requestedPage
  let { count: totalCount, data: itemRows } = await buildItemsQuery(activePage)
  let items = (itemRows ?? []) as EncyclopediaItemRow[]
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE))

  if (items.length === 0 && (totalCount ?? 0) > 0 && activePage > totalPages) {
    activePage = totalPages
    const retry = await buildItemsQuery(activePage)
    items = (retry.data ?? []) as EncyclopediaItemRow[]
  }

  const itemIds = items.map((item) => item.id)
  const mediaCountByItem = new Map<string, number>()
  if (itemIds.length > 0) {
    const { data: mediaRows } = await supabase.from("encyclopedia_media").select("item_id").in("item_id", itemIds)
    for (const row of mediaRows ?? []) {
      mediaCountByItem.set(row.item_id, (mediaCountByItem.get(row.item_id) ?? 0) + 1)
    }
  }

  let panelItem: PanelItemRow | null = null
  let panelMediaByType: CreateAtlasSidebarResponse["panelMediaByType"] = []
  if (selectedItem) {
    const [{ data: panelItemData }, { data: panelMediaRows }] = await Promise.all([
      supabase
        .from("encyclopedia_items")
        .select("id,title,knowledge_type,sub_type,domain,era_label,depth,summary,tags,metadata")
        .eq("id", selectedItem)
        .single(),
      supabase
        .from("encyclopedia_media")
        .select("id,media_type,title,description")
        .eq("item_id", selectedItem)
        .order("media_type", { ascending: true })
        .order("title", { ascending: true }),
    ])

    panelItem = (panelItemData ?? null) as PanelItemRow | null

    const grouped = new Map<string, PanelMediaRow[]>()
    for (const resource of (panelMediaRows ?? []) as PanelMediaRow[]) {
      const group = grouped.get(resource.media_type) ?? []
      group.push(resource)
      grouped.set(resource.media_type, group)
    }

    panelMediaByType = [...grouped.entries()].map(([mediaType, resources]) => ({
      mediaType,
      resources: resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        media_type: resource.media_type,
      })),
    }))
  }

  const response: CreateAtlasSidebarResponse = {
    domainOptions: ISCED_DOMAINS,
    eraOptions,
    totalCount: totalCount ?? 0,
    totalPages,
    activePage,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      knowledge_type: item.knowledge_type,
      sub_type: item.sub_type,
      domain: item.domain,
      era_label: item.era_label,
      depth: item.depth,
      summary: item.summary,
      tags: item.tags,
      mediaCount: mediaCountByItem.get(item.id) ?? 0,
    })),
    panelItem: panelItem
      ? {
          id: panelItem.id,
          title: panelItem.title,
          knowledge_type: panelItem.knowledge_type,
          sub_type: panelItem.sub_type,
          domain: panelItem.domain,
          era_label: panelItem.era_label,
          depth: panelItem.depth,
          summary: panelItem.summary,
          tags: panelItem.tags,
          metadata: panelItem.metadata,
        }
      : null,
    panelMediaByType,
  }

  return NextResponse.json(response)
}