/**
 * PixiJS Canvas Manager
 * Handles the PixiJS application and canvas interactions for the course builder
 */

import { Application, Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
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
      
      // Use fixed A4 dimensions since container is now properly sized in CSS
      const canvasWidth = 794;
      const canvasHeight = 1123;
      const a4AspectRatio = canvasWidth / canvasHeight;

      console.log(`🎨 Using fixed A4 dimensions: ${canvasWidth}x${canvasHeight}`);
      console.log(`🎨 A4 aspect ratio: ${a4AspectRatio}`);

      // Initialize the application with A4 dimensions
      await this.app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0xffffff, // White background
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Clear the canvas container and add PixiJS canvas
      this.canvasElement!.innerHTML = '';
      this.canvasElement!.appendChild(this.app.canvas);

      // Style the canvas to be centered in container
      this.app.canvas.style.display = 'block';
      this.app.canvas.style.margin = 'auto';
      this.app.canvas.style.border = '2px solid #6495ed';
      this.app.canvas.style.borderRadius = '8px';
      this.app.canvas.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';

      // Store the scale factor for layout calculations
      (this.app as any).scaleToA4 = {
        width: 794 / canvasWidth,
        height: 1123 / canvasHeight,
        canvasWidth,
        canvasHeight
      };

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
      console.log(`🎨 Canvas dimensions: ${canvasWidth}x${canvasHeight} (A4 dimensions)`);
      console.log(`🎨 Canvas screen bounds:`, this.app.screen);
      console.log('🎨 Background grid added');
      console.log('🎨 Event listeners attached');
      console.log('🎨 Drawing container ready');
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
   * Get the actual canvas dimensions
   */
  public getCanvasDimensions(): { width: number; height: number } {
    if (this.app) {
      return {
        width: this.app.screen.width,
        height: this.app.screen.height
      };
    }
    return { width: 794, height: 1123 }; // A4 fallback
  }

  /**
   * Get detailed canvas information for debugging
   */
  public getCanvasInfo(): any {
    if (!this.app || !this.canvasElement) {
      return { error: 'Canvas not initialized' };
    }

    const containerRect = this.canvasElement.getBoundingClientRect();
    const appScreen = this.app.screen;
    const canvasElement = this.app.canvas;

    return {
      container: {
        width: containerRect.width,
        height: containerRect.height,
        x: containerRect.x,
        y: containerRect.y
      },
      pixiScreen: {
        width: appScreen.width,
        height: appScreen.height
      },
      canvasElement: {
        width: canvasElement.width,
        height: canvasElement.height,
        styleWidth: canvasElement.style.width,
        styleHeight: canvasElement.style.height
      },
      aspectRatio: appScreen.width / appScreen.height,
      a4AspectRatio: 794 / 1123
    };
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

  /**
   * Render layout as canvas background structure
   */
  public renderLayoutAsBackground(layoutBlocks: any[]): void {
    if (!this.app) return;

    // Clear any existing background
    this.app.stage.removeChildren();

    // Create main background
    const background = new Graphics();
    background.rect(0, 0, this.app.screen.width, this.app.screen.height);
    background.fill(0xffffff);
    this.app.stage.addChild(background);

    // Render each layout block as a background section
    console.log(`🎨 Rendering ${layoutBlocks.length} layout blocks:`, layoutBlocks.map(b => `${b.blockId}: ${b.width}x${b.height}`));
    
    for (const block of layoutBlocks) {
      console.log(`🎨 Rendering block ${block.blockId}: ${block.width}x${block.height} at (${block.x}, ${block.y})`);
      
      const blockGraphics = new Graphics();
      
      // Block colors for different sections
      const blockColors = {
        header: 0xE3F2FD,    // Light blue
        program: 0xF3E5F5,   // Light purple  
        resources: 0xE8F5E8, // Light green
        content: 0xFFF8E1,   // Light yellow/cream
        assignment: 0xFCE4EC, // Light pink
        footer: 0xF5F5F5     // Light gray
      };
      
      const bgColor = blockColors[block.blockId as keyof typeof blockColors] || 0xF9F9F9;
      
      // Fill block area with color
      blockGraphics.rect(block.x, block.y, block.width, block.height);
      blockGraphics.fill({ color: bgColor, alpha: 0.3 });
      
      // Add border
      blockGraphics.rect(block.x, block.y, block.width, block.height);
      blockGraphics.stroke({ width: 1, color: 0xcccccc, alpha: 0.8 });
      
      this.app.stage.addChild(blockGraphics);

      // Add block title
      const blockTitle = new Text({
        text: block.blockId.charAt(0).toUpperCase() + block.blockId.slice(1),
        style: {
          fontFamily: 'Arial',
          fontSize: Math.max(16, block.height * 0.12), // Increased minimum font size and ratio
          fill: 0x333333, // Darker text for better visibility
          fontWeight: 'bold'
        }
      });
      
      blockTitle.position.set(block.x + 15, block.y + 12); // Increased padding
      this.app.stage.addChild(blockTitle);

      // Render sub-areas if they exist
      for (const area of block.areas || []) {
        const areaGraphics = new Graphics();
        
        // Dashed border for areas
        areaGraphics.rect(area.x + 1, area.y + 1, area.width - 2, area.height - 2);
        areaGraphics.stroke({ width: 1, color: 0x999999, alpha: 0.4 });
        
        this.app.stage.addChild(areaGraphics);

        // Area title (smaller text)
        if (area.height > 20) { // Reduced threshold
          const areaTitle = new Text({
            text: area.areaId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            style: {
              fontFamily: 'Arial',
              fontSize: Math.max(11, area.height * 0.15), // Increased minimum and ratio
              fill: 0x555555, // Darker for better visibility
              fontStyle: 'italic'
            }
          });
          
          areaTitle.position.set(area.x + 20, area.y + area.height / 2 - 6);
          this.app.stage.addChild(areaTitle);
        }
      }
    }

    // Recreate drawing container on top
    this.drawingContainer = new Container();
    this.app.stage.addChild(this.drawingContainer);

    console.log('🎨 Layout rendered as canvas background structure');
  }
}
