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
    resourcesPreferences: extras?.resourcesPreferences,
    namingRules: extras?.namingRules,
    students: extras?.students,
    options,
  }
}

/**
 * Format generation context as prompt for AI
 */
export function formatGenerationPrompt(context: GenerationContext, sourceExcerpts?: string, action: GenerationAction = "all"): string {
  const scheduleInfo = context.options.schedule
    ? `
### Schedule Overview
- ${context.curriculum.sessionRows.length} sessions across ${context.schedule.length} dates
${context.schedule.map((e) => `- ${e.day} ${e.date}${e.start_time ? ` at ${e.start_time}` : ""}`).join("\n")}
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
### Sessions to Generate (EXACTLY ${context.curriculum.sessionRows.length} lessons required)
${context.curriculum.sessionRows.map((s) => {
  const duration = s.duration ? ` (${s.duration}min)` : ""
  const customCounts = s.topics || s.objectives || s.tasks ? ` [${s.topics || "?"} topics, ${s.objectives || "?"} objectives, ${s.tasks || "?"} tasks]` : ""
  return `- Session ${s.sessionNumber}: "${s.title}"${duration}${customCounts}`
}).join("\n")}
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

  const sourcePriorityOrder: Record<string, number> = {
    very_high: 0,
    high: 1,
    medium: 2,
    low: 3,
    very_low: 4,
  }

  const resourcesInfo = context.resourcesPreferences && context.resourcesPreferences.length > 0
    ? `
### Preferred Open Sources (priority order)
${[...context.resourcesPreferences]
  .sort((a, b) => (sourcePriorityOrder[a.priority] ?? 99) - (sourcePriorityOrder[b.priority] ?? 99))
  .map((resource) => `- ${resource.label}: ${resource.priority.replace(/_/g, " ")}`)
  .join("\n")}
`
    : ""

  const excerptsInfo = sourceExcerpts
    ? `
### Source Excerpts
${sourceExcerpts}
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

  const outputInstructionByAction: Record<GenerationAction, string> = {
    all: "Generate full curriculum content: module titles, lesson titles, topics, objectives, and tasks.",
    modules: "Generate ONLY module titles. Do not generate lessons, topics, objectives, or tasks.",
    lessons: "Generate ONLY lesson titles for each lesson number. Keep topics/objectives/tasks empty arrays.",
    topics: "Generate ONLY topic titles for each lesson. Keep lesson titles unchanged and keep objectives/tasks empty arrays.",
    objectives: "Generate ONLY objectives for each lesson. Keep lesson titles unchanged and keep topics/tasks empty arrays.",
    tasks: "Generate ONLY tasks for each lesson. Keep lesson titles unchanged and keep topics/objectives empty arrays.",
  }

  const outputSchemaByAction: Record<GenerationAction, string> = {
    modules: `{
  "modules": [
    {
      "moduleNumber": 1,
      "moduleTitle": "..."
    }
  ]
}`,
    all: `{
  "modules": [
    {
      "moduleNumber": 1,
      "moduleTitle": "..."
    }
  ],
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "...",
      "topics": ["Topic 1", "Topic 2", ...],
      "objectives": ["Objective 1", "Objective 2", ...],
      "tasks": ["Task 1", "Task 2", ...]
    }
  ]
}`,
    lessons: `{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "...",
      "topics": [],
      "objectives": [],
      "tasks": []
    }
  ]
}`,
    topics: `{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "",
      "topics": ["Topic 1", "Topic 2", ...],
      "objectives": [],
      "tasks": []
    }
  ]
}`,
    objectives: `{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "",
      "topics": [],
      "objectives": ["Objective 1", "Objective 2", ...],
      "tasks": []
    }
  ]
}`,
    tasks: `{
  "lessons": [
    {
      "lessonNumber": 1,
      "lessonTitle": "",
      "topics": [],
      "objectives": [],
      "tasks": ["Task 1", "Task 2", ...]
    }
  ]
}`,
  }

  return `Generate a detailed curriculum for the following course:

**Course:** ${context.courseName}${context.courseDescription ? `\n\nDescription: ${context.courseDescription}` : ""}${languageInfo}
${goalsInfo}
${classificationInfo}
${pedagogyInfo}
${priorKnowledgeInfo}
${keyTermsInfo}
${mandatoryTopicsInfo}
${applicationInfo}
${resourcesInfo}
${excerptsInfo}
${studentsInfo}
${scheduleInfo}
${structureInfo}${sequencingInfo}
${sessionInfo}
${namingInfo}

Action requested: ${action}
${outputInstructionByAction[action]}

CRITICAL: You MUST generate EXACTLY ${context.curriculum.lessonCount} lessons — one for each session listed above. Do NOT skip any. Do NOT stop early. Do NOT generate fewer lessons than requested.
${action === "modules" ? `
For modules action: generate EXACTLY ${context.curriculum.moduleCount} module titles.
` : ""}

Ensure the curriculum is progressive, builds on prior knowledge, and aligns with the course goals and schedule.${context.mandatoryTopics && context.mandatoryTopics.length > 0 ? " All mandatory topics MUST appear in the curriculum." : ""}${context.namingRules ? " Follow the naming conventions specified above." : ""}

Return the generated curriculum as a clean JSON object with this structure:
${outputSchemaByAction[action]}
`
}

/**
 * Parse AI response and extract structured curriculum
 */
/**
 * Attempt to repair common JSON issues produced by LLMs.
 */
function repairJSON(raw: string): string {
  let s = raw
  // Remove BOM / zero-width chars
  s = s.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "")
  // Remove control characters except \n, \r, \t
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1")

  // Close truncated JSON
  let braces = 0, brackets = 0, inString = false, escape = false
  for (const ch of s) {
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") braces++
    else if (ch === "}") braces--
    else if (ch === "[") brackets++
    else if (ch === "]") brackets--
  }
  if (inString) s += '"'
  while (brackets > 0) { s += "]"; brackets-- }
  while (braces > 0) { s += "}"; braces-- }
  s = s.replace(/,\s*([}\]])/g, "$1")
  return s
}

/**
 * Regex-based fallback: extract individual lesson objects from malformed JSON.
 * Works even when the overall JSON structure is broken (e.g. truncated mid-lesson).
 */
function extractLessonsViaRegex(text: string): Record<string, unknown>[] {
  const lessons: Record<string, unknown>[] = []
  const lessonPattern = /\{\s*"lessonNumber"\s*:\s*(\d+)\s*,\s*"lessonTitle"\s*:\s*"([^"]*?)"/g
  let match

  while ((match = lessonPattern.exec(text)) !== null) {
    const startIdx = match.index

    // Find closing brace by counting depth
    let depth = 0, inStr = false, esc = false, endIdx = -1
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i]
      if (esc) { esc = false; continue }
      if (ch === "\\") { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === "{") depth++
      else if (ch === "}") { depth--; if (depth === 0) { endIdx = i; break } }
    }

    const fragment = endIdx === -1 ? text.slice(startIdx) : text.slice(startIdx, endIdx + 1)
    try {
      const repaired = endIdx === -1 ? repairJSON(fragment) : fragment
      const obj = JSON.parse(repaired) as Record<string, unknown>
      if (obj.lessonNumber && obj.lessonTitle) {
        lessons.push({
          lessonNumber: obj.lessonNumber,
          lessonTitle: obj.lessonTitle,
          topics: Array.isArray(obj.topics) ? obj.topics : [],
          objectives: Array.isArray(obj.objectives) ? obj.objectives : [],
          tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
        })
      }
    } catch {
      // Fragment too broken — skip
    }

    if (endIdx === -1) break // Truncated = last lesson
  }

  return lessons
}

export function parseGenerationResponse(responseText: string): GenerationResponse {
  try {
    // Strip any leftover <think> tags or markdown fences
    let cleaned = responseText
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/<think>[\s\S]*/g, "")
      .replace(/```(?:json)?\s*\n?/gi, "")
      .replace(/\n?```/gi, "")
      .trim()

    // ── Strategy 1: Standard JSON parse (with repair fallback) ──
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    if (jsonStart === -1) {
      return {
        success: false,
        message: "No JSON found in response",
        error: "Could not parse AI response as JSON",
      }
    }

    let jsonStr = jsonEnd > jsonStart
      ? cleaned.slice(jsonStart, jsonEnd + 1)
      : cleaned.slice(jsonStart)

    let parsed: Record<string, unknown> | null = null
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      try {
        jsonStr = repairJSON(jsonStr)
        parsed = JSON.parse(jsonStr)
      } catch {
        // Strategy 1 failed entirely — fall through to Strategy 2
      }
    }

    // Validate and return if Strategy 1 succeeded
    const validatedModules = Array.isArray(parsed?.modules)
      ? (parsed.modules as Record<string, unknown>[]).filter(
        (module) =>
          typeof module.moduleNumber === "number"
          && typeof module.moduleTitle === "string"
          && module.moduleTitle.trim().length > 0,
      ) as GeneratedCurriculumContent["modules"]
      : []

    const validatedLessons = Array.isArray(parsed?.lessons)
      ? (parsed.lessons as Record<string, unknown>[]).filter(
        (lesson) =>
          lesson.lessonNumber &&
          lesson.lessonTitle &&
          Array.isArray(lesson.topics) &&
          Array.isArray(lesson.objectives) &&
          Array.isArray(lesson.tasks),
      ) as GeneratedCurriculumContent["lessons"]
      : []

    if ((validatedLessons?.length ?? 0) > 0 || (validatedModules?.length ?? 0) > 0) {
      const parts: string[] = []
      if ((validatedModules?.length ?? 0) > 0) parts.push(`${validatedModules?.length} module(s)`)
      if ((validatedLessons?.length ?? 0) > 0) parts.push(`${validatedLessons?.length} lesson(s)`)
      return {
        success: true,
        message: `Successfully generated ${parts.join(" and ")}`,
        content: {
          ...(validatedModules && validatedModules.length > 0 ? { modules: validatedModules } : {}),
          ...(validatedLessons && validatedLessons.length > 0 ? { lessons: validatedLessons } : {}),
        },
        generatedAt: new Date().toISOString(),
      }
    }

    // ── Strategy 2: Regex-based lesson extraction ──
    const extractedLessons = extractLessonsViaRegex(cleaned) as GeneratedCurriculumContent["lessons"]
    if (extractedLessons && extractedLessons.length > 0) {
      return {
        success: true,
        message: `Successfully extracted ${extractedLessons.length} lesson(s) from partial response`,
        content: { lessons: extractedLessons },
        generatedAt: new Date().toISOString(),
      }
    }

    return {
      success: false,
      message: "No valid lessons in response",
      error: "Could not extract any valid lessons from AI response",
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
 * Does NOT silently fall back — returns explicit errors so the UI can inform the user.
 */
export async function callGenerationAPI(
  context: GenerationContext,
  selectedModel?: string,
  externalSignal?: AbortSignal,
  action: GenerationAction = "all",
): Promise<GenerationResponse> {
  let sourceExcerpts = ""
  try {
    const retrievalController = new AbortController()
    const retrievalTimeout = setTimeout(() => retrievalController.abort(), 12_000)
    const retrievalRes = await fetch("/api/retrieve-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          courseName: context.courseName,
          courseDescription: context.courseDescription,
          keyTerms: context.keyTerms,
          mandatoryTopics: context.mandatoryTopics,
        },
        resourcesPreferences: context.resourcesPreferences ?? [],
      }),
      signal: retrievalController.signal,
    })
    clearTimeout(retrievalTimeout)

    if (retrievalRes.ok) {
      const data = (await retrievalRes.json()) as {
        excerpts?: Array<{ sourceLabel: string; title: string; excerpt: string; url?: string }>
        skipped?: Array<{ sourceId: string; reason: string }>
      }
      const excerpts = data.excerpts ?? []
      const excerptLines = excerpts.map((item) => {
        const url = item.url ? ` (${item.url})` : ""
        return `- [${item.sourceLabel}] ${item.title}: ${item.excerpt}${url}`
      })
      const skippedLines = (data.skipped ?? []).map((item) => `- ${item.sourceId}: ${item.reason}`)
      sourceExcerpts = [
        ...excerptLines,
        ...(skippedLines.length > 0 ? ["", "Notes:", ...skippedLines] : []),
      ].join("\n")
    }
  } catch {
    // Retrieval is best-effort; continue without excerpts.
  }

  const prompt = formatGenerationPrompt(context, sourceExcerpts, action)
  console.log("[callGenerationAPI] Prompt length:", prompt.length, "chars")
  console.log("[callGenerationAPI] Lesson count requested:", context.curriculum.lessonCount)
  if (selectedModel) {
    console.log("[callGenerationAPI] Selected model:", selectedModel)
  }

  // 10-minute timeout — local models like deepseek-r1 can be very slow
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)
  let abortedByCaller = Boolean(externalSignal?.aborted)

  const onExternalAbort = () => {
    abortedByCaller = true
    controller.abort()
  }

  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true })
  }

  try {
    console.log("[callGenerationAPI] Calling /api/generate-curriculum …")
    const res = await fetch("/api/generate-curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, action, ...(selectedModel && { model: selectedModel }) }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort)
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: res.statusText }))
      const errorMsg = (errorBody as { error?: string }).error ?? `HTTP ${res.status}`
      console.error("[callGenerationAPI] API route returned error:", res.status, errorMsg)
      return {
        success: false,
        message: "AI generation failed",
        error: `Ollama error: ${errorMsg}`,
      }
    }

    const { content: rawText } = (await res.json()) as { content: string }
    console.log("[callGenerationAPI] Got response, length:", rawText?.length ?? 0)

    if (!rawText) {
      return {
        success: false,
        message: "AI returned empty content",
        error: "The model returned an empty response. Try again.",
      }
    }

    const result = parseGenerationResponse(rawText)
    console.log("[callGenerationAPI] Parse result:", result.success, result.message)
    if (result.content?.lessons) {
      console.log("[callGenerationAPI] Lessons generated:", result.content.lessons.length)
      console.log("[callGenerationAPI] First lesson title:", result.content.lessons[0]?.lessonTitle)
    }
    return result
  } catch (error) {
    clearTimeout(timeoutId)
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort)
    }
    const message = error instanceof Error ? error.message : "Unknown error"

    if (error instanceof DOMException && error.name === "AbortError") {
      if (abortedByCaller) {
        return {
          success: false,
          message: "Generation canceled",
          error: "The generation run was canceled.",
        }
      }
      console.error("[callGenerationAPI] Request timed out after 10 minutes")
      return {
        success: false,
        message: "Generation timed out",
        error: "The model took longer than 10 minutes to respond. For better performance, try: (1) Reducing lesson count to 20-40 lessons, (2) Using a faster model like Llama 3.2 or Phi 3, or (3) Splitting generation into smaller batches.",
      }
    }

    console.error("[callGenerationAPI] Fetch failed:", message)
    return {
      success: false,
      message: "Cannot reach AI service",
      error: `Could not connect to the generation API: ${message}. Is the dev server running?`,
    }
  }
}
