"use client"

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { DomCanvas, DEFAULT_PAGE_CONFIG } from "@/components/canvas/DomCanvas"
import { TemplateSurface } from "@/components/canvas/TemplateSurface"
import { CanvasOverlayControls } from "@/components/canvas/CanvasOverlayControls"
import { MediaLibraryPanel } from "@/components/canvas/MediaLibraryPanel"
import { InspectorPanel } from "@/components/canvas/InspectorPanel"
import { useMediaLibraryAssets } from "@/components/canvas/use-media-library-assets"
import { useCourseCanvasContext } from "@/components/canvas/use-course-canvas-context"
import { useCanvasDocumentState } from "@/components/canvas/use-canvas-document-state"
import { useTemplateProjectionState } from "@/components/canvas/use-template-projection-state"
import { planLessonBodyLayout } from "@/lib/curriculum/canvas-projection"
import {
  type CanvasPageConfig,
  type CanvasViewportInfo,
  type ToolConfig,
  type AnimateTool,
  type BuildTool,
  type CanvasLayer,
  type InspectorPanelView,
  type MediaAsset,
  type Mode,
  type OverlayUi,
  type SnapReference,
  type ToolItem,
} from "@/components/canvas/create-view-types"
import { createClient } from "@/lib/supabase/client"
import type { TaskAreaKind } from "@/components/coursebuilder/template-blueprint"
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
  const [layers, setLayers] = useState<CanvasLayer[]>([
    { id: "meta", name: "Session Meta", visible: true, locked: true, indent: 0 },
    { id: "program", name: "Program", visible: true, locked: false, indent: 0 },
    { id: "resources", name: "Resources", visible: true, locked: false, indent: 0 },
    { id: "instruction", name: "Instruction Area", visible: true, locked: false, indent: 1 },
    { id: "student", name: "Student Area", visible: true, locked: false, indent: 1 },
    { id: "teacher", name: "Teacher Area", visible: true, locked: false, indent: 1 },
    { id: "footer", name: "Footer Meta", visible: true, locked: true, indent: 0 },
  ])
  const [currentPage, setCurrentPage] = useState(1)
  const [focusPageRequest, setFocusPageRequest] = useState<number | null>(null)
  const {
    courseTitle,
    courseType,
    courseLanguage,
    teacherName,
    institutionName,
    lessonPages: baseLessonPages,
    templateVisualDensity,
  } = useCourseCanvasContext({
    courseId,
    supabase,
  })
  const [overflowBySessionMaxLocalPage, setOverflowBySessionMaxLocalPage] = useState<Record<string, number>>({})

  const lessonPages = useMemo(() => {
    if (baseLessonPages.length === 0) return [] as typeof baseLessonPages

    const sessionOrder: string[] = []
    const sessionPagesMap = new Map<string, (typeof baseLessonPages)[number][]>()

    baseLessonPages.forEach((page) => {
      if (!sessionPagesMap.has(page.sessionId)) {
        sessionOrder.push(page.sessionId)
        sessionPagesMap.set(page.sessionId, [])
      }
      sessionPagesMap.get(page.sessionId)!.push(page)
    })

    const expandedPages: typeof baseLessonPages = []
    let globalPage = 1

    sessionOrder.forEach((sessionId) => {
      const sourcePages = (sessionPagesMap.get(sessionId) ?? []).slice().sort((a, b) => a.localPage - b.localPage)
      if (sourcePages.length === 0) return

      const sourceByLocalPage = new Map<number, (typeof baseLessonPages)[number]>()
      sourcePages.forEach((page) => sourceByLocalPage.set(page.localPage, page))

      const sourceTotal = Math.max(
        sourcePages[0]?.pagesInLesson ?? sourcePages.length,
        sourcePages[sourcePages.length - 1]?.localPage ?? sourcePages.length,
      )
      const overflowMaxLocalPage = overflowBySessionMaxLocalPage[sessionId] ?? 0
      const extraContinuationPages = Math.max(0, overflowMaxLocalPage - sourceTotal + 1)
      const resolvedPagesInLesson = sourceTotal + extraContinuationPages
      const templatePage = sourcePages[sourcePages.length - 1]

      for (let localPage = 1; localPage <= resolvedPagesInLesson; localPage += 1) {
        const sourcePage = sourceByLocalPage.get(localPage) ?? templatePage
        expandedPages.push({
          ...sourcePage,
          globalPage,
          localPage,
          pagesInLesson: resolvedPagesInLesson,
        })
        globalPage += 1
      }
    })

    return expandedPages
  }, [baseLessonPages, overflowBySessionMaxLocalPage])

  const totalPages = lessonPages.length > 0 ? lessonPages.length : (canvasConfig?.pageCount ?? 1)
  const [zoom, setZoom] = useState(DEFAULT_CANVAS_ZOOM)
  const [mediaDragActive, setMediaDragActive] = useState(false)
  const [dropFeedback, setDropFeedback] = useState<string | null>(null)
  const [scrollDisabled, setScrollDisabled] = useState(false)

  const {
    activeMedia,
    setActiveMedia,
    mediaSearch,
    setMediaSearch,
    mediaLoading,
    wikipediaLoading,
    mediaItems,
    consumeMediaAsset,
  } = useMediaLibraryAssets({
    supabase,
    courseTitle,
  })

  const [snapMenuOpen, setSnapMenuOpen] = useState(false)
  const [snapReference, setSnapReference] = useState<SnapReference>("canvas")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Small distance avoids accidental drags when clicking to select.
      activationConstraint: { distance: 6 },
    }),
  )

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
    getDroppedMediaByPageGlobal,
    onDropAreaMedia,
    onRemoveAreaMedia,
    rebalanceOverflowForPage,
  } = useCanvasDocumentState({
    supabase,
    courseId,
    lessonPages,
    currentLessonPageGlobal: currentLessonPage?.globalPage ?? null,
    currentDocumentKey,
    currentCanvasScopeKey,
    setMediaDragActive,
    onMediaConsumed: consumeMediaAsset,
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

  const layerDrivenBlockOrder = useMemo(() => {
    const blockIds = layers
      .map((layer) => {
        if (layer.id === "meta") return "header"
        if (layer.id === "program") return "program"
        if (layer.id === "resources") return "resources"
        if (layer.id === "instruction" || layer.id === "student" || layer.id === "teacher") return "content"
        if (layer.id === "footer") return "footer"
        return null
      })
      .filter((value): value is "header" | "program" | "resources" | "content" | "footer" => value !== null)

    const deduped = Array.from(new Set(blockIds))
    const defaultOrder = ["header", "program", "resources", "content", "assignment", "scoring", "footer"] as const
    const missing = defaultOrder.filter((id) => !(deduped as string[]).includes(id))
    return [...deduped, ...missing] as Array<(typeof defaultOrder)[number]>
  }, [layers])

  const layerDrivenTaskAreaOrder = useMemo<TaskAreaKind[]>(() => {
    const mapped = layers
      .map((layer) => {
        if (layer.id === "instruction") return "instruction"
        if (layer.id === "student") return "student"
        if (layer.id === "teacher") return "teacher"
        return null
      })
      .filter((value): value is TaskAreaKind => value !== null)

    const deduped = Array.from(new Set(mapped))
    const defaults: TaskAreaKind[] = ["instruction", "student", "teacher"]
    const missing = defaults.filter((kind) => !deduped.includes(kind))
    return [...deduped, ...missing]
  }, [layers])

  const lessonPagesByGlobal = useMemo(() => {
    const map = new Map<number, (typeof lessonPages)[number]>()
    lessonPages.forEach((page) => map.set(page.globalPage, page))
    return map
  }, [lessonPages])

  const handleTemplateBodyOverflowChange = useCallback((args: { sessionId: string; localPage: number; overflowing: boolean }) => {
    if (!args.overflowing) return
    setOverflowBySessionMaxLocalPage((prev) => {
      const currentMax = prev[args.sessionId] ?? 0
      if (args.localPage <= currentMax) return prev
      return {
        ...prev,
        [args.sessionId]: args.localPage,
      }
    })

    const targetPage = lessonPages.find((page) => page.sessionId === args.sessionId && page.localPage === args.localPage)
    if (targetPage) {
      void Promise.resolve().then(() => {
        rebalanceOverflowForPage(targetPage.globalPage)
      })
    }
  }, [lessonPages, rebalanceOverflowForPage])

  const buildPerPageTemplateEnabledMap = useCallback((pageProjection: (typeof lessonPages)[number]) => {
    const map = {
      header: false,
      program: false,
      resources: false,
      content: false,
      assignment: false,
      scoring: false,
      footer: false,
    }

    const topicsPerLesson = Math.max(1, pageProjection.topicCount || pageProjection.topics.length || 1)
    const objectivesPerTopic = Math.max(1, pageProjection.objectiveCount || pageProjection.objectives.length || 1)
    const tasksPerObjective = Math.max(1, pageProjection.taskCount || pageProjection.tasks.length || 1)
    const enabledBlocks = pageProjection.enabledBlocks.filter((block) => (
      block === "program" || block === "resources" || block === "content" || block === "assignment" || block === "scoring"
    ))

    const layoutPlan = planLessonBodyLayout({
      topicCount: topicsPerLesson,
      objectiveCount: objectivesPerTopic,
      taskCount: tasksPerObjective,
      enabledBlocks,
    })

    const chunksOnPage = layoutPlan.chunks.filter((chunk) => chunk.page === pageProjection.localPage)
    chunksOnPage.forEach((chunk) => {
      map[chunk.blockId] = true
    })

    if (chunksOnPage.length === 0 && pageProjection.localPage > layoutPlan.totalPages) {
      const lastPageChunks = layoutPlan.chunks.filter((chunk) => chunk.page === layoutPlan.totalPages)
      const fallbackPriority = ["content", "assignment", "resources", "scoring", "program"] as const
      const fallbackBlocks = fallbackPriority.filter((blockId) => {
        return lastPageChunks.some((chunk) => chunk.blockId === blockId)
      })

      fallbackBlocks.forEach((blockId) => {
        map[blockId] = true
      })
    }

    return map
  }, [])

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

  const changePage = useCallback(
    (next: number) => {
      const normalized = Number.isFinite(next) ? Math.round(next) : 1
      const targetPage = Math.min(Math.max(1, normalized), totalPages)
      setCurrentPage(targetPage)
    },
    [totalPages],
  )

  const handleZoomStep = useCallback((direction: 1 | -1) => {
    setZoom((currentZoom) => Math.min(400, Math.max(10, currentZoom + (direction * ZOOM_STEP))))
  }, [])

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

  const [activeDragItem, setActiveDragItem] = useState<MediaAsset | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const mediaItem = event.active.data.current?.item as MediaAsset | undefined
    setMediaDragActive(true)
    setActiveDragItem(mediaItem ?? null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setMediaDragActive(false)
    setActiveDragItem(null)

    const mediaItem = event.active.data.current?.item as MediaAsset | undefined
    const areaKey = event.over?.id as string | undefined

    if (mediaItem && areaKey) {
      const containerWidth = event.over?.rect?.width ?? 320
      onDropAreaMedia(areaKey, mediaItem, containerWidth)
    }
  }, [onDropAreaMedia])

  const handleDragCancel = useCallback(() => {
    setMediaDragActive(false)
    setActiveDragItem(null)
  }, [])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
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
      />

      {/* Left resize handle */}
      <div
        onMouseDown={leftPanel.startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        title="Drag to resize media panel"
      />

      {/* ── Center: Canvas area ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden bg-muted/30">

        {dropFeedback && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm">
            {dropFeedback}
          </div>
        )}

        <DomCanvas
          config={effectiveCanvasConfig}
          zoom={zoom}
          onZoomChange={setZoom}
          activePage={clampedCurrentPage}
          focusPage={focusPageRequest ?? null}
          onActivePageChange={(page) => {
            setCurrentPage(page)
            setFocusPageRequest(null)
          }}
          activeTool={canvasTool}
          toolConfig={toolConfig}
        >
          {(pageNumber) => {
            const pageProjection = lessonPagesByGlobal.get(pageNumber) ?? null
            if (!pageProjection) return null

            const isCurrentPage = pageNumber === clampedCurrentPage
            return (
              <TemplateSurface
                currentLessonPage={pageProjection}
                canvasConfig={effectiveCanvasConfig}
                hasHeaderBlock={isCurrentPage ? hasHeaderBlock : pageProjection.enabledBlocks.includes("header")}
                hasFooterBlock={isCurrentPage ? hasFooterBlock : pageProjection.enabledBlocks.includes("footer")}
                headerPaddingClass={overlayUi.headerPadding}
                lessonHeaderTooltip={isCurrentPage ? lessonHeaderTooltip : ""}
                lessonMetaText={isCurrentPage ? lessonMetaText : ""}
                headerFieldValues={isCurrentPage ? headerFieldValues : []}
                footerFieldValues={isCurrentPage ? footerFieldValues : []}
                clampedCurrentPage={pageNumber}
                totalPages={totalPages}
                perPageTemplateEnabledMap={isCurrentPage ? perPageTemplateEnabledMap : buildPerPageTemplateEnabledMap(pageProjection)}
                blockOrder={layerDrivenBlockOrder}
                taskAreaOrder={layerDrivenTaskAreaOrder}
                templateFieldEnabled={isCurrentPage ? templateFieldEnabled : pageProjection.enabledFields}
                templateVisualDensity={templateVisualDensity}
                templateData={isCurrentPage ? templateData : undefined}
                currentDroppedMediaByArea={isCurrentPage ? currentDroppedMediaByArea : getDroppedMediaByPageGlobal(pageNumber)}
                mediaDragActive={mediaDragActive}
                onRemoveAreaMedia={onRemoveAreaMedia}
                onBodyOverflowChange={handleTemplateBodyOverflowChange}
              />
            )
          }}
        </DomCanvas>

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
        layers={layers}
        onLayersChange={setLayers}
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
    <DragOverlay>
      {activeDragItem ? (
        <div className="w-64 rounded border border-primary bg-background/90 p-2 shadow-xl backdrop-blur-sm">
          <p className="truncate font-medium text-foreground">{activeDragItem.title}</p>
          <p className="truncate text-xs text-muted-foreground">{activeDragItem.mediaType}</p>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  )
}
