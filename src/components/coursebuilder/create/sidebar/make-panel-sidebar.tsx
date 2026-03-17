import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react"
import { useEffect, useState } from "react"

import { CARD_TYPE_META } from "../cards/CardTypePreview"
import type { StudioCard } from "../store/makeLibraryStore"
import type { CardType } from "../types"
import { GROUPS, type CardGroup, type CardSpec } from "./make-panel-data"
import type { LibraryProjectGroup } from "./make-panel-library"
import { MAKE_BLUE_ACTIVE_SOFT, MAKE_BLUE_BADGE, MAKE_BLUE_INPUT_FOCUS, MAKE_RESOURCE_ACCENT } from "./make-theme"

const GROUP_ACCENT: Record<string, { pill: string; pillActive: string; border: string; dot: string }> = {
  resources: MAKE_RESOURCE_ACCENT,
  tools: { pill: "text-[#00ccb3]", pillActive: "bg-[#00ccb3] text-white", border: "border-[#00ccb3]/20 bg-[#00ccb3]/5", dot: "bg-[#00ccb3]" },
  experiences: { pill: "text-amber-600", pillActive: "bg-amber-500 text-white", border: "border-amber-200 bg-amber-50", dot: "bg-amber-400" },
  layout: { pill: "text-neutral-600", pillActive: "bg-neutral-600 text-white", border: "border-neutral-200 bg-neutral-50", dot: "bg-neutral-400" },
}

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  resources: "Res",
  tools: "Tools",
  experiences: "Exp",
  library: "Library",
}

export type MakePanelFilter = "all" | CardGroup | "library"

interface MakePanelSidebarProps {
  activeFilter: MakePanelFilter
  search: string
  showSidebar: boolean
  selectedCardType: CardType
  selectedLibraryCardId: string | null
  visibleCards: number
  totalCards: number
  libraryVisibleCount: number
  libraryTotalCount: number
  filteredGroups: Array<{ id: CardGroup; label: string; items: CardSpec[] }>
  libraryGroups: LibraryProjectGroup[]
  onFilterChange: (filter: MakePanelFilter) => void
  onSearchChange: (value: string) => void
  onSelectCardType: (cardType: CardType) => void
  onSelectLibraryCard: (card: StudioCard) => void
  onToggleSidebar: (visible: boolean) => void
}

export function MakePanelSidebar({
  activeFilter,
  search,
  showSidebar,
  selectedCardType,
  selectedLibraryCardId,
  visibleCards,
  totalCards,
  libraryVisibleCount,
  libraryTotalCount,
  filteredGroups,
  libraryGroups,
  onFilterChange,
  onSearchChange,
  onSelectCardType,
  onSelectLibraryCard,
  onToggleSidebar,
}: MakePanelSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [expandedTypeGroups, setExpandedTypeGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (libraryGroups.length === 0) return
    setExpandedProjects((prev) => {
      const next = { ...prev }
      let changed = false
      for (const [index, group] of libraryGroups.entries()) {
        if (group.id in next) continue
        next[group.id] = group.isCurrent || index === 0
        changed = true
      }
      return changed ? next : prev
    })
  }, [libraryGroups])

  useEffect(() => {
    if (libraryGroups.length === 0) return
    setExpandedTypeGroups((prev) => {
      const next = { ...prev }
      let changed = false

      for (const group of libraryGroups) {
        for (const [index, cardTypeGroup] of group.cardTypeGroups.entries()) {
          const key = `${group.id}:${cardTypeGroup.id}`
          if (key in next) continue
          next[key] = index === 0
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [libraryGroups])

  if (!showSidebar) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center border-r border-neutral-200 bg-white/90 py-3">
        <button
          type="button"
          onClick={() => onToggleSidebar(true)}
          title="Expand block library"
          className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => onToggleSidebar(true)}
          className="mt-3 rounded-md px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 [writing-mode:vertical-rl] [text-orientation:mixed]"
        >
          Blocks
        </button>
      </div>
    )
  }

  const isLibraryView = activeFilter === "library"

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-100 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold tracking-tight text-neutral-900">Block library</p>
            <p className="mt-0.5 text-[10px] text-neutral-400">
              {isLibraryView ? "Browse saved blocks by project" : "Choose a block to configure"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleSidebar(false)}
            title="Collapse block library"
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ChevronRight size={15} className="rotate-180" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={["rounded px-2 py-1 text-[9px] font-semibold", MAKE_BLUE_BADGE].join(" ")}>
            {isLibraryView ? libraryVisibleCount : visibleCards} visible
          </span>
          <span className="rounded bg-neutral-100 px-2 py-1 text-[9px] font-semibold text-neutral-500">
            {isLibraryView ? libraryTotalCount : totalCards} total
          </span>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2 pt-2.5">
        <input
          type="search"
          placeholder={isLibraryView ? "Search saved blocks…" : "Search block types…"}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className={`min-h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 ${MAKE_BLUE_INPUT_FOCUS}`}
        />
      </div>

      <div className="shrink-0 flex gap-1 px-3 pb-2.5">
        {(["all", "resources", "tools", "experiences", "library"] as const).map((filter) => {
          const isActive = activeFilter === filter
          const groupAccent = filter !== "all" && filter !== "library" ? GROUP_ACCENT[filter] : null
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={[
                "flex min-h-8 flex-1 items-center justify-center rounded-md px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                isActive
                  ? groupAccent
                    ? groupAccent.pillActive
                    : filter === "library"
                      ? "bg-neutral-900 text-white"
                      : MAKE_BLUE_ACTIVE_SOFT
                  : groupAccent
                    ? `bg-neutral-100 ${groupAccent.pill} hover:opacity-80`
                    : filter === "library"
                      ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
              ].join(" ")}
            >
              {FILTER_LABELS[filter]}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLibraryView ? (
          <div className="px-2 pb-3">
            {libraryGroups.map((group) => {
              const isExpanded = expandedProjects[group.id] ?? group.isCurrent
              return (
                <section key={group.id} className="mb-2 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/60">
                  <button
                    type="button"
                    onClick={() => setExpandedProjects((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white"
                  >
                    {isExpanded ? <ChevronDown size={14} className="shrink-0 text-neutral-500" /> : <ChevronRight size={14} className="shrink-0 text-neutral-500" />}
                    <FolderOpen size={14} className="shrink-0 text-neutral-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-semibold text-neutral-900">{group.title}</p>
                        <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
                          {group.cards.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-neutral-400">
                        {group.isCurrent ? "Current project" : "Saved project"}
                      </p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-200 bg-white px-1.5 py-1.5">
                      {group.cardTypeGroups.map((cardTypeGroup) => (
                        <div key={cardTypeGroup.id} className="mb-2 last:mb-0">
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${group.id}:${cardTypeGroup.id}`
                              setExpandedTypeGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }))
                            }}
                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-50"
                          >
                            {(expandedTypeGroups[`${group.id}:${cardTypeGroup.id}`] ?? true)
                              ? <ChevronDown size={12} className="shrink-0 text-neutral-400" />
                              : <ChevronRight size={12} className="shrink-0 text-neutral-400" />}
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                              {cardTypeGroup.label}
                            </p>
                            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">
                              {cardTypeGroup.cards.length}
                            </span>
                          </button>

                          {(expandedTypeGroups[`${group.id}:${cardTypeGroup.id}`] ?? true) && cardTypeGroup.cards.map((card) => {
                            const meta = CARD_TYPE_META[card.cardType]
                            const isSelected = selectedLibraryCardId === card.id
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => onSelectLibraryCard(card)}
                                className={[
                                  "mb-1 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-all last:mb-0",
                                  isSelected ? "bg-neutral-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]" : "hover:bg-neutral-50",
                                ].join(" ")}
                              >
                                <div className={[
                                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                  isSelected ? "border-white/15 bg-white/10" : "border-neutral-200 bg-neutral-50",
                                ].join(" ")}>
                                  <meta.icon size={13} className={isSelected ? "text-white" : "text-neutral-500"} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={["truncate text-[12px] font-semibold", isSelected ? "text-white" : "text-neutral-800"].join(" ")}>
                                    {card.title}
                                  </p>
                                  <p className={["mt-0.5 text-[10px]", isSelected ? "text-white/70" : "text-neutral-400"].join(" ")}>
                                    {meta.label}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}

            {libraryGroups.length === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-[12px] text-neutral-400">
                  {libraryTotalCount > 0 ? "No saved blocks match your search." : "No saved blocks yet."}
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const accent = GROUP_ACCENT[group.id]
            return (
              <div key={group.id}>
                <div className="flex items-center gap-1.5 px-4 pb-1 pt-3">
                  <div className={["h-1.5 w-1.5 rounded-full", accent.dot].join(" ")} />
                  <p className={["text-[9px] font-bold uppercase tracking-widest", accent.pill].join(" ")}>
                    {group.label}
                  </p>
                </div>

                {group.items.map((spec) => {
                  const isActive = spec.cardType === selectedCardType
                  return (
                    <button
                      key={spec.cardType}
                      type="button"
                      onClick={() => onSelectCardType(spec.cardType)}
                      className={["mx-auto flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-all", isActive ? "" : "hover:bg-neutral-50"].join(" ")}
                    >
                      <div className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                        isActive ? [accent.border, "shadow-sm"].join(" ") : "bg-neutral-100",
                      ].join(" ")}>
                        <spec.Icon size={12} className={isActive ? spec.accent : "text-neutral-400"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={["text-[12px] font-semibold leading-tight", isActive ? "text-neutral-900" : "text-neutral-600"].join(" ")}>
                          {spec.label}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-neutral-400">
                          {spec.description}
                        </p>
                      </div>
                      {isActive && <div className={["mt-1 h-1.5 w-1.5 shrink-0 rounded-full", accent.dot].join(" ")} />}
                    </button>
                  )
                })}
              </div>
            )
          })
        )}

        {!isLibraryView && filteredGroups.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-neutral-400">No block types match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}