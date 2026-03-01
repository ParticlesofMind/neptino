/**
 * Page layout utilities — shared between the canvas editor and the page-setup wizard.
 *
 * Kept in src/lib so it can be imported by both the setup wizard (still part of the
 * old teacher/coursebuilder route) and any future consumer without taking a dependency
 * on a specific UI component folder.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvasPageConfig {
  widthPx:   number
  heightPx:  number
  pageCount: number
  margins: { top: number; right: number; bottom: number; left: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** A4 portrait at 96 dpi — the default canvas page dimensions. */
export const DEFAULT_PAGE_CONFIG: CanvasPageConfig = {
  widthPx:   794,
  heightPx:  1123,
  pageCount: 1,
  margins:   { top: 96, right: 76, bottom: 96, left: 76 },
}

// ─── Physical page sizes (mm) ─────────────────────────────────────────────────

export const PAGE_DIMS: Record<"a4" | "us-letter", { w: number; h: number }> = {
  "a4":        { w: 210,   h: 297   },
  "us-letter": { w: 215.9, h: 279.4 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive pixel dimensions from physical size / orientation.
 * Reference canvas width is always 794 px (≈ A4 at 96 dpi).
 */
export function computePageConfig(
  size:        "a4" | "us-letter",
  orientation: "portrait" | "landscape",
  pageCount    = 1,
  marginsMm    = { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
): CanvasPageConfig {
  const { w: rawW, h: rawH } = PAGE_DIMS[size] ?? PAGE_DIMS["a4"]
  const wmm      = orientation === "landscape" ? rawH : rawW
  const hmm      = orientation === "landscape" ? rawW : rawH
  const pxPerMm  = 794 / wmm

  return {
    widthPx:   794,
    heightPx:  Math.round(hmm * pxPerMm),
    pageCount: Math.max(1, pageCount),
    margins: {
      top:    Math.round(marginsMm.top    * pxPerMm),
      right:  Math.round(marginsMm.right  * pxPerMm),
      bottom: Math.round(marginsMm.bottom * pxPerMm),
      left:   Math.round(marginsMm.left   * pxPerMm),
    },
  }
}
