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
import { useCourseStore } from "../store/courseStore"
import type { } from "../types"
import {
  type RawSessionRow,
  type RawScheduleEntry,
  type CourseMeta,
  type LoaderState,
  mapRowToSession,
  reconcileSavedLesson,
} from "./course-session-mapper"

export function useCourseSessionLoader(courseId: string | null): LoaderState {
  const hydrateSessions = useCourseStore((s) => s.hydrateSessions)
  const [state, setState] = useState<LoaderState>({ loading: Boolean(courseId), error: null })

  useEffect(() => {
    if (!courseId) {
      setState({ loading: false, error: null })
      return
    }

    let cancelled = false
    setState({ loading: true, error: null })

    void (async () => {
      const [courseResult, lessonsResult] = await Promise.all([
        selectCourseById<Record<string, unknown>>(
          courseId,
          "course_name, institution, generation_settings, course_layout, curriculum_data, schedule_settings, template_settings",
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
      const courseLayout    = (data.course_layout         as Record<string, unknown> | null) ?? {}
      const scheduleSettings = (data.schedule_settings   as Record<string, unknown> | null) ?? {}
      const templateSettingsRaw = (data.template_settings as Record<string, unknown> | null) ?? {}

      // Build a fieldState lookup keyed by template type so that each session
      // can receive the correct per-block field visibility from the saved template.
      // Use the FIRST template per type to match the setup page's .find() behaviour —
      // iterating without a guard would cause the last template of each type to win,
      // which diverges from what the user sees and configures in setup.
      const fieldStateByType: Record<string, Partial<Record<string, Record<string, boolean>>>> = {}
      const templateList = Array.isArray(templateSettingsRaw.templates)
        ? (templateSettingsRaw.templates as Array<Record<string, unknown>>)
        : []
      for (const tpl of templateList) {
        const type = typeof tpl.type === "string" ? tpl.type : null
        const fieldState = tpl.fieldState as Partial<Record<string, Record<string, boolean>>> | undefined
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
  }, [courseId, hydrateSessions])

  return state}