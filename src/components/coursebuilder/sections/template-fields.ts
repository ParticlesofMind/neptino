/**
 * Template section data — block field definitions for all template types.
 */

import { getDefaultBlocksForType, ALL_TEMPLATE_TYPES, type TemplateType, type TemplateBlockType } from "@/lib/curriculum/template-blocks"

export type BlockId = TemplateBlockType

export type TemplateFieldState = Partial<Record<BlockId, Record<string, boolean>>>

export interface TemplateFieldDef {
  key: string
  label: string
  required: boolean
  forTypes: TemplateType[]
}

export const BLOCK_FIELDS: Record<BlockId, TemplateFieldDef[]> = {
  header: [
    { key: "session_title", label: "Session title", required: true,  forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "course_name",   label: "Course name",   required: true,  forTypes: ["lesson", "certificate", "quiz", "assessment", "exam"] },
    { key: "teacher_name",  label: "Teacher name",  required: true,  forTypes: ["lesson", "certificate", "quiz", "assessment", "exam"] },
    { key: "institution",   label: "Institution",   required: false, forTypes: ["lesson", "certificate", "quiz", "assessment", "exam"] },
    { key: "schedule_date", label: "Date",          required: false, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  ],
  program: [
    { key: "topic",               label: "Topic",        required: true,  forTypes: ["lesson", "assessment", "exam"] },
    { key: "objective",           label: "Objective",    required: true,  forTypes: ["lesson", "assessment", "exam"] },
    { key: "task",                label: "Task",         required: true,  forTypes: ["lesson", "assessment", "exam"] },
    { key: "program_method",      label: "Method",       required: true,  forTypes: ["lesson"] },
    { key: "program_social_form", label: "Social form",  required: true,  forTypes: ["lesson"] },
    { key: "program_time",        label: "Time",         required: true,  forTypes: ["lesson"] },
  ],
  resources: [
    { key: "task",    label: "Task",    required: true,  forTypes: ["lesson", "quiz"] },
    { key: "type",    label: "Type",    required: true,  forTypes: ["lesson", "quiz"] },
    { key: "origin",  label: "Origin",  required: false, forTypes: ["lesson"] },
    { key: "state",   label: "State",   required: false, forTypes: ["lesson"] },
    { key: "quality", label: "Quality", required: false, forTypes: ["lesson"] },
  ],
  content: [
    { key: "instruction", label: "Instruction", required: true,  forTypes: ["lesson", "assessment", "exam"] },
    { key: "practice",    label: "Practice",    required: true,  forTypes: ["lesson", "assessment", "exam"] },
    { key: "feedback",    label: "Feedback",    required: true,  forTypes: ["lesson", "assessment", "exam"] },
  ],
  assignment: [
    { key: "instruction", label: "Instruction", required: true,  forTypes: ["lesson"] },
    { key: "practice",    label: "Practice",    required: true,  forTypes: ["lesson"] },
    { key: "feedback",    label: "Feedback",    required: true,  forTypes: ["lesson"] },
  ],
  scoring: [
    { key: "criteria",  label: "Criteria",   required: true,  forTypes: ["quiz", "assessment", "exam"] },
    { key: "points",    label: "Points",     required: true,  forTypes: ["quiz", "assessment", "exam"] },
    { key: "weight",    label: "Weight",     required: false, forTypes: ["assessment", "exam"] },
    { key: "threshold", label: "Pass mark",  required: false, forTypes: ["quiz", "assessment", "exam"] },
  ],
  footer: [
    { key: "session_title", label: "Session title", required: true,  forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "page_number",   label: "Page number",   required: true,  forTypes: ["lesson", "certificate", "quiz", "assessment", "exam"] },
    { key: "course_name",   label: "Course name",   required: false, forTypes: ["lesson", "certificate", "quiz", "assessment", "exam"] },
    { key: "module_name",   label: "Module name",   required: false, forTypes: ["lesson"] },
  ],
}

export const TEMPLATE_TYPES: TemplateType[] = ALL_TEMPLATE_TYPES

export function createDefaultTemplateFieldState(type: TemplateType): TemplateFieldState {
  const blocks = getDefaultBlocksForType(type)
  return blocks.reduce<TemplateFieldState>((acc, block) => {
    const defs = BLOCK_FIELDS[block] ?? []
    acc[block] = defs
      .filter((field) => field.forTypes.includes(type))
      .reduce<Record<string, boolean>>((fieldAcc, field) => {
        fieldAcc[field.key] = field.required
        return fieldAcc
      }, {})
    return acc
  }, {})
}
