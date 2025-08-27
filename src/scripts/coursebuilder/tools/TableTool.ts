/**
 * PIXI Table Tool - Pure PIXI.js Implementation
 * Creates tables using only PIXI.js Graphics and Text objects for perfect selection tool integration
 */

import { FederatedPointerEvent, Container, Point, Graphics, Text } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import { BoundaryUtils } from "./BoundaryUtils";

interface TableSettings {
    rows: number;
    columns: number;
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
    cellPadding: number;
    fontSize: number;
    fontColor: string;
}

interface TableCell {
    graphics: Graphics;
    text: Text;
    row: number;
    column: number;
    isEditing: boolean;
    bounds: { x: number; y: number; width: number; height: number };
}

interface PixiTableData {
    container: Graphics;
    cells: TableCell[][];
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    cellWidth: number;
    cellHeight: number;
    activeCell: TableCell | null;
}

export class TableTool extends BaseTool {
    private isDrawing: boolean = false;
    private startPoint: Point = new Point(0, 0);
    private currentPoint: Point = new Point(0, 0);
    private previewElement: HTMLDivElement | null = null;
    private activeTables: PixiTableData[] = [];
    private tableIdCounter: number = 0;
    private textInput: HTMLInputElement | null = null;
    private editingCell: TableCell | null = null;

    constructor() {
        super("tables", "crosshair");
        this.settings = {
            rows: 3,
            columns: 3,
            borderColor: "#000000",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            cellPadding: 8,
            fontSize: 14,
            fontColor: "#000000",
        };
        
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
    }

    onPointerDown(event: FederatedPointerEvent, container: Container): void {
        // Check if we're clicking on an existing table cell for editing
        const clickedCell = this.getTableCellAtPoint(event, container);
        if (clickedCell) {
            console.log(`🔷 TABLE: Clicked on cell R${clickedCell.row + 1}C${clickedCell.column + 1}`);
            this.startCellEditing(clickedCell, container);
            return;
        }

        if (this.isDrawing) return;

        this.isDrawing = true;

        // Use local coordinates relative to the container
        const localPoint = container.toLocal(event.global);

        // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
        const canvasBounds = this.manager.getCanvasBounds();
        if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
            console.log(`🔷 TABLE: 🚫 Click in margin area rejected - point (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) outside content area`);
            this.isDrawing = false;
            return;
        }

        // Point is in content area, safe to proceed
        const clampedStartPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);

        this.startPoint.copyFrom(clampedStartPoint);
        this.currentPoint.copyFrom(clampedStartPoint);

        // Get canvas element for positioning
        const canvasElement = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
        if (!canvasElement) {
            console.error("🔷 TABLE: Canvas element not found");
            this.isDrawing = false;
            return;
        }

        const canvasRect = canvasElement.getBoundingClientRect();
        
        // Convert local coordinates to screen coordinates for preview
        const globalPoint = container.toGlobal(clampedStartPoint);
        const screenX = globalPoint.x + canvasRect.left;
        const screenY = globalPoint.y + canvasRect.top;

        // Create preview element
        this.createPreviewElement(screenX, screenY);

        console.log(`🔷 TABLE: Started drawing table at (${Math.round(screenX)}, ${Math.round(screenY)})`);
    }

    onPointerMove(event: FederatedPointerEvent, container: Container): void {
        if (!this.isDrawing || !this.previewElement) return;

        // Use local coordinates relative to the container
        const localPoint = container.toLocal(event.global);

        // 🎯 BOUNDARY ENFORCEMENT: Clamp current point to canvas bounds
        const canvasBounds = this.manager.getCanvasBounds();
        const clampedCurrentPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);

        this.currentPoint.copyFrom(clampedCurrentPoint);

        this.updatePreview();
    }

    onPointerUp(_event: FederatedPointerEvent, container: Container): void {
        if (!this.isDrawing || !this.previewElement) return;

        const width = Math.abs(this.currentPoint.x - this.startPoint.x);
        const height = Math.abs(this.currentPoint.y - this.startPoint.y);
        
        // Minimum table size
        if (width < 100 || height < 50) {
            // Remove small table and reset
            this.removePreview();
            console.log(`🔷 TABLE: Table too small (${Math.round(width)}x${Math.round(height)}), removed`);
        } else {
            // Finalize table
            this.finalizeTable(container);
            console.log(`🔷 TABLE: Finished creating table ${this.settings.rows}x${this.settings.columns} - Size: ${Math.round(width)}x${Math.round(height)}`);
        }

        this.isDrawing = false;
    }

    private createPreviewElement(x: number, y: number): void {
        this.previewElement = document.createElement("div");
        this.previewElement.className = "table-preview";
        this.previewElement.style.position = "absolute";
        this.previewElement.style.left = `${x}px`;
        this.previewElement.style.top = `${y}px`;
        this.previewElement.style.border = `${this.settings.borderWidth}px solid ${this.settings.borderColor}`;
        this.previewElement.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
        this.previewElement.style.pointerEvents = "none";
        this.previewElement.style.zIndex = "1000";
        
        document.body.appendChild(this.previewElement);
    }

    private updatePreview(): void {
        if (!this.previewElement) return;

        const canvasElement = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
        if (!canvasElement) return;

        const canvasRect = canvasElement.getBoundingClientRect();
        
        // Calculate dimensions and position
        const width = Math.abs(this.currentPoint.x - this.startPoint.x);
        const height = Math.abs(this.currentPoint.y - this.startPoint.y);
        
        const left = Math.min(this.startPoint.x, this.currentPoint.x);
        const top = Math.min(this.startPoint.y, this.currentPoint.y);
        
        // Convert to screen coordinates
        const screenX = left + canvasRect.left;
        const screenY = top + canvasRect.top;

        this.previewElement.style.left = `${screenX}px`;
        this.previewElement.style.top = `${screenY}px`;
        this.previewElement.style.width = `${width}px`;
        this.previewElement.style.height = `${height}px`;
    }

    private removePreview(): void {
        if (this.previewElement && this.previewElement.parentNode) {
            this.previewElement.parentNode.removeChild(this.previewElement);
            this.previewElement = null;
        }
    }

    private finalizeTable(container: Container): void {
        if (!this.previewElement) return;
        
        // Calculate final dimensions and position
        const width = Math.abs(this.currentPoint.x - this.startPoint.x);
        const height = Math.abs(this.currentPoint.y - this.startPoint.y);
        
        const left = Math.min(this.startPoint.x, this.currentPoint.x);
        const top = Math.min(this.startPoint.y, this.currentPoint.y);

        // Create the PIXI table
        const tableId = `table-${++this.tableIdCounter}`;
        const pixiTable = this.createPixiTable(tableId, container, left, top, width, height);
        
        this.activeTables.push(pixiTable);

        // Remove preview
        this.removePreview();

        console.log(`🔷 TABLE: Created PIXI table with ID: ${tableId}`);
    }

    private createPixiTable(
        id: string, 
        container: Container, 
        x: number, 
        y: number, 
        width: number, 
        height: number
    ): PixiTableData {
        // Create main table container
        const tableContainer = new Graphics();
        tableContainer.x = x;
        tableContainer.y = y;
        tableContainer.eventMode = "static";
        tableContainer.cursor = "default";
        
        // Store table metadata
        (tableContainer as any).isTable = true;
        (tableContainer as any).tableId = id;
        (tableContainer as any).disableRotation = true; // Disable rotation for tables

        // Calculate cell dimensions
        const cellWidth = width / this.settings.columns;
        const cellHeight = height / this.settings.rows;

        // Create cells array
        const cells: TableCell[][] = [];
        
        // Create table structure
        for (let row = 0; row < this.settings.rows; row++) {
            const cellRow: TableCell[] = [];
            
            for (let col = 0; col < this.settings.columns; col++) {
                const cell = this.createTableCell(
                    row, col, 
                    col * cellWidth, row * cellHeight, 
                    cellWidth, cellHeight, id
                );
                
                tableContainer.addChild(cell.graphics);
                tableContainer.addChild(cell.text);
                cellRow.push(cell);
            }
            
            cells.push(cellRow);
        }

        // Add table container to main container
        container.addChild(tableContainer);

        // Register with display manager for selection tool integration
        if (this.displayManager) {
            this.displayManager.add(tableContainer);
        }

        return {
            container: tableContainer,
            cells: cells,
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            cellWidth: cellWidth,
            cellHeight: cellHeight,
            activeCell: null
        };
    }

    private createTableCell(
        row: number, 
        col: number, 
        x: number, 
        y: number, 
        width: number, 
        height: number,
        tableId: string
    ): TableCell {
        // Create cell background graphics
        const cellGraphics = new Graphics();
        cellGraphics.rect(x, y, width, height);
        cellGraphics.fill({ color: parseInt(this.settings.backgroundColor.replace('#', '0x')) });
        cellGraphics.stroke({ 
            width: this.settings.borderWidth, 
            color: parseInt(this.settings.borderColor.replace('#', '0x')) 
        });
        cellGraphics.eventMode = "static";
        cellGraphics.cursor = "text";

        // Add right-click context menu for table operations
        cellGraphics.on('rightclick', (event) => {
            event.stopPropagation();
            this.showTableContextMenu(event, tableId);
        });

        // Create cell text
        const cellText = new Text({
            text: `R${row + 1}C${col + 1}`,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: this.settings.fontSize,
                fill: this.settings.fontColor,
                wordWrap: true,
                wordWrapWidth: width - (this.settings.cellPadding * 2),
            }
        });

        // Position text within cell with padding
        cellText.x = x + this.settings.cellPadding;
        cellText.y = y + this.settings.cellPadding;

        // Store cell metadata
        const cell: TableCell = {
            graphics: cellGraphics,
            text: cellText,
            row: row,
            column: col,
            isEditing: false,
            bounds: { x, y, width, height }
        };

        // Store references for easier access
        (cellGraphics as any).tableCell = cell;
        (cellText as any).tableCell = cell;

        // Add double-click event for editing
        cellGraphics.on('pointerdown', (event) => {
            event.stopPropagation();
            console.log(`🔷 TABLE: Cell clicked - R${row + 1}C${col + 1}`);
        });

        return cell;
    }

    private getTableCellAtPoint(event: FederatedPointerEvent, container: Container): TableCell | null {
        const localPoint = container.toLocal(event.global);
        
        for (const tableData of this.activeTables) {
            // Check if point is within table bounds
            if (localPoint.x >= tableData.x && localPoint.x <= tableData.x + tableData.width &&
                localPoint.y >= tableData.y && localPoint.y <= tableData.y + tableData.height) {
                
                // Find specific cell
                for (const row of tableData.cells) {
                    for (const cell of row) {
                        const cellX = tableData.x + cell.bounds.x;
                        const cellY = tableData.y + cell.bounds.y;
                        
                        if (localPoint.x >= cellX && localPoint.x <= cellX + cell.bounds.width &&
                            localPoint.y >= cellY && localPoint.y <= cellY + cell.bounds.height) {
                            return cell;
                        }
                    }
                }
            }
        }
        
        return null;
    }

    private startCellEditing(cell: TableCell, container: Container): void {
        // End any existing edit
        this.endCellEditing();
        
        this.editingCell = cell;
        cell.isEditing = true;

        // Get the table that contains this cell
        const tableData = this.activeTables.find(table => 
            table.cells.some(row => row.includes(cell))
        );

        if (!tableData) {
            console.error('🔷 TABLE: Could not find table data for cell');
            return;
        }

        // Get screen coordinates for the text input
        const canvasElement = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
        if (!canvasElement) return;

        const canvasRect = canvasElement.getBoundingClientRect();
        
        // Calculate global position of the cell
        const cellGlobalX = tableData.x + cell.bounds.x;
        const cellGlobalY = tableData.y + cell.bounds.y;
        const globalPos = container.toGlobal({ x: cellGlobalX, y: cellGlobalY });
        
        console.log(`🔷 TABLE: Starting edit for cell at (${cellGlobalX}, ${cellGlobalY}) -> screen (${globalPos.x + canvasRect.left}, ${globalPos.y + canvasRect.top})`);

        // Create invisible text input overlay
        this.textInput = document.createElement("input");
        this.textInput.type = "text";
        this.textInput.value = cell.text.text === `R${cell.row + 1}C${cell.column + 1}` ? "" : cell.text.text;
        
        // Style the input to match the cell
        this.textInput.style.position = "absolute";
        this.textInput.style.left = `${globalPos.x + canvasRect.left + this.settings.cellPadding}px`;
        this.textInput.style.top = `${globalPos.y + canvasRect.top + this.settings.cellPadding}px`;
        this.textInput.style.width = `${cell.bounds.width - (this.settings.cellPadding * 2)}px`;
        this.textInput.style.height = `${cell.bounds.height - (this.settings.cellPadding * 2)}px`;
        this.textInput.style.fontSize = `${this.settings.fontSize}px`;
        this.textInput.style.fontFamily = 'Arial, sans-serif';
        this.textInput.style.color = this.settings.fontColor;
        this.textInput.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        this.textInput.style.border = "2px solid #2196f3";
        this.textInput.style.outline = "none";
        this.textInput.style.zIndex = "10000";
        this.textInput.style.padding = "2px";
        this.textInput.style.borderRadius = "2px";

        // Event handlers
        this.textInput.addEventListener("blur", () => this.endCellEditing());
        this.textInput.addEventListener("keydown", (e) => {
            e.stopPropagation(); // Prevent canvas shortcuts
            
            if (e.key === "Enter") {
                e.preventDefault();
                this.endCellEditing();
            } else if (e.key === "Tab") {
                e.preventDefault();
                this.endCellEditing();
                this.navigateToNextCell(cell, !e.shiftKey);
            } else if (e.key === "Escape") {
                e.preventDefault();
                this.cancelCellEditing();
            }
        });

        // Add to DOM and focus
        document.body.appendChild(this.textInput);
        this.textInput.focus();
        this.textInput.select();

        // Add global click listener
        setTimeout(() => {
            document.addEventListener("click", this.handleGlobalClick);
        }, 10);

        console.log(`🔷 TABLE: Started editing cell R${cell.row + 1}C${cell.column + 1} - Current text: "${cell.text.text}"`);
    }

    private endCellEditing(): void {
        if (!this.editingCell || !this.textInput) return;

        const cell = this.editingCell;
        const newText = this.textInput.value.trim();
        
        // Update cell text
        cell.text.text = newText || `R${cell.row + 1}C${cell.column + 1}`;
        cell.isEditing = false;

        // Clean up input
        this.cleanupTextInput();

        console.log(`🔷 TABLE: Ended editing cell R${cell.row + 1}C${cell.column + 1} - Text: "${cell.text.text}"`);
        
        this.editingCell = null;
    }

    private cancelCellEditing(): void {
        if (!this.editingCell) return;

        this.editingCell.isEditing = false;
        this.cleanupTextInput();
        this.editingCell = null;
    }

    private cleanupTextInput(): void {
        if (this.textInput) {
            if (this.textInput.parentNode) {
                this.textInput.parentNode.removeChild(this.textInput);
            }
            this.textInput = null;
        }
        document.removeEventListener("click", this.handleGlobalClick);
    }

    private handleGlobalClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!this.textInput || target === this.textInput) return;
        
        // Check if clicking on canvas (allow table interaction)
        const canvas = document.querySelector("#canvas-container canvas");
        if (target === canvas) return;
        
        // Otherwise end editing
        this.endCellEditing();
    }

    private navigateToNextCell(currentCell: TableCell, forward: boolean): void {
        // Find current table and container
        const tableData = this.activeTables.find(table => 
            table.cells.some(row => row.includes(currentCell))
        );
        
        if (!tableData || !tableData.container.parent) return;

        const container = tableData.container.parent;
        const { rows, columns } = this.settings;
        const currentIndex = currentCell.row * columns + currentCell.column;
        
        let nextIndex: number;
        if (forward) {
            nextIndex = (currentIndex + 1) % (rows * columns);
        } else {
            nextIndex = (currentIndex - 1 + rows * columns) % (rows * columns);
        }
        
        const nextRow = Math.floor(nextIndex / columns);
        const nextCol = nextIndex % columns;
        
        if (nextRow < rows && nextCol < columns) {
            const nextCell = tableData.cells[nextRow][nextCol];
            // Start editing next cell
            setTimeout(() => {
                this.startCellEditing(nextCell, container);
            }, 10);
        }
    }

    private showTableContextMenu(event: any, tableId: string): void {
        // Simple context menu implementation
        const existingMenu = document.querySelector(".table-context-menu");
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement("div");
        menu.className = "table-context-menu";
        menu.style.position = "absolute";
        menu.style.left = `${event.global.x}px`;
        menu.style.top = `${event.global.y}px`;
        menu.style.backgroundColor = "white";
        menu.style.border = "1px solid #ccc";
        menu.style.borderRadius = "4px";
        menu.style.padding = "8px 0";
        menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        menu.style.zIndex = "10000";
        menu.style.fontSize = "14px";
        menu.style.fontFamily = "Arial, sans-serif";

        const deleteOption = document.createElement("div");
        deleteOption.textContent = "Delete Table";
        deleteOption.style.padding = "8px 16px";
        deleteOption.style.cursor = "pointer";
        deleteOption.addEventListener("mouseenter", () => {
            deleteOption.style.backgroundColor = "#f0f0f0";
        });
        deleteOption.addEventListener("mouseleave", () => {
            deleteOption.style.backgroundColor = "transparent";
        });
        deleteOption.addEventListener("click", () => {
            this.deleteTable(tableId);
            menu.remove();
        });

        menu.appendChild(deleteOption);
        document.body.appendChild(menu);

        // Remove menu when clicking elsewhere
        const removeMenu = (clickEvent: MouseEvent) => {
            if (!menu.contains(clickEvent.target as Node)) {
                menu.remove();
                document.removeEventListener("click", removeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener("click", removeMenu);
        }, 0);
    }

    private deleteTable(tableId: string): void {
        const tableIndex = this.activeTables.findIndex(t => t.id === tableId);
        if (tableIndex === -1) return;

        const tableData = this.activeTables[tableIndex];
        
        // End any editing
        if (this.editingCell && this.isTableCellInTable(this.editingCell, tableData)) {
            this.endCellEditing();
        }
        
        // Remove from container
        if (tableData.container.parent) {
            tableData.container.parent.removeChild(tableData.container);
        }
        
        // Destroy PIXI objects
        tableData.container.destroy({ children: true });

        this.activeTables.splice(tableIndex, 1);
        console.log(`🔷 TABLE: Deleted PIXI table ${tableId}`);
    }

    private isTableCellInTable(cell: TableCell, tableData: PixiTableData): boolean {
        return tableData.cells.some(row => row.includes(cell));
    }

    updateSettings(settings: Partial<TableSettings>): void {
        this.settings = { ...this.settings, ...settings };
        console.log(`🔷 TABLE: Settings updated`, this.settings);
        
        // Apply settings to existing tables
        this.activeTables.forEach(tableData => {
            tableData.cells.forEach(row => {
                row.forEach(cell => {
                    // Update cell graphics
                    cell.graphics.clear();
                    cell.graphics.rect(
                        cell.bounds.x, 
                        cell.bounds.y, 
                        cell.bounds.width, 
                        cell.bounds.height
                    );
                    cell.graphics.fill({ color: parseInt(this.settings.backgroundColor.replace('#', '0x')) });
                    cell.graphics.stroke({ 
                        width: this.settings.borderWidth, 
                        color: parseInt(this.settings.borderColor.replace('#', '0x')) 
                    });

                    // Update text style
                    cell.text.style = {
                        fontFamily: 'Arial, sans-serif',
                        fontSize: this.settings.fontSize,
                        fill: this.settings.fontColor,
                        wordWrap: true,
                        wordWrapWidth: cell.bounds.width - (this.settings.cellPadding * 2),
                    };
                });
            });
        });
    }

    onActivate(): void {
        super.onActivate();
        console.log("🔷 TABLE: PIXI table tool activated");
    }

    onDeactivate(): void {
        super.onDeactivate();
        
        // Clean up any preview or editing
        this.removePreview();
        this.endCellEditing();
        
        this.isDrawing = false;
        console.log("🔷 TABLE: PIXI table tool deactivated");
    }

    // Public methods for external access
    public getActiveTables(): PixiTableData[] {
        return this.activeTables;
    }

    public deleteAllTables(): void {
        this.activeTables.forEach(tableData => {
            // End any editing
            if (this.editingCell && this.isTableCellInTable(this.editingCell, tableData)) {
                this.endCellEditing();
            }
            
            // Remove and destroy PIXI objects
            if (tableData.container.parent) {
                tableData.container.parent.removeChild(tableData.container);
            }
            tableData.container.destroy({ children: true });
        });
        this.activeTables = [];
        console.log("🔷 TABLE: All PIXI tables deleted");
    }
    
    // Method for selection tool integration
    public getTableByPixiObject(pixiObject: any): PixiTableData | null {
        return this.activeTables.find(table => table.container === pixiObject) || null;
    }
}
