"use client"

/**
 * Canvas Virtualizer
 *
 * Renders ALL sessions' canvases in a single vertical scroll — no tab switching.
 * Session-label dividers separate each session's pages.
 *
 *   ┌──────────┬──────────────────────────────────┬───────────┐
 *   │  Zoom /  │   Session A label                │  Page     │
 *   │  Canvas  │   [Canvas page 1]                │  Nav      │
 *   │  Controls│   [Canvas page 2]                │  strip    │
 *   │          │   Session B label                │           │
 *   │          │   [Canvas page 1]                │           │
 *   └──────────┴──────────────────────────────────┴───────────┘
 *
 * TanStack Virtual renders only the 2-3 visible rows at any time.
 */

import { useRef, useMemo, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Focus,
  ZoomIn,
  RotateCcw,
  Hand,
  Grid3X3,
  Layers2,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
} from "lucide-react"
import type { CourseSession, CanvasPage, PageDimensions, CanvasId } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { CanvasPage as CanvasPageView } from "./CanvasPage"
import { useCanvasStore }    from "../store/canvasStore"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32
const OVERSCAN = 1

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasVirtualizerProps {
  sessions:  CourseSession[]
  dims?:     PageDimensions
  bodyData?: Record<string, Record<string, unknown>>
}

// ─── Field values helper ───────────────────────────────────────────────────────

function makeFieldValues(
  session:    CourseSession,
  pageIndex:  number,
  totalPages: number,
): Record<string, string> {
  const year = new Date().getFullYear().toString()

  return {
    // Session identity
    title:          session.title,
    lesson_title:   session.title,
    lesson_label:   session.title,
    lesson_number:  String(session.order),
    session_number: String(session.order),
    session_label:  `Session ${session.order}`,

    // Course metadata (Header block: lesson_label | session_label | module | course_title | level)
    course_title:   session.courseTitle ?? "",
    module:         session.moduleName  ?? "",
    module_title:   session.moduleName  ?? "",
    level:          session.pedagogy    ?? "",
    pedagogy:       session.pedagogy    ?? "",
    teacher_name:   session.teacherName ?? "",

    // Date (Header right-side)
    date:           session.scheduleDate ?? "",
    schedule_date:  session.scheduleDate ?? "",

    // Footer fields
    institution:    session.institution ?? "",
    copyright:      session.institution
      ? `\u00a9 ${year} ${session.institution}`
      : `\u00a9 ${year}`,

    // Pagination
    page_number:    String(pageIndex + 1),
    total_pages:    String(totalPages),
  }
}

// ─── Flat virtual row types ────────────────────────────────────────────────────

type VirtualRow =
  | { kind: "session-label"; session: CourseSession }
  | {
      kind:        "canvas"
      page:        CanvasPage
      session:     CourseSession
      isLastPage:  boolean
      fieldValues: Record<string, string>
    }

const SESSION_LABEL_HEIGHT = 48

// ─── Left zoom / canvas-controls strip ────────────────────────────────────────

function CanvasControlsStrip() {
  const zoomLevel = useCanvasStore((s) => s.zoomLevel)
  const setZoom   = useCanvasStore((s) => s.setZoom)
  const stepZoom  = useCanvasStore((s) => s.stepZoom)
  const resetView = useCanvasStore((s) => s.resetView)
  const activeTool     = useCanvasStore((s) => s.activeTool)
  const setActiveTool  = useCanvasStore((s) => s.setActiveTool)

  return (
    <div className="flex flex-col items-center gap-1 w-14 shrink-0 bg-white border-r border-neutral-200 py-3 overflow-y-auto">
      {/* Zoom % */}
      <button
        onClick={() => setZoom(100)}
        title="Reset zoom to 100%"
        className="text-[10px] font-medium text-neutral-600 hover:text-neutral-900 leading-tight"
      >
        {zoomLevel}%
      </button>

      <div className="w-6 h-px bg-neutral-200 my-1" />

      <ControlBtn label="Focus" title="Zoom to fit" onClick={() => setZoom(75)}>
        <Focus size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Exp." title="Explore (zoom in)" onClick={() => stepZoom(10)}>
        <ZoomIn size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Reset" title="Reset view" onClick={resetView}>
        <RotateCcw size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn
        label="Grab"
        title="Grab / pan tool"
        active={activeTool === "pan"}
        onClick={() => setActiveTool("pan")}
      >
        <Hand size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Grid" title="Toggle grid">
        <Grid3X3 size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="No." title="Non-destructive overlap mode">
        <Layers2 size={13} strokeWidth={1.5} />
      </ControlBtn>
    </div>
  )
}

function ControlBtn({
  label,
  title,
  active,
  onClick,
  children,
}: {
  label:    string
  title?:   string
  active?:  boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-0.5 w-10 py-1.5 rounded transition-colors",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {children}
      <span className="text-[7px] leading-none">{label}</span>
    </button>
  )
}

// ─── Right page navigation strip ─────────────────────────────────────────────

function PageNavStrip({ sessions }: { sessions: CourseSession[] }) {
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
    if (page) setActiveCanvas(page.id as CanvasId)
  }

  return (
    <div className="flex flex-col items-center gap-1 w-14 shrink-0 bg-white border-l border-neutral-200 py-3">
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
        <span className="text-[9px] text-neutral-400">/ {total}</span>
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

// ─── Virtualizer ──────────────────────────────────────────────────────────────

export function CanvasVirtualizer({
  sessions,
  dims = DEFAULT_PAGE_DIMENSIONS,
  bodyData = {},
}: CanvasVirtualizerProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const zoomLevel       = useCanvasStore((s) => s.zoomLevel)
  const scale           = zoomLevel / 100

  const rowHeight = useMemo(
    () => Math.round(dims.heightPx * scale + PAGE_GAP),
    [dims.heightPx, scale],
  )

  // Build flat virtual rows: session-label header + canvases per session
  const allRows = useMemo<VirtualRow[]>(() => {
    const rows: VirtualRow[] = []
    for (const session of sessions) {
      rows.push({ kind: "session-label", session })
      const total = session.canvases.length
      session.canvases.forEach((page, idx) => {
        rows.push({
          kind:        "canvas",
          page,
          session,
          isLastPage:  idx === total - 1,
          fieldValues: makeFieldValues(session, idx, total),
        })
      })
    }
    return rows
  }, [sessions])

  const count = allRows.length

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: (idx) => {
      const row = allRows[idx]
      return row?.kind === "session-label" ? SESSION_LABEL_HEIGHT : rowHeight
    },
    overscan: OVERSCAN,
  })

  // Re-measure rows when zoom changes
  useEffect(() => {
    virtualizer.measure()
  }, [zoomLevel, virtualizer])

  // NOTE: no auto-scroll on activeCanvasId change — clicking a canvas should
  // not reposition the viewport. Navigation buttons handle programmatic scrolling.

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Canvas area: controls | pages | nav */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-neutral-200">
        <CanvasControlsStrip />

        {/* Scrollable pages */}
        <div
          ref={scrollParentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ contain: "strict" }}
        >
          <div
            style={{
              height:   virtualizer.getTotalSize(),
              width:    "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = allRows[virtualRow.index]
              if (!row) return null

              // Session label divider row
              if (row.kind === "session-label") {
                return (
                  <div
                    key={`label-${row.session.id}`}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position:    "absolute",
                      top:         0,
                      left:        0,
                      width:       "100%",
                      height:      SESSION_LABEL_HEIGHT,
                      transform:   `translateY(${virtualRow.start}px)`,
                      display:     "flex",
                      alignItems:  "center",
                      paddingLeft:  16,
                      paddingRight: 16,
                    }}
                    className="bg-neutral-300 border-b border-neutral-400"
                  >
                    <span className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
                      {row.session.title}
                    </span>
                  </div>
                )
              }

              // Canvas page row
              return (
                <div
                  key={row.page.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position:  "absolute",
                    top:       0,
                    left:      0,
                    width:     "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    display:   "flex",
                    justifyContent: "center",
                    paddingBottom:  PAGE_GAP,
                    paddingTop:     PAGE_GAP,
                  }}
                >
                  <CanvasPageView
                    page={row.page}
                    session={row.session}
                    isLastPage={row.isLastPage}
                    dims={dims}
                    fieldValues={row.fieldValues}
                    bodyData={bodyData}
                    virtualIndex={virtualRow.index}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <PageNavStrip sessions={sessions} />
      </div>
    </div>
  )
}

