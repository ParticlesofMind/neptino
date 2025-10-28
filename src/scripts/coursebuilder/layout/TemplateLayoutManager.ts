/**
 * TemplateLayoutManager
 *
 * Renders header/body/footer template regions on the PIXI canvas using the
 * persisted layout data generated in the backend (Yoga configuration).
 */

import "@pixi/layout";
import { Container, Graphics } from "pixi.js";
import type { Layout } from "@pixi/layout";
import { canvasMarginManager } from "./CanvasMarginManager";
import { canvasDimensionManager } from "./CanvasDimensionManager";
import { SectionManager, type SectionReferences } from "./renderers/SectionManager.js";
import { HeaderRenderer } from "./renderers/HeaderRenderer.js";
import { FooterRenderer } from "./renderers/FooterRenderer.js";
import { ProgramRenderer, type ProgramData } from "./renderers/ProgramRenderer.js";
import { FormGridRenderer } from "./utils/FormGridRenderer.js";
import { FormGridBuilder } from "./utils/FormGridBuilder.js";
import type { FormGridData, TemplateTableData } from "./utils/TemplateFieldTypes.js";
import { TextRenderer } from "./utils/TextRenderer.js";

interface LayoutNode {
  id: string;
  role?: "header" | "body" | "footer" | "template-block" | "placeholder";
  type: string;
  order?: number;
  yoga?: any;
  templateBlock?: any;
  children?: LayoutNode[];
  data?: Record<string, unknown>;
}

interface CanvasLessonSummary {
  number: number;
  title: string;
  moduleNumber?: number | null;
}

interface CanvasDataPayload {
  version?: string;
  engine?: string;
  template?: any | null;
  lesson: CanvasLessonSummary;
  margins: { top: number; right: number; bottom: number; left: number; unit?: string };
  dimensions: { width: number; height: number };
  layout: LayoutNode;
}

interface RenderContext {
  teacherName?: string | null;
  courseTitle?: string | null;
  courseCode?: string | null;
  pageNumber?: number;
  generatedAt?: string;
}

export class TemplateLayoutManager {
  private rootContainer: Container | null = null;
  private sections: Record<"header" | "body" | "footer", SectionReferences> | null = null;
  private layoutBounds = { width: 1200, height: 1800 };
  private margins = { top: 96, right: 96, bottom: 96, left: 96 };

  private static SECTION_ORDER: Array<"header" | "body" | "footer"> = ["header", "body", "footer"];

  public async initialize(container: Container): Promise<void> {
    this.layoutBounds = canvasDimensionManager.getCurrentDimensions();
    this.margins = canvasMarginManager.getMargins();

    this.rootContainer = new Container({
      layout: {
        width: this.layoutBounds.width,
        height: this.layoutBounds.height,
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "stretch",
      },
    });
    this.lockDisplayObject(this.rootContainer);
    this.rootContainer.sortableChildren = false;

    container.addChild(this.rootContainer);
    this.createSections();
  }

  public renderCanvas(canvasData: CanvasDataPayload, context: RenderContext): void {
    if (!this.sections) return;

    console.log('🎨 TemplateLayoutManager: Starting render', {
      lesson: canvasData.lesson.number,
      hasLayout: !!canvasData.layout,
      margins: canvasData.margins
    });

    this.ensureSectionsIntegrity();
    this.applyCanvasDimensions(canvasData);
    this.applyMargins(canvasData.margins);
    SectionManager.updateMetrics(this.sections, this.layoutBounds, this.margins);

    const headerNode = this.findSectionNode(canvasData.layout, "header");
    const bodyNode = this.findSectionNode(canvasData.layout, "body");
    const footerNode = this.findSectionNode(canvasData.layout, "footer");

    this.renderHeader(headerNode, canvasData, context);
    this.renderBody(bodyNode, canvasData);
    this.renderFooter(footerNode, canvasData, context);

    console.log('✅ TemplateLayoutManager: Render complete', {
      headerChildren: this.sections.header.content.children.length,
      bodyChildren: this.sections.body.content.children.length,
      footerChildren: this.sections.footer.content.children.length
    });
  }

  public updateBlockSizes(): void {
    if (!this.sections) return;
    SectionManager.updateMetrics(this.sections, this.layoutBounds, this.margins);
  }

  public handleCanvasResize(): void {
    this.layoutBounds = canvasDimensionManager.getCurrentDimensions();
    if (this.sections) {
      SectionManager.updateMetrics(this.sections, this.layoutBounds, this.margins);
    }
  }

  public getAllBlocks(): {
    header: Container | null;
    body: Container | null;
    footer: Container | null;
  } {
    return {
      header: this.sections?.header.container ?? null,
      body: this.sections?.body.container ?? null,
      footer: this.sections?.footer.container ?? null,
    };
  }

  public getDebugInfo(): Record<string, unknown> {
    return {
      initialized: !!this.sections,
      dimensions: this.layoutBounds,
      margins: this.margins,
      sections: {
        header: this.describeSection("header"),
        body: this.describeSection("body"),
        footer: this.describeSection("footer"),
      },
    };
  }

  public destroy(options?: { preserveContainers?: boolean }): void {
    if (!this.sections) return;

    Object.values(this.sections).forEach((section) => {
      this.detachLayout(section.container);
      section.container.off("layout");

      if (!options?.preserveContainers && !section.container.destroyed) {
        section.container.destroy({ children: true });
      }
    });

    if (!options?.preserveContainers && this.rootContainer && !this.rootContainer.destroyed) {
      this.rootContainer.destroy({ children: true });
    }

    if (this.rootContainer) {
      this.detachLayout(this.rootContainer);
    }

    this.rootContainer = null;
    this.sections = null;
  }

  private createSections(): void {
    if (!this.rootContainer) {
      return;
    }

    const createSection = (section: "header" | "body" | "footer") =>
      SectionManager.create(section, (layout, width, height) => {
        this.onSectionLayout(section, layout, width, height);
      });

    this.sections = {
      header: createSection("header"),
      body: createSection("body"),
      footer: createSection("footer"),
    };

    this.rootContainer.addChild(
      this.sections.header.container,
      this.sections.body.container,
      this.sections.footer.container,
    );

    SectionManager.updateMetrics(this.sections, this.layoutBounds, this.margins);
  }

  private ensureSectionsIntegrity(): void {
    if (!this.rootContainer) {
      return;
    }

    if (!this.sections) {
      this.createSections();
      return;
    }

    const sections = this.sections;
    const needsRebuild = TemplateLayoutManager.SECTION_ORDER.some((key) => {
      const ref = sections[key];
      if (!ref) return true;
      if (ref.container.destroyed) return true;
      const layout = (ref.container as any).layout as { destroyed?: boolean } | undefined;
      return !layout || layout.destroyed === true;
    });

    if (needsRebuild) {
      this.rebuildSections();
    }
  }

  private rebuildSections(): void {
    if (!this.sections || !this.rootContainer) {
      return;
    }

    Object.values(this.sections).forEach((section) => {
      try {
        this.detachLayout(section.container);
        section.container.removeAllListeners?.();
      } catch {
        /* ignore */
      }
      if (!section.container.destroyed) {
        section.container.destroy({ children: true });
      }
    });

    this.sections = null;
    this.createSections();
  }

  private onSectionLayout(
    section: "header" | "body" | "footer",
    _layout: Layout,
    width: number,
    height: number,
  ): void {
    if (!this.sections) return;
    const ref = this.sections[section];
    SectionManager.redrawBackground(section, ref, width, height);
    SectionManager.positionContent(ref, this.margins.left);
  }

  private renderHeader(
    headerNode: LayoutNode | null,
    canvasData: CanvasDataPayload,
    _context: RenderContext,
  ): void {
    if (!this.sections) return;

    const section = this.sections.header;
    SectionManager.clearContent(section.content);

    const width = this.getSectionContentWidth();
    const headerData = headerNode?.data as Record<string, unknown> | undefined;
    const fields = headerData?.fields as Record<string, unknown> | undefined;
    const activeFields = headerData?.activeFields as Array<{ key: string; label: string }> | undefined;

    if (fields && activeFields && activeFields.length > 0) {
      HeaderRenderer.renderStructured(section.content, fields, activeFields, width, this.margins.top);
    } else {
      HeaderRenderer.renderLegacy(section.content, headerNode, canvasData, width);
    }
  }

  private renderBody(bodyNode: LayoutNode | null, canvasData: CanvasDataPayload): void {
    if (!this.sections) return;

    const section = this.sections.body;
    SectionManager.clearContent(section.content);

    if (!bodyNode || !Array.isArray(bodyNode.children) || !bodyNode.children.length) {
      const empty = TextRenderer.createText(
        "No body blocks configured for this template yet.",
        TextRenderer.createTextStyle(16, 0x6b7280, false, true),
        20,
        { wordWrapWidth: this.getSectionContentWidth() },
      );
      section.content.addChild(empty);
      return;
    }

    const bodyWidth = this.getSectionContentWidth();
    console.log(`🎨 TemplateLayoutManager: Body width calculated`, {
      layoutBounds: this.layoutBounds,
      margins: this.margins,
      bodyWidth,
      calculation: `${this.layoutBounds.width} - ${this.margins.left} - ${this.margins.right} = ${bodyWidth}`
    });
    let cursorY = 12;

    bodyNode.children.forEach((child) => {
      const blockContainer = new Container();
      blockContainer.position.set(0, cursorY);
      this.lockDisplayObject(blockContainer);

      const blockHeight = this.renderBodyBlock(blockContainer, child, canvasData, bodyWidth);
      section.content.addChild(blockContainer);
      cursorY += blockHeight + 24;
    });
  }

  private renderFooter(
    footerNode: LayoutNode | null,
    _canvasData: CanvasDataPayload,
    context: RenderContext,
  ): void {
    if (!this.sections) return;

    const section = this.sections.footer;
    SectionManager.clearContent(section.content);

    const width = this.getSectionContentWidth();
    const footerData = footerNode?.data as Record<string, unknown> | undefined;
    const fields = footerData?.fields as Record<string, unknown> | undefined;
    const activeFields = footerData?.activeFields as Array<{ key: string; label: string }> | undefined;

    if (fields && activeFields && activeFields.length > 0) {
      FooterRenderer.renderStructured(section.content, fields, activeFields, width, this.margins.bottom);
    } else {
      FooterRenderer.renderLegacy(section.content, footerNode, context, width);
    }
  }

  private renderBodyBlock(
    container: Container,
    node: LayoutNode,
    _canvasData: CanvasDataPayload,
    bodyWidth: number,
  ): number {
    this.lockDisplayObject(container);
    const titleStyle = TextRenderer.createTextStyle(18, 0x1f2937, true);
    let cursorY = 0;

    const templateBlock = node.templateBlock;
    const blockConfig = templateBlock?.config as Record<string, unknown> | undefined;

    const showTitle = blockConfig?.showTitle !== false;
    if (showTitle) {
      const blockTitle = TextRenderer.createText(
        this.resolveBlockTitle(templateBlock?.type ?? node.type),
        titleStyle,
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(blockTitle);

      const underline = new Graphics();
      const underlineY = cursorY + blockTitle.height + 8;
      underline.rect(0, underlineY, bodyWidth, 2).fill({ color: 0x000000, alpha: 1 });
      container.addChild(underline);
      cursorY += blockTitle.height + 20;
    }

    if (templateBlock?.type === "program") {
      const structure = (node.data as Record<string, unknown> | undefined)?.structure as any;
      if (structure && blockConfig?.showSummary !== false) {
        const summary = TextRenderer.createText(
          `${structure.topics ?? 0} topics • ${structure.objectives ?? 0} objectives • ${structure.tasks ?? 0} tasks`,
          TextRenderer.createTextStyle(12, 0x4b5563),
          cursorY,
          { wordWrapWidth: bodyWidth },
        );
        container.addChild(summary);
        cursorY += summary.height + 8;
      }

      const programData = this.extractProgramData(node);
      if (programData && blockConfig?.showTable !== false) {
        const tableContainer = new Container();
        this.lockDisplayObject(tableContainer);
        tableContainer.y = cursorY;
        container.addChild(tableContainer);

        // Use bodyWidth directly to respect canvas margins
        const tableHeight = ProgramRenderer.render(tableContainer, programData, bodyWidth);
        cursorY += tableHeight;
        return cursorY;
      }
    }

    const formData = this.extractFormGridData(node);
    if (formData && blockConfig?.showTable !== false) {
      const formContainer = new Container({
        layout: {
          width: bodyWidth,
          flexDirection: "row",
          justifyContent: "flex-start",
        },
      });
      this.lockDisplayObject(formContainer);
      formContainer.y = cursorY;
      container.addChild(formContainer);

      const formHeight = FormGridRenderer.render(formContainer, formData, {
        availableWidth: bodyWidth,
      });
      cursorY += formHeight;
      return cursorY;
    }

    const content = templateBlock?.content?.trim();
    if (content && !this.isHtmlTemplateString(content) && blockConfig?.showContent !== false) {
      const contentText = TextRenderer.createText(
        content,
        TextRenderer.createTextStyle(14, 0x4b5563),
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(contentText);
      cursorY += contentText.height;
    } else if (!content && blockConfig?.showContent !== false) {
      const fallbackText = TextRenderer.createText(
        "Content coming soon.",
        TextRenderer.createTextStyle(14, 0x4b5563),
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(fallbackText);
      cursorY += fallbackText.height;
    }

    return cursorY;
  }

  private isHtmlTemplateString(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    const htmlTemplatePattern = /<[^>]*>\s*\{\{[^}]+\}\}\s*<\/[^>]*>/;
    const templateVariablePattern = /^\s*\{\{[^}]+\}\}\s*$/;
    return htmlTemplatePattern.test(content) || templateVariablePattern.test(content);
  }

  private extractProgramData(node: LayoutNode | null): ProgramData | null {
    if (!node || typeof node !== "object") return null;
    const candidate = (node as any).data as Record<string, unknown> | undefined;
    if (!candidate || typeof candidate !== "object") return null;
    const program = candidate.program as ProgramData | undefined;
    if (!program || !Array.isArray(program.competencies) || !program.competencies.length) return null;
    return program;
  }

  private extractFormGridData(node: LayoutNode | null): FormGridData | null {
    if (!node || typeof node !== "object") return null;
    const candidate = (node as any).data as Record<string, unknown> | undefined;
    if (!candidate || typeof candidate !== "object") return null;

    const form = candidate.form as FormGridData | undefined;
    if (form && Array.isArray(form.sections) && form.sections.length) {
      return form;
    }

    const table = candidate.table as TemplateTableData | undefined;
    if (table) {
      return FormGridBuilder.fromTableData(table) ?? null;
    }

    return null;
  }

  private findSectionNode(layout: LayoutNode, role: "header" | "body" | "footer"): LayoutNode | null {
    if (layout.role === role) return layout;
    if (!layout.children) return null;
    for (const child of layout.children) {
      const found = this.findSectionNode(child, role);
      if (found) return found;
    }
    return null;
  }

  private applyCanvasDimensions(canvasData: CanvasDataPayload): void {
    if (!canvasData?.dimensions) return;
    const { width, height } = canvasData.dimensions;
    if (this.layoutBounds.width !== width || this.layoutBounds.height !== height) {
      this.layoutBounds = { width, height };
    }
  }

  private applyMargins(margins: CanvasDataPayload["margins"]): void {
    if (!margins) return;
    const resolvedUnit = margins.unit ?? "px";
    const toPixels = (value: number): number =>
      resolvedUnit === "percent" ? (value / 100) * this.layoutBounds.height : value;

    this.margins = {
      top: toPixels(margins.top ?? this.margins.top),
      right: toPixels(margins.right ?? this.margins.right),
      bottom: toPixels(margins.bottom ?? this.margins.bottom),
      left: toPixels(margins.left ?? this.margins.left),
    };
  }

  private resolveBlockTitle(type: string): string {
    switch (type) {
      case "program": return "Program";
      case "resources": return "Resources";
      case "content": return "Content";
      case "assignment": return "Assignment";
      case "scoring": return "Scoring";
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  private getSectionContentWidth(): number {
    return Math.max(this.layoutBounds.width - this.margins.left - this.margins.right, 0);
  }

  private describeSection(section: "header" | "body" | "footer"): Record<string, unknown> {
    if (!this.sections) return { exists: false };
    const ref = this.sections[section];
    const bounds = ref.background.getBounds();
    return {
      exists: true,
      childCount: ref.content.children.length,
      bounds: { width: bounds.width, height: bounds.height },
    };
  }

  private lockDisplayObject(object: any): void {
    object.__locked = true;
    if ("eventMode" in object) object.eventMode = "none";
    if ("interactive" in object) object.interactive = false;
    if ("interactiveChildren" in object) object.interactiveChildren = false;
    try {
      object.cursor = "default";
    } catch { /* ignore */ }
  }

  private detachLayout(container: Container): void {
    const anyContainer = container as any;
    const layout = anyContainer?.layout;
    if (layout && typeof layout.destroy === "function" && !layout.destroyed) {
      layout.destroy();
    }
    try {
      anyContainer.layout = null;
    } catch {
      /* ignore */
    }
  }
}

export type { CanvasDataPayload, RenderContext as TemplateRenderContext };
