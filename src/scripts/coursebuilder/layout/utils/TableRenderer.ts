import { Container, Graphics, Text, type TextStyleOptions } from "pixi.js";

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableRow {
  cells: Record<string, string>;
  depth?: number;
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
  emptyMessage?: string;
}

interface RenderOptions {
  indent?: boolean;
  zebra?: boolean;
  compact?: boolean;
}

export class TableRenderer {
  /**
   * Render a complete table with header and rows
   */
  static renderTable(
    container: Container,
    table: TableData,
    width: number,
    options: RenderOptions = {},
  ): number {
    const columns = Array.isArray(table.columns) ? table.columns : [];
    if (!columns.length) {
      return this.renderEmptyState(container, table.emptyMessage || "No data available.", width);
    }

    const rows = Array.isArray(table.rows) ? [...table.rows] : [];
    if (!rows.length) {
      rows.push({
        cells: columns.reduce<Record<string, string>>((acc, col, index) => {
          acc[col.key] = index === 0 ? table.emptyMessage || "No data available." : "";
          return acc;
        }, {}),
      });
    }

    const columnWidths = this.calculateColumnWidths(width, columns.length, columns, rows);
    const headerStyle = this.createTextStyle(12, 0x1f2937, true);
    const cellStyle = this.createTextStyle(12, 0x374151);

    let currentY = 0;
    currentY += this.renderRow(
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
      currentY += this.renderRow(
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

  /**
   * Render a single table row
   */
  static renderRow(
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
      color: isHeader ? 0xf3f4f6 : options.zebra ? 0xf9fafb : 0xffffff,
      alpha: 1,
    });
    background.stroke({ color: 0xd1d5db, width: 1 });
    this.lockDisplayObject(background);
    container.addChild(background);

    let currentX = 0;
    columns.forEach((_, index) => {
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

  /**
   * Calculate column widths for a table
   */
  private static calculateColumnWidths(
    totalWidth: number,
    count: number,
    columns?: TableColumn[],
    rows?: TableRow[],
  ): number[] {
    if (count <= 0) return [totalWidth];
    if (columns && rows) {
      return this.calculateContentAwareColumnWidths(totalWidth, columns, rows);
    }
    const widths = new Array(count).fill(Math.max(totalWidth / count, 1));
    const consumed = widths.reduce((sum, val) => sum + val, 0);
    const remainder = totalWidth - consumed;
    widths[count - 1] += remainder;
    return widths;
  }

  /**
   * Calculate column widths based on content analysis
   */
  private static calculateContentAwareColumnWidths(
    totalWidth: number,
    columns: TableColumn[],
    rows: TableRow[],
  ): number[] {
    const columnCount = columns.length;
    if (columnCount === 0) return [totalWidth];

    const columnWeights: Record<string, number> = {
      competency: 0.15,
      topic: 0.20,
      objective: 0.25,
      task: 0.25,
      method: 0.10,
      social_form: 0.10,
      time: 0.08,
      resource: 0.20,
      type: 0.15,
      notes: 0.20,
      field: 0.20,
      value: 0.30,
    };

    const baseWidths = columns.map((column) => {
      const key = column.key.toLowerCase();
      const weight = columnWeights[key] || 0.20;
      return Math.max(totalWidth * weight, 60);
    });

    const contentAnalysis = columns.map((column, index) => {
      let maxLength = column.label.length;
      rows.forEach((row) => {
        const cellValue = row.cells?.[column.key] || "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      return { index, maxLength };
    });

    const adjustedWidths = baseWidths.map((baseWidth, index) => {
      const analysis = contentAnalysis[index];
      const contentFactor = Math.min(analysis.maxLength / 20, 2.0);
      return Math.max(baseWidth * contentFactor, 60);
    });

    const totalAdjusted = adjustedWidths.reduce((sum, width) => sum + width, 0);
    const scaleFactor = totalWidth / totalAdjusted;
    const finalWidths = adjustedWidths.map((width) => Math.max(width * scaleFactor, 60));

    const finalTotal = finalWidths.reduce((sum, width) => sum + width, 0);
    if (finalTotal > totalWidth) {
      const excess = finalTotal - totalWidth;
      const sortedIndices = finalWidths
        .map((width, index) => ({ width, index }))
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

  private static renderEmptyState(
    container: Container,
    message: string,
    width: number,
  ): number {
    const placeholder = this.createText(message, this.createTextStyle(13, 0x6b7280), 0, {
      wordWrapWidth: width - 16,
    });
    container.addChild(placeholder);
    return placeholder.height + 12;
  }

  private static createTextStyle(
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
      letterSpacing: 0.2,
      lineHeight: fontSize * 1.4,
    };
  }

  private static createText(
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

  private static lockDisplayObject(object: Container | Graphics | Text): void {
    const target = object as any;
    target.__locked = true;
    if ("eventMode" in target) {
      target.eventMode = "none";
    }
    if ("interactive" in target) {
      target.interactive = false;
    }
    if ("interactiveChildren" in target) {
      target.interactiveChildren = false;
    }
    try {
      target.cursor = "default";
    } catch {
      /* ignore */
    }
  }
}

