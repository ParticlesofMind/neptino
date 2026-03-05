"use client"

import type React from "react"
import { SetupColumn } from "@/components/coursebuilder"
import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"
import { GENERATION_ACTION_CONFIG, type CurriculumSessionRow, type PreviewMode, type ScheduleGeneratedEntry } from "./curriculum-section-utils"
import type { ModulePreviewItem } from "./curriculum-derived"
import { CurriculumPreviewAllView } from "./curriculum-preview-all-view"

const MODE_BUTTONS: Array<{ key: PreviewMode; label: string }> = [
  { key: "modules", label: "Modules" },
  { key: "sessions", label: "Sessions" },
  { key: "topics", label: "Topics" },
  { key: "objectives", label: "Objectives" },
  { key: "tasks", label: "Tasks" },
  { key: "all", label: "All" },
]

export interface CurriculumPreviewPanelProps {
  previewMode: PreviewMode
  setPreviewMode: (v: PreviewMode) => void
  modulesForPreview: ModulePreviewItem[]
  sessionRowsForPreview: Array<CurriculumSessionRow & { id: string; session_number: number; title: string; topics: number; objectives: number; tasks: number; topic_names: string[]; objective_names: string[]; task_names: string[] }>
  scheduleEntries: ScheduleGeneratedEntry[]
  moduleNames: string[]
  setModuleNames: React.Dispatch<React.SetStateAction<string[]>>
  topics: number
  objectives: number
  tasks: number
  upsertSessionRow: (index: number, updates: Partial<CurriculumSessionRow>) => void
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
  lastAction: GenerationAction | null
  availableTemplateTypes: string[]
}

export function CurriculumPreviewPanel(props: CurriculumPreviewPanelProps) {
  return (
    <SetupColumn>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {MODE_BUTTONS.map((mode) => (
          <button key={mode.key} type="button" onClick={() => props.setPreviewMode(mode.key)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition ${
              props.previewMode === mode.key
                ? "border-primary/50 bg-accent/70 text-primary"
                : "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="max-h-[780px] min-h-[420px] overflow-y-auto rounded-xl border border-border bg-background p-2.5">
        {props.previewMode === "modules" && (
          <div className="space-y-3">
            {props.modulesForPreview.map((module) => {
              const sessions = props.sessionRowsForPreview.slice(module.sessionStart - 1, module.sessionEnd)
              return (
                <div key={module.title} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Module {module.index + 1}</span>
                    <span className="text-xs text-muted-foreground">{sessions.length} sessions</span>
                  </div>
                  <input type="text" value={module.title}
                    onChange={(e) => { props.setModuleNames((prev) => { const updated = [...prev]; updated[module.index] = e.target.value; return updated }) }}
                    className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder={`Module ${module.index + 1}`}
                  />
                  <div className="space-y-1.5 rounded-md border border-border/50 bg-background p-2">
                    {sessions.map((row, si) => (
                      <div key={row.id} className="border-l-2 border-primary/30 pl-2.5 py-1 text-sm text-muted-foreground">
                        <span className="font-semibold">S{module.sessionStart + si}:</span> {row.title || "Untitled"}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {props.previewMode === "sessions" && (
          <div className="space-y-2.5">
            {props.sessionRowsForPreview.map((row, index) => {
              const schedule = props.scheduleEntries[index]
              return (
                <div key={row.id} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex items-end justify-between gap-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Session {index + 1}{schedule && ` · ${schedule.day}`}
                    </label>
                    <select
                      value={row.template_type ?? "lesson"}
                      onChange={(e) => props.upsertSessionRow(index, { template_type: e.target.value })}
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      aria-label={`Template type for session ${index + 1}`}
                    >
                      {props.availableTemplateTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input type="text" value={row.title} onChange={(e) => props.upsertSessionRow(index, { title: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder={`Session ${index + 1}`} />
                </div>
              )
            })}
          </div>
        )}

        {props.previewMode === "topics" && (
          <div className="space-y-3">
            {props.sessionRowsForPreview.map((row, index) => (
              <div key={row.id} className="rounded-md border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">S{index + 1}: {row.title}</h4>
                  <span className="text-xs text-muted-foreground">{row.topics ?? props.topics} topics</span>
                </div>
                <div className="space-y-2.5">
                  {Array.from({ length: row.topics ?? props.topics }, (_, ti) => (
                    <div key={`${row.id}-t${ti}`} className="rounded-md border border-border/50 bg-background p-2">
                      <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{ti + 1}</label>
                      <input type="text" value={row.topic_names?.[ti] || ""}
                        onChange={(e) => { props.setSessionRows((prev) => prev.map((cur, ci) => ci === index ? { ...cur, topic_names: [...(cur.topic_names?.slice(0, ti) || []), e.target.value, ...(cur.topic_names?.slice(ti + 1) || [])] } : cur)) }}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {props.previewMode === "objectives" && (
          <div className="space-y-3">
            {props.sessionRowsForPreview.map((row, index) => (
              <div key={row.id} className="rounded-md border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">S{index + 1}: {row.title}</h4>
                  <span className="text-xs text-muted-foreground">{row.objectives ?? props.objectives} objectives</span>
                </div>
                <div className="space-y-3">
                  {Array.from({ length: row.topics ?? props.topics }, (_, ti) => (
                    <div key={`${row.id}-t${ti}`} className="rounded-md border border-border/50 bg-background p-2">
                      <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{ti + 1}</h5>
                      <div className="ml-1.5 space-y-2">
                        {Array.from({ length: row.objectives ?? props.objectives }, (_, oi) => (
                          <div key={`${row.id}-t${ti}-o${oi}`} className="rounded-md border border-border/50 bg-background p-2">
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{oi + 1}</label>
                            <input type="text" value={row.objective_names?.[oi] || ""}
                              onChange={(e) => { props.setSessionRows((prev) => prev.map((cur, ci) => ci === index ? { ...cur, objective_names: [...(cur.objective_names?.slice(0, oi) || []), e.target.value, ...(cur.objective_names?.slice(oi + 1) || [])] } : cur)) }}
                              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {props.previewMode === "tasks" && (
          <div className="space-y-3">
            {props.sessionRowsForPreview.map((row, index) => (
              <div key={row.id} className="rounded-md border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">S{index + 1}: {row.title}</h4>
                  <span className="text-xs text-muted-foreground">{row.tasks ?? props.tasks} tasks</span>
                </div>
                <div className="space-y-3">
                  {Array.from({ length: row.topics ?? props.topics }, (_, ti) => (
                    <div key={`${row.id}-t${ti}`} className="rounded-md border border-border/50 bg-background p-2">
                      <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{ti + 1}</h5>
                      <div className="ml-1.5 space-y-2.5">
                        {Array.from({ length: row.objectives ?? props.objectives }, (_, oi) => (
                          <div key={`${row.id}-t${ti}-o${oi}`} className="rounded-md border border-border/50 bg-background p-2">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">{oi + 1}</p>
                            <div className="ml-1.5 space-y-1.5">
                              {Array.from({ length: row.tasks ?? props.tasks }, (_, tki) => (
                                <div key={`${row.id}-task-${oi}-${tki}`} className="rounded-md border border-border/50 bg-background p-1.5">
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{tki + 1}</label>
                                  <input type="text" value={row.task_names?.[tki] || ""}
                                    onChange={(e) => { props.setSessionRows((prev) => prev.map((cur, ci) => ci === index ? { ...cur, task_names: [...(cur.task_names?.slice(0, tki) || []), e.target.value, ...(cur.task_names?.slice(tki + 1) || [])] } : cur)) }}
                                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {props.previewMode === "all" && (
          <CurriculumPreviewAllView
            modulesForPreview={props.modulesForPreview}
            sessionRowsForPreview={props.sessionRowsForPreview}
            topics={props.topics}
            objectives={props.objectives}
            tasks={props.tasks}
            setSessionRows={props.setSessionRows}
          />
        )}

        {props.lastAction && (
          <p className="pt-2 text-xs text-muted-foreground">
            Last action: {GENERATION_ACTION_CONFIG.find((a) => a.key === props.lastAction)?.label}
          </p>
        )}
      </div>
    </SetupColumn>
  )
}
