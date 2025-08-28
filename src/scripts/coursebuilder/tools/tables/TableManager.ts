/**
 * Table Manager - Main Tool Implementation
 * Implements the Tool interface and coordinates table functionality
 */

import { Container, FederatedPointerEvent, Point } from "pixi.js";
import { Tool } from "../ToolInterface";
import { TableSettings, PixiTableData } from "./TableTypes";
import { TableCreator } from "./TableCreator";
import { TableCellEditor } from "./TableCellEditor";
import { TableContextMenu } from "./TableContextMenu";

export class TableManager implements Tool {
    name = "tables";
    cursor = "crosshair";
    
    private settings: TableSettings;
    private isDrawing: boolean = false;
    private startPoint: Point = new Point(0, 0);
    private currentPoint: Point = new Point(0, 0);
    private activeTables: PixiTableData[] = [];
    private tableIdCounter: number = 0;
    private displayManager: any = null;
    
    private tableCreator: TableCreator;
    private cellEditor: TableCellEditor;
    private contextMenu: TableContextMenu;

    constructor() {
        this.settings = {
            rows: 3,
            columns: 3,
            cellWidth: 80,
            cellHeight: 40,
            borderColor: "#000000",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            cellPadding: 8,
            fontSize: 14,
            fontColor: "#000000"
        };
        
        this.tableCreator = new TableCreator(this.settings);
        this.cellEditor = new TableCellEditor(this.settings, this.activeTables);
        this.contextMenu = new TableContextMenu(this.activeTables);
    }

    onActivate(): void {
        console.log("🔷 TABLE: Table tool activated");
    }

    onDeactivate(): void {
        console.log("🔷 TABLE: Table tool deactivated");
        this.cellEditor.forceExitEditMode();
        this.contextMenu.hideMenu();
    }

    onPointerDown(event: FederatedPointerEvent, container: Container): void {
        const localPoint = container.toLocal(event.global);
        
        if (!this.cellEditor.isInEditMode()) {
            this.isDrawing = true;
            this.startPoint = localPoint;
            this.currentPoint = localPoint;
        }
    }

    onPointerMove(event: FederatedPointerEvent, container: Container): void {
        if (this.isDrawing) {
            this.currentPoint = container.toLocal(event.global);
        }
    }

    onPointerUp(_event: FederatedPointerEvent, container: Container): void {
        if (this.isDrawing) {
            this.endDrawing(container);
        }
        
        // Ensure proper cleanup of any table interaction states
        this.cellEditor.forceExitEditMode();
        this.contextMenu.hideMenu();
        
        console.log("🔷 TABLE: Pointer up completed with cleanup");
    }

    updateSettings(settings: any): void {
        if (settings) {
            this.settings = { ...this.settings, ...settings };
            this.cellEditor.updateSettings(this.settings);
        }
    }

    setDisplayObjectManager(manager: any): void {
        this.displayManager = manager;
    }

    setToolManager(_toolManager: any): void {
        // Optional: store tool manager reference if needed
    }

    private endDrawing(container: Container): void {
        this.isDrawing = false;
        
        const width = Math.abs(this.currentPoint.x - this.startPoint.x);
        const height = Math.abs(this.currentPoint.y - this.startPoint.y);
        
        if (width > 50 && height > 50) {
            this.createTable(container, this.startPoint.x, this.startPoint.y, width, height);
        }
    }

    private createTable(container: Container, x: number, y: number, width: number, height: number): void {
        const tableId = `table-${++this.tableIdCounter}`;
        
        const handleCellDoubleClick = (cell: any, container: Container) => {
            this.cellEditor.startCellEditing(cell, container);
        };
        
        const handleCellRightClick = (event: any, tableId: string) => {
            // Find the table and cell from the event
            const table = this.activeTables.find(t => t.id === tableId);
            if (table) {
                this.contextMenu.showTableMenu(table, event);
            }
        };
        
        const tableData = this.tableCreator.createPixiTable(
            tableId,
            container,
            x,
            y,
            width,
            height,
            handleCellDoubleClick,
            handleCellRightClick,
            this.displayManager
        );
        
        this.activeTables.push(tableData);
        
        if (this.displayManager) {
            this.displayManager.add(tableData.container);
        } else {
            container.addChild(tableData.container);
        }
        
        console.log(`🔷 TABLE: Created table ${tableId} at (${x}, ${y}) with size ${width}x${height}`);
    }
}
