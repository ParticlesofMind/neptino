/**
 * Template blocks — stub file. The full template system will be rebuilt here.
 */

export type TemplateType = "lesson" | "certificate" | "quiz" | "assessment" | "exam"

export type TemplateBlockType =
  | "header"
  | "program"
  | "resources"
  | "content"
  | "assignment"
  | "scoring"
  | "footer"

export interface TemplateDesignConfig {
  enabledBlocks?: TemplateBlockType[]
  blockSettings?: Partial<Record<TemplateBlockType, Record<string, unknown>>>
}

const DEFAULT_BLOCKS: TemplateBlockType[] = [
  "header",
  "program",
  "content",
  "scoring",
  "footer",
]

export function getDefaultBlocksForType(_type: TemplateType): TemplateBlockType[] {
  return DEFAULT_BLOCKS
}

export function createDefaultTemplateDesign(_type?: TemplateType): TemplateDesignConfig {
  return {}
}
