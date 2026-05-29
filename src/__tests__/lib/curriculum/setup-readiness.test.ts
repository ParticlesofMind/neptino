import { describe, expect, it } from "vitest"
import { evaluateCourseSetupReadiness } from "@/lib/curriculum/setup-readiness"

const completeCourse = {
  course_name: "Foundations of Algebraic Reasoning",
  course_description: "Students learn to reason with variables, equations, functions, and contextual models through guided practice and applied problem solving.",
  course_language: "English",
  course_type: "Course",
  teacher_id: "teacher-1",
  institution: "Neptino Academy",
  generation_settings: {
    resources_preferences_confirmed: true,
    resources_preferences: [
      { id: "neptino", priority: "very_high" },
      { id: "wikipedia", priority: "high" },
      { id: "openstax", priority: "high" },
      { id: "wikibooks", priority: "medium" },
    ],
    data_management: {
      license_policy: "open-first",
      citation_strictness: "strict",
      attribution_retention: "retain-with-course",
      provenance_tracking: true,
      telemetry_retention: "course-lifetime",
      export_policy: "teacher-and-institution",
      deletion_policy: "delete-on-request",
      ai_reuse_consent: "course-only",
    },
    page_size: "a4",
    page_orientation: "portrait",
    page_count: 12,
    margins_mm: { top: 20, right: 20, bottom: 20, left: 20 },
    selected_llm_model: "gemma3:4b",
  },
  classification_data: {
    class_year: "Year 9",
    domain: "05 - Natural sciences, mathematics and statistics",
    subject: "Mathematics",
    topic: "Algebra",
    prior_knowledge: "Students can calculate with fractions and solve one-step numerical expressions.",
    key_terms: ["variable", "equation", "function"],
    mandatory_topics: ["linear equations", "graphing", "word problems"],
    application_context: "Use school budgeting and travel planning examples to connect symbolic work to everyday decisions.",
  },
  students_overview: {
    method: "manual",
    total: 18,
  },
  schedule_settings: {
    schedule_mode: "session-count",
    active_days: ["Mon"],
    generated_entries: [
      { id: "s1", day: "Mon", date: "01.06.2026", start_time: "09:00", end_time: "10:00" },
    ],
  },
  curriculum_data: {
    session_count: 1,
    module_org: "linear",
    content_volume: "single",
    topics: 2,
    objectives: 2,
    tasks: 2,
    sequencing_mode: "linear",
    naming_rules: { lessonTitleRule: "verb" },
    session_rows: [{ session_number: 1, title: "Variables and Equations" }],
  },
  course_layout: {
    pedagogy: { x: 0, y: 0 },
  },
  template_settings: {
    active_template_type: "lesson",
  },
}

describe("evaluateCourseSetupReadiness", () => {
  it("locks generation when required teacher intent is missing", () => {
    const report = evaluateCourseSetupReadiness({
      course_name: "Untitled Course",
      course_description: "TBD",
    })

    expect(report.readyForGeneration).toBe(false)
    expect(report.missingBySection.essentials).toBe(true)
    expect(report.missingBySection.classification).toBe(true)
    expect(report.missingCriticalFields).toContain("Essentials: Meaningful course title")
  })

  it("marks generation ready when required setup sections meet quality checks", () => {
    const report = evaluateCourseSetupReadiness(completeCourse)

    expect(report.readyForGeneration).toBe(true)
    expect(report.missingCriticalFields).toEqual([])
    expect(report.sourceCoverage.sourcePreferencesConfirmed).toBe(true)
    expect(report.sourceCoverage.highPriorityOpenSourceCount).toBe(2)
  })

  it("uses default governance when resources are not explicitly confirmed", () => {
    const report = evaluateCourseSetupReadiness({
      ...completeCourse,
      generation_settings: {
        ...completeCourse.generation_settings,
        resources_preferences_confirmed: false,
      },
    })

    expect(report.readyForGeneration).toBe(true)
    expect(report.missingBySection.resources).toBe(false)
    expect(report.sourceCoverage.effectiveSourcePolicy).toBe(true)
    expect(report.weakFields).not.toContain("Resources: Explicit source priorities or Neptino defaults")
  })
})
