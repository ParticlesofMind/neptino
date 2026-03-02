/**
 * useCourseSessionLoader
 *
 * Loads the full canvas-editor state for a course from Supabase and hydrates
 * the Zustand stores. Two queries run in parallel:
 *   1. courses row  — curriculum structure, schedule, template settings.
 *   2. lessons rows — previously-saved CourseSession snapshots.
 *
 * See course-session-mapper.ts for the pure helper functions and types.
 */

import { useEffect, useState } from "react"
import { selectCourseById, selectLessonsByCourseId } from "@/components/coursebuilder/course-queries"
import { useCourseStore } from "../store/courseStore"
import { useTemplateStore } from "../store/templateStore"
import {
  normalizeTemplate,
  normalizeTemplateSettings,
  defaultEnabled,
  defaultFieldEnabled,
  type LocalTemplate,
} from "@/components/coursebuilder/sections/template-section-data"
import type { SessionId } from "../types"
import {
  type RawSessionRow,
  type RawScheduleEntry,
  type CourseMeta,
  type LoaderState,
  findTemplate,
  templateToVisibleBlocks,
  templateToBlockOrder,
  mapRowToSession,
  mergeSavedLesson,
} from "./course-session-mapper"

export function useCourseSessionLoader(courseId: string | null): LoaderState {
  const hydrateSessions = useCourseStore((s) => s.hydrateSessions)
  const initSession     = useTemplateStore((s) => s.initSession)
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

      // ── Parse template settings ──────────────────────────────────────────
      const templateSettings = normalizeTemplateSettings(data.template_settings)
      const templates: LocalTemplate[] = templateSettings.templates.map(normalizeTemplate)

      // ── Build lessons map (lesson_number → saved row) ──────────────────
      const lessonsMap = new Map<number, (typeof lessonsResult.data)[number]>()
      for (const row of lessonsResult.data) {
        lessonsMap.set(row.lesson_number, row)
      }

      // ── Build session rows from curriculum_data ──────────────────────────
      let rowsRaw: RawSessionRow[] = Array.isArray(curriculum.session_rows)
        ? (curriculum.session_rows as RawSessionRow[])
        : []

      if (rowsRaw.length === 0 && Array.isArray(scheduleSettings.generated_entries)) {
        rowsRaw = (scheduleSettings.generated_entries as RawScheduleEntry[]).map((entry, i) => ({
          id:             entry.id ?? `session-${i}`,
          session_number: entry.session ?? i + 1,
          title:          `Session ${i + 1}`,
          template_type:  "lesson",
          schedule_date:  entry.date ?? "",
        }))
      }

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
      }

      // ── Build + merge sessions ───────────────────────────────────────────
      const sessions = rowsRaw.map((row, i) => {
        const derived    = mapRowToSession(row, i, courseId, meta)
        const sessionNum = derived.order
        const saved      = lessonsMap.get(sessionNum)
        const merged     = saved ? mergeSavedLesson(derived, saved) : derived

        const tpl = findTemplate(
          (row as RawSessionRow & { template_id?: string }).template_id,
          derived.templateType,
          templates,
        )
        if (tpl?.fieldEnabled) {
          return { ...merged, fieldEnabled: tpl.fieldEnabled }
        }
        return {
          ...merged,
          fieldEnabled: defaultFieldEnabled(derived.templateType, defaultEnabled()),
        }
      })

      hydrateSessions(sessions)

      // ── Apply template config to templateStore ───────────────────────────
      for (const session of sessions) {
        const row = rowsRaw[sessions.indexOf(session)]
        const tpl = findTemplate(
          (row as RawSessionRow & { template_id?: string })?.template_id,
          session.templateType,
          templates,
        )

        if (tpl) {
          initSession(
            session.id as SessionId,
            {
              templateType:  session.templateType,
              visibleBlocks: templateToVisibleBlocks(tpl),
              blockOrder:    templateToBlockOrder(tpl),
            },
            true,
          )
        } else {
          initSession(session.id as SessionId, { templateType: session.templateType })
        }
      }

      setState({ loading: false, error: null })
    })()

    return () => { cancelled = true }
  }, [courseId, hydrateSessions, initSession])

  return state}