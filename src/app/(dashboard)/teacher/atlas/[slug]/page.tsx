import Link from "next/link"
import { notFound } from "next/navigation"
import { PageSection } from "@/components/ui/page-section"
import { createClient } from "@/lib/supabase/server"
import type { EntityType, AtlasLayer, AtlasContentType } from "@/types/atlas"

type RouteParams = {
  slug: string
}

type SearchParams = Record<string, string | string[] | undefined>

type DetailItemRow = {
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
  created_at: string | null
}

type MediaItemRow = {
  id: string
  item_id?: string
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

function buildBackQueryString(searchParams: SearchParams): string {
  const params = new URLSearchParams()
  const keys = ["q", "domain", "domain_narrow", "domain_detail", "type", "era", "depth", "media", "layer", "display", "page"]

  for (const key of keys) {
    const value = getSingleParam(searchParams[key])
    if (value) {
      params.set(key, value)
    }
  }

  return params.toString()
}

function normalizeFilter(value: string): string | null {
  if (!value || value === "all") {
    return null
  }
  return value
}

function metadataEntries(metadata: Record<string, unknown> | null): Array<[string, string]> {
  if (!metadata) {
    return []
  }

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value]
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return [key, String(value)]
      }
      return [key, JSON.stringify(value)]
    })
}

export default async function TeacherAtlasDetailPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>
  searchParams?: Promise<SearchParams>
}) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const backQuery = buildBackQueryString(query)

  const queryText = getSingleParam(query.q).trim()
  const selectedDomain = normalizeFilter(getSingleParam(query.domain))
  const selectedType = normalizeFilter(getSingleParam(query.type))
  const selectedEra = normalizeFilter(getSingleParam(query.era))
  const selectedDepth = normalizeFilter(getSingleParam(query.depth))
  const selectedMediaType = normalizeFilter(getSingleParam(query.media))

  const supabase = await createClient()

  let mediaFilteredItemIds: string[] | null = null
  if (selectedMediaType) {
    const { data: mediaFilteredRows } = await supabase
      .from("encyclopedia_media")
      .select("item_id")
      .eq("media_type", selectedMediaType)

    mediaFilteredItemIds = [...new Set((mediaFilteredRows ?? []).map((row) => row.item_id))]
  }

  let filteredItemsQuery = supabase
    .from("encyclopedia_items")
    .select("id,title,knowledge_type")
    .order("title", { ascending: true })

  if (queryText.length > 2) {
    filteredItemsQuery = filteredItemsQuery.textSearch("search_vector", queryText, {
      type: "websearch",
      config: "english",
    })
  }

  if (selectedDomain) {
    filteredItemsQuery = filteredItemsQuery.or(
      `domain.eq.${selectedDomain},secondary_domains.cs.{"${selectedDomain}"}`,
    )
  }

  if (selectedType) {
    filteredItemsQuery = filteredItemsQuery.eq("knowledge_type", selectedType)
  }

  if (selectedEra) {
    filteredItemsQuery = filteredItemsQuery.eq("era_group", selectedEra)
  }

  if (selectedDepth) {
    filteredItemsQuery = filteredItemsQuery.eq("depth", selectedDepth)
  }

  if (mediaFilteredItemIds) {
    filteredItemsQuery = mediaFilteredItemIds.length === 0
      ? filteredItemsQuery.in("id", ["__no_items__"])
      : filteredItemsQuery.in("id", mediaFilteredItemIds)
  }

  const [{ data: itemData }, { data: mediaRows }, { data: filteredRows }] = await Promise.all([
    supabase
      .from("encyclopedia_items")
      .select(
        "id,wikidata_id,title,knowledge_type,sub_type,domain,secondary_domains,era_group,era_label,depth,summary,tags,metadata,created_at",
      )
      .eq("id", slug)
      .single(),
    supabase
      .from("encyclopedia_media")
      .select("id,media_type,layer,title,description,url,item_id")
      .eq("item_id", slug)
      .order("media_type", { ascending: true })
      .order("title", { ascending: true }),
    filteredItemsQuery,
  ])

  if (!itemData) {
    notFound()
  }

  const item = itemData as DetailItemRow
  const media = (mediaRows ?? []) as MediaItemRow[]
  const filtered = (filteredRows ?? []) as Array<{ id: string; title: string; knowledge_type: string }>
  const related = filtered.filter((entry) => entry.id !== slug).slice(0, 8)
  const metadata = metadataEntries(item.metadata)

  const filteredIds = filtered.map((entry) => entry.id)
  const currentIndex = filteredIds.indexOf(slug)
  const previousId = currentIndex > 0 ? filteredIds[currentIndex - 1] : null
  const nextId = currentIndex >= 0 && currentIndex < filteredIds.length - 1 ? filteredIds[currentIndex + 1] : null

  const mediaByType = new Map<string, MediaItemRow[]>()
  for (const resource of media) {
    const group = mediaByType.get(resource.media_type) ?? []
    group.push(resource)
    mediaByType.set(resource.media_type, group)
  }
  const groupedMedia = [...mediaByType.entries()].map(([mediaType, resources]) => ({ mediaType, resources }))

  return (
    <PageSection
      title={item.title}
      description="Atlas knowledge detail view with linked content and metadata."
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={backQuery ? `/teacher/atlas?${backQuery}` : "/teacher/atlas"}
          className="rounded-md border border-border/40 px-3 py-1.5 text-xs hover:bg-accent/40"
        >
          Back to Atlas
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/60 px-2.5 py-1 text-xs text-muted-foreground">
            {item.knowledge_type}
          </span>
          {previousId && (
            <Link
              href={`/teacher/atlas/${previousId}?${backQuery}`}
              className="rounded-md border border-border/40 px-2.5 py-1 text-xs hover:bg-accent/40"
            >
              Previous
            </Link>
          )}
          {nextId && (
            <Link
              href={`/teacher/atlas/${nextId}?${backQuery}`}
              className="rounded-md border border-border/40 px-2.5 py-1 text-xs hover:bg-accent/40"
            >
              Next
            </Link>
          )}
        </div>
      </div>

      {currentIndex >= 0 && filteredIds.length > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Result {currentIndex + 1} of {filteredIds.length}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {item.summary ?? "No summary available yet."}
          </p>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>Domain: <span className="text-foreground">{item.domain ?? "—"}</span></div>
            <div>Era: <span className="text-foreground">{item.era_label ?? item.era_group ?? "—"}</span></div>
            <div>Depth: <span className="text-foreground">{item.depth ?? "—"}</span></div>
            <div>Wikidata: <span className="text-foreground">{item.wikidata_id ?? "—"}</span></div>
          </div>

          {item.secondary_domains && item.secondary_domains.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.secondary_domains.map((domain) => (
                <span key={domain} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {domain}
                </span>
              ))}
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Metadata</h2>
          {metadata.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No metadata available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {metadata.map(([key, value]) => (
                <div key={key} className="rounded-md border border-border/30 bg-background/80 p-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</p>
                  <p className="mt-1 text-xs text-foreground break-words">{value}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Linked Media</h2>
          {groupedMedia.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No linked media.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {groupedMedia.map((group) => (
                <section key={group.mediaType} className="rounded-xl bg-accent/30 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.mediaType}
                  </h3>
                  <div className="mt-2 space-y-2">
                    {group.resources.map((resource) => (
                      <div key={resource.id} className="rounded-md border border-border/30 bg-background/80 p-3">
                        <p className="text-sm font-medium text-foreground">{resource.title}</p>
                        {resource.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
                        )}
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                          >
                            Open resource
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Related Entries</h2>
          {related.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No related entries available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {related.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/teacher/atlas/${entry.id}?${backQuery}`}
                  className="block rounded-md border border-border/30 bg-background/80 p-3 hover:bg-accent/40"
                >
                  <p className="text-sm font-medium text-foreground">{entry.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.knowledge_type}</p>
                </Link>
              ))}
            </div>
          )}
        </article>
      </div>
    </PageSection>
  )
}
