import type { IscedDomain } from "@/components/coursebuilder/section-row-mappers"

type ClassificationSerializeArgs = {
  classYear: string
  framework: string
  domain: string
  subject: string
  topic: string
  subtopic: string
  prevCourse: string
  nextCourse: string
  priorKnowledge: string
  keyTerms: string[]
  mandatoryTopics: string[]
  applicationContext: string
  currentCourseTitle: string | null
  domains: IscedDomain[]
  updatedAt: string
}

type EssentialsGenerationSettingsArgs = {
  existing: Record<string, unknown> | null
  teacherId: string
  teacherName: string
}

function toNonEmptyStrings(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

function mapDisplayToIscedValue(items: Array<{ code: string; label: string; value: string }>, input: string): string {
  const found = items.find((item) => `${item.code} — ${item.label}` === input || item.value === input)
  return found?.value ?? ""
}

export function buildClassificationUpdatePayload({
  classYear,
  framework,
  domain,
  subject,
  topic,
  subtopic,
  prevCourse,
  nextCourse,
  priorKnowledge,
  keyTerms,
  mandatoryTopics,
  applicationContext,
  currentCourseTitle,
  domains,
  updatedAt,
}: ClassificationSerializeArgs): Record<string, unknown> {
  const allSubjects = domains.flatMap((entry) => entry.subjects)
  const allTopics = allSubjects.flatMap((entry) => entry.topics)
  const allSubtopics = allTopics.flatMap((entry) => entry.subtopics)

  const domainValue = mapDisplayToIscedValue(domains, domain)
  const subjectValue = mapDisplayToIscedValue(allSubjects, subject)
  const topicValue = mapDisplayToIscedValue(allTopics, topic)
  const subtopicValue = subtopic
    ? allSubtopics.find((entry) => entry.label === subtopic || entry.value === subtopic)?.value ?? ""
    : ""

  return {
    classification_data: {
      class_year: classYear,
      curricular_framework: framework,
      domain: domainValue,
      subject: subjectValue,
      topic: topicValue,
      subtopic: subtopicValue || null,
      previous_course: prevCourse || null,
      current_course: currentCourseTitle,
      next_course: nextCourse || null,
      prior_knowledge: priorKnowledge || null,
      key_terms: toNonEmptyStrings(keyTerms),
      mandatory_topics: toNonEmptyStrings(mandatoryTopics),
      application_context: applicationContext || null,
      updated_at: updatedAt,
    },
    updated_at: updatedAt,
  }
}

export function buildEssentialsGenerationSettings({
  existing,
  teacherId,
  teacherName,
}: EssentialsGenerationSettingsArgs): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    teacher_id: teacherId,
    teacher_name: teacherName,
  }
}
