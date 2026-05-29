import { describe, expect, it } from "vitest"
import { buildProgramSequenceIds } from "@/components/coursebuilder/sections/program-placement-section"

describe("buildProgramSequenceIds", () => {
  const existingRows = [
    { id: "pc-1", program_id: "program-1", course_id: "course-a", sequence_index: 1, required: true, courses: null },
    { id: "pc-2", program_id: "program-1", course_id: "course-d", sequence_index: 2, required: true, courses: null },
  ]

  it("places the current course after a selected preceding course", () => {
    expect(buildProgramSequenceIds({
      currentCourseId: "course-b",
      previousCourseId: "course-a",
      nextCourseId: "",
      existingRows,
    })).toEqual(["course-a", "course-b", "course-d"])
  })

  it("places the current course before a selected succeeding course", () => {
    expect(buildProgramSequenceIds({
      currentCourseId: "course-b",
      previousCourseId: "",
      nextCourseId: "course-d",
      existingRows,
    })).toEqual(["course-b", "course-d", "course-a"])
  })

  it("creates a three-course chain when both neighbors are selected", () => {
    expect(buildProgramSequenceIds({
      currentCourseId: "course-b",
      previousCourseId: "course-a",
      nextCourseId: "course-c",
      existingRows,
    })).toEqual(["course-a", "course-b", "course-c", "course-d"])
  })
})
