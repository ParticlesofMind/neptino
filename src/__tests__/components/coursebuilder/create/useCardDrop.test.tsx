import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { useCardDrop } from "@/components/coursebuilder/create/hooks/useCardDrop"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import type {
  CanvasId,
  CardId,
  CourseId,
  CourseSession,
  DroppedCardId,
  ObjectiveId,
  SessionId,
  TaskId,
  TopicId,
} from "@/components/coursebuilder/create/types"

function buildSession(): {
  session: CourseSession
  taskAId: TaskId
  taskBId: TaskId
  sessionId: SessionId
} {
  const sessionId = "session-1" as SessionId
  const topicId = "topic-1" as TopicId
  const objectiveId = "objective-1" as ObjectiveId
  const taskAId = "task-a" as TaskId
  const taskBId = "task-b" as TaskId

  return {
    sessionId,
    taskAId,
    taskBId,
    session: {
      id: sessionId,
      courseId: "course-1" as CourseId,
      order: 1,
      title: "Session 1",
      canvases: [
        {
          id: "canvas-1" as CanvasId,
          sessionId,
          pageNumber: 1,
          blockKeys: ["content"],
        },
      ],
      topics: [
        {
          id: topicId,
          sessionId,
          label: "Topic 1",
          order: 0,
          objectives: [
            {
              id: objectiveId,
              topicId,
              label: "Objective 1",
              order: 0,
              tasks: [
                {
                  id: taskAId,
                  objectiveId,
                  label: "Task A",
                  order: 0,
                  droppedCards: [],
                },
                {
                  id: taskBId,
                  objectiveId,
                  label: "Task B",
                  order: 1,
                  droppedCards: [],
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

function resetStoreWithSession(session: CourseSession) {
  useCourseStore.setState({
    sessions: [session],
    activeSessionId: session.id,
  })
}

describe("canvas drop acceptance", () => {
  beforeEach(() => {
    useCourseStore.persist.clearStorage()
  })

  it("stores dropped cards on an existing task", () => {
    const { session, sessionId, taskAId } = buildSession()
    resetStoreWithSession(session)

    const addDroppedCard = useCourseStore.getState().addDroppedCard

    act(() => {
      addDroppedCard(sessionId, taskAId, {
        id: "drop-1" as DroppedCardId,
        cardId: "card-1" as CardId,
        cardType: "text",
        taskId: taskAId,
        areaKind: "instruction",
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        content: { title: "Dropped text" },
        order: Date.now(),
      })
    })

    const updated = useCourseStore.getState().sessions[0]
    const cards = updated.topics[0].objectives[0].tasks[0].droppedCards

    expect(cards).toHaveLength(1)
    expect(cards[0]?.cardId).toBe("card-1")
  })

  it("prefers specific task-area collision over broad body target", () => {
    const { session, sessionId, taskAId, taskBId } = buildSession()
    resetStoreWithSession(session)

    const { result } = renderHook(() => useCardDrop())

    act(() => {
      result.current.onDragEnd({
        active: {
          data: {
            current: {
              type: "card",
              cardId: "card-2" as CardId,
              cardType: "layout-sixgrid",
              title: "Card 2",
              content: { title: "Card 2" },
            },
          },
        },
        over: {
          id: `${sessionId}:body`,
          data: {
            current: {
              sessionId,
              taskId: taskAId,
              areaKind: "instruction",
            },
          },
        },
        collisions: [{ id: `${sessionId}:${taskBId}:practice` }],
      } as never)
    })

    const updated = useCourseStore.getState().sessions[0]
    const taskA = updated.topics[0].objectives[0].tasks.find((t) => t.id === taskAId)
    const taskB = updated.topics[0].objectives[0].tasks.find((t) => t.id === taskBId)

    expect(taskA?.droppedCards ?? []).toHaveLength(0)
    expect(taskB?.droppedCards ?? []).toHaveLength(1)
    expect(taskB?.droppedCards[0]?.areaKind).toBe("practice")
  })

  it("does not fall back to a body drop when blockKey collisions exist", () => {
    const { session, sessionId, taskAId } = buildSession()
    resetStoreWithSession(session)
    const { result } = renderHook(() => useCardDrop())

    // simulate a situation where both the broad body area and a catch-all
    // for the content block are reported as collisions; previously the body
    // droppable could win and yield card.blockKey === undefined.
    act(() => {
      result.current.onDragEnd({
        active: {
          data: {
            current: {
              type: "card",
              cardId: "card-3" as CardId,
              cardType: "layout-sixgrid",
              title: "Card 3",
              content: { title: "Card 3" },
            },
          },
        },
        over: {
          id: `${sessionId}:body`,
          data: {
            current: {
              sessionId,
              taskId: taskAId,
              areaKind: "instruction",
            },
          },
        },
        collisions: [
          { 
            id: `${sessionId}:body`,
            data: { droppableContainer: { data: { current: { sessionId, taskId: taskAId, areaKind: "instruction" } } } },
          },
          {
            id: `${sessionId}:content:catchall`,
            data: { droppableContainer: { data: { current: { sessionId, taskId: taskAId, areaKind: "instruction", blockKey: "content" } } } },
          },
        ],
      } as never)
    })

    const updated = useCourseStore.getState().sessions[0]
    const cards = updated.topics[0].objectives[0].tasks[0].droppedCards
    expect(cards).toHaveLength(1)
    expect(cards[0]?.blockKey).toBe("content")
  })

  it("chooses the over target when multiple block-level collisions occur", () => {
    const { session, sessionId, taskAId } = buildSession()
    resetStoreWithSession(session)
    const { result } = renderHook(() => useCardDrop())

    // collisions list contains both content and assignment catchalls; the
    // pointer is directly over the assignment zone, so assignment should win.
    act(() => {
      result.current.onDragEnd({
        active: {
          data: {
            current: {
              type: "card",
              cardId: "card-4" as CardId,
              cardType: "layout-sixgrid",
              title: "Card 4",
              content: { title: "Card 4" },
            },
          },
        },
        over: {
          id: `${sessionId}:assignment:catchall`,
          data: {
            current: {
              sessionId,
              taskId: taskAId,
              areaKind: "instruction",
              blockKey: "assignment",
            },
          },
        },
        collisions: [
          {
            id: `${sessionId}:content:catchall`,
            data: { droppableContainer: { data: { current: { sessionId, taskId: taskAId, areaKind: "instruction", blockKey: "content" } } } },
          },
          {
            id: `${sessionId}:assignment:catchall`,
            data: { droppableContainer: { data: { current: { sessionId, taskId: taskAId, areaKind: "instruction", blockKey: "assignment" } } } },
          },
        ],
      } as never)
    })

    const updated = useCourseStore.getState().sessions[0]
    const cards = updated.topics[0].objectives[0].tasks[0].droppedCards
    expect(cards).toHaveLength(1)
    expect(cards[0]?.blockKey).toBe("assignment")
  })

  it("re-expands card range after delete then add on same canvas", () => {
    const { session, sessionId, taskAId } = buildSession()
    const canvasAId = session.canvases[0]!.id

    session.canvases = [
      {
        id: canvasAId,
        sessionId,
        pageNumber: 1,
        blockKeys: [],
        contentCardRange: { start: 0, end: 1 },
      },
      {
        id: "canvas-2" as CanvasId,
        sessionId,
        pageNumber: 2,
        blockKeys: [],
        contentCardRange: { start: 1, end: 1 },
      },
    ]

    session.topics[0]!.objectives[0]!.tasks[0]!.droppedCards = [
      {
        id: "drop-1" as DroppedCardId,
        cardId: "card-1" as CardId,
        cardType: "text",
        taskId: taskAId,
        areaKind: "instruction",
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        content: { title: "Existing" },
        order: 1,
      },
    ]

    resetStoreWithSession(session)

    const { addDroppedCard, removeDroppedCard } = useCourseStore.getState()

    act(() => {
      removeDroppedCard(sessionId, taskAId, "drop-1")
    })

    const afterDelete = useCourseStore.getState().sessions[0]
    expect(afterDelete?.canvases[0]?.contentCardRange).toEqual({ start: 0, end: 0 })

    act(() => {
      addDroppedCard(
        sessionId,
        taskAId,
        {
          id: "drop-2" as DroppedCardId,
          cardId: "card-2" as CardId,
          cardType: "text",
          taskId: taskAId,
          areaKind: "instruction",
          position: { x: 0, y: 0 },
          dimensions: { width: 0, height: 0 },
          content: { title: "Re-added" },
          order: 2,
        },
        canvasAId,
      )
    })

    const updated = useCourseStore.getState().sessions[0]
    const cards = updated?.topics[0]?.objectives[0]?.tasks[0]?.droppedCards ?? []

    expect(cards).toHaveLength(1)
    expect(cards[0]?.cardId).toBe("card-2")
    expect(updated?.canvases[0]?.contentCardRange).toEqual({ start: 0, end: 1 })
  })

  it("accepts layout cards dropped directly into a task area", () => {
    const { session, sessionId, taskAId } = buildSession()
    resetStoreWithSession(session)

    const { result } = renderHook(() => useCardDrop())

    act(() => {
      result.current.onDragEnd({
        active: {
          data: {
            current: {
              type: "card",
              cardId: "card-layout-1" as CardId,
              cardType: "layout-sixgrid",
              title: "Large layout",
              content: { title: "Large layout" },
            },
          },
        },
        over: {
          id: `${sessionId}:${taskAId}:feedback`,
          data: {
            current: {
              sessionId,
              taskId: taskAId,
              areaKind: "feedback",
              blockKey: "content",
            },
          },
        },
        collisions: [{ id: `${sessionId}:${taskAId}:feedback:content` }],
      } as never)
    })

    const updated = useCourseStore.getState().sessions[0]
    const taskA = updated.topics[0].objectives[0].tasks.find((t) => t.id === taskAId)

    expect(taskA?.droppedCards ?? []).toHaveLength(1)
    expect(taskA?.droppedCards[0]?.cardType).toBe("layout-sixgrid")
    expect(taskA?.droppedCards[0]?.areaKind).toBe("feedback")
  })

  it("rejects non-layout card drops into tasks that only contain layout cards", () => {
    const { session, sessionId, taskAId } = buildSession()
    session.topics[0]!.objectives[0]!.tasks[0]!.droppedCards = [
      {
        id: "drop-layout-existing" as DroppedCardId,
        cardId: "card-layout-existing" as CardId,
        cardType: "layout-sixgrid",
        taskId: taskAId,
        areaKind: "instruction",
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        content: { title: "Existing layout" },
        order: 1,
      },
    ]
    resetStoreWithSession(session)

    const { result } = renderHook(() => useCardDrop())

    act(() => {
      result.current.onDragEnd({
        active: {
          data: {
            current: {
              type: "card",
              cardId: "card-text-1" as CardId,
              cardType: "text",
              title: "Plain text",
              content: { title: "Plain text" },
            },
          },
        },
        over: {
          id: `${sessionId}:${taskAId}:instruction`,
          data: {
            current: {
              sessionId,
              taskId: taskAId,
              areaKind: "instruction",
              blockKey: "content",
            },
          },
        },
        collisions: [{ id: `${sessionId}:${taskAId}:instruction:content` }],
      } as never)
    })

    const updated = useCourseStore.getState().sessions[0]
    const taskA = updated.topics[0].objectives[0].tasks.find((t) => t.id === taskAId)

    expect(taskA?.droppedCards ?? []).toHaveLength(1)
    expect(taskA?.droppedCards[0]?.cardType).toBe("layout-sixgrid")
  })
})
