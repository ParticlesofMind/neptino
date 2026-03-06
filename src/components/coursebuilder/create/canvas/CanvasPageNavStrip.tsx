"use client"

import { useMemo } from "react"
import {
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
} from "lucide-react"
import type { CourseSession, CanvasId } from "../types"
import { useCanvasStore } from "../store/canvasStore"

// ─── Right page navigation strip ─────────────────────────────────────────────

interface PageNavStripProps {
  sessions:   CourseSession[]
  onScrollTo?: (canvasId: string) => void
}

export function PageNavStrip({ sessions, onScrollTo }: PageNavStripProps) {
  const activeCanvasId  = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  const pages = useMemo(() => sessions.flatMap((s) => s.canvases), [sessions])
  const total = pages.length

  const currentIndex = useMemo(
    () => Math.max(0, pages.findIndex((p) => p.id === activeCanvasId)),
    [pages, activeCanvasId],
  )
  const currentPage = currentIndex + 1

  const goTo = (index: number) => {
    const page = pages[Math.max(0, Math.min(total - 1, index))]
    if (page) {
      setActiveCanvas(page.id as CanvasId)
      onScrollTo?.(page.id)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-14 shrink-0 bg-white rounded-xl shadow-sm self-center mx-2 py-3">
      <NavBtn title="First page"    onClick={() => goTo(0)}>
        <ChevronsUp   size={13} strokeWidth={1.5} />
        <span className="text-[7px]">First</span>
      </NavBtn>
      <NavBtn title="Previous page" onClick={() => goTo(currentIndex - 1)}>
        <ChevronUp    size={13} strokeWidth={1.5} />
        <span className="text-[7px]">Prev</span>
      </NavBtn>

      {/* Page indicator */}
      <div className="flex flex-col items-center py-1">
        <span className="text-[12px] font-semibold text-neutral-800 leading-tight">{currentPage}</span>
        <span data-testid="canvas-page-total" className="text-[9px] text-neutral-400">/ {total}</span>
      </div>

      <NavBtn title="Next page"     onClick={() => goTo(currentIndex + 1)}>
        <ChevronDown  size={13} strokeWidth={1.5} />
        <span className="text-[7px]">Next</span>
      </NavBtn>
      <NavBtn title="Last page"     onClick={() => goTo(total - 1)}>
        <ChevronsDown size={13} strokeWidth={1.5} />
        <span className="text-[7px]">Last</span>
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
      className="flex flex-col items-center gap-0.5 w-10 py-1 rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
    >
      {children}
    </button>
  )
}
