import { normalizeCanvasCardRanges } from "./cardRangeUtils"
import { mapSession } from "./course-store-helpers"
import type { CourseState, CourseStoreSet } from "./course-store-types"
import { fullPageBlockKeys } from "../layout/layoutEngine"
import type { CanvasId, CanvasPage, SessionId } from "../types"

function makeStableCanvasId(sessionId: SessionId, pageNumber: number): CanvasId {
  return `${sessionId}-canvas-${pageNumber}` as CanvasId
}

function stabilizeSessionCanvases(
  sessionId: SessionId,
  canvases: CanvasPage[],
): CanvasPage[] {
  return canvases.map((canvas, index) => ({
    ...canvas,
    id: makeStableCanvasId(sessionId, index + 1),
    sessionId,
    pageNumber: index + 1,
  }))
}

export function createCanvasActions(set: CourseStoreSet): Pick<
  CourseState,
  | "appendCanvasPage"
  | "setCanvasTopicRange"
  | "setCanvasObjectiveRange"
  | "setCanvasTaskRange"
  | "setCanvasCardRange"
  | "setCanvasLayoutSlotRange"
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
          const newCanvas: CanvasPage = {
            id: makeStableCanvasId(sessionId, session.canvases.length + 1),
            sessionId,
            pageNumber: session.canvases.length + 1,
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
            ...(options?.layoutSlotRange !== undefined
              ? { contentLayoutSlotRange: options.layoutSlotRange }
              : {}),
          }

          const totalCards = session.topics
            .flatMap((topic) => topic.objectives)
            .flatMap((objective) => objective.tasks)
            .reduce((sum, task) => sum + task.droppedCards.length, 0)

          const insertAfterIndex = options?.afterCanvasId
            ? session.canvases.findIndex((canvas) => canvas.id === options.afterCanvasId)
            : -1
          const insertIndex = insertAfterIndex >= 0 ? insertAfterIndex + 1 : session.canvases.length
          const nextCanvases = [...session.canvases]
          nextCanvases.splice(insertIndex, 0, newCanvas)

          return {
            ...session,
            canvases: normalizeCanvasCardRanges(
              stabilizeSessionCanvases(sessionId, nextCanvases),
              totalCards,
            ),
          }
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

    setCanvasLayoutSlotRange: (canvasId, range) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, contentLayoutSlotRange: range })),

    setCanvasMeasuredHeight: (canvasId, heightPx) =>
      mapCanvases(canvasId, (canvas) => ({ ...canvas, measuredContentHeightPx: heightPx })),

    syncPageAssignments: (sessionId, assignments) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => {
          const next = assignments.map((assignment, index) => {
            const page: CanvasPage = {
              id: makeStableCanvasId(sessionId, index + 1),
              sessionId,
              pageNumber: index + 1,
              blockKeys: fullPageBlockKeys(assignment, session),
              ...(assignment.topicRange ? { contentTopicRange: assignment.topicRange } : {}),
              ...(assignment.objectiveRange ? { contentObjectiveRange: assignment.objectiveRange } : {}),
              ...(assignment.taskRange ? { contentTaskRange: assignment.taskRange } : {}),
              ...(assignment.cardRange ? { contentCardRange: assignment.cardRange } : {}),
              ...(assignment.layoutSlotRange ? { contentLayoutSlotRange: assignment.layoutSlotRange } : {}),
            }
            return page
          })

          return {
            ...session,
            canvases: normalizeCanvasCardRanges(
              stabilizeSessionCanvases(sessionId, next),
              session.topics
                .flatMap((topic) => topic.objectives)
                .flatMap((objective) => objective.tasks)
                .reduce((sum, task) => sum + task.droppedCards.length, 0),
            ),
          }
        }),
      })),
  }
}
