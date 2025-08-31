/**
 * Pure PIXI.js Table Tool
 * A complete rewrite using pure PIXI.js implementation with TextArea integration
 * Eliminates HTML hybrid approach for consistency with the text tool
 */

import { FederatedPointerEvent, Container, Graphics, Point, Rectangle } from "pixi.js";
import { BaseTool } from "../ToolInterface.js";
import { BoundaryUtils } from "../BoundaryUtils.js";
import { TextArea } from "../text/TextArea.js";
import { TextSettings, TextAreaConfig } from "../text/types.js";
import { PROFESSIONAL_COLORS } from "../SharedResources.js";

export interface PixiTableSettings {
  rows: number;
  columns: number;
  minCellWidth: number;
  minCellHeight: number;
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  cellPadding: number;
  fontSize: number;
  fontColor: string;
  fontFamily: string;
}

export interface PixiTableCell {
  textArea: TextArea;
  bounds: Rectangle;
  row: number;
  column: number;
  isActive: boolean;
}

export interface PixiTable {
  id: string;
  container: Container;
  cells: PixiTableCell[][];
  bounds: Rectangle;
  borderGraphics: Graphics;
  activeCell: PixiTableCell | null;
  settings: PixiTableSettings;
}

export class PixiTableTool extends BaseTool {
  private state: {
    mode: 'inactive' | 'creating' | 'editing';
    isDragging: boolean;
  } = {
    mode: 'inactive',
    isDragging: false
  };
  
  private dragPreview: Graphics | null = null;
  private startPoint: Point = new Point(0, 0);
  private currentPoint: Point = new Point(0, 0);
  private tables: PixiTable[] = [];
  private activeTable: PixiTable | null = null;
  private tableIdCounter: number = 0;
  
  declare protected settings: PixiTableSettings;

  constructor() {
    super("table", "crosshair");
    
    this.settings = {
      rows: 3,
      columns: 3,
      minCellWidth: 80,
      minCellHeight: 40,
      borderColor: "#000000",
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      cellPadding: 8,
      fontSize: 14,
      fontColor: "#000000",
      fontFamily: "Inter"
    };

    console.log('🔷 PixiTableTool initialized with pure PIXI.js implementation');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) {
      console.log('🔷 PixiTableTool: Ignoring pointer down - tool not active');
      return;
    }

    const localPoint = container.toLocal(event.global);
    const currentTime = Date.now();
    
    // Boundary enforcement
    const canvasBounds = this.manager.getCanvasBounds();
    const clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
    
    console.log(`🔷 PixiTableTool pointer down at (${clampedPoint.x.toFixed(1)}, ${clampedPoint.y.toFixed(1)})`);

    // Check if clicking on an existing table cell
    const clickedCell = this.findCellAtPoint(clampedPoint);
    if (clickedCell) {
      console.log('🔷 Clicked on table cell - activating for editing');
      this.activateCell(clickedCell);
      return;
    }

    // Start creating new table
    this.startTableCreation(clampedPoint, container);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    const localPoint = container.toLocal(event.global);

    if (this.state.isDragging && this.dragPreview) {
      const canvasBounds = this.manager.getCanvasBounds();
      const clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
      
      this.currentPoint.copyFrom(clampedPoint);
      this.updateDragPreview();
    }
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    if (this.state.isDragging) {
      this.finalizeTableCreation(container);
    }
  }

  onActivate(): void {
    super.onActivate();
    console.log('🔷 PixiTableTool activated');
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.cleanupDragState();
    this.deactivateCurrentCell();
    console.log('🔷 PixiTableTool deactivated');
  }

  private startTableCreation(localPoint: Point, container: Container): void {
    console.log(`🔷 Starting table creation at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    
    this.state = {
      mode: 'creating',
      isDragging: true
    };
    
    this.startPoint.copyFrom(localPoint);
    this.currentPoint.copyFrom(localPoint);
    
    // Create drag preview
    this.dragPreview = new Graphics();
    this.dragPreview.eventMode = 'none';
    this.dragPreview.alpha = 0.8;
    this.dragPreview.zIndex = 1000;
    container.addChild(this.dragPreview);
    
    this.updateDragPreview();
  }

  private updateDragPreview(): void {
    if (!this.dragPreview) return;

    const width = this.currentPoint.x - this.startPoint.x;
    const height = this.currentPoint.y - this.startPoint.y;
    
    this.dragPreview.clear();
    
    const rectX = Math.min(this.startPoint.x, this.currentPoint.x);
    const rectY = Math.min(this.startPoint.y, this.currentPoint.y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);
    
    if (rectWidth >= 10 && rectHeight >= 10) {
      // Draw table preview with grid
      this.drawTablePreview(rectX, rectY, rectWidth, rectHeight);
    }
  }

  private drawTablePreview(x: number, y: number, width: number, height: number): void {
    if (!this.dragPreview) return;

    const cellWidth = width / this.settings.columns;
    const cellHeight = height / this.settings.rows;

    // Draw outer border
    this.dragPreview
      .rect(x, y, width, height)
      .stroke({ 
        width: this.settings.borderWidth * 2, 
        color: this.hexToNumber(this.settings.borderColor),
        alpha: 0.8
      });

    // Draw grid lines
    for (let i = 1; i < this.settings.columns; i++) {
      const lineX = x + (i * cellWidth);
      this.dragPreview
        .moveTo(lineX, y)
        .lineTo(lineX, y + height)
        .stroke({ 
          width: this.settings.borderWidth, 
          color: this.hexToNumber(this.settings.borderColor),
          alpha: 0.6
        });
    }

    for (let i = 1; i < this.settings.rows; i++) {
      const lineY = y + (i * cellHeight);
      this.dragPreview
        .moveTo(x, lineY)
        .lineTo(x + width, lineY)
        .stroke({ 
          width: this.settings.borderWidth, 
          color: this.hexToNumber(this.settings.borderColor),
          alpha: 0.6
        });
    }
  }

  private finalizeTableCreation(container: Container): void {
    if (!this.dragPreview) return;

    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    const minTableSize = Math.max(this.settings.minCellWidth * 2, this.settings.minCellHeight * 2);
    
    if (width >= minTableSize && height >= minTableSize) {
      this.createTable(container);
      console.log('🔷 Table created successfully');
    } else {
      console.log('🔷 Table drag too small, no table created');
    }

    this.cleanupDragState();
  }

  private createTable(container: Container): void {
    const tableId = `pixi-table-${++this.tableIdCounter}`;
    
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);

    // Create table container
    const tableContainer = new Container();
    tableContainer.x = x;
    tableContainer.y = y;
    tableContainer.eventMode = 'static';
    
    // Mark as table for selection tool
    (tableContainer as any).isTable = true;
    (tableContainer as any).tableId = tableId;

    // Create border graphics
    const borderGraphics = new Graphics();
    tableContainer.addChild(borderGraphics);

    // Calculate cell dimensions
    const cellWidth = width / this.settings.columns;
    const cellHeight = height / this.settings.rows;

    // Create cells
    const cells: PixiTableCell[][] = [];
    
    for (let row = 0; row < this.settings.rows; row++) {
      const cellRow: PixiTableCell[] = [];
      
      for (let col = 0; col < this.settings.columns; col++) {
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;
        
        const cell = this.createTableCell(
          tableContainer,
          row,
          col,
          cellX,
          cellY,
          cellWidth,
          cellHeight
        );
        
        cellRow.push(cell);
      }
      
      cells.push(cellRow);
    }

    // Create table object
    const table: PixiTable = {
      id: tableId,
      container: tableContainer,
      cells,
      bounds: new Rectangle(x, y, width, height),
      borderGraphics,
      activeCell: null,
      settings: { ...this.settings }
    };

    // Draw table borders
    this.drawTableBorders(table);
    
    // Add to container and register
    container.addChild(tableContainer);
    this.tables.push(table);
    
    console.log(`🔷 Created table ${tableId} with ${this.settings.rows}×${this.settings.columns} cells`);
  }

  private createTableCell(
    parent: Container,
    row: number,
    col: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): PixiTableCell {
    // Create TextArea for this cell
    const textSettings: TextSettings = {
      fontFamily: this.settings.fontFamily,
      fontSize: this.settings.fontSize,
      color: this.settings.fontColor,
      borderColor: "transparent", // Cell borders handled by table
      borderWidth: 0,
      backgroundColor: this.hexToNumber(this.settings.backgroundColor)
    };

    const config: TextAreaConfig = {
      bounds: {
        x: x + this.settings.cellPadding,
        y: y + this.settings.cellPadding,
        width: width - (this.settings.cellPadding * 2),
        height: height - (this.settings.cellPadding * 2)
      },
      text: `R${row + 1}C${col + 1}`, // Placeholder text
      settings: textSettings
    };

    const textArea = new TextArea(config, parent);
    
    // Create cell object
    const cell: PixiTableCell = {
      textArea,
      bounds: new Rectangle(x, y, width, height),
      row,
      column: col,
      isActive: false
    };

    return cell;
  }

  private drawTableBorders(table: PixiTable): void {
    const { borderGraphics, bounds, settings } = table;
    
    borderGraphics.clear();
    
    const width = bounds.width;
    const height = bounds.height;
    const cellWidth = width / settings.columns;
    const cellHeight = height / settings.rows;

    // Draw outer border
    borderGraphics
      .rect(0, 0, width, height)
      .stroke({
        width: settings.borderWidth,
        color: this.hexToNumber(settings.borderColor)
      });

    // Draw vertical lines
    for (let i = 1; i < settings.columns; i++) {
      const lineX = i * cellWidth;
      borderGraphics
        .moveTo(lineX, 0)
        .lineTo(lineX, height)
        .stroke({
          width: settings.borderWidth,
          color: this.hexToNumber(settings.borderColor)
        });
    }

    // Draw horizontal lines
    for (let i = 1; i < settings.rows; i++) {
      const lineY = i * cellHeight;
      borderGraphics
        .moveTo(0, lineY)
        .lineTo(width, lineY)
        .stroke({
          width: settings.borderWidth,
          color: this.hexToNumber(settings.borderColor)
        });
    }
  }

  private findCellAtPoint(point: Point): PixiTableCell | null {
    for (const table of this.tables) {
      // Check if point is within table bounds
      const tableGlobalBounds = new Rectangle(
        table.container.x,
        table.container.y,
        table.bounds.width,
        table.bounds.height
      );
      
      if (tableGlobalBounds.contains(point.x, point.y)) {
        // Find specific cell
        const localX = point.x - table.container.x;
        const localY = point.y - table.container.y;
        
        for (const row of table.cells) {
          for (const cell of row) {
            if (cell.bounds.contains(localX, localY)) {
              return cell;
            }
          }
        }
      }
    }
    
    return null;
  }

  private activateCell(cell: PixiTableCell): void {
    // Deactivate previous cell
    this.deactivateCurrentCell();
    
    // Activate new cell
    cell.isActive = true;
    cell.textArea.setActive(true);
    
    // Clear placeholder text if it matches the default pattern
    const placeholderPattern = /^R\d+C\d+$/;
    if (placeholderPattern.test(cell.textArea.text)) {
      cell.textArea.updateText('');
    }
    
    this.state.mode = 'editing';
    
    console.log(`🔷 Activated cell R${cell.row + 1}C${cell.column + 1}`);
  }

  private deactivateCurrentCell(): void {
    // Find and deactivate active cell
    for (const table of this.tables) {
      for (const row of table.cells) {
        for (const cell of row) {
          if (cell.isActive) {
            cell.isActive = false;
            cell.textArea.setActive(false);
            
            // Restore placeholder if empty
            if (cell.textArea.text.trim() === '') {
              cell.textArea.updateText(`R${cell.row + 1}C${cell.column + 1}`);
            }
          }
        }
      }
    }
    
    this.state.mode = 'inactive';
  }

  private cleanupDragState(): void {
    if (this.dragPreview) {
      this.dragPreview.parent?.removeChild(this.dragPreview);
      this.dragPreview.destroy();
      this.dragPreview = null;
    }
    
    this.state = {
      mode: 'inactive',
      isDragging: false
    };
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }

  // Public API methods
  public getTables(): PixiTable[] {
    return [...this.tables];
  }

  public removeTable(tableId: string): void {
    const index = this.tables.findIndex(t => t.id === tableId);
    if (index !== -1) {
      const table = this.tables[index];
      
      // Destroy all text areas
      table.cells.forEach(row => {
        row.forEach(cell => {
          cell.textArea.destroy();
        });
      });
      
      // Remove from display
      table.container.parent?.removeChild(table.container);
      table.container.destroy();
      
      // Remove from array
      this.tables.splice(index, 1);
      
      console.log(`🔷 Table ${tableId} removed`);
    }
  }

  public updateSettings(settings: Partial<PixiTableSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public destroy(): void {
    this.cleanupDragState();
    
    // Destroy all tables
    this.tables.forEach(table => {
      this.removeTable(table.id);
    });
    
    this.tables = [];
    
    console.log('🔷 PixiTableTool destroyed');
  }
}
