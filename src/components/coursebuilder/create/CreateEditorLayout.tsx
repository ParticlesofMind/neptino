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

import { useCreateModeStore } from "./store/createModeStore"

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

function DragOverlayCard({ data }: { data: DragSourceData }) {
  const title = data.title ?? (data.cardType as string)
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-200 bg-white shadow-lg text-xs cursor-grabbing">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase font-semibold tracking-wide">
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
