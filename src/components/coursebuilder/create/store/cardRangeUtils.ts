import type { CanvasPage } from "../types"

export function normalizeCanvasCardRanges(
  canvases: CanvasPage[],
  totalCards: number,
): CanvasPage[] {
  let cursor = 0

  return canvases.map((canvas) => {
    const range = canvas.contentCardRange
    if (!range) return canvas

    const rawStart = typeof range.start === "number" ? range.start : cursor
    const start = Math.max(cursor, Math.min(rawStart, totalCards))

    const hasEnd = typeof range.end === "number"
    const end = hasEnd
      ? Math.max(start, Math.min(range.end as number, totalCards))
      : undefined

    cursor = end ?? start

    if (start === range.start && (!hasEnd || end === range.end)) {
      return canvas
    }

    return {
      ...canvas,
      contentCardRange: {
        start,
        ...(end !== undefined ? { end } : {}),
      },
    }
  })
}

export function expandCanvasCardRangesForInsertion(
  canvases: CanvasPage[],
  targetCanvasId: string | null,
): CanvasPage[] {
  if (!targetCanvasId) return canvases

  const targetIdx = canvases.findIndex(
    (canvas) => canvas.id === targetCanvasId && canvas.contentCardRange,
  )
  if (targetIdx < 0) return canvases

  return canvases.map((canvas, idx) => {
    const range = canvas.contentCardRange
    if (!range) return canvas

    if (idx < targetIdx) return canvas

    if (idx === targetIdx) {
      if (typeof range.end !== "number") return canvas
      return {
        ...canvas,
        contentCardRange: { ...range, end: range.end + 1 },
      }
    }

    return {
      ...canvas,
      contentCardRange: {
        ...range,
        start: range.start + 1,
        ...(typeof range.end === "number" ? { end: range.end + 1 } : {}),
      },
    }
  })
}
