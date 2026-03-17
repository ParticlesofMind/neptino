import type { CourseState, CourseStoreGet, CourseStoreSet } from "./course-store-types"

export function createSessionActions(set: CourseStoreSet, get: CourseStoreGet): Pick<
  CourseState,
  "setActiveSession" | "upsertSession" | "hydrateSessions" | "getActiveSession"
> {
  return {
    setActiveSession: (id) => set({ activeSessionId: id }),

    upsertSession: (session) =>
      set((state) => ({
        sessions: state.sessions.some((existing) => existing.id === session.id)
          ? state.sessions.map((existing) => (existing.id === session.id ? session : existing))
          : [...state.sessions, session],
      })),

    hydrateSessions: (sessions) => {
      const seen = new Set<string>()
      set({
        sessions: sessions.filter((session) => {
          if (seen.has(session.id)) return false
          seen.add(session.id)
          return true
        }),
      })
    },

    getActiveSession: () => {
      const { sessions, activeSessionId } = get()
      return sessions.find((session) => session.id === activeSessionId)
    },
  }
}