/**
 * useCourseSessionLoader
 *
 * Loads the full canvas-editor state for a course from Supabase and hydrates
 * the Zustand stores.  Two queries run in parallel:
 *
 *   1. courses row  — curriculum structure, schedule, template settings,
 *                     course-level metadata.
 *   2. lessons rows — previously-saved CourseSession snapshots (topics tree,
 *                     canvas pages, dropped cards, fieldEnabled).
 *
 * Merge strategy
 * ──────────────
 * For each session a "derived" session is first built from curriculum_data
 * (template type, title, duration, course-level meta).  If a matching lessons
 * row exists the saved topics + canvases are overlaid on top so dropped cards
 * and pagination state survive page reloads.
 *
 * Template config
 * ───────────────
 * After hydrateSessions the loader calls templateStore.initSession(…, force:true)
 * for every session with the visibleBlocks / blockOrder / fieldEnabled from the
 * matched LocalTemplate inside courses.template_settings.  This makes the
 * setup-wizard template configuration the authoritative source of truth for
 * the canvas editor rather than the hardcoded definition defaults.
 *
 * Canvas pages are generated from the template definition:
 *   Page 1   — session-once blocks (program / resources), if any.
 *   Page 2+  — remaining content blocks.
 * Overflow detection appends further pages automatically at runtime.
 *
 * Call this once in CreateEditorLayout so all stores are populated on mount.
 */

import { useEffect, useState } from "react"
import { selectCourseById, selectLessonsByCourseId, type LessonRow } from "@/components/coursebuilder/course-queries"
import { useCourseStore } from "../store/courseStore"
import { useTemplateStore } from "../store/templateStore"
import {
  normalizeTemplate,
  normalizeTemplateSettings,
  defaultEnabled,
  defaultFieldEnabled,
  type LocalTemplate,
  type BlockId,
} from "@/components/coursebuilder/sections/template-section-data"
import type {
  CourseId,
  SessionId,
  TopicId,
  ObjectiveId,
  TaskId,
  CanvasId,
  CourseSession,
  Topic,
  Objective,
  Task,
  CanvasPage,
  BlockKey,
  TemplateFieldState,
} from "../types"
import type { TemplateType } from "@/lib/curriculum/template-blocks"

// ─── Raw DB shape (subset of CurriculumSessionRow) ────────────────────────────

interface RawSessionRow {
  id?: string
  session_number?: number
  title?: string
  template_type?: string
  template_id?: string
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
  schedule_date?: string
}

interface RawScheduleEntry {
  id?: string
  session?: number
  day?: string
  date?: string
  start_time?: string
  end_time?: string
}

// ─── Course-level meta passed down from the query result ──────────────────────

interface CourseMeta {
  courseTitle: string
  institution: string
  teacherName: string
  pedagogy: string
  moduleNames: string[]
  totalSessions: number
  topicsPerLesson: number
  objectivesPerTopic: number
  tasksPerObjective: number
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/** Find the best-matching LocalTemplate for a given session row. */
function findTemplate(
  templateId: string | undefined,
  templateType: TemplateType,
  templates: LocalTemplate[],
): LocalTemplate | null {
  if (templateId) {
    const byId = templates.find((t) => t.id === templateId)
    if (byId) return byId
  }
  // Fallback: first template matching the type
  return templates.find((t) => t.type === templateType) ?? null
}

/** Convert LocalTemplate.enabled → visibleBlocks array (all blocks that are on). */
function templateToVisibleBlocks(template: LocalTemplate): BlockKey[] {
  return (Object.entries(template.enabled) as [BlockId, boolean][])
    .filter(([, on]) => on)
    .map(([k]) => k as BlockKey)
}

/** Convert LocalTemplate blockOrder + enabled → ordered body-block keys (no header/footer). */
function templateToBlockOrder(template: LocalTemplate): BlockKey[] {
  const base = (template.blockOrder ?? (Object.keys(template.enabled) as BlockId[]))
  return base
    .filter((k) => k !== "header" && k !== "footer" && (template.enabled[k] ?? false))
    .map((k) => k as BlockKey)
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function resolveModuleName(index: number, total: number, moduleNames: string[]): string {
  if (moduleNames.length === 0) return ""
  if (moduleNames.length === 1) return moduleNames[0] ?? ""
  const perModule = Math.max(1, Math.ceil(total / moduleNames.length))
  const moduleIndex = Math.min(moduleNames.length - 1, Math.floor(index / perModule))
  return moduleNames[moduleIndex] ?? ""
}

function mapRowToSession(
  rawRow: RawSessionRow,
  index: number,
  courseId: string,
  meta: CourseMeta,
): CourseSession {
  const sessionId = ((rawRow.id ?? `session-${index}`) as SessionId)
  const templateType = (rawRow.template_type ?? "lesson") as TemplateType

  const topicCount         = rawRow.topics     ?? meta.topicsPerLesson
  const objectivesPerTopic = rawRow.objectives ?? meta.objectivesPerTopic
  const tasksPerObjective  = rawRow.tasks      ?? meta.tasksPerObjective

  const topicNames = rawRow.topic_names?.filter(Boolean).length
    ? rawRow.topic_names!.filter(Boolean)
    : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`)

  const objectiveNames = rawRow.objective_names?.filter(Boolean).length
    ? rawRow.objective_names!.filter(Boolean)
    : Array.from({ length: objectivesPerTopic }, (_, i) => `Objective ${i + 1}`)

  const taskNames = rawRow.task_names?.filter(Boolean).length
    ? rawRow.task_names!.filter(Boolean)
    : Array.from({ length: tasksPerObjective }, (_, i) => `Task ${i + 1}`)

  const topics: Topic[] = Array.from({ length: topicCount }, (_, ti) => {
    const topicId = `${sessionId}-t${ti}` as TopicId

    const objectives: Objective[] = Array.from({ length: objectivesPerTopic }, (_, oi) => {
      const objectiveId = `${topicId}-o${oi}` as ObjectiveId

      const tasks: Task[] = Array.from({ length: tasksPerObjective }, (_, ki) => ({
        id:           `${objectiveId}-k${ki}` as TaskId,
        objectiveId,
        label:        taskNames[ki] ?? `Task ${ki + 1}`,
        order:        ki,
        droppedCards: [],
      }))

      return {
        id:      objectiveId,
        topicId,
        label:   objectiveNames[oi] ?? `Objective ${oi + 1}`,
        order:   oi,
        tasks,
      }
    })

    return {
      id:        topicId,
      sessionId,
      label:     topicNames[ti] ?? `Topic ${ti + 1}`,
      order:     ti,
      objectives,
    }
  })

  const canvases: CanvasPage[] = [
    { id: `${sessionId}-canvas-1` as CanvasId, sessionId, pageNumber: 1 },
  ]

  return {
    id:              sessionId,
    courseId:        courseId as CourseId,
    order:           rawRow.session_number ?? index + 1,
    title:           rawRow.title ?? `Session ${index + 1}`,
    templateType,
    canvases,
    topics,
    durationMinutes: rawRow.duration_minutes,
    courseTitle:     meta.courseTitle,
    institution:     meta.institution,
    teacherName:     meta.teacherName,
    pedagogy:        meta.pedagogy,
    moduleName:      resolveModuleName(index, meta.totalSessions, meta.moduleNames),
    scheduleDate:    rawRow.schedule_date ?? "",
  }
}

// ─── Saved-lesson merge ───────────────────────────────────────────────────────

/**
 * Restore dropped cards from a previously-saved lesson onto freshly-derived
 * topics from curriculum_data.  Matching is positional (topic index /
 * objective index / task index) so topic names, counts, and order from
 * curriculum_data always win.
 *
 * - If the curriculum grew (new topics/objectives/tasks added), new positions
 *   start empty.
 * - If it shrank, cards at removed positions are discarded — the teacher
 *   intentionally changed the curriculum structure.
 */
function overlayDroppedCards(derived: Topic[], saved: Topic[]): Topic[] {
  return derived.map((topic, ti) => ({
    ...topic,
    objectives: topic.objectives.map((obj, oi) => ({
      ...obj,
      tasks: obj.tasks.map((task, ki) => {
        const savedCards = saved[ti]?.objectives[oi]?.tasks[ki]?.droppedCards
        return savedCards?.length ? { ...task, droppedCards: savedCards } : task
      }),
    })),
  }))
}

/**
 * Overlay a previously-saved lesson payload onto a freshly-derived session.
 *
 * Ownership split:
 *   Topic structure (names, count, order) ← curriculum_data (derived)
 *   Dropped cards                         ← lessons.payload (saved), by position
 *   Canvas pages (pagination state)       ← lessons.payload (saved), fully
 *   fieldEnabled                          ← template_settings (applied after this)
 *
 * This means curriculum wizard edits (renames, adding/removing sessions or
 * topics) take immediate effect, while canvas work (dropped cards, pagination)
 * is preserved as long as the positional structure matches.
 */
function mergeSavedLesson(
  derived: CourseSession,
  saved: LessonRow,
): CourseSession {
  const p = saved.payload

  const savedTopics   = Array.isArray(p.topics)   ? (p.topics   as Topic[])      : null
  const savedCanvases = Array.isArray(p.canvases) ? (p.canvases as CanvasPage[]) : null

  return {
    ...derived,
    // Restore only dropped cards from saved data; topic structure comes from
    // curriculum_data so wizard edits are always reflected immediately.
    ...(savedTopics   ? { topics:   overlayDroppedCards(derived.topics, savedTopics) } : {}),
    // Canvas pages (block layout, pagination state) are fully restored.
    ...(savedCanvases ? { canvases: savedCanvases } : {}),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface LoaderState {
  loading: boolean
  error:   string | null
}

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
      // Run both queries in parallel to minimise load time.
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
      const lessonsMap = new Map<number, LessonRow>()
      for (const row of lessonsResult.data) {
        lessonsMap.set(row.lesson_number, row)
      }

      // ── Build session rows from curriculum_data ──────────────────────────
      let rowsRaw: RawSessionRow[] = Array.isArray(curriculum.session_rows)
        ? (curriculum.session_rows as RawSessionRow[])
        : []

      // Fallback: if curriculum was skipped build placeholders from schedule
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
      const sessions: CourseSession[] = rowsRaw.map((row, i) => {
        const derived    = mapRowToSession(row, i, courseId, meta)
        const sessionNum = derived.order  // lesson_number = session order (1-based)
        const saved      = lessonsMap.get(sessionNum)

        // Overlay saved lesson data (topics, canvases).
        // fieldEnabled is NOT taken from saved data — template_settings is the
        // source of truth for field visibility (same as visibleBlocks/blockOrder
        // in the templateStore which also uses force=true).
        const merged = saved ? mergeSavedLesson(derived, saved) : derived

        // Always derive fieldEnabled from the matched template so that any
        // change made in the setup-wizard template configurator is immediately
        // reflected in the canvas, regardless of what was previously persisted.
        const tpl = findTemplate(
          (row as RawSessionRow & { template_id?: string }).template_id,
          derived.templateType,
          templates,
        )
        if (tpl?.fieldEnabled) {
          return { ...merged, fieldEnabled: tpl.fieldEnabled }
        }

        // No template matched — derive required-only defaults so optional fields
        // (e.g. teacher_name) remain hidden until explicitly enabled in a template.
        return {
          ...merged,
          fieldEnabled: defaultFieldEnabled(derived.templateType, defaultEnabled()),
        }
      })

      hydrateSessions(sessions)

      // ── Apply template config to templateStore ───────────────────────────
      // Use force=true so Supabase template_settings always wins over any
      // stale config that may have been persisted to localStorage.
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
            true, // force — Supabase is source of truth
          )
        } else {
          // No saved template — let the store derive defaults from the definition.
          initSession(session.id as SessionId, { templateType: session.templateType })
        }
      }

      setState({ loading: false, error: null })
    })()

    return () => { cancelled = true }
  }, [courseId, hydrateSessions, initSession])

  return state
}

