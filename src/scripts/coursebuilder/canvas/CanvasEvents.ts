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
  private pointerBlocked: boolean = false;
  private toolHasPointerCapture: boolean = false;
  // Animation path recording is handled exclusively by the Path tool.
  // Kept minimal state here for canvas-wide concerns only.

  constructor(app: Application, drawingLayer: Container, toolManager: ToolManager) {
    this.app = app;
    this.drawingLayer = drawingLayer;
    this.toolManager = toolManager;
  }

  /**
   * Set up all pointer event listeners
   */
  public initialize(): void {
 
    
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

    // 🚑 GLOBAL SAFETY: Add document-level mouse up listener to catch any missed events
    document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
    document.addEventListener('pointerup', this.handleGlobalMouseUp.bind(this));

    // Update cursor based on active tool
    this.updateCursor();


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

    if (!this.shouldRouteToToolManager(event)) {
      this.pointerBlocked = true;
      this.toolHasPointerCapture = false;
      this.updateCursor();
      return;
    }
    this.pointerBlocked = false;
    this.toolHasPointerCapture = true;
    this.toolManager.onPointerDown(event, this.drawingLayer);
    
    // Path recording is handled by the Path tool; Selection remains for positioning only.
    this.updateCursor();
   
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    if (this.pointerBlocked) {
      return;
    }

    if (!this.toolHasPointerCapture && !this.shouldRouteToToolManager(event)) {
      return;
    }

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
    
    // No selection-based path recording here by design.
    
    // Update cursor after tool processes the move event (in case tool cursor changed)
    this.updateCursor();
  }

  /**
   * Handle pointer up events
   */
  private handlePointerUp(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    const shouldRoute = this.toolHasPointerCapture || this.shouldRouteToToolManager(event);

    if (!shouldRoute) {
      this.pointerBlocked = false;
      this.toolHasPointerCapture = false;
      this.updateCursor();
      return;
    }

    // Route to tool manager
    this.toolManager.onPointerUp(event, this.drawingLayer);
    
    // No selection-based path recording to finalize.
    // Ensure any stale overlays (if any) are cleared by active tool implementations.
    
    // 🚑 CLEANUP: Ensure any stuck dragging states are cleared
    this.clearAllDragStates();
    this.toolHasPointerCapture = false;
    this.updateCursor();
  }

  private shouldRouteToToolManager(event: FederatedPointerEvent): boolean {
    const target = event.target as any;
    if (!target) return true;
    if (target.__sceneControl) return false;
    return true;
  }

  /**
   * Handle pointer leaving canvas
   */
  private handlePointerLeave(event: FederatedPointerEvent): void {
    if (!this.isEnabled) return;

    
    // Treat as pointer up to end any active drawing
    this.toolManager.onPointerUp(event, this.drawingLayer);
    
    // 🚑 CLEANUP: Ensure any stuck dragging states are cleared when leaving canvas
    this.clearAllDragStates();
    this.toolHasPointerCapture = false;
  }

  /**
   * Clear all dragging states (for both PixiJS and HTML elements)
   * This ensures nothing gets "stuck" to the mouse cursor
   */
  private clearAllDragStates(): void {
    // Clear HTML table dragging states
    document.querySelectorAll('.coursebuilder-table.dragging').forEach(table => {
      table.classList.remove('dragging');
    });

    // Clear any global CSS classes that might indicate dragging
    document.querySelectorAll('.dragging, [data-dragging="true"]').forEach(element => {
      element.classList.remove('dragging');
      element.removeAttribute('data-dragging');
    });

    // Reset body cursor in case it got stuck
    document.body.style.cursor = '';
    
    // Reset canvas cursor to match active tool
    this.updateCursor();
    this.pointerBlocked = false;
    this.toolHasPointerCapture = false;
    
  }

  /**
   * Global mouse up handler to catch any events that might escape the canvas
   * This is a safety net to prevent elements from getting stuck in dragging state
   */
  private handleGlobalMouseUp(): void {
    this.clearAllDragStates();
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
    }
  }

  /**
   * Set tool and update cursor
   */
  public setActiveTool(toolName: string): boolean {
    const success = this.toolManager.setActiveTool(toolName);
    if (success) {
      this.updateCursor();
    }
    return success;
  }

  /**
   * Update tool color
   */
  public updateToolColor(color: string): void {
    this.toolManager.updateColorForCurrentTool(color);
  }

  /**
   * Update tool settings
   */
  public updateToolSettings(toolName: string, settings: any): void {
    this.toolManager.updateToolSettings(toolName, settings);
  }

  /** Apply settings to selected objects (selection tool) */
  public applySettingsToSelection(toolName: string, settings: any): void {
    this.toolManager.applySettingsToSelection(toolName, settings);
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

  /** Copy selected objects */
  public copySelection(): boolean {
    return this.toolManager.copySelection();
  }

  /** Paste from clipboard */
  public pasteSelection(): boolean {
    return this.toolManager.pasteSelection();
  }

  /** Group selection */
  public groupSelection(): boolean {
    return this.toolManager.groupSelection();
  }

  /** Ungroup selection */
  public ungroupSelection(): boolean {
    return this.toolManager.ungroupSelection();
  }

  // Layer helpers for external callers (LayersPanel, etc.)
  public bringToFront(): void { (this.toolManager as any)?.bringToFront?.(); }
  public sendToBack(): void { (this.toolManager as any)?.sendToBack?.(); }
  public bringForward(): void { (this.toolManager as any)?.bringForward?.(); }
  public sendBackward(): void { (this.toolManager as any)?.sendBackward?.(); }
  public toggleLock(): void { (this.toolManager as any)?.toggleLock?.(); }
  public toggleVisibility(show?: boolean): void { (this.toolManager as any)?.toggleVisibility?.(show); }

  /**
   * Enable/disable event handling
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
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

    // Remove global event listeners
    document.removeEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
    document.removeEventListener('pointerup', this.handleGlobalMouseUp.bind(this));

    // Final cleanup of any remaining drag states
    this.clearAllDragStates();

    // Destroy tool manager
    this.toolManager.destroy();

  }

  /**
   * Enable canvas drawing events
   */
  public enableDrawingEvents(): void {
    this.isEnabled = true;
  }

  /**
   * Disable canvas drawing events (for grab tool, etc.)
   */
  public disableDrawingEvents(): void {
    this.isEnabled = false;
  }

  /**
   * Check if drawing events are enabled
   */
  public areDrawingEventsEnabled(): boolean {
    return this.isEnabled;
  }
}
