/**
 * Template source of truth — stub file. The full template system will be rebuilt here.
 */

import type { TemplateType } from "./template-blocks"

export type TemplateVisualDensity = "compact" | "default" | "spacious"

export interface NormalizedTemplateConfig {
  id: string
  name: string
  type: string
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>
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
        templateType: (config.type as TemplateType) ?? "lesson",
        templateConfig: config,
      }
    }
  }

  const type = requestedTemplateType ?? "lesson"
  const config = templateByType.get(type)
  return { templateId: config?.id, templateType: type, templateConfig: config }
}

export function parseRawTemplateConfigs(raw: unknown): NormalizedTemplateConfig[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(Boolean).map((item) => {
    const obj = item as Record<string, unknown>
    return {
      id: String(obj.id ?? ""),
      name: String(obj.name ?? ""),
      type: String(obj.type ?? "lesson"),
    }
  })
}
