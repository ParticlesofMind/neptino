import { getDefaultBlocksForType, type TemplateBlockType, type TemplateDesignConfig, type TemplateType } from "@/lib/curriculum/template-blocks"
import { BLOCK_FIELDS, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import { resolveTemplateSelection, type NormalizedTemplateConfig } from "@/lib/curriculum/template-source-of-truth"

export interface RawCurriculumSessionRow {
  id: string
  schedule_entry_id?: string
  session_number?: number
  title?: string
  notes?: string
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  template_id?: string
  template_type?: TemplateType
  template_design?: TemplateDesignConfig
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
}

export interface RawScheduleGeneratedEntry {
  id: string
  day?: string
  date?: string
  session?: number
  start_time?: string
  end_time?: string
}

export interface LessonCanvasPageProjection {
  globalPage: number
  sessionId: string
  lessonNumber: number
  lessonTitle: string
  lessonNotes: string
  topicCount: number
  objectiveCount: number
  taskCount: number
  durationMinutes?: number
  scheduleDay?: string
  scheduleDate?: string
  scheduleStart?: string
  scheduleEnd?: string
  templateId?: string
  templateType: TemplateType
  enabledBlocks: TemplateBlockType[]
  enabledFields: TemplateFieldState
  localPage: number
  pagesInLesson: number
  moduleName: string
  topics: string[]
  objectives: string[]
  tasks: string[]
}

const TEMPLATE_BLOCK_ORDER: BlockId[] = ["header", "program", "resources", "content", "assignment", "scoring", "footer"]
type LessonBodyBlockId = "program" | "resources" | "content" | "assignment" | "scoring"

const LESSON_BODY_BLOCK_ORDER: LessonBodyBlockId[] = ["program", "resources", "content", "assignment", "scoring"]

const LESSON_BLOCK_CAPACITY: Record<LessonBodyBlockId, number> = {
  program: 4,
  resources: 12,
  content: 1,
  assignment: 1,
  scoring: 8,
}

const LESSON_BLOCK_LOAD: Record<LessonBodyBlockId, { base: number; variable: number }> = {
  program: { base: 0.18, variable: 0.42 },
  resources: { base: 0.16, variable: 0.36 },
  content: { base: 0.65, variable: 0.3 },
  assignment: { base: 0.65, variable: 0.3 },
  scoring: { base: 0.2, variable: 0.25 },
}

export interface LessonBodyPageChunk {
  blockId: LessonBodyBlockId
  page: number
  chunkIndex: number
  itemStart: number
  itemEnd: number
  continuation: boolean
}

export interface LessonBodyLayoutPlan {
  totalPages: number
  chunks: LessonBodyPageChunk[]
}

function estimateLessonChunkLoad(blockId: LessonBodyBlockId, itemCount: number): number {
  const capacity = LESSON_BLOCK_CAPACITY[blockId]
  const ratio = Math.min(1, Math.max(0, itemCount / Math.max(1, capacity)))
  const profile = LESSON_BLOCK_LOAD[blockId]
  return profile.base + profile.variable * ratio
}

export function planLessonBodyLayout(args: {
  topicsPerLesson: number
  objectivesPerTopic: number
  tasksPerObjective: number
  enabledBlocks: TemplateBlockType[]
}): LessonBodyLayoutPlan {
  const { topicsPerLesson, objectivesPerTopic, tasksPerObjective, enabledBlocks } = args
  const enabledSet = new Set(enabledBlocks)

  const totalTaskInstances = Math.max(1, topicsPerLesson) * Math.max(1, objectivesPerTopic) * Math.max(1, tasksPerObjective)
  const itemCounts: Record<LessonBodyBlockId, number> = {
    program: Math.max(1, topicsPerLesson),
    resources: Math.max(1, totalTaskInstances),
    content: Math.max(1, topicsPerLesson),
    assignment: Math.max(1, topicsPerLesson),
    scoring: Math.max(1, objectivesPerTopic),
  }

  const chunks: LessonBodyPageChunk[] = []
  let currentPage = 1
  let currentLoad = 0

  LESSON_BODY_BLOCK_ORDER.forEach((blockId) => {
    if (!enabledSet.has(blockId)) return

    const totalItems = itemCounts[blockId]
    const capacity = LESSON_BLOCK_CAPACITY[blockId]
    const chunkCount = Math.max(1, Math.ceil(totalItems / Math.max(1, capacity)))

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const itemStart = chunkIndex * capacity
      const itemEnd = Math.min(totalItems, itemStart + capacity)
      const itemCount = Math.max(1, itemEnd - itemStart)
      const chunkLoad = estimateLessonChunkLoad(blockId, itemCount)

      if (currentLoad > 0 && currentLoad + chunkLoad > 1) {
        currentPage += 1
        currentLoad = 0
      }

      chunks.push({
        blockId,
        page: currentPage,
        chunkIndex,
        itemStart,
        itemEnd,
        continuation: chunkIndex > 0,
      })

      currentLoad += chunkLoad
    }
  })

  return {
    totalPages: chunks.length > 0 ? Math.max(...chunks.map((chunk) => chunk.page)) : 1,
    chunks,
  }
}

export function resolveEnabledBlocks(templateType: TemplateType, templateDesign?: TemplateDesignConfig): TemplateBlockType[] {
  const sequence = getDefaultBlocksForType(templateType)
  if (!Array.isArray(templateDesign?.enabledBlocks)) return sequence

  const requested = new Set(
    templateDesign.enabledBlocks
      .map((block) => String(block) as TemplateBlockType)
      .filter((block): block is TemplateBlockType => sequence.includes(block)),
  )

  if (requested.size === 0) return sequence
  return sequence.filter((block) => requested.has(block))
}

export function buildTemplateFieldState(type: TemplateType): TemplateFieldState {
  const state = {} as TemplateFieldState

  TEMPLATE_BLOCK_ORDER.forEach((blockId) => {
    const blockFields = BLOCK_FIELDS[blockId] ?? []
    const fieldState: Record<string, boolean> = {}

    blockFields
      .filter((field) => field.forTypes.includes(type as never))
      .forEach((field) => {
        fieldState[field.key] = field.required
      })

    state[blockId] = fieldState
  })

  return state
}

export function resolveTemplateFieldState(
  templateType: TemplateType,
  enabledBlocks: TemplateBlockType[],
  templateDesign?: TemplateDesignConfig,
  templateConfig?: NormalizedTemplateConfig,
): TemplateFieldState {
  const defaultState = buildTemplateFieldState(templateType)
  const enabledSet = new Set(enabledBlocks)
  const blockSettings = templateDesign?.blockSettings

  const resolved = {} as TemplateFieldState
  TEMPLATE_BLOCK_ORDER.forEach((blockId) => {
    const fields = BLOCK_FIELDS[blockId].filter((field) => field.forTypes.includes(templateType as never))
    const fromTemplate = templateConfig?.fieldEnabled?.[blockId] ?? {}
    const fromDesign = (blockSettings?.[blockId] as Record<string, unknown> | undefined) ?? {}

    const nextFields: Record<string, boolean> = {}
    fields.forEach((field) => {
      const defaultEnabled = enabledSet.has(blockId) && Boolean(defaultState[blockId]?.[field.key])
      const templateValue = fromTemplate[field.key]
      const designValue = fromDesign[field.key]

      if (typeof designValue === "boolean") {
        nextFields[field.key] = enabledSet.has(blockId) ? designValue : false
        return
      }

      if (typeof templateValue === "boolean") {
        nextFields[field.key] = enabledSet.has(blockId) ? templateValue : false
        return
      }

      nextFields[field.key] = defaultEnabled
    })

    resolved[blockId] = nextFields
  })

  return resolved
}

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
    const effectiveTaskCount = Math.max(1, session.tasks.length, session.taskCount)

    return planLessonBodyLayout({
      topicsPerLesson: effectiveTopicCount,
      objectivesPerTopic: effectiveObjectiveCount,
      tasksPerObjective: effectiveTaskCount,
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
