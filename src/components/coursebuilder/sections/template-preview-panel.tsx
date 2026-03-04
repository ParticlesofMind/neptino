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
  if (on(fieldState, "header", "course_name"))   parts.push("Course name")
  if (on(fieldState, "header", "institution"))   parts.push("Institution")
  if (on(fieldState, "header", "teacher_name"))  parts.push("Teacher name")
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

function PreviewProgram({ fieldState }: { fieldState: TemplateFieldState }) {
  const showTopic  = on(fieldState, "program", "topic")
  const showObj    = on(fieldState, "program", "objective")
  const showTask   = on(fieldState, "program", "task")
  const showMethod = on(fieldState, "program", "program_method")
  const showSocial = on(fieldState, "program", "program_social_form")
  const showTime   = on(fieldState, "program", "program_time")

  const rows = [
    { topic: "Topic 1", obj: "Objective 1", task: "Task 1", method: "Guided instruction", social: "Class / Group", time: "55 min", bg: "bg-white" },
    { topic: "Topic 2", obj: "Objective 2", task: "Task 2", method: "Practice",           social: "Pairs",         time: "30 min", bg: "bg-neutral-50/40" },
  ]

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
            {rows.map((row) => (
              <tr key={row.topic} className={row.bg}>
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

function PreviewResources({ fieldState }: { fieldState: TemplateFieldState }) {
  const showTask    = on(fieldState, "resources", "task")
  const showType    = on(fieldState, "resources", "type")
  const showOrigin  = on(fieldState, "resources", "origin")
  const showState   = on(fieldState, "resources", "state")
  const showQuality = on(fieldState, "resources", "quality")

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
            <tr>
              {showTask    && <td className={TD}>1.1.1 Topic 1: Objective 1 — Task 1</td>}
              {showType    && <td className={TD}>Online</td>}
              {showOrigin  && <td className={TD}>Course</td>}
              {showState   && <td className={TD}>Ready</td>}
              {showQuality && <td className={TD}>Aligned</td>}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Content / Assignment block ───────────────────────────────────────────────

function PreviewTaskBlock({
  label,
  fieldState,
  block,
}: {
  label: string
  fieldState: TemplateFieldState
  block: BlockId
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
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
          <p className="text-[11px] font-semibold text-neutral-700 mb-1">Topic</p>
          <div className="rounded-md border border-neutral-200 bg-white p-2">
            <p className="text-[10px] text-neutral-500 mb-1">Objective</p>
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
              <p className="text-[10px] text-neutral-500 mb-1">Task</p>
              <div className="flex flex-col gap-1.5">
                {showInstruction && (
                  <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-2 text-[10px] text-neutral-400">
                    Instruction
                  </div>
                )}
                {showPractice && (
                  <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-2 text-[10px] text-neutral-400">
                    Practice
                  </div>
                )}
                {showFeedback && (
                  <div className="rounded border border-dashed border-neutral-300 bg-white px-2 py-2 text-[10px] text-neutral-400">
                    Feedback
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PreviewFooter({ fieldState }: { fieldState: TemplateFieldState }) {
  // Primary left label: prefer course_name if enabled, fall back to session_title
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

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <PreviewHeader fieldState={fieldState} />

      <div className="space-y-3 bg-neutral-50/70 p-3">
        {showProgram    && <PreviewProgram   fieldState={fieldState} />}
        {showResources  && <PreviewResources fieldState={fieldState} />}
        {showContent    && <PreviewTaskBlock label="Content"    fieldState={fieldState} block="content" />}
        {showAssignment && <PreviewTaskBlock label="Assignment" fieldState={fieldState} block="assignment" />}
      </div>

      <PreviewFooter fieldState={fieldState} />
    </div>
  )
}
