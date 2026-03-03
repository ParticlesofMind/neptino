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
  required: boolean
  forTypes: TemplateType[]
}

export const BLOCK_FIELDS: Record<BlockId, TemplateFieldDef[]> = {
  header: [],
  program: [],
  resources: [],
  content: [],
  assignment: [],
  scoring: [],
  footer: [],
}

export const TEMPLATE_TYPES: TemplateType[] = ["lesson", "certificate", "quiz", "assessment", "exam"]
