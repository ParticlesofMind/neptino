import { describe, expect, it } from "vitest"

import {
  createBuiltInTemplateConfigs,
  getBuiltInTemplateId,
  isBuiltInTemplateId,
  parseRawTemplateConfigs,
} from "@/lib/curriculum/template-source-of-truth"
import { createPartitionState } from "@/lib/curriculum/template-partitions"

describe("template source of truth", () => {
  it("normalizes saved setup templates with fieldState into canvas field config", () => {
    const fieldState = {
      content: createPartitionState("content", "gradual-release"),
    }

    const [template] = parseRawTemplateConfigs([
      {
        id: "tpl-1",
        label: "Guided lesson",
        type: "lesson",
        fieldState,
      },
    ])

    expect(template).toMatchObject({
      id: "tpl-1",
      name: "Guided lesson",
      type: "lesson",
      fieldEnabled: fieldState,
    })
  })

  it("falls back invalid template types to lesson", () => {
    const [template] = parseRawTemplateConfigs([
      { id: "tpl-2", name: "Legacy template", type: "legacy" },
    ])

    expect(template?.type).toBe("lesson")
  })

  it("provides non-course-specific built-in templates for every type", () => {
    const builtIns = createBuiltInTemplateConfigs()

    expect(builtIns.map((template) => template.type)).toEqual(["lesson", "certificate", "quiz", "assessment", "exam"])
    expect(builtIns.every((template) => template.builtIn)).toBe(true)
    expect(isBuiltInTemplateId(getBuiltInTemplateId("lesson"))).toBe(true)
  })
})
