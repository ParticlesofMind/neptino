"use client"

import { useDroppable } from "@dnd-kit/core"
import type { BlockRenderProps, CanvasId, TaskAreaKind, SessionId, TaskId } from "../types"
import { useCourseStore } from "../store/courseStore"
import { useCanvasStore } from "../store/canvasStore"
import type { DropTargetData } from "../hooks/useCardDrop"
import { TaskAreaDropZone } from "./content-task-area-drop-zone"
import {
  AREA_LABELS,
  DEFAULT_TASK_SUFFIX,
  findFirstVisibleTaskId,
  isBootstrappedTopic,
} from "./contentBlockUtils"

export function ContentBlock({ sessionId, canvasId, blockKey, data, fieldEnabled }: BlockRenderProps) {
  // Full topic list for this session (drives the visible slice below)
  const topics = useCourseStore(
    (s) => s.sessions.find((sess) => sess.id === sessionId)?.topics ?? [],
  )

  // Card removal action
  const removeDroppedCard = useCourseStore((s) => s.removeDroppedCard)

  // Whether a media drag is in progress — used to expand drop targets
  const mediaDragActive = useCanvasStore((s) => s.mediaDragActive)

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

  const contentTaskRange = useCourseStore(
    (s): { start: number; end?: number } | undefined => {
      if (!canvasId) return undefined
      const session = s.sessions.find((sess) => sess.id === sessionId)
      if (!session) return undefined
      const canvas = session.canvases.find((c) => (c.id as CanvasId) === canvasId)
      return canvas?.contentTaskRange
    },
  )

  const topicStart: number = contentTopicRange?.start ?? 0
  const topicEnd:   number = contentTopicRange?.end   ?? topics.length

  const objStart: number        = contentObjectiveRange?.start ?? 0
  const objEnd:   number | undefined = contentObjectiveRange?.end

  const taskStart: number       = contentTaskRange?.start ?? 0
  const taskEnd:   number | undefined = contentTaskRange?.end

  // Catch-all droppable for the entire content block.
  // Routes drops to the first visible task on this page slice.
  const catchAllTaskId = (
    findFirstVisibleTaskId(topics, topicStart, topicEnd, objStart, objEnd)
    ?? `${sessionId}${DEFAULT_TASK_SUFFIX}`
  ) as TaskId
  const catchAllDropData: DropTargetData = {
    sessionId,
    canvasId,
    taskId: catchAllTaskId,
    areaKind: "instruction",
    blockKey,
  }
  const { isOver: isCatchAllOver, setNodeRef: setCatchAllRef } = useDroppable({
    id: `${sessionId}:${blockKey ?? "content"}:catchall`,
    data: catchAllDropData,
  })

  const visibleTopics = topics.slice(topicStart, topicEnd)

  // Determine visible task-area phases from the active template's fieldEnabled config.
  // Falls back to showing all areas when no config is present.
  const resolvedBlockKey = blockKey ?? "content"
  const fe = fieldEnabled?.[resolvedBlockKey]
  const showInstruction = fe ? (fe["instruction"] ?? true) : true
  const showPractice    = fe ? (fe["practice"]    ?? true) : true
  const showFeedback    = fe ? (fe["feedback"]    ?? true) : true
  const visibleAreas: TaskAreaKind[] = [
    ...(showInstruction ? ["instruction" as TaskAreaKind] : []),
    ...(showPractice    ? ["practice"    as TaskAreaKind] : []),
    ...(showFeedback    ? ["feedback"    as TaskAreaKind] : []),
  ]

  const isContinuation = topicStart > 0 || objStart > 0 || taskStart > 0
  const noTopicsAtAll  = topics.length === 0

  function objectiveHasVisibleTask(tasksCount: number, flatTaskStart: number): boolean {
    if (tasksCount <= 0) {
      return taskStart <= flatTaskStart && (taskEnd === undefined || flatTaskStart < taskEnd)
    }
    for (let taskRelIdx = 0; taskRelIdx < tasksCount; taskRelIdx++) {
      const flatTaskIdx = flatTaskStart + taskRelIdx
      if (flatTaskIdx >= taskStart && (taskEnd === undefined || flatTaskIdx < taskEnd)) {
        return true
      }
    }
    return false
  }

  const hasVisibleSlice = noTopicsAtAll || visibleTopics.some((topic, relIdx) => {
    const absoluteIdx = topicStart + relIdx
    const objsBeforeThisTopic = topics
      .slice(0, absoluteIdx)
      .reduce((sum, t) => sum + t.objectives.length, 0)
    const tasksBeforeThisTopic = topics
      .slice(0, absoluteIdx)
      .reduce((sum, t) => sum + t.objectives.reduce((os, o) => os + o.tasks.length, 0), 0)

    return topic.objectives.some((obj, objRelIdx) => {
      const flatObjIdx = objsBeforeThisTopic + objRelIdx
      if (flatObjIdx < objStart) return false
      if (objEnd !== undefined && flatObjIdx >= objEnd) return false

      const tasksBeforeThisObj = tasksBeforeThisTopic
        + topic.objectives.slice(0, objRelIdx).reduce((s, o) => s + o.tasks.length, 0)
      return objectiveHasVisibleTask(obj.tasks.length, tasksBeforeThisObj)
    })
  })

  if (!hasVisibleSlice) return null

  return (
    <section
      ref={setCatchAllRef}
      className={[
        "relative",
        isContinuation ? "" : "overflow-hidden rounded-lg border border-border",
      ].join(" ")}
    >
      {/* Drag-active visual hint — shows the whole block as a drop target */}
      {mediaDragActive && (
        <div
          aria-hidden
          className={[
            "absolute inset-0 z-10 border-2 border-dashed pointer-events-none transition-colors",
            isContinuation ? "rounded-none" : "rounded-lg",
            isCatchAllOver
              ? "border-blue-400 bg-blue-50/40"
              : "border-blue-200",
          ].join(" ")}
        />
      )}

      {!isContinuation && (
        <div className="border-b border-border bg-muted/30 px-2 py-1 flex items-center gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground flex-1">
            {blockKey === "assignment" ? "Assignment" : "Content"}
          </h2>
        </div>
      )}

      <div className={["space-y-2", isContinuation ? "px-0 py-0" : "px-3 py-2"].join(" ")}>
        {/*
         * No topics defined yet: render the same structural scaffold that
         * appears once real topics exist — topic container → objective
         * container → task-area drop zones — so the nesting is visible
         * immediately.  Drop targets are live; the store bootstraps
         * a minimal topic → objective → task chain on first drop.
         */}
        {noTopicsAtAll && (
          <div className="rounded border border-border bg-muted/20 p-1.5">
            <div className="space-y-1.5">
              <div className="rounded border border-border bg-background p-1.5">
                <div className="flex flex-col gap-2">
                  {visibleAreas.map((kind) => (
                    <TaskAreaDropZone
                      key={kind}
                      sessionId={sessionId}
                      canvasId={canvasId}
                      taskId={`${sessionId}${DEFAULT_TASK_SUFFIX}` as TaskId}
                      areaKind={kind}
                      blockKey={blockKey}
                      label={AREA_LABELS[kind]}
                      onRemoveCard={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continuation slice is empty — the block header and "Continued" badge
            already communicate the state; no body content needed. */}

        {/* Render sliced topics */}
        {visibleTopics.map((topic, relIdx) => {
          const absoluteIdx = topicStart + relIdx
          const bootstrapped = isBootstrappedTopic(topic)

          // Flat objective index: count all objectives in topics before this one
          const objsBeforeThisTopic = topics
            .slice(0, absoluteIdx)
            .reduce((sum, t) => sum + t.objectives.length, 0)

          // Flat task index: count all tasks in topics before this one
          const tasksBeforeThisTopic = topics
            .slice(0, absoluteIdx)
            .reduce((sum, t) => sum + t.objectives.reduce((os, o) => os + o.tasks.length, 0), 0)

          // Skip this entire topic container if none of its objectives fall
          // within the current contentObjectiveRange (objective-level split).
          const hasVisibleObjective = topic.objectives.some((_, objRelIdx) => {
            const flatIdx = objsBeforeThisTopic + objRelIdx
            return flatIdx >= objStart && (objEnd === undefined || flatIdx < objEnd)
          })
          if (!hasVisibleObjective) return null

          // Suppress topic label when this topic started on a previous canvas
          // (i.e. its first objective was already shown earlier in the objective range).
          const isTopicContinuation = objsBeforeThisTopic < objStart

          return (
            <div
              key={topic.id}
              // Absolute topic index — queried by useCanvasOverflow for DOM-based split detection
              data-topic-idx={absoluteIdx}
              className="rounded border border-border bg-muted/20 p-1.5"
            >
              {/* Topic heading (hidden for bootstrapped/anonymous topics, or when this topic
                  is a mid-topic continuation from a prior canvas) */}
              {!bootstrapped && !isTopicContinuation && (
                <p className="text-[11px] font-semibold text-foreground mb-1.5">{topic.label}</p>
              )}

              <div
                className="space-y-1.5"
              >
                {topic.objectives.map((obj, objRelIdx) => {
                  const flatObjIdx = objsBeforeThisTopic + objRelIdx

                  // Objective-level range filter
                  if (flatObjIdx < objStart) return null
                  if (objEnd !== undefined && flatObjIdx >= objEnd) return null

                  // Flat task offset for this objective
                  const tasksBeforeThisObj = tasksBeforeThisTopic
                    + topic.objectives.slice(0, objRelIdx).reduce((s, o) => s + o.tasks.length, 0)

                  if (!objectiveHasVisibleTask(obj.tasks.length, tasksBeforeThisObj)) return null

                  // Suppress objective label when this objective started on a previous canvas
                  // (i.e. its first task was already shown earlier in the task range).
                  const isObjContinuation = tasksBeforeThisObj < taskStart

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
                          : "rounded border border-border bg-background p-1.5"
                      }
                    >
                      {!hideObjLabel && !isObjContinuation && (
                        <p className="text-[10px] font-medium text-foreground/70 mb-1.5">
                          {obj.label}
                        </p>
                      )}

                      <div
                        className="space-y-1.5"
                      >
                        {obj.tasks.map((task, taskRelIdx) => {
                          const flatTaskIdx = tasksBeforeThisObj + taskRelIdx

                          // Task-level range filter — used when a single large
                          // objective must be split across pages at task boundaries.
                          if (flatTaskIdx < taskStart) return null
                          if (taskEnd !== undefined && flatTaskIdx >= taskEnd) return null

                          const hideTaskLabel = hideObjLabel && task.label === ""
                          return (
                            <div
                              key={task.id}
                              className={
                                hideTaskLabel
                                  ? "flex flex-col gap-2"
                                  : "rounded border border-border/60 bg-muted/20 p-1.5"
                              }
                            >
                              {!hideTaskLabel && (
                                <p className="text-[10px] text-muted-foreground mb-1.5">
                                  {task.label}
                                </p>
                              )}

                              {/* Phase drop zones \u2014 each grows unboundedly as cards are added */}
                              <div className="flex flex-col gap-2">
                                {visibleAreas.map((kind) => {
                                  const cards = task.droppedCards
                                    .filter((c) => c.areaKind === kind && (!c.blockKey || c.blockKey === resolvedBlockKey))
                                    .sort((a, b) => a.order - b.order)
                                  return (
                                    <TaskAreaDropZone
                                      key={kind}
                                      sessionId={sessionId}
                                      canvasId={canvasId}
                                      taskId={task.id}
                                      areaKind={kind}
                                      blockKey={blockKey}
                                      label={AREA_LABELS[kind]}
                                      cards={cards}
                                      onRemoveCard={(cardId) =>
                                        removeDroppedCard(sessionId, task.id, cardId)
                                      }
                                    />
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
