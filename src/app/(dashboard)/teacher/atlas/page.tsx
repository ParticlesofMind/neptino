import Link from "next/link"
import { AtlasFilterBar } from "@/components/encyclopedia/atlas-filter-bar"
import { fetchAtlasPageData } from "./atlas-page-data"
import { AtlasPanelItem } from "./atlas-panel-item"
import { AtlasMediaCard } from "./atlas-media-card"
import { AtlasLargeCard } from "./atlas-large-card"
import { AtlasSmallCard } from "./atlas-small-card"
import { AtlasPagination } from "./atlas-pagination"
import type { SearchParams } from "./atlas-page-utils"
import { formatMetadataValue, capitalize, buildQueryString, buildTimelineEventsWithFallback } from "./atlas-page-utils"

export default async function TeacherAtlasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const d = await fetchAtlasPageData(params)

  return (
    <div className="atlas-page atlas-sans -mx-4 -mt-8 -mb-8 lg:-mx-8">
      <div className="meridian-line meridian-left" />
      <div className="meridian-line meridian-right" />

      <section className="relative z-10 px-2 lg:px-4 space-y-6 pt-6">
        <AtlasFilterBar
          queryText={d.queryText} domainOptions={d.domainOptions}
          selectedDomain={d.selectedDomain} selectedDomainNarrow={d.selectedDomainNarrow} selectedDomainDetail={d.selectedDomainDetail}
          selectedType={d.selectedType} selectedSubtype={d.selectedSubtype} selectedLayer={d.selectedLayer}
          selectedMediaType={d.selectedMediaType} displayMode={d.displayMode}
          selectedEra={d.selectedEra} eraOptions={d.eraOptions} selectedOrder={d.selectedOrder}
        />

        {/* Status bar */}
        <div className="rounded-lg border border-[var(--atlas-border)]/50 bg-[var(--atlas-bg-elevated)]/20 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--atlas-text-dim)]">
            <span>Showing {d.rangeStart.toLocaleString()}–{d.rangeEnd.toLocaleString()} of {d.totalCount.toLocaleString()} · Page {d.activePage} / {d.totalPages}</span>
            <div className="flex items-center gap-1 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] p-1">
              {(["small", "large"] as const).map(view => (
                <Link
                  key={view}
                  href={`/teacher/atlas?${buildQueryString(d.params, { display: view, page: String(d.activePage) })}`}
                  className={d.displayMode === view
                    ? "rounded-md bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]"
                    : "rounded-md px-3 py-1 text-xs text-[var(--atlas-text-dim)] hover:bg-[var(--atlas-bg-elevated)]/50"
                  }
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Selected item panel */}
        {d.panelItem && (
          <AtlasPanelItem
            panelItem={d.panelItem} panelMediaByType={d.panelMediaByType}
            params={d.params} activePage={d.activePage} displayMode={d.displayMode}
          />
        )}

        {/* Card grid */}
        <div className={d.isLarge ? "mt-4 grid gap-5" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
          {d.mediaFilterActive
            ? d.filteredMediaCards.map(({ item, resource }, index) => (
                <AtlasMediaCard key={resource.id} item={item} resource={resource} index={index} isLarge={d.isLarge} />
              ))
            : d.items.map((item, index) => {
                const mediaCount  = d.mediaCountByItem.get(item.id) ?? 0
                const mediaTypes  = d.mediaTypesByItem.get(item.id) ?? []
                const previewMedia = d.wikimediaPreviewByItem.get(item.id) ?? d.mediaPreviewByItem.get(item.id)
                const wikidataCard = d.wikidataCardByItem.get(item.id)
                const hasCompendium = d.hasCompendiumByItem.get(item.id) ?? false
                const metadata = item.metadata ?? {}
                const getMeta = (...keys: string[]) => {
                  for (const key of keys) {
                    const value = metadata[key]
                    if (value !== null && value !== undefined && value !== "") return formatMetadataValue(value)
                  }
                  return null
                }
                const domainBadges = [item.domain, ...(item.secondary_domains ?? [])].filter(Boolean) as string[]
                const timelineEvents = buildTimelineEventsWithFallback(metadata, item.title, wikidataCard?.profile, item.era_group, item.era_label)
                const profileRows = [
                  { label: "Full name",      value: item.title },
                  { label: "Place of birth", value: wikidataCard?.profile.birthPlace ?? getMeta("birthPlace", "country") ?? "Not provided" },
                  { label: "Place of death", value: wikidataCard?.profile.deathPlace ?? getMeta("deathPlace") ?? "Not provided" },
                  { label: "Occupation",     value: wikidataCard?.profile.occupation ?? getMeta("occupation", "field") ?? item.knowledge_type },
                  { label: "Era",            value: item.era_label ?? "Not provided" },
                  { label: "Depth",          value: item.depth ? capitalize(item.depth) : "Not provided" },
                ]
                return d.isLarge
                  ? <AtlasLargeCard key={item.id} item={item} index={index} mediaCount={mediaCount} mediaTypes={mediaTypes} previewMedia={previewMedia} wikidataCard={wikidataCard} hasCompendium={hasCompendium} timelineEvents={timelineEvents} profileRows={profileRows} domainBadges={domainBadges} params={d.params} displayMode={d.displayMode} />
                  : <AtlasSmallCard key={item.id} item={item} previewMedia={previewMedia} hasCompendium={hasCompendium} />
              })
          }
        </div>

        {/* Empty state */}
        {d.displayedCardsCount === 0 && (
          <div className="mt-8 rounded-lg border-2 border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/20 p-12 text-center backdrop-blur-sm">
            <div className="mx-auto max-w-md space-y-3">
              <h3 className="atlas-serif text-lg font-light tracking-[0.1em] text-[var(--atlas-text)]">No Atlas Entries Found</h3>
              <p className="text-sm text-[var(--atlas-text-dim)] leading-relaxed">
                Try adjusting your filters or search terms to discover more educational content across the 4-layer knowledge system.
              </p>
            </div>
          </div>
        )}

        <AtlasPagination
          activePage={d.activePage} totalPages={d.totalPages} visiblePages={d.visiblePages}
          availableCount={d.totalCount} displayMode={d.displayMode} params={d.params} PAGE_SIZE={d.PAGE_SIZE}
        />
      </section>
    </div>
  )
}


