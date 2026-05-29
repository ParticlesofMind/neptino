/**
 * useCourseSessionLoader
 *
 * Loads the full canvas-editor state for a course from Supabase and hydrates
 * the Zustand stores. Two queries run in parallel:
 *   1. courses row  — curriculum structure, schedule, layout.
 *   2. lessons rows — previously-saved CourseSession snapshots.
 *
 * See course-session-mapper.ts for the pure helper functions and types.
 */

import { useEffect, useState } from "react"
import { selectCourseById, selectLessonsByCourseId } from "@/components/coursebuilder/course-queries"
import { createClient } from "@/lib/supabase/client"
import { useCourseStore } from "../store/courseStore"
import {
  type RawSessionRow,
  type RawScheduleEntry,
  type CourseMeta,
  type LoaderState,
  mapRowToSession,
  reconcileSavedLesson,
} from "./course-session-mapper"

interface CourseSessionLoaderOptions {
  requireEditable?: boolean
}

export function useCourseSessionLoader(
  courseId: string | null,
  options: CourseSessionLoaderOptions = {},
): LoaderState {
  const hydrateSessions = useCourseStore((s) => s.hydrateSessions)
  const [state, setState] = useState<LoaderState>({ loading: Boolean(courseId), error: null })
  const requireEditable = options.requireEditable === true

  useEffect(() => {
    let cancelled = false
    const scheduleState = (nextState: LoaderState) => {
      void Promise.resolve().then(() => {
        if (!cancelled) setState(nextState)
      })
    }

    if (!courseId) {
      scheduleState({ loading: false, error: null })
      return () => { cancelled = true }
    }

    scheduleState({ loading: true, error: null })

    void (async () => {
      const [courseResult, lessonsResult] = await Promise.all([
        selectCourseById<Record<string, unknown>>(
          courseId,
          "course_name, teacher_id, institution, generation_settings, course_layout, curriculum_data, schedule_settings, template_settings",
        ),
        selectLessonsByCourseId(courseId),
      ])

      if (cancelled) return

      if (courseResult.error || !courseResult.data) {
        setState({ loading: false, error: "Failed to load course sessions." })
        return
      }

      const data            = courseResult.data
      const curriculum      = (data.curriculum_data      as Record<string, unknown> | null) ?? {}
      const generationSettings = (data.generation_settings as Record<string, unknown> | null) ?? {}
      const teacherId = typeof data.teacher_id === "string"
        ? data.teacher_id
        : (typeof generationSettings.teacher_id === "string" ? generationSettings.teacher_id : null)

      if (requireEditable) {
        const supabase = createClient()
        const { data: authData } = await supabase.auth.getUser()
        if (cancelled) return

        if (!authData.user || !teacherId || authData.user.id !== teacherId) {
          hydrateSessions([])
          setState({
            loading: false,
            error: "This course can be viewed, but the current account cannot edit its lesson canvases.",
          })
          return
        }
      }

      const courseLayout    = (data.course_layout         as Record<string, unknown> | null) ?? {}
      const scheduleSettings = (data.schedule_settings   as Record<string, unknown> | null) ?? {}
      const templateSettingsRaw = (data.template_settings as Record<string, unknown> | null) ?? {}

      // Build fieldState lookups so sessions can receive the exact saved
      // template selected for them. The type lookup remains as a legacy fallback
      // for curriculum rows saved before template_id existed.
      const fieldStateById: Record<string, Partial<Record<string, Record<string, unknown>>>> = {}
      const fieldStateByType: Record<string, Partial<Record<string, Record<string, unknown>>>> = {}
      const templateList = Array.isArray(templateSettingsRaw.templates)
        ? (templateSettingsRaw.templates as Array<Record<string, unknown>>)
        : []
      const activeTemplateId = typeof templateSettingsRaw.active_template_id === "string"
        ? templateSettingsRaw.active_template_id
        : null
      const activeTemplate = activeTemplateId
        ? templateList.find((tpl) => tpl.id === activeTemplateId)
        : null
      if (activeTemplate) {
        const id = typeof activeTemplate.id === "string" ? activeTemplate.id : null
        const type = typeof activeTemplate.type === "string" ? activeTemplate.type : null
        const fieldState = activeTemplate.fieldState as Partial<Record<string, Record<string, unknown>>> | undefined
        if (id && fieldState && typeof fieldState === "object") {
          fieldStateById[id] = fieldState
        }
        if (type && fieldState && typeof fieldState === "object") {
          fieldStateByType[type] = fieldState
        }
      }
      for (const tpl of templateList) {
        const id = typeof tpl.id === "string" ? tpl.id : null
        const type = typeof tpl.type === "string" ? tpl.type : null
        const fieldState = tpl.fieldState as Partial<Record<string, Record<string, unknown>>> | undefined
        if (id && fieldState && typeof fieldState === "object" && !(id in fieldStateById)) {
          fieldStateById[id] = fieldState
        }
        if (type && fieldState && typeof fieldState === "object" && !(type in fieldStateByType)) {
          fieldStateByType[type] = fieldState
        }
      }


      // ── Build lessons map (lesson_number → saved row) ──────────────────
      const lessonsMap = new Map<number, (typeof lessonsResult.data)[number]>()
      for (const row of lessonsResult.data) {
        lessonsMap.set(row.lesson_number, row)
      }

      // ── Build session rows from curriculum_data ──────────────────────────
      let rowsRaw: RawSessionRow[] = Array.isArray(curriculum.session_rows)
        ? (curriculum.session_rows as RawSessionRow[])
        : []

      // Reconcile schedule dates from generated entries into session rows.
      // curriculum_data.session_rows does not store schedule dates directly;
      // the authoritative date values live in schedule_settings.generated_entries.
      // Without this reconciliation, schedule_date is always empty on the canvas even
      // when the template has the Date field enabled.
      const generatedEntries: RawScheduleEntry[] = Array.isArray(scheduleSettings.generated_entries)
        ? (scheduleSettings.generated_entries as RawScheduleEntry[])
        : []

      if (rowsRaw.length > 0 && generatedEntries.length > 0) {
        rowsRaw = rowsRaw.map((row, idx) => {
          if (row.schedule_date) return row
          const sessionNum = row.session_number ?? idx + 1
          // Match by session number first, fall back to positional index.
          const entry =
            generatedEntries.find((e) => (e.session ?? 0) === sessionNum) ??
            generatedEntries[idx]
          return entry?.date ? { ...row, schedule_date: entry.date } : row
        })
      }

      if (rowsRaw.length === 0 && generatedEntries.length > 0) {
        rowsRaw = generatedEntries.map((entry, i) => ({
          id:             entry.id ?? `session-${i}`,
          session_number: entry.session ?? i + 1,
          title:          `Session ${i + 1}`,
          template_type:  "lesson",
          schedule_date:  entry.date ?? "",
        }))
      }

      // Deduplicate rows by session ID — duplicate IDs in the source data
      // produce sessions with identical canvas IDs (e.g. two `${id}-canvas-1`
      // entries), causing React duplicate-key warnings in the virtualizer.
      const seenSessionIds = new Set<string>()
      rowsRaw = rowsRaw.filter((row) => {
        const id = row.id ?? ""
        if (seenSessionIds.has(id)) return false
        seenSessionIds.add(id)
        return true
      })

      const moduleNames: string[] = Array.isArray(curriculum.module_names)
        ? (curriculum.module_names as unknown[]).map((n) => String(n ?? "")).filter(Boolean)
        : []

      const pedagogyRaw = courseLayout.pedagogy as { x?: number; y?: number } | string | null | undefined
      const pedagogyLabel = typeof pedagogyRaw === "string"
        ? pedagogyRaw
        : (pedagogyRaw && typeof pedagogyRaw === "object"
            ? `${pedagogyRaw.x ?? ""},${pedagogyRaw.y ?? ""}`
            : "")

      const meta: CourseMeta = {
        courseTitle:        String(data.course_name   ?? ""),
        institution:        String(data.institution   ?? ""),
        teacherName:        String(generationSettings.teacher_name ?? ""),
        pedagogy:           pedagogyLabel,
        moduleNames,
        totalSessions:      rowsRaw.length,
        topicsPerLesson:    Number(curriculum.topics     ?? 1),
        objectivesPerTopic: Number(curriculum.objectives ?? 2),
        tasksPerObjective:  Number(curriculum.tasks      ?? 2),
        fieldStateById,
        fieldStateByType,
      }

      // ── Build + reconcile sessions ───────────────────────────────────────
      const sessions = rowsRaw.map((row, i) => {
        const derived    = mapRowToSession(row, i, courseId, meta)
        const sessionNum = derived.order
        const saved      = lessonsMap.get(sessionNum)
        return saved ? reconcileSavedLesson(derived, saved) : derived
      })

      hydrateSessions(sessions)

      setState({ loading: false, error: null })
    })()

    return () => { cancelled = true }
  }, [courseId, hydrateSessions, requireEditable])

  return state
}
