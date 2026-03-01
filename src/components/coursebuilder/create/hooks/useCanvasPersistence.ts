/**
 * useCanvasPersistence
 *
 * Watches the sessions array in courseStore and debounce-saves the full canvas
 * state for every session to the `lessons` Supabase table.
 *
 * Each session is written as:
 *   lesson_number  — session.order (1-based, stable identifier)
 *   title          — session.title
 *   payload        — serialised topics tree, canvas pages, fieldEnabled
 *
 * `measuredContentHeightPx` is intentionally stripped from canvas pages before
 * saving: it is an ephemeral DOM measurement that should be recomputed on mount,
 * not persisted.
 *
 * Mount this hook once in CreateEditorLayout.
 */

import { useEffect, useRef } from "react"
import { useCourseStore } from "../store/courseStore"
import { upsertLessonSession } from "@/components/coursebuilder/course-mutations"
import type { CanvasPage, CourseSession } from "../types"

// ─── Serialisation helpers ─────────────────────────────────────────────────────

type SerialisedCanvasPage = Omit<CanvasPage, "measuredContentHeightPx">

function serialisePage(page: CanvasPage): SerialisedCanvasPage {
  // Destructure to drop the ephemeral measurement field.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { measuredContentHeightPx: _m, ...rest } = page as CanvasPage & { measuredContentHeightPx?: unknown }
  return rest
}

function buildPayload(session: CourseSession): Record<string, unknown> {
  return {
    topics:       session.topics,
    canvases:     (session.canvases ?? []).map(serialisePage),
    fieldEnabled: session.fieldEnabled ?? null,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 1200

export function useCanvasPersistence(): void {
  const sessions = useCourseStore((s) => s.sessions)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sessions.length === 0) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const courseId = sessions[0]?.courseId
      if (!courseId) return

      void Promise.all(
        sessions.map((session) =>
          upsertLessonSession(
            courseId,
            session.order,
            session.title,
            buildPayload(session),
          ),
        ),
      )
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sessions])
}
