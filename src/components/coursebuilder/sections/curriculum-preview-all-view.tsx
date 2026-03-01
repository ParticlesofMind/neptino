"use client"

import type React from "react"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { CurriculumSessionRow } from "./curriculum-section-utils"
import type { ModulePreviewItem } from "./curriculum-derived"

interface PreviewAllViewProps {
  modulesForPreview: ModulePreviewItem[]
  lessonRowsForPreview: Array<CurriculumSessionRow & { id: string; session_number: number; title: string; template_type: TemplateType; topics: number; objectives: number; tasks: number; topic_names: string[]; objective_names: string[]; task_names: string[] }>
  topics: number
  objectives: number
  tasks: number
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
}

export function CurriculumPreviewAllView({ modulesForPreview, lessonRowsForPreview, topics, objectives, tasks, setSessionRows }: PreviewAllViewProps) {
  return (
    <div className="space-y-4">
      {modulesForPreview.map((module) => {
        const lessonsInModule = lessonRowsForPreview.slice(module.lessonStart - 1, module.lessonEnd)
        return (
          <div key={module.title} className="rounded-md border border-border bg-card p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">{module.title}</h2>
              <span className="text-xs text-muted-foreground">{lessonsInModule.length} lessons</span>
            </div>
            <div className="space-y-3">
              {lessonsInModule.map((row, lessonIdx) => {
                const lessonIndex = module.lessonStart - 1 + lessonIdx
                return (
                  <div key={row.id} className="rounded-md border border-border/50 bg-background p-2.5">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        setSessionRows((prev) =>
                          prev.map((cur, ci) => ci === lessonIndex ? { ...cur, title: e.target.value } : cur),
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
                              value={row.topic_names?.[topicIdx] || ""}
                              onChange={(e) => {
                                setSessionRows((prev) =>
                                  prev.map((cur, ci) =>
                                    ci === lessonIndex
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
                                    value={row.objective_names?.[objIdx] || ""}
                                    onChange={(e) => {
                                      setSessionRows((prev) =>
                                        prev.map((cur, ci) =>
                                          ci === lessonIndex
                                            ? { ...cur, objective_names: [...(cur.objective_names?.slice(0, objIdx) || []), e.target.value, ...(cur.objective_names?.slice(objIdx + 1) || [])] }
                                            : cur,
                                        ),
                                      )
                                    }}
                                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                  />
                                </div>
                                <div className="ml-1.5 space-y-1.5">
                                  {Array.from({ length: row.tasks ?? tasks }, (_, taskIdx) => (
                                    <div key={`${row.id}-task-${objIdx}-${taskIdx}`} className="flex items-center gap-2">
                                      <label className="min-w-fit text-[11px] text-muted-foreground">{taskIdx + 1}</label>
                                      <input
                                        type="text"
                                        value={row.task_names?.[taskIdx] || ""}
                                        onChange={(e) => {
                                          setSessionRows((prev) =>
                                            prev.map((cur, ci) =>
                                              ci === lessonIndex
                                                ? { ...cur, task_names: [...(cur.task_names?.slice(0, taskIdx) || []), e.target.value, ...(cur.task_names?.slice(taskIdx + 1) || [])] }
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
