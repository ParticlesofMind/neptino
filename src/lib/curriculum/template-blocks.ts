/**
 * Template Blocks Types
 * Defines block structure for different template types (lesson, quiz, exam, assessment, certificate)
 * Based on legacy template system
 */

import { TEMPLATE_BLUEPRINTS, slotToBlockId } from "@/lib/curriculum/template-json-blueprints"

export type TemplateType = "lesson" | "quiz" | "exam" | "assessment" | "certificate" | "project" | "lab" | "workshop" | "discussion" | "reflection" | "survey" | "table_of_contents"

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
 * All available template blocks with metadata
 */
export const ALL_TEMPLATE_BLOCKS: TemplateBlockConfig[] = [
  {
    id: "header",
    label: "Header",
    description: "Title, date, student metadata",
    mandatory: true,
    icon: "header",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"],
  },
  {
    id: "program",
    label: "Program",
    description: "Objectives & lesson overview",
    mandatory: true,
    icon: "program",
    forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"],
  },
  {
    id: "resources",
    label: "Resources",
    description: "Reference materials & links",
    mandatory: true,
    icon: "resources",
    forTypes: ["lesson", "quiz", "assessment", "exam", "project", "lab", "workshop"],
  },
  {
    id: "content",
    label: "Content",
    description: "Main body — topics, notes, media",
    mandatory: true,
    icon: "content",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"],
  },
  {
    id: "assignment",
    label: "Assignment",
    description: "Tasks & exercises for students",
    mandatory: true,
    icon: "assignment",
    forTypes: ["lesson", "quiz", "lab", "workshop"],
  },
  {
    id: "scoring",
    label: "Scoring",
    description: "Rubric & grading criteria",
    mandatory: true,
    icon: "scoring",
    forTypes: ["assessment", "exam", "quiz", "project", "lab"],
  },
  {
    id: "footer",
    label: "Footer",
    description: "Signatures, branding, page number",
    mandatory: true,
    icon: "footer",
    forTypes: ["lesson", "quiz", "assessment", "exam", "certificate", "project", "lab", "workshop", "discussion", "reflection", "survey", "table_of_contents"],
  },
]

/**
 * Get default enabled blocks for a template type.
 * Derived from the canonical JSON blueprint — TEMPLATE_BLUEPRINTS is the single source of
 * truth, so block sequences can never drift from what the renderer actually renders.
 */
export function getDefaultBlocksForType(templateType: TemplateType): TemplateBlockType[] {
  const blueprint = TEMPLATE_BLUEPRINTS[templateType]
  if (!blueprint) return []
  const blocks: TemplateBlockType[] = ["header"]
  for (const slot of blueprint.body) {
    const blockId = slotToBlockId(slot.kind) as TemplateBlockType | null
    if (blockId && !blocks.includes(blockId)) {
      blocks.push(blockId)
    }
  }
  blocks.push("footer")
  return blocks
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
