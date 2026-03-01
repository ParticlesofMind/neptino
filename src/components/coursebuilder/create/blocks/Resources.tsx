"use client"

import type { BlockRenderProps } from "../types"
import { useCourseStore } from "../store/courseStore"

const TD = "px-2 py-1 border border-neutral-200 text-neutral-700 text-[11px] align-top"
const TH = "text-left px-2 py-1 text-[10px] font-medium text-neutral-500 border border-neutral-200 bg-neutral-50"

export function ResourcesBlock({ sessionId, fieldValues, fieldEnabled }: BlockRenderProps) {
  const topics = useCourseStore(
    (s) => s.sessions.find((sess) => sess.id === sessionId)?.topics ?? [],
  )

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

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Resources</h2>
      </div>
      <div className="overflow-x-auto bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {showTask    && <th className={TH}>Task</th>}
            {showType    && <th className={TH}>Type</th>}
            {showOrigin  && <th className={TH}>Origin</th>}
            {showState   && <th className={TH}>State</th>}
            {showQuality && <th className={TH}>Quality</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={visibleColCount} className="px-2 py-2 border border-neutral-200 text-neutral-400 text-[11px] italic">
                No tasks defined yet.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
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
