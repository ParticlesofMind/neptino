/**
 * LayerVirtualCanvas - Virtual Canvas integrated with existing layer system
 * 
 * Instead of replacing the entire PIXI stage, this integrates pixi-viewport
 * with the existing drawing layer to provide virtual world functionality
 * while preserving the UI and background layers.
 */

import { Application, Container, Rectangle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { ObjectCuller } from './ObjectCuller';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ARTBOARD_WIDTH, ARTBOARD_HEIGHT } from '../utils/canvasSizing';

export interface LayerVirtualCanvasConfig {
  screenWidth: number;
  screenHeight: number;
  worldWidth?: number;
  worldHeight?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  minZoom?: number;
  maxZoom?: number;
  cullPadding?: number;
}

export class LayerVirtualCanvas {
  private app: Application;
  private viewport!: Viewport;
  private drawingLayer: Container;
  private culler!: ObjectCuller;
  
  // Dimensions
  private readonly screenWidth: number;
  private readonly screenHeight: number;
  private readonly worldWidth: number;
  private readonly worldHeight: number;
  
  // Artboard bounds (center of virtual world)
  private readonly artboardBounds: Rectangle;
  
  // Object tracking
  private readonly trackedObjects = new Map<string, Container>();
  private cullFrameCount = 0;
  private readonly CULL_FREQUENCY = 5;
  
  constructor(app: Application, drawingLayer: Container, config: LayerVirtualCanvasConfig) {
    this.app = app;
    this.drawingLayer = drawingLayer;
    this.screenWidth = config.screenWidth;
    this.screenHeight = config.screenHeight;
    
    // Virtual world is 10x larger than screen
    this.worldWidth = config.worldWidth || CANVAS_WIDTH; // 12000
    this.worldHeight = config.worldHeight || CANVAS_HEIGHT; // 18000
    
    // Define artboard bounds (center of virtual world)
    const artboardX = (this.worldWidth - ARTBOARD_WIDTH) / 2;
    const artboardY = (this.worldHeight - ARTBOARD_HEIGHT) / 2;
    this.artboardBounds = new Rectangle(artboardX, artboardY, ARTBOARD_WIDTH, ARTBOARD_HEIGHT);
    
    this.initializeViewport(config);
    this.initializeCuller(config);
    this.setupEventHandlers();
    
    console.log(`🌍 LayerVirtualCanvas initialized: ${this.worldWidth}x${this.worldHeight} world in drawing layer`);
  }
  
  /**
   * Initialize viewport but keep it as a child of the drawing layer
   */
  private initializeViewport(config: LayerVirtualCanvasConfig): void {
    // Create viewport that manages virtual world coordinates
    this.viewport = new Viewport({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      events: this.app.renderer.events
    });
    
    // Make viewport interactive across the entire virtual world
    this.viewport.eventMode = 'static';
    this.viewport.interactiveChildren = true;
    
    // Set hit area to cover the entire virtual world, not just the screen
    this.viewport.hitArea = new Rectangle(0, 0, this.worldWidth, this.worldHeight);
    
    // Add viewport to the drawing layer instead of replacing stage
    this.drawingLayer.addChild(this.viewport);
    
    // Configure viewport plugins
    if (config.enablePan !== false) {
      this.viewport
        .drag({
          mouseButtons: 'middle-right', // Only middle and right mouse for dragging
          keyToPress: null // Don't require any key
        })
        .pinch() // Pinch zoom on touch devices
        .wheel({ // Mouse wheel zoom
          percent: 0.1, // 10% zoom per wheel step
          smooth: 5 // Smooth transition
        })
        .decelerate({ // Smooth deceleration
          friction: 0.95,
          bounce: 0.8,
          minSpeed: 0.01
        });
    }
    
    if (config.enableZoom !== false) {
      this.viewport.clampZoom({
        minScale: config.minZoom || 0.1,
        maxScale: config.maxZoom || 5.0
      });
    }
    
    // Ensure left mouse button events pass through to tools
    this.viewport.pause = false;
    
    console.log('🌍 Viewport configured - left mouse free for tools, middle/right for navigation');
    
    // Center on artboard initially
    this.centerOnArtboard();
    
    console.log(`🌍 Viewport initialized with world hit area: ${this.worldWidth}x${this.worldHeight}`);
  }
  
  /**
   * Initialize object culling
   */
  private initializeCuller(config: LayerVirtualCanvasConfig): void {
    this.culler = new ObjectCuller({
      padding: config.cullPadding || 200,
      maxVisible: 1000
    });
  }
  
  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.viewport.on('moved', () => this.requestCull());
    this.viewport.on('zoomed', () => this.requestCull());
    this.app.ticker.add(() => this.tick());
  }
  
  /**
   * Ticker for periodic culling
   */
  private tick(): void {
    this.cullFrameCount++;
    if (this.cullFrameCount >= this.CULL_FREQUENCY) {
      this.performCulling();
      this.cullFrameCount = 0;
    }
  }
  
  /**
   * Request immediate culling
   */
  private requestCull(): void {
    this.cullFrameCount = this.CULL_FREQUENCY;
  }
  
  /**
   * Perform object culling
   */
  private performCulling(): void {
    const viewportBounds = this.getViewportBounds();
    const cullResults = this.culler.cullObjects(this.trackedObjects, viewportBounds);
    
    // Update visibility
    for (const objectId of cullResults.visible) {
      const obj = this.trackedObjects.get(objectId);
      if (obj && !obj.visible) {
        obj.visible = true;
      }
    }
    
    for (const objectId of cullResults.hidden) {
      const obj = this.trackedObjects.get(objectId);
      if (obj && obj.visible) {
        obj.visible = false;
      }
    }
  }
  
  /**
   * Add object to virtual world (objects get added to viewport, not drawing layer directly)
   */
  public addObject(objectId: string, displayObject: Container, worldX: number, worldY: number): void {
    displayObject.x = worldX;
    displayObject.y = worldY;
    
    // Add to viewport instead of drawing layer
    this.viewport.addChild(displayObject);
    
    // Track for culling
    this.trackedObjects.set(objectId, displayObject);
    
    // Initial visibility check
    const viewportBounds = this.getViewportBounds();
    const isVisible = this.culler.isObjectVisible(displayObject, viewportBounds);
    displayObject.visible = isVisible;
  }
  
  /**
   * Remove object from virtual world
   */
  public removeObject(objectId: string): void {
    const obj = this.trackedObjects.get(objectId);
    if (obj) {
      this.viewport.removeChild(obj);
      this.trackedObjects.delete(objectId);
    }
  }
  
  /**
   * Get object by ID
   */
  public getObject(objectId: string): Container | undefined {
    return this.trackedObjects.get(objectId);
  }
  
  /**
   * Get viewport container (where objects should be added)
   */
  public getContainer(): Container {
    return this.viewport;
  }
  
  /**
   * Get current viewport bounds in world coordinates
   */
  public getViewportBounds(): Rectangle {
    const corner = this.viewport.toWorld(0, 0);
    const opposite = this.viewport.toWorld(this.screenWidth, this.screenHeight);
    
    return new Rectangle(
      corner.x,
      corner.y,
      opposite.x - corner.x,
      opposite.y - corner.y
    );
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldPos = this.viewport.toWorld(screenX, screenY);
    return { x: worldPos.x, y: worldPos.y };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenPos = this.viewport.toScreen(worldX, worldY);
    return { x: screenPos.x, y: screenPos.y };
  }
  
  /**
   * Center viewport on artboard
   */
  public centerOnArtboard(): void {
    this.viewport.moveCenter(
      this.artboardBounds.x + this.artboardBounds.width / 2,
      this.artboardBounds.y + this.artboardBounds.height / 2
    );
  }
  
  /**
   * Fit artboard in viewport
   */
  public fitArtboard(padding: number = 50): void {
    const scale = Math.min(
      (this.screenWidth - padding * 2) / this.artboardBounds.width,
      (this.screenHeight - padding * 2) / this.artboardBounds.height
    );
    
    this.viewport.setZoom(scale, true);
    this.centerOnArtboard();
  }
  
  /**
   * Check if position is in artboard
   */
  public isInArtboard(worldX: number, worldY: number): boolean {
    return this.artboardBounds.contains(worldX, worldY);
  }
  
  /**
   * Get artboard bounds
   */
  public getArtboardBounds(): Rectangle {
    return this.artboardBounds.clone();
  }
  
  /**
   * Get artboard objects for export
   */
  public getArtboardObjects(): Container[] {
    const artboardObjects: Container[] = [];
    
    for (const [, obj] of this.trackedObjects) {
      if (this.isObjectInArtboard(obj)) {
        artboardObjects.push(obj);
      }
    }
    
    return artboardObjects;
  }
  
  /**
   * Check if object is in artboard
   */
  private isObjectInArtboard(obj: Container): boolean {
    const bounds = obj.getBounds();
    const objRect = new Rectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );
    
    return this.artboardBounds.intersects(objRect);
  }
  
  /**
   * Get performance stats
   */
  public getStats(): any {
    const visibleCount = Array.from(this.trackedObjects.values()).filter(obj => obj.visible).length;
    
    return {
      totalObjects: this.trackedObjects.size,
      visibleObjects: visibleCount,
      cullRatio: this.trackedObjects.size > 0 ? visibleCount / this.trackedObjects.size : 0,
      worldDimensions: { width: this.worldWidth, height: this.worldHeight },
      viewportDimensions: { width: this.screenWidth, height: this.screenHeight }
    };
  }
  
  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this.app.ticker.remove(this.tick, this);
    this.viewport.destroy();
    this.trackedObjects.clear();
  }
}