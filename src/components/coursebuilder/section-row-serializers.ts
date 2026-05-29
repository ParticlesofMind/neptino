import type { IscedDomain } from "@/components/coursebuilder/section-row-mappers"

type ClassificationSerializeArgs = {
  classYear: string
  domain: string
  subject: string
  topic: string
  subtopic: string
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

function mapDisplayToIscedItem(
  items: Array<{ code: string; label: string; value: string }>,
  input: string,
): { code: string; label: string; value: string } | null {
  return items.find((item) => `${item.code} — ${item.label}` === input || item.value === input || item.label === input) ?? null
}

export function buildClassificationUpdatePayload({
  classYear,
  domain,
  subject,
  topic,
  subtopic,
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

  const domainItem = mapDisplayToIscedItem(domains, domain)
  const subjectItem = mapDisplayToIscedItem(allSubjects, subject)
  const topicItem = mapDisplayToIscedItem(allTopics, topic)
  const subtopicItem = subtopic
    ? allSubtopics.find((entry) => entry.label === subtopic || entry.value === subtopic) ?? null
    : null
  const domainValue = domainItem?.value ?? mapDisplayToIscedValue(domains, domain)
  const subjectValue = subjectItem?.value ?? mapDisplayToIscedValue(allSubjects, subject)
  const topicValue = topicItem?.value ?? mapDisplayToIscedValue(allTopics, topic)
  const subtopicValue = subtopicItem?.value ?? ""

  return {
    classification_data: {
      class_year: classYear,
      classification_source: "isced_2011",
      domain: domainValue,
      domain_label: domainItem?.label ?? null,
      domain_code: domainItem?.code ?? null,
      subject: subjectValue,
      subject_label: subjectItem?.label ?? null,
      subject_code: subjectItem?.code ?? null,
      topic: topicValue,
      topic_label: topicItem?.label ?? null,
      topic_code: topicItem?.code ?? null,
      subtopic: subtopicValue || null,
      subtopic_label: subtopicItem?.label ?? null,
      subtopic_code: subtopicItem?.code ?? null,
      current_course: currentCourseTitle,
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
