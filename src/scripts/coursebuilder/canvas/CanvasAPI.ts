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

import { Application, Container, Assets, Sprite, Graphics, Text, Texture } from 'pixi.js';
import { VideoSource } from 'pixi.js';
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
  // Placement configuration per media type
  private placementMode: Record<string, 'center' | 'topleft'> = {
    images: 'center',
    videos: 'center',
    audio: 'center',
    text: 'center',
    files: 'topleft',
    plugins: 'topleft',
    links: 'topleft',
  };
  
  // Performance: Debounce canvas resize operations
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingResizeOperation: { width: number; height: number } | null = null;
  
  // Performance monitoring
  private resizeCount = 0;
  private lastResizeTime = 0;

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
      try { (window as any).toolManager = this.toolManager; } catch {}

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

  /** Configure placement mode for a media type */
  public setPlacementMode(type: string, mode: 'center' | 'topleft') {
    this.placementMode[type] = mode;
  }

  private getPlacementMode(type: string): 'center' | 'topleft' {
    return this.placementMode[type] || 'center';
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
    const app = this.getApp();
    if (!app) return { width: 0, height: 0 };
    try {
      const screen = (app as any).screen || app.renderer.screen;
      return { width: screen.width, height: screen.height };
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

  /** Copy selected objects */
  public copySelection(): boolean {
    if (!this.events) return false;
    return this.events.copySelection();
  }

  /** Paste previously copied selection */
  public pasteSelection(): boolean {
    if (!this.events) return false;
    return this.events.pasteSelection();
  }

  /** Group selection into a container */
  public groupSelection(): boolean {
    if (!this.events) return false;
    return (this.events as any).groupSelection();
  }

  /** Ungroup selected containers */
  public ungroupSelection(): boolean {
    if (!this.events) return false;
    return (this.events as any).ungroupSelection();
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
      if (this.getPlacementMode('images') === 'center') {
        try { (sprite as any).anchor?.set?.(0.5); } catch {}
      }
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
    const created = this.displayManager.createText(text, style);
    const id = created.id;
    if (this.getPlacementMode('text') === 'center') {
      try { (created.text as any).anchor?.set?.(0.5); } catch {}
    }
    try {
      created.text.x = x;
      created.text.y = y;
    } catch {
      this.displayManager.setPosition(id, x, y);
    }
    return id;
  }

  /**
   * Add a simple audio placeholder (uses text label)
   */
  public addAudioPlaceholder(title: string): string | null {
    return this.addText(`🔈 ${title}`, 80, 80, { fontFamily: 'Arial', fontSize: 16, fill: 0x4a79a4 });
  }

  /**
   * Add a video element with proper sizing using PIXI v8 VideoSource
   * - Waits for the first frame before creating the texture to avoid blank sprites
   * - Uses VideoSource autoUpdate instead of manual RAF loops
   * - Attaches listeners before setting src to avoid race conditions
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
    container.sortableChildren = true;

    // Start with conservative placeholder dimensions (16:9). We'll swap to natural size then scale down.
    const canvasDims = this.getDimensions();
    const targetWidth = Math.round((canvasDims?.width || 900) * 0.12); // ~12% of canvas width
    const PLACEHOLDER_WIDTH = Math.max(120, Math.min(240, targetWidth));
    const PLACEHOLDER_HEIGHT = Math.round(PLACEHOLDER_WIDTH * 9 / 16);
    // Track current content size (updated after metadata load)
    let contentW = PLACEHOLDER_WIDTH;
    let contentH = PLACEHOLDER_HEIGHT;

    // Create HTML video element and attach listeners BEFORE setting src
    const video = document.createElement('video');
    // crossOrigin helps when drawing video to WebGL textures from other domains
    try { video.crossOrigin = 'anonymous'; } catch {}
    video.playsInline = true;
    video.muted = true; // allow autoplay when user clicks without sound issues
    video.loop = true;
    // Use 'auto' to ensure first frames are fetched; VideoSource will handle timing
    video.preload = 'auto';
    // Optimize video quality settings
    video.style.objectFit = 'cover';
    if ('requestVideoFrameCallback' in video) {
      // Enable high-quality video processing where supported
      video.setAttribute('playsinline', 'true');
    }

    // Create a placeholder background first
    const placeholder = new Graphics();
    placeholder.roundRect(0, 0, contentW, contentH, 8)
      .fill({ color: 0x2a2a2a })
      .stroke({ color: 0x059669, width: 2 });
    container.addChild(placeholder);
    if (this.getPlacementMode('videos') === 'center') {
      try { container.pivot.set(contentW / 2, contentH / 2); } catch {}
    }
    
    // Add video icon in center as placeholder - sized appropriately for smaller video
    const videoIcon = new Text({
      text: '🎬',
      style: { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff } // Reduced from 32 to 24
    });
    videoIcon.anchor.set(0.5);
    videoIcon.x = contentW / 2;
    videoIcon.y = contentH / 2 - 6; // Adjusted offset for better centering
    container.addChild(videoIcon);

    // Helper: wait until we have at least the first frame available
    const waitForFirstFrame = (): Promise<void> => {
      return new Promise((resolve) => {
        // If already ready, resolve immediately
        if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) {
          resolve();
          return;
        }
        const onLoadedData = () => {
          cleanup();
          resolve();
        };
        const onCanPlay = () => {
          cleanup();
          resolve();
        };
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('canplay', onCanPlay);
        };
        video.addEventListener('loadeddata', onLoadedData, { once: true });
        video.addEventListener('canplay', onCanPlay, { once: true });
      });
    };

    // Set src after listeners to avoid race conditions with cached resources
    video.src = url;
    // Kick off preload
    try { video.load(); } catch {}

    // Create sprite/texture AFTER first frame is definitely available
    const videoSprite = new Sprite(Texture.WHITE); // temporary placeholder texture
    videoSprite.width = contentW;
    videoSprite.height = contentH;
    videoSprite.x = 0;
    videoSprite.y = 0;
    videoSprite.visible = false; // hide until texture is ready
    videoSprite.eventMode = 'none'; // ensure overlay gets clicks
    videoSprite.zIndex = 10;
    container.addChild(videoSprite);

    // Build PIXI v8 VideoSource so the texture auto-updates during playback with optimized settings
    const videoSource = new VideoSource({
      resource: video,
      autoLoad: true,     // begin loading immediately
      autoPlay: false,    // do not auto-play; we control via UI
      updateFPS: 30,      // update at 30fps for smoother playback (was 0)
      crossorigin: true,  // set crossorigin on element if possible
      loop: true,
      muted: true,
      playsinline: true,
      preload: true
    });

    // Ensure we wait for first frame, then swap sprite texture
    waitForFirstFrame().then(() => {
      // Create a proper Texture from the VideoSource with quality optimization
      const texture = Texture.from(videoSource);
      // Keep auto-updating frames managed by VideoSource
      try { 
        (texture.source as any).autoUpdate = true;
        // Ensure high-quality scaling
        texture.source.scaleMode = 'linear';
        texture.source.antialias = true;
      } catch {}

      // Determine natural video dimensions
      const naturalW = Math.max(1, video.videoWidth || texture.width || contentW);
      const naturalH = Math.max(1, video.videoHeight || texture.height || contentH);
      contentW = naturalW;
      contentH = naturalH;

      // Swap in the real video texture, set to natural size first
      videoSprite.texture = texture;
      videoSprite.width = contentW;
      videoSprite.height = contentH;
      if (this.getPlacementMode('videos') === 'center') {
        try { container.pivot.set(contentW / 2, contentH / 2); } catch {}
      }

      // Scale down the whole container so short edge is capped (like images)
      const shortEdge = Math.min(contentW, contentH);
      const cap = 200; // match image cap in addImage
      const shrinkScale = Math.min(1, cap / shortEdge);
      container.scale.set(shrinkScale);
      // Keep the play button readable regardless of container scaling
      try { playButton.scale.set(shrinkScale === 0 ? 1 : 1 / shrinkScale); } catch {}

      // Update overlay graphics to match content size before scaling
      try {
        bg.clear().roundRect(0, 0, contentW, contentH, 8).stroke({ color: 0x059669, width: 2 });
        titleBg.clear().roundRect(0, 0, titleText.width + 8, titleText.height + 4, 4)
          .fill({ color: 0x000000, alpha: 0.7 });
        titleBg.x = 5;
        titleBg.y = contentH - titleText.height - 9;
        titleText.x = 9;
        titleText.y = contentH - titleText.height - 7;
        drawPlayButton();
        playButton.position.set(contentW / 2, contentH / 2);
        // Keep only central play button; no controls to layout
      } catch {}

      videoSprite.visible = true;
      placeholder.visible = false;
      videoIcon.visible = false;

      // Try to reset to first frame for consistent thumbnail
      try { if (!video.paused) { video.pause(); } video.currentTime = 0; } catch {}
    }).catch((err) => {
      console.warn('⚠️ Video did not become ready in time:', err);
    });

    // Create background/border
    const bg = new Graphics();
    bg.roundRect(0, 0, contentW, contentH, 8)
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
    titleBg.y = contentH - titleText.height - 9;
    titleBg.zIndex = 900;
    container.addChild(titleBg);
    
    titleText.x = 9;
    titleText.y = contentH - titleText.height - 7;
    (titleText as any).zIndex = 901;
    container.addChild(titleText);
    
    // Create play button overlay with perfect centering
    const playButton = new Graphics();
    const PLAY_BUTTON_SIZE = 44; // Larger, more visible play button
    const drawPlayButton = () => {
      playButton.clear();
      // Draw shapes centered at (0,0). We'll position the graphics to content center.
      // Circular background
      playButton
        .circle(0, 0, PLAY_BUTTON_SIZE)
        .fill({ color: 0x000000, alpha: 0.7 })
        .stroke({ color: 0xffffff, width: 2 });

      // Play triangle centered at origin
      const triangleSize = PLAY_BUTTON_SIZE * 0.5;
      const offsetX = triangleSize * 0.15; // slight visual centering
      playButton
        .moveTo(-triangleSize + offsetX, -triangleSize)
        .lineTo(-triangleSize + offsetX, triangleSize)
        .lineTo(triangleSize + offsetX, 0)
        .closePath()
        .fill({ color: 0xffffff });
    };
    drawPlayButton();
    // Center the button over the video content
    playButton.position.set(contentW / 2, contentH / 2);
    
    playButton.eventMode = 'static';
    playButton.cursor = 'pointer';
    playButton.interactive = true;
    playButton.zIndex = 1000;
    
    let isPlaying = false;

    playButton.on('pointertap', async (event) => {
      event.stopPropagation();

      try {
        // Ensure the first frame/texture is ready before toggling
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onReady = () => { cleanup(); resolve(); };
            const cleanup = () => {
              video.removeEventListener('loadeddata', onReady);
              video.removeEventListener('canplay', onReady);
            };
            video.addEventListener('loadeddata', onReady, { once: true });
            video.addEventListener('canplay', onReady, { once: true });
          });
        }

        if (isPlaying) {
          video.pause();
          playButton.visible = true;
          isPlaying = false;
        } else {
          await video.play();
          // VideoSource autoUpdate should handle texture updates during playback
          playButton.visible = false;
          isPlaying = true;
        }
      } catch (error) {
        console.error('❌ Failed to toggle video playback:', error);
        playButton.visible = true;
        isPlaying = false;
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

    // No additional controls or progress: keep only central play button
    
    // Store metadata for future functionality
    (container as any).metadata = {
      type: 'video',
      url: url,
      title: title,
      // store displayed size after any scaling applied
      width: contentW * container.scale.x,
      height: contentH * container.scale.y,
      videoElement: video
    };
    
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
      if (this.getPlacementMode('audio') === 'center') {
        try { container.pivot.set(width / 2, height / 2); } catch {}
      }

      // Background panel (white with blue border)
      const panel = new Graphics()
        .roundRect(0, 0, width, height, 8)
        .fill({ color: 0xffffff })
        .stroke({ color: 0x80bfff, width: 2, alpha: 1 });
      container.addChild(panel);

      // Play/Pause icon button (blue circle with white symbol)
      const icon = new Graphics();
      icon.eventMode = 'static';
      icon.cursor = 'pointer';
      const drawPlay = () => {
        icon.clear();
        icon.circle(32, height / 2, 14).fill({ color: 0x80bfff });
        icon.poly([27, height / 2 - 8, 27, height / 2 + 8, 41, height / 2]).fill({ color: 0xffffff });
      };
      const drawPause = () => {
        icon.clear();
        icon.circle(32, height / 2, 14).fill({ color: 0x80bfff });
        icon.rect(27, height / 2 - 8, 6, 16).fill({ color: 0xffffff });
        icon.rect(35, height / 2 - 8, 6, 16).fill({ color: 0xffffff });
      };
      drawPlay();
      // Avoid tools intercepting the click
      icon.on('pointerdown', (ev: any) => ev.stopPropagation());
      container.addChild(icon);

      // Title text in black
      const text = new Text({
        text: title,
        style: { fontFamily: 'Arial', fontSize: 13, fill: 0x000000 },
      });
      text.x = 62;
      text.y = 18;
      container.addChild(text);

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

      // Click icon to toggle playback
      icon.on('pointertap', toggle);

      audio.addEventListener('play', () => { playing = true; drawPause(); });
      audio.addEventListener('pause', () => { playing = false; drawPlay(); });
      // No progress updates drawn

      // No additional controls; keep only basic play button

      (container as any).metadata = { type: 'audio', url, title, element: audio };

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
   * Show a transient snap/placement hint around an object by id
   */
  public showSnapHintForId(id: string): void {
    try {
      if (!this.displayManager || !this.layers) return;
      const obj = this.displayManager.get(id as any);
      if (!obj) return;
      const uiLayer = this.layers.getLayer('ui');
      const bounds = obj.getBounds(); // global bounds; layers share stage space
      const gfx = new Graphics();
      gfx.roundRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 6)
        .stroke({ color: 0x2563eb, width: 3, alpha: 1 });
      gfx.zIndex = 9999;
      gfx.name = 'snap-hint';
      (gfx as any).__isVisualAid = true; // Mark for layer filtering
      uiLayer.addChild(gfx);

      // Fade-out animation over ~400ms
      const app = this.getApp();
      if (!app) return;
      let t = 0;
      const dur = 0.4; // seconds
      const cb = (ticker: any) => {
        t += (ticker.deltaMS || 16) / 1000;
        const p = Math.min(1, t / dur);
        gfx.alpha = 1 - p;
        if (p >= 1) {
          app.ticker.remove(cb);
          try { uiLayer.removeChild(gfx); gfx.destroy(); } catch {}
        }
      };
      app.ticker.add(cb);
    } catch {}
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
   * Resize the canvas with performance optimizations and debouncing
   */
  public resize(width: number, height: number): void {
    // Performance tracking
    const now = performance.now();
    this.resizeCount++;
    const timeSinceLastResize = now - this.lastResizeTime;
    
    if (timeSinceLastResize < 50) {
      console.warn(`⚡ Rapid resize detected! ${this.resizeCount} resizes, ${timeSinceLastResize.toFixed(1)}ms since last`);
    }
    this.lastResizeTime = now;
    
    // Store the latest resize request
    this.pendingResizeOperation = { width, height };
    
    // Clear any pending resize timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    
    // Debounce resize operations to prevent rapid calls during viewport changes
    this.resizeDebounceTimer = setTimeout(() => {
      this.performResize();
    }, 16); // ~60fps debounce for smooth resize
  }

  /**
   * Perform the actual resize operation
   */
  private performResize(): void {
    if (!this.pendingResizeOperation) return;
    
    const { width, height } = this.pendingResizeOperation;
    const app = this.getApp();
    if (!app) {
      console.warn('⚠️ Cannot resize - app not ready');
      return;
    }

    // Get current dimensions to avoid unnecessary operations
    const currentDims = this.getDimensions();
    if (currentDims.width === width && currentDims.height === height) {
      this.pendingResizeOperation = null;
      return;
    }

    // Perform the actual resize
    app.renderer.resize(width, height);
    
    // Only update background margins without clearing the entire layer
    if (this.layers) {
      const bg = this.layers.getLayer('background');
      if (bg) {
        try { 
          canvasMarginManager.setContainer(bg); // This triggers visual update automatically
        } catch (e) {
          console.warn('⚠️ Failed to update margin guides:', e);
        }
      }
    }

    this.pendingResizeOperation = null;
  }

  /**
   * Get performance diagnostics for debugging canvas issues
   */
  public getPerformanceDiagnostics() {
    const app = this.getApp();
    const dimensions = this.getDimensions();
    const dpr = window.devicePixelRatio || 1;
    
    return {
      canvas: {
        logicalSize: dimensions,
        actualPixels: {
          width: dimensions.width * dpr,
          height: dimensions.height * dpr,
        },
        totalPixels: dimensions.width * dimensions.height * dpr * dpr,
        devicePixelRatio: dpr,
      },
      performance: {
        resizeCount: this.resizeCount,
        timeSinceLastResize: this.lastResizeTime ? performance.now() - this.lastResizeTime : 0,
        hasPendingResize: !!this.pendingResizeOperation,
      },
      pixi: {
        rendererType: app ? (app.renderer.type === 1 ? 'webgl' : 'canvas') : 'unknown',
        resolution: app ? app.renderer.resolution : 0,
        isWebGL: app ? app.renderer.type === 1 : false,
      },
    };
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
    return 0.6; // Our new default zoom level (displays as 100%)
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
    
  }
}
