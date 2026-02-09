/**
 * PageContainer - Individual page with header/body/footer layout
 * Handles rendering metadata in header/footer and managing body content
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { PageMetadata, LayoutNode } from "./PageMetadata";
import { formatDate } from "./PageMetadata";
import {
  computePixelDimensions,
  DEFAULT_CANVAS_ORIENTATION,
  DEFAULT_CANVAS_SIZE,
} from "../PageSizeConfig";
import {
  HEADER_FOOTER_BG_ALPHA,
  HEADER_FOOTER_BG_COLOR,
} from "./renderers/PageRenderConstants";
import type {
  PageContainerConfig,
  TemplateSectionFieldConfig,
} from "./renderers/PageRenderTypes";
import { normalizeString, toDisplayString } from "./renderers/PageTextUtils";
import { PageHeaderRenderer } from "./renderers/PageHeaderRenderer";
import { PageFooterRenderer } from "./renderers/PageFooterRenderer";
import { PageBodyRenderer } from "./renderers/PageBodyRenderer";

const DEFAULT_DIMENSIONS = computePixelDimensions(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_ORIENTATION);
const FALLBACK_WIDTH = DEFAULT_DIMENSIONS.widthPx;
const FALLBACK_HEIGHT = DEFAULT_DIMENSIONS.heightPx;
export class PageContainer extends Container {
  private config: PageContainerConfig;
  private metadata: PageMetadata;
  
  private headerContainer: Container;
  private bodyContainer: Container;
  private footerContainer: Container;

  private headerBg: Graphics;
  private bodyBg: Graphics;
  private footerBg: Graphics;


  constructor(metadata: PageMetadata, config: PageContainerConfig) {
    super();
    
    this.config = {
      width: config.width ?? FALLBACK_WIDTH,
      height: config.height ?? FALLBACK_HEIGHT,
      margins: config.margins,
      showDebugBorders: config.showDebugBorders ?? false,
    };
    
    this.metadata = metadata;
    this.label = `page-${metadata.pageNumber}`;

    // Create containers
    this.headerContainer = new Container();
    this.headerContainer.label = "header";
    
    this.bodyContainer = new Container();
    this.bodyContainer.label = "body";
    
    this.footerContainer = new Container();
    this.footerContainer.label = "footer";

    // Create backgrounds
    this.headerBg = new Graphics();
    this.bodyBg = new Graphics();
    this.footerBg = new Graphics();

    // Build the layout
    this.buildLayout();
    
    // Populate with metadata
    this.populateHeader();
    this.populateFooter();
    this.populateBody();

    // Add containers to stage
    this.addChild(this.headerContainer);
    this.addChild(this.bodyContainer);
    this.addChild(this.footerContainer);
  }

  private get pageWidth(): number {
    return this.config.width ?? FALLBACK_WIDTH;
  }

  private get pageHeight(): number {
    return this.config.height ?? FALLBACK_HEIGHT;
  }

  /**
   * Get the body container for adding custom content
   */
  public getBody(): Container {
    return this.bodyContainer;
  }

  /**
   * Get the header container
   */
  public getHeader(): Container {
    return this.headerContainer;
  }

  /**
   * Get the footer container
   */
  public getFooter(): Container {
    return this.footerContainer;
  }

  /**
   * Get page metadata
   */
  public getMetadata(): PageMetadata {
    return this.metadata;
  }

  /**
   * Update metadata and re-render header/footer
   */
  public updateMetadata(metadata: PageMetadata): void {
    this.metadata = metadata;
    this.clearHeader();
    this.clearFooter();
    this.populateHeader();
    this.populateFooter();
  }

  /**
   * Build the layout structure
   */
  private buildLayout(): void {
    const width = this.pageWidth;
    const height = this.pageHeight;
    const { margins } = this.config;
    
    // Calculate dimensions
    const headerWidth = width;
    const bodyWidth = width - margins.left - margins.right;
    const bodyHeight = height - margins.top - margins.bottom;
    const footerWidth = width;
    const footerHeight = margins.bottom;

    // Position containers
    this.headerContainer.x = 0;
    this.headerContainer.y = 0;

    this.bodyContainer.x = margins.left;
    this.bodyContainer.y = margins.top;

    this.footerContainer.x = 0;
    this.footerContainer.y = height - margins.bottom;

    // Draw backgrounds
    const headerHeight = margins.top;
    this.headerBg.clear();
    this.headerBg.rect(0, 0, headerWidth, headerHeight);
    this.headerBg.fill({ color: HEADER_FOOTER_BG_COLOR, alpha: HEADER_FOOTER_BG_ALPHA });
    if (this.config.showDebugBorders) {
      this.headerBg.stroke({ color: 0xe2e8f0, width: 1 });
    }

    this.bodyBg.clear();
    this.bodyBg.rect(0, 0, bodyWidth, bodyHeight);
    this.bodyBg.fill({ color: 0xffffff, alpha: 1 });
    if (this.config.showDebugBorders) {
      this.bodyBg.stroke({ color: 0xcbd5e1, width: 2 });
    }

    this.footerBg.clear();
    this.footerBg.rect(0, 0, footerWidth, footerHeight);
    this.footerBg.fill({ color: HEADER_FOOTER_BG_COLOR, alpha: HEADER_FOOTER_BG_ALPHA });
    if (this.config.showDebugBorders) {
      this.footerBg.stroke({ color: 0xe2e8f0, width: 1 });
    }

    // Add backgrounds
    this.headerContainer.addChild(this.headerBg);
    this.bodyContainer.addChild(this.bodyBg);
    this.footerContainer.addChild(this.footerBg);
  }

  /**
   * Populate header with metadata
   */
  private populateHeader(): void {
    const headerTemplate = this.extractTemplateSectionConfig("header");
    const renderer = new PageHeaderRenderer({
      container: this.headerContainer,
      width: this.pageWidth,
      height: Math.max(1, this.config.margins.top),
      template: headerTemplate,
      createLabelStyle: () => this.createHeaderLabelStyle(),
      createValueStyle: (width) => this.createHeaderValueStyle(Math.max(1, width)),
      formatFieldValue: (key, templateValue) => this.formatHeaderFieldValue(key, templateValue),
    });
    renderer.render();
  }

  /**
   * Populate footer with metadata
   */
  private populateFooter(): void {
    const footerTemplate = this.extractTemplateSectionConfig("footer");
    const renderer = new PageFooterRenderer({
      container: this.footerContainer,
      width: this.pageWidth,
      height: Math.max(1, this.config.margins.bottom),
      template: footerTemplate,
      createLabelStyle: () => this.createHeaderLabelStyle(),
      createValueStyle: (width) => this.createHeaderValueStyle(Math.max(1, width)),
      formatFieldValue: (key, templateValue) => this.formatFooterFieldValue(key, templateValue),
    });
    renderer.render();
  }

  /**
   * Populate body with placeholder content
   */
  private populateBody(): void {
    const width = this.pageWidth;
    const height = this.pageHeight;
    const { margins } = this.config;
    const bodyWidth = width - margins.left - margins.right;
    const bodyHeight = height - margins.top - margins.bottom;

    this.clearBody();

    const bodyNode = this.findBodyNode(this.metadata.layout);
    const bodyRenderer = new PageBodyRenderer({
      container: this.bodyContainer,
      metadata: this.metadata,
      bodyNode,
      bodyWidth,
      bodyHeight,
      createHeadingStyle: (wrapWidth) => this.createHeadingStyle(wrapWidth),
      createSubheadingStyle: (wrapWidth) => this.createSubheadingStyle(wrapWidth),
      createBodyStyle: (wrapWidth) => this.createBodyStyle(wrapWidth),
      createSecondaryStyle: (wrapWidth) => this.createSecondaryStyle(wrapWidth),
      createTableHeaderStyle: (wrapWidth) => this.createTableHeaderStyle(wrapWidth),
      createTableCellStyle: (wrapWidth) => this.createTableCellStyle(wrapWidth),
    });
    bodyRenderer.render();
  }

  private extractTemplateSectionConfig(role: "header" | "footer"): TemplateSectionFieldConfig | null {
    const node = this.findSectionNode(role);
    if (!node || !node.data || typeof node.data !== "object") {
      return null;
    }

    const data = node.data as {
      fields?: Record<string, unknown>;
      activeFields?: Array<{ key?: string; label?: string }>;
    };

    const activeFields = Array.isArray(data.activeFields)
      ? data.activeFields.filter(
          (field): field is { key: string; label?: string } => Boolean(field && typeof field.key === "string"),
        )
      : [];

    const order = activeFields.map((field) => field.key);
    const labels = new Map<string, string>();
    activeFields.forEach((field) => {
      if (field.key && typeof field.label === "string") {
        labels.set(field.key, field.label);
      }
    });

    return {
      values: (data.fields ?? {}) as Record<string, unknown>,
      order,
      labels,
    };
  }

  private findSectionNode(role: "header" | "footer", node?: LayoutNode | null): LayoutNode | null {
    const current = typeof node === "undefined" ? this.metadata.layout : node;
    if (!current) {
      return null;
    }

    if (current.role === role) {
      return current;
    }

    if (Array.isArray(current.children)) {
      for (const child of current.children as LayoutNode[]) {
        const result = this.findSectionNode(role, child);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private findBodyNode(node: LayoutNode | null | undefined): LayoutNode | null {
    if (!node) {
      return null;
    }

    if (node.role === "body" || node.id === "lesson-body") {
      return node;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children as LayoutNode[]) {
        const result = this.findBodyNode(child);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private formatHeaderFieldValue(key: string, templateValue?: unknown): string {
    switch (key) {
      case "lesson_number":
        return (
          this.formatLessonNumberValue(templateValue) || this.formatLessonNumberValue(this.metadata.lessonNumber)
        );
      case "date": {
        const templateDate = toDisplayString(templateValue, "generic");
        if (templateDate) {
          return templateDate;
        }
        return this.metadata.date ? formatDate(this.metadata.date) : "";
      }
      case "lesson_title":
        return (
          toDisplayString(templateValue, "topic") ||
          normalizeString(this.metadata.lessonTitle, "topic") ||
          ""
        );
      case "module_title": {
        const templateModule = toDisplayString(templateValue, "module");
        if (templateModule) {
          return templateModule;
        }
        const metadataModule =
          (typeof this.metadata.moduleTitle === "string"
            ? normalizeString(this.metadata.moduleTitle, "module")
            : "") ||
          (typeof this.metadata.moduleNumber === "number" && this.metadata.moduleNumber > 0
            ? `Module ${this.metadata.moduleNumber}`
            : "");
        return metadataModule;
      }
      case "course_title":
        return toDisplayString(templateValue, "course") || normalizeString(this.metadata.courseName, "course");
      case "teacher_name":
        return toDisplayString(templateValue, "teacher") || this.getTeacherMetadataValue();
      default:
        return toDisplayString(templateValue, "generic");
    }
  }

  private formatFooterFieldValue(key: string, templateValue?: unknown): string {
    switch (key) {
      case "copyright":
        return this.resolveFooterCopyright(templateValue);
      case "teacher_name":
        return toDisplayString(templateValue, "teacher") || this.getTeacherMetadataValue();
      case "institution_name":
        const metadataInstitution =
          typeof this.metadata.institutionName === "string"
            ? normalizeString(this.metadata.institutionName, "institution")
            : "";
        return toDisplayString(templateValue, "institution") || metadataInstitution || "";
      case "page_number":
        return this.formatPageIndicator();
      default:
        return toDisplayString(templateValue, "generic");
    }
  }

  private formatLessonNumberValue(value: unknown): string {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
        ? Number(value.replace(/[^\d.-]/g, ""))
        : null;
    const source = Number.isFinite(numericValue) ? Number(numericValue) : Number(this.metadata.lessonNumber);
    if (!Number.isFinite(source)) {
      return "";
    }
    const padded = String(Math.max(0, Math.trunc(source))).padStart(2, "0");
    return padded;
  }

  private getTeacherMetadataValue(): string {
    return (
      (typeof this.metadata.teacherName === "string"
        ? normalizeString(this.metadata.teacherName, "teacher")
        : "") ||
      (typeof this.metadata.instructor === "string"
        ? normalizeString(this.metadata.instructor, "teacher")
        : "") ||
      ""
    );
  }

  private resolveFooterCopyright(templateValue?: unknown): string {
    const provided =
      (typeof this.metadata.copyright === "string" ? normalizeString(this.metadata.copyright, "generic") : "") ||
      toDisplayString(templateValue, "generic");
    if (provided) {
      return provided;
    }

    const teacherValue = this.getTeacherMetadataValue();
    const institutionValue =
      typeof this.metadata.institutionName === "string"
        ? normalizeString(this.metadata.institutionName, "institution")
        : "";
    const courseValue = normalizeString(this.metadata.courseName, "course");
    const owner = teacherValue || institutionValue || courseValue || "Neptino";
    const year = new Date().getFullYear();
    return `© ${year} ${owner}`;
  }

  private formatPageIndicator(): string {
    const currentPage = Math.max(1, Number(this.metadata.pageNumber) || 1);
    return `${currentPage}`;
  }

  private createHeadingStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 22,
      fontWeight: "700",
      fill: 0x0f172a,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 28,
    });
  }

  private createSubheadingStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 18,
      fontWeight: "600",
      fill: 0x1e293b,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 24,
    });
  }

  private createHeaderLabelStyle(): TextStyle {
    return new TextStyle({
      fontSize: 10,
      fontWeight: "600",
      fill: 0x475569,
      letterSpacing: 1,
    });
  }

  private createHeaderValueStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 18,
      fontWeight: "700",
      fill: 0x0f172a,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 22,
      align: "center",
    });
  }

  private createBodyStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 16,
      fontWeight: "400",
      fill: 0x334155,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 22,
    });
  }

  private createSecondaryStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 14,
      fontWeight: "400",
      fill: 0x64748b,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 20,
    });
  }

  private createTableHeaderStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 14,
      fontWeight: "700",
      fill: 0x1e293b,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 20,
      letterSpacing: 1,
    });
  }

  private createTableCellStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 14,
      fontWeight: "500",
      fill: 0x334155,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 20,
    });
  }

  /**
   * Clear header content (except background)
   */
  private clearHeader(): void {
    while (this.headerContainer.children.length > 1) {
      this.headerContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Clear footer content (except background)
   */
  private clearFooter(): void {
    while (this.footerContainer.children.length > 1) {
      this.footerContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Clear body content (except background)
   */
  public clearBody(): void {
    while (this.bodyContainer.children.length > 1) {
      this.bodyContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Destroy the page container
   */
  public override destroy(options?: any): void {
    this.headerBg.destroy();
    this.bodyBg.destroy();
    this.footerBg.destroy();
    super.destroy(options);
  }
}
