/**
 * Table Manager - Main Tool Implementation
 * Implements the Tool interface and coordinates table functionality
 */

import { Container, FederatedPointerEvent, Point, Rectangle } from "pixi.js";
import { Tool } from "../ToolInterface";
import { TableSettings, PixiTableData } from "./TableTypes";
import { TableCreator } from "./TableCreator";
import { TableCellEditor } from "./TableCellEditor";
import { TableContextMenu } from "./TableContextMenu";
import { BoundaryUtils } from "../BoundaryUtils";

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
    private toolManager: any = null;
    
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

        if (this.cellEditor.isInEditMode()) return;

        // Enforce margins: only allow starting inside the content area
        const canvasBounds = this.toolManager?.getCanvasBounds ? this.toolManager.getCanvasBounds() : undefined;
        if (canvasBounds && !BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
            console.log(`🔷 TABLE: 🚫 Start point in margin area rejected at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
            return;
        }

        this.isDrawing = true;
        // Clamp start within bounds
        const clampedStart = canvasBounds ? BoundaryUtils.clampPoint(localPoint, canvasBounds) : localPoint;
        this.startPoint = clampedStart;
        this.currentPoint = clampedStart;
    }

    onPointerMove(event: FederatedPointerEvent, container: Container): void {
        if (!this.isDrawing) return;
        const local = container.toLocal(event.global);
        const canvasBounds = this.toolManager?.getCanvasBounds ? this.toolManager.getCanvasBounds() : undefined;
        this.currentPoint = canvasBounds ? BoundaryUtils.clampPoint(local, canvasBounds) : local;
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

    setToolManager(toolManager: any): void {
        this.toolManager = toolManager;
    }

    private endDrawing(container: Container): void {
        this.isDrawing = false;
        const widthRaw = this.currentPoint.x - this.startPoint.x;
        const heightRaw = this.currentPoint.y - this.startPoint.y;

        const width = Math.abs(widthRaw);
        const height = Math.abs(heightRaw);

        if (width > 50 && height > 50) {
            // Normalize rectangle from start/current and clamp to content area
            let x = Math.min(this.startPoint.x, this.currentPoint.x);
            let y = Math.min(this.startPoint.y, this.currentPoint.y);
            let w = width;
            let h = height;
            const canvasBounds = this.toolManager?.getCanvasBounds ? this.toolManager.getCanvasBounds() : undefined;
            if (canvasBounds) {
                const clamped = BoundaryUtils.clampRectangle(new Rectangle(x, y, w, h), canvasBounds);
                x = clamped.x; y = clamped.y; w = clamped.width; h = clamped.height;
            }
            this.createTable(container, x, y, w, h);
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
        
        // Mark the newly created table for delayed handle display
        if (this.toolManager && this.toolManager.getActiveTool && this.toolManager.getActiveTool()?.name === 'selection') {
            const selectionTool = this.toolManager.getActiveTool();
            if (selectionTool && typeof selectionTool.markAsNewlyCreated === 'function') {
                selectionTool.markAsNewlyCreated([tableData.container]);
            }
        }
        
        console.log(`🔷 TABLE: Created table ${tableId} at (${x}, ${y}) with size ${width}x${height}`);
    }
}
