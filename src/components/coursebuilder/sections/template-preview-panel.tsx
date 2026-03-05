"use client"

import type { BlockId, TemplateFieldState } from "./template-fields"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TH = "text-left px-2 py-1 text-[10px] font-medium text-neutral-500 border border-neutral-200 bg-neutral-50"
const TD = "px-2 py-1 border border-neutral-200 text-neutral-700 text-[11px] align-top"

function on(fieldState: TemplateFieldState, block: BlockId, key: string): boolean {
  return Boolean(fieldState[block]?.[key])
}

// ─── Header ───────────────────────────────────────────────────────────────────

function PreviewHeader({ fieldState }: { fieldState: TemplateFieldState }) {
  const parts: string[] = ["Session title"]
  if (on(fieldState, "header", "course_name"))  parts.push("Course name")
  if (on(fieldState, "header", "institution"))  parts.push("Institution")
  if (on(fieldState, "header", "teacher_name")) parts.push("Teacher name")
  const showDate = on(fieldState, "header", "schedule_date")

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/60 px-4 py-2.5">
      <div className="min-w-0 text-[11px] font-medium text-neutral-700 truncate">
        {parts.join(" \u00b7 ")}
      </div>
      {showDate && (
        <div className="ml-3 shrink-0 text-[11px] text-neutral-500">Date</div>
      )}
    </header>
  )
}

// ─── Program block ────────────────────────────────────────────────────────────

const METHODS   = ["Guided instruction", "Practice", "Discussion", "Lab"]
const SOCIALS   = ["Class / Group", "Pairs", "Individual", "Teams"]
const DURATIONS = ["55 min", "30 min", "20 min", "45 min"]

function PreviewProgram({
  fieldState,
  topicCount,
  objectiveCount,
  taskCount,
}: {
  fieldState: TemplateFieldState
  topicCount: number
  objectiveCount: number
  taskCount: number
}) {
  const showTopic  = on(fieldState, "program", "topic")
  const showObj    = on(fieldState, "program", "objective")
  const showTask   = on(fieldState, "program", "task")
  const showMethod = on(fieldState, "program", "program_method")
  const showSocial = on(fieldState, "program", "program_social_form")
  const showTime   = on(fieldState, "program", "program_time")

  type ProgramRow = { topic: string; obj: string; task: string; method: string; social: string; time: string; bg: string }
  const rows: ProgramRow[] = []
  for (let t = 0; t < topicCount; t += 1) {
    for (let o = 0; o < objectiveCount; o += 1) {
      for (let k = 0; k < taskCount; k += 1) {
        const ri = rows.length
        rows.push({
          topic:  `Topic ${t + 1}`,
          obj:    `Objective ${o + 1}`,
          task:   `Task ${k + 1}`,
          method: METHODS[ri % METHODS.length],
          social: SOCIALS[ri % SOCIALS.length],
          time:   DURATIONS[ri % DURATIONS.length],
          bg:     ri % 2 === 0 ? "bg-white" : "bg-neutral-50/40",
        })
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Program</h2>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {showTopic  && <th className={TH}>Topic</th>}
              {showObj    && <th className={TH}>Objective</th>}
              {showTask   && <th className={TH}>Task</th>}
              {showMethod && <th className={TH}>Method</th>}
              {showSocial && <th className={TH}>Social Form</th>}
              {showTime   && <th className={TH}>Time</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className={row.bg}>
                {showTopic  && <td className={TD}>{row.topic}</td>}
                {showObj    && <td className={TD}>{row.obj}</td>}
                {showTask   && <td className={TD}>{row.task}</td>}
                {showMethod && <td className={TD}>{row.method}</td>}
                {showSocial && <td className={TD}>{row.social}</td>}
                {showTime   && <td className={TD}>{row.time}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Resources block ──────────────────────────────────────────────────────────

function PreviewResources({
  fieldState,
  taskCount,
}: {
  fieldState: TemplateFieldState
  taskCount: number
}) {
  const showTask    = on(fieldState, "resources", "task")
  const showType    = on(fieldState, "resources", "type")
  const showOrigin  = on(fieldState, "resources", "origin")
  const showState   = on(fieldState, "resources", "state")
  const showQuality = on(fieldState, "resources", "quality")

  const TYPES   = ["Online", "Printed", "Digital", "Physical"]
  const ORIGINS = ["Course", "External", "Library", "Teacher"]
  const STATES  = ["Ready", "Draft", "In Review", "Archived"]
  const QUALS   = ["Aligned", "Verified", "Pending", "Good"]

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
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
            {Array.from({ length: taskCount }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}>
                {showTask    && <td className={TD}>Task {i + 1}</td>}
                {showType    && <td className={TD}>{TYPES[i % TYPES.length]}</td>}
                {showOrigin  && <td className={TD}>{ORIGINS[i % ORIGINS.length]}</td>}
                {showState   && <td className={TD}>{STATES[i % STATES.length]}</td>}
                {showQuality && <td className={TD}>{QUALS[i % QUALS.length]}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Content / Assignment block ───────────────────────────────────────────────

/**
 * Renders topics → objectives → tasks with instruction / practice / feedback
 * sub-fields per task, mirroring the canvas layout exactly.
 */
function PreviewTaskBlock({
  label,
  fieldState,
  block,
  topicCount,
  objectiveCount,
  taskCount,
}: {
  label: string
  fieldState: TemplateFieldState
  block: BlockId
  topicCount: number
  objectiveCount: number
  taskCount: number
}) {
  const showInstruction = on(fieldState, block, "instruction")
  const showPractice    = on(fieldState, block, "practice")
  const showFeedback    = on(fieldState, block, "feedback")

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">{label}</h2>
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: topicCount }, (_, topicIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={topicIdx} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <p className="mb-1.5 text-[11px] font-semibold text-neutral-700">Topic {topicIdx + 1}</p>
            {Array.from({ length: objectiveCount }, (__, objIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={objIdx} className="mt-1.5 rounded-md border border-neutral-200 bg-white p-2">
                <p className="mb-1.5 text-[10px] text-neutral-500">Objective {objIdx + 1}</p>
                {Array.from({ length: taskCount }, (___, taskIdx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={taskIdx} className="mt-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2">
                    <p className="mb-1.5 text-[10px] font-medium text-neutral-500">Task {taskIdx + 1}</p>
                    <div className="flex flex-col gap-1.5">
                      {showInstruction && (
                        <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-1.5 text-[10px] text-neutral-400">
                          Instruction
                        </div>
                      )}
                      {showPractice && (
                        <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-1.5 text-[10px] text-neutral-400">
                          Practice
                        </div>
                      )}
                      {showFeedback && (
                        <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-1.5 text-[10px] text-neutral-400">
                          Feedback
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Scoring block ────────────────────────────────────────────────────────────

function PreviewScoring({
  fieldState,
  taskCount,
}: {
  fieldState: TemplateFieldState
  taskCount: number
}) {
  const showCriteria  = on(fieldState, "scoring", "criteria")
  const showPoints    = on(fieldState, "scoring", "points")
  const showWeight    = on(fieldState, "scoring", "weight")
  const showThreshold = on(fieldState, "scoring", "threshold")

  if (!showCriteria && !showPoints && !showWeight && !showThreshold) return null

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Scoring</h2>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {showCriteria  && <th className={TH}>Criteria</th>}
              {showPoints    && <th className={TH}>Points</th>}
              {showWeight    && <th className={TH}>Weight</th>}
              {showThreshold && <th className={TH}>Pass mark</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: taskCount }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50/40"}>
                {showCriteria  && <td className={TD}>Task {i + 1}</td>}
                {showPoints    && <td className={TD}>{(i + 1) * 5}</td>}
                {showWeight    && <td className={TD}>{Math.round(100 / Math.max(1, taskCount))}%</td>}
                {showThreshold && <td className={TD}>60%</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PreviewFooter({ fieldState }: { fieldState: TemplateFieldState }) {
  const title = on(fieldState, "footer", "course_name") ? "Course name" : "Session title"
  const parts: string[] = [title]
  if (on(fieldState, "footer", "module_name")) parts.push("Module name")
  const showPage = on(fieldState, "footer", "page_number")

  return (
    <footer className="flex h-10 items-center justify-between border-t border-neutral-200 bg-neutral-50/60 px-4">
      <div className="min-w-0 text-[11px] font-medium text-neutral-700 truncate">
        {parts.join(" \u00b7 ")}
      </div>
      {showPage && (
        <div className="ml-3 shrink-0 text-[11px] text-neutral-500">1</div>
      )}
    </footer>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function TemplatePreviewPanel({
  blocks,
  fieldState,
}: {
  blocks: BlockId[]
  fieldState: TemplateFieldState
}) {
  const showProgram    = blocks.includes("program")
  const showResources  = blocks.includes("resources")
  const showContent    = blocks.includes("content")
  const showAssignment = blocks.includes("assignment")
  const showScoring    = blocks.includes("scoring")

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <PreviewHeader fieldState={fieldState} />

      <div className="space-y-3 bg-neutral-50/70 p-3">
        {/* All counts are fixed at 1 — this is a structural mockup showing the
            template layout, not a reflection of the curriculum dimensions.
            The canvas (coursebuilder create) renders the correct number of areas
            based on the curriculum settings. */}
        {showProgram    && (
          <PreviewProgram
            fieldState={fieldState}
            topicCount={1}
            objectiveCount={1}
            taskCount={1}
          />
        )}
        {showResources  && <PreviewResources fieldState={fieldState} taskCount={1} />}
        {showContent    && (
          <PreviewTaskBlock
            label="Content"
            fieldState={fieldState}
            block="content"
            topicCount={1}
            objectiveCount={1}
            taskCount={1}
          />
        )}
        {showAssignment && (
          <PreviewTaskBlock
            label="Assignment"
            fieldState={fieldState}
            block="assignment"
            topicCount={1}
            objectiveCount={1}
            taskCount={1}
          />
        )}
        {showScoring    && <PreviewScoring fieldState={fieldState} taskCount={1} />}
      </div>

      <PreviewFooter fieldState={fieldState} />
    </div>
  )
}
