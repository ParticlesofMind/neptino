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

import { useRef, useMemo, useEffect, useLayoutEffect, useCallback, useState, type CSSProperties } from "react"
import { flushSync } from "react-dom"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { CanvasRenderMode, CourseSession, CanvasPage, CanvasId, PageDimensions, SessionId } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { CanvasPage as CanvasPageView } from "./CanvasPage"
import { useCanvasStore }    from "../store/canvasStore"
import { CanvasControlsStrip } from "./CanvasControlsStrip"
import { useLayoutEngine } from "../hooks/useLayoutEngine"
import { useCourseStore } from "../store/courseStore"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_GAP = 32
// Visual side-padding on each row: PAGE_H_PADDING / 2 per side.
const PAGE_H_PADDING = 32
const COMPACT_PAGE_H_PADDING = 16
// Extra horizontal reserve used only in the fit-scale calculation.  The total
// reserved space (PAGE_H_PADDING + FIT_EXTRA_RESERVE) ensures the page is always
// visibly smaller than the workspace — when panels grow the fit-scale shrinks
// proportionally so the canvas auto-zooms out and never sits flush against the
// panel edges.
const FIT_EXTRA_RESERVE = 64
const OVERLAY_STRIP_WIDTH = 56
const PRINT_CSS_PX_PER_IN = 96
const PRINT_PAGE_CANDIDATES = [
  { size: "a4", orientation: "portrait", widthMm: 210, heightMm: 297 },
  { size: "a4", orientation: "landscape", widthMm: 297, heightMm: 210 },
  { size: "us-letter", orientation: "portrait", widthMm: 215.9, heightMm: 279.4 },
  { size: "us-letter", orientation: "landscape", widthMm: 279.4, heightMm: 215.9 },
] as const
type PrintPageCandidate = (typeof PRINT_PAGE_CANDIDATES)[number]
const SCROLL_TO_CANVAS_EVENT = "coursebuilder:scroll-to-canvas"
// Render enough extra rows so continuation canvas pages (created dynamically by
// useCanvasOverflow splits) are mounted and measured before the user scrolls to
// them.  Each session may need several overflow splits to converge, so keeping
// a buffer of 5 extra rows ensures cascading splits happen without manual scrolling.
const OVERSCAN = 5

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}

function resolvePrintPageSize(dims: PageDimensions): { widthMm: number; heightMm: number } {
  const ratio = dims.heightPx / Math.max(1, dims.widthPx)
  let closest: PrintPageCandidate = PRINT_PAGE_CANDIDATES[0]
  let closestScore = Number.POSITIVE_INFINITY

  for (const candidate of PRINT_PAGE_CANDIDATES) {
    const candidateRatio = candidate.heightMm / candidate.widthMm
    const score = Math.abs(candidateRatio - ratio)
    if (score < closestScore) {
      closest = candidate
      closestScore = score
    }
  }

  return {
    widthMm: closest.widthMm,
    heightMm: closest.heightMm,
  }
}

function printCssPxForMm(mm: number): number {
  return (mm / 25.4) * PRINT_CSS_PX_PER_IN
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasVirtualizerProps {
  sessions:  CourseSession[]
  dims?:     PageDimensions
  bodyData?: Record<string, Record<string, unknown>>
  /** If true, disable DOM-measured overflow splitting. Deterministic layout sync still runs. */
  disableOverflow?: boolean
  /** Left-side overlay inset in px (e.g. file browser width + gap) */
  leftOverlayInset?: number
  /** Right-side overlay inset in px (e.g. layers panel width + gap) */
  rightOverlayInset?: number
  /** Canvas rendering mode. Preview mode suppresses edit-only card controls. */
  renderMode?: CanvasRenderMode
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
      fieldValues: Record<string, string>
    }

const SESSION_LABEL_HEIGHT = 48

// ─── Layout syncer ────────────────────────────────────────────────────────────

/**
 * Renders nothing. Runs useLayoutEngine for a single session so that the
 * hook is called once per session (hooks cannot be called inside loops).
 */
function SessionLayoutSyncer({
  session,
  dims,
}: {
  session: CourseSession
  dims:    PageDimensions
}) {
  useLayoutEngine({ session, dims, disabled: false })
  return null
}

function CanvasPrintDocument({
  sessions,
  dims,
  bodyData,
}: {
  sessions: CourseSession[]
  dims: PageDimensions
  bodyData: Record<string, Record<string, unknown>>
}) {
  const printPageSize = resolvePrintPageSize(dims)
  const printScale = printCssPxForMm(printPageSize.widthMm) / dims.widthPx
  const style = {
    "--canvas-print-page-width": `${printPageSize.widthMm}mm`,
    "--canvas-print-page-height": `${printPageSize.heightMm}mm`,
  } as CSSProperties

  let virtualIndex = 0
  const printPages = sessions.flatMap((session) => {
    const seenCanvasIds = new Set<string>()
    const uniqueCanvases = session.canvases.filter((page) => {
      if (seenCanvasIds.has(page.id)) return false
      seenCanvasIds.add(page.id)
      return true
    })
    const total = uniqueCanvases.length

    return uniqueCanvases.map((page, pageIndex) => ({
      page,
      session,
      fieldValues: makeFieldValues(session, pageIndex, total),
      virtualIndex: virtualIndex++,
    }))
  })

  return (
    <div
      className="canvas-print-document"
      data-testid="canvas-print-document"
      style={style}
      aria-label="Printable canvas pages"
    >
      {printPages.map(({ page, session, fieldValues, virtualIndex: pageVirtualIndex }) => (
        <div
          key={`print:${page.id}`}
          className="canvas-print-page-shell"
          data-testid="canvas-print-page"
        >
          <CanvasPageView
            page={page}
            session={session}
            dims={dims}
            scale={printScale}
            fieldValues={fieldValues}
            bodyData={bodyData}
            virtualIndex={pageVirtualIndex}
            disableOverflow
            renderMode="preview"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Virtualizer ──────────────────────────────────────────────────────────────

export function CanvasVirtualizer({
  sessions,
  dims = DEFAULT_PAGE_DIMENSIONS,
  bodyData = {},
  disableOverflow = false,
  leftOverlayInset = 16,
  rightOverlayInset = 8,
  renderMode = "editor",
}: CanvasVirtualizerProps) {
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const zoomLevel       = useCanvasStore((s) => s.zoomLevel)
  const setZoom         = useCanvasStore((s) => s.setZoom)
  const stepZoom        = useCanvasStore((s) => s.stepZoom)
  const resetView       = useCanvasStore((s) => s.resetView)
  const debugMountAllCanvases = useCanvasStore((s) => s.debugMountAllCanvases)
  const panOffset       = useCanvasStore((s) => s.panOffset)
  const activeCanvasId  = useCanvasStore((s) => s.activeCanvasId)
  const viewportCanvasId = useCanvasStore((s) => s.viewportCanvasId)
  const panOffsetRef    = useRef(panOffset)
  const zoomLevelRef    = useRef(zoomLevel)
  panOffsetRef.current  = panOffset
  zoomLevelRef.current  = zoomLevel
  const activeTool      = useCanvasStore((s) => s.activeTool)
  const setActiveTool   = useCanvasStore((s) => s.setActiveTool)
  const setPan          = useCanvasStore((s) => s.setPan)
  const setFitScale     = useCanvasStore((s) => s.setFitScale)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)
  const setViewportCanvas = useCanvasStore((s) => s.setViewportCanvas)
  const setActiveSession = useCourseStore((s) => s.setActiveSession)

  const clearSelection = useCanvasStore((s) => s.clearSelection)

  // Pan interaction tracking refs (no re-renders)
  const [isPanning, setIsPanning] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [printRenderActive, setPrintRenderActive] = useState(false)
  const panStartRef   = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 })
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
  const isCompactViewport = viewportWidth > 0 && viewportWidth < 640
  const pageHorizontalPadding = isCompactViewport ? COMPACT_PAGE_H_PADDING : PAGE_H_PADDING

  // 100% is the natural page size. We scale down when the viewport is narrower
  // than the page plus overlay rails plus breathing room.
  const fitScale = useMemo(() => {
    if (!viewportWidth) return 1

    // FIT_EXTRA_RESERVE adds extra room beyond the visual padding so the page
    // is always visibly smaller than the workspace when panels are open.
    const reserved = isCompactViewport
      ? leftWorkspaceInset + rightWorkspaceInset + pageHorizontalPadding * 2
      : leftWorkspaceInset + rightWorkspaceInset + pageHorizontalPadding + FIT_EXTRA_RESERVE

    const availableWidth = Math.max(1, viewportWidth - reserved)
    return Math.max(isCompactViewport ? 0.28 : 0.5, Math.min(1, availableWidth / dims.widthPx))
  }, [dims.widthPx, isCompactViewport, leftWorkspaceInset, pageHorizontalPadding, rightWorkspaceInset, viewportWidth])

  useEffect(() => {
    setFitScale(fitScale)
  }, [fitScale, setFitScale])

  useEffect(() => {
    const preparePrint = () => {
      flushSync(() => setPrintRenderActive(true))
    }
    const finishPrint = () => setPrintRenderActive(false)
    const printMedia = window.matchMedia?.("print")
    const handlePrintMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        preparePrint()
      } else {
        finishPrint()
      }
    }

    window.addEventListener("beforeprint", preparePrint)
    window.addEventListener("afterprint", finishPrint)
    printMedia?.addEventListener("change", handlePrintMediaChange)

    return () => {
      window.removeEventListener("beforeprint", preparePrint)
      window.removeEventListener("afterprint", finishPrint)
      printMedia?.removeEventListener("change", handlePrintMediaChange)
    }
  }, [])

  const effectiveScale     = fitScale * (zoomLevel / 100)
  const canvasDisplayWidth = Math.ceil(dims.widthPx * effectiveScale)
  const workspaceWidth = useMemo(
    () => Math.max(1, viewportWidth - leftWorkspaceInset - rightWorkspaceInset),
    [leftWorkspaceInset, rightWorkspaceInset, viewportWidth],
  )

  // Content must be wide enough to allow horizontal scrolling when zoomed in past
  // the unobstructed workspace between overlay panels and page-navigation rails.
  const contentWidth = useMemo(
    () => Math.max(
      viewportWidth,
      leftWorkspaceInset + rightWorkspaceInset + pageHorizontalPadding * 2 + canvasDisplayWidth,
    ),
    [canvasDisplayWidth, leftWorkspaceInset, pageHorizontalPadding, rightWorkspaceInset, viewportWidth],
  )

  // Center the page inside the visible workspace lane, not the full browser
  // viewport. This keeps the page away from side panels and navigation rails.
  const pageLeftInContent = useMemo(
    () => {
      const innerWorkspaceWidth = Math.max(1, workspaceWidth - pageHorizontalPadding * 2)
      if (canvasDisplayWidth <= innerWorkspaceWidth) {
        return Math.round(
          leftWorkspaceInset + pageHorizontalPadding + (innerWorkspaceWidth - canvasDisplayWidth) / 2,
        )
      }

      return Math.round(leftWorkspaceInset + pageHorizontalPadding)
    },
    [canvasDisplayWidth, leftWorkspaceInset, pageHorizontalPadding, workspaceWidth],
  )

  const clampPanXToBounds = useCallback((candidatePanX: number, viewportClientWidth: number) => {
    const maxPanX = Math.max(0, contentWidth - viewportClientWidth)
    return Math.min(Math.max(0, candidatePanX), maxPanX)
  }, [contentWidth])

  const clampPanYToBounds = useCallback((candidatePanY: number, el: HTMLDivElement) => {
    const maxPanY = Math.max(0, el.scrollHeight - el.clientHeight)
    return Math.min(Math.max(0, candidatePanY), maxPanY)
  }, [])

  const workspaceCenterInViewport = useCallback((viewportClientWidth: number) => {
    const width = Math.max(1, viewportClientWidth - leftWorkspaceInset - rightWorkspaceInset)
    return leftWorkspaceInset + width / 2
  }, [leftWorkspaceInset, rightWorkspaceInset])

  // Keep the rendered page center aligned to the unobstructed workspace center.
  const computeCenteredPanX = useCallback((viewportClientWidth: number) => {
    const targetCenter = workspaceCenterInViewport(viewportClientWidth)
    const pageCenter = pageLeftInContent + canvasDisplayWidth / 2
    return clampPanXToBounds(Math.round(pageCenter - targetCenter), viewportClientWidth)
  }, [canvasDisplayWidth, clampPanXToBounds, pageLeftInContent, workspaceCenterInViewport])

  // Safety-net: measure the real rendered page center and correct any residual offset.
  const computeCenteredPanXMeasured = useCallback((el: HTMLDivElement) => {
    const formulaPanX = computeCenteredPanX(el.clientWidth)
    const firstVisiblePage = el.querySelector<HTMLElement>('[role="region"][aria-label^="Page"]')
    if (!firstVisiblePage) return formulaPanX

    const viewportRect = el.getBoundingClientRect()
    const pageRect = firstVisiblePage.getBoundingClientRect()
    const targetCenterInViewport = workspaceCenterInViewport(el.clientWidth)
    const actualCenterInViewport = pageRect.left - viewportRect.left + pageRect.width / 2
    const deltaPx = actualCenterInViewport - targetCenterInViewport

    if (Math.abs(deltaPx) < 0.5) return formulaPanX

    return clampPanXToBounds(Math.round(el.scrollLeft + deltaPx), el.clientWidth)
  }, [clampPanXToBounds, computeCenteredPanX, workspaceCenterInViewport])

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
    if (panOffsetRef.current.x !== centeredPanX || panOffsetRef.current.y !== el.scrollTop) {
      setPan({ x: centeredPanX, y: el.scrollTop })
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
  const virtualRows = virtualizer.getVirtualItems()

  // Re-measure rows whenever effective page scale changes.
  useEffect(() => {
    virtualizer.measure()
  }, [effectiveScale, sessionLabelHeight, virtualizer])

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    let nearestCanvasId: CanvasId | null = null
    let nearestSessionId: SessionId | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    const viewportCenter = el.scrollTop + el.clientHeight / 2

    for (const virtualRow of virtualRows) {
      const row = allRows[virtualRow.index]
      if (row?.kind !== "canvas") continue

      const rowCenter = virtualRow.start + virtualRow.size / 2
      const distance = Math.abs(rowCenter - viewportCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestCanvasId = row.page.id
        nearestSessionId = row.session.id as SessionId
      }
    }

    setViewportCanvas(nearestCanvasId)
    if (nearestSessionId) setActiveSession(nearestSessionId)
  }, [allRows, setActiveSession, setViewportCanvas, virtualRows])

  const handlePanPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanTool) return
      const el = scrollParentRef.current
      if (!el) return
      setIsPanning(true)
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: el.scrollLeft,
        panY: el.scrollTop,
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
      const nextPanYUnclamped = panStartRef.current.panY + (panStartRef.current.clientY - e.clientY)
      const nextPanX = clampPanXToBounds(nextPanXUnclamped, el.clientWidth)
      const nextPanY = clampPanYToBounds(nextPanYUnclamped, el)

      suppressScrollSyncRef.current = true
      el.scrollLeft = nextPanX
      el.scrollTop = nextPanY
      setPan({ x: nextPanX, y: nextPanY })
      e.preventDefault()
    },
    [clampPanXToBounds, clampPanYToBounds, isPanTool, isPanning, setPan],
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
    const nextPanX = el.scrollLeft
    const nextPanY = el.scrollTop
    if (suppressScrollSyncRef.current) {
      suppressScrollSyncRef.current = false
      if (panOffset.x !== nextPanX || panOffset.y !== nextPanY) {
        setPan({ x: nextPanX, y: nextPanY })
      }
      return
    }

    if (!isPanTool) {
      const centeredPanX = computeCenteredPanXMeasured(el)
      suppressScrollSyncRef.current = true
      el.scrollLeft = centeredPanX
      if (panOffset.x !== centeredPanX || panOffset.y !== nextPanY) {
        setPan({ x: centeredPanX, y: nextPanY })
      }
      return
    }

    const clampedPanX = clampPanXToBounds(nextPanX, el.clientWidth)
    const clampedPanY = clampPanYToBounds(nextPanY, el)
    if (clampedPanX !== nextPanX) {
      suppressScrollSyncRef.current = true
      el.scrollLeft = clampedPanX
    }
    if (clampedPanY !== nextPanY) {
      suppressScrollSyncRef.current = true
      el.scrollTop = clampedPanY
    }

    if (panOffset.x !== clampedPanX || panOffset.y !== clampedPanY) {
      setPan({ x: clampedPanX, y: clampedPanY })
    }
  }, [clampPanXToBounds, clampPanYToBounds, computeCenteredPanXMeasured, isPanTool, panOffset.x, panOffset.y, setPan])

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    const handleWheel = (event: WheelEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 4 : 0.08
      const nextZoom = zoomLevelRef.current - event.deltaY * unit
      zoomLevelRef.current = nextZoom
      setZoom(nextZoom)
    }

    el.addEventListener("wheel", handleWheel, { passive: false, capture: true })
    return () => el.removeEventListener("wheel", handleWheel, { capture: true })
  }, [setZoom])

  // Build a canvas-id → virtual row index map so the nav strip can trigger
  // scroll-to without needing direct access to the virtualizer.
  const canvasIdToRowIndex = useMemo(() => {
    const map = new Map<string, number>()
    allRows.forEach((row, idx) => {
      if (row.kind === "canvas") map.set(row.page.id, idx)
    })
    return map
  }, [allRows])

  const canvasRows = useMemo(
    () => allRows.filter((row): row is Extract<VirtualRow, { kind: "canvas" }> => row.kind === "canvas"),
    [allRows],
  )

  const scrollToCanvasId = useCallback(
    (canvasId: string) => {
      const rowIdx = canvasIdToRowIndex.get(canvasId)
      if (rowIdx !== undefined) {
        virtualizer.scrollToIndex(rowIdx, { align: "start" })
      }
    },
    [canvasIdToRowIndex, virtualizer],
  )

  const goToCanvasIndex = useCallback((index: number) => {
    const row = canvasRows[Math.max(0, Math.min(canvasRows.length - 1, index))]
    if (!row) return

    setActiveCanvas(row.page.id)
    setViewportCanvas(row.page.id)
    setActiveSession(row.session.id as SessionId)
    scrollToCanvasId(row.page.id)
  }, [canvasRows, scrollToCanvasId, setActiveCanvas, setActiveSession, setViewportCanvas])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const hasCommandModifier = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (!hasCommandModifier) {
        if (key === "h") {
          event.preventDefault()
          setActiveTool(activeTool === "pan" ? "selection" : "pan")
          return
        }

        if (key === "v") {
          event.preventDefault()
          setActiveTool("selection")
          return
        }

        if (key === "escape") {
          event.preventDefault()
          setActiveTool("selection")
          clearSelection()
        }

        return
      }

      const currentCanvasId = viewportCanvasId ?? activeCanvasId
      const currentIndex = Math.max(0, canvasRows.findIndex((row) => row.page.id === currentCanvasId))

      if (event.key === "=" || event.key === "+") {
        event.preventDefault()
        stepZoom(10)
        return
      }

      if (event.key === "-") {
        event.preventDefault()
        stepZoom(-10)
        return
      }

      if (event.key === "0") {
        event.preventDefault()
        resetView()
        return
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        goToCanvasIndex(currentIndex + 1)
        return
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        goToCanvasIndex(currentIndex - 1)
        return
      }

      if (event.key === "End") {
        event.preventDefault()
        goToCanvasIndex(canvasRows.length - 1)
        return
      }

      if (event.key === "Home") {
        event.preventDefault()
        goToCanvasIndex(0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeCanvasId, activeTool, canvasRows, clearSelection, goToCanvasIndex, resetView, setActiveTool, stepZoom, viewportCanvasId])

  useEffect(() => {
    const handleScrollRequest = (event: Event) => {
      const canvasId = (event as CustomEvent<{ canvasId?: string }>).detail?.canvasId
      if (canvasId) scrollToCanvasId(canvasId)
    }

    window.addEventListener(SCROLL_TO_CANVAS_EVENT, handleScrollRequest)
    return () => window.removeEventListener(SCROLL_TO_CANVAS_EVENT, handleScrollRequest)
  }, [scrollToCanvasId])

  return (
    <div className="canvas-virtualizer-root flex flex-col flex-1 overflow-hidden">
      {/* One layout syncer per session — runs useLayoutEngine for each session */}
      {sessions.map((session) => (
        <SessionLayoutSyncer key={session.id} session={session} dims={dims} />
      ))}

      {/* Canvas area: full-width scroll viewport with overlay controls */}
      <div className="canvas-screen-viewport relative flex flex-1 min-h-0 overflow-x-visible overflow-y-hidden bg-neutral-200">
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
            {virtualRows.map((virtualRow) => {
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
                    dims={dims}
                    scale={effectiveScale}
                    fieldValues={row.fieldValues}
                    bodyData={bodyData}
                    virtualIndex={virtualRow.index}
                    disableOverflow={disableOverflow}
                    renderMode={renderMode}
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
      {printRenderActive && (
        <CanvasPrintDocument sessions={sessions} dims={dims} bodyData={bodyData} />
      )}
    </div>
  )
}
