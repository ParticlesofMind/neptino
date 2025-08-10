/**
 * PixiJS Canvas Manager
 * Handles the PixiJS application and canvas interactions for the course builder
 */

import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { ToolManager } from './tools/ToolManager';

export class PixiCanvas {
  private app: Application | null = null;
  private drawingContainer: Container | null = null;
  private toolManager: ToolManager;
  private canvasElement: HTMLElement | null = null;

  constructor(containerId: string) {
    this.canvasElement = document.getElementById(containerId);
    if (!this.canvasElement) {
      throw new Error(`Canvas container with id "${containerId}" not found`);
    }
    this.toolManager = new ToolManager();
  }

  /**
   * Initialize the PixiJS application
   */
  public async init(): Promise<void> {
    try {
      // Create PixiJS application
      this.app = new Application();
      
      // Initialize the application
      await this.app.init({
        width: 800,
        height: 600,
        backgroundColor: 0xffffff, // White background
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Clear the canvas container and add PixiJS canvas
      this.canvasElement!.innerHTML = '';
      this.canvasElement!.appendChild(this.app.canvas);

      // Create a main drawing container
      this.drawingContainer = new Container();
      this.app.stage.addChild(this.drawingContainer);

      // Make the stage interactive
      this.app.stage.eventMode = 'static';
      this.app.stage.hitArea = this.app.screen;

      // Add event listeners
      this.setupEvents();

      console.log('PixiJS Canvas initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PixiJS Canvas:', error);
      throw error;
    }
  }

  /**
   * Set up pointer events for tool interactions
   */
  private setupEvents(): void {
    if (!this.app || !this.drawingContainer) return;

    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerDown(event, this.drawingContainer!);
    });

    this.app.stage.on('pointermove', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerMove(event, this.drawingContainer!);
    });

    this.app.stage.on('pointerup', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, this.drawingContainer!);
    });

    this.app.stage.on('pointerupoutside', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, this.drawingContainer!);
    });
  }

  /**
   * Set the active tool
   */
  public setTool(toolName: string): boolean {
    const success = this.toolManager.setActiveTool(toolName);
    if (success) {
      this.updateCanvasCursor();
    }
    return success;
  }

  /**
   * Update the canvas cursor based on the active tool
   */
  private updateCanvasCursor(): void {
    if (this.canvasElement) {
      this.canvasElement.style.cursor = this.toolManager.getCursor();
    }
  }

  /**
   * Update color for the current tool
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

  /**
   * Get the current active tool name
   */
  public getActiveToolName(): string {
    return this.toolManager.getActiveToolName();
  }

  /**
   * Clear all drawings from the canvas
   */
  public clearCanvas(): void {
    if (this.drawingContainer) {
      this.drawingContainer.removeChildren();
      console.log('Canvas cleared');
    }
  }

  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
      console.log(`Canvas resized to ${width}x${height}`);
    }
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    if (this.app) {
      return {
        width: this.app.screen.width,
        height: this.app.screen.height
      };
    }
    return { width: 0, height: 0 };
  }

  /**
   * Export canvas as image data URL
   */
  public async exportAsImage(): Promise<string> {
    if (!this.app) {
      throw new Error('PixiJS application not initialized');
    }

    try {
      const renderTexture = this.app.renderer.generateTexture(this.app.stage);
      const canvas = this.app.renderer.extract.canvas(renderTexture) as HTMLCanvasElement;
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to export canvas as image:', error);
      throw new Error('Failed to export canvas as image');
    }
  }

  /**
   * Destroy the PixiJS application and clean up resources
   */
  public destroy(): void {
    this.toolManager.destroy();
    
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
      this.drawingContainer = null;
      console.log('PixiJS Canvas destroyed');
    }
  }

  /**
   * Get the PixiJS application instance (for advanced usage)
   */
  public getApp(): Application | null {
    return this.app;
  }

  /**
   * Get the drawing container (for adding custom elements)
   */
  public getDrawingContainer(): Container | null {
    return this.drawingContainer;
  }

  /**
   * Get the tool manager (for advanced tool operations)
   */
  public getToolManager(): ToolManager {
    return this.toolManager;
  }
}
