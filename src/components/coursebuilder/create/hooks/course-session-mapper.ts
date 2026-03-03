/**
 * Course Session Mapper
 *
 * Types, interfaces, and pure helper functions used by useCourseSessionLoader.
 * Extracted here to keep the hook file focused on the effect/state logic.
 */

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
} from "../types"

// ─── Raw DB shape (subset of CurriculumSessionRow) ────────────────────────────

export interface RawSessionRow {
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

export interface RawScheduleEntry {
  id?: string
  session?: number
  day?: string
  date?: string
  start_time?: string
  end_time?: string
}

// ─── Course-level meta ────────────────────────────────────────────────────────

export interface CourseMeta {
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

// ─── Loader state ─────────────────────────────────────────────────────────────

export interface LoaderState {
  loading: boolean
  error:   string | null
}

// ─── Session mapper ───────────────────────────────────────────────────────────

function resolveModuleName(index: number, total: number, moduleNames: string[]): string {
  if (moduleNames.length === 0) return ""
  if (moduleNames.length === 1) return moduleNames[0] ?? ""
  const perModule = Math.max(1, Math.ceil(total / moduleNames.length))
  const moduleIndex = Math.min(moduleNames.length - 1, Math.floor(index / perModule))
  return moduleNames[moduleIndex] ?? ""
}

export function mapRowToSession(
  rawRow: RawSessionRow,
  index: number,
  courseId: string,
  meta: CourseMeta,
): CourseSession {
  const sessionId = ((rawRow.id ?? `session-${index}`) as SessionId)

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
    {
      id:        `${sessionId}-canvas-1` as CanvasId,
      sessionId,
      pageNumber: 1,
    },
  ]

  return {
    id:              sessionId,
    courseId:        courseId as CourseId,
    order:           rawRow.session_number ?? index + 1,
    title:           rawRow.title ?? `Session ${index + 1}`,
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
 * topics from curriculum_data. Matching is positional.
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

import type { LessonRow } from "@/components/coursebuilder/course-queries"

/**
 * Overlay a previously-saved lesson payload onto a freshly-derived session.
 * Topic structure always wins from curriculum_data; dropped cards and canvas
 * pagination come from the saved lesson payload.
 */
export function mergeSavedLesson(
  derived: CourseSession,
  saved: LessonRow,
): CourseSession {
  const p = saved.payload

  const savedTopics   = Array.isArray(p.topics)   ? (p.topics   as Topic[])      : null
  const savedCanvases = Array.isArray(p.canvases) ? (p.canvases as CanvasPage[]) : null

  // Re-anchor every canvas ID and sessionId to the *derived* session.
  // Saved payloads are matched by lesson_number, so an old payload can contain
  // IDs that embed a previous session's UUID.  If two sessions end up with the
  // same canvas ID (e.g. both "<old-uuid>-canvas-1"), the virtualizer receives
  // duplicate React keys and canvasStore lookups bleed across sessions.
  const anchoredCanvases = savedCanvases
    ? savedCanvases.map((c, i) => ({
        ...c,
        id:        `${derived.id}-canvas-${i + 1}` as CanvasId,
        sessionId: derived.id as SessionId,
        blockKeys: undefined,
      }))
    : null

  return {
    ...derived,
    ...(savedTopics      ? { topics:   overlayDroppedCards(derived.topics, savedTopics) } : {}),
    ...(anchoredCanvases ? { canvases: anchoredCanvases }                                 : {}),
  }
}
