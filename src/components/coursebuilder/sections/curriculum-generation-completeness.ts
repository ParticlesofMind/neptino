import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"
import type { CurriculumSessionRow } from "./curriculum-section-utils"

interface CompletenessParams {
  action: GenerationAction
  moduleNames: string[]
  moduleCount: number
  rows: CurriculumSessionRow[]
  defaultTopics: number
  defaultObjectives: number
  defaultTasks: number
}

function isPlaceholder(value: string, prefix: string): boolean {
  const pattern = new RegExp(`^${prefix}\\s+\\d+(?:[.\\d]+)?$`, "i")
  return pattern.test(value.trim())
}

function isMeaningful(value: string | undefined, prefix: string): boolean {
  if (!value) return false
  const normalized = value.trim()
  if (!normalized) return false
  return !isPlaceholder(normalized, prefix)
}

export function getGenerationCompletenessIssues(params: CompletenessParams): string[] {
  const { action, moduleNames, moduleCount, rows, defaultTopics, defaultObjectives, defaultTasks } = params
  const issues: string[] = []

  if (action === "all" || action === "modules") {
    const requiredModules = Math.max(1, moduleCount)
    for (let i = 0; i < requiredModules; i += 1) {
      if (!isMeaningful(moduleNames[i], "Module")) {
        issues.push(`module ${i + 1} missing meaningful name`)
      }
    }
  }

  for (const row of rows) {
    const sessionNumber = row.session_number ?? 0
    const topicCount = Math.max(1, row.topics ?? defaultTopics)
    const objectivesPerTopic = Math.max(1, row.objectives ?? defaultObjectives)
    const tasksPerObjective = Math.max(1, row.tasks ?? defaultTasks)
    const expectedObjectives = topicCount * objectivesPerTopic
    const expectedTasks = topicCount * objectivesPerTopic * tasksPerObjective

    if ((action === "all" || action === "sessions") && !isMeaningful(row.title, "Session")) {
      issues.push(`session ${sessionNumber} title missing meaningful value`)
    }

    if (action === "all" || action === "topics") {
      if ((row.topic_names?.length ?? 0) !== topicCount) {
        issues.push(`session ${sessionNumber} topics count mismatch`)
      }
      if ((row.topic_names ?? []).some((name) => !isMeaningful(name, "Topic"))) {
        issues.push(`session ${sessionNumber} has placeholder/empty topics`)
      }
    }

    if (action === "all" || action === "objectives") {
      if ((row.objective_names?.length ?? 0) !== expectedObjectives) {
        issues.push(`session ${sessionNumber} objectives count mismatch`)
      }
      if ((row.objective_names ?? []).some((name) => !isMeaningful(name, "Objective"))) {
        issues.push(`session ${sessionNumber} has placeholder/empty objectives`)
      }
    }

    if (action === "all" || action === "tasks") {
      if ((row.task_names?.length ?? 0) !== expectedTasks) {
        issues.push(`session ${sessionNumber} tasks count mismatch`)
      }
      if ((row.task_names ?? []).some((name) => !isMeaningful(name, "Task"))) {
        issues.push(`session ${sessionNumber} has placeholder/empty tasks`)
      }
    }
  }

  return issues
}
