import type { TaskAreaKind, TaskId, Topic } from "../types"

export const AREA_LABELS: Record<TaskAreaKind, string> = {
  instruction: "Instruction",
  practice: "Practice",
  feedback: "Feedback",
}

export const DEFAULT_TASK_SUFFIX = "-default-task"

export function findFirstVisibleTaskId(
  topics: Topic[],
  topicStart: number,
  topicEnd: number,
  objectiveStart: number,
  objectiveEnd?: number,
): TaskId | null {
  const visibleTopics = topics.slice(topicStart, topicEnd)
  if (visibleTopics.length === 0) return null

  for (const topic of visibleTopics) {
    const topicIdx = topics.findIndex((t) => t.id === topic.id)
    const objectivesBefore = topics
      .slice(0, Math.max(topicIdx, 0))
      .reduce((sum, t) => sum + t.objectives.length, 0)

    for (let objectiveIdx = 0; objectiveIdx < topic.objectives.length; objectiveIdx += 1) {
      const flatObjectiveIdx = objectivesBefore + objectiveIdx
      if (flatObjectiveIdx < objectiveStart) continue
      if (objectiveEnd !== undefined && flatObjectiveIdx >= objectiveEnd) continue

      const firstTaskId = topic.objectives[objectiveIdx]?.tasks[0]?.id
      if (firstTaskId) return firstTaskId
    }
  }

  return null
}

export function isBootstrappedTopic(topic: Topic): boolean {
  return (
    topic.label === "" &&
    topic.objectives.length === 1 &&
    (topic.objectives[0]?.label ?? "") === ""
  )
}
