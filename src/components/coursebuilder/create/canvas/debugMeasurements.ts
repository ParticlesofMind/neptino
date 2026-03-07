/**
 * Debug Measurement Registry
 *
 * Module-level pub/sub store for live canvas measurement data.
 * Written by useCanvasOverflow on every ResizeObserver tick; read by CanvasDebugPanel.
 * Zero production cost — calls are guarded by `process.env.NODE_ENV !== "production"`.
 */
import { appendLog } from "./debugLog"

export interface DebugMeasurement {
  canvasId:    string
  sessionId:   string
  contentH:    number   // content.scrollHeight (CSS px, unscaled)
  bodyH:       number   // body.clientHeight    (CSS px, unscaled)
  overflow:    boolean
  splitGuard:  boolean
  timestamp:   number
}

const measurements = new Map<string, DebugMeasurement>()
const listeners    = new Set<() => void>()

export function writeMeasurement(m: DebugMeasurement): void {
  measurements.set(m.canvasId, m)
  listeners.forEach((fn) => fn())
  if (m.overflow) {
    appendLog({
      level:     "warn",
      event:     "measurement:overflow",
      canvasId:  m.canvasId,
      sessionId: m.sessionId,
      data:      { contentH: m.contentH, bodyH: m.bodyH, delta: m.contentH - m.bodyH, splitGuard: m.splitGuard },
    })
  }
}

export function readMeasurements(): ReadonlyMap<string, DebugMeasurement> {
  return measurements
}

export function subscribeMeasurements(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function clearMeasurements(): void {
  measurements.clear()
  listeners.forEach((fn) => fn())
}
