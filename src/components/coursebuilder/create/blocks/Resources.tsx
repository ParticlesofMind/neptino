"use client"

import type { BlockRenderProps, Topic } from "../types"
import { useCourseStore } from "../store/courseStore"

const TD = "px-2.5 py-1.5 align-top text-[10px] leading-snug text-foreground/80"
const TASK_TD = `${TD} font-normal text-foreground`
const TH = "bg-muted/20 px-2.5 py-1.5 text-left text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75"
const EMPTY_TOPICS: Topic[] = []

function rowClass(index: number): string {
  return [
    "border-b border-border/70 last:border-b-0",
    index % 2 === 0 ? "bg-background" : "bg-muted/[0.12]",
  ].join(" ")
}

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
  const rows = topics.flatMap((topic) =>
    topic.objectives.flatMap((obj) =>
      obj.tasks.map((task) => ({
        label:   task.label || "Untitled task",
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
    <section className="overflow-hidden rounded-lg border border-border/80 bg-background">
      <div className="border-b border-border/70 bg-muted/20 px-2.5 py-1">
        <h2 className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Resources</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/70">
              {showTask    && <th className={TH}>Task</th>}
              {showType    && <th className={TH}>Type</th>}
              {showOrigin  && <th className={TH}>Origin</th>}
              {showState   && <th className={TH}>State</th>}
              {showQuality && <th className={TH}>Quality</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr className="border-b border-border/70 last:border-b-0">
                <td colSpan={visibleColCount} className="px-2.5 py-2 text-[10px] italic text-muted-foreground">
                  No tasks defined yet.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, i) => (
                <tr key={i} data-task-row-idx={rowStart + i} className={rowClass(i)}>
                  {showTask    && <td className={TASK_TD}>{row.label}</td>}
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
