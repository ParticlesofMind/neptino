"use client"

/**
 * CreateEditorLayout
 *
 * Top-level editor shell. Controls the active editing mode:
 *
 *   Canvas    — compose the lesson canvas (cards + canvas + Atlas)
 *   Add Card — create new cards from scratch (card-type gallery)
 *
 * Props
 *   courseId  — UUID string or null (Zustand store handles the null case gracefully)
 *   className — optional extra Tailwind classes applied to the root div
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core"
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
import { courseEditorCollisionDetection } from "@/components/coursebuilder/create/drag/course-editor-collision"

// ─── Types ────────────────────────────────────────────────────────────────────

import { useCreateModeStore }  from "./store/createModeStore"
import { CanvasDebugPanel }    from "./canvas/CanvasDebugPanel"
import { EditorNoticeBanner }  from "./notifications/EditorNoticeBanner"

const CARDS_PANEL_DEFAULT_WIDTH = 420
const CARDS_PANEL_MIN_WIDTH = 300
const CARDS_PANEL_MAX_WIDTH = 560
const ATLAS_PANEL_DEFAULT_WIDTH = 360
const ATLAS_PANEL_MIN_WIDTH = 300
const ATLAS_PANEL_MAX_WIDTH = 520

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

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEditorLayout({ courseId, className, showModeBar = true }: CreateEditorLayoutProps) {
  // editor mode state lives in a global store so that the header can read it
  const mode = useCreateModeStore((s) => s.mode)

  const isMobile = useIsMobile()

  const [cardsPanelWidth, setCardsPanelWidth] = useState(CARDS_PANEL_DEFAULT_WIDTH)
  const cardsPanelWidthRef = useRef(cardsPanelWidth)

  const [atlasWidth, setAtlasWidth] = useState(ATLAS_PANEL_DEFAULT_WIDTH)
  const atlasWidthRef = useRef(atlasWidth)

  const [viewportWidth, setViewportWidth] = useState(0)
  const [showCanvasDebug, setShowCanvasDebug] = useState(false)

  useEffect(() => { cardsPanelWidthRef.current = cardsPanelWidth }, [cardsPanelWidth])
  useEffect(() => { atlasWidthRef.current = atlasWidth }, [atlasWidth])

  useEffect(() => {
    if (typeof window === "undefined") return
    const sync = () => setViewportWidth(window.innerWidth)
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const frame = window.requestAnimationFrame(() => {
      setShowCanvasDebug(new URLSearchParams(window.location.search).get("debugCanvas") === "1")
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  // Collapse both panels on mobile. On desktop, keep Cards and Atlas available by default.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isMobile) {
        setCardsPanelWidth(0)
        setAtlasWidth(0)
      } else {
        setCardsPanelWidth(CARDS_PANEL_DEFAULT_WIDTH)
        setAtlasWidth(ATLAS_PANEL_DEFAULT_WIDTH)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isMobile])

  const handleCloseMobilePanel = useCallback(() => {
    setCardsPanelWidth(0)
    setAtlasWidth(0)
  }, [])

  const openCardsPanel = useCallback(() => {
    setCardsPanelWidth(isMobile ? viewportWidth : CARDS_PANEL_DEFAULT_WIDTH)
    if (isMobile) setAtlasWidth(0)
  }, [isMobile, viewportWidth])

  const openAtlasPanel = useCallback(() => {
    setAtlasWidth(isMobile ? viewportWidth : ATLAS_PANEL_DEFAULT_WIDTH)
    if (isMobile) setCardsPanelWidth(0)
  }, [isMobile, viewportWidth])

  // Desktop drag handles — live preview while dragging, snap to fixed/closed on release
  const handleCardsResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = cardsPanelWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setCardsPanelWidth(Math.max(0, Math.min(CARDS_PANEL_MAX_WIDTH, startWidth + ev.clientX - startX)))
    }
    const onUp = (ev: MouseEvent) => {
      const final = startWidth + ev.clientX - startX
      setCardsPanelWidth(final >= CARDS_PANEL_MIN_WIDTH / 2
        ? Math.max(CARDS_PANEL_MIN_WIDTH, Math.min(CARDS_PANEL_MAX_WIDTH, final))
        : 0)
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
      setAtlasWidth(Math.max(0, Math.min(ATLAS_PANEL_MAX_WIDTH, startWidth - (ev.clientX - startX))))
    }
    const onUp = (ev: MouseEvent) => {
      const final = startWidth - (ev.clientX - startX)
      setAtlasWidth(final >= ATLAS_PANEL_MIN_WIDTH / 2
        ? Math.max(ATLAS_PANEL_MIN_WIDTH, Math.min(ATLAS_PANEL_MAX_WIDTH, final))
        : 0)
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  // Load sessions from Supabase whenever courseId changes
  const { loading, error } = useCourseSessionLoader(courseId, { requireEditable: true })
  const showLoading = useSteadyLoading(loading)

  // Persist canvas state (topics tree, canvas pages) back to Supabase
  useCanvasPersistence({ enabled: !loading && !error })

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
      collisionDetection={courseEditorCollisionDetection}
      autoScroll={false}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`flex h-full w-full flex-col overflow-hidden bg-muted/20 ${className ?? ""}`}>
        {/* Top mode bar */}
        {showModeBar !== false && <ModeBar />}

        {/* Mode bodies */}
        {mode === "curate" && (
          <div className="relative flex flex-1 min-h-0 overflow-hidden">
            <EditorNoticeBanner />
            {/* Full-width canvas viewport */}
            <div className="flex flex-1 flex-col overflow-hidden bg-neutral-200">
              {error ? (
                <EditorLoadError message={error} />
              ) : sessions.length > 0 ? (
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
              onOpenFiles={openCardsPanel}
              onOpenAtlas={openAtlasPanel}
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

      </div>

      {/* Drag overlay — rendered on top of everything during a drag */}
      <DragOverlay dropAnimation={null}>
        {activeDragData && <DragOverlayCard data={activeDragData} />}
      </DragOverlay>

      {/* Dev debug panel — opt-in with ?debugCanvas=1. */}
      {showCanvasDebug && <CanvasDebugPanel />}
    </DndContext>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ courseId }: { courseId: string | null }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
      <p className="text-sm font-medium text-foreground">No sessions found{courseId ? ` for course ${courseId}` : ""}.</p>
      <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        Create a course in the setup wizard and return here to start building.
      </p>
    </div>
  )
}

function EditorLoadError({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-foreground">Cannot open this course in Create</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{message}</p>
    </div>
  )
}

function LoadingSessionsPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-background/90 p-6 shadow-sm">
        <div className="h-4 w-44 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded bg-muted/70" />
          <div className="h-10 rounded bg-muted/70" />
          <div className="h-10 rounded bg-muted/70" />
        </div>
      </div>
    </div>
  )
}
