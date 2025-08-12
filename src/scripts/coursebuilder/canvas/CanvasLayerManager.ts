/**
 * Canvas Layer Manager
 * Manages PIXI containers and layering system
 * Single Responsibility: Layer creation and management only
 */

import { Application, Container, Graphics } from 'pixi.js';

export class CanvasLayerManager {
  private app: Application;
  private layoutContainer: Container | null = null;
  private drawingContainer: Container | null = null;
  private layoutBlocks: any[] = [];

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Initialize layered container structure
   */
  public initializeLayers(): void {
    // Create layout container (bottom layer - protected)
    this.layoutContainer = new Container();
    this.layoutContainer.label = 'layout-layer';
    this.layoutContainer.zIndex = 0;
    this.app.stage.addChild(this.layoutContainer);

    // Create drawing container (top layer - user editable)
    this.drawingContainer = new Container();
    this.drawingContainer.label = 'drawing-layer';
    this.drawingContainer.zIndex = 1;
    this.app.stage.addChild(this.drawingContainer);

    // Enable sorting by zIndex
    this.app.stage.sortableChildren = true;

    console.log('🏗️ Canvas layers initialized');
    console.log('📐 Layout container (protected) created');
    console.log('✏️ Drawing container (editable) created');
  }

  /**
   * Add background grid to layout layer
   */
  public addBackgroundGrid(): void {
    if (!this.layoutContainer) {
      console.warn('⚠️ Layout container not initialized');
      return;
    }

    const graphics = new Graphics();
    const gridSize = 20;
    const canvasWidth = this.app.screen.width;
    const canvasHeight = this.app.screen.height;

    // Create a more visible background
    graphics.rect(0, 0, canvasWidth, canvasHeight);
    graphics.fill({ color: 0xffffff, alpha: 1 }); // White background

    // Draw grid lines
    graphics.moveTo(0, 0);
    
    // Draw vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, canvasHeight);
    }

    // Draw horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(canvasWidth, y);
    }

    graphics.stroke({ width: 1, color: 0xe0e0e0, alpha: 0.8 });

    graphics.label = 'background-grid';
    
    this.layoutContainer.addChild(graphics);

    console.log('🔲 Enhanced background grid added to layout layer');
  }

  /**
   * Clear user drawings (preserve layout)
   */
  public clearDrawingLayer(): void {
    if (this.drawingContainer) {
      this.drawingContainer.removeChildren();
      console.log('🗑️ Drawing layer cleared (layout protected)');
    }
  }

  /**
   * Clear everything including layout
   */
  public clearAllLayers(): void {
    if (this.layoutContainer) {
      this.layoutContainer.removeChildren();
    }
    if (this.drawingContainer) {
      this.drawingContainer.removeChildren();
    }
    this.layoutBlocks = [];
    
    // Restore background grid
    this.addBackgroundGrid();
    
    console.log('⚠️ All layers cleared and background grid restored');
  }

  /**
   * Get layout container
   */
  public getLayoutContainer(): Container | null {
    return this.layoutContainer;
  }

  /**
   * Get drawing container
   */
  public getDrawingContainer(): Container | null {
    return this.drawingContainer;
  }

  /**
   * Add layout block
   */
  public addLayoutBlock(block: any): void {
    this.layoutBlocks.push(block);
    console.log('📐 Layout block added:', block.name || 'unnamed');
  }

  /**
   * Remove layout block
   */
  public removeLayoutBlock(blockId: string): void {
    this.layoutBlocks = this.layoutBlocks.filter(block => block.id !== blockId);
    console.log('📐 Layout block removed:', blockId);
  }

  /**
   * Get all layout blocks
   */
  public getLayoutBlocks(): any[] {
    return [...this.layoutBlocks];
  }

  /**
   * Clear layout blocks
   */
  public clearLayoutBlocks(): void {
    this.layoutBlocks = [];
    console.log('📐 Layout blocks cleared');
  }

  /**
   * Get layer information
   */
  public getLayerInfo(): any {
    return {
      layoutContainer: {
        exists: !!this.layoutContainer,
        children: this.layoutContainer?.children.length || 0,
        name: this.layoutContainer?.name || 'none'
      },
      drawingContainer: {
        exists: !!this.drawingContainer,
        children: this.drawingContainer?.children.length || 0,
        name: this.drawingContainer?.name || 'none'
      },
      layoutBlocks: this.layoutBlocks.length
    };
  }

  /**
   * Destroy all layers
   */
  public destroy(): void {
    if (this.layoutContainer) {
      this.layoutContainer.destroy({ children: true });
      this.layoutContainer = null;
    }
    if (this.drawingContainer) {
      this.drawingContainer.destroy({ children: true });
      this.drawingContainer = null;
    }
    this.layoutBlocks = [];
    console.log('🗑️ Canvas layers destroyed');
  }
}
