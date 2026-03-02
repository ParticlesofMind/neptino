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
  BlockKey,
} from "../create/types"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import {
  defaultEnabled,
  defaultFieldEnabled,
  type LocalTemplate,
  type BlockId,
} from "@/components/coursebuilder/sections/template-section-data"

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

// ─── Template helpers ─────────────────────────────────────────────────────────

/** Find the best-matching LocalTemplate for a given session row. */
export function findTemplate(
  templateId: string | undefined,
  templateType: TemplateType,
  templates: LocalTemplate[],
): LocalTemplate | null {
  if (templateId) {
    const byId = templates.find((t) => t.id === templateId)
    if (byId) return byId
  }
  return templates.find((t) => t.type === templateType) ?? null
}

/** Convert LocalTemplate.enabled → visibleBlocks array. */
export function templateToVisibleBlocks(template: LocalTemplate): BlockKey[] {
  return (Object.entries(template.enabled) as [BlockId, boolean][])
    .filter(([, on]) => on)
    .map(([k]) => k as BlockKey)
}

/** Convert LocalTemplate blockOrder + enabled → ordered body-block keys. */
export function templateToBlockOrder(template: LocalTemplate): BlockKey[] {
  const base = (template.blockOrder ?? (Object.keys(template.enabled) as BlockId[]))
  return base
    .filter((k) => k !== "header" && k !== "footer" && (template.enabled[k] ?? false))
    .map((k) => k as BlockKey)
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
    fieldEnabled:    defaultFieldEnabled(templateType, defaultEnabled()),
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

  return {
    ...derived,
    ...(savedTopics   ? { topics:   overlayDroppedCards(derived.topics, savedTopics) } : {}),
    ...(savedCanvases ? { canvases: savedCanvases } : {}),
  }
}
