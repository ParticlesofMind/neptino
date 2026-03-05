/**
 * Template blocks — canonical definition of every template type and its default block composition.
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

/** All available template types in display order. */
export const ALL_TEMPLATE_TYPES: TemplateType[] = [
  "lesson",
  "certificate",
  "quiz",
  "assessment",
  "exam",
]

const BLOCKS_BY_TYPE: Record<TemplateType, TemplateBlockType[]> = {
  lesson:      ["header", "program", "resources", "content", "assignment", "footer"],
  certificate: ["header", "footer"],
  quiz:        ["header", "resources", "scoring", "footer"],
  assessment:  ["header", "program", "content", "scoring", "footer"],
  exam:        ["header", "program", "content", "scoring", "footer"],
}

export function getDefaultBlocksForType(type: TemplateType): TemplateBlockType[] {
  return BLOCKS_BY_TYPE[type] ?? BLOCKS_BY_TYPE.lesson
}

export function createDefaultTemplateDesign(_type?: TemplateType): TemplateDesignConfig {
  return {}
}
