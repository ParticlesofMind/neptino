import Link from "next/link"
import { TimelineJsCard } from "@/components/encyclopedia/timelinejs-card"
import type { EncyclopediaItemRow, WikidataCardData, TimelineEvent, SearchParams } from "./atlas-page-utils"
import { buildQueryString, capitalize } from "./atlas-page-utils"

interface ProfileRow { label: string; value: string }

interface Props {
  item: EncyclopediaItemRow
  index: number
  mediaCount: number
  mediaTypes: string[]
  previewMedia: { url: string; title: string } | undefined
  wikidataCard: WikidataCardData | undefined
  hasCompendium: boolean
  timelineEvents: TimelineEvent[]
  profileRows: ProfileRow[]
  domainBadges: string[]
  params: SearchParams
  displayMode: string
}

export function AtlasLargeCard({
  item, index, mediaCount, mediaTypes, previewMedia, wikidataCard, hasCompendium,
  timelineEvents, profileRows, domainBadges, params, displayMode,
}: Props) {
  return (
    <article className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-6 backdrop-blur-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--atlas-accent-entity)] bg-[var(--atlas-accent-entity)]/10 px-2 py-0.5 text-xs text-[var(--atlas-accent-entity)]">{item.knowledge_type}</span>
            {item.era_label && <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-xs text-[var(--atlas-text-dim)]">{item.era_label}</span>}
            {item.depth && <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-xs text-[var(--atlas-text-dim)]">{capitalize(item.depth)}</span>}
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
              {item.tags.map(tag => (
                <span key={`${item.id}-${tag}`} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}

          {domainBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {domainBadges.map(domain => (
                <span key={`${item.id}-${domain}`} className="rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">{domain}</span>
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
                {(domainBadges.length > 0 ? domainBadges : [item.knowledge_type]).slice(0, 7).map(entry => (
                  <span key={`${item.id}-knowledge-${entry}`} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">{entry}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">Related</p>
              {item.tags && item.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 7).map(tag => (
                    <Link
                      key={`${item.id}-related-${tag}`}
                      href={`/teacher/atlas?${buildQueryString(params, { q: tag, page: "1", item: null, display: displayMode })}`}
                      className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[11px] text-[var(--atlas-text-dim)] hover:border-[var(--primary)]/40 hover:text-[var(--atlas-text)] transition-all"
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
              <img src={previewMedia.url} alt={previewMedia.title || `${item.title} image`} className="aspect-[4/5] w-full object-cover" loading="lazy" />
            </div>
          )}
          {!previewMedia && hasCompendium && (
            <div className="w-full max-w-xs aspect-[4/5] justify-self-start overflow-hidden rounded-xl border border-border/30 bg-accent/20 lg:justify-self-end">
              <div className="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
                <img src="/icons-coursebuilder/media/media-image.svg" alt="" aria-hidden="true" className="h-6 w-6 opacity-80" />
                <span className="text-xs font-medium">Compendium preview</span>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border/30 bg-accent/20 px-4 py-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profile</div>
            {profileRows.map(row => (
              <div key={`${item.id}-${row.label}`} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs">{row.label}</span>
                <span className="text-xs font-semibold text-foreground text-right">{row.value}</span>
              </div>
            ))}
            {item.wikidata_id && (
              <div className="pt-2 border-t border-border/30">
                <a className="text-xs text-primary font-semibold hover:underline" href={`https://www.wikidata.org/wiki/${item.wikidata_id}`} target="_blank" rel="noreferrer">Wikidata ↗</a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
        {mediaCount > 0 ? `${mediaCount} media item${mediaCount > 1 ? "s" : ""} · ${mediaTypes.join(", ")}` : "No linked media"}
      </div>
    </article>
  )
}
