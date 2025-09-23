/**
 * VirtualCanvas - Large Virtual World Management with Smart Culling
 * 
 * Creates a virtual canvas that's 10x larger than the viewport while only
 * rendering objects within the visible area for optimal performance.
 * 
 * Features:
 * - Virtual world coordinates (12000x18000 - 10x larger than artboard)
 * - Smart object culling based on viewport bounds
 * - Pixi-viewport integration for smooth zoom/pan
 * - World-to-screen coordinate translation
 * - Export utilities that strip out-of-bounds content
 */

import { Application, Container, Rectangle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { ObjectCuller } from './ObjectCuller';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ARTBOARD_WIDTH, ARTBOARD_HEIGHT } from '../utils/canvasSizing';

export interface VirtualCanvasConfig {
  // Screen dimensions (visible area)
  screenWidth: number;
  screenHeight: number;
  
  // Virtual world dimensions (10x larger)
  worldWidth?: number;
  worldHeight?: number;
  
  // Culling settings
  cullPadding?: number; // Extra padding around viewport for culling
  maxVisibleObjects?: number; // Maximum objects to render at once
  
  // Viewport settings
  enableZoom?: boolean;
  enablePan?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export class VirtualCanvas {
  private app: Application;
  private viewport!: Viewport;
  private worldContainer!: Container;
  private culler: ObjectCuller;
  
  // Dimensions
  private readonly screenWidth: number;
  private readonly screenHeight: number;
  private readonly worldWidth: number;
  private readonly worldHeight: number;
  
  // Artboard bounds (the "main canvas" for export)
  private readonly artboardBounds: Rectangle;
  
  // Performance settings
  private readonly cullPadding: number;
  private readonly maxVisibleObjects: number;
  
  // Culling state
  private lastCullBounds: Rectangle = new Rectangle();
  private cullFrameCount = 0;
  private readonly CULL_FREQUENCY = 5; // Cull every 5 frames for performance
  
  // Object tracking
  private readonly trackedObjects = new Map<string, Container>();
  private readonly visibleObjects = new Set<string>();
  
  constructor(app: Application, config: VirtualCanvasConfig) {
    this.app = app;
    this.screenWidth = config.screenWidth;
    this.screenHeight = config.screenHeight;
    
    // Virtual world is 10x larger than screen
    this.worldWidth = config.worldWidth || CANVAS_WIDTH; // 12000
    this.worldHeight = config.worldHeight || CANVAS_HEIGHT; // 18000
    
    // Performance settings
    this.cullPadding = config.cullPadding || 200; // 200px padding for smooth scrolling
    this.maxVisibleObjects = config.maxVisibleObjects || 1000;
    
    // Define artboard bounds (center of virtual world)
    const artboardX = (this.worldWidth - ARTBOARD_WIDTH) / 2;
    const artboardY = (this.worldHeight - ARTBOARD_HEIGHT) / 2;
    this.artboardBounds = new Rectangle(artboardX, artboardY, ARTBOARD_WIDTH, ARTBOARD_HEIGHT);
    
    this.initializeViewport(config);
    this.initializeCuller();
    this.setupEventHandlers();
    
    console.log(`🌍 VirtualCanvas initialized: ${this.worldWidth}x${this.worldHeight} world, ${this.screenWidth}x${this.screenHeight} viewport`);
    console.log(`📋 Artboard bounds: ${this.artboardBounds.x}, ${this.artboardBounds.y} (${ARTBOARD_WIDTH}x${ARTBOARD_HEIGHT})`);
  }
  
  /**
   * Initialize pixi-viewport for smooth zoom/pan
   */
  private initializeViewport(config: VirtualCanvasConfig): void {
    // Create viewport that manages the virtual world
    this.viewport = new Viewport({
      screenWidth: this.screenWidth,
      screenHeight: this.screenHeight,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      events: this.app.renderer.events
    });
    
    // Add viewport as the root container
    this.app.stage.addChild(this.viewport);
    
    // Create world container inside viewport
    this.worldContainer = new Container();
    this.viewport.addChild(this.worldContainer);
    
    // Configure viewport plugins
    if (config.enablePan !== false) {
      this.viewport
        .drag({
          mouseButtons: 'middle-right' // Use middle/right mouse for panning
        })
        .pinch() // Pinch zoom on touch devices
        .wheel() // Mouse wheel zoom
        .decelerate(); // Smooth deceleration
    }
    
    if (config.enableZoom !== false) {
      this.viewport.clampZoom({
        minScale: config.minZoom || 0.1,
        maxScale: config.maxZoom || 5.0
      });
    }
    
    // Center viewport on artboard initially
    this.centerOnArtboard();
  }
  
  /**
   * Initialize object culler for performance
   */
  private initializeCuller(): void {
    this.culler = new ObjectCuller({
      padding: this.cullPadding,
      maxVisible: this.maxVisibleObjects
    });
  }
  
  /**
   * Set up event handlers for viewport changes
   */
  private setupEventHandlers(): void {
    // Perform culling when viewport moves or zooms
    this.viewport.on('moved', () => this.requestCull());
    this.viewport.on('zoomed', () => this.requestCull());
    
    // Handle app ticker for periodic culling
    this.app.ticker.add(() => this.tick());
  }
  
  /**
   * Application ticker - handles periodic culling
   */
  private tick(): void {
    this.cullFrameCount++;
    
    // Perform culling every N frames to avoid performance hits
    if (this.cullFrameCount >= this.CULL_FREQUENCY) {
      this.performCulling();
      this.cullFrameCount = 0;
    }
  }
  
  /**
   * Request immediate culling (for major viewport changes)
   */
  private requestCull(): void {
    this.cullFrameCount = this.CULL_FREQUENCY; // Force cull on next tick
  }
  
  /**
   * Perform smart object culling based on viewport bounds
   */
  private performCulling(): void {
    const viewportBounds = this.getViewportBounds();
    
    // Skip culling if viewport hasn't moved significantly
    if (this.lastCullBounds.equals(viewportBounds)) {
      return;
    }
    
    this.lastCullBounds = viewportBounds.clone();
    
    // Get culling results
    const cullResults = this.culler.cullObjects(this.trackedObjects, viewportBounds);
    
    // Update visibility
    this.updateObjectVisibility(cullResults.visible, cullResults.hidden);
    
    // Log performance info occasionally
    if (this.cullFrameCount % 60 === 0) { // Every ~1 second at 60fps
      console.log(`🎯 VirtualCanvas: ${cullResults.visible.length}/${this.trackedObjects.size} objects visible`);
    }
  }
  
  /**
   * Update object visibility based on culling results
   */
  private updateObjectVisibility(visible: string[], hidden: string[]): void {
    // Show visible objects
    for (const objectId of visible) {
      const obj = this.trackedObjects.get(objectId);
      if (obj && !obj.visible) {
        obj.visible = true;
        this.visibleObjects.add(objectId);
      }
    }
    
    // Hide culled objects
    for (const objectId of hidden) {
      const obj = this.trackedObjects.get(objectId);
      if (obj && obj.visible) {
        obj.visible = false;
        this.visibleObjects.delete(objectId);
      }
    }
  }
  
  /**
   * Add an object to the virtual world
   */
  public addObject(objectId: string, displayObject: Container, worldX: number, worldY: number): void {
    // Set world position
    displayObject.x = worldX;
    displayObject.y = worldY;
    
    // Add to world container
    this.worldContainer.addChild(displayObject);
    
    // Track for culling
    this.trackedObjects.set(objectId, displayObject);
    
    // Immediate visibility check
    const viewportBounds = this.getViewportBounds();
    const isVisible = this.culler.isObjectVisible(displayObject, viewportBounds);
    displayObject.visible = isVisible;
    
    if (isVisible) {
      this.visibleObjects.add(objectId);
    }
  }
  
  /**
   * Remove an object from the virtual world
   */
  public removeObject(objectId: string): void {
    const obj = this.trackedObjects.get(objectId);
    if (obj) {
      this.worldContainer.removeChild(obj);
      this.trackedObjects.delete(objectId);
      this.visibleObjects.delete(objectId);
    }
  }
  
  /**
   * Get an object by ID
   */
  public getObject(objectId: string): Container | undefined {
    return this.trackedObjects.get(objectId);
  }
  
  /**
   * Move viewport to center on artboard
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
    this.viewport.fitWorld(true);
    
    // Then zoom to fit artboard specifically
    const scale = Math.min(
      (this.screenWidth - padding * 2) / this.artboardBounds.width,
      (this.screenHeight - padding * 2) / this.artboardBounds.height
    );
    
    this.viewport.setZoom(scale, true);
    this.centerOnArtboard();
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
   * Check if a world position is within the artboard bounds
   */
  public isInArtboard(worldX: number, worldY: number): boolean {
    return this.artboardBounds.contains(worldX, worldY);
  }
  
  /**
   * Get all objects within artboard bounds (for export)
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
   * Check if an object overlaps with artboard bounds
   */
  private isObjectInArtboard(obj: Container): boolean {
    const bounds = obj.getBounds();
    
    // Convert Bounds to Rectangle for intersection test
    const objRect = new Rectangle(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );
    
    return this.artboardBounds.intersects(objRect);
  }
  
  /**
   * Get viewport instance for external control
   */
  public getViewport(): Viewport {
    return this.viewport;
  }
  
  /**
   * Get world container for direct access
   */
  public getWorldContainer(): Container {
    return this.worldContainer;
  }
  
  /**
   * Get artboard bounds
   */
  public getArtboardBounds(): Rectangle {
    return this.artboardBounds.clone();
  }
  
  /**
   * Get performance stats
   */
  public getStats(): {
    totalObjects: number;
    visibleObjects: number;
    cullRatio: number;
    worldDimensions: { width: number; height: number };
    viewportDimensions: { width: number; height: number };
  } {
    const cullRatio = this.trackedObjects.size > 0 
      ? this.visibleObjects.size / this.trackedObjects.size 
      : 0;
      
    return {
      totalObjects: this.trackedObjects.size,
      visibleObjects: this.visibleObjects.size,
      cullRatio,
      worldDimensions: { width: this.worldWidth, height: this.worldHeight },
      viewportDimensions: { width: this.screenWidth, height: this.screenHeight }
    };
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.app.ticker.remove(this.tick, this);
    this.viewport.destroy();
    this.trackedObjects.clear();
    this.visibleObjects.clear();
  }
}