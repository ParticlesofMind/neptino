/**
 * Table Event Handler
 * Manages all table-related events and interactions
 */

import { Container, FederatedPointerEvent } from "pixi.js";
import { TableCell, PixiTableData } from "./TableTypes";
import { TableCellEditor } from "./TableCellEditor";
import { TableContextMenu } from "./TableContextMenu";

export class TableEventHandler {
    private cellEditor: TableCellEditor;
    private contextMenu: TableContextMenu;
    private activeTables: PixiTableData[];
    private clickTimer: number | null = null;
    private clickCount: number = 0;
    private lastClickTarget: any = null;

    constructor(cellEditor: TableCellEditor, contextMenu: TableContextMenu, activeTables: PixiTableData[]) {
        this.cellEditor = cellEditor;
        this.contextMenu = contextMenu;
        this.activeTables = activeTables;
    }

    setupCellEvents(cell: TableCell, container: Container): void {
        // Remove any existing listeners first
        cell.graphics.off('pointerup');
        cell.graphics.off('rightclick');

        // Set up cell interaction
        cell.graphics.eventMode = 'static';
        cell.graphics.cursor = 'pointer';

        // Double-click detection for editing
        cell.graphics.on('pointerup', (event: FederatedPointerEvent) => {
            // Only stop propagation if we're in table edit mode
            // This allows selection tool to receive pointer up events for ending drags
            if (this.cellEditor.isInEditMode()) {
                event.stopPropagation();
            }

            // Only handle left clicks for editing
            if (event.button !== 0) return;

            this.handleCellClick(cell, container);
        });

        // Right-click for context menu
        cell.graphics.on('rightclick', (event: FederatedPointerEvent) => {
            event.stopPropagation();
            
            this.contextMenu.showCellMenu(cell, event as any);
        });
        
    }    setupTableEvents(tableData: PixiTableData): void {
        // Set up table-level right-click for table menu
        tableData.container.eventMode = 'static';
        tableData.container.on('rightclick', (event: FederatedPointerEvent) => {
            // Only show table menu if not clicking on a cell
            const target = event.target;
            const isCell = tableData.cells.some(row => 
                row.some(cell => cell.graphics === target)
            );
            
            if (!isCell) {
                event.stopPropagation();
                this.contextMenu.showTableMenu(tableData, event as any);
            }
        });
    }

    private handleCellClick(cell: TableCell, container: Container): void {
        // Check if we're in table edit mode
        const isInEditMode = this.cellEditor.isInEditMode();

        // In edit mode, single click should start editing immediately
        if (isInEditMode) {
            this.cellEditor.startCellEditing(cell, container);
            return;
        }

        // Outside edit mode, require double-click to start editing
        this.handleDoubleClickDetection(cell, container);
    }

    private handleDoubleClickDetection(cell: TableCell, container: Container): void {
        // If clicking on different cell, reset count
        if (this.lastClickTarget !== cell.graphics) {
            this.clickCount = 0;
            this.lastClickTarget = cell.graphics;
        }
        
        // Clear existing timer
        if (this.clickTimer !== null) {
            clearTimeout(this.clickTimer);
        }
        
        this.clickCount++;
        
        if (this.clickCount === 1) {
            // First click - wait for potential second click
            this.clickTimer = window.setTimeout(() => {
                // Single click timeout - just select the cell visually
                this.handleSingleClick(cell);
                this.clickCount = 0;
            }, 300); // 300ms double-click window
        } else if (this.clickCount === 2) {
            // Double click detected
            if (this.clickTimer !== null) {
                clearTimeout(this.clickTimer);
            }
            this.clickTimer = null;
            this.clickCount = 0;
            
            this.cellEditor.startCellEditing(cell, container);
        }
    }

    private handleSingleClick(cell: TableCell): void {
        // For single clicks outside edit mode, just provide visual feedback
        this.highlightCellSelection(cell);
    }

    private highlightCellSelection(cell: TableCell): void {
        // Add a subtle selection highlight that's different from edit mode
        // First restore all cells to normal appearance in this table
        const tableData = this.activeTables.find(table =>
            table.cells.some(row => row.includes(cell))
        );

        if (!tableData) return;

        // Restore all cells to normal
        tableData.cells.forEach(row => {
            row.forEach(c => {
                if (!c.isEditing) {
                    this.restoreCellAppearance(c);
                }
            });
        });

        // Highlight the selected cell
        cell.graphics.clear();
        cell.graphics.rect(
            cell.bounds.x,
            cell.bounds.y,
            cell.bounds.width,
            cell.bounds.height
        );
        // Use a very light selection color
        cell.graphics.fill({ color: 0xF5F5F5 }); // Light gray background
        cell.graphics.stroke({
            width: 2,
            color: 0x90CAF9, // Light blue border
            alpha: 0.7
        });
    }

    private restoreCellAppearance(cell: TableCell): void {
        // Restore normal cell appearance (this should match the TableCreator logic)
        cell.graphics.clear();
        cell.graphics.rect(
            cell.bounds.x,
            cell.bounds.y,
            cell.bounds.width,
            cell.bounds.height
        );
        cell.graphics.fill({ color: 0xFFFFFF }); // White background
        cell.graphics.stroke({
            width: 1,
            color: 0xCCCCCC // Light gray border
        });
    }

    // Public methods
    public clearSelection(): void {
        // Clear any cell selections
        this.activeTables.forEach(tableData => {
            tableData.cells.forEach(row => {
                row.forEach(cell => {
                    if (!cell.isEditing) {
                        this.restoreCellAppearance(cell);
                    }
                });
            });
        });
    }

    public handleGlobalKeydown(event: KeyboardEvent): boolean {
        // Handle global keyboard shortcuts
        if (event.key === 'Escape') {
            this.cellEditor.forceExitEditMode();
            this.contextMenu.hideMenu();
            this.clearSelection();
            return true;
        }

        return false; // Let other handlers process the event
    }

    /**
     * Handle global mouse up events to ensure proper cleanup
     * This helps prevent tables from getting stuck in dragging state
     */
    public handleGlobalMouseUp(): void {
        // Clear any selection states
        this.clearSelection();
        
        // Ensure all table containers have proper cursor
        this.activeTables.forEach(tableData => {
            if (tableData.container) {
                tableData.container.cursor = 'default';
            }
        });
        
    }
}
