"use client"

import type { BlockRenderProps, SessionId, Topic } from "../types"
import { useCourseStore } from "../store/courseStore"

// ─── Row shape ────────────────────────────────────────────────────────────────

interface ProgramTableRow {
  isTopicFirst:  boolean
  topicSpan:     number
  topicLabel:    string
  isObjFirst:    boolean
  objSpan:       number
  objLabel:      string
  taskLabel:     string
  method:        string
  socialForm:    string
  time:          string
}

const TD = "px-2 py-1 text-[11px] text-foreground align-top"
const TH = "text-left px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-muted/30"
const EMPTY_TOPICS: Topic[] = []

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgramBlock({ sessionId, canvasId, fieldValues, data, fieldEnabled }: BlockRenderProps) {
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
  const fe = fieldEnabled?.program
  const showTopic       = fe ? (fe["topic"]               ?? true) : true
  const showObjective   = fe ? (fe["objective"]           ?? true) : true
  const showTask        = fe ? (fe["task"]                ?? true) : true
  const showMethod      = fe ? (fe["program_method"]      ?? true) : true
  const showSocialForm  = fe ? (fe["program_social_form"] ?? true) : true
  const showTime        = fe ? (fe["program_time"]        ?? true) : true

  // Session-level pedagogical defaults — can be overridden via fieldValues
  const defaultMethod     = fieldValues["method"]      ?? data?.["method"]      as string ?? "Guided instruction"
  const defaultSocialForm = fieldValues["social_form"] ?? data?.["socialForm"]  as string ?? "Class / Group"
  const defaultTime       = fieldValues["duration"]    ?? data?.["duration"]    as string ??
    (fieldValues["session_duration"] ? `${fieldValues["session_duration"]} min` : "55 min")

  // Build flat rows first; rowspans are recalculated after page slicing.
  const allRows: Array<ProgramTableRow & { topicKey: string; objectiveKey: string }> = []

  topics.forEach((topic) => {
    topic.objectives.forEach((obj) => {
      const objectiveKey = `${topic.id}:${obj.id}`
      const tasksToRender = obj.tasks.length > 0 ? obj.tasks : [{ id: `${obj.id}-empty`, label: "", order: 0, objectiveId: obj.id, droppedCards: [] }]
      tasksToRender.forEach((task) => {
        allRows.push({
          isTopicFirst: false,
          topicSpan: 1,
          topicLabel: topic.label,
          isObjFirst: false,
          objSpan: 1,
          objLabel: obj.label,
          taskLabel: task.label,
          method: defaultMethod,
          socialForm: defaultSocialForm,
          time: defaultTime,
          topicKey: topic.id,
          objectiveKey,
        })
      })
    })
  })

  const rowStart = taskRange?.start ?? 0
  const rowEnd = taskRange?.end ?? allRows.length
  const slicedRows = allRows.slice(rowStart, rowEnd)

  const topicSpans = new Map<string, number>()
  const objectiveSpans = new Map<string, number>()
  for (const row of slicedRows) {
    topicSpans.set(row.topicKey, (topicSpans.get(row.topicKey) ?? 0) + 1)
    objectiveSpans.set(row.objectiveKey, (objectiveSpans.get(row.objectiveKey) ?? 0) + 1)
  }

  const rows: ProgramTableRow[] = slicedRows.map((row, idx) => {
    const prev = idx > 0 ? slicedRows[idx - 1] : undefined
    const isTopicFirst = !prev || prev.topicKey !== row.topicKey
    const isObjFirst = !prev || prev.objectiveKey !== row.objectiveKey
    return {
      ...row,
      isTopicFirst,
      topicSpan: isTopicFirst ? (topicSpans.get(row.topicKey) ?? 1) : 1,
      isObjFirst,
      objSpan: isObjFirst ? (objectiveSpans.get(row.objectiveKey) ?? 1) : 1,
    }
  })

  // Fallback — always show at least one empty row so the table is visible
  if (rows.length === 0) {
    rows.push({
      isTopicFirst: true,  topicSpan: 1,  topicLabel: "",
      isObjFirst:   true,  objSpan:   1,  objLabel:   "",
      taskLabel: "", method: defaultMethod, socialForm: defaultSocialForm, time: defaultTime,
    })
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/30 px-2 py-1">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Program</h2>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            {showTopic      && <th className={TH}>Topic</th>}
            {showObjective  && <th className={TH}>Objective</th>}
            {showTask       && <th className={TH}>Task</th>}
            {showMethod     && <th className={TH}>Method</th>}
            {showSocialForm && <th className={TH}>Social Form</th>}
            {showTime       && <th className={TH}>Time</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} data-task-row-idx={rowStart + i} className={i % 2 === 0 ? "border-b border-border last:border-b-0" : "border-b border-border last:border-b-0 bg-muted/20"}>
              {showTopic     && row.isTopicFirst && (
                <td className={TD} rowSpan={row.topicSpan}>{row.topicLabel}</td>
              )}
              {showObjective && row.isObjFirst && (
                <td className={TD} rowSpan={row.objSpan}>{row.objLabel}</td>
              )}
              {showTask      && <td className={TD}>{row.taskLabel}</td>}
              {showMethod    && row.isTopicFirst && (
                <td className={TD} rowSpan={row.topicSpan}>{row.method}</td>
              )}
              {showSocialForm && row.isTopicFirst && (
                <td className={TD} rowSpan={row.topicSpan}>{row.socialForm}</td>
              )}
              {showTime      && row.isTopicFirst && (
                <td className={TD} rowSpan={row.topicSpan}>{row.time}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  )
}
