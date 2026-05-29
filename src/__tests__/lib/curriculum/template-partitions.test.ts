import { describe, expect, it } from "vitest"
import {
  CUSTOM_PARTITION_PRESET_ID,
  createNextCustomPartition,
  createPartitionState,
  resolveTemplatePartitions,
} from "@/lib/curriculum/template-partitions"
import { createDefaultTemplateFieldState } from "@/components/coursebuilder/sections/template-fields"

describe("template partitions", () => {
  it("uses the historical three lanes when no template field config exists", () => {
    expect(resolveTemplatePartitions(undefined, "content").map((partition) => partition.label)).toEqual([
      "Instruction",
      "Practice",
      "Feedback",
    ])
  })

  it("defaults new lesson templates to instruction, practice, and feedback", () => {
    const state = createDefaultTemplateFieldState("lesson")
    expect(resolveTemplatePartitions(state.content as Record<string, unknown>, "content").map((partition) => partition.label)).toEqual([
      "Instruction",
      "Practice",
      "Feedback",
    ])
  })

  it("keeps legacy template field configs as a single content lane", () => {
    expect(resolveTemplatePartitions({ instruction: true, practice: true, feedback: true }, "content")).toEqual([
      { id: "instruction", label: "Content" },
    ])
  })

  it("resolves preset labels while preserving legacy lane ids", () => {
    const state = createPartitionState("content", "gradual-release")
    expect(resolveTemplatePartitions(state, "content")).toEqual([
      { id: "instruction", label: "Model" },
      { id: "practice", label: "Coach" },
      { id: "feedback", label: "Release" },
    ])
  })

  it("supports custom partition counts and labels", () => {
    const state = createPartitionState("content", CUSTOM_PARTITION_PRESET_ID, [
      { id: "instruction", label: "Encounter" },
      { id: "practice", label: "Rehearse" },
      { id: "feedback", label: "Revise" },
      { id: "custom-4", label: "Publish" },
    ])

    expect(resolveTemplatePartitions(state, "content").map((partition) => partition.label)).toEqual([
      "Encounter",
      "Rehearse",
      "Revise",
      "Publish",
    ])
  })

  it("chooses unused legacy ids before generating custom ids", () => {
    expect(createNextCustomPartition([{ id: "instruction", label: "First" }])).toEqual({
      id: "practice",
      label: "Part 2",
    })
  })
})
