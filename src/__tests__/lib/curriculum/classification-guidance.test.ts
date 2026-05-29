import { describe, expect, it } from "vitest"
import { buildClassificationGuidance } from "@/lib/curriculum/classification-guidance"
import type { GuidanceIscedDomain } from "@/lib/curriculum/classification-guidance"

const domains: GuidanceIscedDomain[] = [
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
  {
    code: "06",
    label: "Information and Communication Technologies",
    value: "information-and-communication-technologies",
    subjects: [
      {
        code: "061",
        label: "Information and Communication Technologies",
        value: "information-and-communication-technologies",
        topics: [
          {
            code: "0613",
            label: "Software and applications development and analysis",
            value: "software-and-applications-development-and-analysis",
            subtopics: [],
          },
        ],
      },
    ],
  },
]

describe("buildClassificationGuidance", () => {
  it("suggests an ISCED path and seed metadata from course text", () => {
    const guidance = buildClassificationGuidance({
      courseTitle: "Algebra I",
      courseDescription: "Students solve linear equations, graph functions, and use coordinate planes.",
      classYear: "Grade 9",
      domains,
    })

    expect(guidance.suggestedPath?.subject.label).toBe("Mathematics and statistics")
    expect(guidance.suggestedPath?.topic.label).toBe("Mathematics")
    expect(guidance.keyTerms.length).toBeGreaterThanOrEqual(3)
    expect(guidance.mandatoryTopics).toContain("Mathematics")
    expect(guidance.priorKnowledge).toContain("Grade 9")
  })

  it("keeps an already selected complete path as the suggestion", () => {
    const guidance = buildClassificationGuidance({
      courseTitle: "Intro to Python",
      currentDomain: "06 — Information and Communication Technologies",
      currentSubject: "061 — Information and Communication Technologies",
      currentTopic: "0613 — Software and applications development and analysis",
      domains,
    })

    expect(guidance.suggestedPath?.domain.code).toBe("06")
    expect(guidance.suggestedPath?.topic.code).toBe("0613")
    expect(guidance.suggestedPath?.confidence).toBe("strong")
  })
})
