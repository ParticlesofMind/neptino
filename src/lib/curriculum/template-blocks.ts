/**
 * Template Blocks Types
 * Defines block structure for different template types (lesson, quiz, exam, assessment, certificate)
 * Based on legacy template system
 */

export type TemplateType = "lesson" | "quiz" | "exam" | "assessment" | "certificate"

export type TemplateBlockType = "header" | "program" | "resources" | "content" | "assignment" | "scoring" | "footer"

export interface TemplateBlockConfig {
  id: TemplateBlockType
  label: string
  description: string
  mandatory: boolean
  icon?: string
  forTypes: TemplateType[]
}

export interface TemplateDesignConfig {
  templateType: TemplateType
  enabledBlocks: TemplateBlockType[]
  blockSettings?: Record<TemplateBlockType, Record<string, unknown>>
}

/**
 * Template block sequences per template type
 * All templates follow header-body-footer structure, with different body sub-blocks
 */
export const TEMPLATE_BLOCK_SEQUENCES: Record<TemplateType, TemplateBlockType[]> = {
  lesson: ["header", "program", "resources", "content", "assignment", "footer"],
  quiz: ["header", "program", "resources", "content", "scoring", "footer"],
  exam: ["header", "program", "resources", "content", "scoring", "footer"],
  assessment: ["header", "program", "resources", "content", "scoring", "footer"],
  certificate: ["header", "content", "footer"],
}

/**
 * All available template blocks with metadata
 */
export const ALL_TEMPLATE_BLOCKS: TemplateBlockConfig[] = [
  {
    id: "header",
    label: "Header",
    description: "Title, date, student metadata",
    mandatory: true,
    icon: "header",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"],
  },
  {
    id: "program",
    label: "Program",
    description: "Objectives & lesson overview",
    mandatory: true,
    icon: "program",
    forTypes: ["lesson", "quiz", "assessment", "exam"],
  },
  {
    id: "resources",
    label: "Resources",
    description: "Reference materials & links",
    mandatory: true,
    icon: "resources",
    forTypes: ["lesson", "quiz", "assessment", "exam"],
  },
  {
    id: "content",
    label: "Content",
    description: "Main body — topics, notes, media",
    mandatory: true,
    icon: "content",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"],
  },
  {
    id: "assignment",
    label: "Assignment",
    description: "Tasks & exercises for students",
    mandatory: true,
    icon: "assignment",
    forTypes: ["lesson", "quiz"],
  },
  {
    id: "scoring",
    label: "Scoring",
    description: "Rubric & grading criteria",
    mandatory: true,
    icon: "scoring",
    forTypes: ["assessment", "exam", "quiz"],
  },
  {
    id: "footer",
    label: "Footer",
    description: "Signatures, branding, page number",
    mandatory: true,
    icon: "footer",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"],
  },
]

/**
 * Get default enabled blocks for a template type
 */
export function getDefaultBlocksForType(templateType: TemplateType): TemplateBlockType[] {
  return TEMPLATE_BLOCK_SEQUENCES[templateType] ?? []
}

/**
 * Get available blocks for a template type (including optional ones)
 */
export function getAvailableBlocksForType(templateType: TemplateType): TemplateBlockConfig[] {
  return ALL_TEMPLATE_BLOCKS.filter((block) => block.forTypes.includes(templateType))
}

/**
 * Create default template design config for a session
 */
export function createDefaultTemplateDesign(templateType: TemplateType): TemplateDesignConfig {
  return {
    templateType,
    enabledBlocks: getDefaultBlocksForType(templateType),
  }
}

/**
 * Validate that all mandatory blocks are enabled
 */
export function validateTemplateDesign(config: TemplateDesignConfig): { valid: boolean; missing: TemplateBlockType[] } {
  const available = getAvailableBlocksForType(config.templateType)
  const mandatory = available.filter((b) => b.mandatory).map((b) => b.id)
  const missing = mandatory.filter((blockId) => !config.enabledBlocks.includes(blockId))

  return {
    valid: missing.length === 0,
    missing,
  }
}
