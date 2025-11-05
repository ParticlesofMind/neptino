/**
 * PageContainer - Individual page with header/body/footer layout
 * Handles rendering metadata in header/footer and managing body content
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { PageMetadata, LayoutNode } from "./PageMetadata";
import type { TableData } from "../layout/utils/TableRenderer";
import { formatDate, formatDuration } from "./PageMetadata";

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

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;

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

  constructor(metadata: PageMetadata, config: PageContainerConfig) {
    super();
    
    this.config = {
      width: config.width ?? BASE_WIDTH,
      height: config.height ?? BASE_HEIGHT,
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
    const { width = BASE_WIDTH, height = BASE_HEIGHT, margins } = this.config;
    
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
    this.headerBg.fill({ color: 0xffffff, alpha: this.config.showDebugBorders ? 0.05 : 0 });
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
    this.footerBg.fill({ color: 0xffffff, alpha: this.config.showDebugBorders ? 0.05 : 0 });
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
    const { width = BASE_WIDTH, margins } = this.config;
    const headerWidth = width;
    const headerHeight = margins.top;
    const topPadding = 14;

    const moduleNumber = typeof this.metadata.moduleNumber === "number" ? this.metadata.moduleNumber : null;
    const lessonTitleValue = this.normalizeString(this.metadata.lessonTitle, "topic") || "";
    const moduleTitleValue = this.normalizeString(
      typeof this.metadata.moduleTitle === "string" ? this.metadata.moduleTitle : null,
      "module",
    ) || "";
    const courseTitleValue = this.normalizeString(this.metadata.courseName, "course") || "";
    const institutionValue = this.normalizeString(this.metadata.institutionName, "institution") || "";
    const teacherValue =
      this.normalizeString(this.metadata.teacherName, "teacher") ||
      this.normalizeString(this.metadata.instructor, "teacher") ||
      "";
    const lessonNumberValue = `#${String(this.metadata.lessonNumber).padStart(2, "0")}`;

    const headerItems: Array<{ label: string; value: string }> = [];
    headerItems.push({ label: "Lesson Number", value: lessonNumberValue });
    if (lessonTitleValue) {
      headerItems.push({ label: "Lesson Title", value: lessonTitleValue });
    }
    if (moduleTitleValue && moduleNumber) {
      headerItems.push({ label: "Module Title", value: moduleTitleValue });
    }
    if (courseTitleValue) {
      headerItems.push({ label: "Course Title", value: courseTitleValue });
    }
    if (institutionValue) {
      headerItems.push({ label: "Institution", value: institutionValue });
    }
    if (teacherValue) {
      headerItems.push({ label: "Teacher", value: teacherValue });
    }

    const visibleItems = headerItems.filter((item) => item.value && item.value.trim().length);
    const itemCount = visibleItems.length || 1;
    const cellWidth = headerWidth / itemCount;
    let currentY = topPadding;
    let rowMaxHeight = 0;

    visibleItems.forEach((item, index) => {
      const centerX = index * cellWidth + cellWidth / 2;
      const label = new Text({
        text: item.label.toUpperCase(),
        style: this.createHeaderLabelStyle(),
      });
      label.anchor.set(0.5, 0);
      label.x = centerX;
      label.y = currentY;
      this.headerContainer.addChild(label);

      const value = new Text({
        text: item.value,
        style: this.createHeaderValueStyle(Math.max(1, cellWidth - 32)),
      });
      value.anchor.set(0.5, 0);
      value.x = centerX;
      value.y = currentY + label.height + 4;
      this.headerContainer.addChild(value);

      rowMaxHeight = Math.max(rowMaxHeight, label.height + 4 + value.height);
    });

    currentY += rowMaxHeight + 10;

    const metaParts: string[] = [];
    const formattedDate = this.metadata.date ? formatDate(this.metadata.date) : null;
    if (formattedDate) {
      metaParts.push(formattedDate);
    }
    if (this.metadata.method) {
      metaParts.push(this.metadata.method);
    }
    if (this.metadata.socialForm) {
      metaParts.push(this.metadata.socialForm);
    }

    const metaTextValue = metaParts.join(" · ");
    if (metaTextValue.length) {
      const metaText = new Text({
        text: metaTextValue,
        style: this.createHeaderMetaStyle(Math.max(1, headerWidth - 40)),
      });
      metaText.x = 20;
      metaText.y = Math.min(currentY, headerHeight - metaText.height - 10);
      this.headerContainer.addChild(metaText);
    }

    // Duration badge (top right corner)
    const badgePadding = 8;
    const durationText = new Text({
      text: formatDuration(this.metadata.duration),
      style: new TextStyle({
        fontSize: 10,
        fontWeight: "600",
        fill: 0xffffff,
      }),
    });

    const badgeWidth = durationText.width + badgePadding * 2;
    const badgeHeight = durationText.height + badgePadding;

    const badge = new Graphics();
    badge.roundRect(-badgeWidth, 0, badgeWidth, badgeHeight, 4);
    badge.fill({ color: 0x3b82f6, alpha: 1 });
    badge.x = headerWidth - 20;
    badge.y = topPadding;

    durationText.anchor.set(0.5);
    durationText.x = -badgeWidth / 2;
    durationText.y = badgeHeight / 2;
    badge.addChild(durationText);

    this.headerContainer.addChild(badge);
  }

  /**
   * Populate footer with metadata
   */
  private populateFooter(): void {
    const { width = BASE_WIDTH, margins } = this.config;
    const footerWidth = width - margins.left - margins.right;
    const footerHeight = margins.bottom;

    // Page number (center)
    const pageStyle = new TextStyle({
      fontSize: 14,
      fontWeight: "700",
      fill: 0x1e293b,
    });
    
    const pageText = new Text({
      text: `${this.metadata.pageNumber}`,
      style: pageStyle,
    });
    pageText.anchor.set(0.5);
    pageText.x = footerWidth / 2;
    pageText.y = footerHeight / 2;
    this.footerContainer.addChild(pageText);

    // Total pages indicator (below page number)
    const totalStyle = new TextStyle({
      fontSize: 10,
      fontWeight: "500",
      fill: 0x94a3b8,
    });
    
    const totalText = new Text({
      text: `of ${this.metadata.totalPages}`,
      style: totalStyle,
    });
    totalText.anchor.set(0.5, 0);
    totalText.x = footerWidth / 2;
    totalText.y = footerHeight / 2 + 14;
    this.footerContainer.addChild(totalText);

    // Instructor name (left side)
    if (this.metadata.instructor) {
      const instructorStyle = new TextStyle({
        fontSize: 11,
        fontWeight: "500",
        fill: 0x64748b,
      });
      
      const instructorText = new Text({
        text: this.metadata.instructor,
        style: instructorStyle,
      });
      instructorText.x = 20;
      instructorText.y = footerHeight / 2 - 6;
      this.footerContainer.addChild(instructorText);
    }

    // Topic (right side)
    if (this.metadata.topic) {
      const topicStyle = new TextStyle({
        fontSize: 11,
        fontWeight: "500",
        fill: 0x64748b,
      });
      
      const topicText = new Text({
        text: this.metadata.topic,
        style: topicStyle,
      });
      topicText.anchor.set(1, 0);
      topicText.x = footerWidth - 20;
      topicText.y = footerHeight / 2 - 6;
      this.footerContainer.addChild(topicText);
    }

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
    const { width = BASE_WIDTH, height = BASE_HEIGHT, margins } = this.config;
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

    if (table) {
      cursorY = this.renderTable(container, table, cursorY, contentWidth);
    }

    if (block.type === "program" && (!table || !tableHasContent)) {
      cursorY = this.renderProgramDetails(container, data.program, cursorY, contentWidth);
    }

    if (block.type === "content") {
      const topicNodes = Array.isArray(block.children) ? (block.children as LayoutNode[]) : [];
      cursorY = this.renderContentTopics(container, topicNodes, cursorY, contentWidth);
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

  private createHeaderMetaStyle(wordWrapWidth: number): TextStyle {
    return new TextStyle({
      fontSize: 11,
      fontWeight: "500",
      fill: 0x64748b,
      wordWrap: true,
      wordWrapWidth,
      lineHeight: 18,
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
