// Pure types, constants, and utility functions for CurriculumSection.
// No JSX — safe to import from non-React contexts.
import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"
import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateDesignConfig, TemplateType } from "@/lib/curriculum/template-blocks"
import { createDefaultTemplateDesign } from "@/lib/curriculum/template-blocks"
import {
  calculateSessionDuration,
  getContentLoadConfig,
  MIN_TASKS_PER_OBJECTIVE,
  normalizeContentLoadConfig,
} from "@/lib/curriculum/content-load-service"
import { normalizeTemplateSettings } from "@/lib/curriculum/template-source-of-truth"
import type { CourseType } from "@/components/coursebuilder/sections/curriculum-derived"

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
  template_id?: string
  template_type?: TemplateType
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
  competencies?: CurriculumCompetency[]
  template_design?: TemplateDesignConfig
}

export interface SavedTemplateSummary {
  id: string
  name: string
  type: string
}

export const COURSE_TYPE_TEMPLATE_FILTERS: Record<CourseType, string[]> = {
  minimalist: ["lesson"],
  essential: ["lesson", "quiz", "assessment", "exam", "certificate"],
  complete: [],
  custom: [],
}

export function extractSavedTemplates(raw: unknown): SavedTemplateSummary[] {
  return normalizeTemplateSettings(raw).map((template) => ({
    id: template.id,
    name: template.name,
    type: template.type,
  }))
}

export type PreviewMode = "modules" | "lessons" | "topics" | "objectives" | "tasks" | "all"

export const TEMPLATE_TYPE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: "lesson", label: "Lesson" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "assessment", label: "Assessment" },
  { value: "certificate", label: "Certificate" },
]

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
      const templateType = ((r.template_type as string) || "lesson") as TemplateType
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
        template_id: (r.template_id as string) || undefined,
        template_type: templateType,
        duration_minutes: durationMinutes,
        topics: topicCount,
        objectives: objectiveCount,
        tasks: taskCount,
        topic_names: Array.isArray(r.topic_names) ? (r.topic_names as string[]) : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`),
        objective_names: Array.isArray(r.objective_names) ? (r.objective_names as string[]) : Array.from({ length: objectiveCount }, (_, i) => `Objective ${i + 1}`),
        task_names: Array.isArray(r.task_names) ? (r.task_names as string[]) : Array.from({ length: taskCount }, (_, i) => `Task ${i + 1}`),
        competencies: (r.competencies as CurriculumCompetency[]) || undefined,
        template_design: (r.template_design as TemplateDesignConfig) || createDefaultTemplateDesign(templateType),
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
        session_number: (l.lessonNumber as number) || index + 1,
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

    const templateType = (base?.template_type || "lesson") as TemplateType

    return {
      id: base?.id || createRowId(),
      schedule_entry_id: entry.id,
      session_number: index + 1,
      title: base?.title || `Session ${index + 1}`,
      notes: base?.notes || "",
      template_id: base?.template_id,
      template_type: templateType,
      duration_minutes: base?.duration_minutes ?? durationMinutes ?? undefined,
      topics: normalizedCounts.topicsPerLesson,
      objectives: normalizedCounts.objectivesPerTopic,
      tasks: normalizedCounts.tasksPerObjective,
      competencies: base?.competencies,
      template_design: base?.template_design || createDefaultTemplateDesign(templateType),
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
  { key: "all", label: "Generate All", description: "Modules, lessons, topics, objectives, and tasks.", primary: true },
  { key: "modules", label: "Generate Module Names", description: "Auto-title modules based on structure." },
  { key: "lessons", label: "Generate Lesson Names", description: "Create lesson titles for each session." },
  { key: "topics", label: "Generate Topic Titles", description: "Fill in topics per lesson." },
  { key: "objectives", label: "Generate Objectives", description: "Add objectives aligned to topics." },
  { key: "tasks", label: "Generate Tasks", description: "Create tasks per objective." },
]