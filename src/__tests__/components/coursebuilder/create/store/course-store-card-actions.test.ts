import { beforeEach, describe, expect, it } from "vitest"

import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import type {
  CanvasId,
  CardId,
  CourseId,
  CourseSession,
  DroppedCard,
  DroppedCardId,
  ObjectiveId,
  SessionId,
  TaskId,
  TopicId,
} from "@/components/coursebuilder/create/types"

const sessionId = "session-1" as SessionId
const taskId = "task-1" as TaskId

function droppedCard(id: string, overrides: Partial<DroppedCard> = {}): DroppedCard {
  return {
    id: id as DroppedCardId,
    cardId: `${id}-source` as CardId,
    cardType: "text",
    taskId,
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: { width: 320, height: 180 },
    content: { title: id },
    order: 1,
    ...overrides,
  }
}

function sessionWithCards(cards: DroppedCard[]): CourseSession {
  const topicId = "topic-1" as TopicId
  const objectiveId = "objective-1" as ObjectiveId

  return {
    id: sessionId,
    courseId: "course-1" as CourseId,
    order: 1,
    title: "Session 1",
    canvases: [{ id: "canvas-1" as CanvasId, sessionId, pageNumber: 1 }],
    topics: [
      {
        id: topicId,
        sessionId,
        label: "Topic",
        order: 0,
        objectives: [
          {
            id: objectiveId,
            topicId,
            label: "Objective",
            order: 0,
            tasks: [{ id: taskId, objectiveId, label: "Task", order: 0, droppedCards: cards }],
          },
        ],
      },
    ],
  }
}

function currentCards(): DroppedCard[] {
  return useCourseStore.getState().sessions[0]!.topics[0]!.objectives[0]!.tasks[0]!.droppedCards
}

describe("course store card actions", () => {
  beforeEach(() => {
    useCourseStore.persist.clearStorage()
    useCourseStore.setState({ sessions: [], activeSessionId: null })
  })

  it("updates card title, position, and dimensions without changing type", () => {
    useCourseStore.setState({
      sessions: [sessionWithCards([droppedCard("card-1")])],
      activeSessionId: sessionId,
    })

    useCourseStore.getState().updateDroppedCard(sessionId, taskId, "card-1", {
      content: { title: "Renamed card" },
      position: { x: 24, y: 48 },
      dimensions: { width: 520, height: 360 },
    })

    const [card] = currentCards()
    expect(card?.cardType).toBe("text")
    expect(card?.content.title).toBe("Renamed card")
    expect(card?.position).toEqual({ x: 24, y: 48 })
    expect(card?.dimensions).toEqual({ width: 520, height: 360 })
  })

  it("updates cards nested inside layout slots", () => {
    const nested = droppedCard("nested-card")
    const layout = droppedCard("layout-card", {
      cardType: "layout-feature",
      content: { title: "Layout", slots: { 0: [nested] } },
    })
    useCourseStore.setState({
      sessions: [sessionWithCards([layout])],
      activeSessionId: sessionId,
    })

    useCourseStore.getState().updateDroppedCard(sessionId, taskId, "nested-card", {
      content: { title: "Nested rename" },
      dimensions: { width: 260, height: 140 },
    })

    const updatedLayout = currentCards()[0]
    const slots = updatedLayout?.content.slots as Record<string, DroppedCard[]>
    expect(slots[0]?.[0]?.content.title).toBe("Nested rename")
    expect(slots[0]?.[0]?.dimensions).toEqual({ width: 260, height: 140 })
    expect(slots[0]?.[0]?.cardType).toBe("text")
  })
})
