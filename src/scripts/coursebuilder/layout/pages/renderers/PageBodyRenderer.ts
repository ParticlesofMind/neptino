import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { LayoutNode, PageMetadata } from "../PageMetadata";
import type { TableData } from "../../utils/TableRenderer";
import { formatDate } from "../PageMetadata";
import {
  BODY_PADDING,
  BULLET_INDENT,
  LINE_SPACING,
  NESTED_INDENT,
  SECTION_SPACING,
} from "./PageRenderConstants";
import { formatBlockTitle, resolvePlaceholderKind, toDisplayString } from "./PageTextUtils";

interface PageBodyRendererOptions {
  container: Container;
  metadata: PageMetadata;
  bodyNode: LayoutNode | null;
  bodyWidth: number;
  bodyHeight: number;
  createHeadingStyle: (wrapWidth: number) => TextStyle;
  createSubheadingStyle: (wrapWidth: number) => TextStyle;
  createBodyStyle: (wrapWidth: number) => TextStyle;
  createSecondaryStyle: (wrapWidth: number) => TextStyle;
  createTableHeaderStyle: (wrapWidth: number) => TextStyle;
  createTableCellStyle: (wrapWidth: number) => TextStyle;
}

export class PageBodyRenderer {
  private readonly container: Container;
  private readonly metadata: PageMetadata;
  private readonly bodyNode: LayoutNode | null;
  private readonly bodyWidth: number;
  private readonly bodyHeight: number;
  private readonly createHeadingStyle: (wrapWidth: number) => TextStyle;
  private readonly createSubheadingStyle: (wrapWidth: number) => TextStyle;
  private readonly createBodyStyle: (wrapWidth: number) => TextStyle;
  private readonly createSecondaryStyle: (wrapWidth: number) => TextStyle;
  private readonly createTableHeaderStyle: (wrapWidth: number) => TextStyle;
  private readonly createTableCellStyle: (wrapWidth: number) => TextStyle;

  constructor(options: PageBodyRendererOptions) {
    this.container = options.container;
    this.metadata = options.metadata;
    this.bodyNode = options.bodyNode;
    this.bodyWidth = options.bodyWidth;
    this.bodyHeight = options.bodyHeight;
    this.createHeadingStyle = options.createHeadingStyle;
    this.createSubheadingStyle = options.createSubheadingStyle;
    this.createBodyStyle = options.createBodyStyle;
    this.createSecondaryStyle = options.createSecondaryStyle;
    this.createTableHeaderStyle = options.createTableHeaderStyle;
    this.createTableCellStyle = options.createTableCellStyle;
  }

  public render(): void {
    if (!this.bodyNode || !Array.isArray(this.bodyNode.children) || this.bodyNode.children.length === 0) {
      this.renderPlaceholder();
      return;
    }

    this.renderBlocks(this.bodyNode.children as LayoutNode[]);
  }

  private renderPlaceholder(): void {
    const placeholderStyle = new TextStyle({
      fontSize: 18,
      fontWeight: "400",
      fill: 0x94a3b8,
      align: "center",
      wordWrap: true,
      wordWrapWidth: Math.max(1, this.bodyWidth - BODY_PADDING * 2),
      lineHeight: 24,
    });

    const placeholder = new Text({
      text: `Page ${this.metadata.pageNumber} content will appear here once curriculum template data is available.`,
      style: placeholderStyle,
    });
    placeholder.anchor.set(0.5);
    placeholder.x = this.bodyWidth / 2;
    placeholder.y = this.bodyHeight / 2;
    this.container.addChild(placeholder);
  }

  private renderBlocks(blocks: LayoutNode[]): void {
    const contentWidth = Math.max(1, this.bodyWidth - BODY_PADDING * 2);
    let cursorY = BODY_PADDING;

    blocks.forEach((block, index) => {
      const blockBottom = this.renderLessonBlock(block, contentWidth, cursorY);
      cursorY = blockBottom + SECTION_SPACING;

      if (index < blocks.length - 1) {
        const separator = new Graphics();
        separator.moveTo(BODY_PADDING, cursorY - SECTION_SPACING / 2);
        separator.lineTo(this.bodyWidth - BODY_PADDING, cursorY - SECTION_SPACING / 2);
        separator.stroke({ color: 0xe2e8f0, width: 1 });
        this.container.addChild(separator);
      }
    });
  }

  private renderLessonBlock(block: LayoutNode, contentWidth: number, startY: number): number {
    const lessonContainer = new Container();
    lessonContainer.x = BODY_PADDING;
    lessonContainer.y = startY;
    lessonContainer.label = `lesson-block-${block.id ?? block.type ?? "unknown"}`;
    this.container.addChild(lessonContainer);

    const blockTitle = formatBlockTitle(block);
    let cursorY = 0;

    if (blockTitle) {
      const heading = new Text({
        text: blockTitle,
        style: this.createHeadingStyle(contentWidth),
      });
      heading.y = cursorY;
      lessonContainer.addChild(heading);
      cursorY += heading.height + LINE_SPACING;
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
        lessonContainer.addChild(summary);
        cursorY += summary.height + LINE_SPACING;
      }
    }

    const table = data.table as TableData | undefined;
    const tableHasContent = this.tableHasContent(table);

    if (table && block.type !== "content" && block.type !== "assignment") {
      cursorY = this.renderTable(lessonContainer, table, cursorY, contentWidth);
    }

    if (block.type === "program" && (!table || !tableHasContent)) {
      cursorY = this.renderProgramDetails(lessonContainer, data.program, cursorY, contentWidth);
    }

    if (block.type === "content" || block.type === "assignment") {
      const topicNodes = Array.isArray(block.children) ? (block.children as LayoutNode[]) : [];
      cursorY = this.renderHierarchicalContent(lessonContainer, topicNodes, cursorY, contentWidth, block.type);
    }

    const blockMessage = toDisplayString(data.message);
    if (blockMessage) {
      const message = new Text({
        text: blockMessage,
        style: this.createSecondaryStyle(contentWidth),
      });
      message.y = cursorY;
      lessonContainer.addChild(message);
      cursorY += message.height + LINE_SPACING;
    }

    return lessonContainer.y + cursorY;
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
        cursorY += empty.height + LINE_SPACING;
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
        cursorY += empty.height + LINE_SPACING;
      }
      return cursorY;
    }

    const columnWidth = (contentWidth - BODY_PADDING) / table.columns.length;
    const headerHeight = 36;
    const rowHeight = 40;
    const horizontalPadding = 12;

    const headerBg = new Graphics();
    headerBg.rect(0, cursorY, contentWidth, headerHeight);
    headerBg.fill({ color: 0xf1f5f9, alpha: 0.75 });
    container.addChild(headerBg);

    table.columns.forEach((column, index) => {
      const header = new Text({
        text: column.label.toUpperCase(),
        style: this.createTableHeaderStyle(columnWidth - horizontalPadding * 2),
      });
      header.x = index * columnWidth + horizontalPadding;
      header.y = cursorY + (headerHeight - header.height) / 2;
      container.addChild(header);
    });
    cursorY += headerHeight;

    if (!hasRows) {
      if (table.emptyMessage) {
        const empty = new Text({
          text: table.emptyMessage,
          style: this.createSecondaryStyle(contentWidth),
        });
        empty.y = cursorY + 12;
        container.addChild(empty);
        cursorY += empty.height + 12;
      }
      return cursorY;
    }

    table.rows.forEach((row, rowIndex) => {
      const rowBg = new Graphics();
      rowBg.rect(0, cursorY, contentWidth, rowHeight);
      rowBg.fill({ color: rowIndex % 2 === 0 ? 0xffffff : 0xf8fafc, alpha: 1 });
      container.addChild(rowBg);

      table.columns.forEach((column, index) => {
        const rowCells = row.cells ?? {};
        const placeholderKind = resolvePlaceholderKind(column.key);
        const rawValue = toDisplayString(rowCells[column.key], placeholderKind);
        const value = rawValue || "—";

        const cellText = new Text({
          text: value,
          style: this.createTableCellStyle(columnWidth - horizontalPadding * 2),
        });
        cellText.x = index * columnWidth + horizontalPadding;
        cellText.y = cursorY + (rowHeight - cellText.height) / 2;
        container.addChild(cellText);
      });

      cursorY += rowHeight;
    });

    return cursorY;
  }

  private tableHasContent(table: TableData | undefined): boolean {
    if (!table?.rows || !table.columns) {
      return false;
    }

    return table.rows.some((row) => {
      const rowCells = row.cells ?? {};
      return table.columns.some((column) => {
        const placeholderKind = resolvePlaceholderKind(column.key);
        return toDisplayString(rowCells[column.key], placeholderKind).length > 0;
      });
    });
  }

  private renderProgramDetails(
    container: Container,
    program: unknown,
    startY: number,
    contentWidth: number,
  ): number {
    if (!program || typeof program !== "object") {
      return startY;
    }

    const record = program as Record<string, unknown>;
    const details: string[] = [];

    const startDate = typeof record.startDate === "string" ? record.startDate : null;
    const endDate = typeof record.endDate === "string" ? record.endDate : null;
    const location = typeof record.location === "string" ? record.location : null;
    const instructor = typeof record.instructor === "string" ? record.instructor : null;

    if (startDate || endDate) {
      if (startDate && endDate) {
        const formatted = `${formatDate(startDate)} – ${formatDate(endDate)}`;
        details.push(`Schedule: ${formatted}`);
      } else if (startDate) {
        details.push(`Starts: ${formatDate(startDate)}`);
      } else if (endDate) {
        details.push(`Ends: ${formatDate(endDate)}`);
      }
    }

    if (location) {
      details.push(`Location: ${location}`);
    }

    if (instructor) {
      details.push(`Instructor: ${instructor}`);
    }

    if (!details.length) {
      return startY;
    }

    const summary = new Text({
      text: details.join(" • "),
      style: this.createSecondaryStyle(contentWidth),
    });
    summary.y = startY;
    container.addChild(summary);

    return startY + summary.height + LINE_SPACING;
  }

  private renderHierarchicalContent(
    container: Container,
    topicNodes: LayoutNode[],
    startY: number,
    contentWidth: number,
    blockType: string,
  ): number {
    if (!topicNodes.length) {
      const empty = new Text({
        text: `No ${blockType === "assignment" ? "tasks" : "content"} available`,
        style: this.createSecondaryStyle(contentWidth),
      });
      empty.y = startY;
      container.addChild(empty);
      return startY + empty.height + LINE_SPACING;
    }

    const bulletGutter = BULLET_INDENT;
    const nestedIndent = NESTED_INDENT;
    let cursorY = startY;

    topicNodes.forEach((topicNode) => {
      const topicContainer = new Container();
      topicContainer.x = 0;
      topicContainer.y = cursorY;
      container.addChild(topicContainer);

      const topicTitle = toDisplayString(topicNode?.data?.title ?? topicNode?.data?.name, "topic");
      if (topicTitle) {
        const topicText = new Text({
          text: topicTitle,
          style: this.createSubheadingStyle(contentWidth),
        });
        topicText.y = 0;
        topicContainer.addChild(topicText);
        cursorY += topicText.height + LINE_SPACING;
      }

      const objectives = Array.isArray(topicNode.children) ? (topicNode.children as LayoutNode[]) : [];
      if (!objectives.length) {
        const placeholder = new Text({
          text: "No objectives defined",
          style: this.createSecondaryStyle(contentWidth - nestedIndent),
        });
        placeholder.x = nestedIndent;
        placeholder.y = cursorY - topicContainer.y;
        topicContainer.addChild(placeholder);
        cursorY += placeholder.height + SECTION_SPACING;
        return;
      }

      objectives.forEach((objectiveNode, index) => {
        const objectiveContainer = new Container();
        objectiveContainer.x = bulletGutter;
        objectiveContainer.y = cursorY;
        container.addChild(objectiveContainer);

        const objectiveTitle = toDisplayString(
          objectiveNode?.data?.title ?? objectiveNode?.data?.name,
          "objective",
        );
        const objectiveText = new Text({
          text: `${index + 1}. ${objectiveTitle || `Objective ${index + 1}`}`,
          style: this.createBodyStyle(contentWidth - bulletGutter),
        });
        objectiveContainer.addChild(objectiveText);
        cursorY += objectiveText.height + LINE_SPACING;

        const tasks = Array.isArray(objectiveNode.children) ? (objectiveNode.children as LayoutNode[]) : [];
        if (!tasks.length) {
          const placeholder = new Text({
            text: "No tasks defined",
            style: this.createSecondaryStyle(contentWidth - nestedIndent),
          });
          placeholder.x = nestedIndent;
          placeholder.y = objectiveText.height + LINE_SPACING;
          objectiveContainer.addChild(placeholder);
          cursorY += placeholder.height + SECTION_SPACING;
          return;
        }

        tasks.forEach((taskNode, taskIndex) => {
          const taskText = toDisplayString(taskNode?.data?.title ?? taskNode?.data?.name, "task");
          const taskLabel = new Text({
            text: `• ${taskText || `Task ${taskIndex + 1}`}`,
            style: this.createSecondaryStyle(contentWidth - nestedIndent - BULLET_INDENT),
          });
          taskLabel.x = nestedIndent;
          taskLabel.y = cursorY;
          container.addChild(taskLabel);
          cursorY += taskLabel.height + LINE_SPACING;
        });
      });

      cursorY += SECTION_SPACING;
    });

    return cursorY;
  }
}
