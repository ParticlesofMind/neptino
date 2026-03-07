"use client"

/**
 * NachschlageDrawer
 *
 * Course-level persistent reference panel. Slides in from the right edge of the
 * canvas area. Architecturally separate from the canvas — it is Tier B of the
 * three-tier course structure:
 *
 *   Tier A — Canvases / Sessions / Tasks   (the linear learning sequence)
 *   Tier B — Nachschlagewerk               (this panel — always accessible reference)
 *   Tier C — Atlas                         (global entity graph)
 *
 * Entry kinds:
 *   atlas_stub        — Auto-populated when the teacher links an inline entity reference
 *   course_extension  — Teacher annotations layered on an Atlas stub
 *   custom_entry      — Fully teacher-authored; no Atlas anchor
 */

import { useState, useCallback } from "react"
import {
  BookOpen,
  X,
  Plus,
  Search,
  ChevronRight,
  Globe,
  Edit3,
  FileText,
  Tag,
  Check,
  ArrowLeft,
} from "lucide-react"
import {
  ENTITY_TYPES,
  type AtlasItem,
  type EntityType,
  type EntitySubType,
  type NachschlageEntry,
  type NachschlageCustomEntry,
  type AtlasContributionStatus,
} from "@/types/atlas"
import { AtlasEntitySearch } from "./AtlasEntitySearch"

// ─── Entity type badge colour ──────────────────────────────────────────────────

const TYPE_PILL: Record<EntityType, string> = {
  Concept:     "bg-blue-100 text-blue-700",
  Process:     "bg-teal-100 text-teal-700",
  Instance:    "bg-orange-100 text-orange-700",
  Person:      "bg-purple-100 text-purple-700",
  State:       "bg-yellow-100 text-yellow-700",
  Time:        "bg-rose-100 text-rose-700",
  Environment: "bg-green-100 text-green-700",
  Work:        "bg-amber-100 text-amber-700",
  Technology:  "bg-indigo-100 text-indigo-700",
  Institution: "bg-pink-100 text-pink-700",
  Movement:    "bg-lime-100 text-lime-700",
}

const CONTRIBUTION_PILL: Record<AtlasContributionStatus, string> = {
  draft:          "bg-neutral-100 text-neutral-500",
  pending:        "bg-yellow-100 text-yellow-700",
  approved:       "bg-green-100 text-green-700",
  rejected:       "bg-red-100 text-red-700",
}

// ─── Entry kind meta ──────────────────────────────────────────────────────────

const KIND_META = {
  atlas_stub:        { label: "Atlas",          Icon: Globe,    colour: "text-blue-500"    },
  course_extension:  { label: "Extended",       Icon: Edit3,    colour: "text-violet-500"  },
  custom_entry:      { label: "Custom",         Icon: FileText, colour: "text-amber-500"   },
} as const

// ─── Stub in-memory state (replace with Supabase hook) ───────────────────────

function makeStubId() {
  return `local-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Add-entry panel ─────────────────────────────────────────────────────────

type AddMode = "choose" | "atlas" | "custom"

interface AddEntryPanelProps {
  courseId: string
  onAdd: (entry: NachschlageEntry) => void
  onCancel: () => void
}

function AddEntryPanel({ courseId, onAdd, onCancel }: AddEntryPanelProps) {
  const [mode, setMode] = useState<AddMode>("choose")

  // custom entry form state
  const [title, setTitle]     = useState("")
  const [type, setType]       = useState<EntityType>("Concept")
  const [summary, setSummary] = useState("")

  const handleAtlasSelect = useCallback(
    (entity: AtlasItem) => {
      onAdd({
        id:        makeStubId(),
        courseId,
        kind:      "atlas_stub",
        atlasItem: entity,
        createdAt: new Date().toISOString(),
      })
    },
    [courseId, onAdd],
  )

  const handleCustomSubmit = useCallback(() => {
    if (!title.trim() || !summary.trim()) return
    const entry: NachschlageCustomEntry = {
      id:                 makeStubId(),
      courseId,
      kind:               "custom_entry",
      title:              title.trim(),
      entityType:         type,
      summary:            summary.trim(),
      contributionStatus: "draft",
      createdAt:          new Date().toISOString(),
    }
    onAdd(entry)
  }, [courseId, title, type, summary, onAdd])

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-neutral-800">Add entry</p>
          <button type="button" onClick={onCancel} className="text-neutral-400 hover:text-neutral-700">
            <X size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMode("atlas")}
          className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50 transition-colors"
        >
          <Globe size={16} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-neutral-800">Link Atlas entity</p>
            <p className="text-[10px] text-neutral-500">Pull an existing Atlas entry into this course</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-neutral-400" />
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50 transition-colors"
        >
          <FileText size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-[12px] font-semibold text-neutral-800">Custom entry</p>
            <p className="text-[10px] text-neutral-500">Author a new entry; optionally submit to Atlas</p>
          </div>
          <ChevronRight size={14} className="ml-auto text-neutral-400" />
        </button>
      </div>
    )
  }

  if (mode === "atlas") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode("choose")} className="text-neutral-400 hover:text-neutral-700">
            <ArrowLeft size={14} />
          </button>
          <p className="text-[12px] font-semibold text-neutral-800">Link Atlas entity</p>
          <button type="button" onClick={onCancel} className="ml-auto text-neutral-400 hover:text-neutral-700">
            <X size={14} />
          </button>
        </div>
        <AtlasEntitySearch onSelect={handleAtlasSelect} autoFocus />
      </div>
    )
  }

  // custom
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMode("choose")} className="text-neutral-400 hover:text-neutral-700">
          <ArrowLeft size={14} />
        </button>
        <p className="text-[12px] font-semibold text-neutral-800">Custom entry</p>
        <button type="button" onClick={onCancel} className="ml-auto text-neutral-400 hover:text-neutral-700">
          <X size={14} />
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Janissary corps"
          className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-blue-400"
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Entity type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EntityType)}
          className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-blue-400"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wide">Summary</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A concise description of this entry…"
          rows={3}
          className="w-full resize-none rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-blue-400"
        />
      </label>

      <button
        type="button"
        onClick={handleCustomSubmit}
        disabled={!title.trim() || !summary.trim()}
        className="flex items-center justify-center gap-1.5 rounded bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-neutral-700 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
      >
        <Check size={13} />
        Save entry
      </button>
    </div>
  )
}

// ─── Entry detail view ────────────────────────────────────────────────────────

function EntryDetail({ entry, onBack }: { entry: NachschlageEntry; onBack: () => void }) {
  const isAtlas  = entry.kind === "atlas_stub"
  const isCustom = entry.kind === "custom_entry"
  const isExt    = entry.kind === "course_extension"

  const title      = isAtlas || isExt ? entry.atlasItem.title : (entry as NachschlageCustomEntry).title
  const entityType = isAtlas || isExt ? entry.atlasItem.knowledge_type : (entry as NachschlageCustomEntry).entityType
  const summary    = isAtlas || isExt ? entry.atlasItem.summary : (entry as NachschlageCustomEntry).summary
  const km         = KIND_META[entry.kind]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <button type="button" onClick={onBack} className="text-neutral-400 hover:text-neutral-700">
          <ArrowLeft size={14} />
        </button>
        <p className="text-[12px] font-semibold text-neutral-800 truncate flex-1">{title}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={["rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TYPE_PILL[entityType]].join(" ")}>
            {entityType}
          </span>
          <span className={["flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold", "bg-neutral-100 text-neutral-600"].join(" ")}>
            <km.Icon size={10} className={km.colour} />
            {km.label}
          </span>
          {isCustom && (
            <span className={["rounded px-2 py-0.5 text-[10px] font-semibold", CONTRIBUTION_PILL[(entry as NachschlageCustomEntry).contributionStatus]].join(" ")}>
              {(entry as NachschlageCustomEntry).contributionStatus}
            </span>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Summary</p>
            <p className="text-[12px] leading-relaxed text-neutral-700">{summary}</p>
          </div>
        )}

        {/* Atlas metadata */}
        {(isAtlas || isExt) && (() => {
          const item = (isAtlas ? (entry as { atlasItem: AtlasItem }) : (entry as { atlasItem: AtlasItem })).atlasItem
          return (
            <>
              {item.era_label && (
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Era</p>
                  <p className="text-[12px] text-neutral-700">{item.era_label}</p>
                </div>
              )}
              {item.domain && (
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Domain</p>
                  <p className="text-[12px] text-neutral-700">{item.domain}</p>
                </div>
              )}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {item.wikidata_id && (
                <div>
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Wikidata</p>
                  <p className="text-[11px] font-mono text-neutral-500">{item.wikidata_id}</p>
                </div>
              )}
            </>
          )
        })()}

        {/* Course extension notes */}
        {isExt && (entry as { teacherNotes: string }).teacherNotes && (
          <div>
            <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Course notes</p>
            <p className="text-[12px] leading-relaxed text-neutral-700">{(entry as { teacherNotes: string }).teacherNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Entry list item ──────────────────────────────────────────────────────────

function EntryRow({
  entry,
  onClick,
}: {
  entry: NachschlageEntry
  onClick: () => void
}) {
  const isAtlas = entry.kind === "atlas_stub" || entry.kind === "course_extension"
  const title   = isAtlas
    ? (entry as { atlasItem: AtlasItem }).atlasItem.title
    : (entry as NachschlageCustomEntry).title
  const type    = isAtlas
    ? (entry as { atlasItem: AtlasItem }).atlasItem.knowledge_type
    : (entry as NachschlageCustomEntry).entityType
  const km      = KIND_META[entry.kind]

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors"
    >
      <Tag size={11} className="mt-0.5 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-neutral-800 truncate">{title}</span>
          <span className={["shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide", TYPE_PILL[type]].join(" ")}>
            {type}
          </span>
        </div>
        <span className={["mt-0.5 flex items-center gap-1 text-[10px]", km.colour].join(" ")}>
          <km.Icon size={9} />
          {km.label}
        </span>
      </div>
      <ChevronRight size={13} className="mt-0.5 shrink-0 text-neutral-300" />
    </button>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface NachschlageDrawerProps {
  courseId: string
  open: boolean
  onClose: () => void
}

type DrawerView = "list" | "add" | "detail"

export function NachschlageDrawer({ courseId, open, onClose }: NachschlageDrawerProps) {
  const [view, setView]             = useState<DrawerView>("list")
  const [entries, setEntries]       = useState<NachschlageEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<NachschlageEntry | null>(null)
  const [search, setSearch]         = useState("")
  const [activeKind, setActiveKind] = useState<"all" | NachschlageEntry["kind"]>("all")

  const handleAdd = useCallback((entry: NachschlageEntry) => {
    setEntries((prev) => {
      // Deduplicate atlas_stub by atlasItem.id
      if (entry.kind === "atlas_stub") {
        const exists = prev.some(
          (e) => e.kind === "atlas_stub" && e.atlasItem.id === entry.atlasItem.id,
        )
        if (exists) return prev
      }
      return [entry, ...prev]
    })
    setView("list")
  }, [])

  const filtered = entries.filter((e) => {
    if (activeKind !== "all" && e.kind !== activeKind) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const isAtlas = e.kind === "atlas_stub" || e.kind === "course_extension"
    const title   = isAtlas ? (e as { atlasItem: AtlasItem }).atlasItem.title : (e as NachschlageCustomEntry).title
    return title.toLowerCase().includes(q)
  })

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-neutral-200 bg-white shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-neutral-100 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
            <BookOpen size={14} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-neutral-900 leading-tight">Nachschlagewerk</p>
            <p className="text-[9px] text-neutral-400">{entries.length} entries · course reference</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — switches between views */}
        {view === "detail" && activeEntry ? (
          <EntryDetail
            entry={activeEntry}
            onBack={() => { setActiveEntry(null); setView("list") }}
          />
        ) : view === "add" ? (
          <div className="flex-1 overflow-y-auto">
            <AddEntryPanel
              courseId={courseId}
              onAdd={handleAdd}
              onCancel={() => setView("list")}
            />
          </div>
        ) : (
          <>
            {/* Search + filter */}
            <div className="shrink-0 space-y-2 border-b border-neutral-100 px-4 py-3">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter entries…"
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 pl-8 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div className="flex gap-1">
                {(["all", "atlas_stub", "course_extension", "custom_entry"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveKind(k)}
                    className={[
                      "flex-1 rounded py-1 text-[9px] font-bold uppercase tracking-wide transition-colors",
                      activeKind === k
                        ? k === "all"
                          ? "bg-neutral-900 text-white"
                          : k === "atlas_stub"
                            ? "bg-blue-600 text-white"
                            : k === "course_extension"
                              ? "bg-violet-600 text-white"
                              : "bg-amber-500 text-white"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                    ].join(" ")}
                  >
                    {k === "all" ? "All" : k === "atlas_stub" ? "Atlas" : k === "course_extension" ? "Ext" : "Custom"}
                  </button>
                ))}
              </div>
            </div>

            {/* Entry list */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                  <BookOpen size={24} strokeWidth={1.5} className="text-neutral-300" />
                  <div>
                    <p className="text-[12px] font-semibold text-neutral-500">
                      {entries.length === 0 ? "No entries yet" : "No entries match"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-400 leading-relaxed">
                      {entries.length === 0
                        ? "Link Atlas entities from the text editor or add custom entries here."
                        : "Try a different search term or filter."}
                    </p>
                  </div>
                  {entries.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setView("add")}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <Plus size={12} />
                      Add first entry
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => { setActiveEntry(entry); setView("detail") }}
                  />
                ))
              )}
            </div>

            {/* Footer — Add entry */}
            <div className="shrink-0 border-t border-neutral-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setView("add")}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                <Plus size={13} />
                Add entry
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
