/**
 * Tool Manager
 * Manages all drawing tools and their interactions with the canvas
 */

import { FederatedPointerEvent, Container, Point } from "pixi.js";
import { Tool, ToolSettings } from "./ToolInterface";
import { SelectionTool } from "./selection";
import { PenTool } from "./PenTool";
import { BrushTool } from "./BrushTool";
import { TextTool } from "./text";
import { ShapesTool } from "./shapes";
import { EraserTool } from "./EraserTool";
import { TableManager } from "./tables/TableManager";
import { SceneTool } from "../animation/tools/SceneTool";
import { PathTool } from "../animation/tools/PathTool";
import { ModifyTool } from "../animation/tools/ModifyTool";
import { DisplayObjectManager } from "../canvas/DisplayObjectManager";
import { BoundaryUtils, CanvasBounds } from "./BoundaryUtils";

import { historyManager } from '../canvas/HistoryManager';

export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;
  private settings: ToolSettings;
  private displayManager: DisplayObjectManager | null = null;
  private currentContainer: Container | null = null;
  private uiLayer: Container | null = null;


 constructor() {
        this.settings = {
            selection: {
                enabled: true,
                enableMirroring: true,
                restorePivotOnEnd: true,
                rotationSnapDeg: 15,
                scaleSnapStep: 0.05,
            },
            pen: {
                color: "#000000", // Black for good visibility
                size: 4, // Increased size for better visibility
            },
            text: {
                fontFamily: "Arial",
                fontSize: 16,
                color: "#000000",
            },
            brush: {
                color: "#ffff00", // Bright yellow
                opacity: 0.8, // Increased opacity for better visibility
                size: 20, // Larger size for better visibility
            },
            shapes: {
                color: "#000000",
                strokeWidth: 2,
                fillColor: undefined,
                shapeType: "rectangle",
            },
            eraser: {
                size: 20,
            },
            tables: {
                rows: 3,
                columns: 3,
            },
            scene: {
                loop: false,
            },
            path: {
                speed: 'slow',
            },
        }; this.initializeTools();
 this.setupGlobalKeyboardHandlers();
 }

 /**
 * Setup global keyboard event handlers
 */
 private setupGlobalKeyboardHandlers(): void {
 document.addEventListener('keydown', this.handleGlobalKeyDown);
 }

 /**
 * Bound method for global keyboard handling
 */
  private handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (!this.activeTool) return;

    // Handle tool-specific keyboard events
    // If tool exposes onKeyDown, forward the event (pen, selection, others)
    if (typeof (this.activeTool as any).onKeyDown === 'function') {
      try { (this.activeTool as any).onKeyDown(event); } catch {}
    }

    // Global shortcuts: Undo/Redo
    const key = event.key; const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && (key === 'z' || key === 'Z')) { if (event.shiftKey) { historyManager.redo(); } else { historyManager.undo(); } event.preventDefault(); return; }
  };

    private initializeTools(): void {
        // Register all tools
        this.tools.set("selection", new SelectionTool());
        this.tools.set("pen", new PenTool());
        this.tools.set("brush", new BrushTool());
        this.tools.set("text", new TextTool());
        this.tools.set("shapes", new ShapesTool());
        this.tools.set("eraser", new EraserTool());
        this.tools.set("tables", new TableManager());
        // Animation tools (animate mode)
        this.tools.set("scene", new SceneTool(this));
        this.tools.set("path", new PathTool());
        this.tools.set("modify", new ModifyTool());

        // Set tool manager reference on all tools
        this.tools.forEach((tool) => {
            if ('setToolManager' in tool) {
                (tool as any).setToolManager(this);
            }
        }); // Set default tool to selection (matches UI default)
 this.activeTool = this.tools.get("selection") || null;
 if (this.activeTool) {
 this.activeTool.onActivate();
 }
 }

 /**
 * Provide the display object manager to all tools
 */
  public setDisplayManager(manager: DisplayObjectManager): void {
    this.displayManager = manager;
    this.tools.forEach((tool) => {
      tool.setDisplayObjectManager(manager);
      if ('setToolManager' in tool) {
        (tool as any).setToolManager(this);
      }
      if (this.uiLayer && 'setUILayer' in (tool as any)) {
        try { (tool as any).setUILayer(this.uiLayer); } catch {}
      }
    });
  }

  public setUILayer(container: Container): void {
    this.uiLayer = container;
    this.tools.forEach((tool) => {
      if ('setUILayer' in (tool as any)) {
        try { (tool as any).setUILayer(container); } catch {}
      }
    });
  }

 public setActiveTool(toolName: string): boolean {
   const newTool = this.tools.get(toolName);
   if (!newTool) {
     console.warn(`❌ Tool '${toolName}' not found`);
     return false;
   }

   // Deactivate current tool
   if (this.activeTool) {
     this.activeTool.onDeactivate();
   }

   // Activate new tool
   this.activeTool = newTool;
   this.activeTool.onActivate();

   // Update tool settings
   this.updateToolSettings(toolName);

   return true;
 } public getActiveTool(): Tool | null {
 return this.activeTool;
 }

 public getActiveToolName(): string {
 return this.activeTool?.name || "none";
 }

 public onPointerDown(
 event: FederatedPointerEvent,
 container: Container,
 ): void {
 if (this.activeTool) {
 console.log(
 `👆 Pointer DOWN - Tool: ${this.activeTool.name}, Position: (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 this.currentContainer = container; // Store current container for boundary access
 this.activeTool.onPointerDown(event, container);
 }
 }

 public onPointerMove(
   event: FederatedPointerEvent,
   container: Container,
 ): void {
   if (this.activeTool) {
     // CRITICAL: Only call the active tool's onPointerMove
     // Make sure no other tools can respond
     this.activeTool.onPointerMove(event, container);
   }
 } public onPointerUp(event: FederatedPointerEvent, container: Container): void {
 if (this.activeTool) {
 console.log(
 `👆 Pointer UP - Tool: ${this.activeTool.name}, Position: (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 this.activeTool.onPointerUp(event, container);
 }
 }

 public updateToolSettings(toolName: string, newSettings?: any): void {
 const tool = this.tools.get(toolName);
 if (!tool) return;

 // Update settings for the specific tool
 let toolSettings = this.settings[toolName as keyof ToolSettings];
 if (newSettings) {
 toolSettings = { ...toolSettings, ...newSettings };
 this.settings[toolName as keyof ToolSettings] = toolSettings as any;
 }

 tool.updateSettings(toolSettings);
 }

 /**
 * Convenience wrappers for managing display objects through the manager
 */
 public addDisplayObject(obj: any): void {
 this.displayManager?.add(obj);
 }

    public removeDisplayObject(obj: any): void {
        this.displayManager?.remove(obj);
    } public getDisplayObjects(): any[] {
 return this.displayManager?.getObjects() || [];
 }

 public updateColorForCurrentTool(color: string): void {
 if (!this.activeTool) return;

 const toolName = this.activeTool.name;
 switch (toolName) {
 case "pen":
 this.updateToolSettings("pen", { color });
 break;
 case "brush":
 this.updateToolSettings("brush", { color });
 break;
 case "text":
 this.updateToolSettings("text", { color });
 break;
 case "shapes":
 this.updateToolSettings("shapes", { color });
 break;
 }
 }

  public getToolSettings(): ToolSettings {
    return this.settings;
  }

 public getCursor(): string {
 return this.activeTool?.cursor || "default";
 }

 /**
 * Boundary Management
 * Provides canvas boundary utilities for all tools using user-specified margins
 */
  public getCanvasBounds(): CanvasBounds {
 return BoundaryUtils.getCanvasDrawingBounds();
  }

 public clampPointToBounds(point: Point): Point {
 const bounds = this.getCanvasBounds();
 return BoundaryUtils.clampPoint(point, bounds);
 }

 public isPointWithinBounds(point: Point): boolean {
 const bounds = this.getCanvasBounds();
 return BoundaryUtils.isPointWithinBounds(point, bounds);
 }

 public isPointInContentArea(point: Point): boolean {
 const bounds = this.getCanvasBounds();
 return BoundaryUtils.isPointInContentArea(point, bounds);
 }

 public logBoundaryInfo(label: string, point: Point): void {
 const bounds = this.getCanvasBounds();
 BoundaryUtils.logBoundaryInfo(label, point, bounds);
 }

  public destroy(): void {
 // Deactivate current tool
 if (this.activeTool) {
 this.activeTool.onDeactivate();
 }

 // Remove keyboard event listeners
 document.removeEventListener('keydown', this.handleGlobalKeyDown);

 // Clear all tools
    this.tools.clear();
    this.activeTool = null;
    this.displayManager = null;
  }

  /**
   * Apply settings to current selection (when selection tool active)
   */
  public applySettingsToSelection(toolName: string, settings: any): void {
    const sel = this.tools.get('selection') as any;
    if (sel && typeof sel.applySettingsToSelection === 'function') {
      try { sel.applySettingsToSelection(toolName, settings); } catch {}
    }
  }

  /** Copy currently selected objects (selection tool) */
  public copySelection(): boolean {
    const sel = this.tools.get('selection') as any;
    if (sel && typeof sel.copySelection === 'function') {
      try { return !!sel.copySelection(); } catch {}
    }
    return false;
  }

  /** Paste previously copied objects (selection tool) */
  public pasteSelection(): boolean {
    const sel = this.tools.get('selection') as any;
    if (!sel || typeof sel.pasteSelection !== 'function') return false;
    const container = this.currentContainer || this.displayManager?.getRoot();
    if (!container) return false;
    try { return !!sel.pasteSelection(container); } catch {}
    return false;
  }

  /** Group current selection into a container */
  public groupSelection(): boolean {
    const sel = this.tools.get('selection') as any;
    if (sel && typeof sel.groupSelection === 'function') {
      try { return !!sel.groupSelection(); } catch {}
    }
    return false;
  }

  /** Ungroup selected containers */
  public ungroupSelection(): boolean {
    const sel = this.tools.get('selection') as any;
    if (sel && typeof sel.ungroupSelection === 'function') {
      try { return !!sel.ungroupSelection(); } catch {}
    }
    return false;
  }

  // Layer/lock helpers
  public bringToFront(): void { const sel = this.tools.get('selection') as any; try { sel?.bringToFront?.(); } catch {} }
  public sendToBack(): void { const sel = this.tools.get('selection') as any; try { sel?.sendToBack?.(); } catch {} }
  public bringForward(): void { const sel = this.tools.get('selection') as any; try { sel?.bringForward?.(); } catch {} }
  public sendBackward(): void { const sel = this.tools.get('selection') as any; try { sel?.sendBackward?.(); } catch {} }
  public toggleLock(): void { const sel = this.tools.get('selection') as any; try { sel?.toggleLock?.(); } catch {} }
  public toggleVisibility(show?: boolean): void { const sel = this.tools.get('selection') as any; try { sel?.toggleVisibility?.(show); } catch {} }
}
