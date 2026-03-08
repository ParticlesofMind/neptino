import { describe, expect, it } from "vitest"

import { getGenerationCompletenessIssues } from "@/components/coursebuilder/sections/curriculum-generation-completeness"
import type { CurriculumSessionRow } from "@/components/coursebuilder/sections/curriculum-section-utils"

function makeRow(partial: Partial<CurriculumSessionRow>): CurriculumSessionRow {
  return {
    id: "row-1",
    session_number: 1,
    title: "Generated Session Title",
    notes: "",
    topics: 2,
    objectives: 2,
    tasks: 2,
    topic_names: ["Generated Topic A", "Generated Topic B"],
    objective_names: [
      "Generated Objective 1",
      "Generated Objective 2",
      "Generated Objective 3",
      "Generated Objective 4",
    ],
    task_names: [
      "Generated Task 1",
      "Generated Task 2",
      "Generated Task 3",
      "Generated Task 4",
      "Generated Task 5",
      "Generated Task 6",
      "Generated Task 7",
      "Generated Task 8",
    ],
    duration_minutes: 110,
    schedule_entry_id: "sched-1",
    template_type: "lesson",
    ...partial,
  }
}

describe("curriculum generation completeness gate", () => {
  it("flags placeholder objective/task tails as incomplete", () => {
    const row = makeRow({
      objective_names: ["Real objective 1", "Real objective 2", "Objective 3", "Objective 4"],
      task_names: [
        "Real task 1",
        "Real task 2",
        "Task 3",
        "Task 4",
        "Task 5",
        "Task 6",
        "Task 7",
        "Task 8",
      ],
    })

    const issues = getGenerationCompletenessIssues({
      action: "all",
      moduleNames: ["Module A", "Module B", "Module C"],
      moduleCount: 3,
      rows: [row],
      defaultTopics: 2,
      defaultObjectives: 2,
      defaultTasks: 2,
    })

    expect(issues).toContain("session 1 has placeholder/empty objectives")
    expect(issues).toContain("session 1 has placeholder/empty tasks")
  })

  it("passes when all requested dimensions are fully meaningful", () => {
    const row = makeRow({
      title: "Shakespeare and the Renaissance",
      objective_names: [
        "Analyze Renaissance humanism in selected passages.",
        "Compare courtly and public theatre contexts.",
        "Evaluate authorial perspective in historical framing.",
        "Synthesize textual and historical evidence in discussion.",
      ],
      task_names: [
        "Annotate a source excerpt for humanist themes.",
        "Build a timeline linking events to scene choices.",
        "Compare two performances with evidence notes.",
        "Draft a paragraph defending one interpretive claim.",
        "Peer-review a partner argument for evidence quality.",
        "Revise argument with at least two cited references.",
        "Prepare a short oral summary with textual support.",
        "Submit final reflection connecting themes across sessions.",
      ],
    })

    const issues = getGenerationCompletenessIssues({
      action: "all",
      moduleNames: ["Context and Biography", "Language and Form", "Major Plays"],
      moduleCount: 3,
      rows: [row],
      defaultTopics: 2,
      defaultObjectives: 2,
      defaultTasks: 2,
    })

    expect(issues).toEqual([])
  })
})
