"use client"

/**
 * AtlasEntitySearch
 *
 * Combobox for finding Atlas Layer 1 entities. Used in:
 *   1. The TextEditor toolbar — to pick an entity for an inline annotation
 *   2. The AtlasDrawer — to add an atlas_stub entry to the course
 *
 * In production this would query the Atlas Supabase table. For now it resolves
 * against a small in-memory stub list plus a "create custom entry" escape hatch.
 */

import { useState, useRef, useEffect } from "react"
import { Search, X, Tag } from "lucide-react"
import { ENTITY_TYPES, type AtlasItem, type EntityType } from "@/types/atlas"

// ─── Stub data (replace with Supabase query) ──────────────────────────────────

const STUB_ENTITIES: AtlasItem[] = [
  { id: "q3044943",  wikidata_id: "Q3044943",  title: "Janissaries",          knowledge_type: "Institution", sub_type: null, domain: "History", secondary_domains: ["Military history"], era_group: "Early modern", era_label: "Ottoman Empire", depth: null, summary: "Elite infantry units of the Ottoman Empire.", tags: ["ottoman", "military"], metadata: null },
  { id: "q3044944",  wikidata_id: "Q7278",     title: "Ottoman Empire",        knowledge_type: "Institution", sub_type: null, domain: "History", secondary_domains: ["Political science"], era_group: "Medieval to early modern", era_label: null, depth: null, summary: "Multinational state that existed from 1299 to 1922.", tags: ["empire", "ottoman"], metadata: null },
  { id: "q7391",     wikidata_id: "Q7391",     title: "Natural selection",     knowledge_type: "Concept",     sub_type: "Theory", domain: "Biology", secondary_domains: ["Evolution"], era_group: "Modern", era_label: null, depth: null, summary: "The differential survival and reproduction of individuals due to differences in phenotype.", tags: ["darwin", "evolution"], metadata: null },
  { id: "q1035",     wikidata_id: "Q1035",     title: "Charles Darwin",        knowledge_type: "Person",      sub_type: null, domain: "Biology", secondary_domains: ["History of science"], era_group: "19th century", era_label: null, depth: null, summary: "English naturalist who proposed the theory of evolution by natural selection.", tags: ["evolution", "naturalist"], metadata: null },
  { id: "q8094",     wikidata_id: "Q8094",     title: "Photosynthesis",        knowledge_type: "Process",     sub_type: null, domain: "Biology", secondary_domains: ["Chemistry"], era_group: null, era_label: null, depth: null, summary: "Process by which plants convert light energy into chemical energy.", tags: ["plants", "energy"], metadata: null },
  { id: "q133343",   wikidata_id: "Q133343",   title: "French Revolution",     knowledge_type: "Time",        sub_type: "Event", domain: "History", secondary_domains: ["Political science"], era_group: "Modern", era_label: "1789–1799", depth: null, summary: "Period of radical political and societal change in France.", tags: ["revolution", "france"], metadata: null },
  { id: "q12370",    wikidata_id: "Q12370",    title: "Atlantic Ocean",        knowledge_type: "Environment", sub_type: "Place", domain: "Geography", secondary_domains: ["Earth sciences"], era_group: null, era_label: null, depth: null, summary: "The world's second-largest ocean.", tags: ["ocean", "geography"], metadata: null },
  { id: "q849919",   wikidata_id: "Q849919",   title: "Mitosis",              knowledge_type: "Process",     sub_type: null, domain: "Biology", secondary_domains: ["Cell biology"], era_group: null, era_label: null, depth: null, summary: "Process of nuclear division in which chromosomes are copied and distributed.", tags: ["cell division", "biology"], metadata: null },
  { id: "q23",       wikidata_id: "Q23",       title: "George Washington",     knowledge_type: "Person",      sub_type: null, domain: "History", secondary_domains: ["Political science"], era_group: "18th century", era_label: null, depth: null, summary: "First president of the United States.", tags: ["usa", "founding father"], metadata: null },
  { id: "q5090",     wikidata_id: "Q5090",     title: "Thermodynamics",        knowledge_type: "Concept",     sub_type: "Theory", domain: "Physics", secondary_domains: ["Chemistry"], era_group: null, era_label: null, depth: null, summary: "Branch of physics dealing with heat and energy.", tags: ["physics", "energy"], metadata: null },
]

// ─── Entity type badge colour ──────────────────────────────────────────────────

const ENTITY_TYPE_COLOURS: Record<EntityType, string> = {
  Concept:     "bg-[#dbe8f6] text-[#3a6ea0]",
  Process:     "bg-[#d6ede3] text-[#2e6b4a]",
  Instance:    "bg-[#f0e0d4] text-[#7a4a2a]",
  Person:      "bg-[#e0d8ee] text-[#5a3a80]",
  State:       "bg-[#f0ead0] text-[#6b5520]",
  Time:        "bg-[#f0d8d8] text-[#8a3030]",
  Environment: "bg-[#d6ede3] text-[#2e6b4a]",
  Work:        "bg-[#f0e6cc] text-[#7a5010]",
  Technology:  "bg-[#dbe8f6] text-[#3a6ea0]",
  Institution: "bg-[#ecd8ec] text-[#6a306a]",
  Movement:    "bg-[#e0eed0] text-[#3a6020]",
}

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const availableTypes = filterTypes ?? ENTITY_TYPES

  const results = STUB_ENTITIES.filter((e) => {
    const matchesType =
      activeType === "all" ? availableTypes.includes(e.knowledge_type) : e.knowledge_type === activeType
    if (!matchesType) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      e.title.toLowerCase().includes(q) ||
      (e.summary?.toLowerCase().includes(q) ?? false) ||
      (e.tags?.some((t) => t.includes(q)) ?? false)
    )
  }).slice(0, 8)

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
        {results.length === 0 ? (
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

      <p className="text-[9px] text-neutral-400 text-center">
        Atlas entity search — production will query Supabase + Wikidata
      </p>
    </div>
  )
}
