/**
 * CanvasLayers - Layer Container Management
 * 
 * Responsibilities:
 * - Create and manage layer containers (background, drawing, UI)
 * - Handle layer visibility and z-ordering
 * - Add background graphics (white fill, optional grid)
 * - Provide access to specific layers for other systems
 * 
 * Target: ~120 lines
 */

import { Application, Container, Graphics } from 'pixi.js';
import { canvasDimensionManager } from '../utils/CanvasDimensionManager';

export interface LayerSystem {
  background: Container;
  layout: Container;
  drawing: Container;
  ui: Container;
}

export class CanvasLayers {
  private app: Application;
  private layers: LayerSystem;
  private backgroundGraphics: Graphics | null = null;

  constructor(app: Application) {
    this.app = app;
    this.layers = this.createLayers();
  }

  /**
   * Create the four-layer system
   */
  private createLayers(): LayerSystem {
    // Create containers
    const background = new Container();
    const layout = new Container();
    const drawing = new Container();
    const ui = new Container();

    // Set labels for debugging
    background.label = 'background-layer';
    layout.label = 'layout-layer';
    drawing.label = 'drawing-layer';
    ui.label = 'ui-layer';

    // Set z-index for proper ordering
    background.zIndex = 0;
    layout.zIndex = 1;
    drawing.zIndex = 2;
    ui.zIndex = 3;

    // Enable z-index sorting within the UI layer so helper overlays (guides, cursors)
    // can reliably render above other UI elements
    ui.sortableChildren = true;

    // Add to stage
    this.app.stage.addChild(background);
    this.app.stage.addChild(layout);
    this.app.stage.addChild(drawing);
    this.app.stage.addChild(ui);

    // Enable z-index sorting
    this.app.stage.sortableChildren = true;


    return { background, layout, drawing, ui };
  }

  /**
   * Initialize layers with default content
   */
  public initialize(): void {
    this.addBackgroundFill();
    // Could add grid here later: this.addBackgroundGrid();
  }

  /**
   * Add white background fill to prevent transparency
   */
  private addBackgroundFill(): void {
    this.backgroundGraphics = new Graphics();
    
    const canvasDims = canvasDimensionManager.getCurrentDimensions();
    
    // Simple white background for the canvas
    this.backgroundGraphics
      .rect(0, 0, canvasDims.width, canvasDims.height)
      .fill({ color: 0xffffff, alpha: 1 });

    this.backgroundGraphics.label = 'background-fill';
    this.layers.background.addChild(this.backgroundGraphics);
  }

  /**
   * Add optional grid to background (for future use)
   */
  public addGrid(gridSize: number = 20, color: number = 0xf0f0f0): void {
    const gridGraphics = new Graphics();
    const width = (this.app as any).screen?.width || this.app.renderer.screen.width;
    const height = (this.app as any).screen?.height || this.app.renderer.screen.height;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      gridGraphics.moveTo(x, 0).lineTo(x, height);
    }

    // Horizontal lines  
    for (let y = 0; y <= height; y += gridSize) {
      gridGraphics.moveTo(0, y).lineTo(width, y);
    }

    gridGraphics.stroke({ color, width: 1, alpha: 0.3 });
    gridGraphics.label = 'background-grid';
    
    this.layers.background.addChild(gridGraphics);
  }

  /**
   * Get specific layer container
   */
  public getLayer(layerName: keyof LayerSystem): Container {
    return this.layers[layerName];
  }

  /**
   * Get all layers
   */
  public getAllLayers(): LayerSystem {
    return this.layers;
  }

  /**
   * Clear a specific layer
   */
  public clearLayer(layerName: keyof LayerSystem): void {
    const layer = this.layers[layerName];
    
    if (layerName === 'background') {
      // Don't clear background - just reset it
      layer.removeChildren();
      this.addBackgroundFill();
    } else {
      layer.removeChildren();
    }

  }

  /**
   * Clear all user content (preserve background)
   */
  public clearUserContent(): void {
    this.clearLayer('drawing');
    this.clearLayer('ui');
  }

  /**
   * Hide/show specific layer
   */
  public setLayerVisibility(layerName: keyof LayerSystem, visible: boolean): void {
    this.layers[layerName].visible = visible;
  }

  /**
   * Get layer information for debugging
   */
  public getLayerInfo(): any {
    return {
      background: {
        children: this.layers.background.children.length,
        visible: this.layers.background.visible,
        zIndex: this.layers.background.zIndex
      },
      layout: {
        children: this.layers.layout.children.length,
        visible: this.layers.layout.visible,
        zIndex: this.layers.layout.zIndex
      },
      drawing: {
        children: this.layers.drawing.children.length,
        visible: this.layers.drawing.visible,
        zIndex: this.layers.drawing.zIndex
      },
      ui: {
        children: this.layers.ui.children.length,
        visible: this.layers.ui.visible,
        zIndex: this.layers.ui.zIndex
      }
    };
  }

  /**
   * Destroy all layers
   */
  public destroy(): void {
    try {
      Object.values(this.layers).forEach(layer => {
        if (layer && !layer.destroyed) {
          layer.destroy({ children: true });
        }
      });
    } catch (error) {
      console.warn('⚠️ Error destroying canvas layers:', error);
    }

    this.backgroundGraphics = null;
  }
}
