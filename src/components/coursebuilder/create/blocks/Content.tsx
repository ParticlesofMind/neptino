"use client"

/**
 * Content Block
 *
 * Renders the topic \u2192 objective \u2192 task tree for a canvas page, with three
 * drag-and-drop task areas per task (instruction / practice / feedback).
 *
 * PAGINATION: each CanvasPage may render only a *slice* of the session\u2019s topic
 * list, controlled by `contentTopicRange` on the CanvasPage model.  The block
 * reads that range directly from the course store via canvasId and renders only
 * the relevant topics.
 *
 * Each topic container receives `data-topic-idx` (absolute 0-based index) so
 * that `useCanvasOverflow` can locate topic boundaries via DOM queries and
 * compute where to split the page.
 *
 * A "Continued" badge is shown on pages where topicStart > 0.
 */

import { useDroppable } from "@dnd-kit/core"
import type { BlockRenderProps, CanvasId, TaskAreaKind, SessionId, TaskId, Topic } from "../types"
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
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sessionId, taskId, areaKind },
  })

  const hasCards = !!children && (Array.isArray(children) ? children.length > 0 : true)

  return (
    <div className="space-y-0.5">
      {/* Phase label */}
      <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
        {label}
      </div>
      <div
        ref={setNodeRef}
        className={[
          "rounded border transition-colors",
          isOver
            ? "border-blue-400 bg-blue-50"
            : hasCards
              ? "border-neutral-200 bg-white"
              : "border-dashed border-neutral-300 bg-neutral-50",
        ].join(" ")}
      >
        <div className="px-2 py-1.5 space-y-1">
          {children}
          {isOver && (
            <div
              className={[
                "rounded border-2 border-dashed border-blue-300 bg-blue-50/60",
                "flex items-center justify-center",
                hasCards ? "h-6" : "h-8",
              ].join(" ")}
            >
              <span className="text-[9px] text-blue-400">
                {hasCards ? "Add here" : "Drop here"}
              </span>
            </div>
          )}
          {/* Always-visible empty state when no cards and not dragging over */}
          {!hasCards && !isOver && (
            <div className="h-6 flex items-center px-1">
              <span className="text-[9px] text-neutral-300 italic">Empty</span>
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

// Synthetic task ID suffix used by the no-topics placeholder drop zones.
const DEFAULT_TASK_SUFFIX = "-default-task"

/**
 * Returns true when the topic (and its children) was auto-bootstrapped from a
 * fresh drop \u2014 blank labels.  In this case the nesting chrome is hidden so the
 * layout stays clean when there\u2019s no real curriculum structure yet.
 */
function isBootstrappedTopic(topic: Topic): boolean {
  return (
    topic.label === "" &&
    topic.objectives.length === 1 &&
    (topic.objectives[0]?.label ?? "") === ""
  )
}

export function ContentBlock({ sessionId, canvasId, data, fieldEnabled }: BlockRenderProps) {
  // Full topic list for this session (drives the visible slice below)
  const topics = useCourseStore(
    (s) => s.sessions.find((sess) => sess.id === sessionId)?.topics ?? [],
  )

  // Card removal action
  const removeDroppedCard = useCourseStore((s) => s.removeDroppedCard)

  // Resolve this page\u2019s topic slice from the course store.
  // Falls back to "show all" when no range has been set (page not yet split).
  const contentTopicRange = useCourseStore(
    (s): { start: number; end?: number } | undefined => {
      if (!canvasId) return undefined
      const session = s.sessions.find((sess) => sess.id === sessionId)
      if (!session) return undefined
      const canvas = session.canvases.find((c) => (c.id as CanvasId) === canvasId)
      return canvas?.contentTopicRange
    },
  )

  const contentObjectiveRange = useCourseStore(
    (s): { start: number; end?: number } | undefined => {
      if (!canvasId) return undefined
      const session = s.sessions.find((sess) => sess.id === sessionId)
      if (!session) return undefined
      const canvas = session.canvases.find((c) => (c.id as CanvasId) === canvasId)
      return canvas?.contentObjectiveRange
    },
  )

  const topicStart: number = contentTopicRange?.start ?? 0
  const topicEnd:   number = contentTopicRange?.end   ?? topics.length

  const objStart: number        = contentObjectiveRange?.start ?? 0
  const objEnd:   number | undefined = contentObjectiveRange?.end

  const visibleTopics = topics.slice(topicStart, topicEnd)

  // Derive visible task-area phases from the template's fieldEnabled config.
  // Falls back to data.visibleAreas (legacy), then shows all three phases.
  const ALL_AREAS: TaskAreaKind[] = ["instruction", "practice", "feedback"]
  const visibleAreas: TaskAreaKind[] = (() => {
    const fe = fieldEnabled?.content
    if (fe) {
      const filtered = ALL_AREAS.filter((k) => fe[k] !== false)
      return filtered.length > 0 ? filtered : ALL_AREAS
    }
    return (data?.["visibleAreas"] as TaskAreaKind[] | undefined) ?? ALL_AREAS
  })()

  const isContinuation = topicStart > 0 || objStart > 0
  const noTopicsAtAll  = topics.length === 0

  return (
    <section className="rounded-lg border border-neutral-200">
      {/* Block header */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1 flex items-center gap-2">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400 flex-1">
          Content
        </h2>
        {isContinuation && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium leading-none">
            Continued
          </span>
        )}
      </div>

      <div className="bg-white px-3 py-2 space-y-2">
        {/*
         * Fallback: no topics at all.
         * Shows placeholder drop zones tied to a synthetic default-task ID.
         * When a card is dropped, the store automatically creates a minimal
         * topic \u2192 objective \u2192 task chain.
         */}
        {noTopicsAtAll && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-neutral-400 italic">
              Drop content cards into the areas below
            </div>
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

        {/* Continuation page with no topics in its slice */}
        {!noTopicsAtAll && visibleTopics.length === 0 && (
          <div className="text-[10px] text-neutral-400 italic">
            No further content for this session.
          </div>
        )}

        {/* Render sliced topics */}
        {visibleTopics.map((topic, relIdx) => {
          const absoluteIdx = topicStart + relIdx
          const bootstrapped = isBootstrappedTopic(topic)

          // Flat objective index: count all objectives in topics before this one
          const objsBeforeThisTopic = topics
            .slice(0, absoluteIdx)
            .reduce((sum, t) => sum + t.objectives.length, 0)

          // Skip this entire topic container if none of its objectives fall
          // within the current contentObjectiveRange (objective-level split).
          const hasVisibleObjective = topic.objectives.some((_, objRelIdx) => {
            const flatIdx = objsBeforeThisTopic + objRelIdx
            return flatIdx >= objStart && (objEnd === undefined || flatIdx < objEnd)
          })
          if (!hasVisibleObjective) return null

          return (
            <div
              key={topic.id}
              // Absolute topic index — queried by useCanvasOverflow for DOM-based split detection
              data-topic-idx={absoluteIdx}
              className="rounded border border-neutral-200 bg-neutral-50 p-1.5"
            >
              {/* Topic heading (hidden for bootstrapped/anonymous topics) */}
              {!bootstrapped && (
                <p className="text-[11px] font-semibold text-neutral-700 mb-1.5">{topic.label}</p>
              )}

              <div
                className={
                  bootstrapped
                    ? "space-y-1.5"
                    : "space-y-1.5 border-l-2 border-neutral-200 pl-1.5"
                }
              >
                {topic.objectives.map((obj, objRelIdx) => {
                  const flatObjIdx = objsBeforeThisTopic + objRelIdx

                  // Objective-level range filter — used when a single large topic
                  // must be split across pages at objective boundaries.
                  if (flatObjIdx < objStart) return null
                  if (objEnd !== undefined && flatObjIdx >= objEnd) return null

                  const hideObjLabel = bootstrapped && obj.label === ""
                  return (
                    <div
                      key={obj.id}
                      // Flat session objective index — queried by useCanvasOverflow
                      // for objective-level split detection (single-topic fallback).
                      data-objective-idx={flatObjIdx}
                      className={
                        hideObjLabel
                          ? "space-y-1.5"
                          : "rounded border border-neutral-200 bg-white p-1.5"
                      }
                    >
                      {!hideObjLabel && (
                        <p className="text-[10px] font-medium text-neutral-600 mb-1.5">
                          {obj.label}
                        </p>
                      )}

                      <div
                        className={
                          hideObjLabel
                            ? "space-y-1.5"
                            : "space-y-1.5 border-l-2 border-neutral-200 pl-1.5"
                        }
                      >
                        {obj.tasks.map((task) => {
                          const hideTaskLabel = hideObjLabel && task.label === ""
                          return (
                            <div
                              key={task.id}
                              className={
                                hideTaskLabel
                                  ? "flex flex-col gap-2"
                                  : "rounded border border-neutral-100 bg-neutral-50 p-1.5"
                              }
                            >
                              {!hideTaskLabel && (
                                <p className="text-[10px] text-neutral-500 mb-1.5">
                                  {task.label}
                                </p>
                              )}

                              {/* Phase drop zones \u2014 each grows unboundedly as cards are added */}
                              <div className="flex flex-col gap-2">
                                {visibleAreas.map((kind) => {
                                  const cards = task.droppedCards
                                    .filter((c) => c.areaKind === kind)
                                    .sort((a, b) => a.order - b.order)
                                  return (
                                    <TaskAreaDropZone
                                      key={kind}
                                      sessionId={sessionId}
                                      taskId={task.id}
                                      areaKind={kind}
                                      label={AREA_LABELS[kind]}
                                    >
                                      {cards.map((card) => (
                                        <CardRenderer
                                          key={card.id}
                                          card={card}
                                          onRemove={() =>
                                            removeDroppedCard(sessionId, task.id, card.id)
                                          }
                                        />
                                      ))}
                                    </TaskAreaDropZone>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
