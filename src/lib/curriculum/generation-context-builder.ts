// Context-building utilities extracted from ai-generation-service.ts
// Handles local curriculum generation and building the GenerationContext object.
import { MIN_TASKS_PER_OBJECTIVE, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import type {
  GenerationContext,
  GeneratedCurriculumContent,
  ScheduleEntry,
  CurriculumSessionRow,
  GenerationExtras,
} from "@/lib/curriculum/ai-generation-service"

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

export function buildLocalGeneratedCurriculum(context: GenerationContext): GeneratedCurriculumContent {
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
    const normalizedCounts = normalizeContentLoadConfig(
      {
        topicsPerLesson: baseRow?.topics ?? context.curriculum.topicsPerLesson ?? 2,
        objectivesPerTopic: baseRow?.objectives ?? context.curriculum.objectivesPerTopic ?? 2,
        tasksPerObjective: baseRow?.tasks ?? context.curriculum.tasksPerObjective ?? MIN_TASKS_PER_OBJECTIVE,
      },
      baseRow?.duration ?? null,
    )
    const topicCount = normalizedCounts.topicsPerLesson
    const objectiveCount = normalizedCounts.objectivesPerTopic
    const taskCount = normalizedCounts.tasksPerObjective

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
  const normalizedGlobalCounts = normalizeContentLoadConfig({
    topicsPerLesson,
    objectivesPerTopic,
    tasksPerObjective,
  })

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
      topicsPerLesson: normalizedGlobalCounts.topicsPerLesson,
      objectivesPerTopic: normalizedGlobalCounts.objectivesPerTopic,
      tasksPerObjective: normalizedGlobalCounts.tasksPerObjective,
      sequencingMode: extras?.sequencingMode,
      sessionRows: sessionRows.map((row, index) => ({
        ...(() => {
          const normalizedSessionCounts = normalizeContentLoadConfig(
            {
              topicsPerLesson: row.topics ?? normalizedGlobalCounts.topicsPerLesson,
              objectivesPerTopic: row.objectives ?? normalizedGlobalCounts.objectivesPerTopic,
              tasksPerObjective: row.tasks ?? normalizedGlobalCounts.tasksPerObjective,
            },
            row.duration_minutes ?? null,
          )
          return {
            topics: normalizedSessionCounts.topicsPerLesson,
            objectives: normalizedSessionCounts.objectivesPerTopic,
            tasks: normalizedSessionCounts.tasksPerObjective,
          }
        })(),
        sessionNumber: index + 1,
        title: row.title || `Session ${index + 1}`,
        templateType: row.template_type || "lesson",
        duration: row.duration_minutes ?? null,
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
