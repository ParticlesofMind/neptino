"use client"

import { FormEvent, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Database, ExternalLink, KeyRound, Search } from "lucide-react"
import type {
  AtlasResourceType,
  AtlasSourceSearchResult,
  AtlasSourceStatus,
} from "@/lib/atlas/source-registry"

type AtlasOverview = {
  localItems: number
  mediaResources: number
  repositoryCandidates: number
  sourceRecords: number
}

type SearchPayload = {
  results?: AtlasSourceSearchResult[]
  sources?: AtlasSourceStatus[]
  diagnostics?: string[]
  error?: string
}

type ImportPayload = {
  entityCandidates?: Array<{ id: string; title: string }>
  promotedItemIds?: string[]
  packIds?: string[]
  error?: string
}

interface Props {
  overview: AtlasOverview
  sourceStatuses: AtlasSourceStatus[]
  initialQuery?: string
}

const RESOURCE_OPTIONS: Array<{ value: AtlasResourceType; label: string }> = [
  { value: "composition", label: "Any composition" },
  { value: "map", label: "Maps" },
  { value: "timeline", label: "Timelines" },
  { value: "dataset", label: "Datasets" },
  { value: "chart", label: "Charts" },
  { value: "document", label: "Documents" },
  { value: "image", label: "Images" },
  { value: "diagram", label: "Diagrams" },
  { value: "text", label: "Texts" },
]

function statusTone(status: AtlasSourceStatus["status"]): string {
  if (status === "available") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (status === "missing_api_key") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }
  return "border-[var(--atlas-border)] bg-[var(--atlas-bg)] text-[var(--atlas-text-dim)]"
}

function statusIcon(status: AtlasSourceStatus["status"]) {
  if (status === "available") return <CheckCircle2 size={13} />
  if (status === "missing_api_key") return <KeyRound size={13} />
  return <Clock3 size={13} />
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

async function readSearchResponse(response: Response): Promise<SearchPayload> {
  const payload = (await response.json().catch(() => ({}))) as SearchPayload
  if (!response.ok) {
    throw new Error(payload.error ?? `Search failed with ${response.status}`)
  }
  return payload
}

async function readImportResponse(response: Response): Promise<ImportPayload> {
  const payload = (await response.json().catch(() => ({}))) as ImportPayload
  if (!response.ok) {
    throw new Error(payload.error ?? `Import failed with ${response.status}`)
  }
  return payload
}

export function AtlasRetrievalPanel({ overview, sourceStatuses, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [resourceType, setResourceType] = useState<AtlasResourceType>("composition")
  const [results, setResults] = useState<AtlasSourceSearchResult[]>([])
  const [statuses, setStatuses] = useState<AtlasSourceStatus[]>(sourceStatuses)
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [importingKey, setImportingKey] = useState<string | null>(null)
  const [importedKeys, setImportedKeys] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sourceCounts = useMemo(() => ({
    available: statuses.filter((source) => source.status === "available").length,
    keyNeeded: statuses.filter((source) => source.status === "missing_api_key").length,
    planned: statuses.filter((source) => source.status === "planned").length,
  }), [statuses])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters.")
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    setDiagnostics([])
    try {
      const payload = await readSearchResponse(
        await fetch("/api/atlas/sources/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, resourceType, limit: 6 }),
        }),
      )
      setResults(payload.results ?? [])
      setStatuses(payload.sources ?? sourceStatuses)
      setDiagnostics(payload.diagnostics ?? [])
    } catch (searchError) {
      setResults([])
      setError(searchError instanceof Error ? searchError.message : "Atlas source search failed.")
    } finally {
      setBusy(false)
    }
  }

  async function importResult(result: AtlasSourceSearchResult, promote: boolean) {
    const key = `${result.sourceId}:${result.externalId}`
    setImportingKey(`${key}:${promote ? "promote" : "import"}`)
    setError(null)
    setMessage(null)

    try {
      const payload = await readImportResponse(
        await fetch("/api/atlas/repository/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: result.title,
            sourceId: result.sourceId,
            externalId: result.externalId,
            limit: 1,
            includeAssets: true,
            promote,
            assemblePack: promote,
          }),
        }),
      )

      setImportedKeys((current) => {
        const next = new Set(current)
        next.add(key)
        return next
      })
      const importedTitle = payload.entityCandidates?.[0]?.title ?? result.title
      setMessage(promote
        ? `${importedTitle} was imported, promoted, and packed.`
        : `${importedTitle} was imported for review.`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Atlas import failed.")
    } finally {
      setImportingKey(null)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="rounded-lg border border-[var(--atlas-border)]/60 bg-[var(--atlas-bg-elevated)]/35 p-4 backdrop-blur-sm">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Atlas entries", overview.localItems],
            ["Material cards", overview.mediaResources],
            ["Review candidates", overview.repositoryCandidates],
            ["Source records", overview.sourceRecords],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--atlas-text-dim)]">{label}</p>
              <p className="mt-1 text-xl font-semibold text-[var(--atlas-text)]">{formatNumber(Number(value))}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Queryable</p>
            <p className="mt-1 text-lg font-semibold">{sourceCounts.available}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Needs keys</p>
            <p className="mt-1 text-lg font-semibold">{sourceCounts.keyNeeded}</p>
          </div>
          <div className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-3 py-2 text-[var(--atlas-text-dim)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Planned</p>
            <p className="mt-1 text-lg font-semibold">{sourceCounts.planned}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {statuses.slice(0, 12).map((source) => (
            <span
              key={source.id}
              className={["inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusTone(source.status)].join(" ")}
              title={source.missingEnvVars.length > 0 ? source.missingEnvVars.join(", ") : source.notes}
            >
              {statusIcon(source.status)}
              {source.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--atlas-border)]/60 bg-[var(--atlas-bg-elevated)]/35 p-4 backdrop-blur-sm">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--atlas-text-dim)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search external Atlas sources"
              className="h-10 w-full rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] pl-9 pr-3 text-sm text-[var(--atlas-text)] outline-none transition-colors placeholder:text-[var(--atlas-text-dim)] focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value as AtlasResourceType)}
              className="h-9 min-w-0 flex-1 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-2 text-xs font-semibold text-[var(--atlas-text)] outline-none focus:border-[var(--primary)]"
            >
              {RESOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-3 text-xs font-semibold text-[var(--atlas-text)] transition-colors hover:border-[var(--primary)]/50 disabled:cursor-wait disabled:text-[var(--atlas-text-dim)]"
            >
              <Database size={14} />
              {busy ? "Searching" : "Retrieve"}
            </button>
          </div>
        </form>

        {(error || message || diagnostics.length > 0) && (
          <div className="mt-3 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/60 px-3 py-2 text-xs text-[var(--atlas-text-dim)]">
            {error ?? message ?? diagnostics.slice(0, 2).join(" ")}
          </div>
        )}

        <div className="mt-3 grid gap-2">
          {results.slice(0, 4).map((result) => (
            <article key={`${result.sourceId}-${result.externalId}`} className="rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--atlas-text-dim)]">
                      {result.sourceLabel} · {result.sourceRank}
                    </span>
                    {result.license && (
                      <span className="rounded-full border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] text-[var(--atlas-text-dim)]">{result.license}</span>
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--atlas-text)]">{result.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--atlas-text-dim)]">
                    {result.description ?? "No source description available."}
                  </p>
                </div>
                {result.externalUrl && (
                  <a
                    href={result.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--atlas-border)] text-[var(--atlas-text-dim)] hover:text-[var(--atlas-text)]"
                    aria-label={`Open ${result.title} source`}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {result.sourceId === "wikidata" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void importResult(result, false)}
                      disabled={Boolean(importingKey)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg)] px-2.5 text-[11px] font-semibold text-[var(--atlas-text)] transition-colors hover:border-[var(--primary)]/50 disabled:cursor-wait disabled:text-[var(--atlas-text-dim)]"
                    >
                      <Database size={13} />
                      {importingKey === `${result.sourceId}:${result.externalId}:import` ? "Importing" : importedKeys.has(`${result.sourceId}:${result.externalId}`) ? "Imported" : "Import"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void importResult(result, true)}
                      disabled={Boolean(importingKey)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-2.5 text-[11px] font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)]/60 disabled:cursor-wait disabled:text-[var(--atlas-text-dim)]"
                    >
                      <CheckCircle2 size={13} />
                      {importingKey === `${result.sourceId}:${result.externalId}:promote` ? "Promoting" : "Import and promote"}
                    </button>
                  </>
                ) : (
                  <span className="rounded-md border border-[var(--atlas-border)] px-2.5 py-1 text-[11px] text-[var(--atlas-text-dim)]">
                    Import connector pending
                  </span>
                )}
              </div>
            </article>
          ))}

          {!busy && results.length === 0 && (
            <div className="rounded-md border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg)]/40 px-3 py-6 text-center text-xs text-[var(--atlas-text-dim)]">
              External results appear after retrieval.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
