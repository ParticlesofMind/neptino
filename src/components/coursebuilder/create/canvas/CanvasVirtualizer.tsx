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

import { useRef, useMemo, useEffect, useLayoutEffect, useCallback, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { CourseSession, CanvasPage, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { CanvasPage as CanvasPageView } from "./CanvasPage"
import { useCanvasStore }    from "../store/canvasStore"
import { CanvasControlsStrip } from "./CanvasControlsStrip"
import { useLayoutEngine } from "../hooks/useLayoutEngine"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32
// Visual side-padding on each row: PAGE_H_PADDING / 2 per side.
const PAGE_H_PADDING = 32
// Extra horizontal reserve used only in the fit-scale calculation.  The total
// reserved space (PAGE_H_PADDING + FIT_EXTRA_RESERVE) ensures the page is always
// visibly smaller than the workspace — when panels grow the fit-scale shrinks
// proportionally so the canvas auto-zooms out and never sits flush against the
// panel edges.
const FIT_EXTRA_RESERVE = 64
const OVERLAY_STRIP_WIDTH = 56
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
  const panOffsetRef    = useRef(panOffset)
  panOffsetRef.current  = panOffset
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
  const isPanTool     = activeTool === "pan"

  const leftWorkspaceInset = useMemo(
    () => leftOverlayInset,
    [leftOverlayInset],
  )

  const rightWorkspaceInset = useMemo(
    () => rightOverlayInset + OVERLAY_STRIP_WIDTH,
    [rightOverlayInset],
  )

  // 100% is the natural page size. We scale down when the viewport is narrower
  // than the page plus overlay rails plus breathing room.
  const fitScale = useMemo(() => {
    if (!viewportWidth) return 1

    // FIT_EXTRA_RESERVE adds extra room beyond the visual padding so the page
    // is always visibly smaller than the workspace when panels are open.
    const reserved = leftWorkspaceInset + rightWorkspaceInset + PAGE_H_PADDING + FIT_EXTRA_RESERVE

    const availableWidth = Math.max(320, viewportWidth - reserved)
    return Math.max(0.5, Math.min(1, availableWidth / dims.widthPx))
  }, [dims.widthPx, leftWorkspaceInset, rightWorkspaceInset, viewportWidth])

  useEffect(() => {
    setFitScale(fitScale)
  }, [fitScale, setFitScale])

  const effectiveScale     = fitScale * (zoomLevel / 100)
  const canvasDisplayWidth = Math.ceil(dims.widthPx * effectiveScale)

  // Content must be wide enough to allow horizontal scrolling when zoomed in past the
  // available workspace.  Panels are pure overlays — they don't affect content width
  // or the canvas center position.
  const contentWidth = useMemo(
    () => Math.max(
      viewportWidth,
      PAGE_H_PADDING * 2 + canvasDisplayWidth,
    ),
    [canvasDisplayWidth, viewportWidth],
  )

  // Center the page in the full viewport.  Panels are absolutely-positioned overlays
  // so they never shift the canvas — the page is always at 50% of the scroll viewport.
  // scrollLeft = (contentWidth - viewportWidth) / 2 keeps the canvas pinned at center
  // even when zoomed in (contentWidth > viewportWidth).
  const pageLeftInContent = useMemo(
    () => Math.round((contentWidth - canvasDisplayWidth) / 2),
    [canvasDisplayWidth, contentWidth],
  )

  const clampPanXToBounds = useCallback((candidatePanX: number, viewportClientWidth: number) => {
    const maxPanX = Math.max(0, contentWidth - viewportClientWidth)
    return Math.min(Math.max(0, candidatePanX), maxPanX)
  }, [contentWidth])

  // The centred scroll offset is half the total overflow.
  const computeCenteredPanX = useCallback((viewportClientWidth: number) => {
    return clampPanXToBounds(Math.round((contentWidth - viewportClientWidth) / 2), viewportClientWidth)
  }, [clampPanXToBounds, contentWidth])

  // Safety-net: measure the real rendered page center and correct any residual offset.
  // Target is always the viewport center (panels are overlays, not layout contributors).
  const computeCenteredPanXMeasured = useCallback((el: HTMLDivElement) => {
    const formulaPanX = computeCenteredPanX(el.clientWidth)
    const firstVisiblePage = el.querySelector<HTMLElement>('[role="region"][aria-label^="Page"]')
    if (!firstVisiblePage) return formulaPanX

    const viewportRect = el.getBoundingClientRect()
    const pageRect = firstVisiblePage.getBoundingClientRect()
    const targetCenterInViewport = el.clientWidth / 2
    const actualCenterInViewport = pageRect.left - viewportRect.left + pageRect.width / 2
    const deltaPx = actualCenterInViewport - targetCenterInViewport

    if (Math.abs(deltaPx) < 0.5) return formulaPanX

    return clampPanXToBounds(Math.round(el.scrollLeft + deltaPx), el.clientWidth)
  }, [clampPanXToBounds, computeCenteredPanX])

  const overlayMaxLeft = useMemo(
    () => Math.max(leftOverlayInset, Math.max(0, viewportWidth - rightOverlayInset - OVERLAY_STRIP_WIDTH)),
    [leftOverlayInset, rightOverlayInset, viewportWidth],
  )

  const leftStripLeft = useMemo(
    () => Math.min(overlayMaxLeft, leftOverlayInset),
    [leftOverlayInset, overlayMaxLeft],
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

  // Keep canvas horizontally centered whenever geometry changes.
  // useLayoutEffect fires synchronously after DOM mutations but before the
  // browser paints, so scrollLeft is always updated in the same frame as the
  // new pageLeftInContent — preventing the one-frame canvas jump that occurs
  // when a panel is resized and the CSS offset updates before the scroll does.
  useLayoutEffect(() => {
    const el = scrollParentRef.current
    if (!el || isPanning) return

    const centeredPanX = computeCenteredPanXMeasured(el)

    if (el.scrollLeft !== centeredPanX) {
      suppressScrollSyncRef.current = true
      el.scrollLeft = centeredPanX
    }
    if (panOffsetRef.current.x !== centeredPanX) {
      setPan({ x: centeredPanX, y: 0 })
    }
  }, [computeCenteredPanXMeasured, isPanning, setPan, viewportWidth])

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

      const nextPanXUnclamped = panStartRef.current.panX + (panStartRef.current.clientX - e.clientX)
      const nextPanX = clampPanXToBounds(nextPanXUnclamped, el.clientWidth)

      suppressScrollSyncRef.current = true
      el.scrollLeft = nextPanX
      setPan({ x: nextPanX, y: 0 })
      e.preventDefault()
    },
    [clampPanXToBounds, isPanTool, isPanning, setPan],
  )

  const handlePanPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollParentRef.current
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId)
    }
    setIsPanning(false)
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const nextPanX = e.currentTarget.scrollLeft
    if (suppressScrollSyncRef.current) {
      suppressScrollSyncRef.current = false
      return
    }

    if (!isPanTool) {
      const centeredPanX = computeCenteredPanXMeasured(el)
      suppressScrollSyncRef.current = true
      el.scrollLeft = centeredPanX
      if (panOffset.x !== centeredPanX) {
        setPan({ x: centeredPanX, y: 0 })
      }
      return
    }

    const clampedPanX = clampPanXToBounds(nextPanX, el.clientWidth)
    if (clampedPanX !== nextPanX) {
      suppressScrollSyncRef.current = true
      el.scrollLeft = clampedPanX
    }

    if (panOffset.x !== clampedPanX) {
      setPan({ x: clampedPanX, y: 0 })
    }
  }, [clampPanXToBounds, computeCenteredPanXMeasured, isPanTool, panOffset.x, setPan])

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
                      position:  "absolute",
                      top:       0,
                      left:      0,
                      width:     "100%",
                      height:    sessionLabelHeight,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      style={{
                        marginLeft:   pageLeftInContent,
                        width:        canvasDisplayWidth,
                        height:       sessionLabelHeight,
                        display:      "flex",
                        alignItems:   "center",
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
                    position:      "absolute",
                    top:           0,
                    left:          0,
                    width:         "100%",
                    transform:     `translateY(${virtualRow.start}px)`,
                    paddingTop:    PAGE_GAP,
                    paddingBottom: PAGE_GAP,
                    paddingLeft:   pageLeftInContent,
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

