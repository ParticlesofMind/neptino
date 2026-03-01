// Full canvas lesson projector extracted from canvas-projection.ts
import {
  planLessonBodyLayout, estimateExpandedTaskCount,
  resolveEnabledBlocks, resolveTemplateFieldState,
  type RawCurriculumSessionRow, type RawScheduleGeneratedEntry, type LessonCanvasPageProjection,
} from "@/lib/curriculum/canvas-projection"
import { resolveTemplateSelection, type NormalizedTemplateConfig } from "@/lib/curriculum/template-source-of-truth"
import type { TemplateType, TemplateBlockType } from "@/lib/curriculum/template-blocks"

function estimateSessionPages(session: {
  templateType: TemplateType
  topics: string[]
  objectives: string[]
  tasks: string[]
  topicCount: number
  objectiveCount: number
  taskCount: number
  enabledBlocks: TemplateBlockType[]
}): number {
  if (session.templateType === "lesson") {
    const effectiveTopicCount = Math.max(1, session.topics.length, session.topicCount)
    const effectiveObjectiveCount = Math.max(1, session.objectives.length, session.objectiveCount)
    const effectiveTaskCount = estimateExpandedTaskCount(session.tasks, session.taskCount)

    return planLessonBodyLayout({
      topicCount: effectiveTopicCount,
      objectiveCount: effectiveObjectiveCount,
      taskCount: effectiveTaskCount,
      enabledBlocks: session.enabledBlocks,
    }).totalPages
  }

  const effectiveTopicCount = Math.max(session.topics.length, session.topicCount)
  const effectiveObjectiveCount = Math.max(session.objectives.length, session.topicCount * session.objectiveCount)
  const effectiveTaskCount = Math.max(session.tasks.length, session.topicCount * session.objectiveCount * session.taskCount)

  const complexityUnits =
    effectiveTopicCount * 1.2 +
    effectiveObjectiveCount * 1.5 +
    effectiveTaskCount * 1.8
  const baseline = session.templateType === "certificate" ? 1 : 1.4
  return Math.max(1, Math.ceil((complexityUnits + baseline) / 6))
}

function resolveModuleNameForIndex(
  lessonIndex: number,
  totalLessons: number,
  curriculum: Record<string, unknown>,
): string {
  const moduleNames = Array.isArray(curriculum.module_names)
    ? (curriculum.module_names as unknown[]).map((name, index) => String(name || `Module ${index + 1}`))
    : []
  const modules = Array.isArray(curriculum.modules) ? curriculum.modules : []
  const moduleOrg = String(curriculum.module_org ?? "linear")
  const configuredModuleCount = Number(curriculum.module_count ?? (moduleNames.length || 1))
  const effectiveModuleCount = moduleOrg === "linear" ? 1 : Math.max(1, configuredModuleCount)

  if (moduleNames.length > 0) {
    if (moduleOrg === "linear") return moduleNames[0] ?? "Module 1"
    const perModule = Math.max(1, Math.ceil(Math.max(1, totalLessons) / effectiveModuleCount))
    const moduleIndex = Math.min(moduleNames.length - 1, Math.floor(lessonIndex / perModule))
    return moduleNames[moduleIndex] ?? `Module ${moduleIndex + 1}`
  }

  if (modules.length > 0) {
    const moduleRaw = modules[lessonIndex % Math.max(1, modules.length)] as Record<string, unknown> | string | undefined
    return typeof moduleRaw === "string"
      ? moduleRaw
      : String(moduleRaw?.name ?? moduleRaw?.title ?? moduleRaw?.module_name ?? `Module ${Math.floor(lessonIndex / 4) + 1}`)
  }

  if (moduleOrg === "linear") return "Module 1"
  const perModule = Math.max(1, Math.ceil(Math.max(1, totalLessons) / effectiveModuleCount))
  const moduleIndex = Math.floor(lessonIndex / perModule)
  return `Module ${moduleIndex + 1}`
}

export function projectLessonPages(args: {
  curriculum: Record<string, unknown>
  scheduleRows: RawScheduleGeneratedEntry[]
  sessionRows: RawCurriculumSessionRow[]
  templateById: Map<string, NormalizedTemplateConfig>
  templateByType: Map<TemplateType, NormalizedTemplateConfig>
}): LessonCanvasPageProjection[] {
  const { curriculum, scheduleRows, sessionRows, templateById, templateByType } = args

  const orderedRows = scheduleRows.length > 0
    ? scheduleRows.map((entry, index) => {
        const rowByScheduleId = sessionRows.find((row) => row.schedule_entry_id === entry.id)
        const rowBySessionNumber = sessionRows.find((row) => row.session_number === (entry.session ?? index + 1))
        return rowByScheduleId ?? rowBySessionNumber ?? sessionRows[index] ?? {
          id: `scheduled-${entry.id || index + 1}`,
          schedule_entry_id: entry.id,
          session_number: entry.session ?? index + 1,
          title: `Lesson ${entry.session ?? index + 1}`,
          template_type: "lesson" as TemplateType,
          topic_names: [],
          objective_names: [],
          task_names: [],
        }
      })
    : sessionRows

  const sessions = orderedRows.map((row, index) => {
    const schedule = scheduleRows.find((entry) => entry.id === row.schedule_entry_id)
    const topics = Array.isArray(row.topic_names) ? row.topic_names.filter(Boolean) : []
    const objectives = Array.isArray(row.objective_names) ? row.objective_names.filter(Boolean) : []
    const tasks = Array.isArray(row.task_names) ? row.task_names.filter(Boolean) : []
    const topicCount = Math.max(0, Number(row.topics ?? topics.length) || 0)
    const objectiveCount = Math.max(0, Number(row.objectives ?? objectives.length) || 0)
    const taskCount = Math.max(0, Number(row.tasks ?? tasks.length) || 0)

    const { templateId, templateType, templateConfig } = resolveTemplateSelection({
      requestedTemplateId: row.template_id,
      requestedTemplateType: row.template_type,
      templateById,
      templateByType,
    })

    const enabledBlocks = resolveEnabledBlocks(templateType, row.template_design)
    const enabledFields = resolveTemplateFieldState(templateType, enabledBlocks, row.template_design, templateConfig)

    return {
      id: row.id || `session-${index + 1}`,
      lessonNumber: row.session_number ?? index + 1,
      title: row.title?.trim() || `Lesson ${index + 1}`,
      notes: row.notes?.trim() || "",
      topicCount,
      objectiveCount,
      taskCount,
      durationMinutes: row.duration_minutes,
      scheduleDay: schedule?.day,
      scheduleDate: schedule?.date,
      scheduleStart: schedule?.start_time,
      scheduleEnd: schedule?.end_time,
      templateId,
      templateType,
      enabledBlocks,
      enabledFields,
      moduleName: resolveModuleNameForIndex(index, orderedRows.length, curriculum),
      topics,
      objectives,
      tasks,
      pages: estimateSessionPages({
        templateType,
        topics,
        objectives,
        tasks,
        topicCount,
        objectiveCount,
        taskCount,
        enabledBlocks,
      }),
    }
  })

  if (sessions.length === 0) return []

  const pages: LessonCanvasPageProjection[] = []
  let globalPage = 1

  sessions.forEach((session) => {
    for (let localPage = 1; localPage <= session.pages; localPage++) {
      pages.push({
        globalPage,
        sessionId: session.id,
        lessonNumber: session.lessonNumber,
        lessonTitle: session.title,
        lessonNotes: session.notes,
        topicCount: session.topicCount,
        objectiveCount: session.objectiveCount,
        taskCount: session.taskCount,
        durationMinutes: session.durationMinutes,
        scheduleDay: session.scheduleDay,
        scheduleDate: session.scheduleDate,
        scheduleStart: session.scheduleStart,
        scheduleEnd: session.scheduleEnd,
        templateId: session.templateId,
        templateType: session.templateType,
        enabledBlocks: session.enabledBlocks,
        enabledFields: session.enabledFields,
        localPage,
        pagesInLesson: session.pages,
        moduleName: session.moduleName,
        topics: session.topics,
        objectives: session.objectives,
        tasks: session.tasks,
      })
      globalPage += 1
    }
  })

  return pages
}
