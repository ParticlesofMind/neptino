"use client"

/**
 * AtlasEntitySearch
 *
 * Combobox for finding Atlas Layer 1 entities. Used in:
 *   1. The TextEditor toolbar — to pick an entity for an inline annotation
 *   2. The AtlasDrawer — to add an atlas_stub entry to the course
 *
 * Queries the Atlas API-backed entity index and returns promoted Layer 1 items.
 */

import { useState, useRef, useEffect } from "react"
import { Search, X, Tag } from "lucide-react"
import { ENTITY_TYPES, type AtlasItem, type EntityType } from "@/types/atlas"
import { ENTITY_TYPE_COLORS } from "./atlas-constants"

// ─── Constants (imported from atlas-constants.ts) ────────────────────────────

const ENTITY_TYPE_COLOURS = ENTITY_TYPE_COLORS

// ─── Props ────────────────────────────────────────────────────────────────────

interface AtlasEntitySearchProps {
  /** Called when the user selects an entity. */
  onSelect: (entity: AtlasItem) => void
  /** If set, only show entities of these types. */
  filterTypes?: EntityType[]
  placeholder?: string
  autoFocus?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AtlasEntitySearch({
  onSelect,
  filterTypes,
  placeholder = "Search Atlas entities…",
  autoFocus = false,
}: AtlasEntitySearchProps) {
  const [query, setQuery] = useState("")
  const [activeType, setActiveType] = useState<EntityType | "all">("all")
  const [results, setResults] = useState<AtlasItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const availableTypes = filterTypes ?? ENTITY_TYPES

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const params = new URLSearchParams({ q: query, limit: "8" })
        if (activeType !== "all") {
          params.set("type", activeType)
        }

        const response = await fetch(`/api/atlas/entities/search?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Atlas search failed with ${response.status}`)
        }

        const payload = (await response.json()) as { items?: AtlasItem[] }
        setResults((payload.items ?? []).filter((item) => availableTypes.includes(item.knowledge_type)))
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : "Atlas search failed")
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 180)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [activeType, availableTypes, query])

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background pl-8 pr-8 py-1.5 text-[12px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveType("all")}
          className={[
            "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
            activeType === "all"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
          ].join(" ")}
        >
          All
        </button>
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(activeType === type ? "all" : type)}
            className={[
              "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
              activeType === type
                ? ENTITY_TYPE_COLOURS[type].replace("bg-", "bg-").replace("text-", "text-") + " ring-1 ring-current/30"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
            ].join(" ")}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="px-3 py-4 text-center text-[11px] text-neutral-400">Searching Atlas</div>
        ) : errorMessage ? (
          <div className="px-3 py-4 text-center text-[11px] text-red-500">{errorMessage}</div>
        ) : results.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-neutral-400">
            {query ? `No Atlas entries match "${query}"` : "No entries available"}
          </div>
        ) : (
          results.map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={() => onSelect(entity)}
              className="flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-50 transition-colors"
            >
              <Tag size={11} className="mt-0.5 shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-semibold text-neutral-800 truncate">{entity.title}</span>
                  <span className={["shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide", ENTITY_TYPE_COLOURS[entity.knowledge_type]].join(" ")}>
                    {entity.knowledge_type}
                  </span>
                </div>
                {entity.summary && (
                  <p className="text-[10px] text-neutral-500 line-clamp-1">{entity.summary}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
