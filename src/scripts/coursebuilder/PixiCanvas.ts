/**
 * PixiJS Canvas Manager
 * Handles the PixiJS application and canvas interactions for the course builder
 */

import { Application, Container, FederatedPointerEvent, Graphics } from 'pixi.js';
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
      
      // Get A4 dimensions
      const a4Width = 794;  // A4 width in pixels at 96 DPI
      const a4Height = 1123; // A4 height in pixels at 96 DPI

      // Initialize the application with A4 dimensions
      await this.app.init({
        width: a4Width,
        height: a4Height,
        backgroundColor: 0xffffff, // White background
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Clear the canvas container and add PixiJS canvas
      this.canvasElement!.innerHTML = '';
      this.canvasElement!.appendChild(this.app.canvas);

      // Style the canvas to fit the A4 container perfectly
      this.app.canvas.style.width = '100%';
      this.app.canvas.style.height = '100%';
      this.app.canvas.style.display = 'block';
      this.app.canvas.style.border = 'none'; // Remove any default border

      // Create a main drawing container
      this.drawingContainer = new Container();
      this.app.stage.addChild(this.drawingContainer);

      // Add a background grid to help with visual orientation
      this.addBackgroundGrid();

      // Make the stage interactive
      this.app.stage.eventMode = 'static';
      this.app.stage.hitArea = this.app.screen;

      // Add event listeners
      this.setupEvents();

      console.log('🎨 PixiJS Canvas initialized successfully');
      console.log(`🎨 Canvas dimensions: ${a4Width}x${a4Height} (A4 format)`);
      console.log(`🎨 Canvas screen bounds:`, this.app.screen);
      console.log(`🎨 Canvas element bounds:`, this.canvasElement!.getBoundingClientRect());
      console.log('🎨 Background grid added');
      console.log('🎨 Event listeners attached');
      console.log('🎨 Drawing container ready');
      
      // Add a test rectangle to verify visibility
      this.addTestRectangle();
    } catch (error) {
      console.error('❌ Failed to initialize PixiJS Canvas:', error);
      throw error;
    }
  }

  /**
   * Set up pointer events for tool interactions
   */
  private setupEvents(): void {
    if (!this.app || !this.drawingContainer) return;

    // TEMPORARY DEBUG: Use stage directly instead of drawingContainer
    const targetContainer = this.app.stage; // Changed from this.drawingContainer

    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      console.log('🎯 EVENT: Passing stage as container to tools');
      this.toolManager.onPointerDown(event, targetContainer);
    });

    this.app.stage.on('pointermove', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerMove(event, targetContainer);
    });

    this.app.stage.on('pointerup', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, targetContainer);
    });

    this.app.stage.on('pointerupoutside', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, targetContainer);
    });
  }

  /**
   * Add a subtle background grid to help with visual orientation
   */
  private addBackgroundGrid(): void {
    if (!this.app) return;

    const grid = new Graphics();
    const gridSize = 20; // 20px grid
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }

    // Style the grid lines
    grid.stroke({ width: 0.5, color: 0xe0e0e0, alpha: 0.3 });

    // Add grid to stage (behind drawing container)
    this.app.stage.addChildAt(grid, 0);
  }

  /**
   * Add a test rectangle to verify canvas is working
   */
  private addTestRectangle(): void {
    if (!this.app || !this.drawingContainer) return;

    console.log('🧪 Adding test rectangle to verify visibility...');
    
    const testRect = new Graphics();
    
    // Draw a bright red rectangle that should be clearly visible
    testRect.rect(50, 50, 100, 100);
    testRect.fill(0xff0000); // Bright red
    testRect.stroke({ width: 3, color: 0x000000 }); // Black border
    
    // Add it to the drawing container
    this.drawingContainer.addChild(testRect);
    
    console.log('🧪 Test rectangle added at (50,50) with size 100x100');
    console.log('🧪 Drawing container info:', {
      visible: this.drawingContainer.visible,
      alpha: this.drawingContainer.alpha,
      position: this.drawingContainer.position,
      scale: this.drawingContainer.scale,
      rotation: this.drawingContainer.rotation,
      children: this.drawingContainer.children.length,
      bounds: this.drawingContainer.getBounds()
    });
    console.log(`🧪 Drawing container now has ${this.drawingContainer.children.length} children`);
  }

  /**
   * Set the active tool
   */
  public setTool(toolName: string): boolean {
    console.log(`🔧 PixiCanvas: Attempting to set tool to ${toolName}`);
    const success = this.toolManager.setActiveTool(toolName);
    if (success) {
      this.updateCanvasCursor();
      console.log(`🔧 PixiCanvas: Tool successfully set to ${toolName}`);
    } else {
      console.error(`🔧 PixiCanvas: Failed to set tool to ${toolName}`);
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
      console.log(`🧹 Clearing ${this.drawingContainer.children.length} objects from canvas`);
      this.drawingContainer.removeChildren();
      console.log('🧹 Canvas cleared');
      
      // Re-add test rectangle after clearing
      this.addTestRectangle();
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
