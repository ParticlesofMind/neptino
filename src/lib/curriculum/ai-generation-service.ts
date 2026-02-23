/**
 * AI Curriculum Generation Service
 * Builds context from schedule/curriculum and calls AI to generate content
 */

import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateDesignConfig, TemplateType } from "@/lib/curriculum/template-blocks"

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
  resourceConstraints?: string
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
  resourceConstraints?: string
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

export interface GenerationResponse {
  success: boolean
  message: string
  content?: GeneratedCurriculumContent
  error?: string
  generatedAt?: string
}

function tokenizeSeedText(text: string): string[] {
  const stopwords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "your", "course", "lesson", "module", "about", "into", "over", "under", "between", "into", "across", "through", "their", "have", "will", "what", "when", "where", "which", "each", "using", "used", "students", "student",
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2 && !stopwords.has(part))
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

function buildLocalGeneratedCurriculum(context: GenerationContext): GeneratedCurriculumContent {
  const goalsSeed = context.courseGoalsList?.join(" ") ?? context.courseGoals ?? ""
  const classificationSeed = context.classification
    ? [context.classification.subject, context.classification.topic, context.classification.subtopic].filter(Boolean).join(" ")
    : ""
  const keyTermsSeed = context.keyTerms?.join(" ") ?? ""
  const mandatorySeed = context.mandatoryTopics?.join(" ") ?? ""
  const seedText = [context.courseName, context.courseDescription ?? "", goalsSeed, classificationSeed, keyTermsSeed, mandatorySeed].join(" ")
  const keywords = tokenizeSeedText(seedText)
  const primaryKeyword = keywords[0] ? titleCase(keywords[0]) : "Core"
  const secondaryKeyword = keywords[1] ? titleCase(keywords[1]) : "Practice"

  const lessonCount = Math.max(1, context.curriculum.lessonCount || context.curriculum.sessionRows.length || 1)
  const moduleCount = context.curriculum.moduleOrganization === "linear" ? 1 : Math.max(1, context.curriculum.moduleCount || 1)
  const lessonsPerModule = Math.ceil(lessonCount / moduleCount)

  const modules = Array.from({ length: moduleCount }, (_, index) => {
    const moduleStart = index * lessonsPerModule + 1
    const moduleEnd = Math.min((index + 1) * lessonsPerModule, lessonCount)
    return {
      moduleNumber: index + 1,
      moduleTitle: `${primaryKeyword} Module ${index + 1}: Lessons ${moduleStart}-${Math.max(moduleStart, moduleEnd)}`,
    }
  })

  const lessons = Array.from({ length: lessonCount }, (_, lessonIndex) => {
    const baseRow = context.curriculum.sessionRows[lessonIndex]
    const titleSeed = baseRow?.title && !/^session\s+\d+$/i.test(baseRow.title) ? baseRow.title : `${primaryKeyword} Foundations`
    const lessonLabel = `Lesson ${lessonIndex + 1}`
    const topicCount = Math.max(1, baseRow?.topics ?? context.curriculum.topicsPerLesson ?? 2)
    const objectiveCount = Math.max(1, baseRow?.objectives ?? context.curriculum.objectivesPerTopic ?? 2)
    const taskCount = Math.max(1, baseRow?.tasks ?? context.curriculum.tasksPerObjective ?? 2)

    const topics = Array.from({ length: topicCount }, (_, topicIndex) => {
      const topicWord = keywords[(topicIndex + lessonIndex) % Math.max(1, keywords.length)]
      const topicSeed = topicWord ? titleCase(topicWord) : secondaryKeyword
      return `${topicSeed} Topic ${topicIndex + 1}`
    })

    const objectives = Array.from({ length: objectiveCount }, (_, objectiveIndex) => (
      `Apply ${primaryKeyword} in context ${objectiveIndex + 1}`
    ))

    const tasks = Array.from({ length: taskCount }, (_, taskIndex) => (
      `Complete ${secondaryKeyword} task ${taskIndex + 1}`
    ))

    return {
      lessonNumber: lessonIndex + 1,
      lessonTitle: `${lessonLabel}: ${titleCase(titleSeed)}`,
      topics,
      objectives,
      tasks,
    }
  })

  return { modules, lessons }
}

/**
 * Build generation context from course data
 */
export function buildGenerationContext(
  courseName: string,
  courseDescription: string | undefined,
  courseGoals: string | undefined,
  scheduleEntries: ScheduleEntry[],
  moduleOrg: string,
  moduleCount: number,
  lessonCount: number,
  topicsPerLesson: number,
  objectivesPerTopic: number,
  tasksPerObjective: number,
  sessionRows: CurriculumSessionRow[],
  options: { schedule: boolean; structure: boolean; existing: boolean },
  extras?: GenerationExtras,
): GenerationContext {
  return {
    courseName,
    courseDescription,
    courseGoals,
    courseLanguage: extras?.courseLanguage,
    schedule: scheduleEntries,
    curriculum: {
      moduleOrganization: moduleOrg,
      moduleCount,
      lessonCount,
      topicsPerLesson,
      objectivesPerTopic,
      tasksPerObjective,
      sequencingMode: extras?.sequencingMode,
      sessionRows: sessionRows.map((row, index) => ({
        sessionNumber: index + 1,
        title: row.title || `Session ${index + 1}`,
        templateType: row.template_type || "lesson",
        duration: row.duration_minutes ?? null,
        topics: row.topics ?? null,
        objectives: row.objectives ?? null,
        tasks: row.tasks ?? null,
      })),
    },
    classification: extras?.classification,
    pedagogy: extras?.pedagogy,
    courseGoalsList: extras?.courseGoalsList,
    keyTerms: extras?.keyTerms,
    mandatoryTopics: extras?.mandatoryTopics,
    priorKnowledge: extras?.priorKnowledge,
    applicationContext: extras?.applicationContext,
    resourceConstraints: extras?.resourceConstraints,
    namingRules: extras?.namingRules,
    students: extras?.students,
    options,
  }
}

/**
 * Format generation context as prompt for AI
 */
export function formatGenerationPrompt(context: GenerationContext): string {
  const scheduleInfo = context.options.schedule
    ? `
### Schedule Overview
- ${context.curriculum.sessionRows.length} sessions across ${context.schedule.length} dates
${context.schedule.slice(0, 5).map((e) => `- ${e.day} ${e.date}${e.start_time ? ` at ${e.start_time}` : ""}`).join("\n")}${context.schedule.length > 5 ? `\n- ... and ${context.schedule.length - 5} more dates` : ""}
`
    : ""

  const structureInfo = context.options.structure
    ? `
### Curriculum Structure
- Organization: ${context.curriculum.moduleOrganization}
- Modules: ${context.curriculum.moduleCount}
- Sessions/Lessons: ${context.curriculum.lessonCount}
- Average structure per lesson:
  - ${context.curriculum.topicsPerLesson} topic(s)
  - ${context.curriculum.objectivesPerTopic} objective(s) per topic
  - ${context.curriculum.tasksPerObjective} task(s) per objective
`
    : ""

  const sessionInfo =
    context.curriculum.sessionRows.length > 0
      ? `
### Sessions to Generate
${context.curriculum.sessionRows.slice(0, 10).map((s) => {
  const duration = s.duration ? ` (${s.duration}min)` : ""
  const customCounts = s.topics || s.objectives || s.tasks ? ` [${s.topics || "?"} topics, ${s.objectives || "?"} objectives, ${s.tasks || "?"} tasks]` : ""
  return `- Session ${s.sessionNumber}: "${s.title}"${duration}${customCounts}`
}).join("\n")}${context.curriculum.sessionRows.length > 10 ? `\n- ... and ${context.curriculum.sessionRows.length - 10} more sessions` : ""}
`
      : ""

  // Classification context
  const classificationInfo = context.classification
    ? `
### Classification
- Class Year: ${context.classification.classYear || "Not specified"}
- Curricular Framework: ${context.classification.framework || "Not specified"}
- Domain: ${context.classification.domain || "Not specified"}
- Subject: ${context.classification.subject || "Not specified"}
- Topic: ${context.classification.topic || "Not specified"}${context.classification.subtopic ? `\n- Subtopic: ${context.classification.subtopic}` : ""}${context.classification.previousCourse ? `\n- Previous Course: ${context.classification.previousCourse}` : ""}${context.classification.nextCourse ? `\n- Next Course: ${context.classification.nextCourse}` : ""}
`
    : ""

  // Pedagogy context
  const pedagogyInfo = context.pedagogy
    ? `
### Pedagogical Approach
- Style: ${context.pedagogy.approach}
- Teacher Role: ${context.pedagogy.teacherRole}
- Student Role: ${context.pedagogy.studentRole}
- Activities & Methods: ${context.pedagogy.activitiesMethods}
- Assessment Approach: ${context.pedagogy.assessment}
- Classroom Environment: ${context.pedagogy.classroomEnvironment}
`
    : ""

  // Course goals
  const goalsInfo = context.courseGoalsList && context.courseGoalsList.length > 0
    ? `
### Course Goals / Outcomes
${context.courseGoalsList.map((g, i) => `${i + 1}. ${g}`).join("\n")}
`
    : context.courseGoals
      ? `\n\nLearning Goals: ${context.courseGoals}`
      : ""

  // Key terms
  const keyTermsInfo = context.keyTerms && context.keyTerms.length > 0
    ? `
### Key Terms / Vocabulary
${context.keyTerms.join(", ")}
`
    : ""

  // Mandatory topics
  const mandatoryTopicsInfo = context.mandatoryTopics && context.mandatoryTopics.length > 0
    ? `
### Mandatory Topics (must be covered)
${context.mandatoryTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`
    : ""

  // Prior knowledge
  const priorKnowledgeInfo = context.priorKnowledge
    ? `
### Prior Knowledge Baseline
${context.priorKnowledge}
`
    : ""

  // Application context
  const applicationInfo = context.applicationContext
    ? `
### Application Context / Domain Lens
${context.applicationContext}
`
    : ""

  // Resource constraints
  const resourceInfo = context.resourceConstraints
    ? `
### Teaching Resource Constraints
${context.resourceConstraints}
`
    : ""

  // Sequencing mode
  const sequencingInfo = context.curriculum.sequencingMode && context.curriculum.sequencingMode !== "linear"
    ? `\n- Sequencing approach: ${context.curriculum.sequencingMode}`
    : ""

  // Naming rules
  const namingInfo = context.namingRules
    ? `
### Naming Conventions
${context.namingRules.lessonTitleRule ? `- Lesson titles: ${context.namingRules.lessonTitleRule}` : ""}${context.namingRules.topicRule ? `\n- Topic names: ${context.namingRules.topicRule}` : ""}${context.namingRules.objectiveRule ? `\n- Objectives: ${context.namingRules.objectiveRule}` : ""}${context.namingRules.taskRule ? `\n- Tasks: ${context.namingRules.taskRule}` : ""}
`
    : ""

  // Students context
  const studentsInfo = context.students
    ? `
### Class Profile
- Class size: ${context.students.totalStudents} student(s)
- Roster method: ${context.students.method}
`
    : ""

  // Language
  const languageInfo = context.courseLanguage
    ? `\n**Language:** Generate all content in ${context.courseLanguage}.`
    : ""

  return `Generate a detailed curriculum for the following course:

**Course:** ${context.courseName}${context.courseDescription ? `\n\nDescription: ${context.courseDescription}` : ""}${languageInfo}
${goalsInfo}
${classificationInfo}
${pedagogyInfo}
${priorKnowledgeInfo}
${keyTermsInfo}
${mandatoryTopicsInfo}
${applicationInfo}
${resourceInfo}
${studentsInfo}
${scheduleInfo}
${structureInfo}${sequencingInfo}
${sessionInfo}
${namingInfo}

Please generate:
1. Clear, descriptive titles for each session/lesson
2. 2-5 relevant topics per lesson
3. 2-3 measurable learning objectives per topic
4. 2-4 concrete, assessable tasks per objective

Ensure the curriculum is progressive, builds on prior knowledge, and aligns with the course goals and schedule.${context.mandatoryTopics && context.mandatoryTopics.length > 0 ? " All mandatory topics MUST appear in the curriculum." : ""}${context.namingRules ? " Follow the naming conventions specified above." : ""}

Return the generated curriculum as a clean JSON object with this structure:
{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "...",
      "topics": ["Topic 1", "Topic 2", ...],
      "objectives": ["Objective 1", "Objective 2", ...],
      "tasks": ["Task 1", "Task 2", ...]
    }
  ]
}
`
}

/**
 * Parse AI response and extract structured curriculum
 */
export function parseGenerationResponse(responseText: string): GenerationResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        message: "No JSON found in response",
        error: "Could not parse AI response as JSON",
      }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate structure
    if (!parsed.lessons || !Array.isArray(parsed.lessons)) {
      return {
        success: false,
        message: "Invalid curriculum structure",
        error: "Response missing 'lessons' array",
      }
    }

    // Validate lessons have required fields
    const validatedLessons = parsed.lessons.filter(
      (lesson: Record<string, unknown>) =>
        lesson.lessonNumber &&
        lesson.lessonTitle &&
        Array.isArray(lesson.topics) &&
        Array.isArray(lesson.objectives) &&
        Array.isArray(lesson.tasks),
    )

    if (validatedLessons.length === 0) {
      return {
        success: false,
        message: "No valid lessons in response",
        error: "Generated lessons do not have required structure",
      }
    }

    return {
      success: true,
      message: `Successfully generated curriculum for ${validatedLessons.length} lesson(s)`,
      content: {
        lessons: validatedLessons,
      },
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      message: "Failed to parse generation response",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Call the curriculum generation API route (which calls Ollama).
 * Falls back to the local keyword-based generator if the API is unreachable.
 */
export async function callGenerationAPI(
  context: GenerationContext,
): Promise<GenerationResponse> {
  const prompt = formatGenerationPrompt(context)

  try {
    const res = await fetch("/api/generate-curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: res.statusText }))
      const errorMsg = (errorBody as { error?: string }).error ?? `HTTP ${res.status}`
      console.warn("[callGenerationAPI] API route error, falling back to local generator:", errorMsg)

      // Fall back to local generator so the user still gets *something*
      const localContent = buildLocalGeneratedCurriculum(context)
      return {
        success: true,
        message: `AI service unavailable (${errorMsg}). Used local fallback generator.`,
        content: localContent,
        generatedAt: new Date().toISOString(),
      }
    }

    const { content: rawText } = (await res.json()) as { content: string }
    return parseGenerationResponse(rawText)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.warn("[callGenerationAPI] Fetch failed, falling back to local generator:", message)

    const localContent = buildLocalGeneratedCurriculum(context)
    return {
      success: true,
      message: `AI service unreachable (${message}). Used local fallback generator.`,
      content: localContent,
      generatedAt: new Date().toISOString(),
    }
  }
}
