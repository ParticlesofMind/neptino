/**
 * PageContainer - Individual page with header/body/footer layout
 * Handles rendering metadata in header/footer and managing body content
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { PageMetadata, LayoutNode } from "./PageMetadata";
import type { TableData } from "../layout/utils/TableRenderer";
import { formatDate } from "./PageMetadata";
import {
  computePixelDimensions,
  DEFAULT_CANVAS_ORIENTATION,
  DEFAULT_CANVAS_SIZE,
} from "../layout/PageSizeConfig";

type PlaceholderKind =
  | "generic"
  | "competency"
  | "topic"
  | "objective"
  | "task"
  | "method"
  | "social"
  | "time"
  | "module"
  | "course"
  | "institution"
  | "teacher";

const DEFAULT_DIMENSIONS = computePixelDimensions(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_ORIENTATION);
const FALLBACK_WIDTH = DEFAULT_DIMENSIONS.widthPx;
const FALLBACK_HEIGHT = DEFAULT_DIMENSIONS.heightPx;
const HEADER_FOOTER_BG_COLOR = 0xdbeafe;
const HEADER_FOOTER_BG_ALPHA = 0.35;

interface PageContainerConfig {
  width?: number;
  height?: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showDebugBorders?: boolean;
}

interface TemplateSectionFieldConfig {
  values: Record<string, unknown>;
  order: string[];
  labels: Map<string, string>;
}

export class PageContainer extends Container {
  private config: PageContainerConfig;
  private metadata: PageMetadata;
  
  private headerContainer: Container;
  private bodyContainer: Container;
  private footerContainer: Container;

  private headerBg: Graphics;
  private bodyBg: Graphics;
  private footerBg: Graphics;

  private static readonly BODY_PADDING = 24;
  private static readonly SECTION_SPACING = 28;
  private static readonly LINE_SPACING = 6;
  private static readonly BULLET_INDENT = 24;
  private static readonly NESTED_INDENT = 48;
  private static readonly HEADER_FIELD_ORDER = [
    "lesson_number",
    "date",
    "lesson_title",
    "module_title",
    "course_title",
    "teacher_name",
  ];
  private static readonly HEADER_FIELD_LABELS: Record<string, string> = {
    lesson_number: "Lesson Number",
    date: "Lesson Date",
    lesson_title: "Lesson Title",
    module_title: "Module Title",
    course_title: "Course Title",
    teacher_name: "Teacher",
  };
  private static readonly FOOTER_FIELD_ORDER = ["copyright", "teacher_name", "institution_name", "page_number"];
  private static readonly FOOTER_FIELD_LABELS: Record<string, string> = {
    copyright: "Copyright",
    teacher_name: "Teacher",
    institution_name: "Institution",
    page_number: "Page",
  };

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

  private sanitizeTextInput(input: string | null | undefined): string {
    if (typeof input !== "string") {
      return "";
    }

    const withoutHtml = input
      .replace(/<[^>]*>/g, " ")
      .replace(/\{\{[^}]+\}\}/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");

    return withoutHtml.replace(/\s+/g, " ").trim();
  }

  private isPlaceholderLabel(text: string, kind: PlaceholderKind): boolean {
    const normalized = text.trim().toLowerCase();

    switch (kind) {
      case "topic":
        return /^(topic|topic title)(\s+\d+)?$/.test(normalized);
      case "objective":
        return /^objective(\s+\d+)?$/.test(normalized);
      case "task":
        return /^task(\s+\d+)?$/.test(normalized);
      case "competency":
        return /^competency(\s+\d+)?$/.test(normalized);
      case "method":
        return normalized === "method";
      case "social":
        return normalized === "social" || normalized === "social form";
      case "time":
        return normalized === "time";
      case "module":
        return /^module(\s+\d+)?$/.test(normalized);
      case "course":
        return normalized === "course" || normalized === "course name";
      case "institution":
        return normalized === "institution" || normalized === "institution name";
      case "teacher":
        return normalized === "teacher" || normalized === "teacher name";
      default:
        return (
          normalized === "content section" ||
          normalized === "header" ||
          normalized === "footer" ||
          normalized === "section" ||
          normalized === "content" ||
          normalized === "course title" ||
          normalized === "teacher" ||
          normalized === "institution"
        );
    }
  }

  private normalizeString(value: string, kind: PlaceholderKind): string {
    const sanitized = this.sanitizeTextInput(value);
    if (!sanitized || this.isPlaceholderLabel(sanitized, kind)) {
      return "";
    }
    return sanitized;
  }

  private resolvePlaceholderKind(columnKey: string): PlaceholderKind {
    switch (columnKey) {
      case "competency":
        return "competency";
      case "topic":
        return "topic";
      case "objective":
        return "objective";
      case "task":
        return "task";
      case "method":
        return "method";
      case "social":
        return "social";
      case "time":
        return "time";
      default:
        return "generic";
    }
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
    const width = this.pageWidth;
    const { margins } = this.config;
    const headerWidth = width;
    const headerHeight = Math.max(1, margins.top);
    const labelValueSpacing = 4;

    const headerTemplate = this.extractTemplateSectionConfig("header");
    const headerOrder =
      headerTemplate && headerTemplate.order.length
        ? headerTemplate.order
        : [...PageContainer.HEADER_FIELD_ORDER];

    const headerSequence = headerOrder.filter((key) => key !== "institution_name");
    const headerItems: Array<{ label: string; value: string }> = [];
    headerSequence.forEach((key) => {
      const templateValue = headerTemplate ? headerTemplate.values[key] : undefined;
      const value = this.formatHeaderFieldValue(key, templateValue);
      if (value) {
        const label = headerTemplate?.labels.get(key) ?? this.getHeaderFieldLabel(key);
        headerItems.push({ label, value });
      }
    });

    if (!headerItems.length) {
      headerItems.push({
        label: this.getHeaderFieldLabel("lesson_number"),
        value: this.formatHeaderFieldValue("lesson_number"),
      });
    }

    const visibleItems = headerItems.filter((item) => item.value && item.value.trim().length);
    const itemCount = visibleItems.length || 1;
    const cellWidth = headerWidth / itemCount;

    visibleItems.forEach((item, index) => {
      const centerX = index * cellWidth + cellWidth / 2;
      const label = new Text({
        text: item.label.toUpperCase(),
        style: this.createHeaderLabelStyle(),
      });
      label.anchor.set(0.5, 0);
      label.x = centerX;
      const value = new Text({
        text: item.value,
        style: this.createHeaderValueStyle(Math.max(1, cellWidth - 32)),
      });
      const blockHeight = label.height + labelValueSpacing + value.height;
      const startY = Math.max(0, (headerHeight - blockHeight) / 2);
      label.y = startY;
      this.headerContainer.addChild(label);

      value.anchor.set(0.5, 0);
      value.x = centerX;
      value.y = startY + label.height + labelValueSpacing;
      this.headerContainer.addChild(value);
    });
  }

  /**
   * Populate footer with metadata
   */
  private populateFooter(): void {
    const width = this.pageWidth;
    const { margins } = this.config;
    const footerWidth = width;
    const footerHeight = Math.max(1, margins.bottom);
    const separatorPadding = 8;
    const labelValueSpacing = 4;

    const footerTemplate = this.extractTemplateSectionConfig("footer");
    const footerOrder =
      footerTemplate && footerTemplate.order.length
        ? footerTemplate.order
        : [...PageContainer.FOOTER_FIELD_ORDER];

    const footerItems: Array<{ label: string; value: string }> = [];
    footerOrder.forEach((key) => {
      const templateValue = footerTemplate ? footerTemplate.values[key] : undefined;
      const value = this.formatFooterFieldValue(key, templateValue);
      if (value) {
        const label = footerTemplate?.labels.get(key) ?? this.getFooterFieldLabel(key);
        footerItems.push({ label, value });
      }
    });

    if (!footerItems.length) {
      footerItems.push({
        label: this.getFooterFieldLabel("page_number"),
        value: this.formatFooterFieldValue("page_number"),
      });
    }

    const visibleFooterItems = footerItems.filter((item) => item.value && item.value.trim().length);
    const footerCount = visibleFooterItems.length || 1;
    const footerCellWidth = footerWidth / footerCount;

    visibleFooterItems.forEach((item, index) => {
      const centerX = index * footerCellWidth + footerCellWidth / 2;
      const label = new Text({
        text: item.label.toUpperCase(),
        style: this.createHeaderLabelStyle(),
      });
      label.anchor.set(0.5, 0);
      label.x = centerX;
      const value = new Text({
        text: item.value,
        style: this.createHeaderValueStyle(Math.max(1, footerCellWidth - 32)),
      });
      const blockHeight = label.height + labelValueSpacing + value.height;
      const availableHeight = Math.max(0, footerHeight - separatorPadding);
      const desiredStart = separatorPadding + Math.max(0, (availableHeight - blockHeight) / 2);
      const maxStart = Math.max(0, footerHeight - blockHeight);
      const startY = Math.min(desiredStart, maxStart);
      label.y = Math.max(0, startY);
      this.footerContainer.addChild(label);

      value.anchor.set(0.5, 0);
      value.x = centerX;
      value.y = startY + label.height + labelValueSpacing;
      this.footerContainer.addChild(value);
    });

    // Separator line at top of footer
    const separator = new Graphics();
    separator.moveTo(40, 0);
    separator.lineTo(footerWidth - 40, 0);
    separator.stroke({ color: 0xe2e8f0, width: 1 });
    this.footerContainer.addChild(separator);
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

    if (!bodyNode || !Array.isArray(bodyNode.children) || bodyNode.children.length === 0) {
      this.renderBodyPlaceholder(bodyWidth, bodyHeight);
      return;
    }

    this.renderBodyBlocks(bodyNode.children as LayoutNode[], bodyWidth);
  }

  private renderBodyPlaceholder(bodyWidth: number, bodyHeight: number): void {
    const placeholderStyle = new TextStyle({
      fontSize: 18,
      fontWeight: "400",
      fill: 0x94a3b8,
      align: "center",
      wordWrap: true,
      wordWrapWidth: Math.max(1, bodyWidth - PageContainer.BODY_PADDING * 2),
      lineHeight: 24,
    });

    const placeholder = new Text({
      text: `Page ${this.metadata.pageNumber} content will appear here once curriculum template data is available.`,
      style: placeholderStyle,
    });
    placeholder.anchor.set(0.5);
    placeholder.x = bodyWidth / 2;
    placeholder.y = bodyHeight / 2;
    this.bodyContainer.addChild(placeholder);
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

  private renderBodyBlocks(blocks: LayoutNode[], bodyWidth: number): void {
    const contentWidth = Math.max(1, bodyWidth - PageContainer.BODY_PADDING * 2);
    let cursorY = PageContainer.BODY_PADDING;

    blocks.forEach((block, index) => {
      const blockBottom = this.renderLessonBlock(block, contentWidth, cursorY);
      cursorY = blockBottom + PageContainer.SECTION_SPACING;

      // Add subtle separator between sections except after last
      if (index < blocks.length - 1) {
        const separator = new Graphics();
        separator.moveTo(PageContainer.BODY_PADDING, cursorY - (PageContainer.SECTION_SPACING / 2));
        separator.lineTo(bodyWidth - PageContainer.BODY_PADDING, cursorY - (PageContainer.SECTION_SPACING / 2));
        separator.stroke({ color: 0xe2e8f0, width: 1 });
        this.bodyContainer.addChild(separator);
      }
    });
  }

  private renderLessonBlock(block: LayoutNode, contentWidth: number, startY: number): number {
    const container = new Container();
    container.x = PageContainer.BODY_PADDING;
    container.y = startY;
    container.label = `lesson-block-${block.id ?? block.type ?? "unknown"}`;
    this.bodyContainer.addChild(container);

    const blockTitle = this.formatBlockTitle(block);
    let cursorY = 0;

    if (blockTitle) {
      const heading = new Text({
        text: blockTitle,
        style: this.createHeadingStyle(contentWidth),
      });
      heading.y = cursorY;
      container.addChild(heading);
      cursorY += heading.height + PageContainer.LINE_SPACING;
    }

    const data = (block.data ?? {}) as Record<string, unknown>;
    const structure = data.structure as { topics?: number; objectives?: number; tasks?: number } | undefined;

    if (structure && (structure.topics || structure.objectives || structure.tasks)) {
      const summaryParts: string[] = [];
      if (typeof structure.topics === "number") {
        summaryParts.push(`${structure.topics} topic${structure.topics === 1 ? "" : "s"}`);
      }
      if (typeof structure.objectives === "number") {
        summaryParts.push(`${structure.objectives} objective${structure.objectives === 1 ? "" : "s"}`);
      }
      if (typeof structure.tasks === "number") {
        summaryParts.push(`${structure.tasks} task${structure.tasks === 1 ? "" : "s"}`);
      }

      if (summaryParts.length) {
        const summary = new Text({
          text: summaryParts.join(" • "),
          style: this.createSecondaryStyle(contentWidth),
        });
        summary.y = cursorY;
        container.addChild(summary);
        cursorY += summary.height + PageContainer.LINE_SPACING;
      }
    }

    const table = data.table as TableData | undefined;
    const tableHasContent = this.tableHasContent(table);

    // Skip table rendering for content and assignment blocks - they use hierarchical rendering
    if (table && block.type !== "content" && block.type !== "assignment") {
      cursorY = this.renderTable(container, table, cursorY, contentWidth);
    }

    if (block.type === "program" && (!table || !tableHasContent)) {
      cursorY = this.renderProgramDetails(container, data.program, cursorY, contentWidth);
    }

    if (block.type === "content" || block.type === "assignment") {
      const topicNodes = Array.isArray(block.children) ? (block.children as LayoutNode[]) : [];
      cursorY = this.renderHierarchicalContent(container, topicNodes, cursorY, contentWidth, block.type);
    }

    const blockMessage = this.toDisplayString(data.message);
    if (blockMessage) {
      const message = new Text({
        text: blockMessage,
        style: this.createSecondaryStyle(contentWidth),
      });
      message.y = cursorY;
      container.addChild(message);
      cursorY += message.height + PageContainer.LINE_SPACING;
    }

    // Ensure we return absolute bottom position for next block
    return container.y + cursorY;
  }

  private renderTable(
    container: Container,
    table: TableData,
    startY: number,
    contentWidth: number,
  ): number {
    let cursorY = startY;

    const hasColumns = Array.isArray(table.columns) && table.columns.length > 0;
    const hasRows = Array.isArray(table.rows) && table.rows.length > 0;

    if (!hasColumns && !hasRows) {
      if (table.emptyMessage) {
        const empty = new Text({
          text: table.emptyMessage,
          style: this.createSecondaryStyle(contentWidth),
        });
        empty.y = cursorY;
        container.addChild(empty);
        cursorY += empty.height + PageContainer.LINE_SPACING;
      }
      return cursorY;
    }

    if (!hasColumns) {
      if (table.emptyMessage) {
        const empty = new Text({
          text: table.emptyMessage,
          style: this.createSecondaryStyle(contentWidth),
        });
        empty.y = cursorY;
        container.addChild(empty);
        cursorY += empty.height + PageContainer.LINE_SPACING;
      }
      return cursorY;
    }

    const columnCount = table.columns.length;
    const columnPaddingX = 12;
    const rowVerticalPadding = 10;
    const columnGap = 0;
    const columnWidth =
      columnCount > 0
        ? (contentWidth - columnGap * (columnCount - 1)) / columnCount
        : contentWidth;

    // Header
    const headerHeight = 36;
    const headerBg = new Graphics();
    headerBg.rect(0, cursorY, contentWidth, headerHeight);
    headerBg.fill({ color: 0xe2e8f0, alpha: 0.6 });
    container.addChild(headerBg);

    table.columns.forEach((column, columnIndex) => {
      const x = columnIndex * (columnWidth + columnGap);
      const headerText = new Text({
        text: column.label.toUpperCase(),
        style: this.createTableHeaderStyle(columnWidth - columnPaddingX * 2),
      });
      headerText.x = x + columnPaddingX;
      headerText.y = cursorY + (headerHeight - headerText.height) / 2;
      container.addChild(headerText);

      if (columnIndex > 0) {
        const separator = new Graphics();
        separator.moveTo(x, cursorY + 6);
        separator.lineTo(x, cursorY + headerHeight - 6);
        separator.stroke({ color: 0xcbd5e1, width: 1 });
        container.addChild(separator);
      }
    });

    cursorY += headerHeight;

    if (hasRows) {
      table.rows.forEach((row, rowIndex) => {
        const rowCells = row.cells ?? {};
        const cellTexts: Text[] = [];
        let rowHeight = 0;

        table.columns.forEach((column, columnIndex) => {
          const placeholderKind = this.resolvePlaceholderKind(column.key);
          const rawValue = this.toDisplayString(rowCells[column.key], placeholderKind);
          const displayValue = rawValue.length > 0 ? rawValue : "—";

          const cellText = new Text({
            text: displayValue,
            style: this.createTableCellStyle(columnWidth - columnPaddingX * 2),
          });

          const columnX = columnIndex * (columnWidth + columnGap) + columnPaddingX;
          cellText.x = columnX;

          cellTexts.push(cellText);
          rowHeight = Math.max(rowHeight, cellText.height + rowVerticalPadding * 2);
        });

        const rowY = cursorY;
        const rowBg = new Graphics();
        rowBg.rect(0, rowY, contentWidth, rowHeight);
        const isEven = rowIndex % 2 === 0;
        rowBg.fill({ color: isEven ? 0xffffff : 0xf8fafc, alpha: 1 });
        container.addChild(rowBg);

        table.columns.forEach((_column, columnIndex) => {
          if (columnIndex > 0) {
            const x = columnIndex * (columnWidth + columnGap);
            const separator = new Graphics();
            separator.moveTo(x, rowY + 6);
            separator.lineTo(x, rowY + rowHeight - 6);
            separator.stroke({ color: 0xe2e8f0, width: 1 });
            container.addChild(separator);
          }
        });

        cellTexts.forEach((text) => {
          text.y = rowY + (rowHeight - text.height) / 2;
          container.addChild(text);
        });

        cursorY += rowHeight;
      });
    } else if (table.emptyMessage) {
      const empty = new Text({
        text: table.emptyMessage,
        style: this.createSecondaryStyle(contentWidth),
      });
      empty.y = cursorY + rowVerticalPadding;
      container.addChild(empty);
      cursorY += empty.height + rowVerticalPadding * 2;
    }

    cursorY += PageContainer.LINE_SPACING;
    return cursorY;
  }

  private tableHasContent(table: TableData | undefined): boolean {
    if (
      !table ||
      !Array.isArray(table.rows) ||
      table.rows.length === 0 ||
      !Array.isArray(table.columns) ||
      table.columns.length === 0
    ) {
      return false;
    }

    return table.rows.some((row) => {
      if (!row || typeof row !== "object") {
        return false;
      }
      const cells = row.cells ?? {};
      return table.columns.some((column) => {
        const placeholderKind = this.resolvePlaceholderKind(column.key);
        return this.toDisplayString(cells[column.key], placeholderKind).length > 0;
      });
    });
  }

  private renderProgramDetails(
    container: Container,
    programData: unknown,
    startY: number,
    contentWidth: number,
  ): number {
    const program = (programData as { competencies?: Array<Record<string, unknown>> }) ?? null;
    if (!program || !Array.isArray(program.competencies) || program.competencies.length === 0) {
      return startY;
    }

    let cursorY = startY;

    program.competencies.forEach((competencyRecord) => {
      const competency = competencyRecord as Record<string, unknown>;
      const title = this.toDisplayString(competency?.name ?? competency, "competency");
      if (title) {
        const competencyText = new Text({
          text: title,
          style: this.createSubheadingStyle(contentWidth),
        });
        competencyText.y = cursorY;
        container.addChild(competencyText);
        cursorY += competencyText.height + PageContainer.LINE_SPACING;
      }

      const topics = Array.isArray(competency?.topics) ? (competency.topics as Array<unknown>) : [];
      topics.forEach((topicItem) => {
        const topic = topicItem as Record<string, unknown>;
        const topicTitle = this.toDisplayString(topic?.name ?? topic?.title ?? topic, "topic");
        if (topicTitle) {
          const topicText = new Text({
            text: topicTitle,
            style: this.createBodyStyle(Math.max(1, contentWidth - PageContainer.BULLET_INDENT)),
          });
          topicText.x = PageContainer.BULLET_INDENT;
          topicText.y = cursorY;
          container.addChild(topicText);
          cursorY += topicText.height + PageContainer.LINE_SPACING;
        }

        const objectives = Array.isArray(topic?.objectives)
          ? (topic.objectives as Array<unknown>)
          : [];
        objectives.forEach((objectiveItem) => {
          const objective = objectiveItem as Record<string, unknown>;
          const objectiveTitle = this.toDisplayString(
            objective?.name ?? objective?.title ?? objective,
            "objective",
          );
          if (objectiveTitle) {
            const objectiveText = new Text({
              text: `• ${objectiveTitle}`,
              style: this.createBodyStyle(Math.max(1, contentWidth - PageContainer.NESTED_INDENT)),
            });
            objectiveText.x = PageContainer.NESTED_INDENT;
            objectiveText.y = cursorY;
            container.addChild(objectiveText);
            cursorY += objectiveText.height + PageContainer.LINE_SPACING;
          }

          const tasks = Array.isArray(objective?.tasks)
            ? (objective.tasks as Array<unknown>)
            : [];
          tasks.forEach((taskItem) => {
            const taskRecord = taskItem as Record<string, unknown>;
            const taskTitle = this.toDisplayString(
              taskRecord?.name ?? taskRecord?.title ?? taskItem,
              "task",
            );
            if (taskTitle) {
              const taskText = new Text({
                text: `– ${taskTitle}`,
                style: this.createSecondaryStyle(Math.max(1, contentWidth - PageContainer.NESTED_INDENT - PageContainer.BULLET_INDENT)),
              });
              taskText.x = PageContainer.NESTED_INDENT + PageContainer.BULLET_INDENT;
              taskText.y = cursorY;
              container.addChild(taskText);
              cursorY += taskText.height + PageContainer.LINE_SPACING;
            }
          });
        });
      });
    });

    return cursorY;
  }

  private renderContentTopics(
    container: Container,
    topicNodes: LayoutNode[],
    startY: number,
    contentWidth: number,
  ): number {
    const topics = topicNodes.filter(
      (node) => node.type === "topic" || node.role === "lesson-topic",
    );

    if (!topics.length) {
      return startY;
    }

    let cursorY = startY;

    topics.forEach((topicNode) => {
      const topicData = (topicNode.data ?? {}) as Record<string, unknown>;
      const topicTitle = this.toDisplayString(topicData.title, "topic");

      if (topicTitle) {
        const topicTitleText = new Text({
          text: topicTitle,
          style: this.createSubheadingStyle(contentWidth),
        });
        topicTitleText.y = cursorY;
        container.addChild(topicTitleText);
        cursorY += topicTitleText.height + PageContainer.LINE_SPACING;
      }

      const objectives = Array.isArray(topicData.objectives)
        ? (topicData.objectives as Array<unknown>)
        : [];
      objectives.forEach((objective) => {
        const objectiveTextValue = this.toDisplayString(objective, "objective");
        if (objectiveTextValue) {
          const objectiveText = new Text({
            text: `• ${objectiveTextValue}`,
            style: this.createBodyStyle(Math.max(1, contentWidth - PageContainer.BULLET_INDENT)),
          });
          objectiveText.x = PageContainer.BULLET_INDENT;
          objectiveText.y = cursorY;
          container.addChild(objectiveText);
          cursorY += objectiveText.height + PageContainer.LINE_SPACING;
        }
      });

      const tasks = Array.isArray(topicData.tasks)
        ? (topicData.tasks as Array<unknown>)
        : [];
      tasks.forEach((task) => {
        const taskLabel = this.toDisplayString(task, "task");
        if (taskLabel) {
          const taskText = new Text({
            text: `– ${taskLabel}`,
            style: this.createSecondaryStyle(Math.max(1, contentWidth - PageContainer.NESTED_INDENT)),
          });
          taskText.x = PageContainer.NESTED_INDENT;
          taskText.y = cursorY;
          container.addChild(taskText);
          cursorY += taskText.height + PageContainer.LINE_SPACING;
        }
      });
    });

    return cursorY;
  }

  /**
   * Render hierarchical content structure matching the preview
   * Structure: Topic > Competency > Objective > Task > (Instruction/Student/Teacher areas)
   */
  private renderHierarchicalContent(
    container: Container,
    topicNodes: LayoutNode[],
    startY: number,
    contentWidth: number,
    blockType: "content" | "assignment",
  ): number {
    const topics = topicNodes.filter(
      (node) => node.type === "topic" || node.role === "lesson-topic",
    );

    if (!topics.length) {
      return startY;
    }

    let cursorY = startY;
    const sectionPadding = 12;
    const groupPadding = 8;
    const headerHeight = 32;
    const cellPadding = 8;
    const rowHeight = 28;
    const emptyRowHeight = 40;

    topics.forEach((topicNode) => {
      const topicData = (topicNode.data ?? {}) as Record<string, unknown>;
      const topicTitle = this.toDisplayString(topicData.title, "topic") || "TOPIC";

      // Topic Section (hierarchy-0)
      const topicSection = new Container();
      topicSection.x = 0;
      topicSection.y = cursorY;

      // Topic header
      const topicHeaderBg = new Graphics();
      topicHeaderBg.rect(0, 0, contentWidth, headerHeight);
      topicHeaderBg.fill({ color: 0xf5f5f5, alpha: 1 });
      topicHeaderBg.stroke({ color: 0xe0e0e0, width: 1 });
      topicSection.addChild(topicHeaderBg);

      const topicHeaderText = new Text({
        text: topicTitle.toUpperCase(),
        style: this.createSubheadingStyle(contentWidth - cellPadding * 2),
      });
      topicHeaderText.x = cellPadding;
      topicHeaderText.y = (headerHeight - topicHeaderText.height) / 2;
      topicSection.addChild(topicHeaderText);

      let sectionY = headerHeight + groupPadding;

      // Get competencies (if structured that way) or treat topic as top level
      const competencyValue = topicData.competency ?? topicData.competence;
      const competencies = Array.isArray(topicData.competencies)
        ? (topicData.competencies as Array<unknown>)
        : competencyValue
        ? [competencyValue]
        : [];

      if (competencies.length === 0) {
        // If no competencies, treat topic's objectives directly
        const objectives = Array.isArray(topicData.objectives)
          ? (topicData.objectives as Array<unknown>)
          : [];

        objectives.forEach((objective) => {
          const objectiveText = this.toDisplayString(objective, "objective");
          if (objectiveText) {
            // Objective header
            const objHeaderBg = new Graphics();
            objHeaderBg.rect(0, sectionY, contentWidth, headerHeight);
            objHeaderBg.fill({ color: 0xffffff, alpha: 1 });
            objHeaderBg.stroke({ color: 0xe0e0e0, width: 1 });
            topicSection.addChild(objHeaderBg);

            const objHeaderText = new Text({
              text: `OBJECTIVE: ${objectiveText.toUpperCase()}`,
              style: this.createBodyStyle(contentWidth - cellPadding * 2 - 48),
            });
            objHeaderText.x = cellPadding + 48;
            objHeaderText.y = sectionY + (headerHeight - objHeaderText.height) / 2;
            topicSection.addChild(objHeaderText);

            sectionY += headerHeight + groupPadding;

            // Tasks under objective
            const tasks = Array.isArray(topicData.tasks) ? (topicData.tasks as Array<unknown>) : [];
            tasks.forEach((task) => {
              const taskText = this.toDisplayString(task, "task");
              if (taskText) {
                // Task header
                const taskHeaderBg = new Graphics();
                taskHeaderBg.rect(0, sectionY, contentWidth, headerHeight);
                taskHeaderBg.fill({ color: 0xffffff, alpha: 1 });
                taskHeaderBg.stroke({ color: 0xe0e0e0, width: 1 });
                topicSection.addChild(taskHeaderBg);

                const taskHeaderText = new Text({
                  text: `TASK: ${taskText.toUpperCase()}`,
                  style: this.createBodyStyle(contentWidth - cellPadding * 2 - 96),
                });
                taskHeaderText.x = cellPadding + 96;
                taskHeaderText.y = sectionY + (headerHeight - taskHeaderText.height) / 2;
                topicSection.addChild(taskHeaderText);

                sectionY += headerHeight + groupPadding;

                // Instruction/Student/Teacher areas
                const areas = ["Instruction Area", "Student Area", "Teacher Area"];
                areas.forEach((areaName) => {
                  // Area row
                  const areaRowBg = new Graphics();
                  areaRowBg.rect(0, sectionY, contentWidth, rowHeight);
                  areaRowBg.fill({ color: 0xffffff, alpha: 1 });
                  areaRowBg.stroke({ color: 0xe0e0e0, width: 1 });
                  topicSection.addChild(areaRowBg);

                  const columnWidth = contentWidth / 3;
                  
                  // Primary column (area name)
                  const areaText = new Text({
                    text: `— ${areaName}`,
                    style: this.createBodyStyle(columnWidth - cellPadding * 2),
                  });
                  areaText.x = cellPadding + 120;
                  areaText.y = sectionY + (rowHeight - areaText.height) / 2;
                  topicSection.addChild(areaText);

                  // Method column
                  const methodText = new Text({
                    text: "—",
                    style: this.createSecondaryStyle(columnWidth - cellPadding * 2),
                  });
                  methodText.x = columnWidth + cellPadding;
                  methodText.y = sectionY + (rowHeight - methodText.height) / 2;
                  topicSection.addChild(methodText);

                  // Social Form column
                  const socialText = new Text({
                    text: "—",
                    style: this.createSecondaryStyle(columnWidth - cellPadding * 2),
                  });
                  socialText.x = columnWidth * 2 + cellPadding;
                  socialText.y = sectionY + (rowHeight - socialText.height) / 2;
                  topicSection.addChild(socialText);

                  sectionY += rowHeight;

                  // Empty row
                  sectionY += emptyRowHeight;
                });
              }
            });
          }
        });
      }

      topicSection.height = sectionY;
      container.addChild(topicSection);
      cursorY += sectionY + PageContainer.SECTION_SPACING;
    });

    return cursorY;
  }

  private getHeaderFieldLabel(key: string): string {
    return PageContainer.HEADER_FIELD_LABELS[key] ?? this.formatFieldLabel(key);
  }

  private getFooterFieldLabel(key: string): string {
    return PageContainer.FOOTER_FIELD_LABELS[key] ?? this.formatFieldLabel(key);
  }

  private formatFieldLabel(key: string): string {
    if (!key || typeof key !== "string") {
      return "";
    }
    return key
      .split(/[_-]/)
      .filter((part) => part.length)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private formatHeaderFieldValue(key: string, templateValue?: unknown): string {
    switch (key) {
      case "lesson_number":
        return (
          this.formatLessonNumberValue(templateValue) || this.formatLessonNumberValue(this.metadata.lessonNumber)
        );
      case "date": {
        const templateDate = this.toDisplayString(templateValue, "generic");
        if (templateDate) {
          return templateDate;
        }
        return this.metadata.date ? formatDate(this.metadata.date) : "";
      }
      case "lesson_title":
        return (
          this.toDisplayString(templateValue, "topic") ||
          this.normalizeString(this.metadata.lessonTitle, "topic") ||
          ""
        );
      case "module_title": {
        const templateModule = this.toDisplayString(templateValue, "module");
        if (templateModule) {
          return templateModule;
        }
        const metadataModule =
          (typeof this.metadata.moduleTitle === "string"
            ? this.normalizeString(this.metadata.moduleTitle, "module")
            : "") ||
          (typeof this.metadata.moduleNumber === "number" && this.metadata.moduleNumber > 0
            ? `Module ${this.metadata.moduleNumber}`
            : "");
        return metadataModule;
      }
      case "course_title":
        return this.toDisplayString(templateValue, "course") || this.normalizeString(this.metadata.courseName, "course");
      case "teacher_name":
        return this.toDisplayString(templateValue, "teacher") || this.getTeacherMetadataValue();
      default:
        return this.toDisplayString(templateValue, "generic");
    }
  }

  private formatFooterFieldValue(key: string, templateValue?: unknown): string {
    switch (key) {
      case "copyright":
        return this.resolveFooterCopyright(templateValue);
      case "teacher_name":
        return this.toDisplayString(templateValue, "teacher") || this.getTeacherMetadataValue();
      case "institution_name":
        const metadataInstitution =
          typeof this.metadata.institutionName === "string"
            ? this.normalizeString(this.metadata.institutionName, "institution")
            : "";
        return this.toDisplayString(templateValue, "institution") || metadataInstitution || "";
      case "page_number":
        return this.formatPageIndicator();
      default:
        return this.toDisplayString(templateValue, "generic");
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
        ? this.normalizeString(this.metadata.teacherName, "teacher")
        : "") ||
      (typeof this.metadata.instructor === "string"
        ? this.normalizeString(this.metadata.instructor, "teacher")
        : "") ||
      ""
    );
  }

  private resolveFooterCopyright(templateValue?: unknown): string {
    const provided =
      (typeof this.metadata.copyright === "string" ? this.normalizeString(this.metadata.copyright, "generic") : "") ||
      this.toDisplayString(templateValue, "generic");
    if (provided) {
      return provided;
    }

    const teacherValue = this.getTeacherMetadataValue();
    const institutionValue =
      typeof this.metadata.institutionName === "string"
        ? this.normalizeString(this.metadata.institutionName, "institution")
        : "";
    const courseValue = this.normalizeString(this.metadata.courseName, "course");
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

  private formatBlockTitle(block: LayoutNode): string {
    if (block.type === "placeholder") {
      return "";
    }

    const content = block.templateBlock?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      const normalized = this.normalizeString(content, "generic");
      if (normalized) {
        return normalized;
      }
    }

    if (block.type) {
      const normalizedType = block.type.toLowerCase();
      if (normalizedType === "content" || normalizedType === "container") {
        return "";
      }

      return block.type
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    return "";
  }

  private toDisplayString(value: unknown, kind: PlaceholderKind = "generic"): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return this.normalizeString(value, kind);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return this.normalizeString(String(value), kind);
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.toDisplayString(entry, kind))
        .filter((entry) => entry.length > 0)
        .join(", ");
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.name === "string") {
        return this.normalizeString(record.name, kind);
      }
      if (typeof record.title === "string") {
        return this.normalizeString(record.title, kind);
      }
      if (typeof record.label === "string") {
        return this.normalizeString(record.label, kind);
      }
      if (typeof record.value === "string") {
        return this.normalizeString(record.value, kind);
      }
    }

    return "";
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
