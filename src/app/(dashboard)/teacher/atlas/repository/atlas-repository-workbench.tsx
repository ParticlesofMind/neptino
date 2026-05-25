"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Database, ExternalLink, Package, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

type CandidateSummary = {
  id: string
  title: string
  description: string | null
  wikidataId: string | null
  reviewStatus: string
  suggestedEntityType: string | null
  suggestedSubtype: string | null
  suggestedDomains: string[]
  warnings: unknown[]
  promotedItemId: string | null
  source: {
    id: string
    label: string
    rank: string
    externalId: string
    externalUrl: string | null
    license: string | null
    licenseUrl: string | null
    revisionId: string | null
    retrievedAt: string
  } | null
  assetCandidates: Array<{
    id: string
    title: string
    suggestedMediaType: string | null
    reviewStatus: string
    promotedMediaId: string | null
    url: string | null
    license: string | null
  }>
}

type ApiState = {
  busy: boolean
  message: string | null
  error: string | null
}

const STATUS_OPTIONS = ["all", "new", "needs_review", "approved", "promoted", "rejected"]

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`)
  }
  return payload
}

function formatWarningCount(warnings: unknown[]): string {
  if (warnings.length === 0) {
    return "No warnings"
  }
  return `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
}

export function AtlasRepositoryWorkbench() {
  const [query, setQuery] = useState("Ottoman Empire")
  const [status, setStatus] = useState("all")
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [state, setState] = useState<ApiState>({ busy: false, message: null, error: null })

  const loadCandidates = useCallback(async () => {
    setState((current) => ({ ...current, busy: true, error: null }))
    try {
      const params = new URLSearchParams({ status, limit: "30" })
      const payload = await readJsonResponse<{ candidates: CandidateSummary[] }>(
        await fetch(`/api/atlas/repository/candidates?${params.toString()}`, { cache: "no-store" }),
      )
      setCandidates(payload.candidates)
      setState({ busy: false, message: null, error: null })
    } catch (error) {
      setState({ busy: false, message: null, error: error instanceof Error ? error.message : "Unable to load candidates" })
    }
  }, [status])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCandidates()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadCandidates])

  const candidateCountLabel = useMemo(() => {
    return `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`
  }, [candidates.length])

  async function importQuery(promote: boolean) {
    const trimmed = query.trim()
    if (!trimmed) {
      setState({ busy: false, message: null, error: "Enter a search query." })
      return
    }

    setState({ busy: true, message: null, error: null })
    try {
      await readJsonResponse(
        await fetch("/api/atlas/repository/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            limit: 1,
            includeAssets: true,
            promote,
            assemblePack: promote,
          }),
        }),
      )
      setState({ busy: false, message: promote ? "Imported, promoted, and packed." : "Imported for review.", error: null })
      await loadCandidates()
    } catch (error) {
      setState({ busy: false, message: null, error: error instanceof Error ? error.message : "Import failed" })
    }
  }

  async function promoteCandidate(candidate: CandidateSummary) {
    setState({ busy: true, message: null, error: null })
    try {
      await readJsonResponse(
        await fetch("/api/atlas/repository/promote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: candidate.id, kind: "entity", approve: true, assemblePack: true }),
        }),
      )

      for (const asset of candidate.assetCandidates) {
        if (asset.promotedMediaId) {
          continue
        }
        await readJsonResponse(
          await fetch("/api/atlas/repository/promote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateId: asset.id, kind: "asset", approve: true }),
          }),
        )
      }

      await readJsonResponse(
        await fetch("/api/atlas/repository/packs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityCandidateId: candidate.id, approve: true }),
        }),
      )

      setState({ busy: false, message: "Promoted entity, assets, and pack.", error: null })
      await loadCandidates()
    } catch (error) {
      setState({ busy: false, message: null, error: error instanceof Error ? error.message : "Promotion failed" })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            placeholder="Search a source-backed entity"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void importQuery(false)} loading={state.busy} className="md:w-auto">
          <Database size={15} />
          Import
        </Button>
        <Button type="button" onClick={() => void importQuery(true)} loading={state.busy} className="md:w-auto">
          <CheckCircle2 size={15} />
          Import And Promote
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors",
                status === option ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {option.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{candidateCountLabel}</span>
          <button
            type="button"
            onClick={() => void loadCandidates()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
            aria-label="Refresh candidates"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {(state.message || state.error) && (
        <div className={state.error ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"}>
          {state.error ?? state.message}
        </div>
      )}

      <div className="grid gap-3">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{candidate.reviewStatus.replace("_", " ")}</span>
                  {candidate.source && (
                    <span className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground">
                      {candidate.source.label} · Rank {candidate.source.rank}
                    </span>
                  )}
                  <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{formatWarningCount(candidate.warnings)}</span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{candidate.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{candidate.description ?? "No source description available."}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {[candidate.suggestedEntityType, candidate.suggestedSubtype, ...candidate.suggestedDomains].filter(Boolean).map((value) => (
                    <span key={`${candidate.id}-${value}`} className="rounded-full border border-border px-2 py-0.5">{value}</span>
                  ))}
                </div>
                {candidate.source?.externalUrl && (
                  <a
                    href={candidate.source.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Source <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {candidate.promotedItemId && (
                  <a
                    href={`/teacher/atlas?item=${encodeURIComponent(candidate.promotedItemId)}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    <ExternalLink size={14} />
                    Atlas Item
                  </a>
                )}
                <Button type="button" size="sm" onClick={() => void promoteCandidate(candidate)} loading={state.busy}>
                  <Package size={14} />
                  Promote Pack
                </Button>
              </div>
            </div>

            {candidate.assetCandidates.length > 0 && (
              <div className="mt-3 grid gap-2 border-t border-border pt-3 md:grid-cols-2">
                {candidate.assetCandidates.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{asset.title}</p>
                      <p className="text-muted-foreground">{[asset.suggestedMediaType, asset.license, asset.reviewStatus].filter(Boolean).join(" · ")}</p>
                    </div>
                    {asset.promotedMediaId && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Promoted</span>}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}

        {!state.busy && candidates.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            No repository candidates found.
          </div>
        )}
      </div>
    </div>
  )
}
