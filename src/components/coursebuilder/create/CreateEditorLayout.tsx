"use client"

/**
 * CreateEditorLayout
 *
 * Top-level editor shell. Controls the active editing mode:
 *
 *   Curate — compose the lesson canvas (file browser + canvas + layers + toolbar)
 *   Make   — create new cards from scratch (card-type gallery)
 *   Fix    — review and repair cards (coming soon)
 *
 * Props
 *   courseId  — UUID string or null (Zustand store handles the null case gracefully)
 *   className — optional extra Tailwind classes applied to the root div
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type CollisionDetection,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { Wrench } from "lucide-react"

import { FilesBrowser }      from "@/components/coursebuilder/create/sidebar/FilesBrowser"
import { MakePanel }         from "@/components/coursebuilder/create/sidebar/MakePanel"
import { LayersPanel }       from "@/components/coursebuilder/create/layers/LayersPanel"
import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"
import { useCardDrop }             from "@/components/coursebuilder/create/hooks/useCardDrop"
import { useCourseSessionLoader }  from "@/components/coursebuilder/create/hooks/useCourseSessionLoader"
import { useCanvasPersistence }    from "@/components/coursebuilder/create/hooks/useCanvasPersistence"
import { useCourseStore }          from "@/components/coursebuilder/create/store/courseStore"
import { useCanvasStore }          from "@/components/coursebuilder/create/store/canvasStore"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import type { CourseId, SessionId } from "@/components/coursebuilder/create/types"
import type { DragSourceData } from "@/components/coursebuilder/create/hooks/useCardDrop"

// ─── Types ────────────────────────────────────────────────────────────────────

import { useCreateModeStore }  from "./store/createModeStore"
import { CanvasDebugPanel }    from "./canvas/CanvasDebugPanel"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateEditorLayoutProps {
  /** Course UUID — may be null when the wizard hasn't yet persisted a course. */
  courseId:   string | null
  className?: string
  /** If false, the mode bar will not be rendered. Parent components (eg the
   * wizard header) may render the bar separately when appropriate. */
  showModeBar?: boolean
}

// ─── Mode bar ─────────────────────────────────────────────────────────────────

// ModeBar is now a standalone component that reads from a shared store.
// A separate file exports it so it can be rendered in the page header.
import { ModeBar } from "./ModeBar"

// (the previous ModeBar implementation was moved to ModeBar.tsx)

// ─── Fix placeholder ──────────────────────────────────────────────────────────

function FixView() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-400">
      <Wrench size={24} strokeWidth={1.5} />
      <p className="text-sm font-medium text-neutral-500">Fix mode</p>
      <p className="text-xs max-w-xs text-center leading-relaxed">
        Review and repair cards on the canvas. Coming soon.
      </p>
    </div>
  )
}

// ─── Drag overlay card ───────────────────────────────────────────────────────

// Schematic grid configs for each layout kind
const LAYOUT_SCHEMATICS = {
  "layout-split":     { cols: 2, rows: 1 },
  "layout-stack":     { cols: 1, rows: 2 },
  "layout-feature":   { cols: 2, rows: 2, custom: "feature" },
  "layout-sidebar":   { cols: 2, rows: 1, asymmetric: true },
  "layout-quad":      { cols: 2, rows: 2 },
  "layout-mosaic":    { cols: 3, rows: 3 },
  // New layouts
  "layout-triptych":  { cols: 3, rows: 1 },
  "layout-trirow":    { cols: 1, rows: 3 },
  "layout-banner":    { cols: 2, rows: 2, custom: "banner" },
  "layout-broadside": { cols: 3, rows: 2, custom: "broadside" },
  "layout-tower":     { cols: 2, rows: 3, custom: "tower" },
  "layout-pinboard":  { cols: 2, rows: 3, custom: "pinboard" },
  "layout-annotated": { cols: 3, rows: 2, custom: "annotated" },
  "layout-sixgrid":   { cols: 3, rows: 2 },
} as const

type LayoutKindKey = keyof typeof LAYOUT_SCHEMATICS

function LayoutSchematicOverlay({ cardType }: { cardType: LayoutKindKey }) {
  const spec = LAYOUT_SCHEMATICS[cardType]
  const label = cardType.replace("layout-", "").charAt(0).toUpperCase() +
                cardType.replace("layout-", "").slice(1)

  if (cardType === "layout-feature") {
    // 2-col, 2-row with left spanning full height
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gridTemplateRows: "2fr 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 3 / 2" }} className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-sidebar") {
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 7fr", gap: 2, height: 36 }}>
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-banner") {
    // Full-width header strip + 2 equal columns below
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 3" }} className="rounded-sm bg-neutral-300 border border-neutral-400" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-broadside") {
    // Full-width header strip + 3 equal columns below
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 4" }} className="rounded-sm bg-neutral-300 border border-neutral-400" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-tower") {
    // Wide left column spanning full height + 3 stacked right cells
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 2, height: 56 }}>
          <div style={{ gridArea: "1 / 1 / 4 / 2" }} className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-pinboard") {
    // Full-width header strip + 2×2 grid below
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr 1fr", gap: 2, height: 60 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 3" }} className="rounded-sm bg-neutral-300 border border-neutral-400" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-200 border border-neutral-300" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-annotated") {
    // Narrow annotation column spanning full height + 2×2 content grid
    return (
      <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[140px]">
        <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
          {label} layout
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gridTemplateRows: "1fr 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 3 / 2" }} className="rounded-sm bg-neutral-200 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
          <div className="rounded-sm bg-neutral-100 border border-neutral-300" />
        </div>
      </div>
    )
  }

  const cells = spec.cols * spec.rows
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded border border-neutral-200 bg-white shadow-lg cursor-grabbing min-w-[120px]">
      <span className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wide">
        {label} layout
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${spec.cols}, 1fr)`,
          gridTemplateRows: `repeat(${spec.rows}, 1fr)`,
          gap: 2,
          height: spec.rows === 1 ? 36 : spec.rows === 3 ? 52 : 44,
        }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <div key={i} className="rounded-sm bg-neutral-200 border border-neutral-300" />
        ))}
      </div>
    </div>
  )
}

// Card type color accents for non-layout overlay
const CARD_TYPE_ACCENT: Partial<Record<string, string>> = {
  text:        "bg-sky-100 text-sky-700",
  image:       "bg-violet-100 text-violet-700",
  video:       "bg-rose-100 text-rose-700",
  audio:       "bg-emerald-100 text-emerald-700",
  document:    "bg-amber-100 text-amber-700",
  chart:       "bg-orange-100 text-orange-700",
  diagram:     "bg-teal-100 text-teal-700",
  table:       "bg-indigo-100 text-indigo-700",
  map:         "bg-lime-100 text-lime-700",
  animation:   "bg-pink-100 text-pink-700",
  dataset:     "bg-cyan-100 text-cyan-700",
  interactive: "bg-purple-100 text-purple-700",
}

function DragOverlayCard({ data }: { data: DragSourceData }) {
  if (data.cardType in LAYOUT_SCHEMATICS) {
    return <LayoutSchematicOverlay cardType={data.cardType as LayoutKindKey} />
  }

  const title = data.title ?? (data.cardType as string)
  const accentClass = CARD_TYPE_ACCENT[data.cardType] ?? "bg-neutral-100 text-neutral-500"

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-200 bg-white shadow-lg text-xs cursor-grabbing">
      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold tracking-wide ${accentClass}`}>
        {data.cardType}
      </span>
      <span className="text-neutral-700 truncate max-w-[200px]">{title}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEditorLayout({ courseId, className, showModeBar = true }: CreateEditorLayoutProps) {
  const typedCourseId    = (courseId ?? "") as CourseId

  // editor mode state lives in a global store so that the header can read it
  const mode = useCreateModeStore((s) => s.mode)

  // Resizable file-browser sidebar
  const [sidebarWidth, setSidebarWidth] = useState(360)
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = sidebarWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.max(160, Math.min(520, startWidth + ev.clientX - startX)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  // Load sessions from Supabase whenever courseId changes
  const { loading } = useCourseSessionLoader(courseId)

  // Persist canvas state (topics tree, canvas pages) back to Supabase
  useCanvasPersistence()

  const sessions         = useCourseStore((s) => s.sessions)
  const activeSessionId  = useCourseStore((s) => s.activeSessionId)
  const setActiveSession = useCourseStore((s) => s.setActiveSession)

  // Active session (first session as fallback)
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  )

  // Auto-select first session when none is active
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id as SessionId)
    }
  }, [activeSessionId, sessions, setActiveSession])

  // Canvas store — needed to toggle mediaDragActive during drags
  const setMediaDragActive = useCanvasStore((s) => s.setMediaDragActive)

  // Track the active drag item for the DragOverlay
  const [activeDragData, setActiveDragData] = useState<DragSourceData | null>(null)

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args)
    if (pointerHits.length > 0) return pointerHits
    return rectIntersection(args)
  }, [])

  const { onDragEnd: onCardDrop } = useCardDrop()

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const source = event.active.data.current as DragSourceData | undefined
      if (source?.type === "card") {
        setActiveDragData(source)
        setMediaDragActive(true)
      }
    },
    [setMediaDragActive],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragData(null)
      setMediaDragActive(false)
      onCardDrop(event)
    },
    [onCardDrop, setMediaDragActive],
  )

  const handleDragCancel = useCallback(() => {
    setActiveDragData(null)
    setMediaDragActive(false)
  }, [setMediaDragActive])

  if (loading) {
    return (
      <div className={`flex items-center justify-center flex-1 h-full bg-neutral-100 ${className ?? ""}`}>
        <p className="text-sm text-neutral-400">Loading sessions&hellip;</p>
      </div>
    )
  }

  return (
    <DndContext
      id="course-editor-dnd"
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`flex flex-col w-full h-full overflow-hidden bg-neutral-100 ${className ?? ""}`}>
        {/* Top mode bar */}
        {showModeBar !== false && <ModeBar />}

        {/* Mode bodies */}
        {mode === "curate" && (
          <div className="flex flex-1 min-h-0">
            {/* Left sidebar — file browser (resizable) */}
            <div style={{ width: sidebarWidth }} className="shrink-0 flex flex-col overflow-hidden">
              <FilesBrowser />
            </div>

            {/* Resize handle */}
            <div
              className="w-1 bg-neutral-200 cursor-col-resize hover:bg-neutral-400 transition-colors shrink-0"
              onMouseDown={handleResizeStart}
            />

            {/* Center — canvas viewport */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-neutral-200">
              {sessions.length > 0 ? (
                <CanvasVirtualizer
                  sessions={sessions}
                  dims={DEFAULT_PAGE_DIMENSIONS}
                />
              ) : (
                <EmptyState courseId={typedCourseId} />
              )}
            </div>

            {/* Resize handle */}
            <div className="w-px bg-neutral-200 cursor-col-resize hover:bg-neutral-400 transition-colors" />

            {/* Right panel — layers */}
            <div className="w-48 shrink-0 flex flex-col overflow-hidden">
              <LayersPanel session={activeSession ?? undefined} />
            </div>
          </div>
        )}

        {mode === "make" && (
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex flex-1 min-h-0">
              <MakePanel />
            </div>
          </div>
        )}

        {mode === "fix" && (
          <div className="flex flex-1 min-h-0">
            <FixView />
          </div>
        )}
      </div>

      {/* Drag overlay — rendered on top of everything during a drag */}
      <DragOverlay dropAnimation={null}>
        {activeDragData && <DragOverlayCard data={activeDragData} />}
      </DragOverlay>

      {/* Dev debug panel — floating overlay, visible only in development */}
      {process.env.NODE_ENV === "development" && <CanvasDebugPanel />}
    </DndContext>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ courseId }: { courseId: CourseId }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-400">
      <p className="text-sm">No sessions found{courseId ? ` for course ${courseId}` : ""}.</p>
      <p className="text-xs max-w-xs text-center">
        Create a course in the setup wizard and return here to start building.
      </p>
    </div>
  )
}
