/**
 * VerticalCanvasContainer - Manages Vertical Stacking of Multiple Canvas Applications
 * 
 * Responsibilities:
 * - Create DOM containers for each canvas (e.g., #canvas-wrapper-lesson-1)
 * - Stack canvases vertically in #canvas-scroll-container
 * - Provide scroll-to-canvas functionality
 * - Manage active canvas highlighting
 * - Handle intersection observer for active canvas detection
 * 
 * Target: ~200 lines
 */

import { Application } from 'pixi.js';
import { TemplateLayoutManager, type CanvasDataPayload, type TemplateRenderContext } from './TemplateLayoutManager';
import { CanvasRow } from './MultiCanvasManager';
import { multiCanvasPerformanceMonitor } from './CanvasPerformanceMonitor';
import { CanvasLayers } from './CanvasLayers';
import { CanvasEvents } from './CanvasEvents';
import { DisplayObjectManager } from './DisplayObjectManager';
import { ToolManager } from '../tools/ToolManager';
import { canvasMarginManager } from './CanvasMarginManager';
import { UnifiedZoomManager } from './UnifiedZoomManager';
import type { HighQualityZoom } from './HighQualityZoom';
import { CanvasLifecycleManager } from './CanvasLifecycleManager';

export interface CanvasApplication {
  app: Application | null; // null until lazy-loaded
  canvas: HTMLCanvasElement | null; // Direct canvas reference (wrapper-free)
  placeholder: HTMLDivElement | null;
  templateLayoutManager: TemplateLayoutManager | null; // null until lazy-loaded
  canvasRow: CanvasRow;
  isActive: boolean;
  isLoaded: boolean; // Track if PixiJS app has been created
  
  // Tool system components (null until lazy-loaded)
  layers: CanvasLayers | null;
  events: CanvasEvents | null;
  displayManager: DisplayObjectManager | null;
  toolManager: ToolManager | null;
}

export class VerticalCanvasContainer {
  private scrollContainer: HTMLElement | null = null;
  private canvasApplications: Map<string, CanvasApplication> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private activeCanvasId: string | null = null;
  private scrollCallbacks: ((canvasId: string) => void)[] = [];
  private unifiedZoomManager: UnifiedZoomManager | null = null;

  // Canvas dimensions
  private readonly CANVAS_WIDTH = 1200;
  private readonly CANVAS_HEIGHT = 1800;
  private currentZoomLevel = 1;
  private loadingCanvases: Set<string> = new Set();
  // Performance optimization settings
  private readonly LAZY_LOAD_BUFFER = 0.35; // Load canvases only when ~35% viewport away
  private lifecycleManager = CanvasLifecycleManager.getInstance(1);

  /**
   * Initialize the vertical canvas container system
   */
  public initialize(): void {
    this.createScrollContainer();
    this.setupIntersectionObserver();
    this.ensureSnapMenuElements();
    this.initializeUnifiedZoom();
    
    // Start performance monitoring
    multiCanvasPerformanceMonitor.startMonitoring();
  }

  /**
   * Initialize the unified zoom manager
   */
  private initializeUnifiedZoom(): void {
    this.unifiedZoomManager = new UnifiedZoomManager({
      minZoom: 0.1,  // 10% minimum zoom
      maxZoom: 5.0,  // 500% maximum zoom
      zoomStep: 0.2,
      smoothZoom: true
    });
    
    this.unifiedZoomManager.initialize();
    
    // Set up callback to update spacing and element scaling when zoom changes
    this.unifiedZoomManager.setOnZoomChange((zoom: number) => {
      this.updateCanvasSpacing();
      this.updateCanvasScale(zoom);
    });
    this.updateCanvasScale(this.unifiedZoomManager.getZoomLevel());
    
    // Expose globally for external access
    (window as any).unifiedZoomManager = this.unifiedZoomManager;
    
    console.log('🎯 Unified zoom manager initialized');
  }

  /**
   * Create the main scrollable container (wrapper-free with CSS Grid)
   */
  private createScrollContainer(): void {
    // Find or create the canvas container
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.error('❌ Canvas container not found');
      return;
    }

    canvasContainer.classList.add('canvas--grid', 'multi-canvas-mode');

    // Create grid container (wrapper-free approach)
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.id = 'canvas-grid-container';
    this.scrollContainer.className = 'canvas-grid-container';

    // Preserve existing UI elements (SnapMenu, perspective tools, etc.)
    const existingElements = Array.from(canvasContainer.children);
    const preservedElements: HTMLElement[] = [];
    
    existingElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      // Preserve perspective tools, snap menu, and other UI elements
      if (htmlElement.classList.contains('engine__perspective') || 
          htmlElement.classList.contains('engine__snap-menu') ||
          htmlElement.classList.contains('engine__controls') ||
          htmlElement.hasAttribute('data-snap-anchor') ||
          htmlElement.hasAttribute('data-snap-menu')) {
        preservedElements.push(htmlElement);
      }
    });

    // Clear existing content but preserve UI elements
    canvasContainer.innerHTML = '';
    
    // Re-add preserved elements
    preservedElements.forEach(element => {
      canvasContainer.appendChild(element);
    });
    
    // Add grid container
    canvasContainer.appendChild(this.scrollContainer);

    // Set initial spacing (will be updated when zoom changes)
    this.updateCanvasSpacing();

    console.log('✅ Created wrapper-free grid container, preserved', preservedElements.length, 'UI elements');
  }

  /**
   * Ensure SnapMenu elements are available for the multi-canvas system
   */
  private ensureSnapMenuElements(): void {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.warn('⚠️ Canvas container not found for SnapMenu');
      return;
    }

    // Check if snap menu elements exist
    const snapAnchor = canvasContainer.querySelector('[data-snap-anchor]');
    const snapMenu = canvasContainer.querySelector('[data-snap-menu]');

    if (!snapAnchor || !snapMenu) {
      console.warn('⚠️ SnapMenu elements not found, creating them...');
      this.createSnapMenuElements(canvasContainer);
    } else {
      console.log('✅ SnapMenu elements found');
    }
  }

  /**
   * Create SnapMenu elements if they don't exist
   */
  private createSnapMenuElements(container: HTMLElement): void {
    // Create snap anchor (grid button) if it doesn't exist
    let snapAnchor = container.querySelector('[data-snap-anchor]');
    if (!snapAnchor) {
      snapAnchor = document.createElement('div');
      snapAnchor.className = 'engine__perspective-item';
      snapAnchor.setAttribute('data-snap-anchor', '');
      snapAnchor.setAttribute('data-perspective', 'grid');
      snapAnchor.setAttribute('title', 'Snapping');
      
      snapAnchor.innerHTML = `
        <img src="/src/assets/icons/coursebuilder/perspective/grid-icon.svg" alt="Snapping" class="icon icon--base">
        <span class="icon-label">Grid</span>
      `;
      
      // Add to perspective container
      const perspective = container.querySelector('.engine__perspective');
      if (perspective) {
        perspective.appendChild(snapAnchor);
        console.log('✅ Created snap anchor element');
      }
    }

    // Create snap menu if it doesn't exist
    let snapMenu = container.querySelector('[data-snap-menu]');
    if (!snapMenu) {
      snapMenu = document.createElement('div');
      snapMenu.className = 'engine__snap-menu';
      snapMenu.id = 'snap-menu';
      snapMenu.setAttribute('data-snap-menu', '');
      
      snapMenu.innerHTML = `
        <!-- Smart Guides Toggle -->
        <div class="engine__snap-item engine__snap-item--active" data-snap-option="smart">
          <input type="checkbox" id="smart-guides-toggle" class="engine__snap-toggle-checkbox" checked>
          <span>Smart Guides</span>
        </div>

        <!-- Enhanced Smart Guides Settings -->
        <div class="engine__snap-section">
          <div class="engine__snap-subsection">
            <label>Snap Distance</label>
            <input type="range" id="snap-distance" min="5" max="50" value="20" class="engine__snap-range">
            <span class="engine__snap-value">20px</span>
          </div>
          
          <div class="engine__snap-subsection">
            <label>Grid Spacing</label>
            <input type="range" id="grid-spacing" min="10" max="100" value="20" class="engine__snap-range">
            <span class="engine__snap-value">20px</span>
          </div>
        </div>

        <!-- Distribute Options -->
        <div class="engine__snap-section">
          <div class="engine__snap-item" data-distribute="horizontal">
            <span>Distribute Horizontally</span>
          </div>
          <div class="engine__snap-item" data-distribute="vertical">
            <span>Distribute Vertically</span>
          </div>
        </div>
      `;
      
      container.appendChild(snapMenu);
      console.log('✅ Created snap menu element');
    }
  }

  /**
   * Setup intersection observer to detect active canvas and trigger lazy loading
   */
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const startTime = performance.now();
        
        entries.forEach(entry => {
          const canvasId = entry.target.getAttribute('data-canvas-id');
          if (!canvasId) return;

          if (entry.isIntersecting) {
            // Canvas is visible - lazy load if not already loaded
            this.lazyLoadCanvas(canvasId);
            
            // Set as active canvas (this will expose tools)
            if (canvasId !== this.activeCanvasId) {
              this.setActiveCanvas(canvasId);
            }
          } else {
            // Canvas is not visible - unload if too far away to save memory
            this.lazyUnloadCanvas(canvasId);
          }
        });
        
        // Optimize memory usage after processing entries
        this.optimizeMemoryUsage();
        
        // Record intersection observer performance
        const intersectionTime = performance.now() - startTime;
        multiCanvasPerformanceMonitor.recordIntersectionObserver(intersectionTime);
      },
      {
        root: this.scrollContainer,
        rootMargin: `${this.LAZY_LOAD_BUFFER * 100}% 0px ${this.LAZY_LOAD_BUFFER * 100}% 0px`, // Dynamic buffer
        threshold: [0, 0.1, 0.5, 1.0] // Multiple thresholds for better detection
      }
    );
  }

  /**
   * Create a canvas placeholder and add it directly to the grid (viewport-based lazy loading)
   */
  private createPlaceholderElement(canvasId: string, canvasRow: CanvasRow, subtitleText: string): HTMLDivElement {
    const placeholder = document.createElement('div');
    placeholder.id = `canvas-placeholder-${canvasId}`;
    placeholder.className = 'canvas-placeholder-invisible';
    placeholder.setAttribute('data-canvas-id', canvasId);
    placeholder.setAttribute('data-lesson-number', canvasRow.lesson_number.toString());
    placeholder.setAttribute('data-canvas-index', canvasRow.canvas_index.toString());

    this.applyZoomToPlaceholder(placeholder, this.currentZoomLevel);

    const title = document.createElement('div');
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.textContent = `Lesson ${canvasRow.lesson_number} - Page ${canvasRow.canvas_index}`;

    const subtitle = document.createElement('div');
    subtitle.style.fontSize = '14px';
    subtitle.style.opacity = '0.7';
    subtitle.textContent = subtitleText;

    placeholder.appendChild(title);
    placeholder.appendChild(subtitle);

    return placeholder;
  }

  /**
   * Create a canvas placeholder and add it directly to the grid (viewport-based lazy loading)
   */
  public async createCanvasApplication(canvasRow: CanvasRow): Promise<void> {
    if (!this.scrollContainer) {
      throw new Error('Scroll container not initialized');
    }

    console.log(`🎨 Creating viewport-triggered canvas for: ${canvasRow.id}`);

    // Create invisible placeholder div (not canvas) for intersection observer
    const placeholder = this.createPlaceholderElement(canvasRow.id, canvasRow, 'Scroll to load canvas');

    // Store canvas application (without actual canvas yet - viewport-based loading)
    const canvasApp: CanvasApplication = {
      app: null,
      canvas: null, // No canvas element yet
      placeholder,
      templateLayoutManager: null,
      canvasRow,
      isActive: false,
      isLoaded: false,
      layers: null,
      events: null,
      displayManager: null,
      toolManager: null
    };

    this.canvasApplications.set(canvasRow.id, canvasApp);

    // Add placeholder to grid container
    this.scrollContainer.appendChild(placeholder);

    // Observe placeholder for intersection (triggers canvas creation)
    this.intersectionObserver?.observe(placeholder);

    console.log(`✅ Created viewport-triggered placeholder: ${canvasRow.id}`);
  }

  /**
   * Lazy load a canvas when placeholder enters viewport (viewport-based loading)
   */
  public async lazyLoadCanvas(canvasId: string): Promise<void> {
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || canvasApp.isLoaded || this.loadingCanvases.has(canvasId)) {
      return;
    }
    this.loadingCanvases.add(canvasId);

    console.log(`🔄 Viewport-triggered lazy loading: ${canvasId}`);

    try {
      await this.lifecycleManager.withLoad(
        canvasId,
        () => this.performCanvasLoad(canvasId, canvasApp),
        () => this.ensureCapacityForNewCanvas(canvasId),
      );
    } catch (error) {
      console.error(`❌ Failed to lazy load canvas ${canvasId}:`, error);
    } finally {
      this.loadingCanvases.delete(canvasId);
    }
  }

  private async performCanvasLoad(canvasId: string, canvasApp: CanvasApplication): Promise<boolean> {
    const startTime = performance.now();

    const placeholder = document.getElementById(`canvas-placeholder-${canvasId}`);
    if (!placeholder) {
      console.error(`❌ Placeholder not found for canvas: ${canvasId}`);
      return false;
    }

    const app = new Application();
    await app.init({
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (!this.loadingCanvases.has(canvasId)) {
      await app.destroy(true);
      return false;
    }

    const pixiCanvas = app.canvas;
    pixiCanvas.id = `canvas-${canvasId}`;
    pixiCanvas.className = 'canvas-direct canvas-direct--loaded';
    pixiCanvas.setAttribute('data-canvas-id', canvasId);
    pixiCanvas.setAttribute('data-lesson-number', canvasApp.canvasRow.lesson_number.toString());
    pixiCanvas.setAttribute('data-canvas-index', canvasApp.canvasRow.canvas_index.toString());
    placeholder.parentNode?.replaceChild(pixiCanvas, placeholder);

    canvasApp.canvas = pixiCanvas;
    canvasApp.placeholder = null;

    const layers = new CanvasLayers(app);
    layers.initialize();

    const zoomManager = await this.setupCanvasZoomControls(app, pixiCanvas);
    this.setupCanvasZoom(app, pixiCanvas, zoomManager);

    const drawingLayer = layers.getLayer('drawing')!;
    const displayManager = new DisplayObjectManager(drawingLayer);

    const toolManager = new ToolManager();
    toolManager.setDisplayManager(displayManager);
    toolManager.setUILayer(layers.getLayer('ui')!);

    const events = new CanvasEvents(app, drawingLayer, toolManager);
    events.initialize();

    canvasMarginManager.setContainer(layers.getLayer('background')!);

    const templateLayoutManager = new TemplateLayoutManager();
    await templateLayoutManager.initialize(layers.getLayer('layout')!);

    canvasApp.app = app;
    canvasApp.templateLayoutManager = templateLayoutManager;
    canvasApp.layers = layers;
    canvasApp.events = events;
    canvasApp.displayManager = displayManager;
    canvasApp.toolManager = toolManager;
    canvasApp.isLoaded = true;

    await this.renderTemplateLayout(canvasApp);

    this.exposeToolsForActiveCanvas(canvasApp);
    this.ensureToolsExposed();

    console.log(`✅ Viewport-triggered canvas loaded: ${canvasId}`);

    const loadTime = performance.now() - startTime;
    multiCanvasPerformanceMonitor.recordCanvasLoad(loadTime);
    const loadedCount = Array.from(this.canvasApplications.values()).filter((appEntry) => appEntry.isLoaded).length;
    multiCanvasPerformanceMonitor.updateCanvasMetrics(this.canvasApplications.size, loadedCount, this.activeCanvasId);
    return true;
  }

  /**
   * Ensure there is WebGL capacity before initializing another canvas instance
   */
  public async ensureCapacityForNewCanvas(targetCanvasId: string): Promise<boolean> {
    const maxActive = this.lifecycleManager.getMaxActive();
    const activeCount = this.lifecycleManager.getActiveCount();
    if (activeCount < maxActive) {
      return false;
    }

    const loadedCanvases = Array.from(this.canvasApplications.values()).filter(
      (app) => app.isLoaded && app.canvasRow.id !== targetCanvasId,
    );
    if (!loadedCanvases.length) {
      return false;
    }

    const targetCanvas = this.canvasApplications.get(targetCanvasId);
    const targetIndex = targetCanvas?.canvasRow?.canvas_index ?? null;

    loadedCanvases.sort((a, b) => {
      const distanceA = targetIndex !== null ? Math.abs(a.canvasRow.canvas_index - targetIndex) : a.canvasRow.canvas_index;
      const distanceB = targetIndex !== null ? Math.abs(b.canvasRow.canvas_index - targetIndex) : b.canvasRow.canvas_index;
      return distanceB - distanceA;
    });

    const candidate = loadedCanvases[0];
    if (!candidate) {
      return false;
    }

    try {
      this.lifecycleManager.preRelease(candidate.canvasRow.id);
      await this.lazyUnloadCanvas(candidate.canvasRow.id);
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to unload canvas ${candidate.canvasRow.id} before loading ${targetCanvasId}:`, error);
      this.lifecycleManager.release(candidate.canvasRow.id);
      return false;
    }
  }

  /**
   * Force cleanup of all canvases to prevent WebGL context exhaustion
   */
  private async forceCleanupAllCanvases(): Promise<void> {
    console.log('🚨 Force cleanup: WebGL context limit reached');
    
    // Create a copy of the map to avoid modification during iteration
    const canvasApps = new Map(this.canvasApplications);
    
    // Use Promise.all to handle async destruction
    const destructionPromises = Array.from(canvasApps.entries())
      .filter(([_, canvasApp]) => canvasApp.isLoaded)
      .map(async ([canvasId, canvasApp]) => {
        try {
          await this.safeDestroyCanvas(canvasId, canvasApp);
          this.lifecycleManager.release(canvasId);
        } catch (error) {
          console.error(`❌ Failed to force cleanup canvas ${canvasId}:`, error);
          canvasApp.isLoaded = false;
        } finally {
          this.lifecycleManager.release(canvasId);
        }
      });

    await Promise.all(destructionPromises);
    
    // Clear the applications map
    this.canvasApplications.clear();
    this.loadingCanvases.clear();
    
    console.log('🧹 Force cleanup completed - all canvases unloaded');
  }

  /**
   * Check if a canvas is currently being rendered
   */
  private isCanvasRendering(canvasApp: any): boolean {
    return canvasApp.app?.ticker?.started === true && 
           canvasApp.app?.renderer?.destroyed === false;
  }

  /**
   * Safely destroy a canvas application with minimal error propagation
   */
  private async safeDestroyCanvas(canvasId: string, canvasApp: CanvasApplication): Promise<void> {
    if (!canvasApp.isLoaded || !canvasApp.app) {
      return;
    }

    const app = canvasApp.app;
    canvasApp.isLoaded = false;

    if (this.unifiedZoomManager) {
      this.unifiedZoomManager.unregisterCanvas(canvasId);
    }

    if (app.ticker && !app.ticker.destroyed) {
      app.ticker.stop();
    }

    if (app.canvas.parentNode) {
      app.canvas.parentNode.removeChild(app.canvas);
    }

    canvasApp.templateLayoutManager?.destroy();
    canvasApp.events?.destroy();
    canvasApp.layers?.destroy();
    canvasApp.toolManager?.destroy();

    canvasApp.app = null;
    canvasApp.canvas = null;
    canvasApp.templateLayoutManager = null;
    canvasApp.toolManager = null;
    canvasApp.events = null;
    canvasApp.layers = null;
    canvasApp.displayManager = null;

    if (!app.renderer.destroyed) {
      app.destroy(true);
    }
  }

  /**
   * Optimize memory usage by limiting loaded canvases
   */
  private optimizeMemoryUsage(): void {
    const loadedCanvases = Array.from(this.canvasApplications.values())
      .filter(app => app.isLoaded);
    
    // Check for WebGL context exhaustion warning
    if (loadedCanvases.length > 8) {
      console.warn('⚠️ Too many WebGL contexts - forcing cleanup');
      this.forceCleanupAllCanvases().catch(error => {
        console.error('❌ Force cleanup failed:', error);
      });
      return;
    }
    
    const maxActive = this.lifecycleManager.getMaxActive();
    if (loadedCanvases.length <= maxActive) {
      return; // Within limits
    }
    
    // Sort by distance from active canvas
    const activeCanvas = this.activeCanvasId ? this.canvasApplications.get(this.activeCanvasId) : null;
    if (!activeCanvas) return;
    
    const sortedCanvases = loadedCanvases
      .filter(app => app.canvasRow.id !== this.activeCanvasId)
      .sort((a, b) => {
        const aDistance = Math.abs(a.canvasRow.canvas_index - activeCanvas.canvasRow.canvas_index);
        const bDistance = Math.abs(b.canvasRow.canvas_index - activeCanvas.canvasRow.canvas_index);
        return bDistance - aDistance; // Farthest first
      });
    
    // Unload farthest canvases with staggered timing to prevent WebGL context overwhelm
    const toUnload = sortedCanvases.slice(0, loadedCanvases.length - maxActive);
    toUnload.forEach((canvas, index) => {
      // Stagger the unloading to prevent overwhelming WebGL cleanup
      setTimeout(async () => {
        try {
          await this.lazyUnloadCanvas(canvas.canvasRow.id);
        } catch (error) {
          console.error(`❌ Failed to unload canvas ${canvas.canvasRow.id}:`, error);
        }
      }, index * 100); // Increased to 100ms delay for better stability
    });
    
    console.log(`🧹 Memory optimization: unloaded ${toUnload.length} canvases`);
  }

  /**
   * Lazy unload a canvas when it leaves viewport (viewport-based unloading)
   */
  private async lazyUnloadCanvas(canvasId: string): Promise<void> {
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || !canvasApp.isLoaded) {
      return;
    }

    console.log(`🗑️ Viewport-triggered lazy unloading: ${canvasId}`);

    if (this.activeCanvasId === canvasId) {
      this.activeCanvasId = null;
    }

    const currentCanvas = canvasApp.canvas;
    let placeholder: HTMLDivElement | null = null;

    if (currentCanvas) {
      this.cleanupCanvasZoomControls(currentCanvas);
      placeholder = this.createPlaceholderElement(canvasId, canvasApp.canvasRow, 'Scroll to reload');
      currentCanvas.parentNode?.replaceChild(placeholder, currentCanvas);
    }

    try {
      await this.safeDestroyCanvas(canvasId, canvasApp);
    } finally {
      this.lifecycleManager.release(canvasId);
    }

    if (placeholder) {
      canvasApp.placeholder = placeholder;
      this.intersectionObserver?.observe(placeholder);
    }

    this.loadingCanvases.delete(canvasId);
    console.log(`✅ Viewport-triggered canvas unloaded: ${canvasId}`);
  }

  /**
   * Ensure canvas_data is loaded and render the template layout on the PIXI canvas.
   */
  private async renderTemplateLayout(canvasApp: CanvasApplication): Promise<void> {
    if (!canvasApp.templateLayoutManager) return;

    const resolvedRow = await this.ensureCanvasData(canvasApp);
    if (!resolvedRow?.canvas_data) {
      console.warn(`⚠️ Canvas data missing for ${canvasApp.canvasRow.id} - skipping layout render`);
      return;
    }

    const renderContext = await this.buildRenderContext(resolvedRow);
    canvasApp.templateLayoutManager.renderCanvas(resolvedRow.canvas_data, renderContext);
  }

  /**
   * Fetch the persisted canvas_data JSON if it hasn't been loaded yet.
   */
  private async ensureCanvasData(canvasApp: CanvasApplication): Promise<CanvasRow | null> {
    if (canvasApp.canvasRow.canvas_data) {
      return canvasApp.canvasRow;
    }

    try {
      const { supabase } = await import('../../backend/supabase');
      const { data, error } = await supabase
        .from('canvases')
        .select('canvas_data, canvas_metadata')
        .eq('id', canvasApp.canvasRow.id)
        .single();

      if (error) {
        console.warn(`⚠️ Failed to load canvas_data for ${canvasApp.canvasRow.id}:`, error);
        return canvasApp.canvasRow;
      }

      if (data?.canvas_data) {
        canvasApp.canvasRow.canvas_data = data.canvas_data as CanvasDataPayload;
      }

      if (data?.canvas_metadata) {
        canvasApp.canvasRow.canvas_metadata = {
          ...canvasApp.canvasRow.canvas_metadata,
          ...data.canvas_metadata,
        };
      }

      return canvasApp.canvasRow;
    } catch (error) {
      console.warn(`⚠️ Unexpected error loading canvas_data for ${canvasApp.canvasRow.id}:`, error);
      return canvasApp.canvasRow;
    }
  }

  /**
   * Build the rendering context (course + teacher metadata) for the template layout.
   */
  private async buildRenderContext(canvasRow: CanvasRow): Promise<TemplateRenderContext> {
    const [courseMetadata, teacherMetadata] = await Promise.all([
      this.fetchCourseMetadata(canvasRow.course_id),
      this.fetchTeacherMetadata(),
    ]);

    const timestamp =
      this.formatTimestamp(
        (canvasRow.canvas_metadata as any)?.generatedAt ??
        canvasRow.canvas_metadata?.updated_at ??
        canvasRow.canvas_metadata?.created_at,
      ) || undefined;

    return {
      teacherName: teacherMetadata.name || null,
      courseTitle: courseMetadata.title || null,
      courseCode: courseMetadata.code || null,
      pageNumber: canvasRow.canvas_index,
      generatedAt: timestamp,
    };
  }

  private formatTimestamp(raw?: string | null): string | null {
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  }

  /**
   * Fetch course metadata from database
   */
  private async fetchCourseMetadata(courseId: string): Promise<{ title?: string; code?: string }> {
    try {
      if (typeof courseId !== 'string' || !courseId.trim().length) {
        return {};
      }
      const { supabase } = await import('../../backend/supabase');
      const { data } = await supabase
        .from('courses')
        .select('course_name, course_code')
        .eq('id', courseId)
        .single();

      return {
        title: data?.course_name,
        code: data?.course_code
      };
    } catch (error) {
      console.warn('⚠️ Failed to fetch course metadata:', error);
      return {};
    }
  }

  /**
   * Fetch teacher metadata from user profile
   */
  private async fetchTeacherMetadata(): Promise<{ name?: string }> {
    try {
      const { supabase } = await import('../../backend/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        return { name: user.user_metadata?.full_name || user.email };
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch teacher metadata:', error);
    }
    return {};
  }

  /**
   * Set active canvas and update visual state
   */
  public setActiveCanvas(canvasId: string): void {
    // Update previous active canvas
    if (this.activeCanvasId) {
      const prevCanvas = this.canvasApplications.get(this.activeCanvasId);
      if (prevCanvas && prevCanvas.canvas) {
        prevCanvas.isActive = false;
        prevCanvas.canvas.classList.remove('active');
      }
    }

    // Set new active canvas
    this.activeCanvasId = canvasId;
    const activeCanvas = this.canvasApplications.get(canvasId);
    if (activeCanvas && activeCanvas.canvas) {
      activeCanvas.isActive = true;
      activeCanvas.canvas.classList.add('active');
      
      // Update unified zoom manager with active canvas
      if (this.unifiedZoomManager) {
        this.unifiedZoomManager.setActiveCanvas(canvasId);
      }
      
      // Expose tools for the active canvas
      this.exposeToolsForActiveCanvas(activeCanvas);
      
      // Ensure tools persist
      this.ensureToolsExposed();
    }

    // Notify callbacks
    this.notifyScrollCallbacks(canvasId);
  }

  /**
   * Expose tools globally for the active canvas
   */
  private exposeToolsForActiveCanvas(canvasApp: CanvasApplication): void {
    if (!canvasApp.isLoaded || !canvasApp.toolManager) {
      return;
    }

    // Expose tool manager globally
    (window as any).toolManager = canvasApp.toolManager;
    (window as any).displayManager = canvasApp.displayManager;
    (window as any).layers = canvasApp.layers;
    (window as any).events = canvasApp.events;

    // CRITICAL: Connect tools to the active canvas's PixiJS app
    this.connectToolsToCanvas(canvasApp);

    // CRITICAL: Update CanvasAPI to use the active canvas's tool manager
    this.updateCanvasAPIForActiveCanvas(canvasApp);

    console.log(`🔧 Tools exposed and connected for canvas: ${canvasApp.canvasRow.id}`);
  }

  /**
   * Update CanvasAPI to use the active canvas's tool manager
   */
  private updateCanvasAPIForActiveCanvas(canvasApp: CanvasApplication): void {
    const canvasAPI = (window as any).canvasAPI;
    if (canvasAPI && canvasApp.toolManager && canvasApp.events) {
      // Override CanvasAPI methods to use the active canvas's tool manager
      canvasAPI.setTool = (toolName: string) => {
        return canvasApp.events!.setActiveTool(toolName);
      };
      
      canvasAPI.getActiveTool = () => {
        return canvasApp.toolManager!.getActiveTool()?.constructor.name.toLowerCase() || 'none';
      };
      
      canvasAPI.updateToolColor = (color: string) => {
        canvasApp.events!.updateToolColor(color);
      };
      
      canvasAPI.enableDrawingEvents = () => {
        canvasApp.events!.enableDrawingEvents();
      };
      
      canvasAPI.disableDrawingEvents = () => {
        canvasApp.events!.disableDrawingEvents();
      };
      
      canvasAPI.areDrawingEventsEnabled = () => {
        return canvasApp.events!.areDrawingEventsEnabled();
      };
      
      console.log('🔗 CanvasAPI updated to use active canvas tools');
    }
  }

  /**
   * Connect tools to the active canvas's PixiJS application
   */
  private connectToolsToCanvas(canvasApp: CanvasApplication): void {
    if (!canvasApp.app || !canvasApp.toolManager || !canvasApp.events) {
      return;
    }

    // The tools are already connected to their PixiJS app when created
    // The issue is that UI tools might be referencing the wrong canvas
    // Let's ensure the global references point to the active canvas

    // Update global references for compatibility
    (window as any).app = canvasApp.app;
    (window as any).stage = canvasApp.app.stage;
    (window as any).drawingLayer = canvasApp.layers?.getLayer('drawing');
    (window as any).uiLayer = canvasApp.layers?.getLayer('ui');
    (window as any).backgroundLayer = canvasApp.layers?.getLayer('background');

    // Update perspective manager to use the active canvas
    const perspectiveManager = (window as any).perspectiveManager;
    if (perspectiveManager && perspectiveManager.setApp) {
      perspectiveManager.setApp(canvasApp.app);
    } else if (perspectiveManager) {
      // If no setApp method, update the app property directly
      (perspectiveManager as any).app = canvasApp.app;
      (perspectiveManager as any).stage = canvasApp.app.stage;
    }

    // Ensure the display manager is connected to the drawing layer
    const drawingLayer = canvasApp.layers?.getLayer('drawing');
    // DisplayObjectManager is already connected to drawingLayer when created

    // Update the tool manager's current container reference
    if (drawingLayer && canvasApp.toolManager) {
      // Directly set the currentContainer property
      (canvasApp.toolManager as any).currentContainer = drawingLayer;
    }

    console.log(`🔗 Tools connected to PixiJS app for canvas: ${canvasApp.canvasRow.id}`);
  }

  /**
   * Setup canvas zoom - either use unified zoom or calculate fit-to-viewport
   */
  private setupCanvasZoom(_app: Application, canvas: HTMLCanvasElement, zoomManager: HighQualityZoom | null): void {
    // Wait for container to be properly sized
    setTimeout(() => {
      const currentUnifiedZoom = this.unifiedZoomManager?.getZoomLevel() || zoomManager?.getZoom() || this.currentZoomLevel || 1.0;
      this.applyZoomToCanvasElement(canvas, currentUnifiedZoom);
      this.updateCanvasSpacing();
      this.currentZoomLevel = currentUnifiedZoom;
      // Avoid calling zoomManager.centerCanvas() while the renderer is transitioning between canvases
      
      console.log(`📦 Canvas element scaled to ${(currentUnifiedZoom * 100).toFixed(1)}%`);
      console.log(`👁️ Canvas zoom synchronized with unified zoom manager`);
    }, 100);
  }

  /**
   * Update canvas spacing to maintain constant 40px gap regardless of zoom
   */
  private updateCanvasSpacing(): void {
    if (!this.scrollContainer) {
      console.warn('⚠️ Scroll container not available for spacing update');
      return;
    }

    const fixedGap = 40; // Keep a constant 40px vertical gap regardless of zoom
    this.scrollContainer.style.gap = `${fixedGap}px`;
    
    console.log(`📏 Canvas spacing set to fixed ${fixedGap}px (scrollContainer: ${!!this.scrollContainer})`);
  }

  /**
   * Apply zoomed dimensions to a loaded canvas element
   */
  private applyZoomToCanvasElement(canvas: HTMLCanvasElement, zoom: number): void {
    const scaledWidth = this.CANVAS_WIDTH * zoom;
    const scaledHeight = this.CANVAS_HEIGHT * zoom;

    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;
    canvas.style.maxWidth = '100%';
  }

  /**
   * Apply zoomed dimensions to a placeholder element
   */
  private applyZoomToPlaceholder(placeholder: HTMLElement, zoom: number): void {
    const scaledWidth = this.CANVAS_WIDTH * zoom;
    const scaledHeight = this.CANVAS_HEIGHT * zoom;

    placeholder.style.width = `${scaledWidth}px`;
    placeholder.style.height = `${scaledHeight}px`;
  }

  /**
   * Update all canvas elements (loaded and placeholders) to match current zoom
   */
  private updateCanvasScale(zoom: number): void {
    this.currentZoomLevel = zoom;

    this.canvasApplications.forEach(canvasApp => {
      if (canvasApp.canvas) {
        this.applyZoomToCanvasElement(canvasApp.canvas, zoom);
      }

      if (canvasApp.placeholder) {
        this.applyZoomToPlaceholder(canvasApp.placeholder, zoom);
      } else if (!canvasApp.canvas) {
        const placeholder = document.getElementById(`canvas-placeholder-${canvasApp.canvasRow.id}`) as HTMLDivElement | null;
        if (placeholder) {
          this.applyZoomToPlaceholder(placeholder, zoom);
          canvasApp.placeholder = placeholder;
        }
      }
    });
  }

  /**
   * Setup zoom controls for a specific canvas using unified zoom manager
   */
  private async setupCanvasZoomControls(app: Application, canvas: HTMLCanvasElement): Promise<HighQualityZoom | null> {
    try {
      const { HighQualityZoom } = await import('./HighQualityZoom');
      const zoomManager = new HighQualityZoom(app, {
        minZoom: 0.1,  // 10% minimum zoom
        maxZoom: 5.0,  // 500% maximum zoom
        zoomStep: 0.2,
        smoothZoom: true
      });

      const canvasId = canvas.getAttribute('data-canvas-id');
      if (canvasId && this.unifiedZoomManager) {
        this.unifiedZoomManager.registerCanvas(canvasId, app, zoomManager);

        if (zoomManager.setZoomCommandHandler) {
          zoomManager.setZoomCommandHandler((command: 'zoom-in' | 'zoom-out' | 'reset') => {
            if (!this.unifiedZoomManager) return;
            switch (command) {
              case 'zoom-in':
                this.unifiedZoomManager.zoomIn();
                break;
              case 'zoom-out':
                this.unifiedZoomManager.zoomOut();
                break;
              case 'reset':
                this.unifiedZoomManager.resetZoom();
                break;
            }
          });
        }
      }

      const wheelHandler = (event: WheelEvent) => {
        let handled = false;

        if (this.unifiedZoomManager) {
          handled = this.unifiedZoomManager.handleWheel(event, event.clientX, event.clientY);
        }

        if (!handled && zoomManager.handleWheel) {
          handled = zoomManager.handleWheel(event, event.clientX, event.clientY);
        }

        if (handled) {
          event.preventDefault();
        }
      };

      canvas.addEventListener('wheel', wheelHandler, { passive: false });

      (canvas as any).wheelHandler = wheelHandler;
      (canvas as any).zoomManager = zoomManager;

      console.log('🎯 Unified zoom controls enabled for canvas');
      return zoomManager;
    } catch (error) {
      console.error('❌ Failed to load zoom controls:', error);
      return null;
    }
  }

  /**
   * Clean up zoom controls for a canvas
   */
  private cleanupCanvasZoomControls(canvas: HTMLCanvasElement): void {
    // Unregister from unified zoom manager
    const canvasId = canvas.getAttribute('data-canvas-id');
    if (canvasId && this.unifiedZoomManager) {
      this.unifiedZoomManager.unregisterCanvas(canvasId);
    }
    
    // Remove wheel event listener
    const wheelHandler = (canvas as any).wheelHandler;
    if (wheelHandler) {
      canvas.removeEventListener('wheel', wheelHandler);
    }
    
    // Clean up zoom manager
    const zoomManager = (canvas as any).zoomManager;
    if (zoomManager && zoomManager.destroy) {
      zoomManager.destroy();
    }
    
    // Clear references
    delete (canvas as any).zoomManager;
    delete (canvas as any).wheelHandler;
  }

  /**
   * Ensure tools are properly exposed globally and persist
   */
  private ensureToolsExposed(): void {
    // Use a small delay to ensure tools are properly set
    setTimeout(() => {
      const activeCanvas = this.activeCanvasId ? this.canvasApplications.get(this.activeCanvasId) : null;
      if (activeCanvas && activeCanvas.isLoaded) {
        this.exposeToolsForActiveCanvas(activeCanvas);
        console.log('🔧 Tools re-exposed to ensure persistence');
      }
    }, 100);
  }

  /**
   * Scroll to a specific canvas
   */
  public scrollToCanvas(canvasId: string): void {
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || !canvasApp.canvas) return;

    // Lazy load the canvas if not already loaded
    this.lazyLoadCanvas(canvasId);

    canvasApp.canvas.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Set as active immediately
    this.setActiveCanvas(canvasId);
  }

  /**
   * Scroll to canvas by lesson number
   */
  public scrollToLesson(lessonNumber: number): void {
    const canvasApp = Array.from(this.canvasApplications.values())
      .find(app => app.canvasRow.lesson_number === lessonNumber);
    
    if (canvasApp) {
      this.scrollToCanvas(canvasApp.canvasRow.id);
    }
  }

  /**
   * Subscribe to scroll events
   */
  public onScrollChange(callback: (canvasId: string) => void): void {
    this.scrollCallbacks.push(callback);
  }

  /**
   * Unsubscribe from scroll events
   */
  public offScrollChange(callback: (canvasId: string) => void): void {
    const index = this.scrollCallbacks.indexOf(callback);
    if (index > -1) {
      this.scrollCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify scroll callbacks
   */
  private notifyScrollCallbacks(canvasId: string): void {
    this.scrollCallbacks.forEach(callback => {
      try {
        callback(canvasId);
      } catch (error) {
        console.warn('⚠️ Error in scroll callback:', error);
      }
    });
  }

  /**
   * Get current active canvas
   */
  public getActiveCanvas(): CanvasApplication | null {
    if (!this.activeCanvasId) return null;
    return this.canvasApplications.get(this.activeCanvasId) || null;
  }

  /**
   * Get all canvas applications
   */
  public getAllCanvases(): CanvasApplication[] {
    return Array.from(this.canvasApplications.values());
  }

  /**
   * Check if a canvas exists in the DOM
   */
  public hasCanvas(canvasId: string): boolean {
    return this.canvasApplications.has(canvasId);
  }

  /**
   * Get the number of canvases currently in the DOM
   */
  public getCanvasCount(): number {
    return this.canvasApplications.size;
  }

  /**
   * Get all canvas IDs that are currently loaded
   */
  public getLoadedCanvasIds(): string[] {
    return Array.from(this.canvasApplications.keys());
  }

  /**
   * Get the active canvas tools (for external access)
   */
  public getActiveCanvasTools(): {
    toolManager: ToolManager | null;
    displayManager: DisplayObjectManager | null;
    layers: CanvasLayers | null;
    events: CanvasEvents | null;
  } {
    const activeCanvas = this.activeCanvasId ? this.canvasApplications.get(this.activeCanvasId) : null;
    if (!activeCanvas || !activeCanvas.isLoaded) {
      return {
        toolManager: null,
        displayManager: null,
        layers: null,
        events: null
      };
    }

    return {
      toolManager: activeCanvas.toolManager,
      displayManager: activeCanvas.displayManager,
      layers: activeCanvas.layers,
      events: activeCanvas.events
    };
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      initialized: !!this.scrollContainer,
      activeCanvasId: this.activeCanvasId,
      totalCanvases: this.canvasApplications.size,
      canvasIds: Array.from(this.canvasApplications.keys()),
      scrollCallbacks: this.scrollCallbacks.length
    };
  }

  /**
   * Destroy the vertical canvas container
   */
  public destroy(): void {
    // Stop performance monitoring
    multiCanvasPerformanceMonitor.stopMonitoring();
    
    // Destroy unified zoom manager
    if (this.unifiedZoomManager) {
      this.unifiedZoomManager.destroy();
      this.unifiedZoomManager = null;
    }
    
    // Destroy all canvas applications
    this.canvasApplications.forEach(canvasApp => {
      if (canvasApp.templateLayoutManager) {
        canvasApp.templateLayoutManager.destroy();
      }
      if (canvasApp.toolManager) {
        canvasApp.toolManager.destroy();
      }
      if (canvasApp.events) {
        canvasApp.events.destroy();
      }
      if (canvasApp.layers) {
        canvasApp.layers.destroy();
      }
      if (canvasApp.app) {
        canvasApp.app.destroy(true);
      }
      if (canvasApp.canvas) {
        canvasApp.canvas.remove();
      }
    });

    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clear state
    this.canvasApplications.clear();
    this.activeCanvasId = null;
    this.scrollCallbacks = [];
    this.scrollContainer = null;
  }
}
