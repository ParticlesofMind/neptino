/**
 * Debug Event Log
 *
 * Module-level circular event buffer for development diagnostics.
 * Populated by canvasStore, debugMeasurements, and other internal systems.
 * Read by CanvasDebugPanel via useSyncExternalStore.
 *
 * Zero production cost — all writes are guarded by NODE_ENV check.
 */

export type LogLevel = "info" | "warn" | "error"

export interface LogEvent {
  id:         number
  ts:         number
  level:      LogLevel
  event:      string
  canvasId?:  string
  sessionId?: string
  data?:      Record<string, unknown>
}

const MAX_LOG = 150
let nextId = 1
const buffer: LogEvent[] = []
const logListeners = new Set<() => void>()

export function appendLog(partial: Omit<LogEvent, "id" | "ts">): void {
  if (process.env.NODE_ENV === "production") return
  const entry: LogEvent = { id: nextId++, ts: Date.now(), ...partial }
  buffer.push(entry)
  if (buffer.length > MAX_LOG) buffer.splice(0, buffer.length - MAX_LOG)
  logListeners.forEach((fn) => fn())
}

export function readLog(): readonly LogEvent[] {
  return buffer
}

export function subscribeLog(fn: () => void): () => void {
  logListeners.add(fn)
  return () => logListeners.delete(fn)
}

export function clearLog(): void {
  buffer.length = 0
  nextId = 1
  logListeners.forEach((fn) => fn())
}
