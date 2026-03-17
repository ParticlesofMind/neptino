import type { CourseSession, Objective, SessionId, Task, Topic, TopicId, ObjectiveId } from "../types"

export function mapSession(
  sessions: CourseSession[],
  id: SessionId,
  fn: (session: CourseSession) => CourseSession,
): CourseSession[] {
  return sessions.map((session) => (session.id === id ? fn(session) : session))
}

export function countDroppedCards(topics: Topic[]): number {
  return topics
    .flatMap((topic) => topic.objectives)
    .flatMap((objective) => objective.tasks)
    .reduce((sum, task) => sum + task.droppedCards.length, 0)
}

export function buildDefaultTopicChain(
  sessionId: SessionId,
  taskId: Task["id"],
  firstTask: Task,
): Topic[] {
  const topicId = `${sessionId}-default-topic` as TopicId
  const objectiveId = `${sessionId}-default-obj` as ObjectiveId

  const objective: Objective = {
    id: objectiveId,
    topicId,
    label: "",
    order: 0,
    tasks: [{
      ...firstTask,
      objectiveId,
      id: taskId,
    }],
  }

  return [{
    id: topicId,
    sessionId,
    label: "",
    order: 0,
    objectives: [objective],
  }]
}