/**
 * Table Cell Editor
 * Handles cell editing functionality including text input, navigation, and mode management
 */

import { Container, Graphics } from "pixi.js";
import { TableCell, TableSettings, PixiTableData } from "./TableTypes";

export class TableCellEditor {
    private settings: TableSettings;
    private textInput: HTMLInputElement | null = null;
    private editingCell: TableCell | null = null;
    private tableInEditMode: PixiTableData | null = null;
    private activeTables: PixiTableData[];

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
        console.log(`🔷 TABLE: Table ${tableData.id} is now in edit mode`);

        // Get screen coordinates for the text input
        const canvasElement = document.querySelector("#canvas-container canvas") as HTMLCanvasElement;
        if (!canvasElement) return;

        const canvasRect = canvasElement.getBoundingClientRect();

        // Calculate global position of the cell
        const cellGlobalX = tableData.x + cell.bounds.x;
        const cellGlobalY = tableData.y + cell.bounds.y;
        const globalPos = container.toGlobal({ x: cellGlobalX, y: cellGlobalY });

        // Create text input overlay
        this.textInput = document.createElement("input");
        this.textInput.type = "text";
        this.textInput.className = "table-input";

        // Set value - empty if it's a placeholder, otherwise use existing text
        const isPlaceholder = cell.text.text === `R${cell.row + 1}C${cell.column + 1}`;
        this.textInput.value = isPlaceholder ? "" : cell.text.text;

        // Temporarily override CSS to ensure visibility for debugging
        this.textInput.style.position = "absolute";
        this.textInput.style.zIndex = "10000";
        this.textInput.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
        this.textInput.style.border = "2px solid #2196f3";
        this.textInput.style.outline = "none";
        this.textInput.style.fontFamily = "Arial, sans-serif";

        // Set position and dimensions
        this.textInput.style.left = `${globalPos.x + canvasRect.left + this.settings.cellPadding}px`;
        this.textInput.style.top = `${globalPos.y + canvasRect.top + this.settings.cellPadding}px`;
        this.textInput.style.width = `${cell.bounds.width - (this.settings.cellPadding * 2)}px`;
        this.textInput.style.height = `${cell.bounds.height - (this.settings.cellPadding * 2)}px`;
        this.textInput.style.fontSize = `${this.settings.fontSize}px`;
        this.textInput.style.color = this.settings.fontColor;

        // Event handlers
        this.textInput.addEventListener("blur", () => {
            this.endCellEditing();
        });
        this.textInput.addEventListener("keydown", (e) => {
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
            } else if (e.key === "ArrowRight") {
                // Navigate right if cursor is at end of text
                const isAtEnd = this.textInput!.selectionStart === this.textInput!.value.length;
                if (isAtEnd || e.ctrlKey) {
                    e.preventDefault();
                    this.endCellEditing();
                    this.navigateHorizontally(cell, true);
                }
            } else if (e.key === "ArrowLeft") {
                // Navigate left if cursor is at start of text
                const isAtStart = this.textInput!.selectionStart === 0;
                if (isAtStart || e.ctrlKey) {
                    e.preventDefault();
                    this.endCellEditing();
                    this.navigateHorizontally(cell, false);
                }
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                this.endCellEditing();
                this.navigateVertically(cell, true);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                this.endCellEditing();
                this.navigateVertically(cell, false);
            } else if (e.key === "Escape") {
                e.preventDefault();
                this.cancelCellEditing();
            }
        });

        // Add to DOM and focus
        document.body.appendChild(this.textInput);

        // Focus and select text with better timing
        setTimeout(() => {
            if (this.textInput) {
                this.textInput.focus();

                // Give it another moment for focus to take effect
                setTimeout(() => {
                    if (this.textInput) {
                        this.textInput.select();
                        // Ensure selection worked with a fallback
                        if (this.textInput.selectionStart === this.textInput.selectionEnd) {
                            this.textInput.setSelectionRange(0, this.textInput.value.length);
                        }
                    }
                }, 50);
            }
        }, 100);

        // Add global click listener
        setTimeout(() => {
            document.addEventListener("click", this.handleGlobalClick);
        }, 10);

        console.log(`🔷 TABLE: Started editing cell R${cell.row + 1}C${cell.column + 1}`);
    }

    private endCellEditing(): void {
        if (!this.editingCell || !this.textInput) return;

        const cell = this.editingCell;
        const newText = this.textInput.value.trim();

        // Update cell text - show placeholder if empty, otherwise show the text
        if (newText) {
            cell.text.text = newText;
        } else {
            // Restore placeholder text if empty
            cell.text.text = `R${cell.row + 1}C${cell.column + 1}`;
        }

        cell.isEditing = false;

        // Restore normal cell appearance
        this.restoreCellAppearance(cell);

        // Clean up input
        this.cleanupTextInput();

        console.log(`🔷 TABLE: Ended editing cell R${cell.row + 1}C${cell.column + 1}`);

        this.editingCell = null;

        // Note: We don't exit table edit mode here - user can continue tabbing to other cells
    }

    private exitTableEditMode(): void {
        console.log('🔷 TABLE: Exiting table edit mode');

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
        let nextCol = currentCell.column;

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
