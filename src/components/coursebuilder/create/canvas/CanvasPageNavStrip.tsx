"use client"

import { useMemo } from "react"
import {
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import type { CourseSession, CanvasId, SessionId } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"

// ─── Right page navigation strip ─────────────────────────────────────────────

const SCROLL_TO_CANVAS_EVENT = "coursebuilder:scroll-to-canvas"

interface PageNavStripProps {
  sessions:   CourseSession[]
  onScrollTo?: (canvasId: string) => void
}

export function PageNavStrip({ sessions, onScrollTo }: PageNavStripProps) {
  const activeCanvasId    = useCanvasStore((s) => s.activeCanvasId)
  const viewportCanvasId  = useCanvasStore((s) => s.viewportCanvasId)
  const setActiveCanvas   = useCanvasStore((s) => s.setActiveCanvas)
  const setViewportCanvas = useCanvasStore((s) => s.setViewportCanvas)
  const setActiveSession  = useCourseStore((s) => s.setActiveSession)

  const pages = useMemo(
    () => sessions.flatMap((session) =>
      session.canvases.map((page) => ({ page, session })),
    ),
    [sessions],
  )
  const total = pages.length

  const currentCanvasId = viewportCanvasId ?? activeCanvasId
  const currentIndex = useMemo(() => {
    const viewportIndex = pages.findIndex(({ page }) => page.id === currentCanvasId)
    if (viewportIndex >= 0) return viewportIndex

    const activeIndex = pages.findIndex(({ page }) => page.id === activeCanvasId)
    return Math.max(0, activeIndex)
  }, [pages, currentCanvasId, activeCanvasId])
  const currentPage = currentIndex + 1

  const goTo = (index: number) => {
    const entry = pages[Math.max(0, Math.min(total - 1, index))]
    if (entry) {
      setActiveCanvas(entry.page.id as CanvasId)
      setViewportCanvas(entry.page.id as CanvasId)
      setActiveSession(entry.session.id as SessionId)
      window.dispatchEvent(new CustomEvent(SCROLL_TO_CANVAS_EVENT, { detail: { canvasId: entry.page.id } }))
      onScrollTo?.(entry.page.id)
    }
  }

  return (
    <div data-testid="canvas-page-nav-strip" className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-white py-2">
      <NavBtn title="Previous page" onClick={() => goTo(currentIndex - 1)}>
        <ChevronUp    size={13} strokeWidth={1.5} />
      </NavBtn>

      {/* Page indicator */}
      <div className="flex flex-col items-center py-1">
        <span className="text-[12px] font-semibold text-neutral-800 leading-tight">{currentPage}</span>
        <span data-testid="canvas-page-total" className="text-[9px] text-neutral-400">/ {total}</span>
      </div>

      <NavBtn title="Next page"     onClick={() => goTo(currentIndex + 1)}>
        <ChevronDown  size={13} strokeWidth={1.5} />
      </NavBtn>
    </div>
  )
}

function NavBtn({
  title,
  onClick,
  children,
}: {
  title?:  string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
    >
      {children}
    </button>
  )
}
