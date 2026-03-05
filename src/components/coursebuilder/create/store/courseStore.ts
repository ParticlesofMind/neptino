import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  CourseSession,
  CanvasPage,
  DroppedCard,
  Topic,
  Objective,
  Task,
  SessionId,
  CanvasId,
  TopicId,
  ObjectiveId,
  TaskId,
  BlockKey,
} from "../types"
import {
  expandCanvasCardRangesForInsertion,
  normalizeCanvasCardRanges,
} from "./cardRangeUtils"
import type { PageAssignment } from "../layout/layoutEngine"
import { fullPageBlockKeys } from "../layout/layoutEngine"

// ─── Shape ────────────────────────────────────────────────────────────────────

interface CourseState {
  sessions: CourseSession[]
  activeSessionId: SessionId | null

  setActiveSession: (id: SessionId) => void

  upsertSession: (session: CourseSession) => void
  hydrateSessions: (sessions: CourseSession[]) => void

  addDroppedCard: (
    sessionId: SessionId,
    taskId: TaskId,
    card: DroppedCard,
    canvasId?: CanvasId | null,
  ) => void
  removeDroppedCard: (sessionId: SessionId, taskId: TaskId, cardId: string) => void

  appendCanvasPage: (
    sessionId: SessionId,
    contentTopicStart?: number,
    options?: { topicEnd?: number; objectiveStart?: number; cardStart?: number; cardEnd?: number; blockKeys?: BlockKey[] },
  ) => void

  setCanvasTopicRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasObjectiveRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasCardRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasMeasuredHeight: (canvasId: CanvasId, heightPx: number) => void

  /**
   * Atomically reconcile a session's canvas pages with the given assignments
   * produced by the layout engine.
   *
   * Existing canvas IDs are reused where possible so React keys stay stable.
   * Extra canvases are pruned; new ones are appended with fresh IDs.
   */
  syncPageAssignments: (sessionId: SessionId, assignments: PageAssignment[]) => void

  getActiveSession: () => CourseSession | undefined
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSession(
  sessions: CourseSession[],
  id: SessionId,
  fn: (s: CourseSession) => CourseSession,
): CourseSession[] {
  return sessions.map((s) => (s.id === id ? fn(s) : s))
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      setActiveSession: (id) => set({ activeSessionId: id }),

      upsertSession: (session) =>
        set((state) => ({
          sessions: state.sessions.some((s) => s.id === session.id)
            ? state.sessions.map((s) => (s.id === session.id ? session : s))
            : [...state.sessions, session],
        })),

      hydrateSessions: (sessions) => {
        const seen = new Set<string>()
        set({
          sessions: sessions.filter((s) => {
            if (seen.has(s.id)) return false
            seen.add(s.id)
            return true
          }),
        })
      },

      addDroppedCard: (sessionId, taskId, card, canvasId) =>
        set((state) => {
          const session = state.sessions.find((s) => s.id === sessionId)
          if (!session) return state

          // Fast path: task exists in the current tree — just update it.
          const taskExists = session.topics.some((t) =>
            t.objectives.some((o) => o.tasks.some((ta) => ta.id === taskId)),
          )
          if (taskExists) {
            const nextTopics = session.topics.map((topic) => ({
              ...topic,
              objectives: topic.objectives.map((obj) => ({
                ...obj,
                tasks: obj.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        droppedCards: [...task.droppedCards, card].sort(
                          (a, b) => a.order - b.order,
                        ),
                      }
                    : task,
                ),
              })),
            }))

            const totalCards = nextTopics
              .flatMap((topic) => topic.objectives)
              .flatMap((objective) => objective.tasks)
              .reduce((sum, task) => sum + task.droppedCards.length, 0)

            return {
              sessions: mapSession(state.sessions, sessionId, (s) => ({
                ...s,
                topics: nextTopics,
                canvases: normalizeCanvasCardRanges(
                  expandCanvasCardRangesForInsertion(s.canvases, canvasId ?? null),
                  totalCards,
                ),
              })),
            }
          }

          // Fallback path: task not found.
          //
          // Case A — session already has topics: the taskId came from a stale
          // or catch-all drop zone. Route the card to the first task of the
          // first objective of the first topic rather than destroying the
          // existing topic structure.
          if (session.topics.length > 0) {
            return {
              sessions: mapSession(state.sessions, sessionId, (s) => ({
                ...s,
                topics: s.topics.map((topic, ti) =>
                  ti !== 0 ? topic : {
                    ...topic,
                    objectives: topic.objectives.map((obj, oi) =>
                      oi !== 0 ? obj : {
                        ...obj,
                        tasks: obj.tasks.map((task, ki) =>
                          ki !== 0 ? task : { ...task, droppedCards: [...task.droppedCards, card].sort((a, b) => a.order - b.order) }
                        ),
                      }
                    ),
                  }
                ),
              })),
            }
          }

          // Case B — no topics yet: bootstrap a minimal topic → objective → task
          // chain so the card is immediately visible.
          const topicId   = `${sessionId}-default-topic`   as TopicId
          const objId     = `${sessionId}-default-obj`     as ObjectiveId

          const defaultTask: Task = {
            id: taskId,
            objectiveId: objId,
            label: "",
            order: 0,
            droppedCards: [card],
          }
          const defaultObj: Objective = {
            id: objId,
            topicId,
            label: "",
            order: 0,
            tasks: [defaultTask],
          }
          const defaultTopic: Topic = {
            id: topicId,
            sessionId,
            label: "",
            order: 0,
            objectives: [defaultObj],
          }

          return {
            sessions: mapSession(state.sessions, sessionId, (s) => ({
              ...s,
              topics: [defaultTopic],
            })),
          }
        }),

      removeDroppedCard: (sessionId, taskId, cardId) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => {
            const nextTopics = session.topics.map((topic) => ({
              ...topic,
              objectives: topic.objectives.map((obj) => ({
                ...obj,
                tasks: obj.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        droppedCards: task.droppedCards.filter((c) => c.id !== cardId),
                      }
                    : task,
                ),
              })),
            }))

            const totalCards = nextTopics
              .flatMap((topic) => topic.objectives)
              .flatMap((objective) => objective.tasks)
              .reduce((sum, task) => sum + task.droppedCards.length, 0)

            return {
              ...session,
              topics: nextTopics,
              canvases: normalizeCanvasCardRanges(session.canvases, totalCards),
            }
          }),
        })),

      appendCanvasPage: (sessionId, contentTopicStart, options) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => {
            const nextPage = session.canvases.length + 1
            const newCanvas: CanvasPage = {
              id: crypto.randomUUID() as CanvasId,
              sessionId,
              pageNumber: nextPage,
              // Caller-supplied block keys for continuation pages. When provided,
              // only those blocks are rendered (e.g. only content/assignment on
              // overflow pages — program/resources must not repeat).
              ...(options?.blockKeys !== undefined ? { blockKeys: options.blockKeys } : {}),
              // If the caller supplies a topic start index this page continues from
              // that point in the flat topic list (overflow-driven pagination).
              ...(contentTopicStart !== undefined
                ? {
                    contentTopicRange: {
                      start: contentTopicStart,
                      ...(options?.topicEnd !== undefined ? { end: options.topicEnd } : {}),
                    },
                  }
                : {}),
              // Objective-level split: restrict which objectives are shown on this page.
              ...(options?.objectiveStart !== undefined
                ? { contentObjectiveRange: { start: options.objectiveStart } }
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
        set((state) => ({
          sessions: state.sessions.map((session) => ({
            ...session,
            canvases: session.canvases.map((c) =>
              c.id === canvasId ? { ...c, contentTopicRange: range } : c,
            ),
          })),
        })),

      setCanvasObjectiveRange: (canvasId, range) =>
        set((state) => ({
          sessions: state.sessions.map((session) => ({
            ...session,
            canvases: session.canvases.map((c) =>
              c.id === canvasId ? { ...c, contentObjectiveRange: range } : c,
            ),
          })),
        })),

      setCanvasCardRange: (canvasId, range) =>
        set((state) => ({
          sessions: state.sessions.map((session) => ({
            ...session,
            canvases: session.canvases.map((c) =>
              c.id === canvasId ? { ...c, contentCardRange: range } : c,
            ),
          })),
        })),

      setCanvasMeasuredHeight: (canvasId, heightPx) =>
        set((state) => ({
          sessions: state.sessions.map((session) => ({
            ...session,
            canvases: session.canvases.map((c) =>
              c.id === canvasId ? { ...c, measuredContentHeightPx: heightPx } : c,
            ),
          })),
        })),

      syncPageAssignments: (sessionId, assignments) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => {
            const existing = session.canvases
            const next: CanvasPage[] = assignments.map((assignment, i) => {
              // Reuse the existing canvas ID at this index for React key stability.
              const existingId = existing[i]?.id ?? (crypto.randomUUID() as CanvasId)
              const blockKeys  = fullPageBlockKeys(assignment, session)
              const page: CanvasPage = {
                id:         existingId,
                sessionId,
                pageNumber: i + 1,
                blockKeys,
                ...(assignment.topicRange
                  ? { contentTopicRange: assignment.topicRange }
                  : {}),
                ...(assignment.objectiveRange
                  ? { contentObjectiveRange: assignment.objectiveRange }
                  : {}),
                ...(assignment.taskRange
                  ? { contentTaskRange: assignment.taskRange }
                  : {}),
              }
              return page
            })
            return { ...session, canvases: next }
          }),
        })),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get()
        return sessions.find((s) => s.id === activeSessionId)
      },
    }),
    {
      name: "neptino-course-store",
      version: 1,
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
      }),
      merge: (persisted, current) => ({
        ...current,
        activeSessionId:
          (persisted as Partial<CourseState>).activeSessionId ?? current.activeSessionId,
      }),
    },
  ),
)
