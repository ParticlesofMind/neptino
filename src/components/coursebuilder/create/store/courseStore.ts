/**
 * Course Store — full session/canvas/content tree
 *
 * Persisted to `localStorage` as a draft snapshot. On publish, the app
 * writes the normalized Supabase tables instead.
 */

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

// ─── Shape ────────────────────────────────────────────────────────────────────

interface CourseState {
  /** All sessions loaded for the current course edit */
  sessions: CourseSession[]
  /** The session currently in view */
  activeSessionId: SessionId | null

  // ── Setters ────────────────────────────────────────────────────────────────

  setActiveSession: (id: SessionId) => void

  /** Insert or replace a session (matched by id) */
  upsertSession: (session: CourseSession) => void

  /** Replace the full sessions list (used on initial load from Supabase) */
  hydrateSessions: (sessions: CourseSession[]) => void

  // ── Dropped-card mutations ─────────────────────────────────────────────────

  addDroppedCard: (sessionId: SessionId, taskId: TaskId, card: DroppedCard) => void
  removeDroppedCard: (sessionId: SessionId, taskId: TaskId, cardId: string) => void

  // ── Canvas-page mutations ──────────────────────────────────────────────────

  /**
   * Append a new blank canvas page to a session.
   * `contentTopicStart` — if provided, the new page’s ContentBlock starts
   * rendering from this absolute topic index (for overflow continuation).
   * `options.topicEnd` — upper bound for the topic range on the new page.
   * `options.objectiveStart` — if provided, the new page starts at this absolute
   *   flat objective index (used for within-topic objective-level splits).
   */
  appendCanvasPage: (
    sessionId: SessionId,
    contentTopicStart?: number,
    options?: { topicEnd?: number; objectiveStart?: number },
  ) => void

  /**
   * Set (or update) the contentTopicRange on a specific canvas page.
   * Used by the overflow hook to constrain how many topics appear on a page.
   */
  setCanvasTopicRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  /**
   * Set (or update) the contentObjectiveRange on a specific canvas page.
   * Used by the overflow hook as a fallback when only one topic is present
   * and a topic-boundary split cannot be performed.
   */
  setCanvasObjectiveRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  /** Update the measured content height of a specific canvas page */
  setCanvasMeasuredHeight: (canvasId: CanvasId, heightPx: number) => void

  // ── Derived helpers ────────────────────────────────────────────────────────

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
        // Deduplicate by session id — guards against stale localStorage entries
        // written before source-data deduplication was added to the loader.
        const seen = new Set<string>()
        set({
          sessions: sessions.filter((s) => {
            if (seen.has(s.id)) return false
            seen.add(s.id)
            return true
          }),
        })
      },

      addDroppedCard: (sessionId, taskId, card) =>
        set((state) => {
          const session = state.sessions.find((s) => s.id === sessionId)
          if (!session) return state

          // Fast path: task exists in the current tree — just update it.
          const taskExists = session.topics.some((t) =>
            t.objectives.some((o) => o.tasks.some((ta) => ta.id === taskId)),
          )
          if (taskExists) {
            return {
              sessions: mapSession(state.sessions, sessionId, (s) => ({
                ...s,
                topics: s.topics.map((topic) => ({
                  ...topic,
                  objectives: topic.objectives.map((obj) => ({
                    ...obj,
                    tasks: obj.tasks.map((task) =>
                      task.id === taskId
                        ? { ...task, droppedCards: [...task.droppedCards, card] }
                        : task,
                    ),
                  })),
                })),
              })),
            }
          }

          // Fallback path: task not found (drop zone shown before any topics were
          // loaded).  Bootstrap a minimal topic \u2192 objective \u2192 task chain so the
          // card is immediately visible and subsequent drops have a real target.
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
          sessions: mapSession(state.sessions, sessionId, (session) => ({
            ...session,
            topics: session.topics.map((topic) => ({
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
            })),
          })),
        })),

      appendCanvasPage: (sessionId, contentTopicStart, options) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => {
            const nextPage = session.canvases.length + 1
            const lastCanvas = session.canvases[session.canvases.length - 1]

            // program and resources are session-level summary blocks — shown only
            // once on page 1 and must never repeat on continuation pages.
            const SESSION_ONCE_BLOCKS = new Set<BlockKey>(["program", "resources"])

            // Default body blocks for continuation pages (excludes header/footer/program/resources)
            const DEFAULT_CONTINUATION_BLOCKS: BlockKey[] = ["content", "assignment", "scoring", "project"]

            let continuationBlockKeys: BlockKey[] | undefined
            if (lastCanvas?.blockKeys === undefined) {
              continuationBlockKeys = DEFAULT_CONTINUATION_BLOCKS.length > 0
                ? DEFAULT_CONTINUATION_BLOCKS
                : undefined
            } else {
              const filtered = lastCanvas.blockKeys.filter((k) => !SESSION_ONCE_BLOCKS.has(k))
              if (filtered.length > 0) {
                continuationBlockKeys = filtered
              } else {
                continuationBlockKeys = DEFAULT_CONTINUATION_BLOCKS.length > 0
                  ? DEFAULT_CONTINUATION_BLOCKS
                  : undefined
              }
            }

            const newCanvas: CanvasPage = {
              id: crypto.randomUUID() as CanvasId,
              sessionId,
              pageNumber: nextPage,
              blockKeys: continuationBlockKeys,
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

      setCanvasMeasuredHeight: (canvasId, heightPx) =>
        set((state) => ({
          sessions: state.sessions.map((session) => ({
            ...session,
            canvases: session.canvases.map((c) =>
              c.id === canvasId ? { ...c, measuredContentHeightPx: heightPx } : c,
            ),
          })),
        })),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get()
        return sessions.find((s) => s.id === activeSessionId)
      },
    }),
    {
      name: "neptino-course-store",
      // Bump version to evict any stale localStorage entries that contained a
      // `sessions` array (written before partialize was restricted to
      // activeSessionId only). Zustand discards stored state on version mismatch.
      version: 1,
      // Sessions are always authoritative from Supabase — do NOT persist them
      // to localStorage. Persisting session.canvases causes stale blockKeys to
      // outlive code changes and triggers the overflow-append loop on every load.
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
      }),
      // Explicitly ignore any `sessions` that may be present in old localStorage
      // entries (written before `partialize` was restricted to activeSessionId).
      // Without this, Zustand's default merge would overlay stale sessions onto
      // the initial empty array before `hydrateSessions` fires, causing duplicate
      // canvas-ID keys in the virtualizer when two sessions shared the same UUID.
      merge: (persisted, current) => ({
        ...current,
        activeSessionId:
          (persisted as Partial<CourseState>).activeSessionId ?? current.activeSessionId,
      }),
    },
  ),
)
