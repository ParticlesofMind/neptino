import { describe, expect, it } from "vitest"

import {
  mapRowToSession,
  type CourseMeta,
  type RawSessionRow,
} from "@/components/coursebuilder/create/hooks/course-session-mapper"
import type { CourseId } from "@/components/coursebuilder/create/types"

const META: CourseMeta = {
  courseTitle: "Indexing Course",
  institution: "Indexing School",
  teacherName: "Teacher",
  pedagogy: "balanced",
  moduleNames: [],
  totalSessions: 1,
  topicsPerLesson: 2,
  objectivesPerTopic: 2,
  tasksPerObjective: 2,
}

const COURSE_ID = "course-indexing" as CourseId

describe("course-session-mapper name indexing", () => {
  it("maps flattened objective/task names to unique topic/objective branches", () => {
    const row: RawSessionRow = {
      id: "session-1",
      session_number: 1,
      topics: 2,
      objectives: 2,
      tasks: 2,
      objective_names: [
        "O-T1-1",
        "O-T1-2",
        "O-T2-1",
        "O-T2-2",
      ],
      task_names: [
        "K-T1-O1-1",
        "K-T1-O1-2",
        "K-T1-O2-1",
        "K-T1-O2-2",
        "K-T2-O1-1",
        "K-T2-O1-2",
        "K-T2-O2-1",
        "K-T2-O2-2",
      ],
    }

    const session = mapRowToSession(row, 0, COURSE_ID, META)

    expect(session.topics[0]?.objectives[0]?.label).toBe("O-T1-1")
    expect(session.topics[0]?.objectives[1]?.label).toBe("O-T1-2")
    expect(session.topics[1]?.objectives[0]?.label).toBe("O-T2-1")
    expect(session.topics[1]?.objectives[1]?.label).toBe("O-T2-2")

    expect(session.topics[0]?.objectives[0]?.tasks[0]?.label).toBe("K-T1-O1-1")
    expect(session.topics[0]?.objectives[1]?.tasks[0]?.label).toBe("K-T1-O2-1")
    expect(session.topics[1]?.objectives[0]?.tasks[0]?.label).toBe("K-T2-O1-1")
    expect(session.topics[1]?.objectives[1]?.tasks[0]?.label).toBe("K-T2-O2-1")
  })

  it("keeps backward compatibility for legacy non-flattened arrays", () => {
    const row: RawSessionRow = {
      id: "session-legacy",
      session_number: 1,
      topics: 2,
      objectives: 2,
      tasks: 2,
      objective_names: ["Legacy O1", "Legacy O2"],
      task_names: ["Legacy K1", "Legacy K2"],
    }

    const session = mapRowToSession(row, 0, COURSE_ID, META)

    expect(session.topics[0]?.objectives[0]?.label).toBe("Legacy O1")
    expect(session.topics[1]?.objectives[0]?.label).toBe("Legacy O1")
    expect(session.topics[0]?.objectives[0]?.tasks[0]?.label).toBe("Legacy K1")
    expect(session.topics[1]?.objectives[1]?.tasks[1]?.label).toBe("Legacy K2")
  })

  it("preserves sparse flattened indexes without collapsing blanks", () => {
    const row: RawSessionRow = {
      id: "session-sparse",
      session_number: 1,
      topics: 2,
      objectives: 2,
      tasks: 2,
      // Only topic 2 / objective 1 is named; other slots intentionally blank.
      objective_names: [
        "",
        "",
        "O-T2-1",
        "",
      ],
      // Only topic 2 / objective 1 / task 1 is named.
      task_names: [
        "",
        "",
        "",
        "",
        "K-T2-O1-1",
        "",
        "",
        "",
      ],
    }

    const session = mapRowToSession(row, 0, COURSE_ID, META)

    expect(session.topics[1]?.objectives[0]?.label).toBe("O-T2-1")
    expect(session.topics[0]?.objectives[0]?.label).toBe("")
    expect(session.topics[1]?.objectives[0]?.tasks[0]?.label).toBe("K-T2-O1-1")
    expect(session.topics[0]?.objectives[0]?.tasks[0]?.label).toBe("")
  })
})
