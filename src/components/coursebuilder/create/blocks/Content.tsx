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
  instruction: "Phase 1",
  student:     "Phase 2",
  teacher:     "Phase 3",
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
    "student",
    "teacher",
  ]

  const hasContent = topics.length > 0 && topics.some((t) =>
    t.objectives.some((o) => o.tasks.length > 0),
  )

  return (
    <section className="px-4 py-3 space-y-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Content
      </h2>

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
        <div key={topic.id} className="space-y-3">
          {/* Topic heading */}
          <div className="text-xs font-semibold text-neutral-700 border-b border-neutral-200 pb-1">
            {topic.label}
          </div>

          {topic.objectives.map((obj) => (
            <div key={obj.id} className="pl-3 space-y-2">
              {/* Objective heading */}
              <div className="text-[11px] font-medium text-neutral-600">
                {obj.label}
              </div>

              {obj.tasks.map((task) => (
                <div key={task.id} className="pl-3 space-y-1.5">
                  {/* Task heading */}
                  <div className="text-[10px] text-neutral-500">{task.label}</div>

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
          ))}
        </div>
      ))}
    </section>
  )
}
