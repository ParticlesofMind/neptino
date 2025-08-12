/**
 * Canvas Event Handler
 * Manages PIXI canvas events and interactions
 * Single Responsibility: Event handling only
 */

import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { ToolManager } from '../tools/ToolManager';

export class CanvasEventHandler {
  private app: Application;
  private toolManager: ToolManager;
  private drawingContainer: Container | null = null;

  constructor(app: Application, toolManager: ToolManager) {
    this.app = app;
    this.toolManager = toolManager;
  }

  /**
   * Set drawing container for tool interactions
   */
  public setDrawingContainer(container: Container): void {
    this.drawingContainer = container;
  }

  /**
   * Set up all canvas events
   */
  public setupEvents(): void {
    // Make the stage interactive
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Add pointer events
    this.setupPointerEvents();

    console.log('🎯 Canvas events setup complete');
  }

  /**
   * Set up pointer events for tool interactions
   */
  private setupPointerEvents(): void {
    // Pointer down event
    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      this.handlePointerDown(event);
    });

    // Pointer move event
    this.app.stage.on('pointermove', (event: FederatedPointerEvent) => {
      this.handlePointerMove(event);
    });

    // Pointer up event
    this.app.stage.on('pointerup', (event: FederatedPointerEvent) => {
      this.handlePointerUp(event);
    });

    console.log('🖱️ Pointer events attached');
  }

  /**
   * Handle pointer down events
   */
  private handlePointerDown(event: FederatedPointerEvent): void {
    const activeTool = this.toolManager.getActiveTool();
    if (activeTool && this.drawingContainer) {
      try {
        activeTool.onPointerDown(event, this.drawingContainer);
      } catch (error) {
        console.error('❌ Error in tool pointer down:', error);
      }
    }
  }

  /**
   * Handle pointer move events
   */
  private handlePointerMove(event: FederatedPointerEvent): void {
    const activeTool = this.toolManager.getActiveTool();
    if (activeTool && this.drawingContainer) {
      try {
        activeTool.onPointerMove(event, this.drawingContainer);
      } catch (error) {
        console.error('❌ Error in tool pointer move:', error);
      }
    }
  }

  /**
   * Handle pointer up events
   */
  private handlePointerUp(event: FederatedPointerEvent): void {
    const activeTool = this.toolManager.getActiveTool();
    if (activeTool && this.drawingContainer) {
      try {
        activeTool.onPointerUp(event, this.drawingContainer);
      } catch (error) {
        console.error('❌ Error in tool pointer up:', error);
      }
    }
  }

  /**
   * Update canvas cursor based on current tool
   */
  public updateCanvasCursor(toolName: string): void {
    const canvas = this.app.canvas;
    if (!canvas) return;

    // Remove all cursor classes
    canvas.classList.remove('cursor-pen', 'cursor-eraser', 'cursor-text', 'cursor-highlighter', 'cursor-selection');

    // Add cursor class for current tool
    switch (toolName) {
      case 'pen':
        canvas.classList.add('cursor-pen');
        break;
      case 'eraser':
        canvas.classList.add('cursor-eraser');
        break;
      case 'text':
        canvas.classList.add('cursor-text');
        break;
      case 'highlighter':
        canvas.classList.add('cursor-highlighter');
        break;
      default:
        canvas.classList.add('cursor-selection');
    }

    console.log(`🖱️ Canvas cursor updated for tool: ${toolName}`);
  }

  /**
   * Enable/disable events
   */
  public setEventsEnabled(enabled: boolean): void {
    this.app.stage.eventMode = enabled ? 'static' : 'none';
    console.log(`🎯 Canvas events ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get event information
   */
  public getEventInfo(): any {
    return {
      stageInteractive: this.app.stage.eventMode === 'static',
      hasHitArea: !!this.app.stage.hitArea,
      eventMode: this.app.stage.eventMode
    };
  }

  /**
   * Destroy event handler
   */
  public destroy(): void {
    // Remove all event listeners
    this.app.stage.off('pointerdown');
    this.app.stage.off('pointermove');
    this.app.stage.off('pointerup');
    
    // Disable events
    this.app.stage.eventMode = 'none';
    
    console.log('🗑️ Canvas event handler destroyed');
  }
}
