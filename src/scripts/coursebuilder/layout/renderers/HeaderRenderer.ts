import { Container } from "pixi.js";
import { TextRenderer } from "../utils/TextRenderer.js";

export interface LayoutNode {
  id: string;
  role?: "header" | "body" | "footer" | "template-block" | "placeholder";
  type: string;
  templateBlock?: {
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
    content: string;
  };
  data?: Record<string, unknown>;
}

export interface CanvasDataPayload {
  version?: string;
  engine?: string;
  template?: {
    id: string;
    slug: string;
    name: string;
    type: string;
    scope: string;
    description: string | null;
  } | null;
  lesson: {
    number: number;
    title: string;
    moduleNumber?: number | null;
  };
  margins: { top: number; right: number; bottom: number; left: number; unit?: string };
  dimensions: { width: number; height: number };
}

export class HeaderRenderer {
  /**
   * Render structured header fields
   */
  static renderStructured(
    container: Container,
    fields: Record<string, unknown>,
    activeFields: Array<{ key: string; label: string }>,
    width: number,
    topMargin: number,
  ): void {
    const textStyle = TextRenderer.createTextStyle(14, 0x1f2937, false);

    const fieldValues: string[] = [];
    
    activeFields.forEach((field) => {
      const value = fields[field.key];
      if (value !== undefined && value !== null) {
        fieldValues.push(String(value));
      }
    });

    if (fieldValues.length === 0) return;

    // Calculate spacing for flexbox-like behavior
    const totalGap = (fieldValues.length - 1) * 24;
    const availableWidth = width - 32 - totalGap;
    const itemWidth = Math.max(availableWidth / fieldValues.length, 60);

    let currentX = 16;

    fieldValues.forEach((value) => {
      const itemText = TextRenderer.createText(
        value,
        textStyle,
        0,
        { wordWrapWidth: itemWidth }
      );
      
      itemText.anchor.set(0, 0.5);
      itemText.position.set(currentX, topMargin / 2);
      
      container.addChild(itemText);
      
      currentX += itemWidth + 24;
    });
  }

  /**
   * Render legacy header content
   */
  static renderLegacy(
    container: Container,
    headerNode: LayoutNode | null,
    canvasData: CanvasDataPayload,
    width: number,
  ): void {
    const templateBlock = headerNode?.templateBlock;
    const blockConfig = templateBlock?.config as Record<string, unknown> | undefined;
    
    const metadataParts: string[] = [];

    if (blockConfig?.showTitle !== false) {
      const lessonTitle =
        canvasData.lesson?.title ||
        (canvasData.lesson?.number
          ? `Lesson ${canvasData.lesson.number}`
          : "Lesson");
      metadataParts.push(lessonTitle);
    }

    if (blockConfig?.showSubtitle !== false && canvasData.lesson?.moduleNumber !== undefined && canvasData.lesson?.moduleNumber !== null) {
      metadataParts.push(`Module ${canvasData.lesson.moduleNumber}`);
    }

    if (templateBlock?.content && !this.isHtmlTemplateString(templateBlock.content)) {
      metadataParts.push(templateBlock.content);
    }

    const metadataText = metadataParts.join(" | ");
    const headerText = TextRenderer.createText(
      metadataText,
      TextRenderer.createTextStyle(14, 0x374151, false),
      0,
      { wordWrapWidth: width - 32 }
    );

    headerText.anchor.set(0.5, 0.5);
    headerText.position.set(width / 2, 40);

    container.addChild(headerText);
  }

  /**
   * Check if content is an HTML template string
   */
  private static isHtmlTemplateString(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    
    const htmlTemplatePattern = /<[^>]*>\s*\{\{[^}]+\}\}\s*<\/[^>]*>/;
    const templateVariablePattern = /^\s*\{\{[^}]+\}\}\s*$/;
    
    return htmlTemplatePattern.test(content) || templateVariablePattern.test(content);
  }
}

