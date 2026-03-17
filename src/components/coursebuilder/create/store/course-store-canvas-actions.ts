import { normalizeCanvasCardRanges } from "./cardRangeUtils"
import { mapSession } from "./course-store-helpers"
import type { CourseState, CourseStoreSet } from "./course-store-types"
import { fullPageBlockKeys } from "../layout/layoutEngine"
import type { BlockKey, CanvasId, CanvasPage } from "../types"

export function createCanvasActions(set: CourseStoreSet): Pick<
  CourseState,
  | "appendCanvasPage"
  | "setCanvasTopicRange"
  | "setCanvasObjectiveRange"
  | "setCanvasTaskRange"
  | "setCanvasCardRange"
  | "setCanvasMeasuredHeight"
  | "syncPageAssignments"
> {
  const mapCanvases = (
    canvasId: CanvasId,
    fn: (canvas: CanvasPage) => CanvasPage,
  ) =>
    set((state) => ({
      sessions: state.sessions.map((session) => ({
        ...session,
        canvases: session.canvases.map((canvas) => (canvas.id === canvasId ? fn(canvas) : canvas)),
      })),
    }))

  return {
    appendCanvasPage: (sessionId, contentTopicStart, options) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => {
          const nextPage = session.canvases.length + 1
          const newCanvas: CanvasPage = {
            id: crypto.randomUUID() as CanvasId,
            sessionId,
            pageNumber: nextPage,
            ...(options?.blockKeys !== undefined ? { blockKeys: options.blockKeys } : {}),
            ...(contentTopicStart !== undefined
              ? {
                  contentTopicRange: {
                    start: contentTopicStart,
                    ...(options?.topicEnd !== undefined ? { end: options.topicEnd } : {}),
                  },
                }
              : {}),
            ...(options?.objectiveStart !== undefined
              ? {
                  contentObjectiveRange: {
                    start: options.objectiveStart,
                    ...(options?.objectiveEnd !== undefined ? { end: options.objectiveEnd } : {}),
                  },
                }
              : {}),
            ...(options?.taskStart !== undefined
              ? {
                  contentTaskRange: {
                    start: options.taskStart,
                    ...(options?.taskEnd !== undefined ? { end: options.taskEnd } : {}),
                  },
                }
              : {}),
            ...(options?.cardStart !== undefined
              ? {
                  contentCardRange: {
                    start: options.cardStart,
                    ...(options?.cardEnd !== undefined ? { end: options.cardEnd } : {}),
                  },
                }
              : {}),
          }

          return { ...session, canvases: [...session.canvases, newCanvas] }
        }),
      })),

    setCanvasTopicRange: (canvasId, range) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, contentTopicRange: range })),

    setCanvasObjectiveRange: (canvasId, range) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, contentObjectiveRange: range })),

    setCanvasTaskRange: (canvasId, range) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, contentTaskRange: range })),

    setCanvasCardRange: (canvasId, range) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, contentCardRange: range })),

    setCanvasMeasuredHeight: (canvasId, heightPx) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, measuredContentHeightPx: heightPx })),

    syncPageAssignments: (sessionId, assignments) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => {
          const next = assignments.map((assignment, index) => {
            const existingId = session.canvases[index]?.id ?? (crypto.randomUUID() as CanvasId)
            const page: CanvasPage = {
              id: existingId,
              sessionId,
              pageNumber: index + 1,
              blockKeys: fullPageBlockKeys(assignment, session),
              ...(assignment.topicRange ? { contentTopicRange: assignment.topicRange } : {}),
              ...(assignment.objectiveRange ? { contentObjectiveRange: assignment.objectiveRange } : {}),
              ...(assignment.taskRange ? { contentTaskRange: assignment.taskRange } : {}),
              ...(assignment.cardRange ? { contentCardRange: assignment.cardRange } : {}),
            }
            return page
          })

          return {
            ...session,
            canvases: normalizeCanvasCardRanges(next, session.topics.flatMap((topic) => topic.objectives).flatMap((objective) => objective.tasks).reduce((sum, task) => sum + task.droppedCards.length, 0)),
          }
        }),
      })),
  }
}