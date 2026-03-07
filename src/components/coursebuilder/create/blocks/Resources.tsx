"use client"

import type { BlockRenderProps, Topic } from "../types"
import { useCourseStore } from "../store/courseStore"

const TD = "px-2 py-1 text-[11px] text-foreground align-top"
const TH = "text-left px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-muted/30"
const EMPTY_TOPICS: Topic[] = []

export function ResourcesBlock({ sessionId, canvasId, fieldValues, fieldEnabled }: BlockRenderProps) {
  const topics = useCourseStore((s) => {
    const session = s.sessions.find((sess) => sess.id === sessionId)
    return session?.topics ?? EMPTY_TOPICS
  })

  const taskRange = useCourseStore((s) => {
    const session = s.sessions.find((sess) => sess.id === sessionId)
    const canvas = canvasId
      ? session?.canvases.find((c) => c.id === canvasId)
      : undefined
    return canvas?.contentTaskRange
  })

  // Column visibility — default true when no fieldEnabled config is present
  const fe = fieldEnabled?.resources
  const showTask    = fe ? (fe["task"]    ?? true) : true
  const showType    = fe ? (fe["type"]    ?? true) : true
  const showOrigin  = fe ? (fe["origin"]  ?? true) : true
  const showState   = fe ? (fe["state"]   ?? true) : true
  const showQuality = fe ? (fe["quality"] ?? true) : true

  const visibleColCount = [showTask, showType, showOrigin, showState, showQuality].filter(Boolean).length

  const origin = fieldValues["course_title"] ?? fieldValues["title"] ?? ""

  // Derive one resource row per task in the topic tree
  const rows = topics.flatMap((topic, ti) =>
    topic.objectives.flatMap((obj, oi) =>
      obj.tasks.map((task, ki) => ({
        label:   `${ti + 1}.${oi + 1}.${ki + 1} ${topic.label}: ${obj.label} \u2014 ${task.label}`,
        type:    "Online",
        origin,
        state:   "Ready",
        quality: "Curriculum-aligned",
      }))
    )
  )

  const rowStart = taskRange?.start ?? 0
  const rowEnd = taskRange?.end ?? rows.length
  const visibleRows = rows.slice(rowStart, rowEnd)

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/30 px-2 py-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Resources</h2>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {showTask    && <th className={TH}>Task</th>}
            {showType    && <th className={TH}>Type</th>}
            {showOrigin  && <th className={TH}>Origin</th>}
            {showState   && <th className={TH}>State</th>}
            {showQuality && <th className={TH}>Quality</th>}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr className="border-b border-border last:border-b-0">
              <td colSpan={visibleColCount} className="px-2 py-2 text-muted-foreground text-[11px] italic">
                No tasks defined yet.
              </td>
            </tr>
          ) : (
            visibleRows.map((row, i) => (
              <tr key={i} data-task-row-idx={rowStart + i} className={i % 2 === 0 ? "border-b border-border last:border-b-0" : "border-b border-border last:border-b-0 bg-muted/20"}>
                {showTask    && <td className={TD}>{row.label}</td>}
                {showType    && <td className={TD}>{row.type}</td>}
                {showOrigin  && <td className={TD}>{row.origin}</td>}
                {showState   && <td className={TD}>{row.state}</td>}
                {showQuality && <td className={TD}>{row.quality}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </section>
  )
}
