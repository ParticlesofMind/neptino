import { describe, expect, it } from "vitest"

import {
  buildModuleNamesFromGeneration,
  buildScopedObjectiveNames,
  buildScopedTaskNames,
  buildScopedTopicNames,
} from "@/components/coursebuilder/sections/curriculum-generation-runner"

describe("curriculum-generation-runner scoped naming", () => {
  it("uses flattened generated objective names by index without modulo reuse", () => {
    const result = buildScopedObjectiveNames({
      generated: ["O11", "O12", "O21", "O22"],
      existing: undefined,
      topicCount: 2,
      objectivesPerTopic: 2,
    })

    expect(result).toEqual(["O11", "O12", "O21", "O22"])
  })

  it("uses flattened generated task names by index without modulo reuse", () => {
    const result = buildScopedTaskNames({
      generated: ["T111", "T112", "T121", "T122", "T211", "T212", "T221", "T222"],
      existing: undefined,
      topicCount: 2,
      objectivesPerTopic: 2,
      tasksPerObjective: 2,
    })

    expect(result).toEqual(["T111", "T112", "T121", "T122", "T211", "T212", "T221", "T222"])
  })

  it("falls back to existing flattened values before defaults", () => {
    const result = buildScopedTaskNames({
      generated: ["G1"],
      existing: ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"],
      topicCount: 2,
      objectivesPerTopic: 2,
      tasksPerObjective: 2,
    })

    expect(result[0]).toBe("G1")
    expect(result.slice(1)).toEqual(["E2", "E3", "E4", "E5", "E6", "E7", "E8"])
  })

  it("builds deterministic scoped defaults when generated/existing are missing", () => {
    const topics = buildScopedTopicNames({
      generated: undefined,
      existing: undefined,
      topicCount: 2,
    })
    const objectives = buildScopedObjectiveNames({
      generated: undefined,
      existing: undefined,
      topicCount: 2,
      objectivesPerTopic: 2,
    })
    const tasks = buildScopedTaskNames({
      generated: undefined,
      existing: undefined,
      topicCount: 2,
      objectivesPerTopic: 2,
      tasksPerObjective: 2,
    })

    expect(topics).toEqual(["Topic 1", "Topic 2"])
    expect(objectives).toEqual(["Objective 1.1", "Objective 1.2", "Objective 2.1", "Objective 2.2"])
    expect(tasks).toEqual([
      "Task 1.1.1",
      "Task 1.1.2",
      "Task 1.2.1",
      "Task 1.2.2",
      "Task 2.1.1",
      "Task 2.1.2",
      "Task 2.2.1",
      "Task 2.2.2",
    ])
  })

  it("guarantees full non-empty arrays for partial generated content", () => {
    const topics = buildScopedTopicNames({
      generated: ["Generated Topic 1"],
      existing: [],
      topicCount: 3,
    })
    const objectives = buildScopedObjectiveNames({
      generated: ["Generated Objective 1.1"],
      existing: [],
      topicCount: 3,
      objectivesPerTopic: 2,
    })
    const tasks = buildScopedTaskNames({
      generated: ["Generated Task 1.1.1"],
      existing: [],
      topicCount: 3,
      objectivesPerTopic: 2,
      tasksPerObjective: 2,
    })

    expect(topics).toHaveLength(3)
    expect(topics.every((name) => name.trim().length > 0)).toBe(true)
    expect(objectives).toHaveLength(6)
    expect(objectives.every((name) => name.trim().length > 0)).toBe(true)
    expect(tasks).toHaveLength(12)
    expect(tasks.every((name) => name.trim().length > 0)).toBe(true)
  })

  it("fills missing generated module names from persisted names/defaults", () => {
    const modules = buildModuleNamesFromGeneration({
      generatedModules: [{ moduleNumber: 1, moduleTitle: "Generated Module 1" }],
      persistedModuleNames: ["Persisted Module 1", "Persisted Module 2", "Persisted Module 3"],
      desiredCount: 3,
    })

    expect(modules).toEqual([
      "Generated Module 1",
      "Persisted Module 2",
      "Persisted Module 3",
    ])
  })

  it("uses deterministic defaults when neither generated nor persisted modules exist", () => {
    const modules = buildModuleNamesFromGeneration({
      generatedModules: [],
      persistedModuleNames: [],
      desiredCount: 2,
    })

    expect(modules).toEqual(["Module 1", "Module 2"])
  })
})
