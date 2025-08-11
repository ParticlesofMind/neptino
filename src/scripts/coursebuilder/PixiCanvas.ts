/**
 * PixiJS Canvas Manager
 * Handles the PixiJS application and canvas interactions for the course builder
 */

import { Application, Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
import { ToolManager } from './tools/ToolManager';

export class PixiCanvas {
  private app: Application | null = null;
  private layoutContainer: Container | null = null; // Protected layout layer
  private drawingContainer: Container | null = null; // User drawing layer
  private toolManager: ToolManager;
  private canvasElement: HTMLElement | null = null;
  private layoutBlocks: any[] = []; // Store current layout for protection

  constructor(containerSelector: string) {
    // Handle both ID (#id) and class (.class) selectors
    if (containerSelector.startsWith('#') || containerSelector.startsWith('.')) {
      this.canvasElement = document.querySelector(containerSelector);
    } else {
      // Fallback for plain ID strings (legacy compatibility)
      this.canvasElement = document.getElementById(containerSelector);
    }
    
    if (!this.canvasElement) {
      throw new Error(`Canvas container with selector "${containerSelector}" not found`);
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

      // Create layered container structure for layout protection
      this.initializeLayers();

      // Add a background grid to the layout layer
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

    // CRITICAL: Use drawingContainer to protect layout from erasure
    const targetContainer = this.drawingContainer; // Only user drawings, NOT layout

    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      console.log('🎯 EVENT: Passing drawingContainer (layout protected)');
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

    // Add grid to layout layer (behind everything)
    if (this.layoutContainer) {
      this.layoutContainer.addChild(grid);
    }
  }

  /**
   * Initialize the layered container structure
   */
  private initializeLayers(): void {
    if (!this.app) return;

    // Create layout container (protected layer)
    this.layoutContainer = new Container();
    this.layoutContainer.name = 'layout-layer';
    this.layoutContainer.interactive = false; // Prevent direct interaction
    this.app.stage.addChild(this.layoutContainer);

    // Create drawing container (user content layer)
    this.drawingContainer = new Container();
    this.drawingContainer.name = 'drawing-layer';
    this.app.stage.addChild(this.drawingContainer);
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
   * Clear all user drawings from the canvas (LAYOUT PROTECTED)
   * This will NOT erase the pedagogical layout structure
   */
  public clearCanvas(): void {
    if (this.drawingContainer) {
      // Only clear user drawings, preserve layout
      this.drawingContainer.removeChildren();
      console.log('🗑️ User drawings cleared (layout protected)');
    }
  }

  /**
   * DANGEROUS: Clear everything including layout (admin only)
   * This method should be restricted to authorized users
   */
  public clearAll(): void {
    if (this.app) {
      // Clear everything including layout
      this.app.stage.removeChildren();
      
      // Recreate layer structure
      this.initializeLayers();
      
      // Restore layout if it exists
      if (this.layoutBlocks.length > 0) {
        this.renderLayoutAsBackground(this.layoutBlocks);
      }
      
      console.log('⚠️ Everything cleared and restored');
    }
  }  /**
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
      this.layoutContainer = null;
      this.drawingContainer = null;
      this.layoutBlocks = [];
      console.log('PixiJS Canvas destroyed (layout protection cleared)');
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
   * Get the layout container (READ-ONLY - for inspection only)
   * WARNING: Do not modify this container directly!
   */
  public getLayoutContainer(): Container | null {
    console.warn('⚠️ Layout container is READ-ONLY and protected from modification');
    return this.layoutContainer;
  }

  /**
   * Check if the layout is currently protected
   */
  public isLayoutProtected(): boolean {
    return this.layoutBlocks.length > 0;
  }

  /**
   * Get current protected layout blocks (READ-ONLY)
   */
  public getProtectedLayout(): readonly any[] {
    return Object.freeze([...this.layoutBlocks]);
  }

  /**
   * Check if a coordinate is within a user-editable area
   * Returns the area information if editable, null if in protected layout area
   */
  public isCoordinateEditable(x: number, y: number): { editable: boolean; area?: any; reason?: string } {
    if (!this.isLayoutProtected()) {
      return { editable: true, reason: 'No layout protection active' };
    }

    // Check if coordinates are within any layout area that allows user content
    for (const block of this.layoutBlocks) {
      if (block.areas) {
        for (const area of block.areas) {
          if (x >= area.x && x <= area.x + area.width && 
              y >= area.y && y <= area.y + area.height) {
            // Found the area - check if it allows user content
            return {
              editable: area.allowsDrawing || area.allowsMedia || area.allowsText,
              area: area,
              reason: area.allowsDrawing || area.allowsMedia || area.allowsText 
                ? `Within editable area: ${area.areaId}`
                : `Within protected area: ${area.areaId}`
            };
          }
        }
      }
    }

    return { 
      editable: false, 
      reason: 'Outside defined layout areas - layout structure is protected' 
    };
  }

  /**
   * Get the tool manager (for advanced tool operations)
   */
  public getToolManager(): ToolManager {
    return this.toolManager;
  }

  /**
   * Render layout as PROTECTED background structure
   * This layout cannot be erased by normal user actions
   */
  public renderLayoutAsBackground(layoutBlocks: any[]): void {
    if (!this.app || !this.layoutContainer) return;

    // Store layout blocks for protection and restoration
    this.layoutBlocks = [...layoutBlocks];

    // Clear only the layout container, not user drawings
    this.layoutContainer.removeChildren();

    // Create main background
    const background = new Graphics();
    background.rect(0, 0, this.app.screen.width, this.app.screen.height);
    background.fill(0xffffff);
    this.layoutContainer.addChild(background);

    // Add grid to layout layer
    this.addBackgroundGrid();

    // Render each layout block as a PROTECTED background section
    console.log(`🔒 Rendering ${layoutBlocks.length} PROTECTED layout blocks:`, layoutBlocks.map(b => `${b.blockId}: ${b.width}x${b.height}`));
    
    for (const block of layoutBlocks) {
      console.log(`🔒 Rendering PROTECTED block ${block.blockId}: ${block.width}x${block.height} at (${block.x}, ${block.y})`);
      
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
      
      // Mark this as protected layout content
      blockGraphics.name = `layout-block-${block.blockId}`;
      blockGraphics.interactive = false; // Prevent user interaction
      
      this.layoutContainer.addChild(blockGraphics);

      // Add block title - use consistent font size regardless of block height
      const blockTitle = new Text({
        text: block.blockId.charAt(0).toUpperCase() + block.blockId.slice(1),
        style: {
          fontFamily: 'Arial',
          fontSize: 16, // Fixed font size for consistency across all blocks
          fill: 0x333333, // Darker text for better visibility
          fontWeight: 'bold'
        }
      });
      
      blockTitle.position.set(block.x + 15, block.y + 12); // Increased padding
      blockTitle.name = `layout-title-${block.blockId}`;
      blockTitle.interactive = false; // Prevent user interaction
      this.layoutContainer.addChild(blockTitle);

      // Render sub-areas if they exist
      for (const area of block.areas || []) {
        const areaGraphics = new Graphics();
        
        // Dashed border for areas
        areaGraphics.rect(area.x + 1, area.y + 1, area.width - 2, area.height - 2);
        areaGraphics.stroke({ width: 1, color: 0x999999, alpha: 0.4 });
        
        areaGraphics.name = `layout-area-${area.areaId}`;
        areaGraphics.interactive = false; // Prevent user interaction
        this.layoutContainer.addChild(areaGraphics);

        // Area title (smaller text) - use consistent font size regardless of area height
        if (area.height > 20) { // Reduced threshold
          const areaTitle = new Text({
            text: area.areaId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            style: {
              fontFamily: 'Arial',
              fontSize: 12, // Fixed font size for consistency across all areas
              fill: 0x555555, // Darker for better visibility
              fontStyle: 'italic'
            }
          });
          
          areaTitle.position.set(area.x + 20, area.y + area.height / 2 - 6);
          areaTitle.name = `layout-area-title-${area.areaId}`;
          areaTitle.interactive = false; // Prevent user interaction
          this.layoutContainer.addChild(areaTitle);
        }

        // Render template content if available
        if (area.content && typeof area.content === 'string' && area.content.trim()) {
          const contentText = new Text({
            text: area.content,
            style: {
              fontFamily: 'Arial',
              fontSize: 10,
              fill: 0x666666,
              wordWrap: true,
              wordWrapWidth: area.width - 40, // Leave padding
              breakWords: true
            }
          });
          
          // Position content below the area title if it exists, otherwise at the top
          const contentY = area.height > 20 ? area.y + 30 : area.y + 10;
          contentText.position.set(area.x + 20, contentY);
          contentText.name = `layout-content-${area.areaId}`;
          contentText.interactive = false; // Prevent user interaction
          this.layoutContainer.addChild(contentText);
        }
      }
    }

    console.log('🔒 PROTECTED layout structure rendered - cannot be erased by users');
  }

  /**
   * Update canvas margins - this affects the overall canvas drawing area
   */
  public updateMargins(margins: { top: number; bottom: number; left: number; right: number }): void {
    console.log('📏 PixiCanvas: Updating margins', margins);
    
    // For now, we'll store the margins for future use
    // The main layout adjustment is handled by the LayoutManager
    // This method can be extended to add visual margin indicators if needed
    
    // Optional: Add visual margin guides
    this.renderMarginGuides(margins);
  }

  /**
   * Render visual margin guides on the canvas
   */
  private renderMarginGuides(margins: { top: number; bottom: number; left: number; right: number }): void {
    if (!this.app || !this.layoutContainer) return;

    // Remove existing margin guides
    const existingGuides = this.layoutContainer.children.filter(child => child.name?.startsWith('margin-guide'));
    existingGuides.forEach(guide => this.layoutContainer?.removeChild(guide));

    // Create margin guide graphics
    const marginGuides = new Graphics();
    marginGuides.name = 'margin-guides';

    // Draw margin boundaries with subtle lines
    const guideColor = 0xcccccc;
    const guideAlpha = 0.3;
    
    const canvasWidth = this.app.screen.width;
    const canvasHeight = this.app.screen.height;

    // Top margin line
    if (margins.top > 0) {
      marginGuides.moveTo(0, margins.top);
      marginGuides.lineTo(canvasWidth, margins.top);
    }

    // Bottom margin line  
    if (margins.bottom > 0) {
      marginGuides.moveTo(0, canvasHeight - margins.bottom);
      marginGuides.lineTo(canvasWidth, canvasHeight - margins.bottom);
    }

    // Left margin line
    if (margins.left > 0) {
      marginGuides.moveTo(margins.left, 0);
      marginGuides.lineTo(margins.left, canvasHeight);
    }

    // Right margin line
    if (margins.right > 0) {
      marginGuides.moveTo(canvasWidth - margins.right, 0);
      marginGuides.lineTo(canvasWidth - margins.right, canvasHeight);
    }

    marginGuides.stroke({ width: 1, color: guideColor, alpha: guideAlpha });
    marginGuides.interactive = false; // Prevent user interaction
    
    // Add to layout container so it appears behind user content but above background
    this.layoutContainer.addChildAt(marginGuides, 0);

    console.log('📏 PixiCanvas: Margin guides rendered');
  }
}
