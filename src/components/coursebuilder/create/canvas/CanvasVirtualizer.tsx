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

import { useRef, useMemo, useEffect, useState, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { CourseSession, CanvasPage, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { CanvasPage as CanvasPageView } from "./CanvasPage"
import { useCanvasStore }    from "../store/canvasStore"
import { CanvasControlsStrip } from "./CanvasControlsStrip"
import { PageNavStrip } from "./CanvasPageNavStrip"
import { useLayoutEngine } from "../hooks/useLayoutEngine"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32
// Horizontal breathing room kept around the page when computing fit scale.
const PAGE_H_PADDING = 32
// Render enough extra rows so continuation canvas pages (created dynamically by
// useCanvasOverflow splits) are mounted and measured before the user scrolls to
// them.  Each session may need several overflow splits to converge, so keeping
// a buffer of 5 extra rows ensures cascading splits happen without manual scrolling.
const OVERSCAN = 5

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasVirtualizerProps {
  sessions:  CourseSession[]
  dims?:     PageDimensions
  bodyData?: Record<string, Record<string, unknown>>
  /** If true, disable automatic overflow detection and page splitting */
  disableOverflow?: boolean
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
    // Aliases used by HeaderBlock and FooterBlock
    course_name:    session.courseTitle ?? session.title,
    session_title:  session.title,
    module:         session.moduleName  ?? "",
    module_title:   session.moduleName  ?? "",
    module_name:    session.moduleName  ?? "",
    level:          session.pedagogy    ?? "",
    pedagogy:       session.pedagogy    ?? "",
    teacher_name:   session.teacherName ?? "",

    // Date (Header right-side)
    date:           session.scheduleDate ?? "",
    schedule_date:  session.scheduleDate ?? "",

    // Footer fields
    institution:      session.institution ?? "",
    institution_name: session.institution ?? "",
    copyright:        session.institution
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

// ─── Layout syncer ────────────────────────────────────────────────────────────

/**
 * Renders nothing. Runs useLayoutEngine for a single session so that the
 * hook is called once per session (hooks cannot be called inside loops).
 * If disableOverflow is true, the layout engine is skipped.
 */
function SessionLayoutSyncer({
  session,
  dims,
  disableOverflow,
}: {
  session: CourseSession
  dims:    PageDimensions
  disableOverflow: boolean
}) {
  useLayoutEngine({ session, dims, disabled: disableOverflow })
  return null
}

// ─── Virtualizer ──────────────────────────────────────────────────────────────

export function CanvasVirtualizer({
  sessions,
  dims = DEFAULT_PAGE_DIMENSIONS,
  bodyData = {},
  disableOverflow = false,
}: CanvasVirtualizerProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const zoomLevel       = useCanvasStore((s) => s.zoomLevel)

  // Track the scroll container's width so the canvas always fits it exactly at
  // 100% zoom — the same way a browser reflows text. Initialise to the natural
  // page width + padding so the first render uses a 1.0 fit scale before the
  // ResizeObserver fires.
  const [containerWidth, setContainerWidth] = useState(
    () => dims.widthPx + PAGE_H_PADDING,
  )

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // fitScale: the scale at which the page exactly fills the container (minus
  // padding). zoomLevel acts as a percentage multiplier on top of this.
  const fitScale      = Math.max(0.1, (containerWidth - PAGE_H_PADDING) / dims.widthPx)
  const effectiveScale = fitScale * (zoomLevel / 100)

  const rowHeight = useMemo(
    () => Math.round(dims.heightPx * effectiveScale + PAGE_GAP),
    [dims.heightPx, effectiveScale],
  )

  // Build flat virtual rows: session-label header + canvases per session.
  // Duplicate canvas IDs are filtered within each session as a defensive guard
  // against corrupted saved payloads slipping through the store deduplication.
  const allRows = useMemo<VirtualRow[]>(() => {
    const rows: VirtualRow[] = []
    for (const session of sessions) {
      rows.push({ kind: "session-label", session })
      const seenCanvasIds = new Set<string>()
      const uniqueCanvases = session.canvases.filter((c) => {
        if (seenCanvasIds.has(c.id)) return false
        seenCanvasIds.add(c.id)
        return true
      })
      const total = uniqueCanvases.length
      uniqueCanvases.forEach((page, idx) => {
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
    // Disable flushSync: TanStack Virtual calls flushSync(rerender) inside
    // instance.setOptions() which runs during React's own render pass. In
    // React 18/19 concurrent mode this creates a nested synchronous re-render
    // that causes the reconciler to encounter the same children array twice,
    // surfacing a spurious duplicate-key warning.  Setting this to false makes
    // the virtualizer schedule a normal async re-render instead.
    useFlushSync: false,
  })

  // Re-measure rows when zoom or container width changes
  useEffect(() => {
    virtualizer.measure()
  }, [zoomLevel, containerWidth, virtualizer])

  // Build a canvas-id → virtual row index map so the nav strip can trigger
  // scroll-to without needing direct access to the virtualizer.
  const canvasIdToRowIndex = useMemo(() => {
    const map = new Map<string, number>()
    allRows.forEach((row, idx) => {
      if (row.kind === "canvas") map.set(row.page.id, idx)
    })
    return map
  }, [allRows])

  const scrollToCanvasId = useCallback(
    (canvasId: string) => {
      const rowIdx = canvasIdToRowIndex.get(canvasId)
      if (rowIdx !== undefined) {
        virtualizer.scrollToIndex(rowIdx, { align: "start" })
      }
    },
    [canvasIdToRowIndex, virtualizer],
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* One layout syncer per session — runs useLayoutEngine for each session */}
      {sessions.map((session) => (
        <SessionLayoutSyncer key={session.id} session={session} dims={dims} disableOverflow={disableOverflow} />
      ))}

      {/* Canvas area: controls | pages | nav */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-neutral-200">
        <CanvasControlsStrip />

        {/* Scrollable pages */}
        <div
          ref={scrollParentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden"
          style={{ contain: "strict", scrollbarWidth: "none" }}
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
              // Prefix with virtual index so that if two canvas pages somehow
              // share an id (bad source data), React still gets a unique key.
              return (
                <div
                  key={`${virtualRow.index}:${row.page.id}`}
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
                    scale={effectiveScale}
                    fieldValues={row.fieldValues}
                    bodyData={bodyData}
                    virtualIndex={virtualRow.index}
                    disableOverflow={disableOverflow}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <PageNavStrip sessions={sessions} onScrollTo={scrollToCanvasId} />
      </div>
    </div>
  )
}

