"use client"

import type React from "react"
import type { CurriculumSessionRow } from "./curriculum-section-utils"
import { objectiveNameIndex, taskNameIndex } from "./curriculum-section-utils"
import type { ModulePreviewItem } from "./curriculum-derived"

interface PreviewAllViewProps {
  modulesForPreview: ModulePreviewItem[]
  sessionRowsForPreview: Array<CurriculumSessionRow & { id: string; session_number: number; title: string; topics: number; objectives: number; tasks: number; topic_names: string[]; objective_names: string[]; task_names: string[] }>
  topics: number
  objectives: number
  tasks: number
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
}

export function CurriculumPreviewAllView({ modulesForPreview, sessionRowsForPreview, topics, objectives, tasks, setSessionRows }: PreviewAllViewProps) {
  const writeNameAt = (list: string[] | undefined, at: number, value: string) => {
    const next = Array.from({ length: Math.max(at + 1, list?.length ?? 0) }, (_, i) => list?.[i] ?? "")
    next[at] = value
    return next
  }

  return (
    <div className="space-y-4">
      {modulesForPreview.map((module) => {
        const sessionsInModule = sessionRowsForPreview.slice(module.sessionStart - 1, module.sessionEnd)
        return (
          <div key={`module-${module.index}`} className="rounded-md border border-border bg-card p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">{module.title}</h2>
              <span className="text-xs text-muted-foreground">{sessionsInModule.length} sessions</span>
            </div>
            <div className="space-y-3">
              {sessionsInModule.map((row, sessionIdx) => {
                const sessionIndex = module.sessionStart - 1 + sessionIdx
                return (
                  <div key={row.id} className="rounded-md border border-border/50 bg-background p-2.5">
                    <input
                      type="text"
                      data-testid={`curriculum-all-session-input-${sessionIndex}`}
                      value={row.title}
                      onChange={(e) =>
                        setSessionRows((prev) =>
                          prev.map((cur, ci) => ci === sessionIndex ? { ...cur, title: e.target.value } : cur),
                        )
                      }
                      className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                    <div className="space-y-2.5">
                      {Array.from({ length: row.topics ?? topics }, (_, topicIdx) => (
                        <div key={`${row.id}-t${topicIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                          <div className="mb-2 flex items-center gap-2">
                            <label className="min-w-fit text-xs font-semibold text-muted-foreground">{topicIdx + 1}</label>
                            <input
                              type="text"
                              data-testid={`curriculum-all-topic-input-${sessionIndex}-${topicIdx}`}
                              value={row.topic_names?.[topicIdx] || ""}
                              onChange={(e) => {
                                setSessionRows((prev) =>
                                  prev.map((cur, ci) =>
                                    ci === sessionIndex
                                      ? { ...cur, topic_names: [...(cur.topic_names?.slice(0, topicIdx) || []), e.target.value, ...(cur.topic_names?.slice(topicIdx + 1) || [])] }
                                      : cur,
                                  ),
                                )
                              }}
                              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            />
                          </div>
                          <div className="ml-1.5 space-y-2">
                            {Array.from({ length: row.objectives ?? objectives }, (_, objIdx) => (
                              <div key={`${row.id}-t${topicIdx}-o${objIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                                <div className="mb-2 flex items-center gap-2">
                                  <label className="min-w-fit text-xs font-medium text-muted-foreground">{objIdx + 1}</label>
                                  <input
                                    type="text"
                                    data-testid={`curriculum-all-objective-input-${sessionIndex}-${topicIdx}-${objIdx}`}
                                    value={row.objective_names?.[objectiveNameIndex(topicIdx, objIdx, row.objectives ?? objectives)] || ""}
                                    onChange={(e) => {
                                      const at = objectiveNameIndex(topicIdx, objIdx, row.objectives ?? objectives)
                                      setSessionRows((prev) =>
                                        prev.map((cur, ci) =>
                                          ci === sessionIndex
                                            ? { ...cur, objective_names: writeNameAt(cur.objective_names, at, e.target.value) }
                                            : cur,
                                        ),
                                      )
                                    }}
                                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                  />
                                </div>
                                <div className="ml-1.5 space-y-1.5">
                                  {Array.from({ length: row.tasks ?? tasks }, (_, taskIdx) => (
                                    <div key={`${row.id}-task-${topicIdx}-${objIdx}-${taskIdx}`} className="flex items-center gap-2">
                                      <label className="min-w-fit text-[11px] text-muted-foreground">{taskIdx + 1}</label>
                                      <input
                                        type="text"
                                        data-testid={`curriculum-all-task-input-${sessionIndex}-${topicIdx}-${objIdx}-${taskIdx}`}
                                        value={row.task_names?.[taskNameIndex(topicIdx, objIdx, taskIdx, row.objectives ?? objectives, row.tasks ?? tasks)] || ""}
                                        onChange={(e) => {
                                          const at = taskNameIndex(topicIdx, objIdx, taskIdx, row.objectives ?? objectives, row.tasks ?? tasks)
                                          setSessionRows((prev) =>
                                            prev.map((cur, ci) =>
                                              ci === sessionIndex
                                                ? { ...cur, task_names: writeNameAt(cur.task_names, at, e.target.value) }
                                                : cur,
                                            ),
                                          )
                                        }}
                                        className="flex-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
