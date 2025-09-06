/**
 * Table Creation Logic
 * Handles the creation and setup of PIXI table objects
 */

import { Graphics, Text, Container } from "pixi.js";
import { TableCell, TableSettings, PixiTableData } from "./TableTypes";

export class TableCreator {
    private settings: TableSettings;

    constructor(settings: TableSettings) {
        this.settings = settings;
    }

    createPixiTable(
        id: string,
        container: Container,
        x: number,
        y: number,
        width: number,
        height: number,
        onCellDoubleClick: (cell: TableCell, container: Container) => void,
        onCellRightClick: (event: any, tableId: string) => void,
        displayManager?: any
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
        (tableContainer as any).disableRotation = true;

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
                    cellWidth, cellHeight,
                    id, onCellDoubleClick, onCellRightClick
                );

                tableContainer.addChild(cell.graphics);
                tableContainer.addChild(cell.text);
                cellRow.push(cell);
            }

            cells.push(cellRow);
        }

        // Tag container for selection/type detection and metadata for live restyling
        (tableContainer as any).__toolType = 'tables';
        try {
            (tableContainer as any).__meta = {
                kind: 'tables',
                rows: this.settings.rows,
                columns: this.settings.columns,
                borderColor: this.settings.borderColor,
                backgroundColor: this.settings.backgroundColor,
                borderWidth: this.settings.borderWidth,
                cellPadding: this.settings.cellPadding,
                fontSize: this.settings.fontSize,
                fontColor: this.settings.fontColor
            };
        } catch {}

        // Add table container to main container
        container.addChild(tableContainer);

        // Register with display manager for selection tool integration
        if (displayManager) {
            displayManager.add(tableContainer);
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
        tableId: string,
        onCellDoubleClick: (cell: TableCell, container: Container) => void,
        onCellRightClick: (event: any, tableId: string) => void
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
            onCellRightClick(event, tableId);
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

        // Add double-click detection using pointerup events
        let clickCount = 0;
        let clickTimer: NodeJS.Timeout | null = null;
        let lastClickTime = 0;

        cellGraphics.on('pointerup', (event) => {
            event.stopPropagation();

            const currentTime = Date.now();
            const timeDiff = currentTime - lastClickTime;

            // Reset if too much time passed
            if (timeDiff > 500) {
                clickCount = 0;
            }

            clickCount++;
            lastClickTime = currentTime;

            if (clickCount === 1) {
                // Start timer for double-click detection
                if (clickTimer) {
                    clearTimeout(clickTimer);
                }
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 500);
            } else if (clickCount === 2) {
                // Double-click detected
                if (clickTimer) {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                }
                clickCount = 0;

                console.log(`🔷 TABLE: Double-click detected - entering edit mode`);

                // Find the container by traversing up the display tree
                let container = cellGraphics.parent;
                while (container && container.parent) {
                    if (container.parent && (container.parent as any).isStage) {
                        break;
                    }
                    container = container.parent;
                }

                if (container) {
                    // Start editing with a small delay to ensure click is processed
                    setTimeout(() => {
                        onCellDoubleClick(cell, container as Container);
                    }, 50);
                }
            }
        });

        return cell;
    }

    updateSettings(newSettings: Partial<TableSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }
}
