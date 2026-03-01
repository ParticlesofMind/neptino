import Link from "next/link"
import type { SearchParams, PanelItemRow, PanelMediaRow } from "./atlas-page-utils"
import { buildQueryString, formatMetadataValue } from "./atlas-page-utils"

interface Props {
  panelItem: PanelItemRow
  panelMediaByType: Array<{ mediaType: string; resources: PanelMediaRow[] }>
  params: SearchParams
  activePage: number
  displayMode: string
}

export function AtlasPanelItem({ panelItem, panelMediaByType, params, activePage, displayMode }: Props) {
  return (
    <section className="mt-4 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="atlas-serif text-lg font-light tracking-[0.05em] text-[var(--atlas-text)]">{panelItem.title}</h2>
          <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">
            {[panelItem.knowledge_type, panelItem.domain, panelItem.era_label, panelItem.depth].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/atlas/${panelItem.id}?${buildQueryString(params, { page: String(activePage), display: displayMode, item: null })}`}
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
          {panelItem.tags.map(tag => (
            <span key={tag} className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[11px] text-[var(--atlas-text-dim)]">{tag}</span>
          ))}
        </div>
      )}

      {panelMediaByType.length > 0 && (
        <div className="mt-4 space-y-3">
          {panelMediaByType.map(group => (
            <div key={group.mediaType} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-dim)]">{group.mediaType}</h3>
              <div className="mt-2 space-y-2">
                {group.resources.map(resource => (
                  <div key={resource.id} className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-2.5">
                    <p className="text-sm font-medium text-[var(--atlas-text)]">{resource.title}</p>
                    {resource.description && <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">{resource.description}</p>}
                    {resource.url && (
                      <a href={resource.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-medium text-[var(--primary)] hover:underline">
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
  )
}
