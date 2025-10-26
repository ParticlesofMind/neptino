/**
 * Standardized zoom level helpers.
 * Ensures all zoom interactions snap to a shared 25% increment scale (0.25 steps)
 * ranging from 25% (0.25) to 500% (5.0).
 */

export const STANDARD_ZOOM_LEVELS: number[] = Array.from({ length: 20 }, (_value, index) => {
  const zoom = 0.25 + index * 0.25;
  return parseFloat(zoom.toFixed(4));
});

const MIN_ZOOM = STANDARD_ZOOM_LEVELS[0];
const MAX_ZOOM = STANDARD_ZOOM_LEVELS[STANDARD_ZOOM_LEVELS.length - 1];
const EPSILON = 0.0001;

/**
 * Clamp a zoom value to the supported range and snap it to the nearest standard level.
 */
export function snapToStandardZoom(value: number): number {
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  let closest = STANDARD_ZOOM_LEVELS[0];
  let smallestDelta = Math.abs(closest - clamped);

  for (const level of STANDARD_ZOOM_LEVELS) {
    const delta = Math.abs(level - clamped);
    if (delta < smallestDelta - EPSILON) {
      closest = level;
      smallestDelta = delta;
    }
  }

  return closest;
}

/**
 * Find the next higher zoom level. Returns the current level if already at max.
 */
export function getNextZoomLevel(current: number): number {
  for (const level of STANDARD_ZOOM_LEVELS) {
    if (level > current + EPSILON) {
      return level;
    }
  }
  return MAX_ZOOM;
}

/**
 * Find the previous lower zoom level. Returns the current level if already at min.
 */
export function getPreviousZoomLevel(current: number): number {
  for (let index = STANDARD_ZOOM_LEVELS.length - 1; index >= 0; index -= 1) {
    const level = STANDARD_ZOOM_LEVELS[index];
    if (level < current - EPSILON) {
      return level;
    }
  }
  return MIN_ZOOM;
}

/**
 * Snap a computed fit-to-view zoom down to the closest supported level so the
 * entire canvas remains visible.
 */
export function snapFitZoomLevel(fitZoom: number): number {
  const clampedFit = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom));

  let candidate = MIN_ZOOM;
  for (const level of STANDARD_ZOOM_LEVELS) {
    if (level <= clampedFit + EPSILON) {
      candidate = level;
    } else {
      break;
    }
  }

  return candidate;
}

export function getMinZoom(): number {
  return MIN_ZOOM;
}

export function getMaxZoom(): number {
  return MAX_ZOOM;
}
