// Pure async runner for AI curriculum generation.
// Stateless — accepts all inputs and state setters as parameters.
import { buildGenerationContext, callGenerationAPI } from "@/lib/curriculum/ai-generation-service"
import type {
  GenerationAction,
  GenerationExtras,
  ClassificationContext,
  PedagogyContext,
  NamingRules,
  StudentsContext,
} from "@/lib/curriculum/ai-generation-service"
import { normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import { selectCourseById, updateCourseById } from "@/components/coursebuilder"
import type { ResourcePreference } from "@/lib/curriculum/resources"
import { createRowId, type CurriculumSessionRow, type ScheduleGeneratedEntry } from "./curriculum-section-utils"
import { getGenerationCompletenessIssues } from "./curriculum-generation-completeness"
import {
  buildModuleNamesFromGeneration,
  buildScopedObjectiveNames,
  buildScopedTaskNames,
  buildScopedTopicNames,
} from "./curriculum-generation-name-builders"
import type React from "react"
export interface GenerationRunnerParams {
  courseId: string
  courseInfo: { name: string; description?: string; goals?: string }
  scheduleEntries: ScheduleGeneratedEntry[]
  moduleOrg: string
  moduleCount: number
  effectiveSessionCount: number
  topics: number
  objectives: number
  tasks: number
  sessionRows: CurriculumSessionRow[]
  moduleNames: string[]
  optCtx: { schedule: boolean; structure: boolean; existing: boolean }
  classificationData: ClassificationContext | null
  pedagogyData: PedagogyContext | null
  courseGoalsList: string[]
  keyTerms: string[]
  mandatoryTopics: string[]
  priorKnowledge: string
  applicationContext: string
  resourcePreferences: ResourcePreference[]
  sequencingMode: string
  namingRules: NamingRules
  courseLanguage: string
  studentsData: StudentsContext | null
  selectedLLMModel: string | null
  actionLabel: string
  setRunStatus: (s: string | null) => void
  setRunProgress: (p: number) => void
  setModuleNames: React.Dispatch<React.SetStateAction<string[]>>
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
}

export interface GenerationRunnerResult {
  success: boolean
  elapsedMs: number
}
export {
  buildModuleNamesFromGeneration,
  buildScopedObjectiveNames,
  buildScopedTaskNames,
  buildScopedTopicNames,
} from "./curriculum-generation-name-builders"

export async function runGenerationAction(
  action: GenerationAction,
  p: GenerationRunnerParams,
  signal: AbortSignal,
): Promise<GenerationRunnerResult> {
  const { setRunStatus, setRunProgress } = p
  setRunStatus("Preparing AI request…")
  setRunProgress(20)

  const extras: GenerationExtras = {
    classification: p.classificationData ?? undefined,
    pedagogy: p.pedagogyData ?? undefined,
    courseGoalsList: p.courseGoalsList.length > 0 ? p.courseGoalsList : undefined,
    keyTerms: p.keyTerms.length > 0 ? p.keyTerms : undefined,
    mandatoryTopics: p.mandatoryTopics.length > 0 ? p.mandatoryTopics : undefined,
    priorKnowledge: p.priorKnowledge || undefined,
    applicationContext: p.applicationContext || undefined,
    resourcesPreferences: p.resourcePreferences,
    sequencingMode: p.sequencingMode !== "linear" ? p.sequencingMode : undefined,
    namingRules: Object.values(p.namingRules).some(Boolean) ? p.namingRules : undefined,
    courseLanguage: p.courseLanguage || undefined,
    students: p.studentsData ?? undefined,
  }

  const context = buildGenerationContext(
    p.courseInfo.name, p.courseInfo.description, p.courseInfo.goals,
    p.scheduleEntries, p.moduleOrg, p.moduleCount, p.effectiveSessionCount,
    p.topics, p.objectives, p.tasks, p.sessionRows,
    { schedule: p.optCtx.schedule, structure: p.optCtx.structure, existing: p.optCtx.existing },
    extras,
  )

  await new Promise((resolve) => setTimeout(resolve, 300))
  const modelSlug = p.selectedLLMModel?.split("-")[0] ?? "Ollama"
  setRunStatus(`Calling ${modelSlug.charAt(0).toUpperCase() + modelSlug.slice(1)} for ${p.actionLabel}…`)
  setRunProgress(35)
  const startedAt = Date.now()

  const response = await callGenerationAPI(context, p.selectedLLMModel ?? undefined, signal, action)
  setRunProgress(70)

  if (!response.success) {
    setRunStatus(`Generation failed: ${response.error || response.message}`)
    setTimeout(() => setRunStatus(null), 8000)
    return { success: false, elapsedMs: Date.now() - startedAt }
  }

  setRunStatus("Clearing previous generation…")
  setRunProgress(75)

  const wipedRows = p.sessionRows.map((row) => {
    const cleared: Partial<CurriculumSessionRow> = {}
    if (action === "all" || action === "sessions") cleared.title = `Session ${row.session_number ?? 0}`
    if (action === "all" || action === "topics") cleared.topic_names = []
    if (action === "all" || action === "objectives") cleared.objective_names = []
    if (action === "all" || action === "tasks") cleared.task_names = []
    return { ...row, ...cleared }
  })
  const wipedModuleNames = action === "all"
    ? p.moduleNames.map((_, i) => `Module ${i + 1}`)
    : p.moduleNames

  const { data: snap } = await selectCourseById<Record<string, unknown>>(p.courseId, "curriculum_data")
  const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
  await updateCourseById(p.courseId, {
    curriculum_data: {
      ...snapData,
      module_names: wipedModuleNames,
      session_rows: wipedRows,
      wiped_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  })
  p.setModuleNames(wipedModuleNames)
  p.setSessionRows(wipedRows)
  setRunProgress(80)
  setRunStatus("Processing generated curriculum…")
  setRunProgress(85)
  await new Promise((resolve) => setTimeout(resolve, 300))

  const generatedRows = response.content?.sessions ?? []
  const generatedModules = response.content?.modules ?? []
  const generatedBySessionNumber = new Map(
    generatedRows.map((session) => [session.sessionNumber, session]),
  )
  const previousBySessionNumber = new Map(
    p.sessionRows.map((row, idx) => [row.session_number ?? idx + 1, row]),
  )

  if (action !== "modules" && generatedRows.length === 0) {
    setRunStatus("Generation returned no session data. Please try again.")
    setTimeout(() => setRunStatus(null), 4000)
    return { success: false, elapsedMs: Date.now() - startedAt }
  }
  if (action === "modules" && generatedModules.length === 0) {
    setRunStatus("Generation returned no module names. Please try again.")
    setTimeout(() => setRunStatus(null), 4000)
    return { success: false, elapsedMs: Date.now() - startedAt }
  }

  const { data: existing } = await selectCourseById<Record<string, unknown>>(p.courseId, "curriculum_data")
  const curriculumData = (existing?.curriculum_data as Record<string, unknown> | null) ?? {}
  const baseRows = wipedRows.length > 0
    ? wipedRows
    : (Array.isArray(curriculumData.session_rows) ? (curriculumData.session_rows as CurriculumSessionRow[]) : [])

  const seedRows: CurriculumSessionRow[] = baseRows.length > 0
    ? baseRows
    : generatedRows.map((session) => ({
        id: createRowId(),
        schedule_entry_id: "",
        session_number: session.sessionNumber,
        title: session.sessionTitle,
        notes: "",
        template_type: "lesson" as TemplateType,
      }))

  const updatedSessionRows = seedRows.map((row, index) => {
    const sessionNumber = row.session_number ?? index + 1
    const gen = generatedBySessionNumber.get(sessionNumber) ?? generatedRows[index]
    const previous = previousBySessionNumber.get(sessionNumber) ?? p.sessionRows[index]
    const norm = normalizeContentLoadConfig(
      { topicsPerLesson: row.topics ?? p.topics, objectivesPerTopic: row.objectives ?? p.objectives, tasksPerObjective: row.tasks ?? p.tasks },
      row.duration_minutes ?? null,
    )
    if (!gen) {
      const updates: Partial<CurriculumSessionRow> = {}
      if (action === "all" || action === "sessions") updates.title = previous?.title || row.title || `Session ${sessionNumber}`
      if (action === "all" || action === "topics") {
        updates.topics = norm.topicsPerLesson
        updates.topic_names = buildScopedTopicNames({
          generated: undefined,
          existing: previous?.topic_names ?? row.topic_names,
          topicCount: norm.topicsPerLesson,
        })
      }
      if (action === "all" || action === "objectives") {
        updates.objectives = norm.objectivesPerTopic
        updates.objective_names = buildScopedObjectiveNames({
          generated: undefined,
          existing: previous?.objective_names ?? row.objective_names,
          topicCount: norm.topicsPerLesson,
          objectivesPerTopic: norm.objectivesPerTopic,
        })
      }
      if (action === "all" || action === "tasks") {
        updates.tasks = norm.tasksPerObjective
        updates.task_names = buildScopedTaskNames({
          generated: undefined,
          existing: previous?.task_names ?? row.task_names,
          topicCount: norm.topicsPerLesson,
          objectivesPerTopic: norm.objectivesPerTopic,
          tasksPerObjective: norm.tasksPerObjective,
        })
      }
      return { ...row, ...updates }
    }
    const updates: Partial<CurriculumSessionRow> = {}
    if (action === "all" || action === "sessions") {
      updates.title = gen.sessionTitle || previous?.title || row.title
    }
    if (action === "all" || action === "topics") {
      updates.topics = norm.topicsPerLesson
      updates.topic_names = buildScopedTopicNames({
        generated: gen.topics,
        existing: previous?.topic_names ?? row.topic_names,
        topicCount: norm.topicsPerLesson,
      })
    }
    if (action === "all" || action === "objectives") {
      updates.objectives = norm.objectivesPerTopic
      updates.objective_names = buildScopedObjectiveNames({
        generated: gen.objectives,
        existing: previous?.objective_names ?? row.objective_names,
        topicCount: norm.topicsPerLesson,
        objectivesPerTopic: norm.objectivesPerTopic,
      })
    }
    if (action === "all" || action === "tasks") {
      updates.tasks = norm.tasksPerObjective
      updates.task_names = buildScopedTaskNames({
        generated: gen.tasks,
        existing: previous?.task_names ?? row.task_names,
        topicCount: norm.topicsPerLesson,
        objectivesPerTopic: norm.objectivesPerTopic,
        tasksPerObjective: norm.tasksPerObjective,
      })
    }
    return { ...row, ...updates }
  })

  const generatedModuleNames = buildModuleNamesFromGeneration({
    generatedModules,
    persistedModuleNames: p.moduleNames,
    desiredCount: Math.max(p.moduleCount, p.moduleNames.length),
  })

  const completenessIssues = getGenerationCompletenessIssues({
    action,
    moduleNames: generatedModuleNames,
    moduleCount: p.moduleCount,
    rows: updatedSessionRows,
    defaultTopics: p.topics,
    defaultObjectives: p.objectives,
    defaultTasks: p.tasks,
  })

  if (completenessIssues.length > 0) {
    await updateCourseById(p.courseId, {
      curriculum_data: snapData,
      updated_at: new Date().toISOString(),
    })
    p.setSessionRows(p.sessionRows)
    p.setModuleNames(p.moduleNames)
    const details = completenessIssues.slice(0, 3).join("; ")
    setRunStatus(`Generation incomplete: ${details}. No partial data was saved.`)
    setTimeout(() => setRunStatus(null), 8000)
    return { success: false, elapsedMs: Date.now() - startedAt }
  }

  const { error } = await updateCourseById(p.courseId, {
    curriculum_data: {
      ...curriculumData,
      module_names: generatedModuleNames,
      session_rows: updatedSessionRows,
      generated_at: new Date().toISOString(),
      last_generation_action: action,
    },
    updated_at: new Date().toISOString(),
  })

  if (error) {
    setRunStatus(`Failed to save generated curriculum: ${error.message}`)
    setTimeout(() => setRunStatus(null), 3000)
    return { success: false, elapsedMs: Date.now() - startedAt }
  }

  p.setSessionRows(updatedSessionRows)
  p.setModuleNames(generatedModuleNames)
  setRunProgress(100)
  setRunStatus("Generation complete!")
  setTimeout(() => setRunStatus(null), 2000)
  return { success: true, elapsedMs: Date.now() - startedAt }
}
