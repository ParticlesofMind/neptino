import { describe, expect, it } from "vitest"

import { serializeCurriculumSessionRows } from "@/components/coursebuilder/sections/use-curriculum-persistence"
import { createPartitionState } from "@/lib/curriculum/template-partitions"
import type { TemplateDesignConfig } from "@/lib/curriculum/template-blocks"

describe("serializeCurriculumSessionRows", () => {
  it("preserves template id, type, and design when saving curriculum rows", () => {
    const templateDesign: TemplateDesignConfig = {
      enabledBlocks: ["header", "program", "content", "footer"],
      blockSettings: {
        content: createPartitionState("content", "gradual-release"),
      },
    }

    expect(
      serializeCurriculumSessionRows([
        {
          id: "session-1",
          schedule_entry_id: "schedule-1",
          session_number: 3,
          title: "Session title",
          notes: "",
          topics: 1,
          objectives: 1,
          tasks: 1,
          template_id: "template-1",
          template_type: "lesson",
          template_design: templateDesign,
        },
      ])[0],
    ).toMatchObject({
      session_number: 1,
      template_id: "template-1",
      template_type: "lesson",
      template_design: templateDesign,
    })
  })
})
