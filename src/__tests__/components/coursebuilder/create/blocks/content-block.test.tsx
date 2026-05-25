import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { ContentBlock } from "@/components/coursebuilder/create/blocks/Content"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import type {
  CanvasId,
  CourseId,
  CourseSession,
  DroppedCard,
  DroppedCardId,
  ObjectiveId,
  SessionId,
  TaskId,
  TopicId,
} from "@/components/coursebuilder/create/types"

function card(
  id: string,
  taskId: TaskId,
  blockKey: "content" | "assignment",
  order: number,
): DroppedCard {
  return {
    id: id as DroppedCardId,
    cardId: `${id}-source` as DroppedCard["cardId"],
    taskId,
    areaKind: "instruction",
    blockKey,
    cardType: "text",
    position: { x: 0, y: 0 },
    dimensions: { width: 320, height: 160 },
    content: { title: id, text: `<p>${id}</p>` },
    order,
  }
}

function buildSession({
  assignmentStartsAfterContent,
  earlierAssignmentCard,
}: {
  assignmentStartsAfterContent: boolean
  earlierAssignmentCard: boolean
}): { session: CourseSession; canvasId: CanvasId } {
  const sessionId = "session-1" as SessionId
  const canvasId = "canvas-1" as CanvasId
  const topicId = "topic-1" as TopicId
  const objectiveId = "objective-1" as ObjectiveId
  const firstTaskId = "task-1" as TaskId
  const secondTaskId = "task-2" as TaskId

  const firstTaskCards = earlierAssignmentCard
    ? [card("assignment-before-range", firstTaskId, "assignment", 1)]
    : assignmentStartsAfterContent
      ? [card("content-before-assignment", firstTaskId, "content", 1)]
      : []

  return {
    canvasId,
    session: {
      id: sessionId,
      courseId: "course-1" as CourseId,
      order: 0,
      title: "Session 1",
      canvases: [
        {
          id: canvasId,
          sessionId,
          pageNumber: 1,
          blockKeys: ["assignment"],
          contentCardRange: { start: 1, end: 2 },
        },
      ],
      topics: [
        {
          id: topicId,
          sessionId,
          label: "Elizabethan London",
          order: 0,
          objectives: [
            {
              id: objectiveId,
              topicId,
              label: "Identify the course lens",
              order: 0,
              tasks: [
                {
                  id: firstTaskId,
                  objectiveId,
                  label: "Opening sequence",
                  order: 0,
                  droppedCards: firstTaskCards,
                },
                {
                  id: secondTaskId,
                  objectiveId,
                  label: "Context claim",
                  order: 1,
                  droppedCards: [card("assignment-in-range", secondTaskId, "assignment", 2)],
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

describe("ContentBlock", () => {
  beforeEach(() => {
    localStorage.clear()
    useCourseStore.setState({ sessions: [], activeSessionId: null })
  })

  it("shows the assignment heading when the page starts after content cards from another block", () => {
    const { session, canvasId } = buildSession({
      assignmentStartsAfterContent: true,
      earlierAssignmentCard: false,
    })
    useCourseStore.setState({ sessions: [session], activeSessionId: session.id })

    render(
      <DndContext>
        <ContentBlock
          sessionId={session.id}
          canvasId={canvasId}
          blockKey="assignment"
          renderMode="preview"
        />
      </DndContext>,
    )

    expect(screen.getByRole("heading", { name: "Assignment" })).toBeInTheDocument()
    expect(screen.getAllByText("assignment-in-range").length).toBeGreaterThan(0)
  })

  it("hides the assignment heading when earlier assignment cards are already on a previous slice", () => {
    const { session, canvasId } = buildSession({
      assignmentStartsAfterContent: false,
      earlierAssignmentCard: true,
    })
    useCourseStore.setState({ sessions: [session], activeSessionId: session.id })

    render(
      <DndContext>
        <ContentBlock
          sessionId={session.id}
          canvasId={canvasId}
          blockKey="assignment"
          renderMode="preview"
        />
      </DndContext>,
    )

    expect(screen.queryByRole("heading", { name: "Assignment" })).not.toBeInTheDocument()
    expect(screen.getAllByText("assignment-in-range").length).toBeGreaterThan(0)
  })
})
