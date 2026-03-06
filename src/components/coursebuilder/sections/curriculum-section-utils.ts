// Pure types, constants, and utility functions for CurriculumSection.
// No JSX — safe to import from non-React contexts.
import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"
import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import {
  calculateSessionDuration,
  getContentLoadConfig,
  MIN_TASKS_PER_OBJECTIVE,
  normalizeContentLoadConfig,
} from "@/lib/curriculum/content-load-service"
export interface ScheduleGeneratedEntry {
  id: string
  day: string
  date: string
  start_time?: string
  end_time?: string
  session?: number
}

export interface CurriculumSessionRow {
  id: string
  schedule_entry_id: string
  session_number: number
  title: string
  notes: string
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
  competencies?: CurriculumCompetency[]
  template_type?: TemplateType
}

export type PreviewMode = "modules" | "sessions" | "topics" | "objectives" | "tasks" | "all"

function padNames(names: string[], total: number, prefix: string): string[] {
  return Array.from({ length: total }, (_, i) => names[i] ?? `${prefix} ${i + 1}`)
}

export function objectiveNameIndex(topicIndex: number, objectiveIndex: number, objectivesPerTopic: number): number {
  return topicIndex * objectivesPerTopic + objectiveIndex
}

export function taskNameIndex(
  topicIndex: number,
  objectiveIndex: number,
  taskIndex: number,
  objectivesPerTopic: number,
  tasksPerObjective: number,
): number {
  return (topicIndex * objectivesPerTopic + objectiveIndex) * tasksPerObjective + taskIndex
}

export function normalizeObjectiveNames(
  names: string[] | undefined,
  topicCount: number,
  objectiveCount: number,
): string[] {
  const source = Array.isArray(names) ? names : []
  const fullLength = topicCount * objectiveCount
  if (source.length === fullLength) return padNames(source, fullLength, "Objective")
  if (source.length === objectiveCount) {
    // Legacy shape: one objective list reused across all topics.
    return padNames(
      Array.from({ length: fullLength }, (_, i) => source[i % objectiveCount] ?? ""),
      fullLength,
      "Objective",
    )
  }
  return padNames(source, fullLength, "Objective")
}

export function normalizeTaskNames(
  names: string[] | undefined,
  topicCount: number,
  objectiveCount: number,
  taskCount: number,
): string[] {
  const source = Array.isArray(names) ? names : []
  const fullLength = topicCount * objectiveCount * taskCount
  if (source.length === fullLength) return padNames(source, fullLength, "Task")
  if (source.length === taskCount) {
    // Legacy shape: one task list reused across all objectives/topics.
    return padNames(
      Array.from({ length: fullLength }, (_, i) => source[i % taskCount] ?? ""),
      fullLength,
      "Task",
    )
  }
  return padNames(source, fullLength, "Task")
}

export const CONTENT_VOLUME_DURATION_MAP: Record<string, number> = {
  mini: 30,
  single: 60,
  double: 120,
  triple: 180,
  fullday: 240,
  marathon: 241,
}

export function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `curr-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function extractExistingSessionRows(curriculumData: Record<string, unknown>): CurriculumSessionRow[] {
  const sessionRows = curriculumData.session_rows
  if (Array.isArray(sessionRows)) {
    return sessionRows.map((row, index) => {
      const r = row as Record<string, unknown>
      const durationMinutes = (r.duration_minutes as number) || undefined
      const normalizedCounts = normalizeContentLoadConfig(
        {
          topicsPerLesson: (r.topics as number) || 1,
          objectivesPerTopic: (r.objectives as number) || 2,
          tasksPerObjective: (r.tasks as number) || MIN_TASKS_PER_OBJECTIVE,
        },
        durationMinutes ?? null,
      )
      const topicCount = normalizedCounts.topicsPerLesson
      const objectiveCount = normalizedCounts.objectivesPerTopic
      const taskCount = normalizedCounts.tasksPerObjective
      return {
        id: (r.id as string) || createRowId(),
        schedule_entry_id: (r.schedule_entry_id as string) || "",
        session_number: (r.session_number as number) || index + 1,
        title: (r.title as string) || `Session ${index + 1}`,
        notes: (r.notes as string) || "",
        duration_minutes: durationMinutes,
        topics: topicCount,
        objectives: objectiveCount,
        tasks: taskCount,
        topic_names: Array.isArray(r.topic_names) ? (r.topic_names as string[]) : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`),
        objective_names: normalizeObjectiveNames(
          Array.isArray(r.objective_names) ? (r.objective_names as string[]) : undefined,
          topicCount,
          objectiveCount,
        ),
        task_names: normalizeTaskNames(
          Array.isArray(r.task_names) ? (r.task_names as string[]) : undefined,
          topicCount,
          objectiveCount,
          taskCount,
        ),
        competencies: (r.competencies as CurriculumCompetency[]) || undefined,
        template_type: (r.template_type as TemplateType) || "lesson",
      }
    })
  }

  const lessons = curriculumData.lessons
  if (Array.isArray(lessons)) {
    return lessons.map((lesson, index) => {
      const l = lesson as Record<string, unknown>
      return {
        id: createRowId(),
        schedule_entry_id: (l.scheduleEntryId as string) || "",
        session_number: ((l.sessionNumber ?? l.lessonNumber) as number) || index + 1,
        title: (l.title as string) || `Session ${index + 1}`,
        notes: (l.notes as string) || "",
        topic_names: [],
        objective_names: [],
        task_names: [],
      }
    })
  }

  return []
}

export function syncSessionRowsToSchedule(
  scheduleEntries: ScheduleGeneratedEntry[],
  existingRows: CurriculumSessionRow[],
): CurriculumSessionRow[] {
  if (scheduleEntries.length === 0) return existingRows

  const byScheduleId = new Map(existingRows.map((row) => [row.schedule_entry_id, row]))

  return scheduleEntries.map((entry, index) => {
    const byId = byScheduleId.get(entry.id)
    const byIndex = existingRows[index]
    const base = byId ?? byIndex

    const durationMinutes = calculateSessionDuration(entry.start_time, entry.end_time)
    const contentLoadConfig = durationMinutes ? getContentLoadConfig(durationMinutes) : null
    const normalizedCounts = normalizeContentLoadConfig(
      {
        topicsPerLesson: base?.topics ?? contentLoadConfig?.topicsPerLesson ?? 1,
        objectivesPerTopic: base?.objectives ?? contentLoadConfig?.objectivesPerTopic ?? 2,
        tasksPerObjective: base?.tasks ?? contentLoadConfig?.tasksPerObjective ?? MIN_TASKS_PER_OBJECTIVE,
      },
      durationMinutes,
    )
    const topicCount = base?.topics ?? normalizedCounts.topicsPerLesson
    const objectiveCount = base?.objectives ?? normalizedCounts.objectivesPerTopic
    const taskCount = base?.tasks ?? normalizedCounts.tasksPerObjective

    return {
      id: base?.id || createRowId(),
      schedule_entry_id: entry.id,
      session_number: index + 1,
      title: base?.title || `Session ${index + 1}`,
      notes: base?.notes || "",
      duration_minutes: base?.duration_minutes ?? durationMinutes ?? undefined,
      topics: topicCount,
      objectives: objectiveCount,
      tasks: taskCount,
      topic_names: Array.from(
        { length: topicCount },
        (_, i) => base?.topic_names?.[i] ?? `Topic ${i + 1}`,
      ),
      objective_names: normalizeObjectiveNames(
        base?.objective_names,
        topicCount,
        objectiveCount,
      ),
      task_names: normalizeTaskNames(
        base?.task_names,
        topicCount,
        objectiveCount,
        taskCount,
      ),
      competencies: base?.competencies,
      template_type: base?.template_type ?? "lesson",
    }
  })
}
export function formatEstimate(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return "Est. varies"
  const seconds = Math.max(15, Math.round(totalSeconds / 10) * 10)
  if (seconds < 90) return `Est. ${seconds}s`
  const mins = Math.floor(seconds / 60)
  const rem = seconds % 60
  return rem > 0 ? `Est. ${mins}m ${rem}s` : `Est. ${mins}m`
}

export const GENERATION_ACTION_CONFIG: Array<{
  key: GenerationAction
  label: string
  description: string
  primary?: boolean
}> = [
  { key: "all", label: "Generate All", description: "Modules, sessions, topics, objectives, and tasks.", primary: true },
  { key: "modules", label: "Generate Module Names", description: "Auto-title modules based on structure." },
  { key: "sessions", label: "Generate Session Names", description: "Create session titles for each session." },
  { key: "topics", label: "Generate Topic Titles", description: "Fill in topics per session." },
  { key: "objectives", label: "Generate Objectives", description: "Add objectives aligned to topics." },
  { key: "tasks", label: "Generate Tasks", description: "Create tasks per objective." },
]