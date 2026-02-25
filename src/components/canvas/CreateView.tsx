"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Text as PixiText, TextStyle } from "pixi.js"
import { DEFAULT_PAGE_CONFIG, type CanvasPageConfig, type CanvasViewportInfo, type PixiTemplateLayoutMeasurement, type PixiTemplateLayoutModel, type ToolConfig } from "@/components/canvas/PixiCanvas"
import { PixiWidgetSurface } from "@/components/canvas/PixiWidgetSurface"
import { DomTemplateSurface } from "@/components/canvas/DomTemplateSurface"
import { CanvasOverlayControls } from "@/components/canvas/CanvasOverlayControls"
import { MediaLibraryPanel } from "@/components/canvas/MediaLibraryPanel"
import { InspectorPanel } from "@/components/canvas/InspectorPanel"
import { PixiLayoutPager } from "@/components/canvas/PixiLayoutPager"
import { useMediaLibraryAssets } from "@/components/canvas/use-media-library-assets"
import { useCourseCanvasContext } from "@/components/canvas/use-course-canvas-context"
import { useCanvasDocumentState } from "@/components/canvas/use-canvas-document-state"
import { useTemplateProjectionState } from "@/components/canvas/use-template-projection-state"
import type {
  AnimateTool,
  BuildTool,
  InspectorPanelView,
  MediaAsset,
  Mode,
  OverlayUi,
  SnapReference,
  ToolItem,
} from "@/components/canvas/create-view-types"
import { createClient } from "@/lib/supabase/client"
import {
  Bot,
  // tools
  MousePointer2, PenTool, Paintbrush, Type, Shapes, Table, Eraser,
  // modes / animate
  Clapperboard,
} from "lucide-react"

const DEFAULT_CANVAS_ZOOM = 100
const ZOOM_STEP = 5

// ─── Resize handle hook ─────────────────────────────────────────────────────────────────

/**
 * `direction`:
 *   "right" → dragging RIGHT increases width (left panel, handle on its right edge)
 *   "left"  → dragging LEFT  increases width (right panel, handle on its left edge)
 */
function useResizeHandle(
  initial: number,
  direction: "right" | "left" = "right",
  min = 0,
  max = 600,
) {
  const [width, setWidth] = useState(initial)

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startW = width
    const dir = direction
    const mn = min
    const mx = max
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => {
      const delta = dir === "right" ? ev.clientX - startX : startX - ev.clientX
      setWidth(Math.max(mn, Math.min(mx, startW + delta)))
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [direction, max, min, width])

  return { width, setWidth, startResize }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const BUILD_TOOLS: ToolItem<BuildTool>[] = [
  { id: "selection", label: "Select",   iconNode: <MousePointer2 className="h-5 w-5" /> },
  { id: "pen",       label: "Pen",      iconNode: <PenTool       className="h-5 w-5" /> },
  { id: "brush",     label: "Brush",    iconNode: <Paintbrush    className="h-5 w-5" /> },
  { id: "text",      label: "Text",     iconNode: <Type          className="h-5 w-5" /> },
  { id: "shapes",    label: "Shapes",   iconNode: <Shapes        className="h-5 w-5" /> },
  { id: "tables",    label: "Tables",   iconNode: <Table         className="h-5 w-5" /> },
  { id: "generate",  label: "Generate", iconNode: <Bot           className="h-5 w-5" /> },
  { id: "eraser",    label: "Eraser",   iconNode: <Eraser        className="h-5 w-5" /> },
]

const ANIMATE_TOOLS: ToolItem<AnimateTool>[] = [
  { id: "selection", label: "Select", iconNode: <MousePointer2 className="h-5 w-5" /> },
  { id: "scene",     label: "Scene",  iconNode: <Clapperboard  className="h-5 w-5" /> },
  { id: "path",      label: "Path",   iconNode: <PenTool       className="h-5 w-5" /> },
  { id: "modify",    label: "Modify", iconNode: <Shapes        className="h-5 w-5" /> },
]

// ─── CreateView ───────────────────────────────────────────────────────────────

export function CreateView({
  canvasConfig,
  courseId,
}: {
  canvasConfig?: CanvasPageConfig | null
  courseId?: string | null
} = {}) {
  const mediaPanelWidthStorageKey = "create-view:media-panel-width"
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<Mode>("build")
  const [activeTool, setActiveTool] = useState<BuildTool | AnimateTool>("selection")

  // Pan mode — toggled by the Grab perspective button.
  // When active the canvas uses "grab" cursor/panning regardless of activeTool.
  const [panMode, setPanMode] = useState(false)

  const [panelView, setPanelView] = useState<InspectorPanelView>("layers")
  const [currentPage, setCurrentPage] = useState(1)
  const [focusPageRequest, setFocusPageRequest] = useState<number | null>(null)
  const {
    courseTitle,
    courseType,
    courseLanguage,
    teacherName,
    institutionName,
    lessonPages,
    templateVisualDensity,
  } = useCourseCanvasContext({
    courseId,
    supabase,
  })
  const totalPages = lessonPages.length > 0 ? lessonPages.length : (canvasConfig?.pageCount ?? 1)
  const [zoom, setZoom] = useState(DEFAULT_CANVAS_ZOOM)
  const [viewportInfo, setViewportInfo] = useState<CanvasViewportInfo | null>(null)
  const [mediaDragActive, setMediaDragActive] = useState(false)
  const [dropFeedback, setDropFeedback] = useState<string | null>(null)
  const [scrollDisabled, setScrollDisabled] = useState(false)
  const [pixiLayoutPageByScope, setPixiLayoutPageByScope] = useState<Record<string, number>>({})
  const [pixiMeasuredSectionHeightsByScope, setPixiMeasuredSectionHeightsByScope] = useState<Record<string, Record<string, number>>>({})

  const {
    activeMedia,
    setActiveMedia,
    mediaSearch,
    setMediaSearch,
    mediaLoading,
    wikipediaLoading,
    mediaItems,
  } = useMediaLibraryAssets({
    supabase,
    courseTitle,
  })

  const [snapMenuOpen, setSnapMenuOpen] = useState(false)
  const [snapReference, setSnapReference] = useState<SnapReference>("canvas")

  // Resizable panels — can be dragged to 0 (canvas overlays always remain)
  const leftPanel  = useResizeHandle(320, "right", 0, 520)
  const rightPanel = useResizeHandle(224, "left",  0, 400)
  const setLeftPanelWidth = leftPanel.setWidth

  useEffect(() => {
    try {
      const storedWidth = window.localStorage.getItem(mediaPanelWidthStorageKey)
      if (!storedWidth) return
      const parsedWidth = Number.parseInt(storedWidth, 10)
      if (!Number.isFinite(parsedWidth)) return
      setLeftPanelWidth(Math.max(0, Math.min(520, parsedWidth)))
    } catch {
      // Ignore storage access issues.
    }
  }, [mediaPanelWidthStorageKey, setLeftPanelWidth])

  useEffect(() => {
    try {
      window.localStorage.setItem(mediaPanelWidthStorageKey, String(Math.round(leftPanel.width)))
    } catch {
      // Ignore storage access issues.
    }
  }, [leftPanel.width, mediaPanelWidthStorageKey])

  // Tool options state — build
  const [penSize, setPenSize] = useState(2)
  const [penColor, setPenColor] = useState("#282a29")
  const [penFill, setPenFill] = useState("#fef6eb")
  const [brushSize, setBrushSize] = useState(20)
  const [brushColor, setBrushColor] = useState("#2b8059")
  const [fontSize, setFontSize] = useState("16")
  const [fontFamily, setFontFamily] = useState("Arial")
  const [fontBold, setFontBold] = useState(false)
  const [fontItalic, setFontItalic] = useState(false)
  const [textColor, setTextColor] = useState("#282a29")
  const [shapeType, setShapeType] = useState("rectangle")
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#282a29")
  const [shapeFillColor, setShapeFillColor] = useState("transparent")
  const [eraserSize, setEraserSize] = useState(20)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [tableType, setTableType] = useState("basic")
  const [generateType, setGenerateType] = useState("text")
  const [generatePrompt, setGeneratePrompt] = useState("")
  // Tool options state — animate
  const [selectionMode, setSelectionMode] = useState<"contain" | "intersect">("contain")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [sceneDuration, setSceneDuration] = useState(5)
  const [pathAdherence, setPathAdherence] = useState(0.5)
  const [modifyTime, setModifyTime] = useState(0)

  const effectiveCanvasConfig = useMemo<CanvasPageConfig>(() => {
    const base = canvasConfig ?? DEFAULT_PAGE_CONFIG
    return {
      ...base,
      pageCount: totalPages,
    }
  }, [canvasConfig, totalPages])

  const clampedCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages))

  const currentLessonPage = useMemo(
    () => lessonPages.find((page) => page.globalPage === clampedCurrentPage) ?? null,
    [lessonPages, clampedCurrentPage],
  )

  const currentDocumentKey = useMemo(() => {
    if (!courseId || !currentLessonPage) return null
    return `${courseId}:${currentLessonPage.globalPage}`
  }, [courseId, currentLessonPage])

  const currentCanvasScopeKey = useMemo(
    () => currentDocumentKey ?? `local:${clampedCurrentPage}`,
    [clampedCurrentPage, currentDocumentKey],
  )

  const {
    currentDroppedMediaByArea,
    onDropAreaMedia,
    onPixiAreaDrop,
    onRemoveAreaMedia,
  } = useCanvasDocumentState({
    supabase,
    courseId,
    lessonPages,
    currentLessonPageGlobal: currentLessonPage?.globalPage ?? null,
    currentDocumentKey,
    currentCanvasScopeKey,
    setMediaDragActive,
    onDropPlacementResult: (result) => {
      if (result.status === "placed-next" && typeof result.targetPageGlobal === "number") {
        setDropFeedback(`Placed on Page ${result.targetPageGlobal} to keep this canvas clean.`)
      } else if (result.status === "rejected-no-fit") {
        setDropFeedback("No fitting page found for this media in the current lesson flow.")
      } else if (result.status === "rejected-invalid") {
        setDropFeedback("This drop area is not valid. Use Instruction, Student, or Teacher areas.")
      } else {
        setDropFeedback(null)
      }
    },
  })

  useEffect(() => {
    if (!dropFeedback) return
    const timeoutHandle = window.setTimeout(() => setDropFeedback(null), 2800)
    return () => window.clearTimeout(timeoutHandle)
  }, [dropFeedback])

  const {
    hasHeaderBlock,
    hasFooterBlock,
    templateFieldEnabled,
    perPageTemplateEnabledMap,
    headerFieldValues,
    footerFieldValues,
    templateData,
    lessonHeaderTooltip,
    lessonMetaText,
  } = useTemplateProjectionState({
    currentLessonPage,
    clampedCurrentPage,
    totalPages,
    courseTitle,
    courseType,
    courseLanguage,
    teacherName,
    institutionName,
  })

  const lessonNavigation = useMemo(() => {
    const bySession = new Map<string, { label: string; start: number; end: number }>()
    lessonPages.forEach((page) => {
      const existing = bySession.get(page.sessionId)
      if (!existing) {
        bySession.set(page.sessionId, {
          label: `${page.moduleName} · Lesson ${page.lessonNumber}`,
          start: page.globalPage,
          end: page.globalPage,
        })
      } else {
        existing.end = page.globalPage
      }
    })
    return Array.from(bySession.values())
  }, [lessonPages])

  const onDragStartMedia = useCallback((asset: MediaAsset, event: React.DragEvent) => {
    setMediaDragActive(true)
    event.dataTransfer.effectAllowed = "copy"
    const payload = JSON.stringify(asset)
    event.dataTransfer.setData("application/json", payload)
    event.dataTransfer.setData("text/plain", payload)
  }, [])

  const overlayUi = useMemo<OverlayUi>(() => {
    return {
      // ── Template overlay (fixed sizes - don't scale with zoom) ──
      headerPadding: "px-4 py-3",
      headerTitle: "text-lg",
      headerMeta: "text-sm",
      headerChip: "text-xs",
      blockPadding: "px-3 py-2",
      blockLabel: "text-xs",
      blockCount: "text-xs",
      cellLabel: "text-xs",
      cellValue: "text-sm",
      nestedLabel: "text-xs",
      nestedValue: "text-sm",
      footerText: "text-sm",
      footerChip: "text-xs",
      nestedLines: "line-clamp-2",
      low: false,
      // ── Panels (left/right) ──
      panelHeaderPadding: "px-3 py-2",
      panelHeaderText: "text-xs",
      panelHeaderIcon: "h-3 w-3",
      panelSearchPadding: "px-3 py-2.5",
      panelSearchInput: "px-2.5 py-1.5 text-xs",
      panelContentPadding: "p-2",
      panelItemPadding: "px-1 py-1",
      panelItemText: "text-xs",
      panelItemIcon: "h-3.5 w-3.5",
      // ── Media category buttons ──
      mediaCategoryPadding: "p-1.5",
      mediaCategoryIcon: "h-5 w-5",
      mediaCategoryLabel: "text-[9px]",
      // ── Toolbar & controls ──
      toolbarPadding: "px-3 py-1.5",
      toolbarGap: "gap-2",
      toolButtonPadding: "p-1.5",
      toolButtonIcon: "h-5 w-5",
      toolButtonLabel: "text-[10px]",
      controlLabel: "text-[10px]",
      controlInput: "text-xs px-2 py-0.5",
      controlButton: "text-xs px-2 py-0.5",
      // ── Zoom & scroll controls ──
      zoomButtonPadding: "p-1",
      zoomButtonIcon: "h-4 w-4",
      zoomValueText: "text-[10px]",
      scrollButtonPadding: "p-1",
      scrollButtonIcon: "h-4 w-4",
      scrollInputText: "text-[10px] w-10",
      scrollPageText: "text-[10px]",
    }
  }, [])

  const usePixiTemplateLayout = false
  const measuredSectionHeights = useMemo(
    () => pixiMeasuredSectionHeightsByScope[currentCanvasScopeKey] ?? {},
    [currentCanvasScopeKey, pixiMeasuredSectionHeightsByScope],
  )

  const basePixiTemplateLayoutModel = useMemo<PixiTemplateLayoutModel | null>(() => {
    if (!usePixiTemplateLayout) return null
    if (!currentLessonPage) return null

    const sections: PixiTemplateLayoutModel["sections"] = []
    const formatList = (values: string[], fallback: string) => (values.length > 0 ? values : [fallback])

    const describeAreaKey = (prefix: "content" | "assignment", areaKey: string): string => {
      const parts = areaKey.split(":")
      const topicIdx = Number.parseInt(parts[1] ?? "0", 10)
      const objectiveIdx = Number.parseInt(parts[2] ?? "0", 10)
      const taskIdx = Number.parseInt(parts[3] ?? "0", 10)
      const areaRaw = String(parts[4] ?? "area")
      const areaLabel = areaRaw.charAt(0).toUpperCase() + areaRaw.slice(1)

      const groups = prefix === "content"
        ? (templateData?.contentItems?.topicGroups ?? [])
        : (templateData?.assignmentItems?.topicGroups ?? [])
      const topicGroup = groups[topicIdx]
      const objectiveGroup = topicGroup?.objectives?.[objectiveIdx]
      const taskLabel = objectiveGroup?.tasks?.[taskIdx]?.task

      const topicLabel = topicGroup?.topic ? `Topic ${topicIdx + 1}: ${topicGroup.topic}` : `Topic ${topicIdx + 1}`
      const objectiveLabel = objectiveGroup?.objective
        ? `Objective ${objectiveIdx + 1}: ${objectiveGroup.objective}`
        : `Objective ${objectiveIdx + 1}`
      const taskLine = taskLabel ? `Task ${taskIdx + 1}: ${taskLabel}` : `Task ${taskIdx + 1}`

      return `${topicLabel} · ${objectiveLabel} · ${taskLine} · ${areaLabel} Area`
    }

    const mediaZonesForPrefix = (prefix: "content" | "assignment") => {
      return Object.entries(currentDroppedMediaByArea)
        .filter(([areaKey]) => areaKey.startsWith(`${prefix}:`))
        .map(([areaKey, items]) => ({
          areaKey,
          title: describeAreaKey(prefix, areaKey),
          items: items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            url: item.url,
            mediaType: item.mediaType,
            category: item.category,
          })),
        }))
    }

    if (perPageTemplateEnabledMap.program) {
      const rows = templateData?.programRows ?? []
      sections.push({
        key: "program",
        id: "program",
        title: "Program",
        lines: rows.length > 0
          ? rows.slice(0, 5).map((row, idx) => `${idx + 1}. ${row.topic || "Topic"} · ${row.program_time || "—"}`)
          : ["No program rows on this page"],
      })
    }

    if (perPageTemplateEnabledMap.resources) {
      const rows = templateData?.resourceRows ?? []
      sections.push({
        key: "resources",
        id: "resources",
        title: "Resources",
        lines: rows.length > 0
          ? rows.slice(0, 6).map((row, idx) => `${idx + 1}. ${row.task || "Resource"}`)
          : ["No resources on this page"],
      })
    }

    if (perPageTemplateEnabledMap.content) {
      const contentGroups = templateData?.contentItems?.topicGroups ?? []
      const droppedCount = Object.entries(currentDroppedMediaByArea)
        .filter(([areaKey]) => areaKey.startsWith("content:"))
        .reduce((acc, [, items]) => acc + items.length, 0)
      sections.push({
        key: "content",
        id: "content",
        title: "Content",
        lines: [
          ...formatList(contentGroups.slice(0, 3).map((group, idx) => `${idx + 1}. ${group.topic}`), "No content groups on this page"),
          `Dropped media: ${droppedCount}`,
        ],
        mediaZones: mediaZonesForPrefix("content"),
      })
    }

    if (perPageTemplateEnabledMap.assignment) {
      const assignmentGroups = templateData?.assignmentItems?.topicGroups ?? []
      const droppedCount = Object.entries(currentDroppedMediaByArea)
        .filter(([areaKey]) => areaKey.startsWith("assignment:"))
        .reduce((acc, [, items]) => acc + items.length, 0)
      sections.push({
        key: "assignment",
        id: "assignment",
        title: "Assignment",
        lines: [
          ...formatList(assignmentGroups.slice(0, 3).map((group, idx) => `${idx + 1}. ${group.topic}`), "No assignment groups on this page"),
          `Dropped media: ${droppedCount}`,
        ],
        mediaZones: mediaZonesForPrefix("assignment"),
      })
    }

    if (perPageTemplateEnabledMap.scoring) {
      const scoring = templateData?.scoringItems ?? []
      sections.push({
        key: "scoring",
        id: "scoring",
        title: "Scoring",
        lines: scoring.length > 0 ? scoring.slice(0, 6) : ["No scoring criteria on this page"],
      })
    }

    return {
      title: `Lesson ${currentLessonPage.lessonNumber}: ${currentLessonPage.lessonTitle}`,
      headerChips: headerFieldValues.map((entry) => entry.value).filter(Boolean).slice(0, 6),
      sections,
      footerChips: footerFieldValues
        .filter((entry) => entry.key !== "page_number")
        .map((entry) => entry.value)
        .filter(Boolean)
        .slice(0, 5),
      pageLabel: footerFieldValues.find((entry) => entry.key === "page_number")?.value ?? `Page ${clampedCurrentPage} / ${totalPages}`,
    }
  }, [clampedCurrentPage, currentDroppedMediaByArea, currentLessonPage, footerFieldValues, headerFieldValues, perPageTemplateEnabledMap, templateData, totalPages, usePixiTemplateLayout])

  const pixiTemplateLayoutPages = useMemo<PixiTemplateLayoutModel[]>(() => {
    if (!usePixiTemplateLayout) return []
    if (!basePixiTemplateLayoutModel) return []

    const contentWidthPx = Math.max(
      320,
      effectiveCanvasConfig.widthPx - effectiveCanvasConfig.margins.left - effectiveCanvasConfig.margins.right - 24,
    )
    const contentHeightPx = Math.max(
      260,
      effectiveCanvasConfig.heightPx - effectiveCanvasConfig.margins.top - effectiveCanvasConfig.margins.bottom - 24,
    )
    const headerHeightPx = 96
    const footerHeightPx = 72
    const pageBudgetPx = Math.max(160, contentHeightPx - headerHeightPx - footerHeightPx)

    const lineTextStyle = new TextStyle({
      fontSize: 10,
      wordWrap: true,
      wordWrapWidth: Math.max(220, contentWidthPx - 32),
      breakWords: true,
    })
    const sectionTitleStyle = new TextStyle({
      fontSize: 11,
      fontWeight: "600",
      wordWrap: true,
      wordWrapWidth: Math.max(220, contentWidthPx - 32),
      breakWords: true,
    })
    const zoneTitleStyle = new TextStyle({
      fontSize: 10,
      fontWeight: "600",
      wordWrap: true,
      wordWrapWidth: Math.max(180, contentWidthPx - 48),
      breakWords: true,
    })
    const mediaItemStyle = new TextStyle({
      fontSize: 9,
      wordWrap: true,
      wordWrapWidth: Math.max(160, contentWidthPx - 64),
      breakWords: true,
    })

    const measureTextHeight = (text: string, style: TextStyle) => {
      const value = String(text || " ")
      const node = new PixiText({ text: value, style })
      const height = Math.max(14, Math.ceil(node.height || 0))
      node.destroy()
      return height
    }

    const estimateZoneHeight = (zone: NonNullable<PixiTemplateLayoutModel["sections"][number]["mediaZones"]>[number]) => {
      const zoneTitleHeight = measureTextHeight(zone.title, zoneTitleStyle)
      const mediaRowsHeight = zone.items.length > 0
        ? zone.items.reduce((acc, item) => acc + Math.max(18, measureTextHeight(item.title, mediaItemStyle) + 6), 0)
        : 18
      return 14 + zoneTitleHeight + mediaRowsHeight
    }

    const estimateSectionHeight = (
      section: PixiTemplateLayoutModel["sections"][number],
      includeLines: boolean,
      zones: NonNullable<PixiTemplateLayoutModel["sections"][number]["mediaZones"]>,
    ) => {
      const measuredHeight = measuredSectionHeights[section.key]
      if (typeof measuredHeight === "number" && Number.isFinite(measuredHeight) && measuredHeight > 0) {
        return measuredHeight
      }
      const sectionHeaderHeight = measureTextHeight(section.title, sectionTitleStyle)
      const linesHeight = includeLines
        ? section.lines.reduce((acc, line) => acc + measureTextHeight(line, lineTextStyle), 0)
        : 14
      const zonesHeight = zones.reduce((acc, zone) => acc + estimateZoneHeight(zone), 0)
      return 14 + sectionHeaderHeight + linesHeight + zonesHeight
    }

    const splitSectionIfNeeded = (section: PixiTemplateLayoutModel["sections"][number]) => {
      const zones = section.mediaZones ?? []
      if (zones.length === 0) return [section]

      const chunks: PixiTemplateLayoutModel["sections"][number][] = []
      let currentZones: typeof zones = []
      let includeLines = true

      for (const zone of zones) {
        const candidateZones = [...currentZones, zone]
        const candidateHeight = estimateSectionHeight(section, includeLines, candidateZones)
        if (candidateHeight > pageBudgetPx * 0.9 && currentZones.length > 0) {
          const chunkIndex = chunks.length
          chunks.push({
            ...section,
            key: `${section.key}:chunk:${chunkIndex}`,
            title: chunks.length === 0 ? section.title : `${section.title} (cont.)`,
            lines: includeLines ? section.lines : ["Continued"],
            mediaZones: currentZones,
          })
          currentZones = [zone]
          includeLines = false
          continue
        }
        currentZones = candidateZones
      }

      if (currentZones.length > 0) {
        const chunkIndex = chunks.length
        chunks.push({
          ...section,
          key: `${section.key}:chunk:${chunkIndex}`,
          title: chunks.length === 0 ? section.title : `${section.title} (cont.)`,
          lines: includeLines ? section.lines : ["Continued"],
          mediaZones: currentZones,
        })
      }

      return chunks.length > 0 ? chunks : [section]
    }

    const sectionChunks = basePixiTemplateLayoutModel.sections.flatMap(splitSectionIfNeeded)

    const pages: PixiTemplateLayoutModel[] = []
    let currentSections: PixiTemplateLayoutModel["sections"] = []
    let usedHeight = 0

    for (const section of sectionChunks) {
      const sectionHeight = estimateSectionHeight(section, true, section.mediaZones ?? [])
      const wouldOverflow = currentSections.length > 0 && usedHeight + sectionHeight > pageBudgetPx
      if (wouldOverflow) {
        pages.push({
          ...basePixiTemplateLayoutModel,
          sections: currentSections,
          pageLabel: "",
        })
        currentSections = []
        usedHeight = 0
      }

      currentSections.push(section)
      usedHeight += sectionHeight
    }

    if (currentSections.length > 0) {
      pages.push({
        ...basePixiTemplateLayoutModel,
        sections: currentSections,
        pageLabel: "",
      })
    }

    if (pages.length === 0) {
      return [basePixiTemplateLayoutModel]
    }

    return pages.map((pageModel, index) => ({
      ...pageModel,
      pageLabel: `${basePixiTemplateLayoutModel.pageLabel} · Canvas ${index + 1}/${pages.length}`,
    }))
  }, [basePixiTemplateLayoutModel, effectiveCanvasConfig.heightPx, effectiveCanvasConfig.margins.bottom, effectiveCanvasConfig.margins.left, effectiveCanvasConfig.margins.right, effectiveCanvasConfig.margins.top, effectiveCanvasConfig.widthPx, measuredSectionHeights, usePixiTemplateLayout])

  const activePixiLayoutPage = useMemo(() => {
    return Math.min(
      Math.max(1, pixiLayoutPageByScope[currentCanvasScopeKey] ?? 1),
      Math.max(1, pixiTemplateLayoutPages.length),
    )
  }, [currentCanvasScopeKey, pixiLayoutPageByScope, pixiTemplateLayoutPages.length])

  const activePixiTemplateLayoutModel = useMemo(() => {
    if (pixiTemplateLayoutPages.length === 0) return null
    return pixiTemplateLayoutPages[activePixiLayoutPage - 1] ?? pixiTemplateLayoutPages[0]
  }, [activePixiLayoutPage, pixiTemplateLayoutPages])

  const onPixiLayoutMeasured = useCallback((measurement: PixiTemplateLayoutMeasurement) => {
    setPixiMeasuredSectionHeightsByScope((prev) => {
      const current = prev[currentCanvasScopeKey] ?? {}
      let changed = false
      const merged = { ...current }
      Object.entries(measurement.sectionHeights).forEach(([key, height]) => {
        const normalized = Math.max(0, Math.round(height))
        if (merged[key] !== normalized) {
          merged[key] = normalized
          changed = true
        }
      })
      if (!changed) return prev
      return {
        ...prev,
        [currentCanvasScopeKey]: merged,
      }
    })
  }, [currentCanvasScopeKey])

  const changePage = useCallback(
    (next: number) => {
      const normalized = Number.isFinite(next) ? Math.round(next) : 1
      const targetPage = Math.min(Math.max(1, normalized), totalPages)
      setCurrentPage(targetPage)
      setFocusPageRequest(targetPage)
    },
    [totalPages],
  )

  const handleZoomStep = useCallback((direction: 1 | -1) => {
    setZoom((currentZoom) => Math.min(400, Math.max(10, currentZoom + (direction * ZOOM_STEP))))
  }, [])

  const handleCanvasAreaWheelCapture = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const targetElement = event.target as HTMLElement | null
    if (targetElement?.closest("canvas")) {
      return
    }

    event.preventDefault()

    if (event.ctrlKey || event.metaKey) {
      handleZoomStep(event.deltaY < 0 ? 1 : -1)
      return
    }

    if (scrollDisabled) {
      return
    }

    window.dispatchEvent(new CustomEvent("neptino-canvas-wheel", {
      detail: {
        deltaY: event.deltaY,
      },
    }))
  }, [handleZoomStep, scrollDisabled])

  const currentTools = mode === "build" ? BUILD_TOOLS : ANIMATE_TOOLS
  const selectedTool = activeTool as string

  // Canvas tool: "grab" when panMode is active, otherwise the build/animate tool
  const canvasTool: string = panMode ? "grab" : selectedTool

  // Tool configuration passed down to the canvas renderer
  const toolConfig = useMemo<ToolConfig>(() => ({
    brushSize, brushColor,
    penSize, penColor, penFill,
    fontSize, fontFamily, fontBold, fontItalic, textColor,
    shapeType, shapeStrokeWidth, shapeStrokeColor, shapeFillColor,
    eraserSize,
    tableRows, tableCols,
  }), [brushSize, brushColor, penSize, penColor, penFill, fontSize, fontFamily, fontBold, fontItalic, textColor, shapeType, shapeStrokeWidth, shapeStrokeColor, shapeFillColor, eraserSize, tableRows, tableCols])

  function handleModeChange(next: Mode) {
    setMode(next)
    setActiveTool("selection")
    setPanMode(false)
  }

  function handleToolSelect(id: string) {
    setActiveTool(id as BuildTool & AnimateTool)
    setPanMode(false)
  }

  const toolOptions = ToolOptions({ overlayUi })

  // ── Tool options bar content ────────────────────────────────────────────────

  function ToolOptions({ overlayUi }: { overlayUi: OverlayUi }) {
    // ── Animate mode tool options ────────────────────────────────────────
    if (mode === "animate") {
      switch (activeTool as AnimateTool) {
        case "selection":
          return (
            <div className="flex items-center gap-2">
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Mode</span>
              <select
                value={selectionMode}
                onChange={(e) => setSelectionMode(e.target.value as "contain" | "intersect")}
                className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              >
                <option value="contain">Contain</option>
                <option value="intersect">Intersect</option>
              </select>
            </div>
          )
        case "scene":
          return (
            <div className="flex items-center gap-2">
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Aspect</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              >
                {["16:9","4:3","1:1","9:16"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Duration</span>
              <input
                type="number" min={1} max={60} value={sceneDuration}
                onChange={(e) => setSceneDuration(Number(e.target.value))}
                className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
                aria-label="Scene duration"
              />
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>s</span>
            </div>
          )
        case "path":
          return (
            <div className="flex items-center gap-2">
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Adherence</span>
              <input
                type="range" min={0} max={1} step={0.05} value={pathAdherence}
                onChange={(e) => setPathAdherence(Number(e.target.value))}
                className="w-24"
                aria-label="Path adherence"
              />
              <span className={`${overlayUi.controlLabel} tabular-nums text-muted-foreground`}>{Math.round(pathAdherence * 100)}%</span>
            </div>
          )
        case "modify":
          return (
            <div className="flex items-center gap-2">
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Time</span>
              <input
                type="number" min={0} max={600} step={0.1} value={modifyTime}
                onChange={(e) => setModifyTime(Number(e.target.value))}
                className={`w-16 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
                aria-label="Modify time"
              />
              <span className={`${overlayUi.controlLabel} text-muted-foreground`}>s</span>
            </div>
          )
        default: return null
      }
    }

    // ── Build mode tool options ───────────────────────────────────────────────
    switch (activeTool as BuildTool) {
      case "selection":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Mode</span>
            <select
              value={selectionMode}
              onChange={(e) => setSelectionMode(e.target.value as "contain" | "intersect")}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              <option value="contain">Contain</option>
              <option value="intersect">Intersect</option>
            </select>
          </div>
        )
      case "pen":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Size</span>
            <input
              type="number"
              min={1}
              max={15}
              value={penSize}
              onChange={(e) => setPenSize(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Pen size"
            />
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Stroke</span>
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Pen stroke color"
            />
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Fill</span>
            <input
              type="color"
              value={penFill === "transparent" ? "#ffffff" : penFill}
              onChange={(e) => setPenFill(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Pen fill color"
            />
          </div>
        )
      case "text":
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              <option value="12">Normal (12pt)</option>
              <option value="26">Title (26pt)</option>
              <option value="20">H1 (20pt)</option>
              <option value="16">H2 (16pt)</option>
              <option value="14">H3 (14pt)</option>
            </select>
            <button
              type="button"
              onClick={() => setFontBold(!fontBold)}
              className={`rounded ${overlayUi.controlButton} font-bold transition ${fontBold ? "bg-accent text-primary" : "text-foreground hover:bg-muted/60"}`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => setFontItalic(!fontItalic)}
              className={`rounded ${overlayUi.controlButton} italic transition ${fontItalic ? "bg-accent text-primary" : "text-foreground hover:bg-muted/60"}`}
            >
              I
            </button>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              {["Arial", "Times New Roman", "Georgia", "Verdana", "Tahoma"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Text color"
            />
          </div>
        )
      case "brush":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Size</span>
            <input
              type="number"
              min={10}
              max={50}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Brush size"
            />
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Color</span>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Brush color"
            />
          </div>
        )
      case "shapes":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Shape</span>
            <select
              value={shapeType}
              onChange={(e) => setShapeType(e.target.value)}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              {["rectangle","ellipse","triangle","line","arrow","star"].map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Stroke</span>
            <input
              type="number"
              min={1}
              max={20}
              value={shapeStrokeWidth}
              onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Shape stroke width"
            />
            <input
              type="color"
              value={shapeStrokeColor}
              onChange={(e) => setShapeStrokeColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Shape stroke color"
            />
            <input
              type="color"
              value={shapeFillColor === "transparent" ? "#ffffff" : shapeFillColor}
              onChange={(e) => setShapeFillColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Shape fill color"
            />
          </div>
        )
      case "eraser":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Size</span>
            <input
              type="number"
              min={5}
              max={50}
              value={eraserSize}
              onChange={(e) => setEraserSize(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Eraser size"
            />
          </div>
        )
      case "generate":
        return (
          <div className="flex items-center gap-2">
            <select
              value={generateType}
              onChange={(e) => setGenerateType(e.target.value)}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              {["text","image","diagram","table"].map((t) => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
            <input
              type="text"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder={`Describe the ${generateType}…`}
              className={`w-48 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            />
            <button
              type="button"
              className={`rounded bg-primary ${overlayUi.controlButton} text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40`}
              disabled={!generatePrompt.trim()}
            >
              Generate
            </button>
          </div>
        )
      case "tables":
        return (
          <div className="flex items-center gap-2">
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Rows</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={(e) => setTableRows(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Table rows"
            />
            <span className={`${overlayUi.controlLabel} text-muted-foreground`}>Cols</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableCols}
              onChange={(e) => setTableCols(Number(e.target.value))}
              className={`w-14 rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
              aria-label="Table cols"
            />
            <select
              value={tableType}
              onChange={(e) => setTableType(e.target.value)}
              className={`rounded border border-border bg-background ${overlayUi.controlInput} focus:outline-none focus:ring-1 focus:ring-ring`}
            >
              {["basic", "bordered", "striped"].map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )
      default:
        return null
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden bg-background" onDragEndCapture={() => setMediaDragActive(false)} onDropCapture={() => setMediaDragActive(false)}>

      {/* ── Left: Media panel (resizable) ───────────────────────────────────── */}
      <MediaLibraryPanel
        width={leftPanel.width}
        overlayUi={overlayUi}
        activeMedia={activeMedia}
        onChangeActiveMedia={setActiveMedia}
        mediaSearch={mediaSearch}
        onChangeMediaSearch={setMediaSearch}
        mediaLoading={mediaLoading}
        wikipediaLoading={wikipediaLoading}
        mediaItems={mediaItems}
        onDragStartMedia={onDragStartMedia}
        onDragEndMedia={() => setMediaDragActive(false)}
      />

      {/* Left resize handle */}
      <div
        onMouseDown={leftPanel.startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        title="Drag to resize media panel"
      />

      {/* ── Center: Canvas area ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden bg-muted/30" onWheelCapture={handleCanvasAreaWheelCapture}>

        {dropFeedback && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm">
            {dropFeedback}
          </div>
        )}

        <PixiWidgetSurface
          config={effectiveCanvasConfig}
          zoom={zoom}
          onZoomChange={setZoom}
          allowWheelScroll={!scrollDisabled}
          activeTool={canvasTool}
          toolConfig={toolConfig}
          activePage={clampedCurrentPage}
          focusPage={focusPageRequest ?? undefined}
          onViewportChange={setViewportInfo}
          onActivePageChange={(page) => {
            setCurrentPage(page)
            setFocusPageRequest(null)
          }}
          templateLayoutModel={usePixiTemplateLayout ? activePixiTemplateLayoutModel : null}
          enableTemplateLayout={usePixiTemplateLayout}
          onTemplateAreaDrop={onPixiAreaDrop}
          onTemplateLayoutMeasured={onPixiLayoutMeasured}
        />

        <PixiLayoutPager
          visible={pixiTemplateLayoutPages.length > 1}
          currentPage={activePixiLayoutPage}
          totalPages={pixiTemplateLayoutPages.length}
          onPrev={() => setPixiLayoutPageByScope((prev) => ({
            ...prev,
            [currentCanvasScopeKey]: Math.max(1, activePixiLayoutPage - 1),
          }))}
          onNext={() => setPixiLayoutPageByScope((prev) => ({
            ...prev,
            [currentCanvasScopeKey]: Math.min(pixiTemplateLayoutPages.length, activePixiLayoutPage + 1),
          }))}
        />

        <DomTemplateSurface
          enabled={!usePixiTemplateLayout}
          viewportInfo={viewportInfo}
          currentLessonPage={currentLessonPage}
          canvasConfig={effectiveCanvasConfig}
          hasHeaderBlock={hasHeaderBlock}
          hasFooterBlock={hasFooterBlock}
          headerPaddingClass={overlayUi.headerPadding}
          lessonHeaderTooltip={lessonHeaderTooltip}
          lessonMetaText={lessonMetaText}
          headerFieldValues={headerFieldValues}
          footerFieldValues={footerFieldValues}
          clampedCurrentPage={clampedCurrentPage}
          totalPages={totalPages}
          perPageTemplateEnabledMap={perPageTemplateEnabledMap}
          templateFieldEnabled={templateFieldEnabled}
          templateVisualDensity={templateVisualDensity}
          templateData={templateData}
          currentDroppedMediaByArea={currentDroppedMediaByArea}
          mediaDragActive={mediaDragActive}
          onDropAreaMedia={onDropAreaMedia}
          onRemoveAreaMedia={onRemoveAreaMedia}
        />

        <CanvasOverlayControls
          overlayUi={overlayUi}
          zoom={zoom}
          onZoomIn={() => handleZoomStep(1)}
          onZoomOut={() => handleZoomStep(-1)}
          onZoomReset={() => setZoom(DEFAULT_CANVAS_ZOOM)}
          panMode={panMode}
          onTogglePanMode={() => setPanMode((p) => !p)}
          scrollDisabled={scrollDisabled}
          onToggleScrollDisabled={() => setScrollDisabled((disabled) => !disabled)}
          snapMenuOpen={snapMenuOpen}
          onToggleSnapMenu={() => setSnapMenuOpen((open) => !open)}
          onCloseSnapMenu={() => setSnapMenuOpen(false)}
          snapReference={snapReference}
          setSnapReference={setSnapReference}
          changePage={changePage}
          clampedCurrentPage={clampedCurrentPage}
          totalPages={totalPages}
          toolOptions={toolOptions}
          mode={mode}
          onModeChange={handleModeChange}
          currentTools={currentTools}
          selectedTool={selectedTool}
          panActive={panMode}
          onToolSelect={handleToolSelect}
        />
      </div>

      {/* Right resize handle */}
      <div
        onMouseDown={rightPanel.startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        title="Drag to resize layers panel"
      />

      <InspectorPanel
        width={rightPanel.width}
        panelView={panelView}
        onPanelViewChange={setPanelView}
        overlayUi={overlayUi}
        currentLessonPage={currentLessonPage ? {
          moduleName: currentLessonPage.moduleName,
          lessonNumber: currentLessonPage.lessonNumber,
          lessonTitle: currentLessonPage.lessonTitle,
          templateType: currentLessonPage.templateType,
        } : null}
        droppedCount={0}
        currentPage={clampedCurrentPage}
        totalPages={totalPages}
        sections={lessonNavigation}
        onJump={changePage}
      />
    </div>
  )
}
