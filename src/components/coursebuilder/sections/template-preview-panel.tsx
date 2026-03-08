"use client"

import type { BlockId, TemplateFieldState } from "./template-fields"

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Row-separator table styles — no grid lines, just horizontal rules
const TH = "text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground bg-muted/30"
const TD = "px-3 py-1.5 text-xs text-foreground align-top"
const TR_ODD  = "border-b border-border last:border-b-0"
const TR_EVEN = "border-b border-border last:border-b-0 bg-muted/20"

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
    <header className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
      <div className="min-w-0 text-[11px] font-medium text-foreground truncate">
        {parts.join(" \u00b7 ")}
      </div>
      {showDate && (
        <div className="ml-3 shrink-0 text-[11px] text-muted-foreground">Date</div>
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

  type ProgramRow = { topic: string; obj: string; task: string; method: string; social: string; time: string }
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
        })
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Program</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
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
              <tr key={i} className={i % 2 === 0 ? TR_ODD : TR_EVEN}>
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
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
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
            {Array.from({ length: taskCount }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className={i % 2 === 0 ? TR_ODD : TR_EVEN}>
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

// Subtle left-border accent colours to differentiate content slot types
const SLOT_ACCENTS = {
  instruction: "border-l-2 border-l-sky-400/60",
  practice:    "border-l-2 border-l-violet-400/60",
  feedback:    "border-l-2 border-l-emerald-400/60",
}

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
  const isSplit         = on(fieldState, block, "_split")
  const showInstruction = on(fieldState, block, "instruction")
  const showPractice    = on(fieldState, block, "practice")
  const showFeedback    = on(fieldState, block, "feedback")

  return (
    <section className="rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</h2>
      </div>
      <div className="p-3">
        {Array.from({ length: topicCount }, (_, topicIdx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={topicIdx}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/60">
              Topic {topicIdx + 1}
            </p>
            {Array.from({ length: objectiveCount }, (__, objIdx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={objIdx}>
                {Array.from({ length: taskCount }, (___, taskIdx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={taskIdx} className="mb-2">
                    <p className="mb-1.5 text-[10px] text-muted-foreground">
                      Obj. {objIdx + 1} &rsaquo; Task {taskIdx + 1}
                    </p>
                    <div className="flex flex-col gap-1">
                      {!isSplit ? (
                        <div className="rounded-r-sm border-y border-r border-border bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground/70">
                          Content
                        </div>
                      ) : (
                        <>
                          {showInstruction && (
                            <div className={`rounded-r-sm border-y border-r border-border bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground/70 ${SLOT_ACCENTS.instruction}`}>
                              Instruction
                            </div>
                          )}
                          {showPractice && (
                            <div className={`rounded-r-sm border-y border-r border-border bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground/70 ${SLOT_ACCENTS.practice}`}>
                              Practice
                            </div>
                          )}
                          {showFeedback && (
                            <div className={`rounded-r-sm border-y border-r border-border bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground/70 ${SLOT_ACCENTS.feedback}`}>
                              Feedback
                            </div>
                          )}
                        </>
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
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-muted/30 px-3 py-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Scoring</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {showCriteria  && <th className={TH}>Criteria</th>}
              {showPoints    && <th className={TH}>Points</th>}
              {showWeight    && <th className={TH}>Weight</th>}
              {showThreshold && <th className={TH}>Pass mark</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: taskCount }, (_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i} className={i % 2 === 0 ? TR_ODD : TR_EVEN}>
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
    <footer className="flex h-10 items-center justify-between border-t border-border bg-muted/20 px-4">
      <div className="min-w-0 text-[11px] font-medium text-foreground truncate">
        {parts.join(" \u00b7 ")}
      </div>
      {showPage && (
        <div className="ml-3 shrink-0 text-[11px] text-muted-foreground">1</div>
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
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <PreviewHeader fieldState={fieldState} />

      <div className="space-y-2.5 bg-muted/20 p-3">
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
