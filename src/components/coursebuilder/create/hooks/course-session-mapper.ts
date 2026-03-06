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
  BlockKey,
  CourseSession,
  Topic,
  Objective,
  Task,
  CanvasPage,
} from "../types"
import { getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"

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
  /** Per-template-type fieldState map; keyed by template type string (e.g. "lesson"). */
  fieldStateByType?: Record<string, Partial<Record<string, Record<string, boolean>>>>
}

function objectiveFlatIndex(topicIndex: number, objectiveIndex: number, objectivesPerTopic: number): number {
  return topicIndex * objectivesPerTopic + objectiveIndex
}

function taskFlatIndex(
  topicIndex: number,
  objectiveIndex: number,
  taskIndex: number,
  objectivesPerTopic: number,
  tasksPerObjective: number,
): number {
  return (topicIndex * objectivesPerTopic + objectiveIndex) * tasksPerObjective + taskIndex
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

  // Preserve positional indexes from curriculum_data as-is. Filtering out empty
  // values collapses sparse arrays and can incorrectly reuse one name across
  // multiple topic/objective/task branches.
  const topicNames = Array.isArray(rawRow.topic_names)
    ? rawRow.topic_names.map((name) => String(name ?? ""))
    : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`)

  const objectiveNames = Array.isArray(rawRow.objective_names)
    ? rawRow.objective_names.map((name) => String(name ?? ""))
    : Array.from({ length: objectivesPerTopic }, (_, i) => `Objective ${i + 1}`)

  const taskNames = Array.isArray(rawRow.task_names)
    ? rawRow.task_names.map((name) => String(name ?? ""))
    : Array.from({ length: tasksPerObjective }, (_, i) => `Task ${i + 1}`)

  const expectedObjectiveNames = topicCount * objectivesPerTopic
  const hasTopicScopedObjectives = objectiveNames.length === expectedObjectiveNames
  const expectedTaskNames = topicCount * objectivesPerTopic * tasksPerObjective
  const hasScopedTasks = taskNames.length === expectedTaskNames

  const topics: Topic[] = Array.from({ length: topicCount }, (_, ti) => {
    const topicId = `${sessionId}-t${ti}` as TopicId

    const objectives: Objective[] = Array.from({ length: objectivesPerTopic }, (_, oi) => {
      const objectiveId = `${topicId}-o${oi}` as ObjectiveId

      const tasks: Task[] = Array.from({ length: tasksPerObjective }, (_, ki) => ({
        id:           `${objectiveId}-k${ki}` as TaskId,
        objectiveId,
        label: hasScopedTasks
          ? taskNames[taskFlatIndex(ti, oi, ki, objectivesPerTopic, tasksPerObjective)] ?? `Task ${ki + 1}`
          : taskNames[ki] ?? `Task ${ki + 1}`,
        order:        ki,
        droppedCards: [],
      }))

      return {
        id:      objectiveId,
        topicId,
        label:   hasTopicScopedObjectives
          ? objectiveNames[objectiveFlatIndex(ti, oi, objectivesPerTopic)] ?? `Objective ${oi + 1}`
          : objectiveNames[oi] ?? `Objective ${oi + 1}`,
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

  const templateType = (rawRow.template_type ?? "lesson") as TemplateType
  const blockKeys = getDefaultBlocksForType(templateType) as BlockKey[]

  const canvases: CanvasPage[] = [
    {
      id:        `${sessionId}-canvas-1` as CanvasId,
      sessionId,
      pageNumber: 1,
      blockKeys,
    },
  ]

  return {
    id:              sessionId,
    courseId:        courseId as CourseId,
    order:           rawRow.session_number ?? index + 1,
    title:           rawRow.title ?? `Session ${index + 1}`,
    canvases,
    topics,
    templateType,
    fieldEnabled:    meta.fieldStateByType?.[templateType],
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
        if (!savedCards?.length) return task
        return {
          ...task,
          droppedCards: savedCards.map((card) => ({
            ...card,
            taskId: task.id,
          })),
        }
      }),
    })),
  }))
}

function normaliseNonOverlappingRanges(canvases: CanvasPage[]): CanvasPage[] {
  // ── Forward pass: ensure range starts are monotonically non-decreasing ──────
  let topicCursor = 0
  let objectiveCursor = 0
  let cardCursor = 0

  const result: CanvasPage[] = canvases.map((canvas, idx) => {
    const next: CanvasPage = {
      ...canvas,
      pageNumber: idx + 1,
    }

    if (next.contentTopicRange) {
      const start = Math.max(topicCursor, next.contentTopicRange.start ?? topicCursor)
      const end =
        typeof next.contentTopicRange.end === "number"
          ? Math.max(start, next.contentTopicRange.end)
          : undefined
      next.contentTopicRange = { start, ...(end !== undefined ? { end } : {}) }
      topicCursor = end ?? start
    }

    if (next.contentObjectiveRange) {
      const start = Math.max(objectiveCursor, next.contentObjectiveRange.start ?? objectiveCursor)
      const end =
        typeof next.contentObjectiveRange.end === "number"
          ? Math.max(start, next.contentObjectiveRange.end)
          : undefined
      next.contentObjectiveRange = { start, ...(end !== undefined ? { end } : {}) }
      objectiveCursor = end ?? start
    }

    if (next.contentCardRange) {
      const start = Math.max(cardCursor, next.contentCardRange.start ?? cardCursor)
      const end =
        typeof next.contentCardRange.end === "number"
          ? Math.max(start, next.contentCardRange.end)
          : undefined
      next.contentCardRange = { start, ...(end !== undefined ? { end } : {}) }
      cardCursor = end ?? start
    }

    return next
  })

  // ── Backward fill: cap open-ended ranges using the following page's start ───
  //
  // Prevents content overlap when page N has an open-ended range (or no range
  // at all) while page N+1 already has a definite start index.  This is the
  // root cause of the card-duplication bug: if an old saved session had page 1
  // with no contentTopicRange but page 2 starting at topic 3, page 1 would
  // render all topics (0..N) including those "owned" by page 2, making cards
  // dropped into topic 3 visible on every page.
  //
  // Rules per range type:
  //   • If page N has the range but no end  → fill end from page N+1's start.
  //   • If page N has no range at all       → assign { start: 0, end: N+1's start }
  //     (only when page N+1 has a range, meaning a split point exists).
  for (let i = 0; i < result.length - 1; i++) {
    const curr = result[i]!
    const succ = result[i + 1]!

    const nextTopicStart = succ.contentTopicRange?.start
    if (nextTopicStart !== undefined) {
      if (curr.contentTopicRange) {
        if (curr.contentTopicRange.end === undefined) {
          curr.contentTopicRange = { ...curr.contentTopicRange, end: nextTopicStart }
        }
      } else {
        curr.contentTopicRange = { start: 0, end: nextTopicStart }
      }
    }

    const nextObjStart = succ.contentObjectiveRange?.start
    if (nextObjStart !== undefined) {
      if (curr.contentObjectiveRange) {
        if (curr.contentObjectiveRange.end === undefined) {
          curr.contentObjectiveRange = { ...curr.contentObjectiveRange, end: nextObjStart }
        }
      } else {
        curr.contentObjectiveRange = { start: 0, end: nextObjStart }
      }
    }

    const nextCardStart = succ.contentCardRange?.start
    if (nextCardStart !== undefined) {
      if (curr.contentCardRange) {
        if (curr.contentCardRange.end === undefined) {
          curr.contentCardRange = { ...curr.contentCardRange, end: nextCardStart }
        }
      } else {
        curr.contentCardRange = { start: 0, end: nextCardStart }
      }
    }
  }

  return result
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
  const derivedBlockKeys = getDefaultBlocksForType(
    (derived.templateType ?? "lesson") as TemplateType,
  ) as BlockKey[]

  // Content-type blocks shown on continuation pages (no header/footer/fixed blocks).
  // These are the blocks that repeat on every overflow page alongside their content slice.
  const FIXED_BODY_BLOCKS = new Set(["header", "footer", "program", "resources", "project"])
  const continuationBlockKeys = derivedBlockKeys.filter(
    (k) => !FIXED_BODY_BLOCKS.has(k),
  ) as BlockKey[]

  const anchoredCanvases = savedCanvases
    ? savedCanvases
        .filter((c, i) => {
          if (i === 0) return true
          // Drop continuation pages that have no range set — these are
          // corrupt / legacy saves that would show duplicate content.
          return !!(
            c.contentTopicRange ??
            c.contentObjectiveRange ??
            c.contentCardRange
          )
        })
        .map((c, i) => ({
          ...c,
          id:        `${derived.id}-canvas-${i + 1}` as CanvasId,
          sessionId: derived.id as SessionId,
          // Page 1 gets the full template block list; continuation pages
          // get only the content-type blocks (content + assignment for lesson,
          // scoring for quiz, etc.) — no fixed blocks (program/resources) repeating.
          blockKeys: i === 0 ? derivedBlockKeys : continuationBlockKeys,
        }))
    : null

  const normalisedCanvases = anchoredCanvases
    ? anchoredCanvases.map((c) => {
        if (anchoredCanvases.length > 1) return c
        const {
          contentTopicRange: _topicRange,
          contentObjectiveRange: _objectiveRange,
          contentCardRange: _cardRange,
          ...rest
        } = c
        return rest
      })
    : null

  const safeCanvases = normalisedCanvases
    ? normaliseNonOverlappingRanges(normalisedCanvases)
    : null

  return {
    ...derived,
    ...(savedTopics      ? { topics:   overlayDroppedCards(derived.topics, savedTopics) } : {}),
    ...(safeCanvases ? { canvases: safeCanvases }                                         : {}),
  }
}
