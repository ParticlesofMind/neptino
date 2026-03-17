"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { CreateAtlasSidebarResponse } from "./create-atlas-sidebar-types"

type AtlasCategory = "entities" | "media"

export function CreateAtlasSidebar() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<AtlasCategory>("entities")
  const [data, setData] = useState<CreateAtlasSidebarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  const requestQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("category", category)
    if (deferredQuery.trim()) params.set("q", deferredQuery.trim())
    return params.toString()
  }, [category, deferredQuery, page])

  useEffect(() => {
    const controller = new AbortController()

    async function loadAtlasSidebar() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/atlas/sidebar?${requestQuery}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Atlas sidebar request failed: ${response.status}`)
        }

        const payload = (await response.json()) as CreateAtlasSidebarResponse
        setData(payload)
      } catch (fetchError) {
        if (controller.signal.aborted) return
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load Atlas data")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadAtlasSidebar()
    return () => controller.abort()
  }, [requestQuery])

  return (
    <aside className="atlas-scope atlas-sans flex h-full w-full min-w-0 flex-col overflow-hidden border-l border-[var(--atlas-border)] bg-[var(--atlas-bg)]">
      <div className="border-b border-[var(--atlas-border)] bg-[var(--atlas-bg)]/75 px-4 py-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--atlas-text-dim)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search Atlas..."
            className="w-full rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/60 py-2 pl-9 pr-3 text-sm text-[var(--atlas-text)] outline-none transition-colors placeholder:text-[var(--atlas-text-dim)] focus:border-[var(--atlas-accent-entity)]/40 focus:bg-[var(--atlas-bg)]"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {([
            { key: "entities", label: "Entities" },
            { key: "media", label: "Media" },
          ] as const).map((option) => {
            const active = category === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setCategory(option.key)
                  setPage(1)
                }}
                className={[
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "border-[var(--atlas-accent-entity)] bg-[var(--atlas-accent-entity)]/12 text-[var(--atlas-accent-entity)]"
                    : "border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/50 text-[var(--atlas-text-dim)] hover:text-[var(--atlas-text)]",
                ].join(" ")}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 px-4 py-2 text-[11px] text-[var(--atlas-text-dim)]">
        {loading
          ? "Loading Atlas entries…"
          : error
            ? "Atlas unavailable"
            : `${data?.totalCount.toLocaleString() ?? 0} ${category === "media" ? "media entries" : "entity entries"}`}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {error ? (
          <div className="rounded-lg border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/30 p-4 text-sm text-[var(--atlas-text-dim)]">
            <p>Atlas data could not be loaded.</p>
            <button
              type="button"
              className="mt-3 rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-colors hover:bg-[var(--atlas-bg-elevated)]"
              onClick={() => setPage((currentPage) => currentPage)}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {loading && Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="animate-pulse rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/30 p-4">
                <div className="h-4 w-2/3 rounded bg-[var(--atlas-border)]/70" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[var(--atlas-border)]/60" />
                <div className="mt-3 h-3 w-full rounded bg-[var(--atlas-border)]/50" />
              </div>
            ))}

            {!loading && data?.items.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/20 p-5 text-center">
                <h3 className="atlas-serif text-base font-light tracking-[0.08em] text-[var(--atlas-text)]">No Atlas Entries</h3>
                <p className="mt-2 text-sm text-[var(--atlas-text-dim)]">No reference entries are available for this view yet.</p>
              </div>
            )}

            {data?.items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="atlas-serif text-base font-light tracking-[0.05em] text-[var(--atlas-text)]">{item.title}</h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--atlas-text-dim)]">
                      {item.knowledge_type}
                      {item.sub_type ? ` · ${item.sub_type}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-2 py-0.5 text-[10px] text-[var(--atlas-text-dim)]">
                    {item.mediaCount} media
                  </span>
                </div>

                {item.summary && (
                  <p className="mt-3 text-sm text-[var(--atlas-text-dim)]">{item.summary}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.domain && <span className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] text-[var(--atlas-text-dim)]">{item.domain}</span>}
                  {item.era_label && <span className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] text-[var(--atlas-text-dim)]">{item.era_label}</span>}
                  {item.depth && <span className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] text-[var(--atlas-text-dim)]">{item.depth}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/50 px-4 py-3">
        <button
          type="button"
          disabled={loading || (data?.activePage ?? 1) <= 1}
          className="rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--atlas-bg-elevated)]"
          onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        >
          Previous
        </button>

        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--atlas-text-dim)]">
          Page {data?.activePage ?? 1} / {data?.totalPages ?? 1}
        </span>

        <button
          type="button"
          disabled={loading || (data?.activePage ?? 1) >= (data?.totalPages ?? 1)}
          className="rounded-md border border-[var(--atlas-border)] px-3 py-1.5 text-xs text-[var(--atlas-text)] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--atlas-bg-elevated)]"
          onClick={() => setPage((currentPage) => Math.min(data?.totalPages ?? 1, currentPage + 1))}
        >
          Next
        </button>
      </div>
    </aside>
  )
}