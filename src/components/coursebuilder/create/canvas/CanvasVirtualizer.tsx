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

import { useRef, useMemo, useEffect, useCallback, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { CourseSession, CanvasPage, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { CanvasPage as CanvasPageView } from "./CanvasPage"
import { useCanvasStore }    from "../store/canvasStore"
import { CanvasControlsStrip } from "./CanvasControlsStrip"
import { useLayoutEngine } from "../hooks/useLayoutEngine"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32
// Horizontal breathing room kept around the page when computing fit scale.
const PAGE_H_PADDING = 32
const OVERLAY_STRIP_WIDTH = 56
const OVERLAY_PAGE_GAP = 16
const LEFT_RAIL_INSET = OVERLAY_STRIP_WIDTH + OVERLAY_PAGE_GAP
const RIGHT_RAIL_INSET = OVERLAY_STRIP_WIDTH + OVERLAY_PAGE_GAP
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
  /** Left-side overlay inset in px (e.g. file browser width + gap) */
  leftOverlayInset?: number
  /** Right-side overlay inset in px (e.g. layers panel width + gap) */
  rightOverlayInset?: number
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
  leftOverlayInset = 16,
  rightOverlayInset = 8,
}: CanvasVirtualizerProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const zoomLevel       = useCanvasStore((s) => s.zoomLevel)
  const debugMountAllCanvases = useCanvasStore((s) => s.debugMountAllCanvases)
  const panOffset       = useCanvasStore((s) => s.panOffset)
  const activeCanvasId  = useCanvasStore((s) => s.activeCanvasId)
  const activeTool      = useCanvasStore((s) => s.activeTool)
  const setPan          = useCanvasStore((s) => s.setPan)
  const setFitScale     = useCanvasStore((s) => s.setFitScale)

  const clearSelection = useCanvasStore((s) => s.clearSelection)

  // Pan interaction tracking refs (no re-renders)
  const [isPanning, setIsPanning] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const panStartRef   = useRef({ clientX: 0, panX: 0 })
  const suppressScrollSyncRef = useRef(false)
  const didInitialCenterRef = useRef(false)
  const previousContentWidthRef = useRef<number | null>(null)
  const isPanTool     = activeTool === "pan"

  // 100% is the natural page size. We only scale down when the viewport is
  // narrower than the page plus overlay rails.
  const fitScale = useMemo(() => {
    if (!viewportWidth) return 1

    const reserved =
      LEFT_RAIL_INSET +
      RIGHT_RAIL_INSET +
      PAGE_H_PADDING

    const availableWidth = Math.max(320, viewportWidth - reserved)
    return Math.max(0.5, Math.min(1, availableWidth / dims.widthPx))
  }, [dims.widthPx, viewportWidth])

  useEffect(() => {
    setFitScale(fitScale)
  }, [fitScale, setFitScale])

  const effectiveScale     = fitScale * (zoomLevel / 100)
  const canvasDisplayWidth = Math.ceil(dims.widthPx * effectiveScale)
  const baseContentWidth = canvasDisplayWidth + PAGE_H_PADDING

  const leftLaneInset = LEFT_RAIL_INSET
  const rightLaneInset = rightOverlayInset + RIGHT_RAIL_INSET

  const contentWidth = useMemo(
    () => Math.max(baseContentWidth + leftLaneInset + rightLaneInset, viewportWidth || 0),
    [baseContentWidth, leftLaneInset, rightLaneInset, viewportWidth],
  )

  const pagePaddingLeft = useMemo(() => {
    const laneWidth = Math.max(0, contentWidth - leftLaneInset - rightLaneInset)
    const centeredLeft = leftLaneInset + Math.max(PAGE_H_PADDING / 2, Math.floor((laneWidth - canvasDisplayWidth) / 2))
    const maxLeftBeforeRightKeepout = contentWidth - rightLaneInset - canvasDisplayWidth
    return Math.min(centeredLeft, maxLeftBeforeRightKeepout)
  }, [canvasDisplayWidth, contentWidth, leftLaneInset, rightLaneInset])

  const overlayMaxLeft = useMemo(
    () => Math.max(leftOverlayInset, Math.max(0, viewportWidth - rightOverlayInset - OVERLAY_STRIP_WIDTH)),
    [leftOverlayInset, rightOverlayInset, viewportWidth],
  )

  const visiblePageLeft = useMemo(
    () => pagePaddingLeft - panOffset.x,
    [pagePaddingLeft, panOffset.x],
  )

  const leftStripLeft = useMemo(
    () => Math.min(
      overlayMaxLeft,
      Math.max(leftOverlayInset, visiblePageLeft - OVERLAY_PAGE_GAP - OVERLAY_STRIP_WIDTH),
    ),
    [leftOverlayInset, overlayMaxLeft, visiblePageLeft],
  )

  const rowHeight = useMemo(
    () => Math.round(dims.heightPx * effectiveScale + PAGE_GAP * 2),
    [dims.heightPx, effectiveScale],
  )

  const sessionLabelHeight = useMemo(
    () => Math.round(SESSION_LABEL_HEIGHT * Math.max(0.9, Math.min(1.2, effectiveScale))),
    [effectiveScale],
  )

  const sessionLabelPaddingX = useMemo(
    () => Math.round(16 * Math.max(0.9, Math.min(1.2, effectiveScale))),
    [effectiveScale],
  )

  const sessionLabelFontSize = useMemo(
    () => Math.round(11 * Math.max(0.95, Math.min(1.15, effectiveScale))),
    [effectiveScale],
  )

  // Track viewport width so we can center the page when there is free space.
  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    const syncWidth = () => setViewportWidth(el.clientWidth)
    syncWidth()

    const ro = new ResizeObserver(syncWidth)
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  // Center the canvas once on initial mount so the default perspective is balanced.
  useEffect(() => {
    const el = scrollParentRef.current
    if (!el || didInitialCenterRef.current) return

    const maxPanX = Math.max(0, contentWidth - el.clientWidth)
    if (maxPanX <= 0) {
      didInitialCenterRef.current = true
      return
    }

    const centeredPanX = Math.round(maxPanX / 2)
    suppressScrollSyncRef.current = true
    el.scrollLeft = centeredPanX
    setPan({ x: centeredPanX, y: 0 })
    didInitialCenterRef.current = true
  }, [contentWidth, setPan])

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
  const overscan = debugMountAllCanvases ? Math.max(count, OVERSCAN) : OVERSCAN

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: (idx) => {
      const row = allRows[idx]
      return row?.kind === "session-label" ? sessionLabelHeight : rowHeight
    },
    overscan,
    // Disable flushSync: TanStack Virtual calls flushSync(rerender) inside
    // instance.setOptions() which runs during React's own render pass. In
    // React 18/19 concurrent mode this creates a nested synchronous re-render
    // that causes the reconciler to encounter the same children array twice,
    // surfacing a spurious duplicate-key warning.  Setting this to false makes
    // the virtualizer schedule a normal async re-render instead.
    useFlushSync: false,
  })

  // Re-measure rows whenever effective page scale changes.
  useEffect(() => {
    virtualizer.measure()
  }, [effectiveScale, sessionLabelHeight, virtualizer])

  // Preserve the viewport's relative horizontal center whenever content width
  // changes so zooming expands around the current focus instead of drifting
  // toward the left edge.
  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    const maxPanX = Math.max(0, contentWidth - el.clientWidth)
    const previousContentWidth = previousContentWidthRef.current
    let nextPanX = el.scrollLeft

    if (previousContentWidth !== null && previousContentWidth !== contentWidth) {
      const previousScrollableWidth = Math.max(0, previousContentWidth - el.clientWidth)

      if (maxPanX <= 0) {
        nextPanX = 0
      } else if (previousScrollableWidth <= 0) {
        nextPanX = Math.round(maxPanX / 2)
      } else {
        const viewportCenterRatio = (el.scrollLeft + el.clientWidth / 2) / previousContentWidth
        nextPanX = Math.round(viewportCenterRatio * contentWidth - el.clientWidth / 2)
      }
    }

    const clampedPanX = Math.min(Math.max(0, nextPanX), maxPanX)

    if (el.scrollLeft !== clampedPanX) {
      suppressScrollSyncRef.current = true
      el.scrollLeft = clampedPanX
    }
    if (panOffset.x !== clampedPanX) {
      setPan({ x: clampedPanX, y: 0 })
    }
    previousContentWidthRef.current = contentWidth
  }, [contentWidth, panOffset.x, setPan])

  const handlePanPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanTool) return
      const el = scrollParentRef.current
      if (!el) return
      setIsPanning(true)
      panStartRef.current = {
        clientX: e.clientX,
        panX: el.scrollLeft,
      }
      el.setPointerCapture(e.pointerId)
      e.preventDefault()
    },
    [isPanTool],
  )

  const handlePanPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanTool || !isPanning) return
      const el = scrollParentRef.current
      if (!el) return

      const maxPanX = Math.max(0, contentWidth - el.clientWidth)
      const nextPanXUnclamped = panStartRef.current.panX + (panStartRef.current.clientX - e.clientX)
      const nextPanX = Math.min(Math.max(0, nextPanXUnclamped), maxPanX)

      suppressScrollSyncRef.current = true
      el.scrollLeft = nextPanX
      setPan({ x: nextPanX, y: 0 })
      e.preventDefault()
    },
    [contentWidth, isPanTool, isPanning, setPan],
  )

  const handlePanPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollParentRef.current
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
    setIsPanning(false)
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const nextPanX = e.currentTarget.scrollLeft
    if (suppressScrollSyncRef.current) {
      suppressScrollSyncRef.current = false
      return
    }
    if (panOffset.x !== nextPanX) {
      setPan({ x: nextPanX, y: 0 })
    }
  }, [panOffset.x, setPan])

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

  // Keep the viewport synced when active canvas is changed externally
  // (e.g. via page nav controls rendered in the Atlas overlay layer).
  useEffect(() => {
    if (!activeCanvasId) return
    scrollToCanvasId(activeCanvasId)
  }, [activeCanvasId, scrollToCanvasId])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* One layout syncer per session — runs useLayoutEngine for each session */}
      {sessions.map((session) => (
        <SessionLayoutSyncer key={session.id} session={session} dims={dims} disableOverflow={disableOverflow} />
      ))}

      {/* Canvas area: full-width scroll viewport with overlay controls */}
      <div className="relative flex flex-1 min-h-0 overflow-x-visible overflow-y-hidden bg-neutral-200">
        {/* Vertically scrollable pages; horizontal movement can be done via
          grab-tool panning (panOffset.x) and native horizontal scroll (hidden). */}
        <div
          ref={scrollParentRef}
          className="no-scrollbar flex-1 overflow-y-auto overflow-x-auto"
          style={{
            // contain: "strict" includes size-containment which collapses
            // scrollable overflow in the inline axis — preventing the browser
            // from recognising horizontal overflow when the canvas is wider
            // than the viewport (zoomed in).  Downgrading to "content"
            // (layout + paint + style, without size) preserves virtualizer
            // isolation while restoring proper horizontal scrollWidth.
            contain: "layout style paint",
            cursor: isPanTool ? (isPanning ? "grabbing" : "grab") : undefined,
            userSelect: isPanTool ? "none" : undefined,
            touchAction: isPanTool ? "none" : undefined,
          }}
          onPointerDown={handlePanPointerDown}
          onPointerMove={handlePanPointerMove}
          onPointerUp={handlePanPointerUp}
          onPointerCancel={handlePanPointerUp}
          onScroll={handleScroll}
          onClick={clearSelection}
        >
          <div
            style={{
              height:   virtualizer.getTotalSize(),
              width:    contentWidth,
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
                      left:        pagePaddingLeft,
                      width:       canvasDisplayWidth,
                      height:      sessionLabelHeight,
                      transform:   `translateY(${virtualRow.start}px)`,
                      display:     "flex",
                      alignItems:  "center",
                      paddingLeft:  sessionLabelPaddingX,
                      paddingRight: sessionLabelPaddingX,
                    }}
                    className="rounded-lg border border-neutral-200 bg-gradient-to-r from-white to-neutral-50 shadow-sm"
                  >
                    <span
                      className="font-semibold text-neutral-700 uppercase tracking-[0.08em]"
                      style={{ fontSize: `${sessionLabelFontSize}px` }}
                    >
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
                    position:    "absolute",
                    top:         0,
                    left:        0,
                    width:       "100%",
                    transform:   `translateY(${virtualRow.start}px)`,
                    paddingTop:  PAGE_GAP,
                    paddingBottom: PAGE_GAP,
                    paddingLeft: pagePaddingLeft,
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

        {/* Fixed overlay strips — not affected by horizontal canvas growth */}
        <div
          className="absolute inset-y-0 z-30 flex items-center pointer-events-none"
          style={{ left: leftStripLeft }}
        >
          <div className="pointer-events-auto">
            <CanvasControlsStrip />
          </div>
        </div>

      </div>
    </div>
  )
}

