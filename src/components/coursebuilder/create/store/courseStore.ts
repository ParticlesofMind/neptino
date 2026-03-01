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
  BlockKey,
  TemplateType,
} from "../types"
import { getTemplateDefinition } from "../templates/definitions"

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
            const lastCanvas = session.canvases[session.canvases.length - 1]

            // program and resources are session-level summary blocks — shown only
            // once on page 1 and must never repeat on continuation pages.
            const SESSION_ONCE_BLOCKS = new Set<BlockKey>(["program", "resources"])

            let continuationBlockKeys: BlockKey[] | undefined
            if (lastCanvas?.blockKeys === undefined) {
              // Page 1 of a non-lesson template uses blockKeys:undefined (render all).
              // Derive an explicit continuation set from the template definition,
              // excluding header, footer, and the session-once blocks.
              const def = getTemplateDefinition(session.templateType as TemplateType)
              const contKeys = def.blocks
                .map((b) => b.key as BlockKey)
                .filter((k) => !SESSION_ONCE_BLOCKS.has(k) && k !== "header" && k !== "footer")
              continuationBlockKeys = contKeys.length > 0 ? contKeys : undefined
            } else {
              // Explicit blockKeys: strip session-once blocks as a safety net.
              const filtered = lastCanvas.blockKeys.filter((k) => !SESSION_ONCE_BLOCKS.has(k))
              continuationBlockKeys = filtered.length > 0 ? filtered : lastCanvas.blockKeys
            }

            const newCanvas: CanvasPage = {
              id: crypto.randomUUID() as CanvasId,
              sessionId,
              pageNumber: nextPage,
              blockKeys: continuationBlockKeys,
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
      // Sessions are always authoritative from Supabase — do NOT persist them
      // to localStorage. Persisting session.canvases causes stale blockKeys to
      // outlive code changes and triggers the overflow-append loop on every load.
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
)
