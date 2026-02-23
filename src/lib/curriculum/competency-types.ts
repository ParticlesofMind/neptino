/**
 * Competency Types
 * 4-level curriculum hierarchy: Competency → Topic → Objective → Task
 * Based on legacy curriculum patterns
 */

export interface CurriculumTask {
  id: string
  number: number
  title: string
  description?: string
}

export interface CurriculumObjective {
  id: string
  number: number
  title: string
  description?: string
  tasks?: CurriculumTask[]
}

export interface CurriculumTopic {
  id: string
  number: number
  title: string
  description?: string
  objectives?: CurriculumObjective[]
}

export interface CurriculumCompetency {
  id: string
  number: number
  title: string
  description?: string
  topics?: CurriculumTopic[]
}

/**
 * Helper function to generate unique IDs for curriculum items
 */
export function generateCurriculumId(type: "competency" | "topic" | "objective" | "task"): string {
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Count total items at each level in a competency hierarchy
 */
export function countCompetencyHierarchy(competencies: CurriculumCompetency[]): {
  competencies: number
  topics: number
  objectives: number
  tasks: number
} {
  let topicCount = 0
  let objectiveCount = 0
  let taskCount = 0

  competencies.forEach((comp) => {
    comp.topics?.forEach((topic) => {
      topicCount++
      topic.objectives?.forEach((obj) => {
        objectiveCount++
        taskCount += obj.tasks?.length ?? 0
      })
    })
  })

  return {
    competencies: competencies.length,
    topics: topicCount,
    objectives: objectiveCount,
    tasks: taskCount,
  }
}

/**
 * Flatten hierarchical structure for list display
 */
export function flattenCompetencyHierarchy(competencies: CurriculumCompetency[]): Array<{
  type: "competency" | "topic" | "objective" | "task"
  id: string
  level: number
  number: string
  title: string
}> {
  const flattened: Array<{
    type: "competency" | "topic" | "objective" | "task"
    id: string
    level: number
    number: string
    title: string
  }> = []

  competencies.forEach((comp) => {
    flattened.push({
      type: "competency",
      id: comp.id,
      level: 0,
      number: `${comp.number}`,
      title: comp.title,
    })

    comp.topics?.forEach((topic) => {
      flattened.push({
        type: "topic",
        id: topic.id,
        level: 1,
        number: `${comp.number}.${topic.number}`,
        title: topic.title,
      })

      topic.objectives?.forEach((obj) => {
        flattened.push({
          type: "objective",
          id: obj.id,
          level: 2,
          number: `${comp.number}.${topic.number}.${obj.number}`,
          title: obj.title,
        })

        obj.tasks?.forEach((task) => {
          flattened.push({
            type: "task",
            id: task.id,
            level: 3,
            number: `${comp.number}.${topic.number}.${obj.number}.${task.number}`,
            title: task.title,
          })
        })
      })
    })
  })

  return flattened
}
