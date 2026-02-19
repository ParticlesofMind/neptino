"use client"

import { useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import type { CanvasPageConfig } from "@/components/canvas/PixiCanvas"
import {
  Gamepad2, AreaChart, Bot,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown,
  Layers, Map,
  // media
  File, Image, Film, AudioLines, BookOpenText, Blocks, Link,
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

// ─── Media panel items ────────────────────────────────────────────────────────

interface MediaItem {
  id: string
  label: string
  iconNode: React.ReactNode
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
  const ref = useRef({ width: initial, direction, min, max })
  ref.current.width     = width
  ref.current.direction = direction
  ref.current.min       = min
  ref.current.max       = max

  const startResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const { width: startW, direction: dir, min: mn, max: mx } = ref.current
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
  }, []) // stable — uses ref snapshot on each call

  return { width, setWidth, startResize }
}

const MEDIA_ITEMS: MediaItem[] = [
  { id: "files",   label: "Files",   iconNode: <File         className="h-5 w-5" /> },
  { id: "images",  label: "Images",  iconNode: <Image        className="h-5 w-5" /> },
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
}: {
  active?: boolean
  onClick?: () => void
  label?: string
  iconNode?: React.ReactNode
  compact?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 rounded p-1.5 text-xs transition select-none
        ${active
          ? "bg-accent text-primary"
          : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
        }
        ${compact ? "min-w-[44px]" : "min-w-[52px]"}
      `}
    >
      {iconNode}
      {label && (
        <span className="text-[10px] leading-none font-medium truncate max-w-full mt-0.5">
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

  const SmToggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean
    onChange: () => void
    label: string
  }) => (
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
        <SmToggle checked={smartGuides} onChange={() => setSmartGuides(!smartGuides)} label="Smart Guides" />
        <div className="pl-3 space-y-1 border-l border-border">
          <SmToggle checked={distLabels}   onChange={() => setDistLabels(!distLabels)}     label="Distance Labels" />
          <SmToggle checked={resizeGuides} onChange={() => setResizeGuides(!resizeGuides)} label="Resize Guides" />
          <SmToggle checked={smartSel}     onChange={() => setSmartSel(!smartSel)}         label="Smart Selection" />
          <SmToggle checked={colorCoding}  onChange={() => setColorCoding(!colorCoding)}   label="Color Coding" />
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
            <SmToggle checked={showGrid} onChange={() => setShowGrid(!showGrid)} label="Show grid" />
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
  // courseId is reserved for future per-course canvas persistence
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  courseId,
}: {
  canvasConfig?: CanvasPageConfig | null
  courseId?: string | null
} = {}) {
  const [mode, setMode] = useState<Mode>("build")
  const [activeTool, setActiveTool] = useState<BuildTool | AnimateTool>("selection")

  // Pan mode — toggled by the Grab perspective button.
  // When active the canvas uses "grab" cursor/panning regardless of activeTool.
  const [panMode, setPanMode] = useState(false)

  const [panelView, setPanelView] = useState<PanelView>("layers")
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = canvasConfig?.pageCount ?? 1
  const [zoom, setZoom] = useState(100)

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

  const changePage = useCallback(
    (next: number) =>
      setCurrentPage(Math.min(Math.max(1, next), totalPages)),
    [totalPages],
  )

  const currentTools = mode === "build" ? BUILD_TOOLS : ANIMATE_TOOLS
  const selectedTool = activeTool as string

  // Canvas tool: "grab" when panMode is active, otherwise the build/animate tool
  const canvasTool: string = panMode ? "grab" : selectedTool

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

  function ToolOptions() {
    // ── Animate mode tool options ────────────────────────────────────────
    if (mode === "animate") {
      switch (activeTool as AnimateTool) {
        case "selection":
          return (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Mode</span>
              <select
                value={selectionMode}
                onChange={(e) => setSelectionMode(e.target.value as "contain" | "intersect")}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="contain">Contain</option>
                <option value="intersect">Intersect</option>
              </select>
            </div>
          )
        case "scene":
          return (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Aspect</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {["16:9","4:3","1:1","9:16"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <span className="text-[10px] text-muted-foreground">Duration</span>
              <input
                type="number" min={1} max={60} value={sceneDuration}
                onChange={(e) => setSceneDuration(Number(e.target.value))}
                className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Scene duration"
              />
              <span className="text-[10px] text-muted-foreground">s</span>
            </div>
          )
        case "path":
          return (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Adherence</span>
              <input
                type="range" min={0} max={1} step={0.05} value={pathAdherence}
                onChange={(e) => setPathAdherence(Number(e.target.value))}
                className="w-24"
                aria-label="Path adherence"
              />
              <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(pathAdherence * 100)}%</span>
            </div>
          )
        case "modify":
          return (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Time</span>
              <input
                type="number" min={0} max={600} step={0.1} value={modifyTime}
                onChange={(e) => setModifyTime(Number(e.target.value))}
                className="w-16 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Modify time"
              />
              <span className="text-[10px] text-muted-foreground">s</span>
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
            <span className="text-[10px] text-muted-foreground">Mode</span>
            <select
              value={selectionMode}
              onChange={(e) => setSelectionMode(e.target.value as "contain" | "intersect")}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="contain">Contain</option>
              <option value="intersect">Intersect</option>
            </select>
          </div>
        )
      case "pen":
        return (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Size</span>
            <input
              type="number"
              min={1}
              max={15}
              value={penSize}
              onChange={(e) => setPenSize(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Pen size"
            />
            <span className="text-[10px] text-muted-foreground">Stroke</span>
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-border p-0"
              title="Pen stroke color"
            />
            <span className="text-[10px] text-muted-foreground">Fill</span>
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
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
              className={`rounded px-1.5 py-0.5 text-xs font-bold transition ${fontBold ? "bg-accent text-primary" : "text-foreground hover:bg-muted/60"}`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => setFontItalic(!fontItalic)}
              className={`rounded px-1.5 py-0.5 text-xs italic transition ${fontItalic ? "bg-accent text-primary" : "text-foreground hover:bg-muted/60"}`}
            >
              I
            </button>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
            <span className="text-[10px] text-muted-foreground">Size</span>
            <input
              type="number"
              min={10}
              max={50}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Brush size"
            />
            <span className="text-[10px] text-muted-foreground">Color</span>
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
            <span className="text-[10px] text-muted-foreground">Shape</span>
            <select
              value={shapeType}
              onChange={(e) => setShapeType(e.target.value)}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {["rectangle","ellipse","triangle","line","arrow","star"].map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">Stroke</span>
            <input
              type="number"
              min={1}
              max={20}
              value={shapeStrokeWidth}
              onChange={(e) => setShapeStrokeWidth(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
            <span className="text-[10px] text-muted-foreground">Size</span>
            <input
              type="number"
              min={5}
              max={50}
              value={eraserSize}
              onChange={(e) => setEraserSize(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="w-48 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40"
              disabled={!generatePrompt.trim()}
            >
              Generate
            </button>
          </div>
        )
      case "tables":
        return (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Rows</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableRows}
              onChange={(e) => setTableRows(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Table rows"
            />
            <span className="text-[10px] text-muted-foreground">Cols</span>
            <input
              type="number"
              min={1}
              max={20}
              value={tableCols}
              onChange={(e) => setTableCols(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Table cols"
            />
            <select
              value={tableType}
              onChange={(e) => setTableType(e.target.value)}
              className="rounded border border-border bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
          <div className="flex flex-col items-center gap-0.5 p-1 pt-2">
            {MEDIA_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setActiveMedia(item.id)}
                className={`flex flex-col items-center gap-0.5 rounded p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground ${
                  activeMedia === item.id ? "bg-accent text-primary" : ""
                }`}
              >
                <span className="h-5 w-5">{item.iconNode}</span>
                <span className="text-[9px] leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: search + media content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-3 py-2.5">
            <input
              type="search"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] italic text-muted-foreground/50 px-1 py-2">
              Select a category to browse assets.
            </p>
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
          <PixiCanvas config={canvasConfig ?? undefined} zoom={zoom} onZoomChange={setZoom} activeTool={canvasTool} />
        </div>

        {/* ── Perspective controls (left side of canvas) ── */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
          {/* Zoom indicator */}
          <div
            title="Current zoom level — Ctrl/Cmd+scroll to zoom"
            className="py-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
          >
            {zoom}%
          </div>

          <EngineBtn
            label="Focus"
            iconNode={<ZoomIn    className="h-5 w-5" />}
            onClick={() => setZoom((z) => Math.min(z + 10, 400))}
          />
          <EngineBtn
            label="Expand"
            iconNode={<ZoomOut   className="h-5 w-5" />}
            onClick={() => setZoom((z) => Math.max(z - 10, 10))}
          />
          <EngineBtn
            label="Reset"
            iconNode={<RotateCcw className="h-5 w-5" />}
            onClick={() => setZoom(100)}
          />
          <EngineBtn
            label="Grab"
            iconNode={<Hand className="h-5 w-5" />}
            active={panMode}
            onClick={() => setPanMode((p) => !p)}
          />
          <EngineBtn
            label="Grid"
            iconNode={<Grid3x3   className="h-5 w-5" />}
            active={snapMenuOpen}
            onClick={() => setSnapMenuOpen((o) => !o)}
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
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
          <EngineBtn
            label="First"
            onClick={() => changePage(1)}
            iconNode={<ChevronsUp className="h-4 w-4" />}
          />
          <EngineBtn
            label="Prev"
            onClick={() => changePage(currentPage - 1)}
            iconNode={<ChevronUp className="h-4 w-4" />}
          />
          {/* Page input */}
          <div className="flex flex-col items-center py-1 text-[10px] text-muted-foreground">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => changePage(Number(e.target.value))}
              className="w-10 rounded border border-border bg-background px-1 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="mt-0.5 opacity-60">/ {totalPages}</span>
          </div>
          <EngineBtn
            label="Next"
            onClick={() => changePage(currentPage + 1)}
            iconNode={<ChevronDown className="h-4 w-4" />}
          />
          <EngineBtn
            label="Last"
            onClick={() => changePage(totalPages)}
            iconNode={<ChevronsDown className="h-4 w-4" />}
          />
        </div>

        {/* ── Bottom controls bar ── */}
        <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-border bg-background/95 px-3 py-1.5 shadow-md backdrop-blur-sm">

          {/* Mode selector */}
          <div className="flex items-center gap-0.5 border-r border-border pr-3 mr-1">
            {(["build", "animate"] as Mode[]).map((m) => (
              <EngineBtn
                key={m}
                label={m.charAt(0).toUpperCase() + m.slice(1)}
                iconNode={m === "build" ? <Hammer className="h-5 w-5" /> : <Clapperboard className="h-5 w-5" />}
                active={mode === m}
                onClick={() => handleModeChange(m)}
                compact
              />
            ))}
          </div>

          {/* Tool options (context-sensitive) */}
          <div className="flex min-w-0 items-center gap-1.5 border-r border-border pr-3 mr-1 h-9">
            <ToolOptions />
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
        <div className="flex items-center border-b border-border px-3 py-2 shrink-0">
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
                className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium capitalize transition ${
                  panelView === p
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "layers" ? (
                  <Layers className="h-3 w-3" />
                ) : (
                  <Map className="h-3 w-3" />
                )}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            </div>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-2">
          {panelView === "layers" ? (
            <LayersPanel />
          ) : (
            <NavigationPanel currentPage={currentPage} totalPages={totalPages} />
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

function LayersPanel() {
  const [layers, setLayers] = useState<Layer[]>([
    { id: "header",   name: "Header",   visible: true, locked: false, indent: 0 },
    { id: "title",    name: "Title",    visible: true, locked: true,  indent: 1 },
    { id: "content",  name: "Content",  visible: true, locked: false, indent: 0 },
    { id: "body-text",name: "Body Text",visible: true, locked: false, indent: 1 },
    { id: "image-1",  name: "Image 1",  visible: true, locked: false, indent: 1 },
    { id: "footer",   name: "Footer",   visible: true, locked: false, indent: 0 },
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
      <p className="px-2 py-4 text-xs text-muted-foreground italic">No layers yet.</p>
    )
  }

  return (
    <ol className="space-y-0.5">
      {layers.map((layer) => (
        <li
          key={layer.id}
          className="flex items-center gap-1.5 rounded px-1 py-1 text-xs text-foreground hover:bg-muted/50"
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
              ? <Eye    className="h-3.5 w-3.5" />
              : <EyeOff className="h-3.5 w-3.5 opacity-30" />}
          </button>

          {/* Lock */}
          <button
            type="button"
            onClick={() => toggleLocked(layer.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition"
            title={layer.locked ? "Unlock layer" : "Lock layer"}
          >
            {layer.locked
              ? <Lock   className="h-3.5 w-3.5" />
              : <Unlock className="h-3.5 w-3.5 opacity-30" />}
          </button>

          {/* Name */}
          <span className={`flex-1 truncate ${!layer.visible ? "opacity-40" : ""}`}>
            {layer.name}
          </span>
        </li>
      ))}
    </ol>
  )
}

// ─── Navigation Panel ─────────────────────────────────────────────────────────

function NavigationPanel({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const sections = [
    { label: "Header", pages: "1" },
    { label: "Introduction", pages: "2–5" },
    { label: "Chapter 1", pages: "6–45" },
    { label: "Chapter 2", pages: "46–90" },
    { label: "Exercises", pages: "91–180" },
    { label: "Assessment", pages: "181–210" },
    { label: "Appendix", pages: "211–225" },
  ]
  return (
    <div className="space-y-1">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Course Structure
      </p>
      {sections.map((s) => (
        <button
          key={s.label}
          type="button"
          className="flex w-full items-center justify-between rounded px-2 py-1 text-xs text-foreground hover:bg-muted/60 transition"
        >
          <span className="truncate">{s.label}</span>
          <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{s.pages}</span>
        </button>
      ))}
      <p className="px-2 pt-2 text-[10px] text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  )
}
