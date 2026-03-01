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
  SessionId,
  CanvasId,
  TaskId,
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

  /** Append a new blank canvas page to a session */
  appendCanvasPage: (sessionId: SessionId) => void

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

      hydrateSessions: (sessions) => set({ sessions }),

      addDroppedCard: (sessionId, taskId, card) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => ({
            ...session,
            topics: session.topics.map((topic) => ({
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
        })),

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

      appendCanvasPage: (sessionId) =>
        set((state) => ({
          sessions: mapSession(state.sessions, sessionId, (session) => {
            const nextPage = session.canvases.length + 1
            // Inherit blockKeys from the last canvas so overflow pages show
            // the same block(s) as the page that triggered overflow.
            const lastCanvas = session.canvases[session.canvases.length - 1]
            const newCanvas: CanvasPage = {
              id: crypto.randomUUID() as CanvasId,
              sessionId,
              pageNumber: nextPage,
              blockKeys: lastCanvas?.blockKeys,
            }
            return { ...session, canvases: [...session.canvases, newCanvas] }
          }),
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
      // Only persist the session data, not derived UI state
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
)
