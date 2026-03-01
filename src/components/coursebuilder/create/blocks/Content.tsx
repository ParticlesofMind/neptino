"use client"

import { useDroppable } from "@dnd-kit/core"
import type { BlockRenderProps, TaskAreaKind, SessionId, TaskId } from "../types"
import { useCourseStore } from "../store/courseStore"
import { CardRenderer } from "../cards/CardRenderer"

// ─── Task area drop zone ──────────────────────────────────────────────────────

interface TaskAreaProps {
  sessionId: SessionId
  taskId: TaskId
  areaKind: TaskAreaKind
  label: string
  children?: React.ReactNode
}

function TaskAreaDropZone({ sessionId, taskId, areaKind, label, children }: TaskAreaProps) {
  const dropId = `${sessionId}:${taskId}:${areaKind}`
  const { isOver, setNodeRef } = useDroppable({ id: dropId, data: { sessionId, taskId, areaKind } })

  return (
    <div className="space-y-0.5">
      {/* Phase label */}
      <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
        {label}
      </div>
      <div
        ref={setNodeRef}
        className={[
          "min-h-12 rounded border transition-colors",
          isOver
            ? "border-blue-400 bg-blue-50"
            : "border-dashed border-neutral-300 bg-neutral-50",
        ].join(" ")}
      >
        <div className="px-2 py-1.5 space-y-1">
          {children}
          {isOver && (
            <div className="h-8 rounded border-2 border-dashed border-blue-300 bg-blue-50/60 flex items-center justify-center">
              <span className="text-[9px] text-blue-400">Drop here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Content block ────────────────────────────────────────────────────────────

const AREA_LABELS: Record<TaskAreaKind, string> = {
  instruction: "Instruction",
  practice:    "Practice",
  feedback:    "Feedback",
}

// Default task ID used when a session has no topics yet (guarantees a live drop zone)
const DEFAULT_TASK_SUFFIX = "-default-task"

export function ContentBlock({ sessionId, data }: BlockRenderProps) {
  // Read the topic tree directly from the store — no bodyData threading needed
  const topics = useCourseStore(
    (s) => s.sessions.find((sess) => sess.id === sessionId)?.topics ?? [],
  )

  const visibleAreas: TaskAreaKind[] = (data?.["visibleAreas"] as TaskAreaKind[] | undefined) ?? [
    "instruction",
    "practice",
    "feedback",
  ]

  const hasContent = topics.length > 0 && topics.some((t) =>
    t.objectives.some((o) => o.tasks.length > 0),
  )

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Content</h2>
      </div>
      <div className="bg-white px-3 py-2 space-y-2">

        {/* Fallback row — always shown when no topics exist so there's always a live drop zone */}
        {!hasContent && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-neutral-400 italic">Drop content cards below</div>
            <div className="flex flex-col gap-2">
              {visibleAreas.map((kind) => (
                <TaskAreaDropZone
                  key={kind}
                  sessionId={sessionId}
                  taskId={`${sessionId}${DEFAULT_TASK_SUFFIX}` as TaskId}
                  areaKind={kind}
                  label={AREA_LABELS[kind]}
                />
              ))}
            </div>
          </div>
        )}

        {topics.map((topic) => (
          <div key={topic.id} className="rounded border border-neutral-200 bg-neutral-50 p-1.5">
            {/* Topic heading */}
            <p className="text-[11px] font-semibold text-neutral-700 mb-1.5">{topic.label}</p>

            <div className="space-y-1.5 border-l-2 border-neutral-200 pl-1.5">
              {topic.objectives.map((obj) => (
                <div key={obj.id} className="rounded border border-neutral-200 bg-white p-1.5">
                  {/* Objective heading */}
                  <p className="text-[10px] font-medium text-neutral-600 mb-1.5">{obj.label}</p>

                  <div className="space-y-1.5 border-l-2 border-neutral-200 pl-1.5">
                    {obj.tasks.map((task) => (
                      <div key={task.id} className="rounded border border-neutral-100 bg-neutral-50 p-1.5">
                        {/* Task heading */}
                        <p className="text-[10px] text-neutral-500 mb-1.5">{task.label}</p>

                        {/* Phase areas — stacked vertically; each one grows as cards are dropped in */}
                        <div className="flex flex-col gap-2">
                          {visibleAreas.map((kind) => (
                            <TaskAreaDropZone
                              key={kind}
                              sessionId={sessionId}
                              taskId={task.id}
                              areaKind={kind}
                              label={AREA_LABELS[kind]}
                            >
                              {task.droppedCards
                                .filter((c) => c.areaKind === kind)
                                .sort((a, b) => a.order - b.order)
                                .map((card) => (
                                  <CardRenderer key={card.id} card={card} />
                                ))}
                            </TaskAreaDropZone>
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
    </section>
  )
}
