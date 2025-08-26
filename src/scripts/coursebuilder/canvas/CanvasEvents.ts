/**
 * CanvasEvents - Mouse/Pointer Event Handling & Coordination
 * 
 * Responsibilities:
 * - Capture pointer events from Pixi canvas
 * - Convert screen coordinates to canvas coordinates  
 * - Route events to active tool via ToolManager
 * - Handle cursor updates based on active tool
 * 
 * Target: ~150 lines
 */

import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { ToolManager } from '../tools/ToolManager';

export class CanvasEvents {
  private app: Application;
  private drawingLayer: Container;
  private toolManager: ToolManager;
  private isEnabled: boolean = true;

  constructor(app: Application, drawingLayer: Container, toolManager: ToolManager) {
    this.app = app;
    this.drawingLayer = drawingLayer;
    this.toolManager = toolManager;
  }

  /**
   * Set up all pointer event listeners
   */
  public initialize(): void {
    console.log('🖱️ Setting up canvas pointer events...');
    
    // CLEAN APPROACH: Make the stage itself interactive
    this.app.stage.eventMode = 'static';
    this.app.stage.interactiveChildren = true;
    
    // Set hit area to entire canvas dimensions
    this.app.stage.hitArea = this.app.screen;

    // Set up pointer events directly on the stage
    this.app.stage.on('pointerdown', this.handlePointerDown.bind(this));
    this.app.stage.on('pointermove', this.handlePointerMove.bind(this));
    this.app.stage.on('pointerup', this.handlePointerUp.bind(this));
    this.app.stage.on('pointerupoutside', this.handlePointerUp.bind(this));
    this.app.stage.on('pointerleave', this.handlePointerLeave.bind(this));

    // Also keep the drawing layer interactive for existing objects
    this.drawingLayer.eventMode = 'static';
    this.drawingLayer.interactiveChildren = true;

    // Update cursor based on active tool
    this.updateCursor();

    console.log('✅ Canvas pointer events initialized on stage');
  }

  /**
   * Handle pointer down events
   */
  private handlePointerDown(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    console.log('🖱️ Canvas pointer DOWN:', {
      global: { x: Math.round(event.global.x), y: Math.round(event.global.y) },
      local: { x: Math.round(event.getLocalPosition(this.drawingLayer).x), y: Math.round(event.getLocalPosition(this.drawingLayer).y) },
      tool: this.toolManager.getActiveToolName()
    });

    // Route to tool manager - this should trigger the tool
    console.log('🔧 Routing pointer down to tool manager...');
    this.toolManager.onPointerDown(event, this.drawingLayer);
    console.log('✅ Tool manager pointer down completed');
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    // Only log move events for active drawing (to avoid spam)
    const activeToolName = this.toolManager.getActiveToolName();
    const shouldLog = this.shouldLogMove(activeToolName);
    
    if (shouldLog) {
      console.log('🖱️ Canvas pointer MOVE:', {
        local: { x: Math.round(event.getLocalPosition(this.drawingLayer).x), y: Math.round(event.getLocalPosition(this.drawingLayer).y) },
        tool: activeToolName
      });
    }

    // Route to tool manager
    this.toolManager.onPointerMove(event, this.drawingLayer);
  }

  /**
   * Handle pointer up events
   */
  private handlePointerUp(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    console.log('🖱️ Canvas pointer UP:', {
      local: { x: Math.round(event.getLocalPosition(this.drawingLayer).x), y: Math.round(event.getLocalPosition(this.drawingLayer).y) },
      tool: this.toolManager.getActiveToolName()
    });

    // Route to tool manager
    this.toolManager.onPointerUp(event, this.drawingLayer);
  }

  /**
   * Handle pointer leaving canvas
   */
  private handlePointerLeave(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    console.log('🖱️ Canvas pointer LEAVE');
    
    // Treat as pointer up to end any active drawing
    this.toolManager.onPointerUp(event, this.drawingLayer);
  }

  /**
   * Determine if pointer move should be logged (avoid spam)
   */
  private shouldLogMove(toolName: string): boolean {
    // Only log moves for tools that are actively drawing
    const activeTool = this.toolManager.getActiveTool();
    
    if (toolName === 'pen') {
      // Pen tool doesn't have continuous drawing, so don't log moves
      return false;
    }
    
    if (toolName === 'brush') {
      // Log brush moves only when drawing
      return (activeTool as any)?.isDrawing === true;
    }
    
    if (toolName === 'selection') {
      // Log selection moves when dragging
      return (activeTool as any)?.isDragging === true;
    }

    return false;
  }

  /**
   * Update canvas cursor based on active tool
   */
  public updateCursor(): void {
    const cursor = this.toolManager.getCursor();
    
    // Set cursor on the canvas element
    if (this.app.canvas) {
      this.app.canvas.style.cursor = cursor;
      console.log('🖱️ Canvas cursor updated:', cursor);
    }
  }

  /**
   * Set tool and update cursor
   */
  public setActiveTool(toolName: string): boolean {
    const success = this.toolManager.setActiveTool(toolName);
    if (success) {
      this.updateCursor();
      console.log('🔧 Tool changed to:', toolName);
    }
    return success;
  }

  /**
   * Update tool color
   */
  public updateToolColor(color: string): void {
    this.toolManager.updateColorForCurrentTool(color);
    console.log('🎨 Tool color updated:', color);
  }

  /**
   * Update tool settings
   */
  public updateToolSettings(toolName: string, settings: any): void {
    this.toolManager.updateToolSettings(toolName, settings);
    console.log('⚙️ Tool settings updated:', { toolName, settings });
  }

  /**
   * Get active tool name
   */
  public getActiveToolName(): string {
    return this.toolManager.getActiveToolName();
  }

  /**
   * Get tool settings for UI
   */
  public getToolSettings(): any {
    return this.toolManager.getToolSettings();
  }

  /**
   * Enable/disable event handling
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log('🖱️ Canvas events', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Get event system info for debugging
   */
  public getEventInfo(): any {
    return {
      enabled: this.isEnabled,
      activeTool: this.toolManager.getActiveToolName(),
      drawingLayerInteractive: this.drawingLayer.eventMode === 'static',
      toolSettings: this.toolManager.getToolSettings()
    };
  }

  /**
   * Destroy event system
   */
  public destroy(): void {
    // Remove event listeners
    this.drawingLayer.off('pointerdown');
    this.drawingLayer.off('pointermove'); 
    this.drawingLayer.off('pointerup');
    this.drawingLayer.off('pointerupoutside');
    this.drawingLayer.off('pointerleave');

    // Destroy tool manager
    this.toolManager.destroy();

    console.log('🗑️ Canvas events destroyed');
  }
}
