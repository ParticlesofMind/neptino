// Pure data: block/field configuration, types, and normalization helpers for TemplatesSection.
// No JSX — icons and React-rendered metadata live in templates-section.tsx.
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { TemplateVisualDensity } from "@/lib/curriculum/template-source-of-truth"

export const TEMPLATE_TYPES = ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] as const

export type BlockId = "header" | "program" | "resources" | "content" | "assignment" | "scoring" | "footer"

export interface TemplateBlockConfig {
  id: BlockId
  label: string
  description: string
  mandatory: boolean
  previewH: number
  forTypes: TemplateType[]
}

export interface TemplateFieldConfig {
  key: string
  label: string
  required: boolean
  forTypes: TemplateType[]
}

export type TemplateFieldState = Record<BlockId, Record<string, boolean>>

export type TemplateUiState = {
  activeId: string | null
  panelView: "config" | "preview"
  configView: "idle" | "create" | "edit"
  visualDensity: TemplateVisualDensity
}

export type TemplateSettingsPayload = {
  templates: LocalTemplate[]
  ui?: TemplateUiState
}

export const ALL_BLOCKS: TemplateBlockConfig[] = [
  { id: "header", label: "Header", description: "Title, date, student name", mandatory: true, previewH: 40, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
  { id: "program", label: "Program", description: "Objectives & lesson overview", mandatory: true, previewH: 52, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
  { id: "resources", label: "Resources", description: "Reference materials & links", mandatory: true, previewH: 44, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
  { id: "content", label: "Content", description: "Main body — topics, notes, media", mandatory: true, previewH: 80, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
  { id: "assignment", label: "Assignment", description: "Tasks & exercises for students", mandatory: true, previewH: 60, forTypes: ["lesson", "quiz", "lab", "workshop"] },
  { id: "scoring", label: "Scoring", description: "Rubric & grading criteria", mandatory: true, previewH: 56, forTypes: ["assessment", "exam", "quiz", "project", "lab"] },
  { id: "footer", label: "Footer", description: "Signatures, branding, page number", mandatory: true, previewH: 32, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
]

export interface LocalTemplate {
  id: string
  name: string
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled?: TemplateFieldState
  blockOrder?: BlockId[]
  description: string
  createdAt?: string
}

export function defaultBlockOrder(type: TemplateType): BlockId[] {
  return ALL_BLOCKS.filter((block) => block.forTypes.includes(type)).map((block) => block.id)
}

export function resolveBlockOrder(type: TemplateType, preferred?: BlockId[]): BlockId[] {
  const base = defaultBlockOrder(type)
  if (!preferred || preferred.length === 0) return base

  const baseSet = new Set(base)
  const preferredValid = preferred.filter((blockId) => baseSet.has(blockId))
  const preferredSet = new Set(preferredValid)
  const missing = base.filter((blockId) => !preferredSet.has(blockId))
  return [...preferredValid, ...missing]
}

export function defaultEnabled(): Record<BlockId, boolean> {
  const enabled: Partial<Record<BlockId, boolean>> = {}
  for (const block of ALL_BLOCKS) {
    enabled[block.id] = block.mandatory
  }
  return enabled as Record<BlockId, boolean>
}

export const BLOCK_FIELDS: Record<BlockId, TemplateFieldConfig[]> = {
  header: [
    { key: "lesson_number", label: "Lesson Number", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "lesson_title", label: "Lesson Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "module_title", label: "Module Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "course_title", label: "Course Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "institution_name", label: "Institution Name", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "teacher_name", label: "Teacher Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "date", label: "Date", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
  ],
  program: [
    { key: "competence", label: "Competence", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "program_method", label: "Method", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "program_social_form", label: "Social Form", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "program_time", label: "Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
  ],
  resources: [
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "type", label: "Type", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "origin", label: "Origin", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "state", label: "State", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "quality", label: "Quality", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
  ],
  content: [
    { key: "competence", label: "Competence", required: true, forTypes: ["quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey"] },
    { key: "competence_time", label: "Competence Time", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey"] },
    { key: "topic_time", label: "Topic Time", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "objective_time", label: "Objective Time", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "task_time", label: "Task Time", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "instruction_area", label: "Instruction Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "student_area", label: "Student Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "teacher_area", label: "Teacher Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
    { key: "include_project", label: "Include Project", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"] },
  ],
  assignment: [
    { key: "competence", label: "Competence", required: true, forTypes: ["quiz", "lab", "workshop"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz", "lab", "workshop"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz", "lab", "workshop"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "lab", "workshop"] },
    { key: "instruction_area", label: "Instruction Area", required: true, forTypes: ["lesson"] },
    { key: "student_area", label: "Student Area", required: true, forTypes: ["lesson"] },
    { key: "teacher_area", label: "Teacher Area", required: true, forTypes: ["lesson"] },
    { key: "submission_format", label: "Submission Format", required: false, forTypes: ["quiz", "lab", "workshop"] },
    { key: "due_date", label: "Due Date", required: false, forTypes: ["quiz", "lab", "workshop"] },
    { key: "include_project", label: "Include Project", required: false, forTypes: ["lesson", "quiz", "lab", "workshop"] },
  ],
  scoring: [
    { key: "criterion", label: "Criterion", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab"] },
    { key: "weight", label: "Weight", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab"] },
    { key: "max_points", label: "Max Points", required: true, forTypes: ["quiz", "assessment", "exam", "project", "lab"] },
    { key: "feedback", label: "Feedback", required: false, forTypes: ["quiz", "assessment", "exam", "project", "lab"] },
  ],
  footer: [
    { key: "copyright", label: "Copyright", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "page_number", label: "Page Number", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "teacher_name", label: "Teacher Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
    { key: "institution_name", label: "Institution Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"] },
  ],
}

export function defaultFieldEnabled(type: TemplateType, enabled: Record<BlockId, boolean>): TemplateFieldState {
  const state: Partial<TemplateFieldState> = {}
  for (const block of ALL_BLOCKS) {
    const fields = BLOCK_FIELDS[block.id].filter((f) => f.forTypes.includes(type))
    const fieldState: Record<string, boolean> = {}
    for (const field of fields) {
      fieldState[field.key] = enabled[block.id] ? field.required : false
    }
    state[block.id] = fieldState
  }
  return state as TemplateFieldState
}

export function normalizeTemplate(template: LocalTemplate): LocalTemplate {
  const enabled = template.enabled ?? defaultEnabled()
  const defaultFields = defaultFieldEnabled(template.type, enabled)
  const blockOrder = resolveBlockOrder(template.type, template.blockOrder)

  const fieldEnabled = template.fieldEnabled
    ? (Object.fromEntries(
        Object.keys(defaultFields).map((blockId) => [
          blockId,
          { ...defaultFields[blockId as BlockId], ...template.fieldEnabled![blockId as BlockId] },
        ]),
      ) as TemplateFieldState)
    : defaultFields

  return {
    ...template,
    enabled,
    fieldEnabled,
    blockOrder,
    createdAt: template.createdAt ?? new Date().toISOString(),
  }
}

export function normalizeTemplateSettings(raw: unknown): TemplateSettingsPayload {
  if (Array.isArray(raw)) {
    return { templates: raw as LocalTemplate[] }
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const templates = Array.isArray(obj.templates) ? (obj.templates as LocalTemplate[]) : []
    const ui = obj.ui && typeof obj.ui === "object" ? (obj.ui as TemplateUiState) : undefined
    return { templates, ui }
  }
  return { templates: [] }
}
