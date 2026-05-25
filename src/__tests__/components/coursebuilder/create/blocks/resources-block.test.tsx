import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { ResourcesBlock } from "@/components/coursebuilder/create/blocks/Resources"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import type {
  CourseId,
  CourseSession,
  ObjectiveId,
  SessionId,
  TaskId,
  TopicId,
} from "@/components/coursebuilder/create/types"

function buildSession(): CourseSession {
  const sessionId = "session-1" as SessionId
  const topicId = "topic-1" as TopicId
  const objectiveId = "objective-1" as ObjectiveId
  const taskId = "task-1" as TaskId

  return {
    id: sessionId,
    courseId: "course-1" as CourseId,
    order: 0,
    title: "Session 1",
    canvases: [],
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
                id: taskId,
                objectiveId,
                label: "Annotate the opening sequence",
                order: 0,
                droppedCards: [],
              },
            ],
          },
        ],
      },
    ],
  }
}

describe("ResourcesBlock", () => {
  beforeEach(() => {
    localStorage.clear()
    useCourseStore.setState({ sessions: [], activeSessionId: null })
  })

  it("uses the task name as the resource label without topic and objective prefixes", () => {
    const session = buildSession()
    useCourseStore.setState({ sessions: [session], activeSessionId: session.id })

    render(
      <ResourcesBlock
        sessionId={session.id}
        fieldValues={{ course_title: "Shakespeare in Love" }}
      />,
    )

    expect(screen.getByText("Annotate the opening sequence")).toBeInTheDocument()
    expect(screen.queryByText(/Elizabethan London/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Identify the course lens/)).not.toBeInTheDocument()
  })
})
