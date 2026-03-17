import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createCanvasActions } from "./course-store-canvas-actions"
import { createCardActions } from "./course-store-card-actions"
import { createSessionActions } from "./course-store-session-actions"
import type { CourseState } from "./course-store-types"

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      ...createSessionActions(set, get),
      ...createCardActions(set),
      ...createCanvasActions(set),
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
