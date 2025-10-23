/**
 * TemplateLayoutManager
 *
 * Renders header/body/footer template regions on the PIXI canvas using the
 * persisted layout data generated in the backend (Yoga configuration).
 *
 * The manager keeps a minimal opinionated view layer: each section receives a
 * neutral background and the relevant text content derived from template
 * blocks, lesson data, and course metadata.
 */

import "@pixi/layout";
import { Container, Graphics, Text, type TextStyleOptions } from "pixi.js";
import type { Layout } from "@pixi/layout";
import { canvasMarginManager } from "./CanvasMarginManager";
import { canvasDimensionManager } from "../utils/CanvasDimensionManager";

type YogaUnit = "px" | "percent";

interface YogaDimension {
  unit: YogaUnit;
  value: number;
}

interface YogaPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface YogaNodeConfig {
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  width?: YogaDimension;
  height?: YogaDimension;
  flexGrow?: number;
  flexShrink?: number;
  padding?: YogaPadding;
  gap?: number;
}

interface TemplateBlockPayload {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  content: string;
}

interface LayoutNode {
  id: string;
  role?: "header" | "body" | "footer" | "template-block" | "placeholder";
  type: string;
  order?: number;
  yoga?: YogaNodeConfig;
  templateBlock?: TemplateBlockPayload;
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
  template?: {
    id: string;
    slug: string;
    name: string;
    type: string;
    scope: string;
    description: string | null;
  } | null;
  lesson: CanvasLessonSummary;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit?: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  layout: LayoutNode;
}

interface RenderContext {
  teacherName?: string | null;
  courseTitle?: string | null;
  courseCode?: string | null;
  pageNumber?: number;
  generatedAt?: string;
}

interface SectionReferences {
  container: Container;
  background: Graphics;
  content: Container;
}

interface TableColumn {
  key: string;
  label: string;
}

interface TableRow {
  cells: Record<string, string>;
  depth?: number;
}

interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
  emptyMessage?: string;
}

export class TemplateLayoutManager {
  private rootContainer: Container | null = null;
  private sections: Record<"header" | "body" | "footer", SectionReferences> | null =
    null;
  private layoutBounds = {
    width: 1200,
    height: 1800,
  };
  private margins = {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
  };

  /**
   * Initialize the layout manager on the provided PIXI container.
   */
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
    this.sections = {
      header: this.createSectionContainer("header"),
      body: this.createSectionContainer("body"),
      footer: this.createSectionContainer("footer"),
    };

    this.rootContainer.addChild(
      this.sections.header.container,
      this.sections.body.container,
      this.sections.footer.container,
    );

    this.updateSectionMetrics();
  }

  /**
   * Render a complete canvas layout using persisted canvas data and runtime context.
   */
  public renderCanvas(canvasData: CanvasDataPayload, context: RenderContext): void {
    if (!this.sections) return;

    this.applyCanvasDimensions(canvasData);
    this.applyMargins(canvasData.margins);
    this.updateSectionMetrics();

    const headerNode = this.findSectionNode(canvasData.layout, "header");
    const bodyNode = this.findSectionNode(canvasData.layout, "body");
    const footerNode = this.findSectionNode(canvasData.layout, "footer");

    this.renderHeader(headerNode, canvasData, context);
    this.renderBody(bodyNode, canvasData);
    this.renderFooter(footerNode, canvasData, context);
  }

  /**
   * Update section sizing when margins or canvas dimensions change.
   */
  public updateBlockSizes(): void {
    this.updateSectionMetrics();
  }

  /**
   * Handle canvas resize events (recompute bounds & redraw backgrounds).
   */
  public handleCanvasResize(): void {
    this.layoutBounds = canvasDimensionManager.getCurrentDimensions();
    this.updateSectionMetrics();
  }

  /**
   * Expose section containers for debugging or external access.
   */
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

  /**
   * Provide structured debug information for diagnostics.
   */
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

  /**
   * Destroy all PIXI resources.
   */
  public destroy(): void {
    if (!this.sections) return;

    Object.values(this.sections).forEach((section) => {
      section.container.off("layout");
      section.container.destroy({ children: true });
    });

    this.rootContainer?.destroy({ children: true });
    this.rootContainer = null;
    this.sections = null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Section creation & metrics
  // ────────────────────────────────────────────────────────────────────────────

  private createSectionContainer(section: "header" | "body" | "footer"): SectionReferences {
    const container = new Container({
      layout: {
        width: "100%",
        flexDirection: "column",
        justifyContent: section === "body" ? "flex-start" : "center",
        alignItems: "stretch",
      },
    });
    this.lockDisplayObject(container);
    container.sortableChildren = false;

    const background = new Graphics();
    background.label = `${section}-background`;
    this.lockDisplayObject(background);

    const content = new Container();
    content.label = `${section}-content`;
    this.lockDisplayObject(content);

    container.addChild(background, content);

    container.on("layout", (layout: Layout) => {
      this.redrawSectionBackground(section, layout.computedLayout.width, layout.computedLayout.height);
      this.positionContent(section, layout.computedLayout.width, layout.computedLayout.height);
    });

    return { container, background, content };
  }

  private updateSectionMetrics(): void {
    if (!this.sections) return;

    const { width, height } = this.layoutBounds;
    const headerHeight = this.margins.top;
    const footerHeight = this.margins.bottom;
    const bodyHeight = Math.max(height - headerHeight - footerHeight, 0);

    this.sections.header.container.layout = {
      width,
      height: headerHeight,
      flexGrow: 0,
      flexShrink: 0,
    };

    this.sections.body.container.layout = {
      width,
      height: bodyHeight,
      flexGrow: 1,
      flexShrink: 1,
    };

    this.sections.footer.container.layout = {
      width,
      height: footerHeight,
      flexGrow: 0,
      flexShrink: 0,
    };
  }

  private redrawSectionBackground(section: "header" | "body" | "footer", width: number, height: number): void {
    if (!this.sections) return;
    const ref = this.sections[section];
    ref.background.clear();
    ref.background.rect(0, 0, Math.max(width, 0), Math.max(height, 0)).fill({
      color: 0xffffff,
      alpha: 1,
    });
    ref.background.stroke({ color: 0xe5e7eb, alpha: section === "body" ? 0.6 : 0.4, width: section === "body" ? 2 : 1 });
  }

  private positionContent(section: "header" | "body" | "footer", width: number, height: number): void {
    if (!this.sections) return;
    const ref = this.sections[section];
    const horizontal = this.margins.left;
    ref.content.position.set(horizontal, 0);
  }

  private describeSection(section: "header" | "body" | "footer"): Record<string, unknown> {
    if (!this.sections) {
      return { exists: false };
    }

    const ref = this.sections[section];
    const bounds = ref.background.getBounds();
    return {
      exists: true,
      childCount: ref.content.children.length,
      bounds: {
        width: bounds.width,
        height: bounds.height,
      },
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Rendering helpers
  // ────────────────────────────────────────────────────────────────────────────

  private renderHeader(
    headerNode: LayoutNode | null,
    canvasData: CanvasDataPayload,
    context: RenderContext,
  ): void {
    if (!this.sections) return;

    const section = this.sections.header;
    this.clearContent(section.content);

    const width = this.getSectionContentWidth();

    // Check template configuration for header display options
    const templateBlock = headerNode?.templateBlock;
    const blockConfig = templateBlock?.config as Record<string, unknown> | undefined;
    
    // Build metadata string for single row display
    const metadataParts: string[] = [];

    // Only show lesson title if template config allows it (showTitle is the actual config field)
    if (blockConfig?.showTitle !== false) {
      const lessonTitle =
        canvasData.lesson?.title ||
        (canvasData.lesson?.number
          ? `Lesson ${canvasData.lesson.number}`
          : "Lesson");
      metadataParts.push(lessonTitle);
    }

    // Only show module if template config allows it (showSubtitle is the actual config field)
    if (blockConfig?.showSubtitle !== false && canvasData.lesson?.moduleNumber !== undefined && canvasData.lesson?.moduleNumber !== null) {
      metadataParts.push(`Module ${canvasData.lesson.moduleNumber}`);
    }

    // Only show template block content if it exists and is not an HTML template string
    if (templateBlock?.content && !this.isHtmlTemplateString(templateBlock.content)) {
      metadataParts.push(templateBlock.content);
    }

    // Create single row text display
    const metadataText = metadataParts.join(" • ");
    const headerText = this.createText(
      metadataText,
      this.createTextStyle(14, 0x374151, false),
      8,
      { wordWrapWidth: width - 16 }
    );

    this.lockDisplayObject(headerText);
    section.content.addChild(headerText);
  }

  private renderBody(bodyNode: LayoutNode | null, canvasData: CanvasDataPayload): void {
    if (!this.sections) return;

    const section = this.sections.body;
    this.clearContent(section.content);

    if (!bodyNode || !Array.isArray(bodyNode.children) || !bodyNode.children.length) {
      const empty = this.createText(
        "No body blocks configured for this template yet.",
        this.createTextStyle(16, 0x6b7280, false, true),
        20,
        { wordWrapWidth: this.getSectionContentWidth() },
      );
      section.content.addChild(empty);
      return;
    }

    const bodyWidth = this.getSectionContentWidth();
    let cursorY = 12;

    bodyNode.children.forEach((child, index) => {
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
    canvasData: CanvasDataPayload,
    context: RenderContext,
  ): void {
    if (!this.sections) return;

    const section = this.sections.footer;
    this.clearContent(section.content);

    const width = this.getSectionContentWidth();

    // Check template configuration for footer display options
    const templateBlock = footerNode?.templateBlock;
    const blockConfig = templateBlock?.config as Record<string, unknown> | undefined;
    
    const entries: Array<{ label: string; value: string }> = [];

    // Only show credits if template config allows it (showCredits is the actual config field)
    if (blockConfig?.showCredits !== false) {
      entries.push({
        label: "Credits",
        value: "Generated by Neptino",
      });
    }

    // Only show date if template config allows it (showDate is the actual config field)
    if (blockConfig?.showDate !== false) {
      entries.push({
        label: "Created",
        value: context.generatedAt || new Date().toLocaleDateString(),
      });
    }

    // Only show contact if template config allows it (showContact is the actual config field)
    if (blockConfig?.showContact !== false && context.teacherName) {
      entries.push({
        label: "Contact",
        value: context.teacherName,
      });
    }

    // Only show template block content if it exists and is not an HTML template string
    if (templateBlock?.content && !this.isHtmlTemplateString(templateBlock.content)) {
      entries.push({
        label: "Notes",
        value: String(templateBlock.content),
      });
    }

    // Only render table if there are entries and template config allows it
    if (entries.length > 0) {
      const tableContainer = new Container();
      tableContainer.y = 8;
      this.lockDisplayObject(tableContainer);
      section.content.addChild(tableContainer);
      this.renderKeyValueTable(tableContainer, entries, width);
    }
  }

  private renderBodyBlock(
    container: Container,
    node: LayoutNode,
    canvasData: CanvasDataPayload,
    bodyWidth: number,
  ): number {
    this.lockDisplayObject(container);
    const titleStyle = this.createTextStyle(18, 0x1f2937, true);
    const textStyle = this.createTextStyle(14, 0x4b5563);
    let cursorY = 0;

    // Use template block configuration to determine what to show
    const templateBlock = node.templateBlock;
    const blockConfig = templateBlock?.config as Record<string, unknown> | undefined;
    
    // Only show title if template config allows it (this is a general display option)
    const showTitle = blockConfig?.showTitle !== false;
    if (showTitle) {
      const blockTitle = this.createText(
        this.resolveBlockTitle(templateBlock?.type ?? node.type),
        titleStyle,
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(blockTitle);
      cursorY += blockTitle.height + 12;
    }

    // Show structure summary for program blocks if configured
    if (templateBlock?.type === "program") {
      const structure = (node.data as Record<string, unknown> | undefined)?.structure as
        | { topics?: number; objectives?: number; tasks?: number }
        | undefined;
      if (structure && blockConfig?.showSummary !== false) {
        const summary = this.createText(
          `${structure.topics ?? 0} topics • ${structure.objectives ?? 0} objectives • ${structure.tasks ?? 0} tasks`,
          this.createTextStyle(12, 0x4b5563),
          cursorY,
          { wordWrapWidth: bodyWidth },
        );
        container.addChild(summary);
        cursorY += summary.height + 8;
      }
    }

    // Render table data if available and template config allows it
    const tableData = this.extractTableData(node);
    if (tableData && blockConfig?.showTable !== false) {
      const tableContainer = new Container();
      this.lockDisplayObject(tableContainer);
      tableContainer.y = cursorY;
      container.addChild(tableContainer);

      // Ensure table uses full available width for better space utilization
      const tableWidth = Math.max(bodyWidth, 1000);
      const tableHeight = this.renderTableBlock(tableContainer, tableData, tableWidth, {
        indent: true,
        zebra: true,
      });
      cursorY += tableHeight;
      return cursorY;
    }

    // Show content if template config allows it and it's not an HTML template string
    const content = templateBlock?.content?.trim();
    if (content && !this.isHtmlTemplateString(content) && blockConfig?.showContent !== false) {
      const contentText = this.createText(
        content,
        textStyle,
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(contentText);
      cursorY += contentText.height;
    } else if (!content && blockConfig?.showContent !== false) {
      // Show fallback message only if content is expected but missing
      const fallbackText = this.createText(
        "Content coming soon.",
        textStyle,
        cursorY,
        { wordWrapWidth: bodyWidth },
      );
      container.addChild(fallbackText);
      cursorY += fallbackText.height;
    }

    return cursorY;
  }

  /**
   * Check if content is an HTML template string (like {{header}})
   */
  private isHtmlTemplateString(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    
    // Check for HTML template strings like {{header}}, {{footer}}, etc.
    const htmlTemplatePattern = /<[^>]*>\s*\{\{[^}]+\}\}\s*<\/[^>]*>/;
    const templateVariablePattern = /^\s*\{\{[^}]+\}\}\s*$/;
    
    return htmlTemplatePattern.test(content) || templateVariablePattern.test(content);
  }

  private extractTableData(node: LayoutNode | null): TableData | null {
    if (!node || typeof node !== "object") {
      return null;
    }

    const candidate = (node as Record<string, unknown>).data as
      | Record<string, unknown>
      | undefined;
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const table = candidate.table as TableData | undefined;
    if (!table || !Array.isArray(table.columns) || !table.columns.length) {
      return null;
    }
    return table;
  }

  private renderTableBlock(
    container: Container,
    table: TableData,
    width: number,
    options: { zebra?: boolean; indent?: boolean; compact?: boolean } = {},
  ): number {
    const columns = Array.isArray(table.columns) ? table.columns : [];
    if (!columns.length) {
      const placeholder = this.createText(
        table.emptyMessage || "No data available.",
        this.createTextStyle(13, 0x6b7280),
        0,
        { wordWrapWidth: width - 16 },
      );
      container.addChild(placeholder);
      return placeholder.height + 12;
    }

    const rows = Array.isArray(table.rows) ? [...table.rows] : [];
    if (!rows.length) {
      rows.push({
        cells: columns.reduce<Record<string, string>>((acc, col, index) => {
          acc[col.key] =
            index === 0 ? table.emptyMessage || "No data available." : "";
          return acc;
        }, {}),
      });
    }

    const columnWidths = this.calculateColumnWidths(width, columns.length, columns, rows);
    const headerStyle = this.createTextStyle(12, 0x1f2937, true);
    const cellStyle = this.createTextStyle(12, 0x374151);

    let currentY = 0;
    currentY += this.drawTableRow(
      container,
      columns,
      columnWidths,
      headerStyle,
      columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.key] = column.label;
        return acc;
      }, {}),
      currentY,
      true,
      {
        indent: false,
        zebra: false,
        compact: options.compact ?? false,
      },
    );

    rows.forEach((row, rowIndex) => {
      currentY += this.drawTableRow(
        container,
        columns,
        columnWidths,
        cellStyle,
        row.cells ?? {},
        currentY,
        false,
        {
          depth: row.depth ?? 0,
          indent: options.indent ?? false,
          zebra: options.zebra !== false && rowIndex % 2 === 1,
          compact: options.compact ?? false,
        },
      );
    });

    return currentY;
  }

  private renderKeyValueTable(
    target: Container,
    rows: Array<{ label: string; value: string }>,
    width: number,
  ): void {
    this.lockDisplayObject(target);
    const table: TableData = {
      columns: [
        { key: "label", label: "Field" },
        { key: "value", label: "Value" },
      ],
      rows: rows.map((row) => ({
        cells: {
          label: row.label,
          value: row.value || "—",
        },
      })),
      emptyMessage: "No data provided.",
    };

    // Use full width for header and footer tables
    const tableWidth = Math.max(width, 1000); // Ensure minimum width for better appearance
    
    this.renderTableBlock(target, table, tableWidth, {
      zebra: false,
      indent: false,
      compact: true,
    });
  }

  private calculateColumnWidths(totalWidth: number, count: number, columns?: TableColumn[], rows?: TableRow[]): number[] {
    if (count <= 0) {
      return [totalWidth];
    }

    // If we have column and row data, use content-aware sizing
    if (columns && rows) {
      return this.calculateContentAwareColumnWidths(totalWidth, columns, rows);
    }

    // Fallback to equal distribution for backward compatibility
    const widths = new Array(count).fill(Math.max(totalWidth / count, 1));
    const consumed = widths.reduce((sum, val) => sum + val, 0);
    const remainder = totalWidth - consumed;
    widths[count - 1] += remainder;
    return widths;
  }

  /**
   * Calculate column widths based on content analysis for better space utilization
   */
  private calculateContentAwareColumnWidths(totalWidth: number, columns: TableColumn[], rows: TableRow[]): number[] {
    const columnCount = columns.length;
    if (columnCount === 0) return [totalWidth];

    // Define column type weights for better proportions
    const columnWeights: Record<string, number> = {
      'competency': 0.15,    // Narrow - usually short labels
      'topic': 0.20,        // Medium - topic names
      'objective': 0.25,    // Wide - longer objective descriptions
      'task': 0.25,         // Wide - task descriptions can be long
      'method': 0.10,       // Narrow - usually short method names
      'social_form': 0.10,  // Narrow - usually short social form names
      'time': 0.08,         // Very narrow - time values
      'resource': 0.20,    // Medium - resource names
      'type': 0.15,         // Medium - type names
      'notes': 0.20,        // Medium - notes can vary
      'field': 0.20,        // Medium - field names
      'value': 0.30,        // Wide - values can be long (URLs, descriptions)
    };

    // Calculate base widths using column type weights
    const baseWidths = columns.map(column => {
      const key = column.key.toLowerCase();
      const weight = columnWeights[key] || 0.20; // Default weight
      return Math.max(totalWidth * weight, 60); // Minimum 60px per column
    });

    // Analyze actual content length to adjust widths
    const contentAnalysis = columns.map((column, index) => {
      let maxLength = column.label.length;
      
      // Check all cell values for this column
      rows.forEach(row => {
        const cellValue = row.cells?.[column.key] || '';
        maxLength = Math.max(maxLength, cellValue.length);
      });

      return {
        index,
        maxLength,
        avgLength: rows.reduce((sum, row) => {
          const cellValue = row.cells?.[column.key] || '';
          return sum + cellValue.length;
        }, column.label.length) / (rows.length + 1)
      };
    });

    // Adjust widths based on content analysis
    const adjustedWidths = baseWidths.map((baseWidth, index) => {
      const analysis = contentAnalysis[index];
      const contentFactor = Math.min(analysis.maxLength / 20, 2.0); // Cap at 2x
      return Math.max(baseWidth * contentFactor, 60);
    });

    // Normalize to total width
    const totalAdjusted = adjustedWidths.reduce((sum, width) => sum + width, 0);
    const scaleFactor = totalWidth / totalAdjusted;
    
    const finalWidths = adjustedWidths.map(width => Math.max(width * scaleFactor, 60));
    
    // Ensure we don't exceed total width
    const finalTotal = finalWidths.reduce((sum, width) => sum + width, 0);
    if (finalTotal > totalWidth) {
      const excess = finalTotal - totalWidth;
      // Reduce largest columns first
      const sortedIndices = finalWidths.map((width, index) => ({ width, index }))
        .sort((a, b) => b.width - a.width);
      
      let remainingExcess = excess;
      for (const { index } of sortedIndices) {
        if (remainingExcess <= 0) break;
        const reduction = Math.min(remainingExcess, finalWidths[index] - 60);
        finalWidths[index] -= reduction;
        remainingExcess -= reduction;
      }
    }

    return finalWidths;
  }

  private drawTableRow(
    container: Container,
    columns: TableColumn[],
    columnWidths: number[],
    baseStyle: TextStyleOptions,
    cells: Record<string, string>,
    startY: number,
    isHeader: boolean,
    options: { depth?: number; indent?: boolean; zebra?: boolean; compact?: boolean },
  ): number {
    const totalWidth = columnWidths.reduce((sum, value) => sum + value, 0);
    const baseRowHeight = isHeader ? 38 : options.compact ? 30 : 34;

    const texts = columns.map((column, index) => {
      const value = isHeader ? column.label : (cells[column.key] ?? "");
      return this.createText(value, baseStyle, 0, {
        wordWrapWidth: Math.max(columnWidths[index] - 24, 32),
      });
    });

    let rowHeight = baseRowHeight;
    texts.forEach((text) => {
      rowHeight = Math.max(rowHeight, text.height + 18);
    });

    const background = new Graphics();
    background.rect(0, startY, totalWidth, rowHeight).fill({
      color: isHeader
        ? 0xf3f4f6
        : options.zebra
        ? 0xf9fafb
        : 0xffffff,
      alpha: 1,
    });
    background.stroke({ color: 0xd1d5db, width: 1 });
    this.lockDisplayObject(background);
    container.addChild(background);

    let currentX = 0;
    columns.forEach((column, index) => {
      if (index > 0) {
        const divider = new Graphics();
        divider.moveTo(currentX, startY);
        divider.lineTo(currentX, startY + rowHeight);
        divider.stroke({ color: 0xd1d5db, width: 1 });
        this.lockDisplayObject(divider);
        container.addChild(divider);
      }

      const text = texts[index];
      const indentOffset =
        index === 0 && options.indent
          ? Math.max(0, (options.depth ?? 0)) * 18
          : 0;

      text.x = currentX + 12 + indentOffset;
      text.y = startY + (rowHeight - text.height) / 2;
      container.addChild(text);

      currentX += columnWidths[index];
    });

    return rowHeight;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Data helpers
  // ────────────────────────────────────────────────────────────────────────────

  private findSectionNode(layout: LayoutNode, role: "header" | "body" | "footer"): LayoutNode | null {
    if (layout.role === role) {
      return layout;
    }
    if (!layout.children) {
      return null;
    }
    for (const child of layout.children) {
      const found = this.findSectionNode(child, role);
      if (found) return found;
    }
    return null;
  }

  private applyCanvasDimensions(canvasData: CanvasDataPayload): void {
    if (!canvasData?.dimensions) {
      return;
    }
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
      case "program":
        return "Lesson Program";
      case "resources":
        return "Resources & Materials";
      case "content":
        return "Lesson Content";
      case "assignment":
        return "Assignments";
      case "scoring":
        return "Scoring";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  private getSectionContentWidth(): number {
    return Math.max(this.layoutBounds.width - this.margins.left - this.margins.right, 0);
  }

  private createTextStyle(
    fontSize: number,
    color: number,
    bold = false,
    italic = false,
  ): TextStyleOptions {
    return {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize,
      fill: color,
      fontWeight: bold ? "600" : "400",
      fontStyle: italic ? "italic" : "normal",
    };
  }

  private createText(
    content: string,
    style: TextStyleOptions,
    y: number,
    options?: { x?: number; wordWrapWidth?: number; align?: "left" | "center" | "right" },
  ): Text {
    const textStyle: TextStyleOptions = { ...style };
    if (options?.wordWrapWidth !== undefined) {
      textStyle.wordWrap = true;
      textStyle.wordWrapWidth = Math.max(options.wordWrapWidth, 24);
      textStyle.breakWords = true;
    }
    if (options?.align) {
      textStyle.align = options.align;
    }

    const text = new Text({
      text: content,
      style: textStyle,
    });
    text.y = y;
    if (options?.x !== undefined) {
      text.x = options.x;
    }
    this.lockDisplayObject(text);
    return text;
  }

  private lockDisplayObject(
    object: Container | Graphics | Text,
    options: { lockChildren?: boolean } = {},
  ): void {
    const target = object as any;
    target.__locked = true;
    if ("eventMode" in target) {
      target.eventMode = "none";
    }
    if ("interactive" in target) {
      target.interactive = false;
    }
    if ("interactiveChildren" in target) {
      if (options.lockChildren !== false) {
        target.interactiveChildren = false;
      }
    }
    try {
      target.cursor = "default";
    } catch {
      /* ignore */
    }
  }

  private clearContent(container: Container): void {
    const removed = container.removeChildren();
    removed.forEach((child) => {
      if (child && typeof (child as any).destroy === "function") {
        try {
          (child as any).destroy({ children: true });
        } catch {
          (child as any).destroy?.();
        }
      }
    });
  }
}

export type { CanvasDataPayload, RenderContext as TemplateRenderContext };
