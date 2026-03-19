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
import {
  CurateOverlayPanels,
  getCurateOverlayInset,
} from "@/components/coursebuilder/create/sidebar/curate-overlay-panels"
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

  const [cardsPanelWidth, setCardsPanelWidth] = useState(360)
  const cardsPanelWidthRef = useRef(cardsPanelWidth)

  const [atlasWidth, setAtlasWidth] = useState(360)
  const atlasWidthRef = useRef(atlasWidth)

  useEffect(() => {
    cardsPanelWidthRef.current = cardsPanelWidth
  }, [cardsPanelWidth])

  useEffect(() => {
    atlasWidthRef.current = atlasWidth
  }, [atlasWidth])

  // Mobile: which panel (if any) is open — exclusive, one at a time
  const [mobileOpenPanel, setMobileOpenPanel] = useState<"none" | "files" | "atlas">("none")

  // Collapse or restore panels when viewport crosses the mobile breakpoint
  useEffect(() => {
    if (isMobile) {
      setCardsPanelWidth(0)
      setAtlasWidth(0)
      setMobileOpenPanel("none")
    } else {
      // Restore desktop defaults when switching back from mobile
      setCardsPanelWidth((prev) => (prev === 0 ? 360 : prev))
      setAtlasWidth((prev) => (prev === 0 ? 360 : prev))
    }
  }, [isMobile])

  const handleMobilePanelToggle = useCallback(
    (panel: "files" | "atlas") => {
      if (mobileOpenPanel === panel) {
        setMobileOpenPanel("none")
        if (panel === "files") setCardsPanelWidth(0)
        else setAtlasWidth(0)
      } else {
        const vw = window.innerWidth
        setMobileOpenPanel(panel)
        if (panel === "files") {
          setCardsPanelWidth(vw)
          setAtlasWidth(0)
        } else {
          setAtlasWidth(vw)
          setCardsPanelWidth(0)
        }
      }
    },
    [mobileOpenPanel],
  )

  const handleCloseMobilePanel = useCallback(() => {
    setMobileOpenPanel("none")
    setCardsPanelWidth(0)
    setAtlasWidth(0)
  }, [])

  const handleCardsResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = cardsPanelWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setCardsPanelWidth(Math.max(0, Math.min(520, startWidth + ev.clientX - startX)))
    }
    const onUp = () => {
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
      setAtlasWidth(Math.max(0, Math.min(520, startWidth - (ev.clientX - startX))))
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
      <div className={`flex flex-col w-full h-full overflow-x-visible overflow-y-hidden bg-neutral-100 ${className ?? ""}`}>
        {/* Top mode bar */}
        {showModeBar !== false && <ModeBar />}

        {/* Mobile panel toggle bar — curate mode only, hidden above md */}
        {mode === "curate" && (
          <div className="flex items-center shrink-0 h-9 px-3 gap-1.5 border-b border-neutral-200 bg-white md:hidden">
            <span className="flex-1 text-[11px] font-medium text-neutral-400">Canvas</span>
            <button
              onClick={() => handleMobilePanelToggle("files")}
              title="Files browser"
              className={`p-1.5 rounded transition-colors ${
                mobileOpenPanel === "files"
                  ? "bg-[#dbe8f6] text-[#233f5d]"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <PanelLeft size={15} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => handleMobilePanelToggle("atlas")}
              title="Atlas"
              className={`p-1.5 rounded transition-colors ${
                mobileOpenPanel === "atlas"
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
              ) : (
                <EmptyState courseId={courseId} />
              )}
            </div>

            <CurateOverlayPanels
              filesWidth={cardsPanelWidth}
              atlasWidth={atlasWidth}
              onResizeFilesStart={handleCardsResizeStart}
              onResizeAtlasStart={handleAtlasResizeStart}
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
