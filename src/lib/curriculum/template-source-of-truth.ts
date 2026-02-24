import type { TemplateType } from "@/lib/curriculum/template-blocks"

export interface NormalizedTemplateConfig {
  id: string
  name: string
  type: TemplateType
  enabled: Record<string, boolean>
  fieldEnabled?: Record<string, Record<string, boolean>>
}

export interface TemplateFieldContext {
  lessonNumber: number
  lessonTitle: string
  lessonNotes?: string
  moduleName: string
  courseTitle: string
  courseType?: string
  courseLanguage?: string
  teacherName?: string
  institutionName?: string
  templateType?: TemplateType
  scheduleDay?: string
  scheduleDate?: string
  scheduleStart?: string
  scheduleEnd?: string
  durationMinutes?: number
  topics?: string[]
  objectives?: string[]
  tasks?: string[]
  currentPage: number
  totalPages: number
}

export function asTemplateType(value: unknown): TemplateType {
  switch (String(value ?? "").toLowerCase()) {
    case "quiz":
    case "exam":
    case "assessment":
    case "certificate":
      return String(value).toLowerCase() as TemplateType
    default:
      return "lesson"
  }
}

export function normalizeTemplateSettings(raw: unknown): NormalizedTemplateConfig[] {
  if (!raw) return []

  const templates = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { templates?: unknown[] }).templates)
      ? (raw as { templates: unknown[] }).templates
      : []

  return templates.map((tpl, index) => {
    const template = (tpl ?? {}) as Record<string, unknown>
    const type = asTemplateType(template.type)

    return {
      id: String(template.id ?? `template-${index + 1}`),
      name: String(template.name ?? `Template ${index + 1}`),
      type,
      enabled: (template.enabled as Record<string, boolean> | undefined) ?? {},
      fieldEnabled: (template.fieldEnabled as Record<string, Record<string, boolean>> | undefined) ?? undefined,
    }
  })
}

export function createTemplateLookups(templates: NormalizedTemplateConfig[]) {
  const templateById = new Map<string, NormalizedTemplateConfig>()
  const templateByType = new Map<TemplateType, NormalizedTemplateConfig>()

  templates.forEach((template) => {
    templateById.set(template.id, template)
    if (!templateByType.has(template.type)) {
      templateByType.set(template.type, template)
    }
  })

  return { templateById, templateByType }
}

export function resolveTemplateSelection(args: {
  requestedTemplateId?: unknown
  requestedTemplateType?: unknown
  templateById: Map<string, NormalizedTemplateConfig>
  templateByType: Map<TemplateType, NormalizedTemplateConfig>
}) {
  const templateId = args.requestedTemplateId ? String(args.requestedTemplateId) : undefined
  const templateFromId = templateId ? args.templateById.get(templateId) : undefined
  const templateType = templateFromId?.type ?? asTemplateType(args.requestedTemplateType)
  const templateConfig = templateFromId ?? args.templateByType.get(templateType)

  return { templateId, templateType, templateConfig }
}

export function formatTemplateFieldValue(fieldKey: string, context: TemplateFieldContext): string {
  const topicsJoined = context.topics?.join(" · ") || ""
  const objectivesJoined = context.objectives?.join(" · ") || ""
  const tasksJoined = context.tasks?.join(" · ") || ""

  switch (fieldKey) {
    case "lesson_number":
      return `Lesson ${context.lessonNumber}`
    case "lesson_title":
      return context.lessonTitle
    case "module_title":
      return context.moduleName
    case "course_title":
      return context.courseTitle
    case "institution_name":
      return context.institutionName || "Independent"
    case "teacher_name":
      return context.teacherName || "Teacher"
    case "date":
      return context.scheduleDate || new Date().toLocaleDateString()
    case "program_time":
      if (context.durationMinutes) return `${context.durationMinutes} min`
      if (context.scheduleStart && context.scheduleEnd) return `${context.scheduleStart}–${context.scheduleEnd}`
      return ""
    case "topic":
      return topicsJoined
    case "objective":
      return objectivesJoined
    case "task":
      return tasksJoined
    case "competence":
      return objectivesJoined || topicsJoined
    case "competence_time":
    case "topic_time":
    case "objective_time":
    case "task_time":
      return context.durationMinutes ? `${context.durationMinutes} min` : ""
    case "type":
      return context.courseType || (context.templateType ? context.templateType[0].toUpperCase() + context.templateType.slice(1) : "Learning Asset")
    case "origin":
      return context.courseTitle
    case "state":
      return "Ready"
    case "quality":
      return "Curriculum-aligned"
    case "criterion":
      return objectivesJoined || tasksJoined
    case "weight":
      return "1"
    case "max_points":
      return "100"
    case "feedback":
      return context.lessonNotes || ""
    case "submission_format":
      return "Coursebuilder submission"
    case "due_date":
      return context.scheduleDate || ""
    case "copyright":
      return `© ${new Date().getFullYear()}`
    case "page_number":
      return `Page ${context.currentPage} / ${context.totalPages}`
    default:
      return fieldKey
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
  }
}
