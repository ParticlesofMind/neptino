/**
 * Table Cell Editor
 * Handles cell editing functionality including text input, navigation, and mode management
 */

import { Container, Graphics } from "pixi.js";
import { TableCell, TableSettings, PixiTableData } from "./TableTypes";
import { TextArea } from "../text/TextArea.js";
import { TextInputHandler } from "../text/TextInputHandler.js";
import { TextAreaConfig, TextSettings } from "../text/types.js";
import { historyManager } from "../../canvas/HistoryManager.js";

export class TableCellEditor {
    private settings: TableSettings;
    private textArea: TextArea | null = null;
    private inputHandler: TextInputHandler | null = null;
    private editingCell: TableCell | null = null;
    private tableInEditMode: PixiTableData | null = null;
    private activeTables: PixiTableData[];
    private originalCellText: string = "";

    constructor(settings: TableSettings, activeTables: PixiTableData[]) {
        this.settings = settings;
        this.activeTables = activeTables;
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
    }

    startCellEditing(cell: TableCell, container: Container): void {
        // End any existing edit
        this.endCellEditing();

        this.editingCell = cell;
        cell.isEditing = true;
        
        // Store original text for history tracking
        this.originalCellText = cell.text.text;

        // Highlight the cell being edited
        this.highlightEditingCell(cell);

        // Get the table that contains this cell
        const tableData = this.activeTables.find(table =>
            table.cells.some(row => row.includes(cell))
        );

        if (!tableData) {
            console.error('🔷 TABLE: Could not find table data for cell');
            return;
        }

        // Set this table as the one in edit mode
        this.tableInEditMode = tableData;
        this.highlightTableInEditMode(tableData);

        // Create text editing area using PIXI TextArea
        const cellGlobalX = tableData.x + cell.bounds.x;
        const cellGlobalY = tableData.y + cell.bounds.y;
        
        // Prepare text area bounds relative to cell position
        const textAreaBounds = {
            x: cellGlobalX + this.settings.cellPadding,
            y: cellGlobalY + this.settings.cellPadding,
            width: cell.bounds.width - (this.settings.cellPadding * 2),
            height: cell.bounds.height - (this.settings.cellPadding * 2)
        };

        // Set up text settings based on table settings
        const textSettings: TextSettings = {
            fontSize: this.settings.fontSize,
            color: this.settings.fontColor,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#2196f3',
            borderWidth: 2,
            fontFamily: 'Arial, sans-serif'
        };

        // Get text content - empty if it's a placeholder
        const isPlaceholder = cell.text.text === `R${cell.row + 1}C${cell.column + 1}`;
        const textContent = isPlaceholder ? "" : cell.text.text;

        const textAreaConfig: TextAreaConfig = {
            bounds: textAreaBounds,
            text: textContent,
            settings: textSettings
        };

        // Create TextArea for editing
        this.textArea = new TextArea(textAreaConfig, container);
        
        // Create input handler for keyboard input
        this.inputHandler = new TextInputHandler(container);
        this.inputHandler.setActiveTextArea(this.textArea);
        // Update cell content in real-time while typing
        this.inputHandler.setOnTextChange((txt: string) => {
            if (this.editingCell) {
                const isEmpty = !txt || txt.trim() === '';
                this.editingCell.text.text = isEmpty ? `R${this.editingCell.row + 1}C${this.editingCell.column + 1}` : txt;
            }
        });

        // Set up keyboard event handling
        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation(); // Prevent canvas shortcuts

            if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) {
                    // Shift+Enter exits table edit mode completely
                    this.exitTableEditMode();
                } else {
                    // Regular Enter just ends this cell edit but stays in table edit mode
                    this.endCellEditing();
                }
            } else if (e.key === "Tab") {
                e.preventDefault();
                this.endCellEditing();
                this.navigateToNextCell(cell, !e.shiftKey);
            } else if (e.key === "ArrowRight" && e.ctrlKey) {
                e.preventDefault();
                this.endCellEditing();
                this.navigateHorizontally(cell, true);
            } else if (e.key === "ArrowLeft" && e.ctrlKey) {
                e.preventDefault();
                this.endCellEditing();
                this.navigateHorizontally(cell, false);
            } else if (e.key === "ArrowDown" && e.ctrlKey) {
                e.preventDefault();
                this.endCellEditing();
                this.navigateVertically(cell, true);
            } else if (e.key === "ArrowUp" && e.ctrlKey) {
                e.preventDefault();
                this.endCellEditing();
                this.navigateVertically(cell, false);
            } else if (e.key === "Escape") {
                e.preventDefault();
                this.cancelCellEditing();
            }
        };

        // Add keyboard event listener
        document.addEventListener("keydown", handleKeyDown);
        
        // Store the handler for cleanup
        (this as any).keydownHandler = handleKeyDown;

        // Add global click listener
        setTimeout(() => {
            document.addEventListener("click", this.handleGlobalClick);
        }, 10);

    }

    private endCellEditing(): void {
        if (!this.editingCell || !this.textArea) return;

        const cell = this.editingCell;
        const newText = this.textArea.text.trim();
        const oldText = this.originalCellText;

        // Update cell text - show placeholder if empty, otherwise show the text
        const finalText = newText || `R${cell.row + 1}C${cell.column + 1}`;
        cell.text.text = finalText;

        // Add history entry for cell text change (only if text actually changed)
        if (oldText !== finalText) {
            try {
                historyManager.push({
                    label: 'Edit Table Cell',
                    undo: () => {
                        try {
                            cell.text.text = oldText;
                        } catch (error) {
                            console.warn('Failed to undo cell text edit:', error);
                        }
                    },
                    redo: () => {
                        try {
                            cell.text.text = finalText;
                        } catch (error) {
                            console.warn('Failed to redo cell text edit:', error);
                        }
                    }
                });
            } catch (error) {
                console.warn('Failed to add cell text edit to history:', error);
            }
        }

        cell.isEditing = false;

        // Restore normal cell appearance
        this.restoreCellAppearance(cell);

        // Clean up text input
        this.cleanupTextInput();


        this.editingCell = null;

        // Note: We don't exit table edit mode here - user can continue tabbing to other cells
    }

    private exitTableEditMode(): void {

        if (this.tableInEditMode) {
            this.removeTableEditModeHighlight(this.tableInEditMode);
        }

        this.tableInEditMode = null;
        this.endCellEditing();
    }

    private cancelCellEditing(): void {
        if (!this.editingCell) return;

        this.editingCell.isEditing = false;

        // Restore normal cell appearance
        this.restoreCellAppearance(this.editingCell);

        this.cleanupTextInput();
        this.editingCell = null;

        // Exit table edit mode when canceling
        this.exitTableEditMode();
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

    private navigateHorizontally(currentCell: TableCell, right: boolean): void {
        // Find current table and container
        const tableData = this.activeTables.find(table =>
            table.cells.some(row => row.includes(currentCell))
        );

        if (!tableData || !tableData.container.parent) return;

        const container = tableData.container.parent;
        const { rows, columns } = this.settings;

        let nextRow = currentCell.row;
        let nextCol = currentCell.column;

        if (right) {
            nextCol++;
            if (nextCol >= columns) {
                nextCol = 0;
                nextRow++;
                if (nextRow >= rows) {
                    nextRow = 0; // Wrap to first row
                }
            }
        } else {
            nextCol--;
            if (nextCol < 0) {
                nextCol = columns - 1;
                nextRow--;
                if (nextRow < 0) {
                    nextRow = rows - 1; // Wrap to last row
                }
            }
        }

        if (nextRow < rows && nextCol < columns) {
            const nextCell = tableData.cells[nextRow][nextCol];
            setTimeout(() => {
                this.startCellEditing(nextCell, container);
            }, 10);
        }
    }

    private navigateVertically(currentCell: TableCell, down: boolean): void {
        // Find current table and container
        const tableData = this.activeTables.find(table =>
            table.cells.some(row => row.includes(currentCell))
        );

        if (!tableData || !tableData.container.parent) return;

        const container = tableData.container.parent;
        const { rows, columns } = this.settings;

        let nextRow = currentCell.row;
        const nextCol = currentCell.column;

        if (down) {
            nextRow++;
            if (nextRow >= rows) {
                nextRow = 0; // Wrap to first row
            }
        } else {
            nextRow--;
            if (nextRow < 0) {
                nextRow = rows - 1; // Wrap to last row
            }
        }

        if (nextRow < rows && nextCol < columns) {
            const nextCell = tableData.cells[nextRow][nextCol];
            setTimeout(() => {
                this.startCellEditing(nextCell, container);
            }, 10);
        }
    }

    private highlightEditingCell(cell: TableCell): void {
        // Add a subtle highlight to the cell being edited
        cell.graphics.clear();
        cell.graphics.rect(
            cell.bounds.x,
            cell.bounds.y,
            cell.bounds.width,
            cell.bounds.height
        );
        // Use a lighter background color when editing
        cell.graphics.fill({ color: 0xE3F2FD }); // Light blue background
        cell.graphics.stroke({
            width: this.settings.borderWidth + 1,
            color: 0x2196F3 // Blue border
        });
    }

    private restoreCellAppearance(cell: TableCell): void {
        // Restore normal cell appearance
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
    }

    private highlightTableInEditMode(tableData: PixiTableData): void {
        // Add a subtle highlight border around the entire table to show it's in edit mode
        const editBorder = new Graphics();
        editBorder.rect(-2, -2, tableData.width + 4, tableData.height + 4);
        editBorder.stroke({
            width: 2,
            color: 0x2196F3, // Blue color
            alpha: 0.6
        });

        // Add the border as the first child so it appears behind the table content
        tableData.container.addChildAt(editBorder, 0);
        (tableData.container as any).editModeBorder = editBorder;
    }

    private removeTableEditModeHighlight(tableData: PixiTableData): void {
        // Remove the edit mode border
        const editBorder = (tableData.container as any).editModeBorder;
        if (editBorder) {
            tableData.container.removeChild(editBorder);
            editBorder.destroy();
            (tableData.container as any).editModeBorder = null;
        }
    }

    private cleanupTextInput(): void {
        if (this.textArea) {
            // Destroy the TextArea and its container
            this.textArea.destroy();
            this.textArea = null;
        }
        
        if (this.inputHandler) {
            // Clean up the input handler
            this.inputHandler.setActiveTextArea(null);
            this.inputHandler.setOnTextChange(null);
            this.inputHandler = null;
        }
        
        // Remove keyboard event listener
        if ((this as any).keydownHandler) {
            document.removeEventListener("keydown", (this as any).keydownHandler);
            (this as any).keydownHandler = null;
        }
        
        document.removeEventListener("click", this.handleGlobalClick);
    }

    private handleGlobalClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        
        // Check if clicking on canvas - allow table interaction but check if it's outside current table
        const canvas = document.querySelector("#canvas-container canvas");
        if (target === canvas) {
            // TODO: Could add logic here to check if click is outside the current table in edit mode
            // For now, allow canvas clicks to continue table editing
            return;
        }

        // Check if clicking on any table-related elements
        if (target.closest('.table-menu')) return;

        // Otherwise exit table edit mode completely (clicked outside the table area)
        this.exitTableEditMode();
    }

    // Public methods for external access
    public forceExitEditMode(): void {
        this.exitTableEditMode();
    }

    public updateSettings(newSettings: Partial<TableSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    public isInEditMode(): boolean {
        return this.tableInEditMode !== null;
    }
}
