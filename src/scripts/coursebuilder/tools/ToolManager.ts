/**
 * Tool Manager
 * Manages all drawing tools and their interactions with the canvas
 */

import { FederatedPointerEvent, Container } from 'pixi.js';
import { Tool, ToolSettings } from './ToolInterface';
import { SelectionTool } from './SelectionTool';
import { PenTool } from './PenTool';
import { HighlighterTool } from './HighlighterTool';
import { TextTool } from './TextTool';
import { ShapesTool } from './ShapesTool';
import { EraserTool } from './EraserTool';

export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;
  private settings: ToolSettings;

  constructor() {
    this.settings = {
      pen: {
        color: '#000000',
        size: 2
      },
      text: {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000'
      },
      highlighter: {
        color: '#ffff00',
        opacity: 0.5,
        size: 12
      },
      shapes: {
        color: '#000000',
        strokeWidth: 2,
        fillColor: undefined,
        shapeType: 'rectangle'
      },
      eraser: {
        size: 20
      }
    };

    this.initializeTools();
  }

  private initializeTools(): void {
    // Register all tools
    this.tools.set('selection', new SelectionTool());
    this.tools.set('pen', new PenTool());
    this.tools.set('highlighter', new HighlighterTool());
    this.tools.set('text', new TextTool());
    this.tools.set('shapes', new ShapesTool());
    this.tools.set('eraser', new EraserTool());

    // Set default tool
    this.activeTool = this.tools.get('selection') || null;
    if (this.activeTool) {
      this.activeTool.onActivate();
    }
  }

  public setActiveTool(toolName: string): boolean {
    const newTool = this.tools.get(toolName);
    if (!newTool) {
      console.warn(`Tool '${toolName}' not found`);
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

    console.log(`Switched to ${toolName} tool`);
    return true;
  }

  public getActiveTool(): Tool | null {
    return this.activeTool;
  }

  public getActiveToolName(): string {
    return this.activeTool?.name || 'none';
  }

  public onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (this.activeTool) {
      this.activeTool.onPointerDown(event, container);
    }
  }

  public onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (this.activeTool) {
      this.activeTool.onPointerMove(event, container);
    }
  }

  public onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (this.activeTool) {
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

  public updateColorForCurrentTool(color: string): void {
    if (!this.activeTool) return;

    const toolName = this.activeTool.name;
    
    switch (toolName) {
      case 'pen':
        this.updateToolSettings('pen', { color });
        break;
      case 'highlighter':
        this.updateToolSettings('highlighter', { color });
        break;
      case 'text':
        this.updateToolSettings('text', { color });
        break;
      case 'shapes':
        this.updateToolSettings('shapes', { color });
        break;
    }
  }

  public getToolSettings(): ToolSettings {
    return this.settings;
  }

  public getCursor(): string {
    return this.activeTool?.cursor || 'default';
  }

  public destroy(): void {
    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    // Clear all tools
    this.tools.clear();
    this.activeTool = null;
  }
}
