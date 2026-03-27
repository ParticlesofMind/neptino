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

import { useCallback, useEffect, useRef, useState } from "react"
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
import { PanelLeft, PanelRight, Wrench } from "lucide-react"
import { useIsMobile } from "@/components/coursebuilder/create/hooks/useIsMobile"

import { MakePanel }         from "@/components/coursebuilder/create/sidebar/MakePanel"
import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"
import { PageNavStrip } from "@/components/coursebuilder/create/canvas/CanvasPageNavStrip"
import {
  CurateOverlayPanels,
  getCurateOverlayInset,
} from "@/components/coursebuilder/create/sidebar/curate-overlay-panels"
import { useSteadyLoading } from "@/components/coursebuilder"
import { useCardDrop }             from "@/components/coursebuilder/create/hooks/useCardDrop"
import { useCourseSessionLoader }  from "@/components/coursebuilder/create/hooks/useCourseSessionLoader"
import { useCanvasPersistence }    from "@/components/coursebuilder/create/hooks/useCanvasPersistence"
import { useCourseStore }          from "@/components/coursebuilder/create/store/courseStore"
import { useCanvasStore }          from "@/components/coursebuilder/create/store/canvasStore"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import type { SessionId } from "@/components/coursebuilder/create/types"
import type { DragSourceData } from "@/components/coursebuilder/create/hooks/useCardDrop"
import { DragOverlayCard } from "@/components/coursebuilder/create/drag/DragOverlayCard"

// ─── Types ────────────────────────────────────────────────────────────────────

import { useCreateModeStore }  from "./store/createModeStore"
import { CanvasDebugPanel }    from "./canvas/CanvasDebugPanel"
import { EditorNoticeBanner }  from "./notifications/EditorNoticeBanner"

const PANEL_FIXED_WIDTH = 360

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
        Review and repair blocks on the canvas. Coming soon.
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEditorLayout({ courseId, className, showModeBar = true }: CreateEditorLayoutProps) {
  // editor mode state lives in a global store so that the header can read it
  const mode = useCreateModeStore((s) => s.mode)

  const isMobile = useIsMobile()

  const [cardsPanelWidth, setCardsPanelWidth] = useState(PANEL_FIXED_WIDTH)
  const cardsPanelWidthRef = useRef(cardsPanelWidth)

  const [atlasWidth, setAtlasWidth] = useState(PANEL_FIXED_WIDTH)
  const atlasWidthRef = useRef(atlasWidth)

  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => { cardsPanelWidthRef.current = cardsPanelWidth }, [cardsPanelWidth])
  useEffect(() => { atlasWidthRef.current = atlasWidth }, [atlasWidth])

  useEffect(() => {
    if (typeof window === "undefined") return
    const sync = () => setViewportWidth(window.innerWidth)
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  // Collapse both panels when switching to mobile; restore on desktop
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isMobile) {
        setCardsPanelWidth(0)
        setAtlasWidth(0)
      } else {
        setCardsPanelWidth(PANEL_FIXED_WIDTH)
        setAtlasWidth(PANEL_FIXED_WIDTH)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isMobile])

  // Mobile tap-toggle (exclusive)
  const toggleCards = useCallback(() => {
    setCardsPanelWidth((prev) => {
      if (prev === 0) { setAtlasWidth(0); return viewportWidth }
      return 0
    })
  }, [viewportWidth])

  const toggleAtlas = useCallback(() => {
    setAtlasWidth((prev) => {
      if (prev === 0) { setCardsPanelWidth(0); return viewportWidth }
      return 0
    })
  }, [viewportWidth])

  const handleCloseMobilePanel = useCallback(() => {
    setCardsPanelWidth(0)
    setAtlasWidth(0)
  }, [])

  // Desktop drag handles — live preview while dragging, snap to fixed/closed on release
  const handleCardsResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = cardsPanelWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setCardsPanelWidth(Math.max(0, Math.min(PANEL_FIXED_WIDTH, startWidth + ev.clientX - startX)))
    }
    const onUp = (ev: MouseEvent) => {
      const final = startWidth + ev.clientX - startX
      setCardsPanelWidth(final > PANEL_FIXED_WIDTH / 2 ? PANEL_FIXED_WIDTH : 0)
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  const handleAtlasResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = atlasWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setAtlasWidth(Math.max(0, Math.min(PANEL_FIXED_WIDTH, startWidth - (ev.clientX - startX))))
    }
    const onUp = (ev: MouseEvent) => {
      const final = startWidth - (ev.clientX - startX)
      setAtlasWidth(final > PANEL_FIXED_WIDTH / 2 ? PANEL_FIXED_WIDTH : 0)
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  // Load sessions from Supabase whenever courseId changes
  const { loading } = useCourseSessionLoader(courseId)
  const showLoading = useSteadyLoading(loading)

  // Persist canvas state (topics tree, canvas pages) back to Supabase
  useCanvasPersistence()

  const sessions         = useCourseStore((s) => s.sessions)
  const activeSessionId  = useCourseStore((s) => s.activeSessionId)
  const setActiveSession = useCourseStore((s) => s.setActiveSession)

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
      <div className={`flex flex-col w-full h-full overflow-x-visible overflow-y-hidden bg-neutral-100 ${className ?? ""}`}>
        {/* Top mode bar */}
        {showModeBar !== false && <ModeBar />}

        {/* Mobile panel toggle bar — curate mode only, hidden above md */}
        {mode === "curate" && (
          <div className="flex items-center shrink-0 h-9 px-3 gap-1.5 border-b border-neutral-200 bg-white md:hidden">
            <span className="flex-1 text-[11px] font-medium text-neutral-400">Canvas</span>
            <button
              onClick={toggleCards}
              title="Files browser"
              className={`p-1.5 rounded transition-colors ${
                cardsPanelWidth > 0
                  ? "bg-[#dbe8f6] text-[#233f5d]"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <PanelLeft size={15} strokeWidth={1.75} />
            </button>
            <button
              onClick={toggleAtlas}
              title="Atlas"
              className={`p-1.5 rounded transition-colors ${
                atlasWidth > 0
                  ? "bg-[#dbe8f6] text-[#233f5d]"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <PanelRight size={15} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Mode bodies */}
        {mode === "curate" && (
          <div className="relative flex flex-1 min-h-0 overflow-hidden">
            <EditorNoticeBanner />
            {/* Full-width canvas viewport */}
            <div className="flex-1 flex flex-col overflow-x-visible overflow-y-hidden bg-neutral-200">
              {sessions.length > 0 ? (
                <CanvasVirtualizer
                  sessions={sessions}
                  dims={DEFAULT_PAGE_DIMENSIONS}
                  leftOverlayInset={getCurateOverlayInset(cardsPanelWidth)}
                  rightOverlayInset={getCurateOverlayInset(atlasWidth)}
                />
              ) : showLoading ? (
                <LoadingSessionsPlaceholder />
              ) : (
                <EmptyState courseId={courseId} />
              )}
            </div>

            <CurateOverlayPanels
              filesWidth={cardsPanelWidth}
              atlasWidth={atlasWidth}
              onResizeFilesStart={handleCardsResizeStart}
              onResizeAtlasStart={handleAtlasResizeStart}
              rightAttachedSlot={<PageNavStrip sessions={sessions} />}
              isMobile={isMobile}
              onCloseMobilePanel={handleCloseMobilePanel}
            />


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

function EmptyState({ courseId }: { courseId: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-400">
      <p className="text-sm">No sessions found{courseId ? ` for course ${courseId}` : ""}.</p>
      <p className="text-xs max-w-xs text-center">
        Create a course in the setup wizard and return here to start building.
      </p>
    </div>
  )
}

function LoadingSessionsPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-xl border border-neutral-300/70 bg-white/80 p-6">
        <div className="h-4 w-44 rounded bg-neutral-200" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded bg-neutral-100" />
          <div className="h-10 rounded bg-neutral-100" />
          <div className="h-10 rounded bg-neutral-100" />
        </div>
      </div>
    </div>
  )
}
