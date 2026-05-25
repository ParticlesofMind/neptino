export type CreateAtlasFilters = {
  q: string
  domain: string | null
  domainNarrow: string | null
  domainDetail: string | null
  type: string | null
  subtype: string | null
  layer: string | null
  era: string | null
  order: string | null
  item: string | null
  page: number
}

export type CreateAtlasSidebarItem = {
  id: string
  title: string
  knowledge_type: string
  sub_type: string | null
  domain: string | null
  era_label: string | null
  depth: string | null
  summary: string | null
  tags: string[] | null
  mediaCount: number
}

export type CreateAtlasSidebarPanelItem = {
  id: string
  title: string
  knowledge_type: string
  sub_type: string | null
  domain: string | null
  era_label: string | null
  depth: string | null
  summary: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
}

export type CreateAtlasSidebarPanelMedia = {
  id: string
  title: string
  description: string | null
  media_type: string
}

export type CreateAtlasSidebarMediaItem = {
  id: string
  item_id: string
  itemTitle: string
  itemType: string
  media_type: string
  layer: number | null
  title: string
  description: string | null
  url: string | null
}

export type CreateAtlasSidebarPanelMediaGroup = {
  mediaType: string
  resources: CreateAtlasSidebarPanelMedia[]
}

export type CreateAtlasSidebarResponse = {
  domainOptions: string[]
  eraOptions: string[]
  totalCount: number
  totalPages: number
  activePage: number
  items: CreateAtlasSidebarItem[]
  mediaItems: CreateAtlasSidebarMediaItem[]
  panelItem: CreateAtlasSidebarPanelItem | null
  panelMediaByType: CreateAtlasSidebarPanelMediaGroup[]
}
