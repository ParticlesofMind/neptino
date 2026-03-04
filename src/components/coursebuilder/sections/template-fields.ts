/**
 * Template section data — stub file. The full template system will be rebuilt here.
 */

import type { TemplateType } from "@/lib/curriculum/template-blocks"

export type BlockId =
  | "header"
  | "program"
  | "resources"
  | "content"
  | "assignment"
  | "scoring"
  | "footer"

export type TemplateFieldState = Partial<Record<BlockId, Record<string, boolean>>>

export interface TemplateFieldDef {
  key: string
  label: string
  required: boolean
  forTypes: TemplateType[]
}

export const BLOCK_FIELDS: Record<BlockId, TemplateFieldDef[]> = {
  header: [
    { key: "session_title", label: "Session title", required: true,  forTypes: ["lesson"] },
    { key: "course_name",   label: "Course name",   required: true,  forTypes: ["lesson"] },
    { key: "teacher_name",  label: "Teacher name",  required: true,  forTypes: ["lesson"] },
    { key: "institution",   label: "Institution",   required: false, forTypes: ["lesson"] },
    { key: "schedule_date", label: "Date",          required: false, forTypes: ["lesson"] },
  ],
  program: [
    // Core structure — always shown
    { key: "topic",              label: "Topic",       required: true,  forTypes: ["lesson"] },
    { key: "objective",          label: "Objective",   required: true,  forTypes: ["lesson"] },
    { key: "task",               label: "Task",        required: true,  forTypes: ["lesson"] },
    // Pedagogical columns — standard in every lesson plan
    { key: "program_method",     label: "Method",      required: true,  forTypes: ["lesson"] },
    { key: "program_social_form", label: "Social form", required: true,  forTypes: ["lesson"] },
    { key: "program_time",       label: "Time",        required: true,  forTypes: ["lesson"] },
  ],
  resources: [
    { key: "task",    label: "Task",    required: true,  forTypes: ["lesson"] },
    { key: "type",    label: "Type",    required: true,  forTypes: ["lesson"] },
    { key: "origin",  label: "Origin",  required: false, forTypes: ["lesson"] },
    { key: "state",   label: "State",   required: false, forTypes: ["lesson"] },
    { key: "quality", label: "Quality", required: false, forTypes: ["lesson"] },
  ],
  content: [
    // Task-area phases (see migration 20260301000000)
    { key: "instruction", label: "Instruction", required: true,  forTypes: ["lesson"] },
    { key: "practice",    label: "Practice",    required: true,  forTypes: ["lesson"] },
    { key: "feedback",    label: "Feedback",    required: true,  forTypes: ["lesson"] },
  ],
  assignment: [
    { key: "instruction", label: "Instruction", required: true,  forTypes: ["lesson"] },
    { key: "practice",    label: "Practice",    required: true,  forTypes: ["lesson"] },
    { key: "feedback",    label: "Feedback",    required: true,  forTypes: ["lesson"] },
  ],
  scoring: [],
  footer: [
    { key: "session_title", label: "Session title", required: true,  forTypes: ["lesson"] },
    { key: "page_number",   label: "Page number",   required: true,  forTypes: ["lesson"] },
    { key: "course_name",   label: "Course name",   required: false, forTypes: ["lesson"] },
    { key: "module_name",   label: "Module name",   required: false, forTypes: ["lesson"] },
  ],
}

export const TEMPLATE_TYPES: TemplateType[] = ["lesson"]

export const LESSON_TEMPLATE_BLOCKS: BlockId[] = [
  "header",
  "program",
  "resources",
  "content",
  "assignment",
  "footer",
]

export function getTemplateBlocksForType(type: TemplateType): BlockId[] {
  if (type === "lesson") return LESSON_TEMPLATE_BLOCKS
  return []
}

export function createDefaultTemplateFieldState(type: TemplateType): TemplateFieldState {
  const blocks = getTemplateBlocksForType(type)
  return blocks.reduce<TemplateFieldState>((acc, block) => {
    const defs = BLOCK_FIELDS[block] ?? []
    acc[block] = defs.reduce<Record<string, boolean>>((fieldAcc, field) => {
      fieldAcc[field.key] = field.required
      return fieldAcc
    }, {})
    return acc
  }, {})
}
