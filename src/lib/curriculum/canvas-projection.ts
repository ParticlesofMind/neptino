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
  content: 2,
  assignment: 2,
  scoring: 8,
}

const LESSON_BLOCK_LOAD: Record<LessonBodyBlockId, { base: number; variable: number }> = {
  program: { base: 0.18, variable: 0.42 },
  resources: { base: 0.16, variable: 0.36 },
  content: { base: 0.42, variable: 0.46 },
  assignment: { base: 0.42, variable: 0.46 },
  scoring: { base: 0.2, variable: 0.25 },
}

function estimateTaskExpansionUnits(task: string): number {
  const normalized = String(task || "").trim()
  if (!normalized) return 1
  const lineBreakCount = (normalized.match(/\n/g) ?? []).length
  const extraCharUnits = Math.ceil(Math.max(0, normalized.length - 80) / 140)
  const extraLineUnits = Math.ceil(lineBreakCount / 2)
  return 1 + Math.max(extraCharUnits, extraLineUnits)
}

export function expandTaskLabelsForFlow(tasks: string[], fallbackCount: number): string[] {
  const resolvedFallback = Math.max(1, Number(fallbackCount) || 0)
  const resolvedTasks = tasks.length > 0
    ? tasks
    : Array.from({ length: resolvedFallback }, (_, idx) => `Task ${idx + 1}`)

  const expanded: string[] = []
  resolvedTasks.forEach((task, taskIdx) => {
    const normalizedTask = String(task || `Task ${taskIdx + 1}`).trim() || `Task ${taskIdx + 1}`
    const expansionUnits = estimateTaskExpansionUnits(normalizedTask)
    if (expansionUnits <= 1) {
      expanded.push(normalizedTask)
      return
    }
    Array.from({ length: expansionUnits }).forEach((_, partIdx) => {
      expanded.push(`${normalizedTask} — Part ${partIdx + 1}/${expansionUnits}`)
    })
  })

  return expanded.length > 0 ? expanded : ["Task 1"]
}

export function estimateExpandedTaskCount(tasks: string[], fallbackCount: number): number {
  return expandTaskLabelsForFlow(tasks, fallbackCount).length
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
  topicCount: number
  objectiveCount: number
  taskCount: number
  enabledBlocks: TemplateBlockType[]
}): LessonBodyLayoutPlan {
  const { topicCount, objectiveCount, taskCount, enabledBlocks } = args
  const enabledSet = new Set(enabledBlocks)

  const resolvedTopicCount = Math.max(1, topicCount)
  const resolvedObjectiveCount = Math.max(1, objectiveCount)
  const resolvedTaskCount = Math.max(1, taskCount)

  const itemCounts: Record<LessonBodyBlockId, number> = {
    program: resolvedTopicCount,
    resources: resolvedTaskCount,
    content: resolvedTaskCount,
    assignment: resolvedTaskCount,
    scoring: resolvedObjectiveCount,
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

