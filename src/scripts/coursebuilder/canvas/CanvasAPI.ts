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

import { Application, Container, Assets, Sprite, Graphics, Text } from 'pixi.js';
import { PixiApp, PixiAppConfig } from './PixiApp';
import { CanvasLayers, LayerSystem } from './CanvasLayers';
import { CanvasEvents } from './CanvasEvents';
import { DisplayObjectManager } from './DisplayObjectManager';
import { ToolManager } from '../tools/ToolManager';
import { canvasMarginManager } from './CanvasMarginManager';

export class CanvasAPI {
  private pixiApp: PixiApp;
  private layers: CanvasLayers | null = null;
  private events: CanvasEvents | null = null;
  private displayManager: DisplayObjectManager | null = null;
  private toolManager: ToolManager | null = null;
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

      // Step 4: Create display object manager using drawing layer
      const drawingLayer = this.layers.getLayer('drawing');
      if (!drawingLayer) {
        throw new Error('Drawing layer not available after layer initialization');
      }
      this.displayManager = new DisplayObjectManager(drawingLayer);
      // Expose for snapping helpers that need read-only access
      try { (window as any)._displayManager = this.displayManager; } catch {}

      // Step 5: Create tool manager
      this.toolManager = new ToolManager();

      // Step 5.1: Connect display manager to tool manager (CRITICAL!)
      this.toolManager.setDisplayManager(this.displayManager);

      // Step 5.2: Provide UI layer to tools so helper visuals stay separate from drawing content
      const uiLayer = this.layers.getLayer('ui');
      if (uiLayer && this.toolManager) {
        this.toolManager.setUILayer(uiLayer);
      }

      // Step 6: Set up event handling
      this.events = new CanvasEvents(app, drawingLayer, this.toolManager);
      this.events.initialize();

      // Step 7: Initialize margin manager with background layer
      const backgroundLayer = this.layers.getLayer('background');
      if (backgroundLayer) {
        canvasMarginManager.setContainer(backgroundLayer);
      }

      this.initialized = true;
      console.log('✅ Canvas system initialized successfully');

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
   * Apply settings to current selection (without switching tools)
   */
  public applySettingsToSelection(toolName: string, settings: any): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot apply selection settings');
      return;
    }
    this.events.applySettingsToSelection(toolName, settings);
  }

  /**
   * Get current tool settings
   */
  public getToolSettings(): any {
    if (!this.events) return {};
    return this.events.getToolSettings();
  }

  /**
   * Enable canvas drawing events (allow drawing tools to work)
   */
  public enableDrawingEvents(): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot enable drawing events');
      return;
    }
    this.events.enableDrawingEvents();
  }

  /**
   * Disable canvas drawing events (for grab tool, etc.)
   */
  public disableDrawingEvents(): void {
    if (!this.events) {
      console.warn('⚠️ Canvas not initialized - cannot disable drawing events');
      return;
    }
    this.events.disableDrawingEvents();
  }

  /**
   * Check if drawing events are enabled
   */
  public areDrawingEventsEnabled(): boolean {
    if (!this.events) return false;
    return this.events.areDrawingEventsEnabled();
  }

  // ============== SIMPLE CONTENT HELPERS ==============

  /**
   * Add an image sprite to the drawing layer
   */
  public async addImage(url: string, x: number = 50, y: number = 50, scale: number = 1): Promise<string | null> {
    if (!this.displayManager) {
      console.warn('⚠️ Canvas not initialized - cannot add image');
      return null;
    }
    try {
      const texture = await Assets.load(url);
      const sprite = new Sprite(texture);
      sprite.x = x;
      sprite.y = y;
      // Normalize initial size: cap short edge to 200px (no upscaling)
      const w = texture.width || 1;
      const h = texture.height || 1;
      const shortEdge = Math.min(w, h);
      const cap = 200;
      const fitScale = Math.min(1, cap / shortEdge);
      const finalScale = (scale ?? 1) * fitScale;
      sprite.scale.set(finalScale);
      const id = this.displayManager.add(sprite);
      return id;
    } catch (e) {
      console.error('❌ Failed to add image:', e);
      return null;
    }
  }

  /**
   * Add a simple text object to the drawing layer
   */
  public addText(text: string, x: number = 60, y: number = 60, style: any = { fontFamily: 'Arial', fontSize: 18, fill: 0x1a1a1a }): string | null {
    if (!this.displayManager) {
      console.warn('⚠️ Canvas not initialized - cannot add text');
      return null;
    }
    const { id } = this.displayManager.createText(text, style);
    this.displayManager.setPosition(id, x, y);
    return id;
  }

  /**
   * Add a simple audio placeholder (uses text label)
   */
  public addAudioPlaceholder(title: string): string | null {
    return this.addText(`🔈 ${title}`, 80, 80, { fontFamily: 'Arial', fontSize: 16, fill: 0x4a79a4 });
  }

  /**
   * Add a video element with proper sizing - simplified approach
   */
  public addVideoElement(url: string, title: string = 'Video', x: number = 50, y: number = 50, _posterUrl?: string): string | null {
    if (!this.displayManager) {
      console.warn('⚠️ Canvas not initialized - cannot add video element');
      return null;
    }

    // Create a simple container with consistent dimensions
    const { container, id } = this.displayManager.createContainer();
    container.x = x;
    container.y = y;

    // Standard video dimensions (16:9 aspect ratio)
    const VIDEO_WIDTH = 320;
    const VIDEO_HEIGHT = 180;
    
    // Create HTML video element
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata'; // Load metadata and first frame for thumbnail
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    
    // Create a placeholder background first
    const placeholder = new Graphics();
    placeholder.roundRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT, 8)
      .fill({ color: 0x2a2a2a })
      .stroke({ color: 0x059669, width: 2 });
    container.addChild(placeholder);
    
    // Add video icon in center as placeholder
    const videoIcon = new Text({
      text: '🎬',
      style: { fontFamily: 'Arial', fontSize: 32, fill: 0xffffff }
    });
    videoIcon.anchor.set(0.5);
    videoIcon.x = VIDEO_WIDTH / 2;
    videoIcon.y = VIDEO_HEIGHT / 2 - 10;
    container.addChild(videoIcon);
    
    // Create video sprite from the HTML video element
    const videoSprite = Sprite.from(video);
    // Force the sprite to our desired dimensions, not the video's native size
    videoSprite.width = VIDEO_WIDTH;
    videoSprite.height = VIDEO_HEIGHT;
    videoSprite.x = 0;
    videoSprite.y = 0;
    videoSprite.visible = false; // Hide until we have content
    container.addChild(videoSprite);
    
    let hasLoadedData = false;
    
    // When video metadata loads, show the first frame as thumbnail
    video.addEventListener('loadeddata', () => {
      console.log('📹 Video data loaded, showing thumbnail');
      hasLoadedData = true;
      videoSprite.visible = true;
      placeholder.visible = false;
      videoIcon.visible = false;
      
      // Force size and update texture to show first frame
      videoSprite.width = VIDEO_WIDTH;
      videoSprite.height = VIDEO_HEIGHT;
      if (videoSprite.texture && videoSprite.texture.source) {
        videoSprite.texture.source.update();
      }
    });
    
    // Ensure the sprite maintains our size and updates texture
    const forceSize = () => {
      videoSprite.width = VIDEO_WIDTH;
      videoSprite.height = VIDEO_HEIGHT;
      // Force texture update
      if (videoSprite.texture && videoSprite.texture.source) {
        videoSprite.texture.source.update();
      }
    };
    
    video.addEventListener('loadedmetadata', forceSize);
    video.addEventListener('canplay', forceSize);
    video.addEventListener('playing', forceSize);
    
    // Add a ticker to update video texture during playback
    let ticker: any = null;
    
    video.addEventListener('play', () => {
      console.log('Video started playing');
      if (ticker) return; // Already has ticker
      
      // Create a ticker to update the video texture
      ticker = () => {
        if (video.paused || video.ended) {
          return;
        }
        if (videoSprite.texture && videoSprite.texture.source) {
          videoSprite.texture.source.update();
        }
      };
      
      // Use requestAnimationFrame for smooth updates
      const updateLoop = () => {
        if (!video.paused && !video.ended) {
          ticker();
          requestAnimationFrame(updateLoop);
        }
      };
      requestAnimationFrame(updateLoop);
    });
    
    // Create background/border
    const bg = new Graphics();
    bg.roundRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT, 8)
      .stroke({ color: 0x059669, width: 2 });
    container.addChildAt(bg, 0);
    
    // Add title text
    const titleText = new Text({
      text: title,
      style: { 
        fontFamily: 'Arial', 
        fontSize: 12, 
        fill: 0xffffff,
        padding: 4
      }
    });
    
    // Create background for title text
    const titleBg = new Graphics();
    titleBg.roundRect(0, 0, titleText.width + 8, titleText.height + 4, 4)
      .fill({ color: 0x000000, alpha: 0.7 });
    titleBg.x = 5;
    titleBg.y = VIDEO_HEIGHT - titleText.height - 9;
    container.addChild(titleBg);
    
    titleText.x = 9;
    titleText.y = VIDEO_HEIGHT - titleText.height - 7;
    container.addChild(titleText);
    
    // Create play button overlay
    const playButton = new Graphics();
    const drawPlayButton = () => {
      playButton.clear()
        .circle(VIDEO_WIDTH / 2, VIDEO_HEIGHT / 2, 24)
        .fill({ color: 0x000000, alpha: 0.7 })
        .stroke({ color: 0xffffff, width: 2 })
        .moveTo(VIDEO_WIDTH / 2 - 8, VIDEO_HEIGHT / 2 - 10)
        .lineTo(VIDEO_WIDTH / 2 - 8, VIDEO_HEIGHT / 2 + 10)
        .lineTo(VIDEO_WIDTH / 2 + 10, VIDEO_HEIGHT / 2)
        .closePath()
        .fill({ color: 0xffffff });
    };
    drawPlayButton();
    
    playButton.eventMode = 'static';
    playButton.cursor = 'pointer';
    playButton.interactive = true;
    
    let isPlaying = false;
    
    playButton.on('pointertap', async (event) => {
      event.stopPropagation();
      
      if (!isPlaying) {
        try {
          console.log(`🎬 Attempting to play video: ${title}`);
          console.log(`📹 Video ready state: ${video.readyState}`);
          console.log(`📹 Has loaded data: ${hasLoadedData}`);
          
          if (!hasLoadedData) {
            console.log('⏳ Video not ready yet, waiting for data to load...');
            return;
          }
          
          await video.play();
          playButton.visible = false;
          isPlaying = true;
          
          console.log(`✅ Video playing successfully`);
          
          // Start continuous texture update during playback
          const updateTexture = () => {
            if (!video.paused && !video.ended && videoSprite.texture && videoSprite.texture.source) {
              videoSprite.texture.source.update();
              requestAnimationFrame(updateTexture);
            }
          };
          requestAnimationFrame(updateTexture);
          
        } catch (error) {
          console.error('❌ Failed to play video:', error);
          playButton.visible = true;
        }
      }
    });
    
    // Show play button when video is paused/ended
    video.addEventListener('pause', () => {
      isPlaying = false;
      playButton.visible = true;
    });
    
    video.addEventListener('ended', () => {
      isPlaying = false;
      playButton.visible = true;
    });
    
    container.addChild(playButton);
    
    // Store metadata for future functionality
    (container as any).metadata = {
      type: 'video',
      url: url,
      title: title,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      videoElement: video
    };
    
    console.log(`📹 Video element added: ${title} at (${x}, ${y})`);
    return id;
  }

  /**
   * Add an audio UI container with play/pause and label
   */
  public addAudioElement(url: string, title: string = 'Audio', x: number = 80, y: number = 80): string | null {
    if (!this.displayManager) {
      console.warn('⚠️ Canvas not initialized - cannot add audio element');
      return null;
    }

    try {
      const { container, id } = this.displayManager.createContainer();
      container.x = x;
      container.y = y;
      container.name = `audio:${title}`;
      container.eventMode = 'static';

      const width = 220;
      const height = 56;

      // Background panel
      const panel = new Graphics()
        .roundRect(0, 0, width, height, 8)
        .fill({ color: 0xfffbeb })
        .stroke({ color: 0xd97706, width: 2, alpha: 0.9 });
      container.addChild(panel);

      // Play/Pause icon (simple triangle / square)
      const icon = new Graphics();
      const drawPlay = () => {
        icon.clear();
        icon.poly([18, 16, 18, height - 16, 46, height / 2]);
        icon.fill({ color: 0xd97706 });
      };
      const drawPause = () => {
        icon.clear();
        icon.rect(18, 16, 10, height - 32);
        icon.rect(36, 16, 10, height - 32);
        icon.fill({ color: 0xd97706 });
      };
      drawPlay();
      container.addChild(icon);

      // Title text
      const text = new Text({
        text: title,
        style: { fontFamily: 'Arial', fontSize: 13, fill: 0x7c2d12 },
      });
      text.x = 52;
      text.y = 18;
      container.addChild(text);

      // Simple progress bar background + fill
      const progressBg = new Graphics().roundRect(52, height - 16, width - 66, 6, 3).fill({ color: 0xfde68a });
      const progress = new Graphics().roundRect(52, height - 16, 0, 6, 3).fill({ color: 0xf59e0b });
      container.addChild(progressBg, progress);

      // Underlying HTMLAudioElement for playback
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';

      let playing = false;
      const toggle = () => {
        if (playing) {
          audio.pause();
        } else {
          audio.play().catch(() => {/* ignore */});
        }
      };

      container.on('pointertap', toggle);

      audio.addEventListener('play', () => { playing = true; drawPause(); });
      audio.addEventListener('pause', () => { playing = false; drawPlay(); });
      audio.addEventListener('timeupdate', () => {
        const pct = audio.duration ? Math.min(1, Math.max(0, audio.currentTime / audio.duration)) : 0;
        const w = (width - 66) * pct;
        progress.clear().roundRect(52, height - 16, w, 6, 3).fill({ color: 0xf59e0b });
      });

      (container as any).metadata = { type: 'audio', url, title, element: audio };

      console.log(`🎵 Audio UI added: ${title} at (${x}, ${y})`);
      return id;
    } catch (e) {
      console.error('❌ Failed to add audio element:', e);
      return null;
    }
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
   * Get content bounds (canvas area minus margins) in CSS pixels.
   */
  public getContentBounds(): { left: number; top: number; width: number; height: number } | null {
    const app = this.getApp();
    if (!app || !app.canvas) return null;
    try {
      const rect = app.canvas.getBoundingClientRect();
      const canvasPixelWidth = app.canvas.width || rect.width;
      const canvasPixelHeight = app.canvas.height || rect.height;
      const scaleX = rect.width / canvasPixelWidth;
      const scaleY = rect.height / canvasPixelHeight;
      const margins = canvasMarginManager.getMargins();
      const left = rect.left + margins.left * scaleX;
      const top = rect.top + margins.top * scaleY;
      const width = rect.width - (margins.left + margins.right) * scaleX;
      const height = rect.height - (margins.top + margins.bottom) * scaleY;
      return { left, top, width, height };
    } catch (_e) {
      return null;
    }
  }

  /**
   * Return basic info for top-level objects on the drawing layer
   * Useful for E2E tests to assert creation/movement without leaking Pixi objects
   */
  public getDrawingObjectsInfo(): Array<{ index: number; type: string; name?: string; x: number; y: number; width: number; height: number }> {
    const layer = this.getDrawingLayer();
    if (!layer) return [];
    try {
      return layer.children.map((child: any, index: number) => {
        const b = child.getBounds?.();
        return {
          index,
          type: child.constructor?.name || 'Unknown',
          name: (child as any).name,
          x: typeof child.x === 'number' ? child.x : (b?.x ?? 0),
          y: typeof child.y === 'number' ? child.y : (b?.y ?? 0),
          width: b?.width ?? 0,
          height: b?.height ?? 0,
        };
      });
    } catch (_e) {
      return [];
    }
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
   * Get current zoom level (basic implementation)
   */
  public getZoomLevel(): number {
    return 1.0;
  }

  /**
   * Set zoom level (basic implementation - no-op for now)
   */
  public setZoomLevel(_zoom: number, _smooth: boolean = true): void {
    console.warn('⚠️ Basic zoom not implemented yet');
  }

  /**
   * Check if grid is enabled (basic implementation)
   */
  public isGridEnabled(): boolean {
    return false;
  }

  /**
   * Get viewport instance (basic implementation)
   */
  public getViewport(): any {
    return null;
  }

  /**
   * Clear all debug visuals from the canvas
   */
  public clearDebugVisuals(): void {
    if (!this.toolManager) {
      console.warn('⚠️ Cannot clear debug visuals - tool manager not ready');
      return;
    }

    const selectionTool = this.toolManager.getActiveTool();
    if (selectionTool && 'clearDebugVisuals' in selectionTool) {
      (selectionTool as any).clearDebugVisuals();
    } else {
      // If selection tool is not active, try to get it from the tools map
      const selectionTool = (this.toolManager as any).tools?.get('selection');
      if (selectionTool && 'clearDebugVisuals' in selectionTool) {
        (selectionTool as any).clearDebugVisuals();
      }
    }

    console.log('🧹 Debug visuals cleared from canvas');
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

    if (this.layers) {
      this.layers.destroy();
      this.layers = null;
    }

    this.pixiApp.destroy();
    this.initialized = false;
    
    console.log('🗑️ Complete canvas system destroyed');
  }
}
