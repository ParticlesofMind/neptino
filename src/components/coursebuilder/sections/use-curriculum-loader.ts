"use client"

import { useEffect, type MutableRefObject } from "react"
import { selectCourseById } from "@/components/coursebuilder"
import { getPedagogyApproach } from "@/components/coursebuilder/sections/pedagogy-section"
import { mergeResourcePreferences, type ResourcePreference } from "@/lib/curriculum/resources"
import { normalizeContentLoadConfig, MIN_TASKS_PER_OBJECTIVE } from "@/lib/curriculum/content-load-service"
import type {
  GenerationAction,
  ClassificationContext,
  PedagogyContext,
  NamingRules,
  StudentsContext,
} from "@/lib/curriculum/ai-generation-service"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import {
  extractExistingSessionRows,
  extractSavedTemplates,
  syncSessionRowsToSchedule,
  type CurriculumSessionRow,
  type SavedTemplateSummary,
  type ScheduleGeneratedEntry,
  type PreviewMode,
} from "./curriculum-section-utils"
import type { CertificateMode } from "./curriculum-derived"

export interface CurriculumLoaderSetters {
  setCourseInfo: (v: { name: string; description?: string; goals?: string } | null) => void
  setCourseGoalsList: (v: string[]) => void
  setSelectedLLMModel: (v: string | null) => void
  setResourcePreferences: (v: ResourcePreference[]) => void
  setCourseLanguage: (v: string) => void
  setClassificationData: (v: ClassificationContext | null) => void
  setKeyTerms: (v: string[]) => void
  setMandatoryTopics: (v: string[]) => void
  setPriorKnowledge: (v: string) => void
  setApplicationContext: (v: string) => void
  setPedagogyData: (v: PedagogyContext | null) => void
  setStudentsData: (v: StudentsContext | null) => void
  setOptCtx: (v: { schedule: boolean; structure: boolean; existing: boolean }) => void
  setPreviewMode: (v: PreviewMode) => void
  setLastAction: (v: GenerationAction | null) => void
  setModuleOrg: (v: string) => void
  setContentVolume: (v: string) => void
  setCourseType: (v: string) => void
  setSequencingMode: (v: string) => void
  setNamingRules: (v: NamingRules) => void
  setTemplateDefaultType: (v: TemplateType) => void
  setCertificateMode: (v: CertificateMode) => void
  setLessonCount: (v: number) => void
  setModuleCount: (v: number) => void
  setTopics: (v: number) => void
  setObjectives: (v: number) => void
  setTasks: (v: number) => void
  setModuleNames: (v: string[]) => void
  setScheduleEntries: (v: ScheduleGeneratedEntry[]) => void
  setSessionRows: (v: CurriculumSessionRow[]) => void
  setSavedTemplates: (v: SavedTemplateSummary[]) => void
  setReadinessIssues: (v: string[]) => void
  setMissing: (v: { essentials: boolean; schedule: boolean; curriculum: boolean }) => void
  generationSettingsRef: MutableRefObject<Record<string, unknown> | null>
}

export function useCurriculumLoader(courseId: string | null, setters: CurriculumLoaderSetters) {
  useEffect(() => {
    if (!courseId) return
    void loadCourse(courseId, setters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])
}

async function loadCourse(courseId: string, s: CurriculumLoaderSetters) {
  const { data, error } = await selectCourseById<Record<string, unknown>>(
    courseId,
    "course_name, course_description, course_language, curriculum_data, schedule_settings, generation_settings, template_settings, classification_data, course_layout, students_overview",
  )
  if (error || !data) return

  const c = (data.curriculum_data as Record<string, unknown>) ?? {}
  const sch = (data.schedule_settings as Record<string, unknown>) ?? {}
  const gs = (data.generation_settings as Record<string, unknown> | null) ?? {}
  const aiSettings = (gs.ai_generation as Record<string, unknown> | undefined) ?? gs
  s.generationSettingsRef.current = gs

  const loadedScheduleEntries: ScheduleGeneratedEntry[] = Array.isArray(sch.generated_entries)
    ? (sch.generated_entries as ScheduleGeneratedEntry[]).map((entry, i) => ({
        ...entry,
        id: entry.id || `sched-${i + 1}`,
      }))
    : []

  const loadedGoals = Array.isArray(gs.course_goals) ? (gs.course_goals as string[]) : []
  s.setCourseGoalsList(loadedGoals)
  s.setSelectedLLMModel((gs.selected_llm_model as string | undefined) ?? null)

  const savedResources = gs.resources_preferences as ResourcePreference[] | undefined
  s.setResourcePreferences(mergeResourcePreferences(Array.isArray(savedResources) ? savedResources : null))
  s.setCourseInfo({
    name: (data.course_name as string) ?? "Untitled Course",
    description: (data.course_description as string) ?? undefined,
    goals: loadedGoals.length > 0 ? loadedGoals.join("; ") : undefined,
  })

  if (data.course_language) s.setCourseLanguage(data.course_language as string)

  const cd = (data.classification_data as Record<string, unknown>) ?? {}
  if (cd.subject || cd.domain || cd.topic) {
    s.setClassificationData({
      classYear: (cd.class_year as string) ?? "",
      framework: (cd.curricular_framework as string) ?? "",
      domain: (cd.domain as string) ?? "",
      subject: (cd.subject as string) ?? "",
      topic: (cd.topic as string) ?? "",
      subtopic: (cd.subtopic as string) ?? "",
      previousCourse: (cd.previous_course as string) ?? "",
      nextCourse: (cd.next_course as string) ?? "",
    })
    if (Array.isArray(cd.key_terms)) s.setKeyTerms(cd.key_terms as string[])
    if (Array.isArray(cd.mandatory_topics)) s.setMandatoryTopics(cd.mandatory_topics as string[])
    if (typeof cd.prior_knowledge === "string") s.setPriorKnowledge(cd.prior_knowledge)
    if (typeof cd.application_context === "string") s.setApplicationContext(cd.application_context)
  }

  const layout = (data.course_layout as Record<string, unknown>) ?? {}
  if (layout.pedagogy) {
    const p = layout.pedagogy as { x: number; y: number }
    const approach = getPedagogyApproach(p.x, p.y)
    s.setPedagogyData({
      x: p.x, y: p.y,
      approach: approach.title,
      teacherRole: approach.teacherRole,
      studentRole: approach.studentRole,
      activitiesMethods: approach.activitiesMethods,
      assessment: approach.assessment,
      classroomEnvironment: approach.classroomEnvironment,
    })
  }

  const so = (data.students_overview as Record<string, unknown>) ?? {}
  const totalStudents = typeof so.total === "number"
    ? so.total
    : (Array.isArray(so.students) ? (so.students as unknown[]).length : 0)
  if (totalStudents > 0) {
    s.setStudentsData({ totalStudents, method: (so.method as string) ?? "unknown" })
  }

  s.setOptCtx({ schedule: true, structure: true, existing: true })
  const loadedMode = aiSettings.preview_mode as PreviewMode | undefined
  if (loadedMode) s.setPreviewMode(loadedMode)
  const loadedAction = aiSettings.last_action as GenerationAction | undefined
  if (loadedAction) s.setLastAction(loadedAction)

  const existingRows = extractExistingSessionRows(c)
  const syncedRows = syncSessionRowsToSchedule(loadedScheduleEntries, existingRows)

  s.setModuleOrg((c.module_org as string) ?? "linear")
  s.setContentVolume((c.content_volume as string) ?? "single")
  s.setCourseType((c.course_type as string) ?? "essential")
  s.setSequencingMode((c.sequencing_mode as string) ?? "linear")

  if (c.naming_rules && typeof c.naming_rules === "object") {
    const nr = c.naming_rules as Record<string, string>
    s.setNamingRules({
      lessonTitleRule: nr.lessonTitleRule ?? "",
      topicRule: nr.topicRule ?? "",
      objectiveRule: nr.objectiveRule ?? "",
      taskRule: nr.taskRule ?? "",
    })
  }

  s.setTemplateDefaultType((c.template_default_type as TemplateType) ?? "lesson")
  s.setCertificateMode((c.certificate_mode as CertificateMode) ?? "never")
  s.setLessonCount(loadedScheduleEntries.length > 0 ? loadedScheduleEntries.length : ((c.lesson_count as number) ?? 8))
  s.setModuleCount((c.module_count as number) ?? 3)

  const normalized = normalizeContentLoadConfig({
    topicsPerLesson: (c.topics as number) ?? 2,
    objectivesPerTopic: (c.objectives as number) ?? 2,
    tasksPerObjective: (c.tasks as number) ?? MIN_TASKS_PER_OBJECTIVE,
  })
  s.setTopics(normalized.topicsPerLesson)
  s.setObjectives(normalized.objectivesPerTopic)
  s.setTasks(normalized.tasksPerObjective)

  s.setModuleNames(Array.isArray(c.module_names) ? (c.module_names as string[]) : [])
  s.setScheduleEntries(loadedScheduleEntries)
  s.setSessionRows(syncedRows)
  s.setSavedTemplates(extractSavedTemplates(data.template_settings))

  const issues: string[] = []
  const essentialsReady =
    Boolean((data.course_name as string | undefined)?.trim()) &&
    Boolean((data.course_description as string | undefined)?.trim())
  if (!essentialsReady) issues.push("Complete Essentials (title and description).")
  if (loadedScheduleEntries.length === 0) issues.push("Generate a schedule with at least 1 session.")
  if (syncedRows.length === 0) issues.push("Set up curriculum session rows in Curriculum.")
  s.setReadinessIssues(issues)
  s.setMissing({
    essentials: !essentialsReady,
    schedule: loadedScheduleEntries.length === 0,
    curriculum: syncedRows.length === 0,
  })
}
