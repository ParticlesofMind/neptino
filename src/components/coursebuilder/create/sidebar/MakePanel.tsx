"use client"

/**
 * Make Panel — redesigned
 *
 * Two-column layout:
 *   Left nav  (max 26rem) — grouped card type list with search + filters
 *   Editor    (flex-1) — per-type rich editor (EditorShell)
 *
 * Motion toolbar strip rendered at bottom for animation-capable types.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Check } from "lucide-react"
import { ALL_TEMPLATE_TYPES, getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"
import type { CardType } from "../types"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import { getBlockReadiness } from "./make-panel-readiness"
import { buildStudioCardContent, getStudioDefaults } from "./make-studio-tools"
import { EditorShell } from "./editors/EditorShell"
import { CARD_SPECS, GROUPS, type CardGroup } from "./make-panel-data"
import { useMakeLibraryStore } from "../store/makeLibraryStore"
import { useCreateModeStore } from "../store/createModeStore"
import { useCourseStore } from "../store/courseStore"
import { groupStudioCardsByProject } from "./make-panel-library"
import { MakePanelSidebar, type MakePanelFilter } from "./make-panel-sidebar"
import { MAKE_RESOURCE_ACCENT } from "./make-theme"

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Group accent colours ─────────────────────────────────────────────────────

const GROUP_ACCENT: Record<string, { icon: string; pill: string; pillActive: string; border: string; dot: string }> = {
  resources: MAKE_RESOURCE_ACCENT,
  activities:  { icon: "text-[#00ccb3]",  pill: "text-[#00ccb3]",  pillActive: "bg-[#00ccb3] text-white",  border: "border-[#00ccb3]/20 bg-[#00ccb3]/5",  dot: "bg-[#00ccb3]"  },
  experiences: { icon: "text-[#a89450]", pill: "text-[#a89450]", pillActive: "bg-[#a89450] text-white", border: "border-[#a89450]/20 bg-[#a89450]/5", dot: "bg-[#a89450]" },
  layout:      { icon: "text-neutral-600", pill: "text-neutral-600", pillActive: "bg-neutral-600 text-white", border: "border-neutral-200 bg-neutral-50",     dot: "bg-neutral-400" },
}

const GROUP_LABEL: Record<CardGroup, string> = {
  resources: "Resource",
  activities: "Activity",
  experiences: "Experience",
  layout: "Composition",
}

function isTemplateType(value: unknown): value is TemplateType {
  return typeof value === "string" && (ALL_TEMPLATE_TYPES as string[]).includes(value)
}

function isCompatibleWithTemplate(spec: { cardType: CardType; group: CardGroup }, templateType: TemplateType): boolean {
  const blocks = getDefaultBlocksForType(templateType)
  const hasScoring = blocks.includes("scoring")
  const hasLearnerWork = hasScoring || blocks.includes("assignment")
  const hasContentSurface = blocks.some((block) => block === "content" || block === "resources" || block === "assignment" || block === "scoring")

  if (spec.cardType === "interactive") return hasScoring
  if (spec.group === "activities") return hasLearnerWork
  if (spec.group === "experiences" || spec.group === "layout") return hasContentSurface
  return true
}

// ─── Make Panel ────────────────────────────────────────────────────────────────

export function MakePanel() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CardType>("text")
  const [activeGroup, setActiveGroup] = useState<MakePanelFilter>("all")
  const [contentByType, setContentByType] = useState<Partial<Record<CardType, Record<string, unknown>>>>({})
  const [showLibrary, setShowLibrary] = useState(true)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [selectedLibraryCardId, setSelectedLibraryCardId] = useState<string | null>(null)
  const [templateContext, setTemplateContext] = useState<TemplateType>("lesson")

  const addCard = useMakeLibraryStore((s) => s.addCard)
  const studioCards = useMakeLibraryStore((s) => s.cards)
  const setMode = useCreateModeStore((s) => s.setMode)
  const sessions = useCourseStore((s) => s.sessions)
  const activeSessionId = useCourseStore((s) => s.activeSessionId)
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0]
  const currentProjectId = activeSession?.courseId ? String(activeSession.courseId) : undefined
  const currentProjectTitle = activeSession?.courseTitle?.trim() || activeSession?.title?.trim() || "Untitled course"
  const rawTemplateType = activeSession?.templateType
  const activeTemplateType = isTemplateType(rawTemplateType) ? rawTemplateType : "lesson"

  const selectedContent = contentByType[selected] ?? getStudioDefaults(selected)
  const readiness = getBlockReadiness(selected, selectedContent)
  const canAddToCanvas = readiness.canAddToCanvas

  useEffect(() => {
    setTemplateContext(activeTemplateType)
  }, [activeTemplateType])

  const templateFilteredSpecs = useMemo(
    () => CARD_SPECS.filter((spec) => isCompatibleWithTemplate(spec, templateContext)),
    [templateContext],
  )

  useEffect(() => {
    if (templateFilteredSpecs.some((spec) => spec.cardType === selected)) return
    const firstCompatible = templateFilteredSpecs[0]?.cardType
    if (firstCompatible) setSelected(firstCompatible)
  }, [selected, templateFilteredSpecs])

  const handleChange = useCallback((key: string, value: unknown) => {
    setContentByType((prev) => ({
      ...prev,
      [selected]: {
        ...(prev[selected] ?? getStudioDefaults(selected)),
        [key]: value,
      },
    }))
  }, [selected])

  const filtered = templateFilteredSpecs.filter((spec) => {
    const matchesGroup = activeGroup === "all" || activeGroup === "library" || spec.group === activeGroup
    const q = search.toLowerCase()
    const matchesSearch = spec.label.toLowerCase().includes(q) || spec.description.toLowerCase().includes(q)
    return activeGroup !== "library" && matchesGroup && matchesSearch
  })

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((s) => s.group === g.id),
  })).filter((g) => g.items.length > 0)
  const libraryGroups = groupStudioCardsByProject(studioCards, search, currentProjectId)

  const handleAddToCanvas = () => {
    if (!canAddToCanvas) return
    addCard(
      selected,
      buildStudioCardContent(selected, selectedContent),
      currentProjectId ? { id: currentProjectId, title: currentProjectTitle } : undefined,
    )
    setAddedFeedback(true)
    setTimeout(() => {
      setAddedFeedback(false)
      setMode("curate")
    }, 800)
  }

  const handleSelectCardType = useCallback((cardType: CardType) => {
    setSelected(cardType)
    setSelectedLibraryCardId(null)
  }, [])

  const handleSelectLibraryCard = useCallback((card: (typeof studioCards)[number]) => {
    setSelected(card.cardType)
    setSelectedLibraryCardId(card.id)
    setContentByType((prev) => ({
      ...prev,
      [card.cardType]: typeof structuredClone === "function"
        ? structuredClone(card.content)
        : JSON.parse(JSON.stringify(card.content)) as Record<string, unknown>,
    }))
  }, [])

  const meta = CARD_TYPE_META[selected]
  const selectedSpec = CARD_SPECS.find((s) => s.cardType === selected)
  const accent = GROUP_ACCENT[selectedSpec?.group ?? "resources"]
  const isLayoutSelection = selectedSpec?.group === "layout"
  const itemLabel = isLayoutSelection ? "composition" : "block"

  return (
    <div className="flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f5f7fb_100%)]">
      <MakePanelSidebar
        activeFilter={activeGroup}
        search={search}
        showSidebar={showLibrary}
        selectedCardType={selected}
        selectedLibraryCardId={selectedLibraryCardId}
        libraryTotalCount={studioCards.length}
        filteredGroups={grouped}
        libraryGroups={libraryGroups}
        templateContext={templateContext}
        onFilterChange={setActiveGroup}
        onSearchChange={setSearch}
        onSelectCardType={handleSelectCardType}
        onSelectLibraryCard={handleSelectLibraryCard}
        onTemplateContextChange={setTemplateContext}
        onToggleSidebar={setShowLibrary}
      />

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Editor header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-2 pr-1">
            <div className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-md", accent.border].join(" ")}>
              <meta.icon size={14} className={accent.icon} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-neutral-900">{meta.label}</p>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">{GROUP_LABEL[selectedSpec?.group ?? "resources"]} block</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!canAddToCanvas && (
              <p className="hidden text-xs text-neutral-400 lg:block">
                {isLayoutSelection
                  ? "Add a composition name to enable this composition."
                  : "Add a card title and content to enable this block."}
              </p>
            )}
            <button
              type="button"
              data-testid="make-add-block"
              onClick={handleAddToCanvas}
              title={canAddToCanvas ? `Add ${itemLabel} to canvas` : `Complete this ${itemLabel} before adding it to the canvas`}
              disabled={!canAddToCanvas}
              className={[
                "group flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/15 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
                addedFeedback
                  ? "border-[#5c9970] bg-[#5c9970] text-white shadow-[0_10px_24px_rgba(92,153,112,0.18)] hover:bg-[#5c9970]"
                  : canAddToCanvas
                    ? "border-neutral-200 bg-white text-neutral-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:-translate-y-px hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.10)]"
                    : "border-neutral-200 bg-neutral-100 text-neutral-400 shadow-none",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                  addedFeedback ? "bg-white/15 group-hover:bg-white/20" : canAddToCanvas ? "bg-neutral-100 group-hover:bg-neutral-200" : "bg-white",
                ].join(" ")}
              >
                {addedFeedback ? <Check size={12} /> : <Plus size={12} />}
              </span>
              <span>{addedFeedback ? `Added ${itemLabel}` : `Add ${itemLabel}`}</span>
            </button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <EditorShell
              cardType={selected}
              content={selectedContent}
              onChange={handleChange}
              expandSidebar={!showLibrary}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
