"use client"

/**
 * Canvas Debug Panel
 *
 * Developer overlay showing live canvas measurement data, session inspection,
 * card management, zoom/perspective diagnostics, and data export tools.
 *
 * Triggered by a small floating button at the bottom-right of the editor.
 * Supports an expanded fullscreen mode for detailed inspection.
 */

import React, { useState, useEffect, useSyncExternalStore, useCallback, useRef } from "react"
import {
  Bug, X, RefreshCw, Trash2, ChevronDown, ChevronRight,
  Copy, Check, Database, BarChart2, AlertTriangle,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Ruler, Activity,
  Server, ScrollText, LayoutList, Package,
} from "lucide-react"
import { useCourseStore } from "../store/courseStore"
import { useCanvasStore } from "../store/canvasStore"
import {
  DEFAULT_PAGE_DIMENSIONS,
  bodyHeightPx,
  type CourseSession,
  type CanvasId,
  type CardId,
  type DroppedCardId,
  type BlockKey,
} from "../types"
import {
  readMeasurements,
  subscribeMeasurements,
  clearMeasurements,
  type DebugMeasurement,
} from "./debugMeasurements"
import {
  readLog,
  subscribeLog,
  clearLog,
  type LogEvent,
  type LogLevel,
} from "./debugLog"

// ─── Measurement store hook ───────────────────────────────────────────────────

function useMeasurements(): ReadonlyMap<string, DebugMeasurement> {
  return useSyncExternalStore(
    subscribeMeasurements,
    readMeasurements,
    readMeasurements,
  )
}

// ─── Copy-to-clipboard hook ───────────────────────────────────────────────────

function useCopyToClipboard(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }, [])
  return { copied, copy }
}

// ─── localStorage persistence hook ─────────────────────────────────────────────

function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setRaw] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setRaw((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v
        try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* quota */ }
        return next
      })
    },
    [key],
  )

  return [value, set]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function fmtRange(range: { start: number; end?: number } | undefined, label: string): string {
  if (!range) return ""
  const end = range.end !== undefined ? String(range.end) : "∞"
  return `${label}[${range.start}-${end}]`
}

function normalizeRange(
  range: { start: number; end?: number } | undefined,
  total: number,
): { start: number; end: number } {
  const safeTotal = Math.max(0, total)
  const rawStart = range?.start ?? 0
  const rawEnd = range?.end ?? safeTotal
  const start = Math.min(Math.max(0, rawStart), safeTotal)
  const end = Math.min(Math.max(start, rawEnd), safeTotal)
  return { start, end }
}

function pickDebugBlockKey(blockKeys: readonly string[] | undefined): BlockKey | undefined {
  if (!blockKeys || blockKeys.length === 0) return undefined
  if (blockKeys.includes("assignment")) return "assignment" as BlockKey
  if (blockKeys.includes("content")) return "content" as BlockKey
  if (blockKeys.includes("program")) return "program" as BlockKey
  if (blockKeys.includes("resources")) return "resources" as BlockKey
  return undefined
}

function findCanvasForTaskIndex(session: CourseSession, taskIdx: number, totalTasks: number): CanvasId | null {
  const matchingCanvas = session.canvases.find((canvas) => {
    const taskRange = normalizeRange(canvas.contentTaskRange, totalTasks)
    return taskIdx >= taskRange.start && taskIdx < taskRange.end
  })
  return (matchingCanvas?.id ?? session.canvases[0]?.id ?? null) as CanvasId | null
}

function getCanvasIdSet(sessions: CourseSession[]): Set<string> {
  return new Set(sessions.flatMap((session) => session.canvases.map((canvas) => canvas.id)))
}

function partitionMeasurements(
  sessions: CourseSession[],
  measurements: ReadonlyMap<string, DebugMeasurement>,
): {
  current: Map<string, DebugMeasurement>
  stale: Array<[string, DebugMeasurement]>
} {
  const currentIds = getCanvasIdSet(sessions)
  const current = new Map<string, DebugMeasurement>()
  const stale: Array<[string, DebugMeasurement]> = []

  for (const [canvasId, measurement] of measurements.entries()) {
    if (currentIds.has(canvasId)) {
      current.set(canvasId, measurement)
      continue
    }
    stale.push([canvasId, measurement])
  }

  return { current, stale }
}

function countCurrentMeasurements(
  sessions: CourseSession[],
  measurements: ReadonlyMap<string, DebugMeasurement>,
): number {
  return partitionMeasurements(sessions, measurements).current.size
}

function buildDebugSummary(
  sessions: CourseSession[],
  measurements: ReadonlyMap<string, DebugMeasurement>,
): Record<string, unknown> {
  const totalSessions = sessions.length
  const allCanvases = sessions.flatMap((s) => s.canvases.map((c) => ({ sessionId: s.id, canvas: c })))
  const totalCanvases = allCanvases.length
  const { current: currentMeasurements, stale: staleMeasurements } = partitionMeasurements(sessions, measurements)
  const measuredCanvases = currentMeasurements.size
  const missingCanvases = Math.max(0, totalCanvases - measuredCanvases)

  let totalTopics = 0
  let totalObjectives = 0
  let totalTasks = 0
  let totalCards = 0
  let tasksWithCards = 0

  for (const session of sessions) {
    totalTopics += session.topics.length
    for (const topic of session.topics) {
      totalObjectives += topic.objectives.length
      for (const objective of topic.objectives) {
        totalTasks += objective.tasks.length
        for (const task of objective.tasks) {
          const cardCount = task.droppedCards.length
          totalCards += cardCount
          if (cardCount > 0) tasksWithCards += 1
        }
      }
    }
  }

  const overflow = Array.from(currentMeasurements.values()).filter((m) => m.overflow)
  const overflowWithoutSplitGuard = overflow.filter((m) => !m.splitGuard)

  const prefixedIdIssues = allCanvases
    .filter(({ sessionId, canvas }) => !canvas.id.startsWith(`${sessionId}-canvas-`))
    .map(({ sessionId, canvas }) => ({ sessionId, canvasId: canvas.id }))

  const missingMeasurementIds = allCanvases
    .filter(({ canvas }) => !currentMeasurements.has(canvas.id))
    .map(({ canvas }) => canvas.id)

  const rawRangePresence = {
    topic: allCanvases.filter(({ canvas }) => canvas.contentTopicRange !== undefined).length,
    objective: allCanvases.filter(({ canvas }) => canvas.contentObjectiveRange !== undefined).length,
    task: allCanvases.filter(({ canvas }) => canvas.contentTaskRange !== undefined).length,
    card: allCanvases.filter(({ canvas }) => canvas.contentCardRange !== undefined).length,
  }

  return {
    capturedAt: new Date().toISOString(),
    totals: {
      sessions: totalSessions,
      canvases: totalCanvases,
      topics: totalTopics,
      objectives: totalObjectives,
      tasks: totalTasks,
      cards: totalCards,
      tasksWithCards,
    },
    measurements: {
      measuredCanvases,
      missingCanvases,
      coveragePct: totalCanvases > 0 ? Number(((measuredCanvases / totalCanvases) * 100).toFixed(2)) : 100,
      overflowCount: overflow.length,
      overflowWithoutSplitGuard: overflowWithoutSplitGuard.length,
      staleMeasurements: staleMeasurements.length,
      measurementStoreSize: measurements.size,
    },
    rangesRawPresence: {
      topic: `${rawRangePresence.topic}/${totalCanvases}`,
      objective: `${rawRangePresence.objective}/${totalCanvases}`,
      task: `${rawRangePresence.task}/${totalCanvases}`,
      card: `${rawRangePresence.card}/${totalCanvases}`,
    },
    anomalies: {
      nonStandardCanvasIds: prefixedIdIssues.length,
      missingMeasurements: missingMeasurementIds.length,
      overflowWithoutSplitGuardCanvasIds: overflowWithoutSplitGuard.map((m) => m.canvasId),
      nonStandardCanvasIdExamples: prefixedIdIssues.slice(0, 10),
      missingMeasurementExamples: missingMeasurementIds.slice(0, 20),
      staleMeasurementExamples: staleMeasurements.slice(0, 20).map(([canvasId]) => canvasId),
    },
  }
}

function tsAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec}s ago`
  return `${Math.floor(sec / 60)}m ago`
}

// ─── Session section — Overflow tab ──────────────────────────────────────────

function RowCopyButton({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false)
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    void navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    })
  }, [data])
  return (
    <button
      onClick={handleClick}
      title="Copy row data as JSON"
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/15 text-white/30 hover:text-white/70 transition-all"
    >
      {copied
        ? <Check size={10} className="text-green-400" />
        : <Copy size={10} />
      }
    </button>
  )
}

function SessionSection({
  session,
  measurements,
  bodyH,
  effectiveScale,
  isExpanded,
  onToggle,
}: {
  session: CourseSession
  measurements: ReadonlyMap<string, DebugMeasurement>
  bodyH: number
  effectiveScale: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const overflowingIds   = useCanvasStore((s) => s.overflowingCanvasIds)
  const activeCanvasId   = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas  = useCanvasStore((s) => s.setActiveCanvas)
  const clearSessionCards = useCourseStore((s) => s.clearSessionCards)
  const [clearing, setClearing] = useState(false)

  const totalCards = session.topics
    .flatMap((t) => t.objectives)
    .flatMap((o) => o.tasks)
    .reduce((sum, task) => sum + task.droppedCards.length, 0)

  const handleClearCards = useCallback(() => {
    setClearing(true)
    clearSessionCards(session.id)
    setTimeout(() => setClearing(false), 1200)
  }, [clearSessionCards, session.id])

  const sc = effectiveScale > 0 ? effectiveScale : 1

  return (
    <div className="border border-white/10 rounded overflow-hidden">
      {/* Session header */}
      <div className="flex items-center gap-1 bg-white/5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left transition-colors flex-1 min-w-0"
        >
          {isExpanded
            ? <ChevronDown size={12} className="text-white/50 shrink-0" />
            : <ChevronRight size={12} className="text-white/50 shrink-0" />
          }
          <span className="text-[11px] font-semibold text-white/80 truncate flex-1">
            Session {session.order} — {session.title || "(untitled)"}
          </span>
          <span className="text-[10px] text-white/40 shrink-0 mr-2">
            {session.canvases.length} canvas{session.canvases.length !== 1 ? "es" : ""}
            {totalCards > 0 && (
              <span className="ml-1.5 text-cyan-300/80">{totalCards} block{totalCards !== 1 ? "s" : ""}</span>
            )}
          </span>
        </button>

        {/* Clear blocks button */}
        {totalCards > 0 && (
          <button
            onClick={handleClearCards}
            title="Remove all blocks from this session"
            className={[
              "flex items-center gap-1 px-2 py-1 mr-1 rounded text-[10px] font-medium transition-colors shrink-0",
              clearing
                ? "bg-green-500/20 text-green-300"
                : "bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-300",
            ].join(" ")}
          >
            <Trash2 size={10} />
            {clearing ? "Cleared" : "Clear blocks"}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] leading-relaxed">
            <thead>
              <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[9px]">
                <th className="px-3 py-1 text-left font-medium w-8">#</th>
                <th className="px-2 py-1 text-center font-medium w-20">Status</th>
                <th className="px-2 py-1 text-right font-medium">Content</th>
                <th className="px-2 py-1 text-right font-medium">Visual</th>
                <th className="px-2 py-1 text-right font-medium">Body</th>
                <th className="px-2 py-1 text-right font-medium">Vis.Body</th>
                <th className="px-2 py-1 text-right font-medium">Delta</th>
                <th className="px-2 py-1 text-right font-medium w-12">Blocks</th>
                <th className="px-2 py-1 text-left font-medium">Blocks</th>
                <th className="px-2 py-1 text-left font-medium">Ranges</th>
                <th className="px-2 py-1 text-right font-medium w-16">Meas.</th>
                <th className="px-2 py-1 w-6" />
              </tr>
            </thead>
            <tbody>
              {session.canvases.map((canvas, idx) => {
                const m = measurements.get(canvas.id)
                const storeOverflow = overflowingIds.has(canvas.id)
                const measuredOverflow = m?.overflow ?? false
                const isOverflow = storeOverflow || measuredOverflow
                const isActive = activeCanvasId === canvas.id

                const contentH  = m?.contentH ?? 0
                const measBodyH = m?.bodyH ?? bodyH
                const delta     = contentH > 0 ? contentH - measBodyH : null

                const visualContentH = contentH > 0 ? Math.round(contentH * sc) : 0
                const visualBodyH    = Math.round(measBodyH * sc)

                const topicRangeTxt  = fmtRange(canvas.contentTopicRange,     "T")
                const objRangeTxt    = fmtRange(canvas.contentObjectiveRange,  "O")
                const taskRangeTxt   = fmtRange(canvas.contentTaskRange,       "K")
                const cardRangeTxt   = fmtRange(canvas.contentCardRange,       "C")
                const ranges = [topicRangeTxt, objRangeTxt, taskRangeTxt, cardRangeTxt]
                  .filter(Boolean).join(" ") || "all"

                const blocks = canvas.blockKeys?.join(", ") ?? "—"

                // Count cards assigned to this canvas via contentCardRange
                const allCards = session.topics
                  .flatMap((t) => t.objectives)
                  .flatMap((o) => o.tasks)
                  .flatMap((task) => task.droppedCards)
                const cardRange = canvas.contentCardRange
                const canvasCardCount = cardRange
                  ? allCards.slice(cardRange.start, cardRange.end).length
                  : allCards.length

                const rowData = {
                  canvas: idx + 1,
                  id: canvas.id,
                  status: isOverflow ? (m?.splitGuard ? "splitting" : "overflow") : "ok",
                  contentH:     contentH > 0 ? contentH : null,
                  visualContentH: visualContentH > 0 ? visualContentH : null,
                  bodyH:        measBodyH,
                  visualBodyH,
                  delta,
                  scale:        Number(sc.toFixed(4)),
                  cards:        canvasCardCount > 0 ? canvasCardCount : null,
                  blocks:       canvas.blockKeys ?? [],
                  ranges,
                  measuredAt:   m ? tsAgo(m.timestamp) : null,
                }

                return (
                  <tr
                    key={canvas.id}
                    onClick={() => setActiveCanvas(canvas.id as CanvasId)}
                    title="Click to focus this canvas"
                    className={[
                      "group border-b border-white/5 last:border-b-0 cursor-pointer transition-colors",
                      isOverflow
                        ? "bg-red-900/20 hover:bg-red-900/30"
                        : isActive
                        ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                        : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    {/* # */}
                    <td className={[
                      "px-3 py-1 tabular-nums font-medium",
                      isActive ? "text-cyan-300" : "text-white/60",
                    ].join(" ")}>{idx + 1}</td>

                    {/* Status */}
                    <td className="px-2 py-1 text-center">
                      {isOverflow ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/30 text-red-300 uppercase tracking-wider">
                          {m?.splitGuard ? "splitting" : "overflow"}
                        </span>
                      ) : isActive ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                          active
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                          ok
                        </span>
                      )}
                    </td>

                    {/* Content H (unscaled DOM) */}
                    <td className={[
                      "px-2 py-1 text-right tabular-nums",
                      contentH > 0 ? (isOverflow ? "text-red-300" : "text-white/70") : "text-white/20",
                    ].join(" ")}>
                      {contentH > 0 ? `${contentH}` : "—"}
                    </td>

                    {/* Visual content H (scaled) */}
                    <td className={[
                      "px-2 py-1 text-right tabular-nums",
                      visualContentH > 0 ? (isOverflow ? "text-red-200/70" : "text-white/40") : "text-white/15",
                    ].join(" ")}>
                      {visualContentH > 0 ? `${visualContentH}` : "—"}
                    </td>

                    {/* Body H (unscaled DOM) */}
                    <td className="px-2 py-1 text-right tabular-nums text-white/50">
                      {measBodyH}
                    </td>

                    {/* Visual body H (scaled) */}
                    <td className="px-2 py-1 text-right tabular-nums text-white/30">
                      {visualBodyH}
                    </td>

                    {/* Delta */}
                    <td className={[
                      "px-2 py-1 text-right tabular-nums font-mono",
                      delta === null ? "text-white/20"
                        : delta > 0 ? "text-red-400"
                        : "text-emerald-400",
                    ].join(" ")}>
                      {delta === null ? "—" : fmt(delta)}
                    </td>

                    {/* Cards on this canvas */}
                    <td className={[
                      "px-2 py-1 text-right tabular-nums",
                      canvasCardCount > 0 ? "text-cyan-300/80" : "text-white/20",
                    ].join(" ")}>
                      {canvasCardCount > 0 ? canvasCardCount : "—"}
                    </td>

                    {/* Blocks */}
                    <td className="px-2 py-1 text-white/50 font-mono max-w-[100px] truncate">
                      {blocks}
                    </td>

                    {/* Ranges */}
                    <td className="px-2 py-1 font-mono text-cyan-300/80 whitespace-nowrap">
                      {ranges}
                    </td>

                    {/* Measured ago */}
                    <td className="px-2 py-1 text-right text-white/25 whitespace-nowrap">
                      {m ? tsAgo(m.timestamp) : "—"}
                    </td>

                    {/* Copy button */}
                    <td className="px-1 py-1 text-right">
                      <RowCopyButton data={rowData} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Session data tab — raw JSON viewer ───────────────────────────────────────

function SessionDataTab({
  sessions,
  expandedIds,
  onToggle,
  onExpandAll,
  onCollapseAll,
}: {
  sessions: CourseSession[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}) {
  const { copied, copy } = useCopyToClipboard()
  const [lastCopied, setLastCopied] = useState<string | null>(null)

  const handleCopySession = (session: CourseSession) => {
    const payload = JSON.stringify(session, null, 2)
    copy(payload)
    setLastCopied(session.id)
  }

  const handleCopyAll = () => {
    copy(JSON.stringify(sessions, null, 2))
    setLastCopied("__all__")
  }

  const totalCards = sessions.reduce(
    (sum, s) =>
      sum +
      s.topics
        .flatMap((t) => t.objectives)
        .flatMap((o) => o.tasks)
        .reduce((n, task) => n + task.droppedCards.length, 0),
    0,
  )

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {/* Summary + controls */}
      <div className="flex items-center gap-2 px-1 pb-1 flex-wrap">
        <span className="text-[10px] text-white/40 font-mono">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {totalCards} block{totalCards !== 1 ? "s" : ""} total
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onExpandAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronDown size={10} />
            All
          </button>
          <button
            onClick={onCollapseAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronRight size={10} />
            None
          </button>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
          >
            {copied && lastCopied === "__all__" ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
            Copy all
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-center text-white/30 text-[11px] py-8">No sessions loaded.</p>
      ) : (
        sessions.map((session) => {
          const isExpanded = expandedIds.has(session.id)
          const sessionCards = session.topics
            .flatMap((t) => t.objectives)
            .flatMap((o) => o.tasks)
            .reduce((n, task) => n + task.droppedCards.length, 0)
          const topicCount = session.topics.length
          const objCount = session.topics.flatMap((t) => t.objectives).length
          const taskCount = session.topics.flatMap((t) => t.objectives).flatMap((o) => o.tasks).length

          return (
            <div key={session.id} className="border border-white/10 rounded overflow-hidden">
              {/* Session header */}
              <div className="flex items-center gap-1 px-3 py-2 bg-white/5">
                <button
                  onClick={() => onToggle(session.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {isExpanded
                    ? <ChevronDown size={12} className="text-white/50 shrink-0" />
                    : <ChevronRight size={12} className="text-white/50 shrink-0" />
                  }
                  <span className="text-[11px] font-semibold text-white/80 truncate flex-1">
                    Session {session.order} — {session.title || "(untitled)"}
                  </span>
                </button>

                {/* Stats chips */}
                <div className="flex items-center gap-1.5 shrink-0 text-[9px] font-mono text-white/35">
                  <span>{topicCount}T</span>
                  <span>·</span>
                  <span>{objCount}O</span>
                  <span>·</span>
                  <span>{taskCount}K</span>
                  {sessionCards > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-300/70">{sessionCards} blocks</span>
                    </>
                  )}
                </div>

                {/* Copy session JSON */}
                <button
                  onClick={() => handleCopySession(session)}
                  title="Copy session JSON"
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                >
                  {copied && lastCopied === session.id
                    ? <Check size={10} className="text-green-400" />
                    : <Copy size={10} />
                  }
                  <span className="hidden sm:inline">JSON</span>
                </button>
              </div>

              {/* JSON viewer */}
              {isExpanded && (
                <pre className="text-[9.5px] leading-relaxed text-white/55 font-mono px-3 py-2 overflow-x-auto max-h-72 bg-black/20 border-t border-white/5">
                  {JSON.stringify(session, null, 2)}
                </pre>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Perspective tab ──────────────────────────────────────────────────────────

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400] as const

function PerspectiveTab({
  zoomLevel,
  fitScale,
  effectiveScale,
  panOffset,
  setZoom,
  stepZoom,
}: {
  zoomLevel: number
  fitScale: number
  effectiveScale: number
  panOffset: { x: number; y: number }
  setZoom: (z: number) => void
  stepZoom: (delta?: number) => void
}) {
  const dims  = DEFAULT_PAGE_DIMENSIONS
  const bodyH = bodyHeightPx(dims)

  const visualW    = Math.round(dims.widthPx  * effectiveScale)
  const visualH    = Math.round(dims.heightPx * effectiveScale)
  const visualBody = Math.round(bodyH * effectiveScale)

  const zoomStatus =
    zoomLevel < 100  ? "zoomed out"
    : zoomLevel > 100 ? "zoomed in"
    : "at fit (100%)"

  const zoomStatusColor =
    zoomLevel < 100  ? "text-sky-300"
    : zoomLevel > 100 ? "text-amber-300"
    : "text-emerald-300"

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">

      {/* ── Interactive zoom controls ── */}
      <div className="border border-white/10 rounded p-3 space-y-2">
        <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">
          Zoom control
        </div>

        {/* Zoom level + stepper */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepZoom(-10)}
            title="Zoom out (-10%)"
            className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
          >
            <ZoomOut size={13} />
          </button>

          <div className="flex-1 text-center">
            <span className={["text-[22px] font-bold tabular-nums", zoomStatusColor].join(" ")}>
              {zoomLevel}%
            </span>
            <span className={["ml-2 text-[10px]", zoomStatusColor].join(" ")}>
              {zoomStatus}
            </span>
          </div>

          <button
            onClick={() => stepZoom(10)}
            title="Zoom in (+10%)"
            className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
          >
            <ZoomIn size={13} />
          </button>
        </div>

        {/* Zoom slider */}
        <input
          type="range"
          min={25}
          max={400}
          step={5}
          value={zoomLevel}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-sky-400 h-1.5 cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-white/25 font-mono">
          <span>25%</span>
          <span>100%</span>
          <span>200%</span>
          <span>400%</span>
        </div>

        {/* Preset buttons  */}
        <div className="flex flex-wrap gap-1 pt-1">
          {ZOOM_PRESETS.map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={[
                "px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors",
                zoomLevel === z
                  ? "bg-sky-500/30 text-sky-300 border border-sky-500/40"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70",
              ].join(" ")}
            >
              {z}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Dimension snapshot at current zoom ── */}
      <div className="border border-white/10 rounded p-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">
          Canvas dimensions @ {zoomLevel}%
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
          {/* Natural */}
          <div className="col-span-2 text-[9px] text-white/30 uppercase tracking-wider pt-1">
            Natural (DOM px)
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">width</span>
            <span className="text-white/80">{dims.widthPx}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">height</span>
            <span className="text-white/80">{dims.heightPx}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">body h</span>
            <span className="text-white/80">{bodyH}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">margins T/B</span>
            <span className="text-white/80">{dims.margins.top} / {dims.margins.bottom}</span>
          </div>

          {/* Scaled visual */}
          <div className="col-span-2 text-[9px] text-white/30 uppercase tracking-wider pt-1">
            Visual (rendered px @ {effectiveScale.toFixed(3)}×)
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">vis. width</span>
            <span className="text-sky-300">{visualW}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">vis. height</span>
            <span className="text-sky-300">{visualH}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">vis. body h</span>
            <span className="text-sky-300">{visualBody}</span>
          </div>

          {/* Scale decomposition */}
          <div className="col-span-2 text-[9px] text-white/30 uppercase tracking-wider pt-1">
            Scale decomposition
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">fitScale</span>
            <span className="text-amber-300/80">{fitScale > 0 ? fitScale.toFixed(4) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">zoom factor</span>
            <span className="text-amber-300/80">{(zoomLevel / 100).toFixed(4)}</span>
          </div>
          <div className="flex justify-between col-span-2 border-t border-white/5 pt-1">
            <span className="text-white/50 font-semibold">effectiveScale</span>
            <span className="text-amber-300 font-bold">{effectiveScale.toFixed(4)}×</span>
          </div>

          {/* Pan */}
          <div className="col-span-2 text-[9px] text-white/30 uppercase tracking-wider pt-1">
            Pan offset
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">x</span>
            <span className={panOffset.x !== 0 ? "text-amber-300/80" : "text-white/40"}>{panOffset.x}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">y</span>
            <span className={panOffset.y !== 0 ? "text-amber-300/80" : "text-white/40"}>{panOffset.y}</span>
          </div>
        </div>
      </div>

      {/* ── Zoom level reference table ── */}
      <div className="border border-white/10 rounded overflow-hidden">
        <div className="px-3 py-2 bg-white/5 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
          Zoom reference table
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[9.5px] font-mono leading-relaxed">
            <thead>
              <tr className="border-b border-white/10 text-white/30 uppercase text-[8.5px]">
                <th className="px-3 py-1 text-left">Zoom</th>
                <th className="px-2 py-1 text-right">Scale</th>
                <th className="px-2 py-1 text-right">Vis. W</th>
                <th className="px-2 py-1 text-right">Vis. H</th>
                <th className="px-2 py-1 text-right">Vis. Body</th>
                <th className="px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ZOOM_PRESETS.map((z) => {
                const scale  = (fitScale > 0 ? fitScale : 1) * (z / 100)
                const vw     = Math.round(dims.widthPx  * scale)
                const vh     = Math.round(dims.heightPx * scale)
                const vb     = Math.round(bodyH * scale)
                const isActive = z === zoomLevel
                return (
                  <tr
                    key={z}
                    onClick={() => setZoom(z)}
                    className={[
                      "border-b border-white/5 last:border-b-0 cursor-pointer transition-colors",
                      isActive
                        ? "bg-sky-500/10 hover:bg-sky-500/15"
                        : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    <td className={["px-3 py-1 font-semibold", isActive ? "text-sky-300" : "text-white/60"].join(" ")}>
                      {z}%
                      {isActive && <span className="ml-1 text-sky-400/60">◀</span>}
                    </td>
                    <td className="px-2 py-1 text-right text-white/50">{scale.toFixed(3)}×</td>
                    <td className="px-2 py-1 text-right text-white/70">{vw}</td>
                    <td className="px-2 py-1 text-right text-white/70">{vh}</td>
                    <td className={["px-2 py-1 text-right font-semibold", isActive ? "text-sky-300" : "text-white/50"].join(" ")}>{vb}</td>
                    <td className="px-2 py-1">
                      <span className={[
                        "text-[8px] font-semibold uppercase",
                        z < 100  ? "text-sky-300/70"
                        : z > 100 ? "text-amber-300/70"
                        : "text-emerald-300/70",
                      ].join(" ")}>
                        {z < 100 ? "out" : z > 100 ? "in" : "fit"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-1.5 border-t border-white/5 text-[9px] text-white/25">
          Click any row to apply that zoom level. Scale = fitScale × (zoom / 100).
        </div>
      </div>
    </div>
  )
}

// ─── Measurements tab — raw DebugMeasurement store ────────────────────────────

function MeasurementsTab({
  measurements,
  effectiveScale,
  onClear,
}: {
  measurements: ReadonlyMap<string, DebugMeasurement>
  effectiveScale: number
  onClear: () => void
}) {
  const { copied, copy } = useCopyToClipboard()

  const handleCopyAll = () => {
    const data = Array.from(measurements.entries()).map(([id, m]) => ({ id, ...m }))
    copy(JSON.stringify(data, null, 2))
  }

  const entries = Array.from(measurements.entries())

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1 pb-1">
        <span className="text-[10px] text-white/40 font-mono">
          {entries.length} measurement{entries.length !== 1 ? "s" : ""} in store
        </span>
        <button
          onClick={handleCopyAll}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          Copy all
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
        >
          <Trash2 size={10} />
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-white/30 text-[11px] py-8">
          No measurements yet. Measurements are recorded as canvases render.
        </p>
      ) : (
        <div className="border border-white/10 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[9.5px] font-mono leading-relaxed">
              <thead>
                <tr className="border-b border-white/10 text-white/30 uppercase text-[8.5px]">
                  <th className="px-3 py-1.5 text-left">Canvas ID</th>
                  <th className="px-2 py-1.5 text-right">Content H</th>
                  <th className="px-2 py-1.5 text-right">Vis. H</th>
                  <th className="px-2 py-1.5 text-right">Body H</th>
                  <th className="px-2 py-1.5 text-right">Delta</th>
                  <th className="px-2 py-1.5 text-center">Overflow</th>
                  <th className="px-2 py-1.5 text-center">Split Guard</th>
                  <th className="px-2 py-1.5 text-right">Measured</th>
                  <th className="px-2 py-1.5 w-6" />
                </tr>
              </thead>
              <tbody>
                {entries.map(([id, m]) => {
                  const delta      = m.contentH > 0 && m.bodyH > 0 ? m.contentH - m.bodyH : null
                  const visContentH = m.contentH > 0 ? Math.round(m.contentH * effectiveScale) : 0
                  const isOverflow  = m.overflow
                  const rowData     = { id, ...m, delta, visualContentH: visContentH }

                  return (
                    <tr
                      key={id}
                      className={[
                        "group border-b border-white/5 last:border-b-0 transition-colors",
                        isOverflow ? "bg-red-900/20 hover:bg-red-900/30" : "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <td className="px-3 py-1 text-white/50 max-w-[140px] truncate" title={id}>
                        {id.slice(0, 18)}&hellip;
                      </td>
                      <td className={["px-2 py-1 text-right tabular-nums", isOverflow ? "text-red-300" : "text-white/70"].join(" ")}>
                        {m.contentH > 0 ? m.contentH : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-white/40">
                        {visContentH > 0 ? visContentH : "—"}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-white/50">
                        {m.bodyH > 0 ? m.bodyH : "—"}
                      </td>
                      <td className={[
                        "px-2 py-1 text-right tabular-nums",
                        delta === null ? "text-white/20"
                          : delta > 0 ? "text-red-400"
                          : "text-emerald-400",
                      ].join(" ")}>
                        {delta === null ? "—" : fmt(delta)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {isOverflow
                          ? <span className="text-red-400 font-semibold">yes</span>
                          : <span className="text-white/20">no</span>
                        }
                      </td>
                      <td className="px-2 py-1 text-center">
                        {m.splitGuard
                          ? <span className="text-amber-300 font-semibold">yes</span>
                          : <span className="text-white/20">—</span>
                        }
                      </td>
                      <td className="px-2 py-1 text-right text-white/25 whitespace-nowrap">
                        {tsAgo(m.timestamp)}
                      </td>
                      <td className="px-1 py-1 text-right">
                        <RowCopyButton data={rowData} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 px-1 text-[9px] text-white/20 font-mono">
        <span>Content H — raw DOM scroll height</span>
        <span>Vis. H — content H × effectiveScale</span>
        <span>Body H — usable body height (no margins)</span>
        <span>Delta — content H − body H (positive = overflow)</span>
      </div>
    </div>
  )
}

// ─── Log hook ────────────────────────────────────────────────────────────────

function useLog(): readonly LogEvent[] {
  return useSyncExternalStore(subscribeLog, readLog, readLog)
}

// ─── Store tab — live Zustand state snapshot ──────────────────────────────────

function serializeStoreValue(v: unknown): string {
  if (v instanceof Set) {
    const arr = Array.from(v as Set<unknown>)
    return `Set(${arr.length}) [${arr.join(", ")}]`
  }
  if (typeof v === "function") return "(fn)"
  if (v === null) return "null"
  if (v === undefined) return "undefined"
  if (typeof v === "object") {
    try { return JSON.stringify(v) } catch { return "[circular]" }
  }
  return String(v)
}

function StoreSectionTable({
  title,
  entries,
  note,
  copyTarget,
  onCopyValue,
  onCopyAll,
  copyAllKey,
}: {
  title: string
  entries: Array<[string, string]>
  note?: string
  copyTarget: string | null
  onCopyValue: (text: string, key: string) => void
  onCopyAll: () => void
  copyAllKey: string
}) {
  return (
    <div className="border border-white/10 rounded overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/5">
        <span className="text-[10px] font-semibold text-white/60 font-mono">{title}</span>
        {note && <span className="text-[9px] text-white/25 italic ml-1">{note}</span>}
        <button
          onClick={onCopyAll}
          title="Copy as JSON"
          className="ml-auto p-0.5 rounded hover:bg-white/15 text-white/30 hover:text-white/70 transition-colors"
        >
          {copyTarget === copyAllKey
            ? <Check size={10} className="text-green-400" />
            : <Copy size={10} />
          }
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="px-3 py-2 text-[10px] text-white/25">No matching keys.</p>
      ) : (
        <table className="w-full text-[9.5px] font-mono leading-relaxed">
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="group border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors">
                <td className="px-3 py-1 text-white/45 whitespace-nowrap w-44 align-top">{k}</td>
                <td className="px-2 py-1 text-white/75 max-w-[340px] truncate" title={v}>{v}</td>
                <td className="px-1 py-1 text-right w-7">
                  <button
                    onClick={() => onCopyValue(v, k)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/15 text-white/30 hover:text-white/70 transition-all"
                  >
                    {copyTarget === k
                      ? <Check size={10} className="text-green-400" />
                      : <Copy size={10} />
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function StoreTab({ tick }: { tick: number }) {
  // tick is intentionally read to ensure this component re-renders on each tick
  void tick

  const [filter, setFilter]       = useState("")
  const [copyTarget, setCopyTarget] = useState<string | null>(null)

  const canvasSnap = useCanvasStore.getState()
  const courseSnap = useCourseStore.getState()

  const handleCopyValue = useCallback((text: string, key: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopyTarget(key)
      setTimeout(() => setCopyTarget(null), 1400)
    })
  }, [])

  const low = filter.toLowerCase()

  const canvasEntries = (Object.entries(canvasSnap) as Array<[string, unknown]>)
    .filter(([, v]) => typeof v !== "function")
    .filter(([k]) => !low || k.toLowerCase().includes(low))
    .map(([k, v]) => [k, serializeStoreValue(v)] as [string, string])

  const sessCount   = courseSnap.sessions.length
  const canvasCount = courseSnap.sessions.reduce((n, s) => n + s.canvases.length, 0)
  const topicCount  = courseSnap.sessions.reduce((n, s) => n + s.topics.length, 0)
  const cardCount   = courseSnap.sessions.reduce(
    (n, s) => n + s.topics.flatMap((t) => t.objectives).flatMap((o) => o.tasks).reduce((a, task) => a + task.droppedCards.length, 0),
    0,
  )
  const courseSummaryEntries: Array<[string, string]> = (
    [
      ["sessions",        String(sessCount)],
      ["totalCanvases",   String(canvasCount)],
      ["totalTopics",     String(topicCount)],
      ["totalCards",      String(cardCount)],
      ["activeSessionId", courseSnap.activeSessionId ?? "null"],
    ] as Array<[string, string]>
  ).filter(([k]) => !low || k.toLowerCase().includes(low))

  const handleCopyCanvasAll = useCallback(() => {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(canvasSnap) as Array<[string, unknown]>) {
      if (typeof v === "function") continue
      obj[k] = v instanceof Set ? Array.from(v) : v
    }
    void navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(() => {
      setCopyTarget("__canvas__")
      setTimeout(() => setCopyTarget(null), 1400)
    })
  }, [canvasSnap])

  const handleCopyCourseAll = useCallback(() => {
    const obj = Object.fromEntries(courseSummaryEntries)
    void navigator.clipboard.writeText(JSON.stringify(obj, null, 2)).then(() => {
      setCopyTarget("__course__")
      setTimeout(() => setCopyTarget(null), 1400)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSummaryEntries.map(([k, v]) => k + v).join(",")])

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      {/* Filter input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter keys..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-2 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/25"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <StoreSectionTable
        title="canvasStore"
        entries={canvasEntries}
        copyTarget={copyTarget}
        onCopyValue={handleCopyValue}
        onCopyAll={handleCopyCanvasAll}
        copyAllKey="__canvas__"
      />

      <StoreSectionTable
        title="courseStore"
        note="summary — session JSON is in the Data tab"
        entries={courseSummaryEntries}
        copyTarget={copyTarget}
        onCopyValue={handleCopyValue}
        onCopyAll={handleCopyCourseAll}
        copyAllKey="__course__"
      />

      <p className="text-[9px] text-white/20 text-center pb-1">
        Snapshot refreshes every 2 s — use the global refresh button for an immediate update.
      </p>
    </div>
  )
}

// ─── Log tab — circular event buffer ─────────────────────────────────────────

const LOG_LEVEL_COLOR: Record<LogLevel, string> = {
  info:  "text-sky-300/80",
  warn:  "text-amber-300",
  error: "text-red-400",
}

const LOG_LEVEL_BG: Record<LogLevel, string> = {
  info:  "bg-sky-500/15",
  warn:  "bg-amber-500/20",
  error: "bg-red-500/25",
}

const LOG_LEVEL_BORDER: Record<LogLevel, string> = {
  info:  "border-l-2 border-transparent",
  warn:  "border-l-2 border-amber-500/40",
  error: "border-l-2 border-red-500/50",
}

function LogTab({
  autoScroll,
  onAutoScrollChange,
}: {
  autoScroll: boolean
  onAutoScrollChange: (v: boolean) => void
}) {
  const events = useLog()
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(
    () => new Set<LogLevel>(["info", "warn", "error"]),
  )
  const [eventSearch, setEventSearch] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const { copied, copy } = useCopyToClipboard()

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }, [])

  const low = eventSearch.toLowerCase()
  const filtered = events.filter(
    (e) =>
      levelFilter.has(e.level) &&
      (!low ||
        e.event.toLowerCase().includes(low) ||
        (e.canvasId?.toLowerCase().includes(low) ?? false) ||
        (e.sessionId?.toLowerCase().includes(low) ?? false)),
  )

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length, autoScroll])

  const handleCopyAll = useCallback(() => {
    copy(JSON.stringify(Array.from(filtered), null, 2))
  }, [filtered, copy])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/8 shrink-0 flex-wrap">
        <span className="text-[10px] text-white/40 font-mono mr-1">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>

        {(["info", "warn", "error"] as LogLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={[
              "px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors",
              levelFilter.has(level)
                ? `${LOG_LEVEL_BG[level]} ${LOG_LEVEL_COLOR[level]}`
                : "bg-white/5 text-white/20 hover:text-white/40",
            ].join(" ")}
          >
            {level}
          </button>
        ))}

        <input
          type="text"
          placeholder="Search..."
          value={eventSearch}
          onChange={(e) => setEventSearch(e.target.value)}
          className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/25 w-28"
        />

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onAutoScrollChange(!autoScroll)}
            title={autoScroll ? "Disable auto-scroll to bottom" : "Enable auto-scroll to bottom"}
            className={[
              "p-1 rounded transition-colors",
              autoScroll
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/5 text-white/25 hover:text-white/60",
            ].join(" ")}
          >
            <Activity size={11} />
          </button>
          <button
            onClick={handleCopyAll}
            title="Copy filtered events as JSON"
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          >
            {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          </button>
          <button
            onClick={clearLog}
            title="Clear event log"
            className="p-1 rounded bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-center text-white/30 text-[11px] py-8">
            {events.length === 0
              ? "No events yet. Events are recorded as you interact with the canvas."
              : "No events match the current filters."}
          </p>
        ) : (
          filtered.map((event) => (
            <div
              key={event.id}
              className={[
                "flex items-baseline gap-2 px-2 py-1 rounded text-[9.5px] font-mono hover:bg-white/5 transition-colors",
                LOG_LEVEL_BORDER[event.level],
              ].join(" ")}
            >
              <span className="text-white/20 tabular-nums shrink-0 text-[9px]">{tsAgo(event.ts)}</span>
              <span
                className={[
                  "shrink-0 text-[8.5px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded",
                  LOG_LEVEL_BG[event.level],
                  LOG_LEVEL_COLOR[event.level],
                ].join(" ")}
              >
                {event.level}
              </span>
              <span className="text-white/70 shrink-0">{event.event}</span>
              {event.canvasId && (
                <span className="text-cyan-300/50 shrink-0" title={event.canvasId}>
                  {event.canvasId.slice(0, 8)}&hellip;
                </span>
              )}
              {event.data && (
                <span className="text-white/30 truncate" title={JSON.stringify(event.data)}>
                  {JSON.stringify(event.data)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Layout tab — flat virtual row list ──────────────────────────────────────

const LAYOUT_SESSION_LABEL_HEIGHT = 48  // mirrors CanvasVirtualizer
const LAYOUT_PAGE_GAP             = 32  // mirrors CanvasVirtualizer

interface LayoutRowInfo {
  index:        number
  kind:         "session-label" | "canvas"
  sessionOrder: number
  sessionTitle: string
  sessionId:    string
  canvasIndex?: number
  canvasId?:    string
  blockKeys?:   string[]
  height:       number
  start:        number
}

function buildLayoutRows(sessions: CourseSession[], scale: number): LayoutRowInfo[] {
  const dims      = DEFAULT_PAGE_DIMENSIONS
  const rowHeight = Math.round(dims.heightPx * scale + LAYOUT_PAGE_GAP * 2)
  const rows: LayoutRowInfo[] = []
  let offset = 0
  let idx    = 0

  for (const session of sessions) {
    rows.push({
      index:        idx++,
      kind:         "session-label",
      sessionOrder: session.order,
      sessionTitle: session.title || "(untitled)",
      sessionId:    session.id,
      height:       LAYOUT_SESSION_LABEL_HEIGHT,
      start:        offset,
    })
    offset += LAYOUT_SESSION_LABEL_HEIGHT

    for (let i = 0; i < session.canvases.length; i++) {
      const canvas = session.canvases[i]
      rows.push({
        index:        idx++,
        kind:         "canvas",
        sessionOrder: session.order,
        sessionTitle: session.title || "(untitled)",
        sessionId:    session.id,
        canvasIndex:  i + 1,
        canvasId:     canvas.id,
        blockKeys:    canvas.blockKeys,
        height:       rowHeight,
        start:        offset,
      })
      offset += rowHeight
    }
  }

  return rows
}

function LayoutTab({ sessions, zoomLevel }: { sessions: CourseSession[]; zoomLevel: number }) {
  const scale    = zoomLevel / 100
  const dims     = DEFAULT_PAGE_DIMENSIONS
  const rows     = buildLayoutRows(sessions, scale)
  const totalH   = rows.length > 0 ? rows[rows.length - 1].start + rows[rows.length - 1].height : 0
  const rowH     = Math.round(dims.heightPx * scale + LAYOUT_PAGE_GAP * 2)

  const { copied, copy } = useCopyToClipboard()
  const handleCopyAll = useCallback(() => {
    copy(JSON.stringify(rows.map((r) => ({
      index:   r.index,
      kind:    r.kind,
      session: r.sessionOrder,
      canvas:  r.canvasIndex ?? null,
      height:  r.height,
      start:   r.start,
      end:     r.start + r.height,
      blocks:  r.blockKeys ?? null,
    })), null, 2))
  }, [rows, copy])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-white/8 shrink-0 text-[10px] text-white/40 font-mono flex-wrap">
        <span><span className="text-white/60">{rows.length}</span> rows</span>
        <span>canvas h <span className="text-white/60">{Math.round(dims.heightPx * scale)}</span>px</span>
        <span>row h <span className="text-white/60">{rowH}</span>px</span>
        <span>total <span className="text-white/60">{totalH}</span>px</span>
        <span className="border-l border-white/10 pl-3 text-white/25">
          zoom {zoomLevel}% → {scale.toFixed(3)}&times;
        </span>
        <button
          onClick={handleCopyAll}
          title="Copy layout as JSON"
          className="ml-auto p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
        </button>
      </div>

      {/* Row table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {rows.length === 0 ? (
          <p className="text-center text-white/30 text-[11px] py-8">No sessions loaded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[9.5px] font-mono leading-relaxed">
              <thead className="sticky top-0 bg-neutral-950 z-10">
                <tr className="border-b border-white/10 text-white/30 uppercase text-[8.5px]">
                  <th className="px-3 py-1.5 text-left w-8">#</th>
                  <th className="px-2 py-1.5 text-left w-20">Kind</th>
                  <th className="px-2 py-1.5 text-left">Session</th>
                  <th className="px-2 py-1.5 text-right w-12">Page</th>
                  <th className="px-2 py-1.5 text-left">Blocks</th>
                  <th className="px-2 py-1.5 text-right w-16">Height</th>
                  <th className="px-2 py-1.5 text-right w-16">Offset</th>
                  <th className="px-2 py-1.5 text-right w-16">End</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.index}
                    className={[
                      "border-b border-white/5 last:border-b-0 transition-colors",
                      row.kind === "session-label"
                        ? "bg-white/3 hover:bg-white/6"
                        : "hover:bg-white/3",
                    ].join(" ")}
                  >
                    <td className="px-3 py-1 tabular-nums text-white/25">{row.index}</td>
                    <td className="px-2 py-1">
                      {row.kind === "session-label" ? (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-violet-500/20 text-violet-300 uppercase tracking-wider">
                          label
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-sky-500/15 text-sky-300 uppercase tracking-wider">
                          canvas
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-white/50 max-w-[140px] truncate">
                      S{row.sessionOrder} {row.sessionTitle}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-white/35">
                      {row.canvasIndex ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-white/40 max-w-[120px] truncate">
                      {row.blockKeys
                        ? row.blockKeys.join(", ")
                        : row.kind === "canvas" ? "all" : "—"
                      }
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-white/55">{row.height}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-white/35">{row.start}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-white/35">{row.start + row.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Blocks tab — blockKey cross-reference ────────────────────────────────────

interface BlockKeyEntry {
  key: string
  totalCanvases: number
  sessions: Array<{
    sessionId:    string
    sessionOrder: number
    sessionTitle: string
    canvasCount:  number
  }>
}

function buildBlockEntries(sessions: CourseSession[]): BlockKeyEntry[] {
  const blockMap = new Map<string, Map<string, { sessionOrder: number; sessionTitle: string; canvasCount: number }>>()

  for (const session of sessions) {
    for (const canvas of session.canvases) {
      if (!canvas.blockKeys || canvas.blockKeys.length === 0) continue
      for (const key of canvas.blockKeys) {
        if (!blockMap.has(key)) blockMap.set(key, new Map())
        const sessionMap = blockMap.get(key)!
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, {
            sessionOrder: session.order,
            sessionTitle: session.title || "(untitled)",
            canvasCount:  0,
          })
        }
        sessionMap.get(session.id)!.canvasCount++
      }
    }
  }

  return Array.from(blockMap.entries())
    .map(([key, sessionMap]) => ({
      key,
      totalCanvases: Array.from(sessionMap.values()).reduce((n, s) => n + s.canvasCount, 0),
      sessions: Array.from(sessionMap.entries())
        .map(([sessionId, info]) => ({
          sessionId,
          sessionOrder: info.sessionOrder,
          sessionTitle: info.sessionTitle,
          canvasCount:  info.canvasCount,
        }))
        .sort((a, b) => a.sessionOrder - b.sessionOrder),
    }))
    .sort((a, b) => b.totalCanvases - a.totalCanvases || a.key.localeCompare(b.key))
}

function BlocksTab({ sessions }: { sessions: CourseSession[] }) {
  const entries          = buildBlockEntries(sessions)
  const totalCanvases    = sessions.reduce((n, s) => n + s.canvases.length, 0)
  const renderAllCount   = sessions.reduce(
    (n, s) => n + s.canvases.filter((c) => !c.blockKeys || c.blockKeys.length === 0).length,
    0,
  )
  const canvasesWithKeys = totalCanvases - renderAllCount

  const { copied, copy } = useCopyToClipboard()
  const handleCopyAll = useCallback(() => {
    copy(JSON.stringify(entries, null, 2))
  }, [entries, copy])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-white/8 shrink-0 text-[10px] text-white/40 font-mono flex-wrap">
        <span><span className="text-white/60">{entries.length}</span> block key{entries.length !== 1 ? "s" : ""}</span>
        <span className="border-l border-white/10 pl-3">
          <span className="text-white/60">{canvasesWithKeys}</span> / {totalCanvases} canvas{totalCanvases !== 1 ? "es" : ""} explicit
        </span>
        {renderAllCount > 0 && (
          <span className="text-amber-300/60">
            {renderAllCount} render-all
          </span>
        )}
        <button
          onClick={handleCopyAll}
          title="Copy blocks data as JSON"
          className="ml-auto p-1 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {totalCanvases === 0 ? (
          <p className="text-center text-white/30 text-[11px] py-8">No canvases loaded.</p>
        ) : (
          <>
            {entries.length > 0 && (
              <div className="border border-white/10 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[9.5px] font-mono leading-relaxed">
                    <thead>
                      <tr className="border-b border-white/10 text-white/30 uppercase text-[8.5px]">
                        <th className="px-3 py-1.5 text-left">Block key</th>
                        <th className="px-2 py-1.5 text-right w-18">Canvases</th>
                        <th className="px-2 py-1.5 text-right w-16">Sessions</th>
                        <th className="px-2 py-1.5 text-left">Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr
                          key={entry.key}
                          className="group border-b border-white/5 last:border-b-0 hover:bg-white/4 transition-colors"
                        >
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-violet-300/80">{entry.key}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-white/70">
                            {entry.totalCanvases}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-white/50">
                            {entry.sessions.length}
                          </td>
                          <td className="px-2 py-1.5 text-white/40">
                            {entry.sessions.map((s) => (
                              <span
                                key={s.sessionId}
                                className="mr-2 whitespace-nowrap"
                                title={`Session ${s.sessionOrder}: ${s.sessionTitle}`}
                              >
                                S{s.sessionOrder}
                                {s.canvasCount > 1 && (
                                  <span className="text-cyan-300/60">&times;{s.canvasCount}</span>
                                )}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {renderAllCount > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 border border-white/10 rounded text-[10px]">
                <AlertTriangle size={11} className="shrink-0 text-amber-300/60 mt-px" />
                <span className="text-white/40">
                  <span className="text-amber-300/80 font-semibold">{renderAllCount}</span>{" "}
                  canvas{renderAllCount !== 1 ? "es have" : " has"} no <code className="text-white/60">blockKeys</code> set
                  {entries.length === 0
                    ? " — all canvases render all blocks by default."
                    : " — they render all blocks by default."}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type PanelTab = "templates" | "data" | "perspective" | "measurements" | "store" | "log" | "layout" | "blocks"

const LS = {
  activeTab:            "cdp:activeTab",
  panelExpanded:        "cdp:panelExpanded",
  templatesExpandedIds: "cdp:tplExpanded",
  dataExpandedIds:      "cdp:dataExpanded",
  logAutoScroll:        "cdp:logAutoScroll",
  storeFilter:          "cdp:storeFilter",
} as const

export function CanvasDebugPanel() {
  const [open, setOpen]       = useState(false)
  const [tick, setTick]       = useState(0)

  // — Persisted UI settings ———————————————————————————————————————
  const [activeTab, setActiveTab]     = useLocalStorage<PanelTab>(LS.activeTab, "templates")
  const [panelExpanded, setPanelExpanded] = useLocalStorage<boolean>(LS.panelExpanded, false)
  // Stored as string[] for JSON-serialisability; converted to Set on use
  const [tplExpandedArr, setTplExpandedArr] = useLocalStorage<string[]>(LS.templatesExpandedIds, [])
  const [dataExpandedArr, setDataExpandedArr] = useLocalStorage<string[]>(LS.dataExpandedIds, [])
  const [logAutoScroll, setLogAutoScroll] = useLocalStorage<boolean>(LS.logAutoScroll, true)

  const measurements = useMeasurements()
  const { copied: allCopied, copy: copyAll } = useCopyToClipboard()
  const { copied: summaryCopied, copy: copySummary } = useCopyToClipboard()
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [lastSeedCount, setLastSeedCount] = useState(0)
  const [lastHeavySeedCount, setLastHeavySeedCount] = useState(0)
  const [lastClearedSyntheticCount, setLastClearedSyntheticCount] = useState(0)

  const sessions          = useCourseStore((s) => s.sessions)
  const clearSessionCards = useCourseStore((s) => s.clearSessionCards)
  const addDroppedCard    = useCourseStore((s) => s.addDroppedCard)
  const removeDroppedCard = useCourseStore((s) => s.removeDroppedCard)
  const zoomLevel         = useCanvasStore((s) => s.zoomLevel)
  const setZoom           = useCanvasStore((s) => s.setZoom)
  const stepZoom          = useCanvasStore((s) => s.stepZoom)
  const panOffset         = useCanvasStore((s) => s.panOffset)
  const overflowIds       = useCanvasStore((s) => s.overflowingCanvasIds)
  const fitScale          = useCanvasStore((s) => s.fitScale)
  const setDebugMountAllCanvases = useCanvasStore((s) => s.setDebugMountAllCanvases)

  // Auto-expand sessions that have never been seen before (new session appears, add to expanded list)
  const sessionIds = sessions.map((s) => s.id)
  useEffect(() => {
    setTplExpandedArr((prev) => {
      const prevSet = new Set(prev)
      const added = sessionIds.filter((id) => !prevSet.has(id))
      return added.length > 0 ? [...prev, ...added] : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIds.join(",")])

  // Derived Sets
  const tplExpandedSet  = new Set(tplExpandedArr)
  const dataExpandedSet = new Set(dataExpandedArr)

  // Templates tab toggle
  const toggleTplSession = useCallback((id: string) => {
    setTplExpandedArr((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return Array.from(s)
    })
  }, [setTplExpandedArr])

  const expandAllTpl   = useCallback(() => setTplExpandedArr(sessions.map((s) => s.id)), [sessions, setTplExpandedArr])
  const collapseAllTpl = useCallback(() => setTplExpandedArr([]),                       [setTplExpandedArr])

  // Data tab toggle
  const toggleDataSession = useCallback((id: string) => {
    setDataExpandedArr((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return Array.from(s)
    })
  }, [setDataExpandedArr])

  const expandAllData   = useCallback(() => setDataExpandedArr(sessions.map((s) => s.id)), [sessions, setDataExpandedArr])
  const collapseAllData = useCallback(() => setDataExpandedArr([]),                        [setDataExpandedArr])

  const dims           = DEFAULT_PAGE_DIMENSIONS
  const bodyH          = bodyHeightPx(dims)
  const effectiveScale = fitScale > 0 ? fitScale * (zoomLevel / 100) : zoomLevel / 100

  // Live refresh every 2 s so "X ago" timestamps update
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [open, tick])

  // While the panel is open, mount all virtualized rows so measurement data can
  // be populated for every canvas before export.
  useEffect(() => {
    if (!open) return
    setDebugMountAllCanvases(true)
    return () => setDebugMountAllCanvases(false)
  }, [open, setDebugMountAllCanvases])

  const handleClear = useCallback(() => clearMeasurements(), [])

  const totalCanvases = sessions.reduce((s, sess) => s + sess.canvases.length, 0)

  const handleCopyAll = useCallback(async () => {
    // If not all canvases have been measured yet, give ResizeObserver one tick
    // after forcing full mount to populate the debug registry.
    if (countCurrentMeasurements(sessions, measurements) < totalCanvases) {
      setDebugMountAllCanvases(true)
      await new Promise((resolve) => setTimeout(resolve, 450))
    }

    const latestMeasurements = readMeasurements()
    const { current: currentMeasurements, stale: staleMeasurements } = partitionMeasurements(sessions, latestMeasurements)
    const canvasSnap = useCanvasStore.getState()
    const courseSnap = useCourseStore.getState()

    const templatesData = sessions.map((session) => ({
      sessionId:    session.id,
      sessionOrder: session.order,
      sessionTitle: session.title,
      canvases: session.canvases.map((canvas, idx) => {
        const m = currentMeasurements.get(canvas.id)
        const totalTopics = session.topics.length
        const totalObjectives = session.topics.reduce((sum, t) => sum + t.objectives.length, 0)
        const totalTasks = session.topics
          .flatMap((t) => t.objectives)
          .reduce((sum, o) => sum + o.tasks.length, 0)
        const totalCardsInSession = session.topics
          .flatMap((t) => t.objectives)
          .flatMap((o) => o.tasks)
          .reduce((sum, task) => sum + task.droppedCards.length, 0)

        const topicRangeResolved = normalizeRange(canvas.contentTopicRange, totalTopics)
        const objectiveRangeResolved = normalizeRange(canvas.contentObjectiveRange, totalObjectives)
        const taskRangeResolved = normalizeRange(canvas.contentTaskRange, totalTasks)
        const cardRangeResolved = normalizeRange(canvas.contentCardRange, totalCardsInSession)

        return {
          index:      idx + 1,
          id:         canvas.id,
          contentH:   m?.contentH ?? null,
          bodyH:      m?.bodyH ?? bodyH,
          overflow:   m?.overflow ?? false,
          splitGuard: m?.splitGuard ?? false,
          blockKeys:  canvas.blockKeys ?? [],
          ranges: {
            topic: {
              raw: canvas.contentTopicRange ?? null,
              resolved: topicRangeResolved,
            },
            objective: {
              raw: canvas.contentObjectiveRange ?? null,
              resolved: objectiveRangeResolved,
            },
            task: {
              raw: canvas.contentTaskRange ?? null,
              resolved: taskRangeResolved,
            },
            card: {
              raw: canvas.contentCardRange ?? null,
              resolved: cardRangeResolved,
            },
          },
          measuredAt: m ? tsAgo(m.timestamp) : null,
        }
      }),
    }))

    const perspectiveData = {
      zoomLevel,
      fitScale,
      effectiveScale,
      panOffset,
      pageDimensions: {
        widthPx:  dims.widthPx,
        heightPx: dims.heightPx,
        bodyH,
        margins:  dims.margins,
      },
    }

    const measurementsData = Array.from(currentMeasurements.entries()).map(([id, m]) => ({ id, ...m }))
    const staleMeasurementsData = staleMeasurements.map(([id, m]) => ({ id, ...m }))

    const canvasStoreData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(canvasSnap) as Array<[string, unknown]>) {
      if (typeof v !== "function") {
        canvasStoreData[k] = v instanceof Set ? Array.from(v as Set<unknown>) : v
      }
    }
    const courseStoreSummary = {
      sessions:       courseSnap.sessions.length,
      totalCanvases:  courseSnap.sessions.reduce((n, s) => n + s.canvases.length, 0),
      totalTopics:    courseSnap.sessions.reduce((n, s) => n + s.topics.length, 0),
      totalCards:     courseSnap.sessions.reduce(
        (n, s) => n + s.topics.flatMap((t) => t.objectives).flatMap((o) => o.tasks).reduce((a, task) => a + task.droppedCards.length, 0),
        0,
      ),
      activeSessionId: courseSnap.activeSessionId,
    }

    const logData = Array.from(readLog())

    const layoutData = buildLayoutRows(sessions, zoomLevel / 100).map((r) => ({
      index:  r.index,
      kind:   r.kind,
      session: r.sessionOrder,
      canvas: r.canvasIndex ?? null,
      height: r.height,
      start:  r.start,
      end:    r.start + r.height,
      blocks: r.blockKeys ?? null,
    }))

    const blocksData = buildBlockEntries(sessions)

    copyAll(JSON.stringify({
      capturedAt:   new Date().toISOString(),
      templates:    templatesData,
      data:         sessions,
      perspective:  perspectiveData,
      measurements: measurementsData,
      staleMeasurements: staleMeasurementsData,
      store:        { canvas: canvasStoreData, course: courseStoreSummary },
      log:          logData,
      layout:       layoutData,
      blocks:       blocksData,
      measurementCoverage: {
        measuredCanvases: measurementsData.length,
        totalCanvases,
        missingCanvases: Math.max(0, totalCanvases - measurementsData.length),
        staleMeasurements: staleMeasurementsData.length,
        measurementStoreSize: latestMeasurements.size,
      },
    }, null, 2))
  }, [
    sessions,
    measurements,
    bodyH,
    zoomLevel,
    fitScale,
    effectiveScale,
    panOffset,
    dims,
    copyAll,
    totalCanvases,
    setDebugMountAllCanvases,
  ])

  const handleClearAllCards = useCallback(() => {
    if (!clearAllConfirm) {
      setClearAllConfirm(true)
      setTimeout(() => setClearAllConfirm(false), 3000)
      return
    }
    sessions.forEach((s) => clearSessionCards(s.id))
    setClearAllConfirm(false)
  }, [clearAllConfirm, sessions, clearSessionCards])

  const handleSeedCards = useCallback(() => {
    let inserted = 0
    let globalOrder = Date.now()

    for (const session of sessions) {
      const totalTasks = session.topics
        .flatMap((topic) => topic.objectives)
        .reduce((sum, objective) => sum + objective.tasks.length, 0)

      let taskIdx = 0
      for (const topic of session.topics) {
        for (const objective of topic.objectives) {
          for (const task of objective.tasks) {
            if (task.droppedCards.length > 0) {
              taskIdx += 1
              continue
            }

            const targetCanvasId = findCanvasForTaskIndex(session, taskIdx, totalTasks)
            const targetCanvas = session.canvases.find((c) => c.id === targetCanvasId)
            const blockKey = pickDebugBlockKey(targetCanvas?.blockKeys)

            addDroppedCard(
              session.id,
              task.id,
              {
                id: crypto.randomUUID() as DroppedCardId,
                cardId: (`debug-card-${session.id}-${task.id}`) as CardId,
                cardType: "text",
                taskId: task.id,
                areaKind: "instruction",
                blockKey,
                position: { x: 0, y: 0 },
                dimensions: { width: 320, height: 120 },
                content: {
                  title: `Debug seed card S${session.order}`,
                  body: `Synthetic debug content for task ${task.id}`,
                },
                order: globalOrder++,
              },
              targetCanvasId,
            )
            inserted += 1
            taskIdx += 1
          }
        }
      }
    }

    setLastSeedCount(inserted)
    setTimeout(() => setLastSeedCount(0), 3000)
  }, [sessions, addDroppedCard])

  const handleSeedHeavyCards = useCallback(() => {
    const cardsPerTask = 4
    let inserted = 0
    let globalOrder = Date.now()

    for (const session of sessions) {
      const totalTasks = session.topics
        .flatMap((topic) => topic.objectives)
        .reduce((sum, objective) => sum + objective.tasks.length, 0)

      let taskIdx = 0
      for (const topic of session.topics) {
        for (const objective of topic.objectives) {
          for (const task of objective.tasks) {
            const targetCanvasId = findCanvasForTaskIndex(session, taskIdx, totalTasks)
            const targetCanvas = session.canvases.find((c) => c.id === targetCanvasId)
            const blockKey = pickDebugBlockKey(targetCanvas?.blockKeys)

            for (let i = 0; i < cardsPerTask; i += 1) {
              addDroppedCard(
                session.id,
                task.id,
                {
                  id: crypto.randomUUID() as DroppedCardId,
                  cardId: (`debug-heavy-card-${session.id}-${task.id}-${i}`) as CardId,
                  cardType: "text",
                  taskId: task.id,
                  areaKind: "instruction",
                  blockKey,
                  position: { x: 0, y: 0 },
                  dimensions: { width: 380, height: 220 },
                  content: {
                    title: `Heavy debug card ${i + 1}/${cardsPerTask}`,
                    body: `Overflow stress content for session ${session.order}, task ${task.id}.`,
                    paragraph:
                      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
                      "Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada.",
                  },
                  order: globalOrder++,
                },
                targetCanvasId,
              )
              inserted += 1
            }

            taskIdx += 1
          }
        }
      }
    }

    setLastHeavySeedCount(inserted)
    setTimeout(() => setLastHeavySeedCount(0), 3000)
  }, [sessions, addDroppedCard])

  const handleCopySummary = useCallback(() => {
    const latestMeasurements = readMeasurements()
    const summary = buildDebugSummary(sessions, latestMeasurements)
    copySummary(JSON.stringify(summary, null, 2))
  }, [sessions, copySummary])

  const handleClearSyntheticCards = useCallback(() => {
    let removed = 0

    for (const session of sessions) {
      for (const topic of session.topics) {
        for (const objective of topic.objectives) {
          for (const task of objective.tasks) {
            for (const card of task.droppedCards) {
              const cardIdValue = String(card.cardId)
              const isSynthetic =
                cardIdValue.startsWith("debug-card-") ||
                cardIdValue.startsWith("debug-heavy-card-")
              if (!isSynthetic) continue
              removeDroppedCard(session.id, task.id, card.id)
              removed += 1
            }
          }
        }
      }
    }

    setLastClearedSyntheticCount(removed)
    setTimeout(() => setLastClearedSyntheticCount(0), 3000)
  }, [sessions, removeDroppedCard])

  const overflowCount = overflowIds.size
  const totalCards    = sessions.reduce(
    (sum, s) =>
      sum +
      s.topics
        .flatMap((t) => t.objectives)
        .flatMap((o) => o.tasks)
        .reduce((n, task) => n + task.droppedCards.length, 0),
    0,
  )
  const syntheticCardCount = sessions.reduce(
    (sum, session) =>
      sum +
      session.topics
        .flatMap((topic) => topic.objectives)
        .flatMap((objective) => objective.tasks)
        .reduce(
          (taskSum, task) =>
            taskSum +
            task.droppedCards.filter((card) => {
              const cardIdValue = String(card.cardId)
              return (
                cardIdValue.startsWith("debug-card-") ||
                cardIdValue.startsWith("debug-heavy-card-")
              )
            }).length,
          0,
        ),
    0,
  )
  const canSeedHeavy = syntheticCardCount === 0

  const TAB_BTN = (tab: PanelTab, label: string, icon: React.ReactNode): React.ReactElement => (
    <button
      onClick={() => setActiveTab(tab)}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap",
        activeTab === tab
          ? "border-white/60 text-white/80"
          : "border-transparent text-white/35 hover:text-white/60",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Canvas Debug Panel"
        aria-label="Toggle canvas debug panel"
        className={[
          "fixed bottom-4 right-4 z-[9999]",
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "text-[11px] font-semibold tabular-nums select-none",
          "shadow-lg backdrop-blur border transition-all",
          overflowCount > 0
            ? "bg-red-950/90 border-red-500/60 text-red-300 hover:bg-red-900/90"
            : "bg-neutral-900/90 border-white/10 text-white/60 hover:text-white hover:bg-neutral-800/90",
        ].join(" ")}
      >
        <Bug size={13} />
        <span>canvas</span>
        {overflowCount > 0 && (
          <span className="bg-red-500 text-white rounded-full text-[9px] font-bold px-1.5 py-px ml-0.5">
            {overflowCount}
          </span>
        )}
      </button>

      {/* Overlay panel */}
      {open && (
        <div
          className={[
            "fixed z-[9998]",
            panelExpanded
              ? "inset-4 bottom-14"
              : "bottom-14 right-4 w-[760px] max-h-[76vh]",
            "flex flex-col",
            "rounded-xl border border-white/10 shadow-2xl",
            "bg-neutral-950/97 backdrop-blur-sm",
            "text-white overflow-hidden",
            "transition-all duration-200",
          ].join(" ")}
        >
          {/* Panel header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 shrink-0">
            <Bug size={14} className="text-white/50 shrink-0" />
            <span className="text-[12px] font-semibold text-white/80">Canvas Debug</span>

            {/* Summary chips */}
            <span className="text-[10px] text-white/40">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} · {totalCanvases} canvas{totalCanvases !== 1 ? "es" : ""}
              {totalCards > 0 && ` · ${totalCards} blocks`}
            </span>

            {/* Zoom chip — always visible in header */}
            <span className={[
              "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full",
              zoomLevel < 100 ? "bg-sky-500/15 text-sky-300"
              : zoomLevel > 100 ? "bg-amber-500/15 text-amber-300"
              : "bg-emerald-500/15 text-emerald-300",
            ].join(" ")}>
              {zoomLevel}% · {effectiveScale.toFixed(3)}×
            </span>

            {overflowCount > 0 && (
              <span className="text-[10px] font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                <AlertTriangle size={9} className="inline mr-1" />
                {overflowCount} overflowing
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              {/* Clear all blocks */}
              {totalCards > 0 && (
                <button
                  onClick={handleClearAllCards}
                  title={clearAllConfirm ? "Click again to confirm clear all blocks" : "Clear all blocks from all sessions"}
                  className={[
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                    clearAllConfirm
                      ? "bg-red-500/30 text-red-300 border border-red-500/50"
                      : "bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300",
                  ].join(" ")}
                >
                  <Trash2 size={11} />
                  {clearAllConfirm ? "Confirm?" : "Clear all"}
                </button>
              )}

              <button
                onClick={handleSeedCards}
                title="Add one synthetic debug block to each empty task"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              >
                <Database size={11} />
                {lastSeedCount > 0 ? `Seeded ${lastSeedCount}` : "Seed blocks"}
              </button>

              <button
                onClick={handleSeedHeavyCards}
                disabled={!canSeedHeavy}
                title={
                  canSeedHeavy
                    ? "Add multiple large synthetic blocks per task to trigger overflow"
                    : "Clear synthetic blocks before running heavy seeding again"
                }
                className={[
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  canSeedHeavy
                    ? "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80"
                    : "bg-white/5 text-white/20 cursor-not-allowed",
                ].join(" ")}
              >
                <AlertTriangle size={11} />
                {lastHeavySeedCount > 0
                  ? `Heavy +${lastHeavySeedCount}`
                  : canSeedHeavy
                  ? "Seed heavy"
                  : `Seed heavy (${syntheticCardCount})`}
              </button>

              <button
                onClick={handleClearSyntheticCards}
                title="Remove only debug-seeded blocks"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 transition-colors"
              >
                <Trash2 size={11} />
                {lastClearedSyntheticCount > 0 ? `Cleared ${lastClearedSyntheticCount}` : "Clear synthetic"}
              </button>

              <button
                onClick={handleCopySummary}
                title="Copy compact debug summary as JSON"
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              >
                {summaryCopied ? <Check size={11} className="text-green-400" /> : <BarChart2 size={11} />}
                Summary
              </button>

              {/* Copy all tabs as JSON */}
              <button
                onClick={handleCopyAll}
                title="Copy all debug data (templates, data, perspective, measurements, store, log, layout, blocks) as JSON"
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              >
                {allCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>

              <button
                onClick={handleClear}
                title="Clear measurements"
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              >
                <Trash2 size={12} />
              </button>
              <button
                onClick={() => setTick((t) => t + 1)}
                title="Refresh"
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              >
                <RefreshCw size={12} />
              </button>

              {/* Expand / collapse panel */}
              <button
                onClick={() => setPanelExpanded((v) => !v)}
                title={panelExpanded ? "Collapse panel" : "Expand panel to full screen"}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              >
                {panelExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex border-b border-white/10 shrink-0 px-2 overflow-x-auto">
            {TAB_BTN("templates",    "Templates",    <BarChart2 size={11} />)}
            {TAB_BTN("data",         "Data",         <Database size={11} />)}
            {TAB_BTN("perspective",  "Perspective",  <Ruler size={11} />)}
            {TAB_BTN("measurements", "Measurements", <Activity size={11} />)}
            {TAB_BTN("store",        "Store",        <Server size={11} />)}
            {TAB_BTN("log",          "Log",          <ScrollText size={11} />)}
            {TAB_BTN("layout",       "Layout",       <LayoutList size={11} />)}
            {TAB_BTN("blocks",       "Blocks",       <Package size={11} />)}
          </div>

          {/* Dimension status bar — templates tab only */}
          {activeTab === "templates" && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-2 bg-white/3 border-b border-white/8 shrink-0 text-[10px] text-white/50 font-mono">
              <span>page <span className="text-white/70">{dims.widthPx} × {dims.heightPx}px</span></span>
              <span>margins <span className="text-white/70">T{dims.margins.top} R{dims.margins.right} B{dims.margins.bottom} L{dims.margins.left}</span></span>
              <span>body <span className={[
                "font-semibold",
                overflowCount > 0 ? "text-red-300" : "text-emerald-300"
              ].join(" ")}>{bodyH}px</span></span>
              <span className="border-l border-white/10 pl-4">zoom <span className={zoomLevel < 100 ? "text-sky-300" : zoomLevel > 100 ? "text-amber-300" : "text-white/70"}>{zoomLevel}%</span></span>
              <span>fit <span className="text-white/70">{fitScale > 0 ? fitScale.toFixed(3) : "—"}</span></span>
              <span>scale <span className="text-amber-300/80">{effectiveScale.toFixed(3)}×</span></span>
              <span>vis. <span className="text-white/70">{Math.round(dims.widthPx * effectiveScale)} × {Math.round(dims.heightPx * effectiveScale)}px</span></span>
              <span>vis.body <span className={[
                "font-semibold",
                overflowCount > 0 ? "text-red-300/70" : "text-emerald-300/70"
              ].join(" ")}>{Math.round(bodyH * effectiveScale)}px</span></span>
            </div>
          )}

          {/* Tab content */}
          {activeTab === "templates" && (
            <>
              {/* Collapse / expand all toolbar */}
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/8 shrink-0 bg-white/2">
                <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={expandAllTpl}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ChevronDown size={10} /> Expand all
                  </button>
                  <button
                    onClick={collapseAllTpl}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ChevronRight size={10} /> Collapse all
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {sessions.length === 0 ? (
                  <p className="text-center text-white/30 text-[11px] py-8">No sessions loaded.</p>
                ) : (
                  sessions.map((session) => (
                    <SessionSection
                      key={session.id}
                      session={session}
                      measurements={measurements}
                      bodyH={bodyH}
                      effectiveScale={effectiveScale}
                      isExpanded={tplExpandedSet.has(session.id)}
                      onToggle={() => toggleTplSession(session.id)}
                    />
                  ))
                )}
              </div>
              <div className="flex items-center gap-4 px-4 py-2 border-t border-white/8 shrink-0 text-[9px] text-white/25 font-mono">
                <span>T[n-m] = topic range</span>
                <span>O[n-m] = objective range</span>
                <span>K[n-m] = task range</span>
                <span>C[n-m] = block range</span>
                <span className="ml-auto">Click a row to focus that canvas</span>
              </div>
            </>
          )}

          {activeTab === "data" && (
            <SessionDataTab
              sessions={sessions}
              expandedIds={dataExpandedSet}
              onToggle={toggleDataSession}
              onExpandAll={expandAllData}
              onCollapseAll={collapseAllData}
            />
          )}

          {activeTab === "perspective" && (
            <PerspectiveTab
              zoomLevel={zoomLevel}
              fitScale={fitScale}
              effectiveScale={effectiveScale}
              panOffset={panOffset}
              setZoom={setZoom}
              stepZoom={stepZoom}
            />
          )}

          {activeTab === "measurements" && (
            <MeasurementsTab
              measurements={measurements}
              effectiveScale={effectiveScale}
              onClear={handleClear}
            />
          )}

          {activeTab === "store" && (
            <StoreTab tick={tick} />
          )}

          {activeTab === "log" && (
            <LogTab
              autoScroll={logAutoScroll}
              onAutoScrollChange={setLogAutoScroll}
            />
          )}

          {activeTab === "layout" && (
            <LayoutTab sessions={sessions} zoomLevel={zoomLevel} />
          )}

          {activeTab === "blocks" && (
            <BlocksTab sessions={sessions} />
          )}
        </div>
      )}
    </>
  )
}
