export function buildModuleNamesFromGeneration(args: {
  generatedModules: Array<{ moduleNumber: number; moduleTitle: string }>
  persistedModuleNames: string[]
  desiredCount: number
}): string[] {
  const { generatedModules, persistedModuleNames, desiredCount } = args
  const safeCount = Math.max(1, desiredCount)
  const generatedByNumber = new Map(
    generatedModules.map((module) => [module.moduleNumber, module.moduleTitle]),
  )
  return Array.from({ length: safeCount }, (_, idx) => {
    const moduleNumber = idx + 1
    return generatedByNumber.get(moduleNumber)
      ?? persistedModuleNames[idx]
      ?? `Module ${moduleNumber}`
  })
}

function fallbackObjectiveLabel(index: number, objectivesPerTopic: number): string {
  const topicIdx = Math.floor(index / Math.max(1, objectivesPerTopic)) + 1
  const objectiveIdx = (index % Math.max(1, objectivesPerTopic)) + 1
  return `Objective ${topicIdx}.${objectiveIdx}`
}

function fallbackTaskLabel(index: number, objectivesPerTopic: number, tasksPerObjective: number): string {
  const safeTasksPerObjective = Math.max(1, tasksPerObjective)
  const safeObjectivesPerTopic = Math.max(1, objectivesPerTopic)
  const objectiveFlat = Math.floor(index / safeTasksPerObjective)
  const topicIdx = Math.floor(objectiveFlat / safeObjectivesPerTopic) + 1
  const objectiveIdx = (objectiveFlat % safeObjectivesPerTopic) + 1
  const taskIdx = (index % safeTasksPerObjective) + 1
  return `Task ${topicIdx}.${objectiveIdx}.${taskIdx}`
}

export function buildScopedObjectiveNames(args: {
  generated: string[] | undefined
  existing: string[] | undefined
  topicCount: number
  objectivesPerTopic: number
}): string[] {
  const { generated, existing, topicCount, objectivesPerTopic } = args
  const fullObjectives = Math.max(1, topicCount) * Math.max(1, objectivesPerTopic)
  return Array.from({ length: fullObjectives }, (_, i) => generated?.[i] ?? existing?.[i] ?? fallbackObjectiveLabel(i, objectivesPerTopic))
}

export function buildScopedTaskNames(args: {
  generated: string[] | undefined
  existing: string[] | undefined
  topicCount: number
  objectivesPerTopic: number
  tasksPerObjective: number
}): string[] {
  const { generated, existing, topicCount, objectivesPerTopic, tasksPerObjective } = args
  const fullTasks = Math.max(1, topicCount) * Math.max(1, objectivesPerTopic) * Math.max(1, tasksPerObjective)
  return Array.from({ length: fullTasks }, (_, i) => {
    return (
      generated?.[i]
      ?? existing?.[i]
      ?? fallbackTaskLabel(i, objectivesPerTopic, tasksPerObjective)
    )
  })
}

export function buildScopedTopicNames(args: {
  generated: string[] | undefined
  existing: string[] | undefined
  topicCount: number
}): string[] {
  const { generated, existing, topicCount } = args
  const fullTopics = Math.max(1, topicCount)
  return Array.from({ length: fullTopics }, (_, i) => generated?.[i] ?? existing?.[i] ?? `Topic ${i + 1}`)
}
