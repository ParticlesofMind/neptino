import { describe, expect, it } from "vitest"
import { buildClassificationUpdatePayload } from "@/components/coursebuilder/section-row-serializers"
import { mapClassificationDataToState, type IscedDomain } from "@/components/coursebuilder/section-row-mappers"

const domains: IscedDomain[] = [
  {
    code: "05",
    label: "Natural sciences, mathematics and statistics",
    value: "natural-sciences-mathematics-and-statistics",
    subjects: [
      {
        code: "054",
        label: "Mathematics and statistics",
        value: "mathematics-and-statistics",
        topics: [
          {
            code: "0541",
            label: "Mathematics",
            value: "mathematics",
            subtopics: [
              { code: "0541.1", label: "Algebra", value: "algebra" },
            ],
          },
        ],
      },
    ],
  },
]

describe("classification serialization", () => {
  it("stores machine values and human labels for ISCED selections", () => {
    const payload = buildClassificationUpdatePayload({
      classYear: "Grade 9",
      domain: "05 — Natural sciences, mathematics and statistics",
      subject: "054 — Mathematics and statistics",
      topic: "0541 — Mathematics",
      subtopic: "Algebra",
      priorKnowledge: "Students can solve basic arithmetic problems and read simple graphs.",
      keyTerms: ["linear equation", "function"],
      mandatoryTopics: ["Algebra"],
      applicationContext: "",
      currentCourseTitle: "Algebra I",
      domains,
      updatedAt: "2026-05-25T00:00:00.000Z",
    })

    const classification = payload.classification_data as Record<string, unknown>
    expect(classification.domain).toBe("natural-sciences-mathematics-and-statistics")
    expect(classification.domain_label).toBe("Natural sciences, mathematics and statistics")
    expect(classification.subject_label).toBe("Mathematics and statistics")
    expect(classification.topic_label).toBe("Mathematics")
    expect(classification.subtopic_label).toBe("Algebra")
  })

  it("hydrates labels when stored taxonomy values are no longer resolvable", () => {
    const state = mapClassificationDataToState({
      class_year: "Grade 9",
      domain: "legacy-domain",
      domain_label: "Legacy Domain",
      domain_code: "99",
      subject: "legacy-subject",
      subject_label: "Legacy Subject",
      subject_code: "999",
      topic: "legacy-topic",
      topic_label: "Legacy Topic",
      topic_code: "9999",
      subtopic: "legacy-subtopic",
      subtopic_label: "Legacy Subtopic",
    }, domains)

    expect(state?.domain).toBe("99 — Legacy Domain")
    expect(state?.subject).toBe("999 — Legacy Subject")
    expect(state?.topic).toBe("9999 — Legacy Topic")
    expect(state?.subtopic).toBe("Legacy Subtopic")
  })
})
