/**
 * AI Curriculum Generation Service
 * Builds context from schedule/curriculum and calls AI to generate content
 */

import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateDesignConfig, TemplateType } from "@/lib/curriculum/template-blocks"
import { MIN_TASKS_PER_OBJECTIVE, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"

// Curriculum session row type (mirrors the type in curriculum-section.tsx)
export interface CurriculumSessionRow {
  id: string
  schedule_entry_id?: string
  session_number?: number
  title?: string
  notes?: string
  template_type?: TemplateType
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  competencies?: CurriculumCompetency[]
  template_design?: TemplateDesignConfig
}

export interface ScheduleEntry {
  id: string
  day: string
  date: string
  start_time?: string
  end_time?: string
  session?: number
}

export interface ClassificationContext {
  classYear: string
  framework: string
  domain: string
  subject: string
  topic: string
  subtopic: string
  previousCourse: string
  nextCourse: string
}

export interface PedagogyContext {
  x: number
  y: number
  approach: string
  teacherRole: string
  studentRole: string
  activitiesMethods: string
  assessment: string
  classroomEnvironment: string
}

export interface NamingRules {
  lessonTitleRule: string
  topicRule: string
  objectiveRule: string
  taskRule: string
}

export interface StudentsContext {
  totalStudents: number
  method: string
}

export interface GenerationExtras {
  classification?: ClassificationContext
  pedagogy?: PedagogyContext
  courseGoalsList?: string[]
  keyTerms?: string[]
  mandatoryTopics?: string[]
  priorKnowledge?: string
  applicationContext?: string
  resourcesPreferences?: Array<{ id: string; label: string; priority: string }>
  sequencingMode?: string
  namingRules?: NamingRules
  courseLanguage?: string
  students?: StudentsContext
}

export interface GenerationContext {
  courseName: string
  courseDescription?: string
  courseGoals?: string
  courseLanguage?: string
  schedule: ScheduleEntry[]
  curriculum: {
    moduleOrganization: string
    moduleCount: number
    lessonCount: number
    topicsPerLesson: number
    objectivesPerTopic: number
    tasksPerObjective: number
    sequencingMode?: string
    sessionRows: Array<{
      sessionNumber: number
      title: string
      templateType: string
      duration: number | null
      topics: number | null
      objectives: number | null
      tasks: number | null
    }>
  }
  classification?: ClassificationContext
  pedagogy?: PedagogyContext
  courseGoalsList?: string[]
  keyTerms?: string[]
  mandatoryTopics?: string[]
  priorKnowledge?: string
  applicationContext?: string
  resourcesPreferences?: Array<{ id: string; label: string; priority: string }>
  namingRules?: NamingRules
  students?: StudentsContext
  options: {
    schedule: boolean
    structure: boolean
    existing: boolean
  }
}

export interface GeneratedCurriculumContent {
  modules?: Array<{
    moduleNumber: number
    moduleTitle: string
  }>
  lessons?: Array<{
    lessonNumber: number
    lessonTitle: string
    topics?: string[]
    objectives?: string[]
    tasks?: string[]
  }>
  sessionEnhancements?: Array<{
    sessionNumber: number
    suggestedTopics?: string[]
    suggestedObjectives?: string[]
    suggestedTasks?: string[]
  }>
}

export type GenerationAction = "all" | "modules" | "lessons" | "topics" | "objectives" | "tasks"

export interface GenerationResponse {
  success: boolean
  message: string
  content?: GeneratedCurriculumContent
  error?: string
  generatedAt?: string
}

// Re-export all functions from extracted modules for backward compatibility
export { buildLocalGeneratedCurriculum, buildGenerationContext } from "@/lib/curriculum/generation-context-builder"
export { formatGenerationPrompt } from "@/lib/curriculum/generation-prompt-builder"
export { parseGenerationResponse, callGenerationAPI } from "@/lib/curriculum/generation-api-client"
