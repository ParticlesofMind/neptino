/**
 * Canvas Page Overflow — pagination logic
 *
 * Pure functions isolated from React so they can be unit-tested independently.
 *
 * The core rule: when the measured content height of a canvas page
 * (sum of all task area heights within it) exceeds the available body height
 * (page height minus margins), the page is overflowing and a new page should
 * be appended.
 */

import type { CourseSession, PageDimensions } from "../types"
import { bodyHeightPx } from "../types"

// ─── Analysis result ──────────────────────────────────────────────────────────

export interface CanvasOverflowAnalysis {
  /** Session-page index (0-based) */
  pageIndex: number
  overflowing: boolean
  measuredHeightPx: number
  availableHeightPx: number
}

// ─── Analyse all canvas pages in a session ────────────────────────────────────

export function analyseSessionOverflow(
  session: CourseSession,
  dims: PageDimensions,
): CanvasOverflowAnalysis[] {
  const available = bodyHeightPx(dims)

  return session.canvases.map((canvas, idx) => {
    const measured = canvas.measuredContentHeightPx ?? 0
    return {
      pageIndex: idx,
      overflowing: measured > available,
      measuredHeightPx: measured,
      availableHeightPx: available,
    }
  })
}

// ─── Determine if a new page should be appended ───────────────────────────────

export function shouldAppendPage(
  session: CourseSession,
  dims: PageDimensions,
): boolean {
  const analyses = analyseSessionOverflow(session, dims)
  if (analyses.length === 0) return false
  // Only the last page can trigger an append to prevent infinite growth
  const last = analyses[analyses.length - 1]
  return last.overflowing
}

// ─── Derive page count from content (no stored count needed) ──────────────────

export function derivedPageCount(session: CourseSession): number {
  return Math.max(1, session.canvases.length)
}
