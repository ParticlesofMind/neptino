/**
 * CanvasAPI - Main Public Interface with Tool Integration
 * 
 * Responsibilities:
 * - Provide simple public methods for other systems to use
 * - Coordinate between PixiApp, CanvasLayers, Events, and Tools
 * - Handle initialization sequence with complete system
 * - Provide clean API for common operations and tool management
 * 
 * Target: ~250 lines
 */

import { Application, Container } from 'pixi.js';
import { PixiApp, PixiAppConfig } from './PixiApp';
import { CanvasLayers, LayerSystem } from './CanvasLayers';
import { CanvasEvents } from './CanvasEvents';
import { DisplayObjectManager } from './DisplayObjectManager';
import { ToolManager } from '../tools/ToolManager';
import { canvasMarginManager } from './CanvasMarginManager';
import { ResponsivenessManager, ResponsiveSettings } from './responsiveness';

export class CanvasAPI {
  private pixiApp: PixiApp;
  private layers: CanvasLayers | null = null;
  private events: CanvasEvents | null = null;
  private displayManager: DisplayObjectManager | null = null;
  private toolManager: ToolManager | null = null;
  private responsiveness: ResponsivenessManager | null = null;
  private initialized: boolean = false;

  constructor(containerSelector: string) {
    this.pixiApp = new PixiApp(containerSelector);
  }

  /**
   * Initialize the complete canvas system with tools
   */
  public async init(config?: Partial<PixiAppConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️ Canvas already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing complete canvas system...');

      // Step 1: Create PIXI app
      const app = await this.pixiApp.create(config);
      
      // Step 2: Mount to DOM
      this.pixiApp.mount();

      // Step 3: Create layer system
      this.layers = new CanvasLayers(app);
      this.layers.initialize();

      // Step 4: Create display object manager
      const drawingLayer = this.layers.getLayer('drawing');
      if (!drawingLayer) {
        throw new Error('Drawing layer not available');
      }
      this.displayManager = new DisplayObjectManager(drawingLayer);

      // Step 5: Create tool manager (no arguments needed)
      this.toolManager = new ToolManager();

      // Step 5.1: Connect display manager to tool manager (CRITICAL!)
      this.toolManager.setDisplayManager(this.displayManager);

      // Step 6: Set up event handling
      this.events = new CanvasEvents(app, drawingLayer, this.toolManager);
      this.events.initialize();

      // Step 7: Initialize margin manager with canvas layer
      const backgroundLayer = this.layers.getLayer('background');
      if (backgroundLayer) {
        canvasMarginManager.setContainer(backgroundLayer);
      }

      // Step 8: Initialize responsiveness system
      this.responsiveness = new ResponsivenessManager({
        enabled: true,
        mode: 'window' as any, // Will be properly typed
        maintainAspectRatio: true,
        throttleMs: 16
      });
      
      const containerSelector = this.pixiApp.getContainerSelector();
      await this.responsiveness.initialize(app, containerSelector);

      // Tool manager already sets pen as default, no need to set again

      this.initialized = true;
      console.log('✅ Complete canvas system initialized with tools, margins, and responsiveness');

    } catch (error) {
      console.error('❌ Failed to initialize canvas system:', error);
      throw error;
    }
  }

  /**
   * Check if canvas is ready for use
   */
  public isReady(): boolean {
    return this.initialized && this.pixiApp.isReady();
  }

  /**
   * Get the PIXI application instance
   */
  public getApp(): Application | null {
    return this.pixiApp.getApp();
  }

  /**
   * Get a specific layer container
   */
  public getLayer(layerName: keyof LayerSystem): Container | null {
    if (!this.layers) {
      console.warn('⚠️ Canvas not initialized - cannot get layer');
      return null;
    }
    return this.layers.getLayer(layerName);
  }

  /**
   * Get the drawing layer (most commonly used)
   */
  public getDrawingLayer(): Container | null {
    return this.getLayer('drawing');
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    try {
      return this.pixiApp.getDimensions();
    } catch (error) {
      console.warn('⚠️ Could not get dimensions - canvas not ready:', error);
      return { width: 0, height: 0 };
    }
  }

  // ============== TOOL METHODS ==============

  /**
   * Set active drawing tool
   */
  public setTool(toolName: string): boolean {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot set tool');
      return false;
    }
    return this.events.setActiveTool(toolName);
  }

  /**
   * Get active tool name
   */
  public getActiveTool(): string {
    if (!this.events) return 'none';
    return this.events.getActiveToolName();
  }

  /**
   * Update tool color
   */
  public setToolColor(color: string): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot set color');
      return;
    }
    this.events.updateToolColor(color);
  }

  /**
   * Update tool settings
   */
  public setToolSettings(toolName: string, settings: any): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot set tool settings');
      return;
    }
    this.events.updateToolSettings(toolName, settings);
  }

  /**
   * Get current tool settings
   */
  public getToolSettings(): any {
    if (!this.events) return {};
    return this.events.getToolSettings();
  }

  /**
   * Test tool activation - returns current active tool name
   */
  public testToolActivation(toolName: string): string {
    if (!this.isReady()) return 'canvas-not-ready';
    
    const success = this.setTool(toolName);
    const currentTool = this.getActiveTool();
    
    console.log(`🧪 Tool test: ${toolName} -> ${success ? 'SUCCESS' : 'FAILED'} -> Current: ${currentTool}`);
    return currentTool;
  }

  /**
   * Test drawing readiness (without creating test objects)
   */
  public testDrawing(): boolean {
    const drawingLayer = this.getDrawingLayer();
    if (!drawingLayer) {
      console.error('❌ No drawing layer for test');
      return false;
    }

    try {
      if (this.displayManager) {
        console.log('✅ Test drawing: Canvas and DisplayObjectManager ready');
        console.log('📊 Drawing layer children:', drawingLayer.children.length);
        return true;
      } else {
        console.error('❌ No display manager available');
        return false;
      }
    } catch (error) {
      console.error('❌ Test drawing failed:', error);
      return false;
    }
  }

  // ============== CANVAS METHODS ==============

  /**
   * Clear user drawings (preserve background)
   */
  public clearDrawings(): void {
    if (!this.layers) {
      console.warn('⚠️ Canvas not initialized - cannot clear');
      return;
    }
    
    this.layers.clearUserContent();
    
    // Also clear display object manager
    if (this.displayManager) {
      this.displayManager.clear();
    }
    
    console.log('🧹 User drawings cleared');
  }

  /**
   * Clear specific layer
   */
  public clearLayer(layerName: keyof LayerSystem): void {
    if (!this.layers) {
      console.warn('⚠️ Canvas not initialized - cannot clear layer');
      return;
    }

    this.layers.clearLayer(layerName);
  }

  /**
   * Add background grid (optional visual aid)
   */
  public addGrid(gridSize: number = 20, color: number = 0xf0f0f0): void {
    if (!this.layers) {
      console.warn('⚠️ Canvas not initialized - cannot add grid');
      return;
    }

    this.layers.addGrid(gridSize, color);
  }

  /**
   * Set layer visibility
   */
  public setLayerVisibility(layerName: keyof LayerSystem, visible: boolean): void {
    if (!this.layers) {
      console.warn('⚠️ Canvas not initialized - cannot set visibility');
      return;
    }

    this.layers.setLayerVisibility(layerName, visible);
  }

  /**
   * Enable or disable canvas interactions
   */
  public setInteractionEnabled(enabled: boolean): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot set interaction');
      return;
    }
    this.events.setEnabled(enabled);
  }

  /**
   * Get system information for debugging
   */
  public getCanvasInfo(): any {
    const dimensions = this.getDimensions();
    const layerInfo = this.layers?.getLayerInfo() || null;
    const eventInfo = this.events?.getEventInfo() || null;
    const displayInfo = this.displayManager?.getDebugInfo() || null;

    return {
      initialized: this.initialized,
      ready: this.isReady(),
      canvasAvailable: this.getApp()?.canvas !== undefined,
      dimensions,
      layers: layerInfo,
      events: eventInfo,
      displayObjects: displayInfo,
      pixiVersion: 'v8'
    };
  }

  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): void {
    const app = this.getApp();
    if (!app) {
      console.warn('⚠️ Cannot resize - app not ready');
      return;
    }

    app.renderer.resize(width, height);
    
    // Recreate background to match new size
    if (this.layers) {
      this.layers.clearLayer('background');
    }

    console.log('📐 Canvas resized:', { width, height });
  }

  /**
   * Export canvas as image (basic version)
   */
  public async exportAsImage(): Promise<string> {
    const app = this.getApp();
    if (!app) {
      throw new Error('Cannot export - canvas not ready');
    }

    // Hide UI layer for export
    const uiLayer = this.getLayer('ui');
    const originalVisibility = uiLayer?.visible || false;
    if (uiLayer) uiLayer.visible = false;

    try {
      // For now, return placeholder - we'll implement proper export later
      console.log('📸 Canvas export requested (placeholder)');
      return 'data:image/png;base64,placeholder';

    } finally {
      // Restore UI layer visibility
      if (uiLayer) uiLayer.visible = originalVisibility;
    }
  }

  /**
   * Get responsiveness manager
   */
  public getResponsiveness(): ResponsivenessManager | null {
    return this.responsiveness;
  }

  /**
   * Enable or disable responsiveness
   */
  public setResponsive(enabled: boolean): void {
    if (this.responsiveness) {
      if (enabled) {
        this.responsiveness.enable();
      } else {
        this.responsiveness.disable();
      }
    }
  }

  /**
   * Destroy the entire canvas system
   */
  public destroy(): void {
    if (this.events) {
      this.events.destroy();
      this.events = null;
    }

    if (this.displayManager) {
      this.displayManager.destroy();
      this.displayManager = null;
    }

    if (this.toolManager) {
      this.toolManager.destroy();
      this.toolManager = null;
    }

    if (this.responsiveness) {
      this.responsiveness.destroy();
      this.responsiveness = null;
    }

    if (this.layers) {
      this.layers.destroy();
      this.layers = null;
    }

    this.pixiApp.destroy();
    this.initialized = false;
    
    console.log('🗑️ Complete canvas system destroyed');
  }
}
