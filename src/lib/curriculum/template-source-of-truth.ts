import { ALL_TEMPLATE_TYPES, type TemplateType } from "./template-blocks"

export type TemplateVisualDensity = "compact" | "default" | "spacious"

export interface NormalizedTemplateConfig {
  id: string
  name: string
  type: TemplateType
  fieldEnabled?: Partial<Record<string, Record<string, unknown>>>
  builtIn?: boolean
}

export const BUILT_IN_TEMPLATE_ID_PREFIX = "neptino-default"

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  lesson: "General Purpose Lesson",
  certificate: "General Purpose Certificate",
  quiz: "General Purpose Quiz",
  assessment: "General Purpose Assessment",
  exam: "General Purpose Exam",
}

export function getBuiltInTemplateId(type: TemplateType): string {
  return `${BUILT_IN_TEMPLATE_ID_PREFIX}-${type}`
}

export function isBuiltInTemplateId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith(`${BUILT_IN_TEMPLATE_ID_PREFIX}-`)
}

export function createBuiltInTemplateConfigs(): NormalizedTemplateConfig[] {
  return ALL_TEMPLATE_TYPES.map((type) => ({
    id: getBuiltInTemplateId(type),
    name: TEMPLATE_LABELS[type],
    type,
    builtIn: true,
  }))
}

function isTemplateType(value: unknown): value is TemplateType {
  return typeof value === "string" && (ALL_TEMPLATE_TYPES as readonly string[]).includes(value)
}

function normalizeTemplateType(value: unknown): TemplateType {
  return isTemplateType(value)
    ? value
    : "lesson"
}

function readFieldEnabled(obj: Record<string, unknown>): Partial<Record<string, Record<string, unknown>>> | undefined {
  const direct = obj.fieldEnabled ?? obj.fieldState
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as Partial<Record<string, Record<string, unknown>>>
  }

  const design = obj.template_design ?? obj.templateDesign
  if (design && typeof design === "object" && !Array.isArray(design)) {
    const blockSettings = (design as Record<string, unknown>).blockSettings
    if (blockSettings && typeof blockSettings === "object" && !Array.isArray(blockSettings)) {
      return blockSettings as Partial<Record<string, Record<string, unknown>>>
    }
  }

  return undefined
}

export function resolveTemplateSelection(params: {
  requestedTemplateId?: string
  requestedTemplateType?: TemplateType
  templateById: Map<string, NormalizedTemplateConfig>
  templateByType: Map<TemplateType, NormalizedTemplateConfig>
}): { templateId?: string; templateType: TemplateType; templateConfig?: NormalizedTemplateConfig } {
  const { requestedTemplateId, requestedTemplateType, templateById, templateByType } = params

  if (requestedTemplateId) {
    const config = templateById.get(requestedTemplateId)
    if (config) {
      return {
        templateId: requestedTemplateId,
        templateType: normalizeTemplateType(config.type),
        templateConfig: config,
      }
    }
  }

  const type = normalizeTemplateType(requestedTemplateType)
  const config = templateByType.get(type)
  return { templateId: config?.id, templateType: type, templateConfig: config }
}

export function parseRawTemplateConfigs(raw: unknown): NormalizedTemplateConfig[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(Boolean).map((item) => {
    const obj = item as Record<string, unknown>
    return {
      id: String(obj.id ?? ""),
      name: String(obj.name ?? obj.label ?? ""),
      type: normalizeTemplateType(obj.type),
      fieldEnabled: readFieldEnabled(obj),
    }
  })
}
