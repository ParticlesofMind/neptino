import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react"
import { useMemo, useState } from "react"

import { ALL_TEMPLATE_TYPES, type TemplateType } from "@/lib/curriculum/template-blocks"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import type { StudioCard } from "../store/makeLibraryStore"
import type { CardType } from "../types"
import { type CardGroup, type CardSpec } from "./make-panel-data"
import type { LibraryProjectGroup } from "./make-panel-library"
import { MAKE_BLUE_ACTIVE_SOFT, MAKE_BLUE_INPUT_FOCUS, MAKE_RESOURCE_ACCENT } from "./make-theme"

const GROUP_ACCENT: Record<string, { pill: string; pillActive: string; border: string; dot: string }> = {
  resources: MAKE_RESOURCE_ACCENT,
  activities: { pill: "text-[#00ccb3]", pillActive: "bg-[#00ccb3] text-white", border: "border-[#00ccb3]/20 bg-[#00ccb3]/5", dot: "bg-[#00ccb3]" },
  experiences: { pill: "text-[#a89450]", pillActive: "bg-[#a89450] text-white", border: "border-[#a89450]/20 bg-[#a89450]/10", dot: "bg-[#a89450]" },
  layout: { pill: "text-muted-foreground", pillActive: "bg-foreground/80 text-white", border: "border-border bg-muted/40", dot: "bg-muted-foreground/60" },
}

const FILTER_LABELS: Record<string, string> = {
  all: "All",
  resources: "Resources",
  activities: "Activities",
  experiences: "Experiences",
  layout: "Compositions",
  library: "Library",
}

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  lesson: "Lesson",
  certificate: "Certificate",
  quiz: "Quiz",
  assessment: "Assessment",
  exam: "Exam",
}

export type MakePanelFilter = "all" | CardGroup | "library"

interface MakePanelSidebarProps {
  activeFilter: MakePanelFilter
  search: string
  showSidebar: boolean
  selectedCardType: CardType
  selectedLibraryCardId: string | null
  libraryTotalCount: number
  filteredGroups: Array<{ id: CardGroup; label: string; items: CardSpec[] }>
  libraryGroups: LibraryProjectGroup[]
  templateContext: TemplateType
  onFilterChange: (filter: MakePanelFilter) => void
  onSearchChange: (value: string) => void
  onSelectCardType: (cardType: CardType) => void
  onSelectLibraryCard: (card: StudioCard) => void
  onTemplateContextChange: (templateType: TemplateType) => void
  onToggleSidebar: (visible: boolean) => void
}

export function MakePanelSidebar({
  activeFilter,
  search,
  showSidebar,
  selectedCardType,
  selectedLibraryCardId,
  libraryTotalCount,
  filteredGroups,
  libraryGroups,
  templateContext,
  onFilterChange,
  onSearchChange,
  onSelectCardType,
  onSelectLibraryCard,
  onTemplateContextChange,
  onToggleSidebar,
}: MakePanelSidebarProps) {
  const [expandedProjectOverrides, setExpandedProjectOverrides] = useState<Record<string, boolean>>({})
  const [expandedTypeGroupOverrides, setExpandedTypeGroupOverrides] = useState<Record<string, boolean>>({})

  const defaultExpandedProjects = useMemo(() => {
    const next: Record<string, boolean> = {}
    for (const [index, group] of libraryGroups.entries()) {
      next[group.id] = group.isCurrent || index === 0
    }
    return next
  }, [libraryGroups])

  const expandedProjects = useMemo(
    () => ({ ...defaultExpandedProjects, ...expandedProjectOverrides }),
    [defaultExpandedProjects, expandedProjectOverrides],
  )

  const defaultExpandedTypeGroups = useMemo(() => {
    const next: Record<string, boolean> = {}
    for (const group of libraryGroups) {
      for (const [index, cardTypeGroup] of group.cardTypeGroups.entries()) {
        next[`${group.id}:${cardTypeGroup.id}`] = index === 0
      }
    }
    return next
  }, [libraryGroups])

  const expandedTypeGroups = useMemo(
    () => ({ ...defaultExpandedTypeGroups, ...expandedTypeGroupOverrides }),
    [defaultExpandedTypeGroups, expandedTypeGroupOverrides],
  )

  if (!showSidebar) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-background/90 py-3">
        <button
          type="button"
          onClick={() => onToggleSidebar(true)}
          title="Expand block library"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/15"
        >
          <ChevronRight size={16} className="rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => onToggleSidebar(true)}
          className="mt-3 rounded-md px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/15 [writing-mode:vertical-rl] [text-orientation:mixed]"
        >
          Blocks
        </button>
      </div>
    )
  }

  const isLibraryView = activeFilter === "library"
  const creationFilters = ["all", "resources", "activities", "experiences", "layout", "library"] as const

  return (
    <div className="flex w-full shrink flex-col overflow-hidden border-r border-border bg-background md:w-[27rem] md:min-w-[22rem] md:max-w-[29rem]">
      <div className="shrink-0 border-b border-border/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold tracking-tight text-foreground">Make</p>
          <button
            type="button"
            onClick={() => onToggleSidebar(false)}
            title="Collapse block library"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          >
            <ChevronRight size={15} className="rotate-180" />
          </button>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2 pt-2">
        <div className="mb-2 grid grid-cols-6 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {creationFilters.map((filter) => {
            const isActive = activeFilter === filter
            const groupAccent = filter !== "all" && filter !== "library" ? GROUP_ACCENT[filter] : null
            return (
              <button
                key={filter}
                type="button"
                data-testid={`make-filter-${filter}`}
                onClick={() => onFilterChange(filter)}
                className={[
                  "flex h-7 min-w-0 items-center justify-center rounded-md px-0.5 text-[8px] font-bold uppercase leading-none transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/15",
                  isActive
                    ? groupAccent
                      ? groupAccent.pillActive
                      : MAKE_BLUE_ACTIVE_SOFT
                    : groupAccent
                      ? `text-muted-foreground ${groupAccent.pill} hover:bg-background`
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                ].join(" ")}
              >
                {FILTER_LABELS[filter]}
              </button>
            )
          })}
        </div>
        <input
          type="search"
          placeholder={isLibraryView ? "Search saved blocks…" : "Search block types…"}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className={`min-h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 ${MAKE_BLUE_INPUT_FOCUS}`}
        />
        {!isLibraryView && (
          <>
            <label htmlFor="make-template-context" className="sr-only">
              Template
            </label>
            <select
              id="make-template-context"
              value={templateContext}
              onChange={(event) => onTemplateContextChange(event.target.value as TemplateType)}
              className={`mt-2 min-h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-semibold text-foreground outline-none transition-colors ${MAKE_BLUE_INPUT_FOCUS}`}
            >
              {ALL_TEMPLATE_TYPES.map((templateType) => (
                <option key={templateType} value={templateType}>
                  {TEMPLATE_LABELS[templateType]}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLibraryView ? (
          <div className="px-2 pb-3">
            {libraryGroups.map((group) => {
              const isExpanded = expandedProjects[group.id] ?? group.isCurrent
              return (
                <section key={group.id} className="mb-2 overflow-hidden rounded-xl border border-border bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setExpandedProjectOverrides((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-background focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                  >
                    {isExpanded ? <ChevronDown size={14} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />}
                    <FolderOpen size={14} className="shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-semibold text-foreground">{group.title}</p>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {group.cards.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {group.isCurrent ? "Current project" : "Saved project"}
                      </p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border bg-background px-1.5 py-1.5">
                      {group.cardTypeGroups.map((cardTypeGroup) => (
                        <div key={cardTypeGroup.id} className="mb-2 last:mb-0">
                          <button
                            type="button"
                            onClick={() => {
                              const key = `${group.id}:${cardTypeGroup.id}`
                              setExpandedTypeGroupOverrides((prev) => ({ ...prev, [key]: !expandedTypeGroups[key] }))
                            }}
                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/30 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                          >
                            {(expandedTypeGroups[`${group.id}:${cardTypeGroup.id}`] ?? true)
                              ? <ChevronDown size={12} className="shrink-0 text-muted-foreground/70" />
                              : <ChevronRight size={12} className="shrink-0 text-muted-foreground/70" />}
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                              {cardTypeGroup.label}
                            </p>
                            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
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
                                  "mb-1 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/15 last:mb-0",
                                  isSelected ? "bg-neutral-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]" : "hover:bg-muted/30",
                                ].join(" ")}
                              >
                                <div className={[
                                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                  isSelected ? "border-white/15 bg-white/10" : "border-border bg-muted/40",
                                ].join(" ")}>
                                  <meta.icon size={13} className={isSelected ? "text-white" : "text-muted-foreground"} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={["truncate text-[12px] font-semibold", isSelected ? "text-white" : "text-foreground"].join(" ")}>
                                    {card.title}
                                  </p>
                                  <p className={["mt-0.5 text-[10px]", isSelected ? "text-white/70" : "text-muted-foreground/70"].join(" ")}>
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
                <p className="text-[12px] text-muted-foreground/70">
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
                      data-testid={`make-card-type-${spec.cardType}`}
                      onClick={() => onSelectCardType(spec.cardType)}
                      className={["mx-auto flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/15", isActive ? "" : "hover:bg-muted/30"].join(" ")}
                    >
                      <div className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                        isActive ? [accent.border, "shadow-sm"].join(" ") : "bg-muted/40",
                      ].join(" ")}>
                        <spec.Icon size={12} className={isActive ? accent.pill : "text-muted-foreground/70"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={["text-[12px] font-semibold leading-tight", isActive ? "text-foreground" : "text-foreground/70"].join(" ")}>
                          {spec.label}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground/70">
                          {spec.description}
                        </p>
                        {spec.group === "layout" && spec.fields.length > 0 && (
                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground/60">
                            {spec.fields.slice(0, 3).join(" • ")}
                          </p>
                        )}
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
            <p className="text-[12px] text-muted-foreground/70">No block types match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
