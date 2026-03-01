/**
 * useCourseSessionLoader
 *
 * Fetches `curriculum_data` (plus course-level metadata) for the given
 * courseId from Supabase and maps each `session_row` entry into a
 * `CourseSession` — including the full Topic → Objective → Task tree —
 * then hydrates the Zustand course store.
 *
 * Canvas pages are generated from the template definition:
 *   Page 1   — session-once blocks (program / resources), if the template has them.
 *   Page 2+  — one page per remaining content block (content, assignment, scoring, …).
 * Templates with no session-once blocks start on a single page.
 * Overflow detection appends further pages automatically at runtime.
 *
 * Call this once in CreateEditorLayout so the store is populated on mount.
 */

import { useEffect, useState } from "react"
import { selectCourseById } from "@/components/coursebuilder/course-queries"
import { useCourseStore } from "../store/courseStore"
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
} from "../types"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import { getTemplateDefinition } from "../templates/definitions"

// ─── Raw DB shape (subset of CurriculumSessionRow) ────────────────────────────

interface RawSessionRow {
  id?: string
  session_number?: number
  title?: string
  template_type?: string
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
  schedule_date?: string
}

// ─── Course-level meta passed down from the query result ──────────────────────

interface CourseMeta {
  courseTitle: string
  institution: string
  teacherName: string
  pedagogy: string
  moduleNames: string[]
  totalSessions: number
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/** Derive module name for this session index from a module-names array. */
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

  const topicCount     = rawRow.topics     ?? 1
  const objectiveCount = rawRow.objectives ?? 2
  const taskCount      = rawRow.tasks      ?? 2

  const topicNames = rawRow.topic_names?.length
    ? rawRow.topic_names
    : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`)

  const objectiveNames = rawRow.objective_names?.length
    ? rawRow.objective_names
    : Array.from({ length: topicCount * objectiveCount }, (_, i) => `Objective ${i + 1}`)

  const taskNames = rawRow.task_names?.length
    ? rawRow.task_names
    : Array.from({ length: topicCount * objectiveCount * taskCount }, (_, i) => `Task ${i + 1}`)

  const topics: Topic[] = Array.from({ length: topicCount }, (_, ti) => {
    const topicId = `${sessionId}-t${ti}` as TopicId

    const objectives: Objective[] = Array.from({ length: objectiveCount }, (_, oi) => {
      const objFlatIndex = ti * objectiveCount + oi
      const objectiveId  = `${topicId}-o${oi}` as ObjectiveId

      const tasks: Task[] = Array.from({ length: taskCount }, (_, ki) => {
        const taskFlatIndex = objFlatIndex * taskCount + ki
        return {
          id:          `${objectiveId}-k${ki}` as TaskId,
          objectiveId,
          label:       taskNames[taskFlatIndex] ?? `Task ${taskFlatIndex + 1}`,
          order:       ki,
          droppedCards: [],
        }
      })

      return {
        id:      objectiveId,
        topicId,
        label:   objectiveNames[objFlatIndex] ?? `Objective ${objFlatIndex + 1}`,
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

  // ── Canvas pages ──────────────────────────────────────────────────────────
  // Build initial pages driven by the template definition:
  //   Page 1 — session-once blocks (program, resources) if the template has them.
  //   Page 2+ — each content block (content, assignment, scoring, …) on its own page.
  // Templates with no session-once blocks start with a single page.
  // Overflow detection appends further pages automatically at runtime.

  const SESSION_ONCE: Set<BlockKey> = new Set(["program", "resources"])

  const def = getTemplateDefinition(templateType as TemplateType)
  const bodyBlocks = def.blocks
    .filter((b) => b.key !== "header" && b.key !== "footer" && b.defaultVisible)
    .map((b) => b.key as BlockKey)

  const sessionOnceKeys = bodyBlocks.filter((k) => SESSION_ONCE.has(k))
  const contentKeys     = bodyBlocks.filter((k) => !SESSION_ONCE.has(k))

  const canvases: CanvasPage[] = []
  let   pageNum = 1

  if (sessionOnceKeys.length > 0) {
    canvases.push({
      id:         `${sessionId}-canvas-${pageNum}` as CanvasId,
      sessionId,
      pageNumber: pageNum++,
      blockKeys:  sessionOnceKeys,
    })
  }

  if (contentKeys.length > 0) {
    // Give each content block its own page so overflow detection per-block works cleanly.
    contentKeys.forEach((key) => {
      canvases.push({
        id:         `${sessionId}-canvas-${pageNum}` as CanvasId,
        sessionId,
        pageNumber: pageNum++,
        blockKeys:  [key],
      })
    })
  }

  // Safety: always have at least one canvas
  if (canvases.length === 0) {
    canvases.push({ id: `${sessionId}-canvas-1` as CanvasId, sessionId, pageNumber: 1 })
  }

  return {
    id:              sessionId,
    courseId:        courseId as CourseId,
    order:           rawRow.session_number ?? index + 1,
    title:           rawRow.title ?? `Session ${index + 1}`,
    templateType,
    canvases,
    topics,
    durationMinutes: rawRow.duration_minutes,
    // Course-level metadata
    courseTitle:  meta.courseTitle,
    institution:  meta.institution,
    teacherName:  meta.teacherName,
    pedagogy:     meta.pedagogy,
    moduleName:   resolveModuleName(index, meta.totalSessions, meta.moduleNames),
    scheduleDate: rawRow.schedule_date ?? "",
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface LoaderState {
  loading: boolean
  error:   string | null
}

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
      const { data, error } = await selectCourseById<Record<string, unknown>>(
        courseId,
        "course_name, institution, course_settings, curriculum_data",
      )

      if (cancelled) return

      if (error || !data) {
        setState({ loading: false, error: "Failed to load course sessions." })
        return
      }

      const curriculum    = (data.curriculum_data  as Record<string, unknown> | null) ?? {}
      const courseSettings = (data.course_settings as Record<string, unknown> | null) ?? {}
      const rowsRaw       = Array.isArray(curriculum.session_rows) ? curriculum.session_rows : []

      // Resolve course-level meta that will be forwarded to every session
      const moduleNames: string[] = Array.isArray(curriculum.module_names)
        ? (curriculum.module_names as unknown[]).map((n) => String(n ?? "")).filter(Boolean)
        : []

      const meta: CourseMeta = {
        courseTitle:   String(data.course_name  ?? ""),
        institution:   String(data.institution  ?? ""),
        teacherName:   String(courseSettings.teacher_name ?? ""),
        pedagogy:      String(courseSettings.course_pedagogy ?? courseSettings.pedagogy ?? ""),
        moduleNames,
        totalSessions: (rowsRaw as unknown[]).length,
      }

      const sessions: CourseSession[] = (rowsRaw as RawSessionRow[]).map((row, i) =>
        mapRowToSession(row, i, courseId, meta),
      )

      hydrateSessions(sessions)
      setState({ loading: false, error: null })
    })()

    return () => { cancelled = true }
  }, [courseId, hydrateSessions])

  return state
}
