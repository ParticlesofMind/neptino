/**
 * Table Context Menu Handler
 * Manages right-click context menus for table operations
 */

import { TableCell, PixiTableData } from "./TableTypes";
import { historyManager } from "../../canvas/HistoryManager.js";

interface MenuAction {
    label: string;
    action: () => void;
}

export class TableContextMenu {
    private menuElement: HTMLElement | null = null;
    private activeTables: PixiTableData[];

    constructor(activeTables: PixiTableData[]) {
        this.activeTables = activeTables;
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
    }

    showCellMenu(cell: TableCell, event: PointerEvent): void {
        this.hideMenu();

        const actions: MenuAction[] = [
            {
                label: "Clear Cell",
                action: () => this.clearCell(cell)
            },
            {
                label: "Copy Cell",
                action: () => this.copyCell(cell)
            },
            {
                label: "Paste",
                action: () => this.pasteCell(cell)
            },
            {
                label: "Insert Row Above",
                action: () => this.insertRowAbove(cell)
            },
            {
                label: "Insert Row Below",
                action: () => this.insertRowBelow(cell)
            },
            {
                label: "Insert Column Left",
                action: () => this.insertColumnLeft(cell)
            },
            {
                label: "Insert Column Right",
                action: () => this.insertColumnRight(cell)
            },
            {
                label: "Delete Row",
                action: () => this.deleteRow(cell)
            },
            {
                label: "Delete Column",
                action: () => this.deleteColumn(cell)
            }
        ];

        this.createMenu(actions, event.clientX, event.clientY);
    }

    showTableMenu(table: PixiTableData, event: PointerEvent): void {
        this.hideMenu();

        const actions: MenuAction[] = [
            {
                label: "Table Properties",
                action: () => this.showTableProperties(table)
            },
            {
                label: "Clear All Cells",
                action: () => this.clearAllCells(table)
            },
            {
                label: "Add Row",
                action: () => this.addRow(table)
            },
            {
                label: "Add Column",
                action: () => this.addColumn(table)
            },
            {
                label: "Delete Table",
                action: () => this.deleteTable(table)
            }
        ];

        this.createMenu(actions, event.clientX, event.clientY);
    }

    private createMenu(actions: MenuAction[], x: number, y: number): void {
        this.menuElement = document.createElement("div");
        this.menuElement.className = "table-menu";

        // Create menu items
        actions.forEach(action => {
            const item = document.createElement("div");
            item.className = "table-menu__item";
            item.textContent = action.label;
            item.onclick = () => {
                action.action();
                this.hideMenu();
            };
            this.menuElement!.appendChild(item);
        });

        // Position the menu
        this.menuElement.style.position = "fixed";
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.style.zIndex = "10001";

        // Add to DOM
        document.body.appendChild(this.menuElement);

        // Adjust position if menu goes off screen
        this.adjustMenuPosition();

        // Add global click listener to close menu
        setTimeout(() => {
            document.addEventListener("click", this.handleGlobalClick);
        }, 10);
    }

    private adjustMenuPosition(): void {
        if (!this.menuElement) return;

        const rect = this.menuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { left, top } = rect;

        // Adjust horizontal position
        if (left + rect.width > viewportWidth) {
            left = viewportWidth - rect.width - 10;
        }

        // Adjust vertical position
        if (top + rect.height > viewportHeight) {
            top = viewportHeight - rect.height - 10;
        }

        // Ensure menu doesn't go off the left or top edge
        left = Math.max(10, left);
        top = Math.max(10, top);

        this.menuElement.style.left = `${left}px`;
        this.menuElement.style.top = `${top}px`;
    }

    hideMenu(): void {
        if (this.menuElement) {
            if (this.menuElement.parentNode) {
                this.menuElement.parentNode.removeChild(this.menuElement);
            }
            this.menuElement = null;
        }
        document.removeEventListener("click", this.handleGlobalClick);
    }

    private handleGlobalClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (this.menuElement && !this.menuElement.contains(target)) {
            this.hideMenu();
        }
    }

    // Cell Actions
    private clearCell(cell: TableCell): void {
        // Store original text for history
        const originalText = cell.text.text;
        const placeholderText = `R${cell.row + 1}C${cell.column + 1}`;
        
        // Reset to placeholder text
        cell.text.text = placeholderText;
        
        // Add history entry for cell clear (only if text actually changed)
        if (originalText !== placeholderText) {
            try {
                historyManager.push({
                    label: 'Clear Table Cell',
                    undo: () => {
                        try {
                            cell.text.text = originalText;
                        } catch (error) {
                            console.warn('Failed to undo cell clear:', error);
                        }
                    },
                    redo: () => {
                        try {
                            cell.text.text = placeholderText;
                        } catch (error) {
                            console.warn('Failed to redo cell clear:', error);
                        }
                    }
                });
            } catch (error) {
                console.warn('Failed to add cell clear to history:', error);
            }
        }
    }

    private copyCell(cell: TableCell): void {
        // Store cell content in clipboard
        const cellText = cell.text.text;
        const isPlaceholder = cellText === `R${cell.row + 1}C${cell.column + 1}`;
        const textToCopy = isPlaceholder ? "" : cellText;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).catch(err => {
                console.error("Failed to copy text: ", err);
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }

    }

    private async pasteCell(cell: TableCell): Promise<void> {
        try {
            let pastedText = "";

            if (navigator.clipboard && navigator.clipboard.readText) {
                pastedText = await navigator.clipboard.readText();
            } else {
                // Fallback: show an alert asking user to paste manually
                pastedText = prompt("Paste text here:") || "";
            }

            if (pastedText.trim()) {
                cell.text.text = pastedText.trim();
            }
        } catch (err) {
            console.error("Failed to paste text: ", err);
            // Fallback: show an alert asking user to paste manually
            const pastedText = prompt("Paste text here:") || "";
            if (pastedText.trim()) {
                cell.text.text = pastedText.trim();
            }
        }
    }

    // Row and Column Operations (These are placeholders - full implementation would require table restructuring)
    private insertRowAbove(cell: TableCell): void {
        // TODO: Implement row insertion
        alert("Row insertion feature coming soon!");
    }

    private insertRowBelow(cell: TableCell): void {
        // TODO: Implement row insertion
        alert("Row insertion feature coming soon!");
    }

    private insertColumnLeft(cell: TableCell): void {
        // TODO: Implement column insertion
        alert("Column insertion feature coming soon!");
    }

    private insertColumnRight(cell: TableCell): void {
        // TODO: Implement column insertion
        alert("Column insertion feature coming soon!");
    }

    private deleteRow(cell: TableCell): void {
        // TODO: Implement row deletion
        alert("Row deletion feature coming soon!");
    }

    private deleteColumn(cell: TableCell): void {
        // TODO: Implement column deletion
        alert("Column deletion feature coming soon!");
    }

    // Table Actions
    private showTableProperties(table: PixiTableData): void {
        // TODO: Implement table properties dialog
        alert("Table properties dialog coming soon!");
    }

    private clearAllCells(table: PixiTableData): void {
        // Reset all cells to placeholder text
        table.cells.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                cell.text.text = `R${rowIndex + 1}C${colIndex + 1}`;
            });
        });
    }

    private addRow(table: PixiTableData): void {
        // TODO: Implement add row
        alert("Add row feature coming soon!");
    }

    private addColumn(table: PixiTableData): void {
        // TODO: Implement add column
        alert("Add column feature coming soon!");
    }

    private deleteTable(table: PixiTableData): void {
        if (confirm("Are you sure you want to delete this table?")) {
            // Remove from active tables array
            const index = this.activeTables.indexOf(table);
            if (index > -1) {
                this.activeTables.splice(index, 1);
            }

            // Remove from PIXI display
            if (table.container.parent) {
                table.container.parent.removeChild(table.container);
            }

            // Clean up
            table.container.destroy();
        }
    }
}
