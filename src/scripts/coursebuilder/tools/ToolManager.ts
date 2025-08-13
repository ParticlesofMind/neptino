/**
 * Tool Manager
 * Manages all drawing tools and their interactions with the canvas
 */

import { FederatedPointerEvent, Container, DisplayObject } from "pixi.js";
import { Tool, ToolSettings } from "./ToolInterface";
import { SelectionTool } from "./SelectionTool";
import { PenTool } from "./PenTool";
import { HighlighterTool } from "./HighlighterTool";
import { TextTool } from "./TextTool";
import { ShapesTool } from "./ShapesTool";
import { EraserTool } from "./EraserTool";
import { DisplayObjectManager } from "../canvas/DisplayObjectManager";

export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;
  private settings: ToolSettings;
  private displayManager: DisplayObjectManager | null = null;

  constructor() {
    this.settings = {
      pen: {
        color: "#000000", // Black for good visibility
        size: 4, // Increased size for better visibility
      },
      text: {
        fontFamily: "Arial",
        fontSize: 16,
        color: "#000000",
      },
      highlighter: {
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
    };

    this.initializeTools();
  }

  private initializeTools(): void {
    // Register all tools
    this.tools.set("selection", new SelectionTool());
    this.tools.set("pen", new PenTool());
    this.tools.set("highlighter", new HighlighterTool());
    this.tools.set("text", new TextTool());
    this.tools.set("shapes", new ShapesTool());
    this.tools.set("eraser", new EraserTool());

    // Set default tool
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

    console.log(
      `🔧 Tool settings:`,
      this.settings[toolName as keyof ToolSettings],
    );
    return true;
  }

  public getActiveTool(): Tool | null {
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
      this.activeTool.onPointerDown(event, container);
    }
  }

  public onPointerMove(
    event: FederatedPointerEvent,
    container: Container,
  ): void {
    if (this.activeTool) {
      // Only log move events for drawing tools when they're actually drawing
      if (this.shouldLogMove()) {
        console.log(
          `👈 Pointer MOVE [DRAWING] - Tool: ${this.activeTool.name}, Position: (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
        );
      }
      this.activeTool.onPointerMove(event, container);
    }
  }

  public onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (this.activeTool) {
      console.log(
        `👆 Pointer UP - Tool: ${this.activeTool.name}, Position: (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
      );
      this.activeTool.onPointerUp(event, container);
    }
  }

  private shouldLogMove(): boolean {
    if (!this.activeTool) return false;

    // Only log move events for drawing tools when they're actively drawing
    const toolName = this.activeTool.name;

    // Check if the tool is actively drawing
    if (toolName === "pen" || toolName === "highlighter") {
      // Only log if the tool is currently drawing (we need to check the tool's state)
      const tool = this.activeTool as any;
      return tool.isDrawing === true;
    }

    if (toolName === "selection") {
      // Only log for selection tool when dragging
      const tool = this.activeTool as any;
      return tool.isDragging === true;
    }

    return false;
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
  public addDisplayObject(obj: DisplayObject): void {
    this.displayManager?.add(obj);
  }

  public removeDisplayObject(obj: DisplayObject): void {
    this.displayManager?.remove(obj);
  }

  public getDisplayObjects(): DisplayObject[] {
    return this.displayManager?.getObjects() || [];
  }

  public updateColorForCurrentTool(color: string): void {
    if (!this.activeTool) return;

    const toolName = this.activeTool.name;

    switch (toolName) {
      case "pen":
        this.updateToolSettings("pen", { color });
        break;
      case "highlighter":
        this.updateToolSettings("highlighter", { color });
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

  public destroy(): void {
    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    // Clear all tools
    this.tools.clear();
    this.activeTool = null;
    this.displayManager = null;
  }
}
