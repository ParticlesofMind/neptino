/**
 * Canvas Layer Manager
 * Manages PIXI containers and layering system
 * Single Responsibility: Layer creation and management only
 */

import { Application, Container, Graphics } from "pixi.js";

export class CanvasLayerManager {
  private app: Application;
  private layoutContainer: Container | null = null;
  private drawingContainer: Container | null = null;
  private layoutBlocks: any[] = [];
  private marginGraphics: Graphics | null = null;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Initialize layered container structure
   */
  public initializeLayers(): void {
    // Create layout container (bottom layer - protected)
    this.layoutContainer = new Container();
    this.layoutContainer.label = "layout-layer";
    this.layoutContainer.zIndex = 0;
    this.app.stage.addChild(this.layoutContainer);

    // Create drawing container (top layer - user editable)
    this.drawingContainer = new Container();
    this.drawingContainer.label = "drawing-layer";
    this.drawingContainer.zIndex = 1;
    this.app.stage.addChild(this.drawingContainer);

    // Enable sorting by zIndex
    this.app.stage.sortableChildren = true;

  }

  /**
   * Add background grid to layout layer
   */
  public addBackgroundGrid(): void {
    if (!this.layoutContainer) {
      console.warn("⚠️ Layout container not initialized");
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

    graphics.label = "background-grid";

    this.layoutContainer.addChild(graphics);

  }

  /**
   * Add or update margin boundaries (blue borders)
   */
  public updateMarginBoundaries(margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }): void {
    if (!this.layoutContainer) {
      console.warn("⚠️ Layout container not initialized");
      return;
    }

    // Remove existing margin graphics
    if (this.marginGraphics) {
      this.layoutContainer.removeChild(this.marginGraphics);
      this.marginGraphics.destroy();
    }

    // Create new margin graphics
    this.marginGraphics = new Graphics();
    this.marginGraphics.label = "margin-boundaries";

    const canvasWidth = this.app.screen.width;
    const canvasHeight = this.app.screen.height;

    // Draw margin boundaries with blue color
    const marginColor = 0x3b82f6; // Bright blue
    const marginAlpha = 0.8;
    const lineWidth = 2;

    // Top margin line
    if (margins.top > 0) {
      this.marginGraphics.moveTo(0, margins.top);
      this.marginGraphics.lineTo(canvasWidth, margins.top);
    }

    // Bottom margin line
    if (margins.bottom > 0) {
      this.marginGraphics.moveTo(0, canvasHeight - margins.bottom);
      this.marginGraphics.lineTo(canvasWidth, canvasHeight - margins.bottom);
    }

    // Left margin line
    if (margins.left > 0) {
      this.marginGraphics.moveTo(margins.left, 0);
      this.marginGraphics.lineTo(margins.left, canvasHeight);
    }

    // Right margin line
    if (margins.right > 0) {
      this.marginGraphics.moveTo(canvasWidth - margins.right, 0);
      this.marginGraphics.lineTo(canvasWidth - margins.right, canvasHeight);
    }

    // Style the margin lines
    this.marginGraphics.stroke({
      width: lineWidth,
      color: marginColor,
      alpha: marginAlpha,
    });

    // Add margin area overlay (very subtle fill)
    // Top margin area
    if (margins.top > 0) {
      this.marginGraphics.rect(0, 0, canvasWidth, margins.top);
      this.marginGraphics.fill({ color: marginColor, alpha: 0.05 });
    }

    // Bottom margin area
    if (margins.bottom > 0) {
      this.marginGraphics.rect(
        0,
        canvasHeight - margins.bottom,
        canvasWidth,
        margins.bottom,
      );
      this.marginGraphics.fill({ color: marginColor, alpha: 0.05 });
    }

    // Left margin area
    if (margins.left > 0) {
      this.marginGraphics.rect(0, 0, margins.left, canvasHeight);
      this.marginGraphics.fill({ color: marginColor, alpha: 0.05 });
    }

    // Right margin area
    if (margins.right > 0) {
      this.marginGraphics.rect(
        canvasWidth - margins.right,
        0,
        margins.right,
        canvasHeight,
      );
      this.marginGraphics.fill({ color: marginColor, alpha: 0.05 });
    }

    this.layoutContainer.addChild(this.marginGraphics);

  }

  /**
   * Clear margin boundaries
   */
  public clearMarginBoundaries(): void {
    if (this.marginGraphics && this.layoutContainer) {
      this.layoutContainer.removeChild(this.marginGraphics);
      this.marginGraphics.destroy();
      this.marginGraphics = null;
    }
  }

  /**
   * Clear user drawings (preserve layout)
   */
  public clearDrawingLayer(): void {
    if (this.drawingContainer) {
      this.drawingContainer.removeChildren();
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
  }

  /**
   * Remove layout block
   */
  public removeLayoutBlock(blockId: string): void {
    this.layoutBlocks = this.layoutBlocks.filter(
      (block) => block.id !== blockId,
    );
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
  }

  /**
   * Get layer information
   */
  public getLayerInfo(): any {
    return {
      layoutContainer: {
        exists: !!this.layoutContainer,
        children: this.layoutContainer?.children.length || 0,
        name: this.layoutContainer?.name || "none",
      },
      drawingContainer: {
        exists: !!this.drawingContainer,
        children: this.drawingContainer?.children.length || 0,
        name: this.drawingContainer?.name || "none",
      },
      layoutBlocks: this.layoutBlocks.length,
    };
  }

  /**
   * Destroy all layers
   */
  public destroy(): void {
    // Clean up margin graphics
    if (this.marginGraphics) {
      this.marginGraphics.destroy();
      this.marginGraphics = null;
    }

    if (this.layoutContainer) {
      this.layoutContainer.destroy({ children: true });
      this.layoutContainer = null;
    }
    if (this.drawingContainer) {
      this.drawingContainer.destroy({ children: true });
      this.drawingContainer = null;
    }
    this.layoutBlocks = [];
  }
}
