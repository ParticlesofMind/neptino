// Prompt formatting utilities extracted from ai-generation-service.ts
import type { GenerationContext, GenerationAction } from "@/lib/curriculum/ai-generation-service"

/**
 * Format generation context as a structured prompt for AI
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

  const goalsInfo = context.courseGoalsList && context.courseGoalsList.length > 0
    ? `
### Course Goals / Outcomes
${context.courseGoalsList.map((g, i) => `${i + 1}. ${g}`).join("\n")}
`
    : context.courseGoals
      ? `\n\nLearning Goals: ${context.courseGoals}`
      : ""

  const keyTermsInfo = context.keyTerms && context.keyTerms.length > 0
    ? `
### Key Terms / Vocabulary
${context.keyTerms.join(", ")}
`
    : ""

  const mandatoryTopicsInfo = context.mandatoryTopics && context.mandatoryTopics.length > 0
    ? `
### Mandatory Topics (must be covered)
${context.mandatoryTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`
    : ""

  const priorKnowledgeInfo = context.priorKnowledge
    ? `
### Prior Knowledge Baseline
${context.priorKnowledge}
`
    : ""

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

  const sequencingInfo = context.curriculum.sequencingMode && context.curriculum.sequencingMode !== "linear"
    ? `\n- Sequencing approach: ${context.curriculum.sequencingMode}`
    : ""

  const namingInfo = context.namingRules
    ? `
### Naming Conventions
${context.namingRules.lessonTitleRule ? `- Lesson titles: ${context.namingRules.lessonTitleRule}` : ""}${context.namingRules.topicRule ? `\n- Topic names: ${context.namingRules.topicRule}` : ""}${context.namingRules.objectiveRule ? `\n- Objectives: ${context.namingRules.objectiveRule}` : ""}${context.namingRules.taskRule ? `\n- Tasks: ${context.namingRules.taskRule}` : ""}
`
    : ""

  const studentsInfo = context.students
    ? `
### Class Profile
- Class size: ${context.students.totalStudents} student(s)
- Roster method: ${context.students.method}
`
    : ""

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
