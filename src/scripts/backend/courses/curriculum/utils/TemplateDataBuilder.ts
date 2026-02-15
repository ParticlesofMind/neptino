import { TemplateRecord, TemplateDefinitionBlock, TemplateDefinition } from "../curriculumManager";

export class TemplateDataBuilder {
  /**
   * Normalize raw template data
   */
  static normalizeTemplateDefinition(raw: unknown): TemplateDefinition {
    const payload = this.normalizeDefinitionPayload(raw);
    if (!payload) {
      return {
        name: null,
        blocks: [],
        settings: {},
      };
    }

    const name =
      typeof payload.name === "string" && payload.name.trim().length
        ? payload.name.trim()
        : null;
    const settings =
      payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)
        ? (payload.settings as Record<string, unknown>)
        : {};

    const rawBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
    const blocks = rawBlocks
      .map((block, index) => TemplateDataBuilder.normalizeTemplateBlock(block, index))
      .filter((block): block is TemplateDefinitionBlock => block !== null)
      .sort((a, b) => a.order - b.order);

    return {
      name,
      blocks,
      settings,
    };
  }

  /**
   * Normalize a single template block
   */
  static normalizeTemplateBlock(
    raw: unknown,
    fallbackIndex = 0,
  ): TemplateDefinitionBlock | null {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const block = raw as Record<string, unknown>;
    const type =
      typeof block.type === "string" && block.type.trim().length
        ? block.type.trim()
        : "content";
    const id =
      typeof block.id === "string" && block.id.trim().length
        ? block.id.trim()
        : `${type}-${fallbackIndex + 1}`;
    const order =
      typeof block.order === "number" && Number.isFinite(block.order)
        ? block.order
        : fallbackIndex;
    const config =
      block.config && typeof block.config === "object" && !Array.isArray(block.config)
        ? (block.config as Record<string, unknown>)
        : {};
    const content = typeof block.content === "string" ? block.content : "";

    return {
      id,
      type,
      order,
      config,
      content,
    };
  }

  private static normalizeDefinitionPayload(raw: unknown): Record<string, unknown> | null {
    if (!raw) {
      return null;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("TemplateDataBuilder: failed to parse template definition JSON", error);
        return null;
      }
    }

    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    return null;
  }

  /**
   * Create fallback block when none exists
   */
  static createFallbackBlock(
    blockType: "header" | "footer",
    lessonNumber: number,
    lessonTitle: string,
  ): TemplateDefinitionBlock {
    if (blockType === "header") {
      return {
        id: `fallback-header-${lessonNumber}`,
        type: "header",
        order: -100,
        config: {
          showTitle: true,
          showSubtitle: true,
        },
        content: lessonTitle,
      };
    }

    return {
      id: `fallback-footer-${lessonNumber}`,
      type: "footer",
      order: 1000,
      config: {
        showSignature: false,
      },
      content: "Reflection & next steps",
    };
  }

  /**
   * Serialize template block for rendering
   */
  static serializeTemplateBlock(block: TemplateDefinitionBlock): Record<string, unknown> {
    return {
      id: block.id,
      type: block.type,
      order: block.order,
      config: block.config,
      content: block.content,
    };
  }

  /**
   * Build template info object
   */
  static buildTemplateInfo(
    template: TemplateRecord | null | undefined,
    definition: TemplateDefinition,
  ): {
    id: string;
    slug: string;
    type: string;
    name: string;
    scope: string;
    description: string | null;
  } | null {
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      slug: template.template_id,
      type: this.canonicalizeTemplateType(template.template_type) ?? template.template_type ?? "lesson",
      name: definition.name || template.template_id,
      scope: template.course_id ? "course" : "global",
      description: template.template_description ?? null,
    };
  }

  static canonicalizeTemplateType(rawType: string | null | undefined): string | null {
    if (!rawType || typeof rawType !== "string") {
      return null;
    }
    const normalized = rawType.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!normalized) {
      return null;
    }
    const simplified = normalized.replace(/_(template|plan|layout)$/, "");
    return simplified || normalized;
  }
}
