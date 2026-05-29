export type IscedSubtopic = { value: string; label: string; code: string }
export type IscedTopic = { value: string; label: string; code: string; subtopics: IscedSubtopic[] }
export type IscedSubject = { value: string; label: string; code: string; topics: IscedTopic[] }
export type IscedDomain = { value: string; label: string; code: string; subjects: IscedSubject[] }

export type ClassificationHydratedState = {
  classYear: string
  domain: string
  subject: string
  topic: string
  subtopic: string
  priorKnowledge: string
  keyTerms?: string[]
  mandatoryTopics?: string[]
  applicationContext: string
}

export function mapClassificationDataToState(
  classificationData: Record<string, unknown> | null,
  domains: IscedDomain[],
): ClassificationHydratedState | null {
  if (!classificationData) return null

  const domain = domains.find((d) => d.value === classificationData.domain)
  const subject = domain?.subjects.find((s) => s.value === classificationData.subject)
  const topic = subject?.topics.find((t) => t.value === classificationData.topic)
  const subtopic = topic?.subtopics.find((st) => st.value === classificationData.subtopic)
  const domainLabel = typeof classificationData.domain_label === "string" ? classificationData.domain_label : ""
  const subjectLabel = typeof classificationData.subject_label === "string" ? classificationData.subject_label : ""
  const topicLabel = typeof classificationData.topic_label === "string" ? classificationData.topic_label : ""
  const subtopicLabel = typeof classificationData.subtopic_label === "string" ? classificationData.subtopic_label : ""
  const domainCode = typeof classificationData.domain_code === "string" ? classificationData.domain_code : ""
  const subjectCode = typeof classificationData.subject_code === "string" ? classificationData.subject_code : ""
  const topicCode = typeof classificationData.topic_code === "string" ? classificationData.topic_code : ""

  return {
    classYear: typeof classificationData.class_year === "string" ? classificationData.class_year : "",
    domain: domain ? `${domain.code} — ${domain.label}` : (domainLabel && domainCode ? `${domainCode} — ${domainLabel}` : domainLabel),
    subject: subject ? `${subject.code} — ${subject.label}` : (subjectLabel && subjectCode ? `${subjectCode} — ${subjectLabel}` : subjectLabel),
    topic: topic ? `${topic.code} — ${topic.label}` : (topicLabel && topicCode ? `${topicCode} — ${topicLabel}` : topicLabel),
    subtopic: subtopic?.label ?? subtopicLabel,
    priorKnowledge: typeof classificationData.prior_knowledge === "string" ? classificationData.prior_knowledge : "",
    keyTerms: Array.isArray(classificationData.key_terms)
      ? (classificationData.key_terms.filter((value): value is string => typeof value === "string"))
      : undefined,
    mandatoryTopics: Array.isArray(classificationData.mandatory_topics)
      ? (classificationData.mandatory_topics.filter((value): value is string => typeof value === "string"))
      : undefined,
    applicationContext: typeof classificationData.application_context === "string" ? classificationData.application_context : "",
  }
}

export type GenerationSettingsHydratedState = {
  goals?: string[]
  teacherId: string
  teacherName: string
}

export function mapGenerationSettingsToState(
  generationSettings: Record<string, unknown> | null,
): GenerationSettingsHydratedState | null {
  if (!generationSettings) return null

  return {
    goals: Array.isArray(generationSettings.course_goals)
      ? generationSettings.course_goals.filter((value): value is string => typeof value === "string")
      : undefined,
    teacherId: typeof generationSettings.teacher_id === "string" ? generationSettings.teacher_id : "",
    teacherName: typeof generationSettings.teacher_name === "string" ? generationSettings.teacher_name : "",
  }
}

export function mapPedagogyLayoutToPos(courseLayout: Record<string, unknown> | null): { x: number; y: number } | null {
  if (!courseLayout) return null
  const pedagogy = courseLayout.pedagogy as { x?: unknown; y?: unknown } | undefined
  if (!pedagogy) return null

  return {
    x: typeof pedagogy.x === "number" ? pedagogy.x : 0,
    y: typeof pedagogy.y === "number" ? pedagogy.y : 0,
  }
}
