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
  
  // Container-wide event handling
  private containerElement: HTMLElement | null = null;
  private workspaceOverlay: HTMLElement | null = null;

  constructor(app: Application, drawingLayer: Container, toolManager: ToolManager) {
    this.app = app;
    this.drawingLayer = drawingLayer;
    this.toolManager = toolManager;
    
    // Find the engine__canvas container
    this.containerElement = document.querySelector('.engine__canvas') as HTMLElement;
    if (!this.containerElement) {
      console.warn('⚠️ engine__canvas container not found - falling back to PIXI canvas only');
    }
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

    // Set up pointer events directly on the stage (for PIXI canvas area)
    this.app.stage.on('pointerdown', this.handlePointerDown.bind(this));
    this.app.stage.on('pointermove', this.handlePointerMove.bind(this));
    this.app.stage.on('pointerup', this.handlePointerUp.bind(this));
    this.app.stage.on('pointerupoutside', this.handlePointerUp.bind(this));
    this.app.stage.on('pointerleave', this.handlePointerLeave.bind(this));

    // Also keep the drawing layer interactive for existing objects
    this.drawingLayer.eventMode = 'static';
    this.drawingLayer.interactiveChildren = true;

    // 🎯 SIMPLE APPROACH: Create an invisible overlay that covers the entire container
    this.createWorkspaceOverlay();

    // 🚑 GLOBAL SAFETY: Add document-level mouse up listener to catch any missed events
    document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
    document.addEventListener('pointerup', this.handleGlobalMouseUp.bind(this));

    // Update cursor based on active tool
    this.updateCursor();

  }

  /**
   * 🎯 Create an invisible workspace overlay for extended drawing area
   */
  private createWorkspaceOverlay(): void {
    if (!this.containerElement) return;

    // Remove any existing overlay
    const existingOverlay = this.containerElement.querySelector('.workspace-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create a new overlay div
    const overlay = document.createElement('div');
    overlay.className = 'workspace-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: auto;
      z-index: 1;
      background: transparent;
    `;

    // Add event listeners to the overlay
    overlay.addEventListener('pointerdown', this.handleWorkspacePointerDown.bind(this));
    overlay.addEventListener('pointermove', this.handleWorkspacePointerMove.bind(this));
    overlay.addEventListener('pointerup', this.handleWorkspacePointerUp.bind(this));
    overlay.addEventListener('pointerleave', this.handleWorkspacePointerLeave.bind(this));
    
    // Prevent default browser behaviors
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
    overlay.addEventListener('dragstart', (e) => e.preventDefault());

    // Insert the overlay as the first child so it doesn't interfere with other UI elements
    this.containerElement.insertBefore(overlay, this.containerElement.firstChild);
    
    console.log('🎯 Workspace overlay created and positioned');
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
   * 🎯 WORKSPACE OVERLAY EVENT HANDLERS - Simple approach using invisible overlay
   */

  /**
   * Handle pointer down on workspace overlay
   */
  private handleWorkspacePointerDown(domEvent: PointerEvent): void {
    if (!this.isEnabled) return;
    
    // Skip if clicking on UI elements - let them handle their own events
    const target = domEvent.target as HTMLElement;
    if (target.closest('.engine__perspective') || 
        target.closest('.snap-menu') ||
        target.closest('.engine__preview') ||
        target.closest('.engine__tools') ||
        target === this.app.canvas) {
      return; // Let the original handlers deal with these
    }
    
    console.log('🎯 Workspace overlay pointer DOWN:', {
      clientX: Math.round(domEvent.clientX),
      clientY: Math.round(domEvent.clientY),
      tool: this.toolManager.getActiveToolName()
    });
    
    // Convert to a simple PIXI-style event for the tools
    // Tools expect coordinates relative to the drawing layer
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const x = domEvent.clientX - canvasRect.left;
    const y = domEvent.clientY - canvasRect.top;
    
    const fakePixiEvent = {
      global: { x, y },
      getLocalPosition: (_container: Container) => {
        // For workspace events, we'll just place objects at the click coordinates
        // adjusted to the drawing layer coordinate system
        return { x, y };
      },
      preventDefault: () => domEvent.preventDefault(),
      stopPropagation: () => domEvent.stopPropagation(),
      target: this.drawingLayer,
      type: 'pointerdown',
      button: domEvent.button,
      buttons: domEvent.buttons
    };
    
    this.pointerBlocked = false;
    this.toolHasPointerCapture = true;
    this.toolManager.onPointerDown(fakePixiEvent as any, this.drawingLayer);
    
    domEvent.preventDefault();
  }

  /**
   * Handle pointer move on workspace overlay
   */
  private handleWorkspacePointerMove(domEvent: PointerEvent): void {
    if (!this.isEnabled || this.pointerBlocked || !this.toolHasPointerCapture) return;
    
    // Skip if over UI elements
    const target = domEvent.target as HTMLElement;
    if (target !== domEvent.currentTarget) return; // Only handle events on the overlay itself
    
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const x = domEvent.clientX - canvasRect.left;
    const y = domEvent.clientY - canvasRect.top;
    
    const fakePixiEvent = {
      global: { x, y },
      getLocalPosition: (container: Container) => ({ x, y }),
      preventDefault: () => domEvent.preventDefault(),
      stopPropagation: () => domEvent.stopPropagation(),
      target: this.drawingLayer,
      type: 'pointermove'
    };
    
    this.toolManager.onPointerMove(fakePixiEvent as any, this.drawingLayer);
  }

  /**
   * Handle pointer up on workspace overlay
   */
  private handleWorkspacePointerUp(domEvent: PointerEvent): void {
    if (!this.isEnabled || !this.toolHasPointerCapture) return;
    
    console.log('🎯 Workspace overlay pointer UP');
    
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const x = domEvent.clientX - canvasRect.left;
    const y = domEvent.clientY - canvasRect.top;
    
    const fakePixiEvent = {
      global: { x, y },
      getLocalPosition: (container: Container) => ({ x, y }),
      preventDefault: () => domEvent.preventDefault(),
      stopPropagation: () => domEvent.stopPropagation(),
      target: this.drawingLayer,
      type: 'pointerup'
    };
    
    this.toolManager.onPointerUp(fakePixiEvent as any, this.drawingLayer);
    
    this.clearAllDragStates();
    this.toolHasPointerCapture = false;
    this.updateCursor();
  }

  /**
   * Handle pointer leaving workspace overlay
   */
  private handleWorkspacePointerLeave(domEvent: PointerEvent): void {
    if (!this.isEnabled || !this.toolHasPointerCapture) return;
    
    console.log('🎯 Workspace overlay pointer LEAVE');
    
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const x = domEvent.clientX - canvasRect.left;
    const y = domEvent.clientY - canvasRect.top;
    
    const fakePixiEvent = {
      global: { x, y },
      getLocalPosition: (container: Container) => ({ x, y }),
      preventDefault: () => domEvent.preventDefault(),
      stopPropagation: () => domEvent.stopPropagation(),
      target: this.drawingLayer,
      type: 'pointerleave'
    };
    
    this.toolManager.onPointerUp(fakePixiEvent as any, this.drawingLayer);
    
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
    
    // 🎯 NEW: Also set cursor on the entire engine__canvas container for unified experience
    if (this.containerElement) {
      this.containerElement.style.cursor = cursor;
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
    // Remove PIXI event listeners
    this.drawingLayer.off('pointerdown');
    this.drawingLayer.off('pointermove'); 
    this.drawingLayer.off('pointerup');
    this.drawingLayer.off('pointerupoutside');
    this.drawingLayer.off('pointerleave');

    // 🎯 NEW: Remove workspace overlay event listeners
    if (this.workspaceOverlay) {
      this.workspaceOverlay.removeEventListener('pointerdown', this.handleWorkspacePointerDown.bind(this));
      this.workspaceOverlay.removeEventListener('pointermove', this.handleWorkspacePointerMove.bind(this));
      this.workspaceOverlay.removeEventListener('pointerup', this.handleWorkspacePointerUp.bind(this));
      this.workspaceOverlay.removeEventListener('pointerleave', this.handleWorkspacePointerLeave.bind(this));
      this.workspaceOverlay.remove();
      this.workspaceOverlay = null;
    }

    if (this.containerElement) {
      // Reset container cursor
      this.containerElement.style.cursor = '';
    }

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
