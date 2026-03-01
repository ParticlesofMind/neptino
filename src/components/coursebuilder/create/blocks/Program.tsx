"use client"

import type { BlockRenderProps, SessionId } from "../types"
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

const TD = "px-2 py-1 border border-neutral-200 text-neutral-700 text-[11px] align-top"
const TH = "text-left px-2 py-1 text-[10px] font-medium text-neutral-500 border border-neutral-200 bg-neutral-50"

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgramBlock({ sessionId, fieldValues, data }: BlockRenderProps) {
  const topics = useCourseStore(
    (s) => s.sessions.find((sess) => sess.id === sessionId)?.topics ?? [],
  )

  // Session-level pedagogical defaults — can be overridden via fieldValues
  const defaultMethod     = fieldValues["method"]      ?? data?.["method"]      as string ?? "Guided instruction"
  const defaultSocialForm = fieldValues["social_form"] ?? data?.["socialForm"]  as string ?? "Class / Group"
  const defaultTime       = fieldValues["duration"]    ?? data?.["duration"]    as string ??
    (fieldValues["session_duration"] ? `${fieldValues["session_duration"]} min` : "55 min")

  // Build flat rows with rowspan markers
  const rows: ProgramTableRow[] = []

  topics.forEach((topic) => {
    const topicSpan = topic.objectives.reduce((sum, obj) => sum + Math.max(1, obj.tasks.length), 0)
    topic.objectives.forEach((obj, oi) => {
      const objSpan = Math.max(1, obj.tasks.length)
      const tasksToRender = obj.tasks.length > 0 ? obj.tasks : [{ id: `${obj.id}-empty`, label: "", order: 0, objectiveId: obj.id, droppedCards: [] }]
      tasksToRender.forEach((task, ki) => {
        rows.push({
          isTopicFirst:  oi === 0 && ki === 0,
          topicSpan,
          topicLabel:    topic.label,
          isObjFirst:    ki === 0,
          objSpan,
          objLabel:      obj.label,
          taskLabel:     task.label,
          method:        defaultMethod,
          socialForm:    defaultSocialForm,
          time:          defaultTime,
        })
      })
    })
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
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Program</h2>
      </div>
      <div className="overflow-x-auto bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH}>Topic</th>
            <th className={TH}>Objective</th>
            <th className={TH}>Task</th>
            <th className={TH}>Method</th>
            <th className={TH}>Social Form</th>
            <th className={TH}>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.isTopicFirst && (
                <td className={TD} rowSpan={row.topicSpan}>{row.topicLabel}</td>
              )}
              {row.isObjFirst && (
                <td className={TD} rowSpan={row.objSpan}>{row.objLabel}</td>
              )}
              <td className={TD}>{row.taskLabel}</td>
              {row.isTopicFirst && (
                <>
                  <td className={TD} rowSpan={row.topicSpan}>{row.method}</td>
                  <td className={TD} rowSpan={row.topicSpan}>{row.socialForm}</td>
                  <td className={TD} rowSpan={row.topicSpan}>{row.time}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  )
}
