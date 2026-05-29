"use client"

/**
 * Add Card panel
 *
 * Two-column layout:
 *   Left nav  (max 26rem) — grouped card type list with search + filters
 *   Editor    (flex-1) — per-type rich editor (EditorShell)
 *
 * Motion toolbar strip rendered at bottom for animation-capable types.
 */

import { DndContext } from "@dnd-kit/core"
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Plus, Check, Search, ChevronLeft, Loader2 } from "lucide-react"
import { ALL_TEMPLATE_TYPES, getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"
import type { CardId, CardType, DroppedCard, DroppedCardId, TaskId } from "../types"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import { CardRenderer } from "../cards/CardRenderer"
import { cardAspectRatio } from "../cards/cardSizing"
import { getBlockReadiness } from "./make-panel-readiness"
import { buildStudioCardContent, getStudioDefaults } from "./make-studio-tools"
import { EditorShell } from "./editors/EditorShell"
import { CARD_SPECS, GROUPS, SUBGROUPS, type CardGroup } from "./make-panel-data"
import { getDefaultCardDimensions } from "../utils/cardDefaults"
import { useMakeLibraryStore } from "../store/makeLibraryStore"
import { useCreateModeStore } from "../store/createModeStore"
import { useCourseStore } from "../store/courseStore"
import { groupStudioCardsByProject } from "./make-panel-library"
import { MakePanelSidebar, type MakePanelFilter, type MakePanelSidebarItem } from "./make-panel-sidebar"
import { MAKE_RESOURCE_ACCENT } from "./make-theme"
import {
  buildCompositionPresetContent,
  COMPOSITION_PRESETS,
  getCompositionLayout,
  getCompositionPreset,
  type CompositionPreset,
} from "./composition-presets"
import {
  applyAtlasInjection,
  getInjectionOptionsForComposition,
  type AtlasInjectionOption,
} from "./composition-injections"

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Group accent colours ─────────────────────────────────────────────────────

const GROUP_ACCENT: Record<string, { icon: string; pill: string; pillActive: string; border: string; dot: string }> = {
  materials: MAKE_RESOURCE_ACCENT,
  compositions: { icon: "text-[#00ccb3]",  pill: "text-[#00ccb3]",  pillActive: "bg-[#00ccb3] text-white",  border: "border-[#00ccb3]/20 bg-[#00ccb3]/5",  dot: "bg-[#00ccb3]"  },
}

const GROUP_LABEL: Record<CardGroup, string> = {
  materials: "Material",
  compositions: "Composition",
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
  if (spec.group === "compositions") return hasLearnerWork || hasContentSurface
  return true
}

function getPresetSidebarItem(preset: CompositionPreset): MakePanelSidebarItem {
  const layout = getCompositionLayout(preset, preset.defaultLayout)
  const meta = CARD_TYPE_META[layout.cardType]
  const slotLabels = Object.values(layout.slotDraft)
    .flat()
    .map((entry) => {
      const cardType = typeof entry === "string" ? entry : entry.cardType
      return CARD_TYPE_META[cardType]?.label ?? cardType
    })

  return {
    cardType: layout.cardType,
    label: preset.title,
    description: preset.description,
    detail: preset.description,
    fields: slotLabels,
    group: "compositions",
    subgroup: preset.purpose,
    compositionSource: "prebuilt",
    Icon: meta.icon,
    presetId: preset.id,
    layoutLabel: layout.label,
  }
}

function makePreviewCard(cardType: CardType, content: Record<string, unknown>): DroppedCard {
  return {
    id: "make-prebuilt-preview" as DroppedCardId,
    cardId: "make-prebuilt-preview-source" as CardId,
    cardType,
    taskId: "__make_prebuilt_preview__" as TaskId,
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: getDefaultCardDimensions(cardType),
    content,
    order: 0,
  }
}

function PrebuiltCompositionPreview({
  cardType,
  content,
}: {
  cardType: CardType
  content: Record<string, unknown>
}) {
  const card = useMemo(() => makePreviewCard(cardType, content), [cardType, content])
  const previewStyle = useMemo(
    () => ({
      aspectRatio: cardAspectRatio(card.dimensions),
      maxWidth: `${Math.round(card.dimensions.width)}px`,
      maxHeight: `${Math.round(card.dimensions.height)}px`,
    }),
    [card.dimensions],
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#eef2f7] p-3 sm:p-4">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 items-center justify-center">
        <div
          className="max-h-full w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
          style={previewStyle}
        >
          <DndContext>
            <CardRenderer card={card} mode="preview" draggable={false} className="h-full min-h-0" fillAvailable />
          </DndContext>
        </div>
      </div>
    </div>
  )
}

function SelectedCardPreview({ cardType, content }: { cardType: CardType; content: Record<string, unknown> }) {
  const normalizedContent = useMemo(
    () => buildStudioCardContent(cardType, content),
    [cardType, content],
  )
  const card = useMemo(() => makePreviewCard(cardType, normalizedContent), [cardType, normalizedContent])
  const previewStyle = useMemo(
    () => ({
      aspectRatio: cardAspectRatio(card.dimensions),
      maxWidth: `${Math.round(card.dimensions.width)}px`,
      maxHeight: `${Math.round(card.dimensions.height)}px`,
    }),
    [card.dimensions],
  )

  return (
    <div className="flex h-full min-h-0 bg-[#eef2f7] p-4 sm:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center">
        <div
          className="max-h-full w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
          style={previewStyle}
        >
          <DndContext>
            <CardRenderer card={card} mode="preview" draggable={false} />
          </DndContext>
        </div>
      </div>
    </div>
  )
}

function CompositionInjectionOptions({
  injectionOptions,
  injectionQuery,
  injectionSearchError,
  isInjectionSearchLoading,
  content,
  onInjectionQueryChange,
  onSelectInjection,
}: {
  injectionOptions: AtlasInjectionOption[]
  injectionQuery: string
  injectionSearchError: string | null
  isInjectionSearchLoading: boolean
  content: Record<string, unknown>
  onInjectionQueryChange: (value: string) => void
  onSelectInjection: (option: AtlasInjectionOption) => void
}) {
  const appliedInjection = content.atlasInjection && typeof content.atlasInjection === "object"
    ? content.atlasInjection as { label?: string; sourceLabel?: string }
    : null
  const normalizedQuery = injectionQuery.trim().toLowerCase()
  const visibleOptions = normalizedQuery
    ? injectionOptions.filter((option) => (
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.description.toLowerCase().includes(normalizedQuery) ||
      option.sourceLabel.toLowerCase().includes(normalizedQuery)
    ))
    : injectionOptions

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Subject
          </span>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={injectionQuery}
              onChange={(event) => onInjectionQueryChange(event.target.value)}
              placeholder="Search Atlas entities..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-[12px] font-medium text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#9eb9da]"
            />
            {isInjectionSearchLoading && (
              <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" />
            )}
          </div>
        </label>

        {visibleOptions.length > 0 && (
          <div className="grid gap-1.5">
            {visibleOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectInjection(option)}
                className="rounded-md px-1 py-1.5 text-left transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-[3px] focus:ring-primary/15"
              >
                <p className="text-[12px] font-semibold text-neutral-900">{option.label}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-500">{option.description}</p>
                <p className="mt-1 text-[10px] text-neutral-400">{option.sourceLabel}</p>
              </button>
            ))}
          </div>
        )}

        {visibleOptions.length === 0 && normalizedQuery.length >= 2 && !isInjectionSearchLoading && (
          <p className="text-[11px] leading-snug text-neutral-500">
            No source-backed matches yet.
          </p>
        )}

        {injectionSearchError && (
          <p className="text-[11px] leading-snug text-neutral-500">
            Source search unavailable. Local examples remain available.
          </p>
        )}

        {appliedInjection?.label && (
          <p className="text-[11px] leading-snug text-neutral-500">
            Subject: <span className="font-semibold text-neutral-700">{appliedInjection.label}</span>
            {appliedInjection.sourceLabel ? <span className="block text-neutral-400">{appliedInjection.sourceLabel}</span> : null}
          </p>
        )}
      </div>
    </div>
  )
}

function SelectionOptionsPanel({
  title,
  subtitle,
  accent,
  Icon,
  children,
  onBack,
}: {
  title: string
  subtitle: string
  accent: { icon: string; border: string }
  Icon: ComponentType<{ size?: number; className?: string }>
  children: ReactNode
  onBack: () => void
}) {
  return (
    <aside className="flex w-full shrink flex-col overflow-hidden border-r border-border bg-background md:w-[27rem] md:min-w-[22rem] md:max-w-[29rem]">
      <div className="shrink-0 border-b border-border/50 px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/15"
        >
          <ChevronLeft size={14} />
          Cards
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <div className={["flex h-7 w-7 shrink-0 items-center justify-center rounded-md", accent.border].join(" ")}>
            <Icon size={14} className={accent.icon} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-foreground">{title}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  )
}

// ─── Add Card Panel ───────────────────────────────────────────────────────────

export function MakePanel() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CardType>("text")
  const [activeGroup, setActiveGroup] = useState<MakePanelFilter>("materials")
  const [selectedCompositionPresetId, setSelectedCompositionPresetId] = useState<string | null>(null)
  const [contentByKey, setContentByKey] = useState<Record<string, Record<string, unknown>>>({})
  const [injectionQuery, setInjectionQuery] = useState("")
  const [dynamicInjectionOptions, setDynamicInjectionOptions] = useState<AtlasInjectionOption[]>([])
  const [isInjectionSearchLoading, setIsInjectionSearchLoading] = useState(false)
  const [injectionSearchError, setInjectionSearchError] = useState<string | null>(null)
  const [showSelectionOptions, setShowSelectionOptions] = useState(false)
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

  const selectedKey = selectedLibraryCardId
    ? `library:${selectedLibraryCardId}`
    : selectedCompositionPresetId
      ? `preset:${selectedCompositionPresetId}`
      : selected
  const selectedContent = contentByKey[selectedKey] ?? getStudioDefaults(selected)
  const readiness = getBlockReadiness(selected, selectedContent)
  const canAddToCanvas = readiness.canAddToCanvas
  const selectedCompositionPreset = selectedCompositionPresetId
    ? getCompositionPreset(selectedCompositionPresetId)
    : undefined
  const staticInjectionOptions = useMemo(
    () => selectedCompositionPresetId
      ? getInjectionOptionsForComposition(selectedCompositionPresetId)
      : [],
    [selectedCompositionPresetId],
  )
  const injectionOptions = useMemo(() => {
    const seen = new Set<string>()
    return [...dynamicInjectionOptions, ...staticInjectionOptions].filter((option) => {
      const key = `${option.compositionPresetId}:${option.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [dynamicInjectionOptions, staticInjectionOptions])

  useEffect(() => {
    setTemplateContext(activeTemplateType)
  }, [activeTemplateType])

  useEffect(() => {
    const presetId = selectedCompositionPresetId
    const query = injectionQuery.trim()
    setInjectionSearchError(null)

    if (!presetId || query.length < 2 || typeof fetch !== "function") {
      setDynamicInjectionOptions([])
      setIsInjectionSearchLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true
    setIsInjectionSearchLoading(true)

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/atlas/injections/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compositionPresetId: presetId,
            query,
            limit: 4,
          }),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({})) as {
          options?: AtlasInjectionOption[]
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Atlas source search failed.")
        }

        if (active) {
          setDynamicInjectionOptions(Array.isArray(payload.options) ? payload.options : [])
        }
      } catch (error) {
        const errorName = error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name)
          : ""
        if (errorName === "AbortError") return
        if (active) {
          setDynamicInjectionOptions([])
          setInjectionSearchError(error instanceof Error ? error.message : "Atlas source search failed.")
        }
      } finally {
        if (active) {
          setIsInjectionSearchLoading(false)
        }
      }
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [selectedCompositionPresetId, injectionQuery])

  const templateFilteredSpecs = useMemo(
    () => CARD_SPECS.filter((spec) => isCompatibleWithTemplate(spec, templateContext)),
    [templateContext],
  )

  useEffect(() => {
    if (templateFilteredSpecs.some((spec) => spec.cardType === selected)) return
    const firstCompatible = templateFilteredSpecs[0]?.cardType
    if (firstCompatible) {
      setSelected(firstCompatible)
      setSelectedCompositionPresetId(null)
      setShowSelectionOptions(false)
    }
  }, [selected, templateFilteredSpecs])

  const handleChange = useCallback((key: string, value: unknown) => {
    setContentByKey((prev) => ({
      ...prev,
      [selectedKey]: {
        ...(prev[selectedKey] ?? getStudioDefaults(selected)),
        [key]: value,
      },
    }))
  }, [selected, selectedKey])

  const subgroupLabels = new Map(
    Object.values(SUBGROUPS)
      .flat()
      .map((subgroup) => [subgroup.id, subgroup.label.toLowerCase()]),
  )

  const compositionPresetSpecs = useMemo(
    () => COMPOSITION_PRESETS.map(getPresetSidebarItem),
    [],
  )

  const visibleSpecs = useMemo<MakePanelSidebarItem[]>(() => {
    if (activeGroup !== "compositions") return templateFilteredSpecs

    const customCompositionSpecs = templateFilteredSpecs.filter((spec) => (
      spec.group === "compositions" && spec.subgroup === "layout-templates"
    ))
    const compatiblePresetSpecs = compositionPresetSpecs.filter((spec) => isCompatibleWithTemplate(spec, templateContext))
    return [...compatiblePresetSpecs, ...customCompositionSpecs]
  }, [activeGroup, compositionPresetSpecs, templateContext, templateFilteredSpecs])

  const filtered = visibleSpecs.filter((spec) => {
    const matchesGroup = activeGroup === "library" || spec.group === activeGroup
    const q = search.toLowerCase()
    const subgroupLabel = subgroupLabels.get(spec.subgroup) ?? ""
    const layoutLabel = "layoutLabel" in spec && spec.layoutLabel ? spec.layoutLabel.toLowerCase() : ""
    const fields = spec.fields.join(" ").toLowerCase()
    const matchesSearch = spec.label.toLowerCase().includes(q) || spec.description.toLowerCase().includes(q) || subgroupLabel.includes(q) || layoutLabel.includes(q) || fields.includes(q)
    return activeGroup !== "library" && matchesGroup && matchesSearch
  })

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((s) => s.group === g.id),
    subgroups: SUBGROUPS[g.id].map((subgroup) => ({
      ...subgroup,
      items: filtered.filter((s) => s.group === g.id && s.subgroup === subgroup.id),
    })).filter((subgroup) => subgroup.items.length > 0),
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
    setSelectedCompositionPresetId(null)
    setSelectedLibraryCardId(null)
    setInjectionQuery("")
    setShowSelectionOptions(true)
  }, [])

  const handleFilterChange = useCallback((filter: MakePanelFilter) => {
    setActiveGroup(filter)
    setShowSelectionOptions(false)
  }, [])

  const handleSelectCompositionPreset = useCallback((presetId: string) => {
    const preset = getCompositionPreset(presetId)
    if (!preset) return
    const layout = getCompositionLayout(preset, preset.defaultLayout)
    setActiveGroup("compositions")
    setSelected(layout.cardType)
    setSelectedCompositionPresetId(preset.id)
    setSelectedLibraryCardId(null)
    setInjectionQuery("")
    setShowSelectionOptions(true)
    setContentByKey((prev) => ({
      ...prev,
      [`preset:${preset.id}`]: buildCompositionPresetContent(preset, layout.cardType),
    }))
  }, [])

  const handleSelectLibraryCard = useCallback((card: (typeof studioCards)[number]) => {
    setSelected(card.cardType)
    setSelectedCompositionPresetId(null)
    setSelectedLibraryCardId(card.id)
    setInjectionQuery("")
    setShowSelectionOptions(true)
    setContentByKey((prev) => ({
      ...prev,
      [`library:${card.id}`]: typeof structuredClone === "function"
        ? structuredClone(card.content)
        : JSON.parse(JSON.stringify(card.content)) as Record<string, unknown>,
    }))
  }, [])

  const handleSelectInjection = useCallback((option: AtlasInjectionOption) => {
    setContentByKey((prev) => {
      const baseContent = prev[selectedKey] ?? selectedContent
      return {
        ...prev,
        [selectedKey]: applyAtlasInjection(baseContent, option),
      }
    })
    setInjectionQuery(option.label)
  }, [selectedContent, selectedKey])

  const meta = CARD_TYPE_META[selected]
  const selectedSpec = CARD_SPECS.find((s) => s.cardType === selected)
  const accent = GROUP_ACCENT[selectedSpec?.group ?? "materials"]
  const selectedTitle = selectedCompositionPreset?.title ?? meta.label
  const selectedKindLabel = selectedCompositionPreset ? "Pre-built composition" : `${GROUP_LABEL[selectedSpec?.group ?? "materials"]} card`
  const itemLabel = "card"

  return (
    <div className="flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f5f7fb_100%)]">
      {showSelectionOptions ? (
        <SelectionOptionsPanel
          title={selectedTitle}
          subtitle={selectedKindLabel}
          accent={accent}
          Icon={meta.icon}
          onBack={() => setShowSelectionOptions(false)}
        >
          {selectedCompositionPreset ? (
            <CompositionInjectionOptions
              content={selectedContent}
              injectionOptions={injectionOptions}
              injectionQuery={injectionQuery}
              injectionSearchError={injectionSearchError}
              isInjectionSearchLoading={isInjectionSearchLoading}
              onInjectionQueryChange={setInjectionQuery}
              onSelectInjection={handleSelectInjection}
            />
          ) : (
            <EditorShell
              cardType={selected}
              content={selectedContent}
              onChange={handleChange}
              surface="controls"
            />
          )}
        </SelectionOptionsPanel>
      ) : (
        <MakePanelSidebar
          activeFilter={activeGroup}
          search={search}
          showSidebar={showLibrary}
          selectedCardType={selected}
          selectedCompositionPresetId={selectedCompositionPresetId}
          selectedLibraryCardId={selectedLibraryCardId}
          libraryTotalCount={studioCards.length}
          filteredGroups={grouped}
          libraryGroups={libraryGroups}
          templateContext={templateContext}
          onFilterChange={handleFilterChange}
          onSearchChange={setSearch}
          onSelectCardType={handleSelectCardType}
          onSelectCompositionPreset={handleSelectCompositionPreset}
          onSelectLibraryCard={handleSelectLibraryCard}
          onTemplateContextChange={setTemplateContext}
          onToggleSidebar={setShowLibrary}
        />
      )}

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Editor header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2">
          <div className="flex min-w-0 items-center gap-2 pr-1">
            <div className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-md", accent.border].join(" ")}>
              <meta.icon size={14} className={accent.icon} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-neutral-900">{selectedTitle}</p>
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">{selectedKindLabel}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!canAddToCanvas && (
              <p className="hidden text-xs text-neutral-400 lg:block">
                Add a card title and content to enable this card.
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
            {selectedCompositionPreset ? (
              <PrebuiltCompositionPreview
                cardType={selected}
                content={selectedContent}
              />
            ) : showSelectionOptions ? (
              <SelectedCardPreview cardType={selected} content={selectedContent} />
            ) : (
              <EditorShell
                cardType={selected}
                content={selectedContent}
                onChange={handleChange}
                expandSidebar={!showLibrary}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
