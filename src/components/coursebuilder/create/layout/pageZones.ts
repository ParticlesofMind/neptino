import type { PageDimensions } from "../types"

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PageZones {
  sheetBox: Rect
  printSafeBox: Rect
  textBox: Rect
  bodyBox: Rect
  marginZones: {
    top: Rect
    right: Rect
    bottom: Rect
    left: Rect
  }
}

export const PRINT_SAFE_INSET_PX = 32
export const TEXT_BOX_MAX_WIDTH_PX = 360

function nonNegative(value: number): number {
  return Math.max(0, Math.round(value))
}

export function rectContainsRect(outer: Rect, inner: Rect, tolerance = 0): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  )
}

export function clampRectToRect(rect: Rect, bounds: Rect): Rect {
  const width = Math.min(rect.width, bounds.width)
  const height = Math.min(rect.height, bounds.height)
  const x = Math.min(Math.max(rect.x, bounds.x), bounds.x + bounds.width - width)
  const y = Math.min(Math.max(rect.y, bounds.y), bounds.y + bounds.height - height)

  return {
    x: nonNegative(x),
    y: nonNegative(y),
    width: nonNegative(width),
    height: nonNegative(height),
  }
}

export function computePageZones(
  dims: PageDimensions,
  printSafeInsetPx = PRINT_SAFE_INSET_PX,
): PageZones {
  const sheetBox: Rect = {
    x: 0,
    y: 0,
    width: nonNegative(dims.widthPx),
    height: nonNegative(dims.heightPx),
  }

  const safeInset = Math.max(0, Math.round(printSafeInsetPx))
  const printSafeBox: Rect = {
    x: safeInset,
    y: safeInset,
    width: nonNegative(dims.widthPx - safeInset * 2),
    height: nonNegative(dims.heightPx - safeInset * 2),
  }

  const bodyBox: Rect = {
    x: nonNegative(dims.margins.left),
    y: nonNegative(dims.margins.top),
    width: nonNegative(dims.widthPx - dims.margins.left - dims.margins.right),
    height: nonNegative(dims.heightPx - dims.margins.top - dims.margins.bottom),
  }

  const textWidth = Math.min(bodyBox.width, TEXT_BOX_MAX_WIDTH_PX)
  const textBox: Rect = {
    x: bodyBox.x,
    y: bodyBox.y,
    width: nonNegative(textWidth),
    height: bodyBox.height,
  }

  return {
    sheetBox,
    printSafeBox,
    textBox,
    bodyBox,
    marginZones: {
      top: {
        x: 0,
        y: 0,
        width: sheetBox.width,
        height: nonNegative(dims.margins.top),
      },
      right: {
        x: nonNegative(dims.widthPx - dims.margins.right),
        y: bodyBox.y,
        width: nonNegative(dims.margins.right),
        height: bodyBox.height,
      },
      bottom: {
        x: 0,
        y: nonNegative(dims.heightPx - dims.margins.bottom),
        width: sheetBox.width,
        height: nonNegative(dims.margins.bottom),
      },
      left: {
        x: 0,
        y: bodyBox.y,
        width: nonNegative(dims.margins.left),
        height: bodyBox.height,
      },
    },
  }
}
