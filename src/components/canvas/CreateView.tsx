"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import dynamic from "next/dynamic"
import { DEFAULT_PAGE_CONFIG, type CanvasPageConfig, type CanvasViewportInfo, type ToolConfig } from "@/components/canvas/PixiCanvas"
import { createClient } from "@/lib/supabase/client"
import {
  createTemplateLookups,
  formatTemplateFieldValue,
  normalizeTemplateSettings,
} from "@/lib/curriculum/template-source-of-truth"
import {
  buildTemplateFieldState,
  projectLessonPages,
  type LessonCanvasPageProjection,
  type RawCurriculumSessionRow,
  type RawScheduleGeneratedEntry,
} from "@/lib/curriculum/canvas-projection"
import { TemplateBlueprint, type TemplateBlueprintData } from "@/components/coursebuilder/template-blueprint"
import { BLOCK_FIELDS, type BlockId } from "@/components/coursebuilder/sections/templates-section"
import {
  Gamepad2, AreaChart, Bot,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Layers, Map as MapIcon,
  // media
  File, Image as ImageIcon, Film, AudioLines, BookOpenText, Blocks, Link,
  // tools
  MousePointer2, PenTool, Paintbrush, Type, Shapes, Table, Eraser,
  // modes / animate
  Hammer, Clapperboard,
  // perspective
  ZoomIn, ZoomOut, RotateCcw, Hand, Grid3x3,
  // snap
  Crosshair, Target,
  // layers
  Eye, EyeOff, Lock, Unlock,
} from "lucide-react"

// PixiJS touches browser APIs at import time — must be loaded client-only
type PixiCanvasProps = {
  config?: CanvasPageConfig
  zoom?: number
  onZoomChange?: (pct: number) => void
  activeTool?: string
  toolConfig?: ToolConfig
  activePage?: number
  focusPage?: number
  onViewportChange?: (info: CanvasViewportInfo) => void
  onActivePageChange?: (page: number) => void
}
const PixiCanvas = dynamic<PixiCanvasProps>(
  () => import("@/components/canvas/PixiCanvas").then((m) => m.PixiCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
        <span className="text-xs text-muted-foreground">Loading canvas…</span>
      </div>
    ),
  },
)

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "build" | "animate"
type BuildTool = "selection" | "pen" | "brush" | "text" | "shapes" | "tables" | "generate" | "eraser"
type AnimateTool = "selection" | "scene" | "path" | "modify"
type PanelView = "layers" | "navigation"
type SnapReference = "canvas" | "object" | "grid"

type OverlayUi = {
  headerPadding: string
  headerTitle: string
  headerMeta: string
  headerChip: string
  blockPadding: string
  blockLabel: string
  blockCount: string
  cellLabel: string
  cellValue: string
  nestedLabel: string
  nestedValue: string
  footerText: string
  footerChip: string
  nestedLines: string
  low: boolean
  // Panels (left/right)
  panelHeaderPadding: string
  panelHeaderText: string
  panelHeaderIcon: string
  panelSearchPadding: string
  panelSearchInput: string
  panelContentPadding: string
  panelItemPadding: string
  panelItemText: string
  panelItemIcon: string
  // Media category buttons
  mediaCategoryPadding: string
  mediaCategoryIcon: string
  mediaCategoryLabel: string
  // Toolbar & controls
  toolbarPadding: string
  toolbarGap: string
  toolButtonPadding: string
  toolButtonIcon: string
  toolButtonLabel: string
  controlLabel: string
  controlInput: string
  controlButton: string
  // Zoom & scroll controls
  zoomButtonPadding: string
  zoomButtonIcon: string
  zoomValueText: string
  scrollButtonPadding: string
  scrollButtonIcon: string
  scrollInputText: string
  scrollPageText: string
}

// ─── Media panel items ────────────────────────────────────────────────────────

interface MediaItem {
  id: string
  label: string
  iconNode: React.ReactNode
}

type CurriculumSessionRow = RawCurriculumSessionRow
type ScheduleGeneratedEntry = RawScheduleGeneratedEntry
type LessonCanvasPage = LessonCanvasPageProjection

interface MediaAsset {
  id: string
  category: string
  mediaType: string
  title: string
  description: string
  url: string
}

function normalizeMediaCategory(mediaType: string): string {
  const normalized = mediaType.toLowerCase()
  if (normalized.includes("video")) return "videos"
  if (normalized.includes("audio") || normalized.includes("podcast")) return "audio"
  if (normalized.includes("image") || normalized.includes("map") || normalized.includes("diagram")) return "images"
  if (normalized.includes("text") || normalized.includes("article") || normalized.includes("compendium") || normalized.includes("book")) return "text"
  if (normalized.includes("link")) return "links"
  if (normalized.includes("plugin")) return "plugins"
  return "files"
}

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

function SnapToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary"
      />
      {label}
    </label>
  )
}

const MEDIA_ITEMS: MediaItem[] = [
  { id: "files",   label: "Files",   iconNode: <File         className="h-5 w-5" /> },
  { id: "images",  label: "Images",  iconNode: <ImageIcon    className="h-5 w-5" /> },
  { id: "videos",  label: "Videos",  iconNode: <Film         className="h-5 w-5" /> },
  { id: "audio",   label: "Audio",   iconNode: <AudioLines   className="h-5 w-5" /> },
  { id: "text",    label: "Text",    iconNode: <BookOpenText className="h-5 w-5" /> },
  { id: "plugins", label: "Plugins", iconNode: <Blocks       className="h-5 w-5" /> },
  { id: "links",   label: "Links",   iconNode: <Link         className="h-5 w-5" /> },
  { id: "games",   label: "Games",   iconNode: <Gamepad2     className="h-5 w-5" /> },
  { id: "graphs",  label: "Graphs",  iconNode: <AreaChart    className="h-5 w-5" /> },
]

// ─── Tool definitions ─────────────────────────────────────────────────────────

interface ToolItem<T extends string> {
  id: T
  label: string
  iconNode: React.ReactNode
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function EngineBtn({
  active,
  onClick,
  label,
  iconNode,
  compact,
  title,
  overlayUi,
}: {
  active?: boolean
  onClick?: () => void
  label?: string
  iconNode?: React.ReactNode
  compact?: boolean
  title?: string
  overlayUi?: OverlayUi
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 rounded ${overlayUi?.toolButtonPadding ?? "p-1.5"} ${overlayUi?.controlInput ?? "text-xs"} transition select-none
        ${active
          ? "bg-accent text-primary"
          : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
        }
        ${compact ? "min-w-[44px]" : "min-w-[52px]"}
      `}
    >
      {iconNode}
      {label && (
        <span className={`${overlayUi?.toolButtonLabel ?? "text-[10px]"} leading-none font-medium truncate max-w-full mt-0.5`}>
          {label}
        </span>
      )}
    </button>
  )
}

// ─── Snap Menu ────────────────────────────────────────────────────────────────

function SnapMenu({
  open,
  onClose,
  snapReference,
  onChangeReference,
}: {
  open: boolean
  onClose: () => void
  snapReference: SnapReference
  onChangeReference: (r: SnapReference) => void
}) {
  const [smartGuides, setSmartGuides] = useState(true)
  const [distLabels, setDistLabels] = useState(true)
  const [resizeGuides, setResizeGuides] = useState(true)
  const [smartSel, setSmartSel] = useState(true)
  const [colorCoding, setColorCoding] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [gridSpacing, setGridSpacing] = useState(20)

  if (!open) return null

  const refModes: { id: SnapReference; label: string; icon: React.ReactNode }[] = [
    { id: "canvas", label: "Canvas", icon: <Crosshair className="h-4 w-4" /> },
    { id: "object", label: "Object", icon: <Target    className="h-4 w-4" /> },
    { id: "grid",   label: "Grid",   icon: <Grid3x3   className="h-4 w-4" /> },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute left-12 top-24 z-30 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-2 text-sm text-foreground">
        <SnapToggle checked={smartGuides} onChange={() => setSmartGuides(!smartGuides)} label="Smart Guides" />
        <div className="pl-3 space-y-1 border-l border-border">
          <SnapToggle checked={distLabels}   onChange={() => setDistLabels(!distLabels)}     label="Distance Labels" />
          <SnapToggle checked={resizeGuides} onChange={() => setResizeGuides(!resizeGuides)} label="Resize Guides" />
          <SnapToggle checked={smartSel}     onChange={() => setSmartSel(!smartSel)}         label="Smart Selection" />
          <SnapToggle checked={colorCoding}  onChange={() => setColorCoding(!colorCoding)}   label="Color Coding" />
        </div>

        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pt-1">
          Smart Guide Reference
        </div>
        <div className="flex gap-1">
          {refModes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChangeReference(r.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded p-1 text-[10px] transition ${
                snapReference === r.id
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {snapReference === "grid" && (
          <div className="space-y-2 border-t border-border pt-2">
            <SnapToggle checked={showGrid} onChange={() => setShowGrid(!showGrid)} label="Show grid" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Spacing:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={gridSpacing}
                onChange={(e) => setGridSpacing(Number(e.target.value))}
                className="w-16 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-2 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribute
          </div>
          <div className="flex gap-1">
            {["Horizontally", "Vertically"].map((dir) => (
              <button
                key={dir}
                type="button"
                className="flex-1 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
              >
                {dir}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── CreateView ───────────────────────────────────────────────────────────────

export function CreateView({
  canvasConfig,
  courseId,
}: {
  canvasConfig?: CanvasPageConfig | null
  courseId?: string | null
} = {}) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<Mode>("build")
  const [activeTool, setActiveTool] = useState<BuildTool | AnimateTool>("selection")

  // Pan mode — toggled by the Grab perspective button.
  // When active the canvas uses "grab" cursor/panning regardless of activeTool.
  const [panMode, setPanMode] = useState(false)

  const [panelView, setPanelView] = useState<PanelView>("layers")
  const [currentPage, setCurrentPage] = useState(1)
  const [courseTitle, setCourseTitle] = useState("Untitled Course")
  const [courseType, setCourseType] = useState("")
  const [courseLanguage, setCourseLanguage] = useState("")
  const [teacherName, setTeacherName] = useState("Teacher")
  const [institutionName, setInstitutionName] = useState("Independent")
  const [lessonPages, setLessonPages] = useState<LessonCanvasPage[]>([])
  const totalPages = lessonPages.length > 0 ? lessonPages.length : (canvasConfig?.pageCount ?? 1)
  const [zoom, setZoom] = useState(100)
  const [viewportInfo, setViewportInfo] = useState<CanvasViewportInfo | null>(null)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)

  // Always-selected media category
  const [activeMedia, setActiveMedia] = useState<string>("files")
  const [mediaSearch, setMediaSearch] = useState("")
  const [snapMenuOpen, setSnapMenuOpen] = useState(false)
  const [snapReference, setSnapReference] = useState<SnapReference>("canvas")

  // Resizable panels — can be dragged to 0 (canvas overlays always remain)
  const leftPanel  = useResizeHandle(288, "right", 0, 480)
  const rightPanel = useResizeHandle(224, "left",  0, 400)

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

  const loadCourseContext = useCallback(async () => {
    if (!courseId) {
      setLessonPages([])
      return
    }

    const { data, error } = await supabase
      .from("courses")
      .select("course_name,course_type,course_language,institution,generation_settings,curriculum_data,schedule_settings,template_settings")
      .eq("id", courseId)
      .maybeSingle()

    if (error || !data) {
      return
    }

    setCourseTitle(String(data.course_name ?? "Untitled Course"))
    setCourseType(String(data.course_type ?? ""))
    setCourseLanguage(String(data.course_language ?? ""))
    setInstitutionName(String(data.institution ?? "Independent"))
    const generationSettings = (data.generation_settings as Record<string, unknown> | null) ?? {}
    const resolvedTeacherName =
      (typeof generationSettings.teacher_name === "string" && generationSettings.teacher_name.trim())
        ? String(generationSettings.teacher_name)
        : "Teacher"
    setTeacherName(resolvedTeacherName)
    const templates = normalizeTemplateSettings(data.template_settings)
    const { templateById, templateByType } = createTemplateLookups(templates)
    const curriculum = (data.curriculum_data as Record<string, unknown> | null) ?? {}
    const scheduleSettings = (data.schedule_settings as Record<string, unknown> | null) ?? {}
    const scheduleRows = Array.isArray(scheduleSettings.generated_entries)
      ? (scheduleSettings.generated_entries as ScheduleGeneratedEntry[])
      : []
    const sessionRows = Array.isArray(curriculum.session_rows)
      ? (curriculum.session_rows as CurriculumSessionRow[])
      : []
    const pages = projectLessonPages({
      curriculum,
      scheduleRows,
      sessionRows,
      templateById,
      templateByType,
    })

    setLessonPages(pages)
  }, [courseId, supabase])

  useEffect(() => {
    let active = true
    const initialLoadHandle = window.setTimeout(() => {
      if (!active) return
      void loadCourseContext()
    }, 0)

    let channel: RealtimeChannel | null = null
    if (courseId) {
      channel = supabase
        .channel(`create-view-course-${courseId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "courses",
            filter: `id=eq.${courseId}`,
          },
          () => {
            if (!active) return
            void loadCourseContext()
          },
        )
        .subscribe()
    }

    return () => {
      active = false
      window.clearTimeout(initialLoadHandle)
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [courseId, loadCourseContext, supabase])

  useEffect(() => {
    let active = true

    async function loadMedia() {
      setMediaLoading(true)
      const { data } = await supabase
        .from("encyclopedia_media")
        .select("id,media_type,title,description,url")
        .limit(200)

      if (!active) return

      const fetched = (Array.isArray(data) ? data : []).map((row) => {
        const mediaType = String((row as Record<string, unknown>).media_type ?? "file")
        return {
          id: String((row as Record<string, unknown>).id ?? crypto.randomUUID()),
          category: normalizeMediaCategory(mediaType),
          mediaType,
          title: String((row as Record<string, unknown>).title ?? `${mediaType} resource`),
          description: String((row as Record<string, unknown>).description ?? ""),
          url: String((row as Record<string, unknown>).url ?? ""),
        } satisfies MediaAsset
      })

      const base = [...fetched]
      const required: Array<{ category: string; mediaType: string }> = [
        { category: "images", mediaType: "image" },
        { category: "videos", mediaType: "video" },
        { category: "audio", mediaType: "audio" },
        { category: "text", mediaType: "text" },
      ]

      required.forEach(({ category, mediaType }) => {
        const hasCategory = base.some((asset) => asset.category === category)
        if (!hasCategory) {
          base.push(
            {
              id: `seed-${category}-1`,
              category,
              mediaType,
              title: `Supplemental ${mediaType} item A`,
              description: "Added for drag-and-drop completeness.",
              url: "",
            },
            {
              id: `seed-${category}-2`,
              category,
              mediaType,
              title: `Supplemental ${mediaType} item B`,
              description: "Added for drag-and-drop completeness.",
              url: "",
            },
          )
        }
      })

      setMediaAssets(base)
      setMediaLoading(false)
    }

    void loadMedia()
    return () => {
      active = false
    }
  }, [supabase])

  const clampedCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages))

  const currentLessonPage = useMemo(
    () => lessonPages.find((page) => page.globalPage === clampedCurrentPage) ?? null,
    [lessonPages, clampedCurrentPage],
  )

  const currentEnabledBlocks = useMemo(
    () => currentLessonPage?.enabledBlocks ?? [],
    [currentLessonPage?.enabledBlocks],
  )
  const hasHeaderBlock = currentEnabledBlocks.includes("header")
  const hasFooterBlock = currentEnabledBlocks.includes("footer")

  const templateEnabledMap = useMemo<Record<BlockId, boolean>>(() => {
    const enabledSet = new Set(currentEnabledBlocks)
    return {
      header: enabledSet.has("header"),
      program: enabledSet.has("program"),
      resources: enabledSet.has("resources"),
      content: enabledSet.has("content"),
      assignment: enabledSet.has("assignment"),
      scoring: enabledSet.has("scoring"),
      footer: enabledSet.has("footer"),
    }
  }, [currentEnabledBlocks])

  const templateFieldEnabled = useMemo(
    () => currentLessonPage?.enabledFields ?? buildTemplateFieldState(currentLessonPage?.templateType ?? "lesson"),
    [currentLessonPage?.enabledFields, currentLessonPage?.templateType],
  )

  const bodyTemplateEnabledMap = useMemo<Record<BlockId, boolean>>(
    () => ({ ...templateEnabledMap, header: false, footer: false }),
    [templateEnabledMap],
  )

  const perPageTemplateEnabledMap = useMemo<Record<BlockId, boolean>>(() => {
    if (!currentLessonPage) return bodyTemplateEnabledMap

    const localPage = currentLessonPage.localPage ?? 1
    const totalPages = currentLessonPage.pagesInLesson ?? 1

    const map = { ...bodyTemplateEnabledMap }

    if (localPage === 1) {
      // Page 1: Program and Resources only
      map.program = bodyTemplateEnabledMap.program
      map.resources = bodyTemplateEnabledMap.resources
      map.content = false
      map.assignment = false
    } else if (localPage === 2 && totalPages === 2) {
      // Page 2 of 2: Content and Assignment together
      map.program = false
      map.resources = false
      map.content = bodyTemplateEnabledMap.content
      map.assignment = bodyTemplateEnabledMap.assignment
    } else if (localPage === 2 && totalPages > 2) {
      // Page 2 of 3+: Content only
      map.program = false
      map.resources = false
      map.content = bodyTemplateEnabledMap.content
      map.assignment = false
    } else {
      // Page 3+: Assignment only
      map.program = false
      map.resources = false
      map.content = false
      map.assignment = bodyTemplateEnabledMap.assignment
    }

    return map
  }, [bodyTemplateEnabledMap, currentLessonPage])

  const headerFieldValues = useMemo(() => {
    if (!currentLessonPage || !hasHeaderBlock) return [] as Array<{ key: string; value: string }>
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    return BLOCK_FIELDS.header
      .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
      .filter((field) => field.required || Boolean(templateFieldEnabled.header?.[field.key]))
      .map((field) => ({
        key: field.key,
        value: formatTemplateFieldValue(field.key, context),
      }))
  }, [currentLessonPage, hasHeaderBlock, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const footerFieldValues = useMemo(() => {
    if (!currentLessonPage || !hasFooterBlock) return [] as Array<{ key: string; value: string }>
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    return BLOCK_FIELDS.footer
      .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
      .filter((field) => field.required || Boolean(templateFieldEnabled.footer?.[field.key]))
      .map((field) => ({
        key: field.key,
        value: formatTemplateFieldValue(field.key, context),
      }))
  }, [currentLessonPage, hasFooterBlock, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const headerFieldMap = useMemo(() => {
    return Object.fromEntries(headerFieldValues.map((entry) => [entry.key, entry.value]))
  }, [headerFieldValues])

  const templateData = useMemo<TemplateBlueprintData | undefined>(() => {
    if (!currentLessonPage) return undefined

    const headerValues = Object.fromEntries(headerFieldValues.map((entry) => [entry.key, entry.value]))
    const footerValues = Object.fromEntries(footerFieldValues.map((entry) => [entry.key, entry.value]))

    const joinedObjectives = currentLessonPage.objectives.join(" · ")
    const joinedTasks = currentLessonPage.tasks.join(" · ")
    const context = {
      lessonNumber: currentLessonPage.lessonNumber,
      lessonTitle: currentLessonPage.lessonTitle,
      lessonNotes: currentLessonPage.lessonNotes,
      moduleName: currentLessonPage.moduleName,
      courseTitle,
      courseType,
      courseLanguage,
      teacherName,
      institutionName,
      templateType: currentLessonPage.templateType,
      scheduleDay: currentLessonPage.scheduleDay,
      scheduleDate: currentLessonPage.scheduleDate,
      scheduleStart: currentLessonPage.scheduleStart,
      scheduleEnd: currentLessonPage.scheduleEnd,
      durationMinutes: currentLessonPage.durationMinutes,
      topics: currentLessonPage.topics,
      objectives: currentLessonPage.objectives,
      tasks: currentLessonPage.tasks,
      currentPage: clampedCurrentPage,
      totalPages,
    }

    const scalarFieldValues: Record<string, string> = {
      lesson_number: formatTemplateFieldValue("lesson_number", context) || "—",
      lesson_title: formatTemplateFieldValue("lesson_title", context) || "—",
      module_title: formatTemplateFieldValue("module_title", context) || "—",
      course_title: formatTemplateFieldValue("course_title", context) || "—",
      institution_name: formatTemplateFieldValue("institution_name", context) || "—",
      teacher_name: formatTemplateFieldValue("teacher_name", context) || "—",
      date: formatTemplateFieldValue("date", context) || "—",
      competence: formatTemplateFieldValue("competence", context) || "—",
      topic: formatTemplateFieldValue("topic", context) || "—",
      objective: formatTemplateFieldValue("objective", context) || "—",
      task: formatTemplateFieldValue("task", context) || "—",
      program_method: currentLessonPage.lessonNotes || "Guided instruction",
      program_social_form: "Class / Group",
      program_time: formatTemplateFieldValue("program_time", context) || "—",
      type: formatTemplateFieldValue("type", context) || "—",
      origin: formatTemplateFieldValue("origin", context) || "—",
      state: formatTemplateFieldValue("state", context) || "—",
      quality: formatTemplateFieldValue("quality", context) || "—",
      instruction_area: currentLessonPage.lessonNotes || "Instruction guidance",
      student_area: joinedTasks || "Student practice",
      teacher_area: joinedObjectives || "Facilitation notes",
      due_date: formatTemplateFieldValue("due_date", context) || "—",
      submission_format: formatTemplateFieldValue("submission_format", context) || "—",
      criterion: formatTemplateFieldValue("criterion", context) || "—",
      weight: formatTemplateFieldValue("weight", context) || "—",
      max_points: formatTemplateFieldValue("max_points", context) || "—",
      feedback: formatTemplateFieldValue("feedback", context) || "—",
    }

    const buildBlockFieldValues = (blockId: BlockId): Record<string, string> => {
      const fields = BLOCK_FIELDS[blockId]
        .filter((field) => field.forTypes.includes(currentLessonPage.templateType as never))
        .filter((field) => field.required || Boolean(templateFieldEnabled[blockId]?.[field.key]))

      return Object.fromEntries(fields.map((field) => [field.key, scalarFieldValues[field.key] ?? "—"]))
    }

    const topicsPerLesson = Math.max(1, currentLessonPage.topicCount || currentLessonPage.topics.length || 1)
    const objectivesPerTopic = Math.max(1, currentLessonPage.objectiveCount || currentLessonPage.objectives.length || 1)
    const tasksPerObjective = Math.max(1, currentLessonPage.taskCount || currentLessonPage.tasks.length || 1)
    const totalTaskRows = Math.max(1, topicsPerLesson * objectivesPerTopic * tasksPerObjective)
    const totalPagesInLesson = Math.max(1, currentLessonPage.pagesInLesson || 1)
    const localPageIndex = Math.max(0, (currentLessonPage.localPage || 1) - 1)
    const pageTaskStart = Math.floor((localPageIndex * totalTaskRows) / totalPagesInLesson)
    const pageTaskEnd = Math.floor(((localPageIndex + 1) * totalTaskRows) / totalPagesInLesson)
    const pageTaskCount = Math.max(1, pageTaskEnd - pageTaskStart)

    const taskRows = Array.from({ length: pageTaskCount }, (_, pageOffset) => {
      const flatTaskIndex = pageTaskStart + pageOffset
      const perTopicTaskCount = objectivesPerTopic * tasksPerObjective
      const topicIndex = Math.min(topicsPerLesson - 1, Math.floor(flatTaskIndex / perTopicTaskCount))
      const withinTopicIndex = flatTaskIndex % perTopicTaskCount
      const objectiveWithinTopicIndex = Math.floor(withinTopicIndex / tasksPerObjective)
      const taskWithinObjectiveIndex = withinTopicIndex % tasksPerObjective
      const objectiveLinearIndex = topicIndex * objectivesPerTopic + objectiveWithinTopicIndex

      return {
        topic: currentLessonPage.topics[topicIndex] || `Topic ${topicIndex + 1}`,
        objective:
          currentLessonPage.objectives[objectiveLinearIndex]
          || `Objective ${topicIndex + 1}.${objectiveWithinTopicIndex + 1}`,
        task:
          currentLessonPage.tasks[flatTaskIndex]
          || `Task ${topicIndex + 1}.${objectiveWithinTopicIndex + 1}.${taskWithinObjectiveIndex + 1}`,
      }
    })

    const programRows = taskRows.map((row) => ({
      topic: row.topic,
      objective: row.objective,
      task: row.task,
      program_time: scalarFieldValues.program_time,
      program_method: scalarFieldValues.program_method,
      program_social_form: scalarFieldValues.program_social_form,
    }))
    const resourceRows = taskRows.map((row) => ({
      task: row.task,
      type: scalarFieldValues.type,
      origin: scalarFieldValues.origin,
      state: scalarFieldValues.state,
      quality: scalarFieldValues.quality,
    }))

    const isFirstPage = (currentLessonPage.localPage ?? 1) === 1

    return {
      fieldValues: {
        header: headerValues,
        program: buildBlockFieldValues("program"),
        resources: buildBlockFieldValues("resources"),
        content: buildBlockFieldValues("content"),
        assignment: buildBlockFieldValues("assignment"),
        scoring: buildBlockFieldValues("scoring"),
        footer: footerValues,
      },
      programRows: isFirstPage ? programRows : [],
      resourceRows: isFirstPage ? resourceRows : [],
      resourceItems: resourceRows.map((row, idx) => `Resource ${idx + 1}: ${row.task}`),
      scoringItems: currentLessonPage.objectives.map((objective, idx) => `Criterion ${idx + 1}: ${objective}`),
    }
  }, [currentLessonPage, headerFieldValues, footerFieldValues, courseTitle, courseType, courseLanguage, teacherName, institutionName, clampedCurrentPage, totalPages, templateFieldEnabled])

  const mediaItems = useMemo(() => {
    const term = mediaSearch.trim().toLowerCase()
    return mediaAssets
      .filter((item) => item.category === activeMedia)
      .filter((item) => {
        if (!term) return true
        return `${item.title} ${item.description}`.toLowerCase().includes(term)
      })
      .slice(0, 80)
  }, [activeMedia, mediaAssets, mediaSearch])

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
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("application/json", JSON.stringify(asset))
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

  const lessonHeaderTooltip = useMemo(() => {
    if (!currentLessonPage) return ""

    const skipKeys = new Set(["lesson_number", "lesson_title", "module_title", "course_title"])
    const extraLines = headerFieldValues
      .filter((entry) => !skipKeys.has(entry.key))
      .map((entry) => `${entry.key.replace(/_/g, " ")}: ${entry.value}`)

    return [
      `Lesson ${currentLessonPage.lessonNumber}: ${currentLessonPage.lessonTitle}`,
      `Module: ${currentLessonPage.moduleName}`,
      `Course: ${courseTitle}`,
      ...extraLines,
    ].join("\n")
  }, [currentLessonPage, headerFieldValues, courseTitle])

  const lessonMetaText = useMemo(() => {
    const dateValue = headerFieldMap.date
    const teacherValue = headerFieldMap.teacher_name
    const institutionValue = headerFieldMap.institution_name
    return [dateValue, teacherValue, institutionValue].filter(Boolean).join(" · ")
  }, [headerFieldMap])

  const changePage = useCallback(
    (next: number) => {
      const normalized = Number.isFinite(next) ? Math.round(next) : 1
      setCurrentPage(Math.min(Math.max(1, normalized), totalPages))
    },
    [totalPages],
  )

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
    <div className="flex h-full w-full overflow-hidden bg-background">

      {/* ── Left: Media panel (resizable) ───────────────────────────────────── */}
      {leftPanel.width > 0 && (
      <div className="flex shrink-0 border-r border-border bg-background overflow-hidden" style={{ width: leftPanel.width }}>
        {/* Left: category icon strip */}
        <div className="flex w-14 shrink-0 flex-col border-r border-border overflow-y-auto">
          <div className={`flex flex-col items-center gap-0.5 ${overlayUi.panelContentPadding} pt-2`}>
            {MEDIA_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setActiveMedia(item.id)}
                className={`flex flex-col items-center gap-0.5 rounded ${overlayUi.mediaCategoryPadding} text-muted-foreground transition hover:bg-muted/60 hover:text-foreground ${
                  activeMedia === item.id ? "bg-accent text-primary" : ""
                }`}
              >
                <span className={overlayUi.mediaCategoryIcon}>{item.iconNode}</span>
                <span className={`${overlayUi.mediaCategoryLabel} leading-tight`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: search + media content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className={`border-b border-border ${overlayUi.panelSearchPadding}`}>
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search…"
              className={`w-full rounded-md border border-border bg-muted/40 ${overlayUi.panelSearchInput} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
            />
          </div>
          <div className={`flex-1 overflow-y-auto ${overlayUi.panelContentPadding}`}>
            {mediaLoading ? (
              <p className={`${overlayUi.panelItemText} italic text-muted-foreground/50 px-1 py-2`}>
                Loading encyclopedia media…
              </p>
            ) : mediaItems.length === 0 ? (
              <p className={`${overlayUi.panelItemText} italic text-muted-foreground/50 px-1 py-2`}>
                No media found in this category.
              </p>
            ) : (
              <ul className="space-y-1">
                {mediaItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => onDragStartMedia(item, event)}
                      className={`w-full rounded border border-border bg-background/70 text-left ${overlayUi.panelItemPadding} transition hover:border-primary/40 hover:bg-accent/40 active:scale-[0.99]`}
                      title={item.url || item.description || item.title}
                    >
                      <p className={`${overlayUi.panelItemText} font-medium text-foreground truncate`}>{item.title}</p>
                      <p className={`${overlayUi.controlLabel} text-muted-foreground truncate`}>{item.mediaType}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Left resize handle */}
      <div
        onMouseDown={leftPanel.startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        title="Drag to resize media panel"
      />

      {/* ── Center: Canvas area ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden bg-muted/30">

        {/* PixiJS canvas fills the center */}
        <div className="absolute inset-0">
          <PixiCanvas
            config={effectiveCanvasConfig}
            zoom={zoom}
            onZoomChange={setZoom}
            activeTool={canvasTool}
            toolConfig={toolConfig}
            activePage={clampedCurrentPage}
            focusPage={clampedCurrentPage}
            onViewportChange={setViewportInfo}
            onActivePageChange={setCurrentPage}
          />
        </div>

        {viewportInfo && currentLessonPage && (
          <div
            key={`${currentLessonPage.sessionId}:${currentLessonPage.localPage}`}
            className="absolute pointer-events-auto overflow-hidden"
            style={{
              left: viewportInfo.pageRect.x,
              top: viewportInfo.pageRect.y,
              width: viewportInfo.pageRect.width,
              height: viewportInfo.pageRect.height,
            }}
          >
            <div
              className="relative origin-top-left"
              style={{
                width: effectiveCanvasConfig.widthPx,
                height: effectiveCanvasConfig.heightPx,
                transform: `scale(${viewportInfo.scale})`,
                transformOrigin: "top left",
              }}
            >
            <div className="relative h-full w-full bg-transparent">
              {hasHeaderBlock && (
                <div
                  className={`absolute top-0 overflow-hidden border-b border-border/60 ${overlayUi.headerPadding}`}
                  style={{
                    left: 0,
                    right: 0,
                    height: effectiveCanvasConfig.margins.top,
                  }}
                >
                  <div className="flex h-full items-center gap-1.5 overflow-hidden">
                    {currentLessonPage.templateType === "lesson" ? (
                      <>
                        <span className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground">
                          L{currentLessonPage.lessonNumber}
                        </span>
                        <span
                          className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                          title={lessonHeaderTooltip}
                        >
                          {currentLessonPage.lessonTitle}
                        </span>
                        {lessonMetaText && (
                          <span
                            className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                            title={lessonMetaText}
                          >
                            {lessonMetaText}
                          </span>
                        )}
                      </>
                    ) : (
                      headerFieldValues.map((value, idx) => (
                        <span
                          key={`header-value-${value.key}-${idx}`}
                          className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                        >
                          {value.value}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div
                className="absolute overflow-hidden"
                style={{
                  left: effectiveCanvasConfig.margins.left,
                  right: effectiveCanvasConfig.margins.right,
                  top: hasHeaderBlock ? effectiveCanvasConfig.margins.top : 0,
                  bottom: hasFooterBlock ? effectiveCanvasConfig.margins.bottom : 0,
                }}
              >
                <div className="h-full w-full overflow-hidden rounded-lg border border-border/70 bg-background/85">
                  <TemplateBlueprint
                    type={currentLessonPage.templateType as never}
                    enabled={perPageTemplateEnabledMap}
                    fieldEnabled={templateFieldEnabled}
                    name={currentLessonPage.lessonTitle}
                    scale="md"
                    scrollable={false}
                    data={templateData}
                  />
                </div>
              </div>

              {hasFooterBlock && (
                <div
                  className="absolute bottom-0 overflow-hidden border-t border-border/60 px-3 py-1"
                  style={{
                    left: 0,
                    right: 0,
                    height: effectiveCanvasConfig.margins.bottom,
                  }}
                >
                  <div className="flex h-full items-center justify-between gap-2 overflow-hidden">
                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                      {footerFieldValues
                        .filter((entry) => entry.key !== "page_number")
                        .map((value, idx) => (
                          <span
                            key={`footer-value-${value.key}-${idx}`}
                            className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {value.value}
                          </span>
                        ))}
                    </div>
                    <span className="shrink-0 rounded border border-border/60 bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                      {footerFieldValues.find((entry) => entry.key === "page_number")?.value ?? `Page ${clampedCurrentPage} / ${totalPages}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* ── Perspective controls (left side of canvas) ── */}
        <div className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 ${overlayUi.toolButtonPadding} shadow-sm backdrop-blur-sm`}>
          {/* Zoom indicator */}
          <div
            title="Current zoom level — Ctrl/Cmd+scroll to zoom"
            className={`py-1 ${overlayUi.zoomValueText} font-semibold tabular-nums text-muted-foreground`}
          >
            {zoom}%
          </div>

          <EngineBtn
            label="Focus"
            iconNode={<ZoomIn    className={overlayUi.zoomButtonIcon} />}
            onClick={() => setZoom((z) => Math.min(z + 10, 400))}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Expand"
            iconNode={<ZoomOut   className={overlayUi.zoomButtonIcon} />}
            onClick={() => setZoom((z) => Math.max(z - 10, 10))}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Reset"
            iconNode={<RotateCcw className={overlayUi.zoomButtonIcon} />}
            onClick={() => setZoom(100)}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Grab"
            iconNode={<Hand className={overlayUi.zoomButtonIcon} />}
            active={panMode}
            onClick={() => setPanMode((p) => !p)}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Grid"
            iconNode={<Grid3x3   className={overlayUi.zoomButtonIcon} />}
            active={snapMenuOpen}
            onClick={() => setSnapMenuOpen((o) => !o)}
            overlayUi={overlayUi}
          />
        </div>

        {/* Snap menu */}
        <SnapMenu
          open={snapMenuOpen}
          onClose={() => setSnapMenuOpen(false)}
          snapReference={snapReference}
          onChangeReference={setSnapReference}
        />

        {/* ── Scroll navigation (right side of canvas) ── */}
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 ${overlayUi.toolButtonPadding} shadow-sm backdrop-blur-sm`}>
          <EngineBtn
            label="First"
            onClick={() => changePage(1)}
            iconNode={<ChevronsUp className={overlayUi.scrollButtonIcon} />}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Prev"
            onClick={() => changePage(clampedCurrentPage - 1)}
            iconNode={<ChevronUp className={overlayUi.scrollButtonIcon} />}
            overlayUi={overlayUi}
          />
          {/* Page input */}
          <div className={`flex flex-col items-center py-1 ${overlayUi.scrollPageText} text-muted-foreground`}>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={clampedCurrentPage}
              onChange={(e) => changePage(Number(e.target.value))}
              className={`${overlayUi.scrollInputText} rounded border border-border bg-background px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-ring`}
            />
            <span className="mt-0.5 opacity-60">/ {totalPages}</span>
          </div>
          <EngineBtn
            label="Next"
            onClick={() => changePage(clampedCurrentPage + 1)}
            iconNode={<ChevronDown className={overlayUi.scrollButtonIcon} />}
            overlayUi={overlayUi}
          />
          <EngineBtn
            label="Last"
            onClick={() => changePage(totalPages)}
            iconNode={<ChevronsDown className={overlayUi.scrollButtonIcon} />}
            overlayUi={overlayUi}
          />
        </div>

        {/* ── Bottom controls bar ── */}
        <div className={`absolute bottom-2 left-1/2 z-10 -translate-x-1/2 flex items-center ${overlayUi.toolbarGap} rounded-xl border border-border bg-background/95 ${overlayUi.toolbarPadding} shadow-md backdrop-blur-sm`}>

          {/* Mode selector */}
          <div className={`flex items-center gap-0.5 border-r border-border pr-3 mr-1`}>
            {(["build", "animate"] as Mode[]).map((m) => (
              <EngineBtn
                key={m}
                label={m.charAt(0).toUpperCase() + m.slice(1)}
                iconNode={m === "build" ? <Hammer className={overlayUi.toolButtonIcon} /> : <Clapperboard className={overlayUi.toolButtonIcon} />}
                active={mode === m}
                onClick={() => handleModeChange(m)}
                compact
                overlayUi={overlayUi}
              />
            ))}
          </div>

          {/* Tool options (context-sensitive) */}
          <div className={`flex min-w-0 items-center gap-1.5 border-r border-border pr-3 mr-1 h-9`}>
            {ToolOptions({ overlayUi })}
          </div>

          {/* Tool buttons */}
          <div className="flex items-center gap-0.5">
            {(currentTools as ToolItem<string>[]).map((tool) => (
              <EngineBtn
                key={tool.id}
                label={tool.label}
                iconNode={tool.iconNode}
                active={!panMode && selectedTool === tool.id}
                onClick={() => handleToolSelect(tool.id)}
                compact
                overlayUi={overlayUi}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right resize handle */}
      <div
        onMouseDown={rightPanel.startResize}
        className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/30 active:bg-primary/50 transition-colors z-20"
        title="Drag to resize layers panel"
      />

      {/* ── Right: Layers / Navigation panel (resizable) ─────────────────────── */}
      {rightPanel.width > 0 && (
      <div className="flex shrink-0 flex-col border-l border-border bg-background overflow-hidden" style={{ width: rightPanel.width }}>
        {/* Panel header */}
        <div className={`flex items-center border-b border-border ${overlayUi.panelHeaderPadding} shrink-0`}>
          {(["layers", "navigation"] as PanelView[]).map((p, i) => (
            <div key={p} className="flex items-center">
              {i > 0 && (
                <span className="mx-1.5 text-muted-foreground/30 select-none">
                  |
                </span>
              )}
              <button
                type="button"
                onClick={() => setPanelView(p)}
                className={`flex items-center gap-1 rounded px-1 py-0.5 ${overlayUi.panelHeaderText} font-medium capitalize transition ${
                  panelView === p
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "layers" ? (
                  <Layers className={overlayUi.panelHeaderIcon} />
                ) : (
                  <MapIcon className={overlayUi.panelHeaderIcon} />
                )}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            </div>
          ))}
        </div>

        {/* Panel content */}
        <div className={`flex-1 overflow-y-auto ${overlayUi.panelContentPadding}`}>
          {panelView === "layers" ? (
            <LayersPanel
              overlayUi={overlayUi}
              currentLessonPage={currentLessonPage}
              droppedCount={0}
            />
          ) : (
            <NavigationPanel currentPage={clampedCurrentPage} totalPages={totalPages} sections={lessonNavigation} onJump={changePage} overlayUi={overlayUi} />
          )}
        </div>
      </div>
      )}
    </div>
  )
}

// ─── Layers Panel ─────────────────────────────────────────────────────────────

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  indent: number
}

function LayersPanel({
  overlayUi,
  currentLessonPage,
  droppedCount,
}: {
  overlayUi: OverlayUi
  currentLessonPage: LessonCanvasPage | null
  droppedCount: number
}) {
  const [layers, setLayers] = useState<Layer[]>([
    { id: "meta", name: "Session Meta", visible: true, locked: true, indent: 0 },
    { id: "program", name: "Program", visible: true, locked: false, indent: 0 },
    { id: "resources", name: "Resources", visible: true, locked: false, indent: 0 },
    { id: "instruction", name: "Instruction Area", visible: true, locked: false, indent: 1 },
    { id: "student", name: "Student Area", visible: true, locked: false, indent: 1 },
    { id: "teacher", name: "Teacher Area", visible: true, locked: false, indent: 1 },
    { id: "footer", name: "Footer Meta", visible: true, locked: true, indent: 0 },
  ])

  function toggleVisible(id: string) {
    setLayers((ls) =>
      ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }
  function toggleLocked(id: string) {
    setLayers((ls) =>
      ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    )
  }

  if (layers.length === 0) {
    return (
      <p className={`px-2 py-4 ${overlayUi.panelItemText} text-muted-foreground italic`}>No layers yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      {currentLessonPage && (
        <div className="rounded border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className={`${overlayUi.panelItemText} font-semibold text-foreground`}>
            {currentLessonPage.moduleName} · Lesson {currentLessonPage.lessonNumber}
          </p>
          <p className={`${overlayUi.controlLabel} text-muted-foreground`}>
            {currentLessonPage.lessonTitle} · {currentLessonPage.templateType}
          </p>
          <p className={`${overlayUi.controlLabel} text-muted-foreground`}>
            Dropped assets: {droppedCount}
          </p>
        </div>
      )}
      <ol className="space-y-0.5">
      {layers.map((layer) => (
        <li
          key={layer.id}
          className={`flex items-center gap-1.5 rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/50`}
          style={{ paddingLeft: `${4 + layer.indent * 10}px` }}
        >
          {/* Visibility */}
          <button
            type="button"
            onClick={() => toggleVisible(layer.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition"
            title={layer.visible ? "Hide layer" : "Show layer"}
          >
            {layer.visible
              ? <Eye    className={overlayUi.panelItemIcon} />
              : <EyeOff className={`${overlayUi.panelItemIcon} opacity-30`} />}
          </button>

          {/* Lock */}
          <button
            type="button"
            onClick={() => toggleLocked(layer.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition"
            title={layer.locked ? "Unlock layer" : "Lock layer"}
          >
            {layer.locked
              ? <Lock   className={overlayUi.panelItemIcon} />
              : <Unlock className={`${overlayUi.panelItemIcon} opacity-30`} />}
          </button>

          {/* Name */}
          <span className={`flex-1 truncate ${!layer.visible ? "opacity-40" : ""}`}>
            {layer.name}
          </span>
        </li>
      ))}
      </ol>
    </div>
  )
}

// ─── Navigation Panel ─────────────────────────────────────────────────────────

function NavigationPanel({
  currentPage,
  totalPages,
  sections,
  onJump,
  overlayUi,
}: {
  currentPage: number
  totalPages: number
  sections: Array<{ label: string; start: number; end: number }>
  onJump: (page: number) => void
  overlayUi: OverlayUi
}) {
  return (
    <div className="space-y-1">
      <p className={`px-1 ${overlayUi.controlLabel} font-semibold uppercase tracking-widest text-muted-foreground mb-2`}>
        Course Structure
      </p>
      {sections.length === 0 && (
        <p className={`${overlayUi.panelItemText} px-1 text-muted-foreground italic`}>No lesson canvases yet.</p>
      )}
      {sections.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onJump(s.start)}
          className={`flex w-full items-center justify-between rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/60 transition`}
        >
          <span className="truncate">{s.label}</span>
          <span className={`ml-2 shrink-0 ${overlayUi.controlLabel} text-muted-foreground`}>
            {s.start === s.end ? String(s.start) : `${s.start}–${s.end}`}
          </span>
        </button>
      ))}
      <p className={`px-2 pt-2 ${overlayUi.controlLabel} text-muted-foreground`}>
        Page {currentPage} of {totalPages}
      </p>
    </div>
  )
}
