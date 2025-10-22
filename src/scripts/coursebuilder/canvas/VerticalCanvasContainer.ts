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
import { TemplateLayoutManager } from './TemplateLayoutManager';
import { CanvasRow } from './MultiCanvasManager';
import { multiCanvasPerformanceMonitor } from './CanvasPerformanceMonitor';
import { CanvasLayers } from './CanvasLayers';
import { CanvasEvents } from './CanvasEvents';
import { DisplayObjectManager } from './DisplayObjectManager';
import { ToolManager } from '../tools/ToolManager';
import { canvasMarginManager } from './CanvasMarginManager';
import { UnifiedZoomManager } from './UnifiedZoomManager';

export interface CanvasApplication {
  app: Application | null; // null until lazy-loaded
  canvas: HTMLCanvasElement | null; // Direct canvas reference (wrapper-free)
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
  // Performance optimization settings
  private readonly LAZY_LOAD_BUFFER = 2; // Load canvases 2 viewports ahead/behind
  private readonly MAX_LOADED_CANVASES = 3; // Reduced to prevent WebGL context exhaustion

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
    
    // Set up callback to update spacing when zoom changes
    this.unifiedZoomManager.setOnZoomChange(() => {
      this.updateCanvasSpacing();
    });
    
    // Expose globally for external access
    (window as any).unifiedZoomManager = this.unifiedZoomManager;
    
    console.log('🎯 Unified zoom manager initialized');
  }

  /**
   * Create the main scrollable container (wrapper-free with CSS Grid)
   */
  private createScrollContainer(): void {
    // Find or create the canvas container
    let canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.error('❌ Canvas container not found');
      return;
    }

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
  public async createCanvasApplication(canvasRow: CanvasRow): Promise<void> {
    if (!this.scrollContainer) {
      throw new Error('Scroll container not initialized');
    }

    console.log(`🎨 Creating viewport-triggered canvas for: ${canvasRow.id}`);

    // Create invisible placeholder div (not canvas) for intersection observer
    const placeholder = document.createElement('div');
    placeholder.id = `canvas-placeholder-${canvasRow.id}`;
    placeholder.className = 'canvas-placeholder-invisible';
    placeholder.setAttribute('data-canvas-id', canvasRow.id);
    placeholder.setAttribute('data-lesson-number', canvasRow.lesson_number.toString());
    placeholder.setAttribute('data-canvas-index', canvasRow.canvas_index.toString());
    
    // Set placeholder dimensions to match canvas size
    placeholder.style.cssText = `
      width: ${this.CANVAS_WIDTH}px;
      height: ${this.CANVAS_HEIGHT}px;
      margin: 0 auto 40px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-family: Arial, sans-serif;
      position: relative;
    `;
    
    // Add placeholder content
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
    `;
    title.textContent = `Lesson ${canvasRow.lesson_number} - Page ${canvasRow.canvas_index}`;

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size: 14px;
      opacity: 0.7;
    `;
    subtitle.textContent = 'Scroll to load canvas';

    placeholder.appendChild(title);
    placeholder.appendChild(subtitle);

    // Store canvas application (without actual canvas yet - viewport-based loading)
    const canvasApp: CanvasApplication = {
      app: null,
      canvas: null, // No canvas element yet
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
    const startTime = performance.now();
    
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || canvasApp.isLoaded) {
      return; // Already loaded or doesn't exist
    }

    console.log(`🔄 Viewport-triggered lazy loading: ${canvasId}`);

    try {
      // Find the placeholder element
      const placeholder = document.getElementById(`canvas-placeholder-${canvasId}`);
      if (!placeholder) {
        console.error(`❌ Placeholder not found for canvas: ${canvasId}`);
        return;
      }

      // Create PixiJS application with WebGL context error handling
      const app = new Application();
      try {
        await app.init({
          width: this.CANVAS_WIDTH,
          height: this.CANVAS_HEIGHT,
          backgroundColor: 0xffffff, // White background restored
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true
        });
      } catch (initError) {
        console.error(`❌ Failed to initialize PixiJS app for canvas ${canvasId}:`, initError);
        
        // Check if it's a WebGL context issue
        if (initError instanceof Error && initError.message.includes('WebGL')) {
          console.warn('⚠️ WebGL context issue detected - forcing cleanup');
          this.forceCleanupAllCanvases();
        }
        
        throw initError;
      }

      // Replace placeholder with actual PixiJS canvas
      const pixiCanvas = app.canvas;
      pixiCanvas.id = `canvas-${canvasId}`;
      pixiCanvas.className = 'canvas-direct canvas-direct--loaded';
      pixiCanvas.setAttribute('data-canvas-id', canvasId);
      pixiCanvas.setAttribute('data-lesson-number', canvasApp.canvasRow.lesson_number.toString());
      pixiCanvas.setAttribute('data-canvas-index', canvasApp.canvasRow.canvas_index.toString());
      
      // Replace placeholder in DOM
      placeholder.parentNode?.replaceChild(pixiCanvas, placeholder);
      
      // Update canvas reference
      canvasApp.canvas = pixiCanvas;

      // Create layer system first (needed for zoom setup)
      const layers = new CanvasLayers(app);
      layers.initialize();

      // Set up zoom controls BEFORE applying any zoom
      this.setupCanvasZoomControls(app, pixiCanvas);

      // Apply unified zoom (or fit-to-viewport if no user zoom yet)
      this.setupCanvasZoom(app, pixiCanvas);

      // Create display object manager using drawing layer
      const drawingLayer = layers.getLayer('drawing');
      if (!drawingLayer) {
        throw new Error('Drawing layer not available after layer initialization');
      }
      const displayManager = new DisplayObjectManager(drawingLayer);

      // Create tool manager
      const toolManager = new ToolManager();
      toolManager.setDisplayManager(displayManager);

      // Provide UI layer to tools
      const uiLayer = layers.getLayer('ui');
      if (uiLayer) {
        toolManager.setUILayer(uiLayer);
      }

      // Set up event handling
      const events = new CanvasEvents(app, drawingLayer, toolManager);
      events.initialize();

      // Initialize margin manager with background layer
      const backgroundLayer = layers.getLayer('background');
      if (backgroundLayer) {
        canvasMarginManager.setContainer(backgroundLayer);
      }

      // Create template layout manager
      const templateLayoutManager = new TemplateLayoutManager();
      const layoutLayer = layers.getLayer('layout');
      if (layoutLayer) {
        await templateLayoutManager.initialize(layoutLayer);
      }

      // Update canvas application
      canvasApp.app = app;
      canvasApp.templateLayoutManager = templateLayoutManager;
      canvasApp.layers = layers;
      canvasApp.events = events;
      canvasApp.displayManager = displayManager;
      canvasApp.toolManager = toolManager;
      canvasApp.isLoaded = true;

      // Populate header/footer with metadata
      await this.populateCanvasMetadata(canvasApp);

      // Expose tools globally for the active canvas
      this.exposeToolsForActiveCanvas(canvasApp);

      // Ensure tools are properly exposed globally
      this.ensureToolsExposed();

      console.log(`✅ Viewport-triggered canvas loaded: ${canvasId}`);
      
      // Record performance
      const loadTime = performance.now() - startTime;
      multiCanvasPerformanceMonitor.recordCanvasLoad(loadTime);
      
      // Update canvas metrics
      const loadedCount = Array.from(this.canvasApplications.values()).filter(app => app.isLoaded).length;
      multiCanvasPerformanceMonitor.updateCanvasMetrics(this.canvasApplications.size, loadedCount, this.activeCanvasId);
      
    } catch (error) {
      console.error(`❌ Failed to lazy load canvas ${canvasId}:`, error);
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
        } catch (error) {
          console.error(`❌ Failed to force cleanup canvas ${canvasId}:`, error);
          // Mark as unloaded even if destruction failed
          canvasApp.isLoaded = false;
        }
      });

    await Promise.all(destructionPromises);
    
    // Clear the applications map
    this.canvasApplications.clear();
    
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
  private async safeDestroyCanvas(canvasId: string, canvasApp: any): Promise<void> {
    try {
      // Unregister from UnifiedZoomManager first
      if (this.unifiedZoomManager) {
        this.unifiedZoomManager.unregisterCanvas(canvasId);
      }

      // Check if canvas is currently rendering
      const isRendering = this.isCanvasRendering(canvasApp);
      
      // Stop ticker and wait for current frame to complete
      if (canvasApp.app?.ticker) {
        canvasApp.app.ticker.stop();
        
        // If it was rendering, wait longer for the render cycle to complete
        const waitTime = isRendering ? 32 : 16; // 2 frames if rendering, 1 frame if not
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Remove from DOM first to stop rendering
      if (canvasApp.app?.canvas?.parentNode) {
        canvasApp.app.canvas.parentNode.removeChild(canvasApp.app.canvas);
      }

      // Wait a bit more to ensure DOM removal is processed
      await new Promise(resolve => setTimeout(resolve, 16));

      // Clear stage children safely
      if (canvasApp.app?.stage) {
        try {
          canvasApp.app.stage.destroy({ children: true });
        } catch (stageError) {
          console.warn(`⚠️ Stage destroy error (non-critical):`, stageError);
        }
      }

      // Destroy app with additional safety checks
      if (canvasApp.app) {
        try {
          // Check if renderer is still valid before destroying
          if (canvasApp.app.renderer && !canvasApp.app.renderer.destroyed) {
            canvasApp.app.destroy(true, true);
          } else {
            console.warn(`⚠️ Renderer already destroyed for canvas ${canvasId}`);
          }
        } catch (destroyError) {
          console.warn(`⚠️ App destroy error (non-critical):`, destroyError);
        }
      }

      // Clear references
      canvasApp.app = null;
      canvasApp.templateLayoutManager = null;
      canvasApp.toolManager = null;
      canvasApp.events = null;
      canvasApp.layers = null;
      canvasApp.displayManager = null;
      canvasApp.isLoaded = false;

    } catch (error) {
      console.warn(`⚠️ Safe destroy error for canvas ${canvasId} (non-critical):`, error);
      // Mark as unloaded regardless of errors
      canvasApp.isLoaded = false;
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
    
    if (loadedCanvases.length <= this.MAX_LOADED_CANVASES) {
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
    const toUnload = sortedCanvases.slice(0, loadedCanvases.length - this.MAX_LOADED_CANVASES);
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
      return; // Not loaded or doesn't exist
    }

    console.log(`🗑️ Viewport-triggered lazy unloading: ${canvasId}`);

    try {
      // Use the safer destruction method (handles all cleanup)
      await this.safeDestroyCanvas(canvasId, canvasApp);

      // Replace canvas with placeholder again
      const currentCanvas = canvasApp.canvas;
      if (currentCanvas) {
        // Clean up zoom controls
        this.cleanupCanvasZoomControls(currentCanvas);
        
        const placeholder = document.createElement('div');
        placeholder.id = `canvas-placeholder-${canvasId}`;
        placeholder.className = 'canvas-placeholder-invisible';
        placeholder.setAttribute('data-canvas-id', canvasId);
        placeholder.setAttribute('data-lesson-number', canvasApp.canvasRow.lesson_number.toString());
        placeholder.setAttribute('data-canvas-index', canvasApp.canvasRow.canvas_index.toString());
        
        // Set placeholder dimensions to match canvas size
        placeholder.style.cssText = `
          width: ${this.CANVAS_WIDTH}px;
          height: ${this.CANVAS_HEIGHT}px;
          margin: 0 auto 40px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          font-family: Arial, sans-serif;
          position: relative;
        `;
        
        // Add placeholder content
        const title = document.createElement('div');
        title.style.cssText = `
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        `;
        title.textContent = `Lesson ${canvasApp.canvasRow.lesson_number} - Page ${canvasApp.canvasRow.canvas_index}`;

        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
          font-size: 14px;
          opacity: 0.7;
        `;
        subtitle.textContent = 'Scroll to reload';

        placeholder.appendChild(title);
        placeholder.appendChild(subtitle);
        
        // Replace in DOM
        currentCanvas.parentNode?.replaceChild(placeholder, currentCanvas);
        canvasApp.canvas = null;
        
        // Re-observe placeholder for future intersection
        this.intersectionObserver?.observe(placeholder);
      }

      canvasApp.isLoaded = false;
      console.log(`✅ Viewport-triggered canvas unloaded: ${canvasId}`);
    } catch (error) {
      console.error(`❌ Failed to lazy unload canvas ${canvasId}:`, error);
    }
  }

  /**
   * Populate header and footer with canvas-specific metadata
   */
  private async populateCanvasMetadata(canvasApp: CanvasApplication): Promise<void> {
    if (!canvasApp.templateLayoutManager) return;

    const { templateLayoutManager, canvasRow } = canvasApp;

    // Fetch course metadata
    const courseMetadata = await this.fetchCourseMetadata(canvasRow.course_id);
    const teacherMetadata = await this.fetchTeacherMetadata();

    // Populate header
    templateLayoutManager.populateHeaderContent({
      pageNumber: canvasRow.canvas_index,
      lessonNumber: canvasRow.lesson_number,
      courseTitle: courseMetadata.title || 'Course Title'
    });

    // Populate footer
    templateLayoutManager.populateFooterContent({
      teacherName: teacherMetadata.name || 'Teacher Name',
      creationDate: new Date(canvasRow.canvas_metadata.created_at).toLocaleDateString(),
      courseCode: courseMetadata.code || 'COURSE-001'
    });
  }

  /**
   * Fetch course metadata from database
   */
  private async fetchCourseMetadata(courseId: string): Promise<{ title?: string; code?: string }> {
    try {
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
  private setupCanvasZoom(app: Application, canvas: HTMLCanvasElement): void {
    // Wait for container to be properly sized
    setTimeout(() => {
      const containerRect = canvas.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      console.log(`📏 Container dimensions: ${containerWidth}x${containerHeight}`);
      console.log(`📐 Canvas dimensions: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}`);
      
      // Check if unified zoom manager has a non-default zoom level
      const currentUnifiedZoom = this.unifiedZoomManager?.getZoomLevel() || 1.0;
      
      if (currentUnifiedZoom !== 1.0) {
        // User has already zoomed - apply the unified zoom level
        console.log(`🎯 Applying unified zoom: ${(currentUnifiedZoom * 100).toFixed(1)}%`);
        
        // Apply the unified zoom through the unified zoom manager
        if (this.unifiedZoomManager) {
          this.unifiedZoomManager.setZoom(currentUnifiedZoom);
        }
      } else {
        // Default initial zoom to 100% (1.0) for a document-like experience
        console.log('🎯 Setting initial unified zoom to 100%');
        if (this.unifiedZoomManager) {
          this.unifiedZoomManager.setZoom(1.0);
        }
      }
      
      // Update spacing (keep constant regardless of zoom level)
      this.updateCanvasSpacing();
      
      // Center the canvas in the container (this needs to be done regardless of zoom level)
      const currentZoom = this.unifiedZoomManager?.getZoomLevel() || 1.0;
      const scaledWidth = this.CANVAS_WIDTH * currentZoom;
      const scaledHeight = this.CANVAS_HEIGHT * currentZoom;
      app.stage.x = (containerWidth - scaledWidth) / 2;
      app.stage.y = (containerHeight - scaledHeight) / 2;
      
      // Scale the canvas element itself to match the zoom level
      canvas.style.width = `${scaledWidth}px`;
      canvas.style.height = `${scaledHeight}px`;
      
      console.log(`📍 Canvas positioned at (${app.stage.x.toFixed(1)}, ${app.stage.y.toFixed(1)})`);
      console.log(`📦 Scaled canvas size: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`);
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
   * Setup zoom controls for a specific canvas using unified zoom manager
   */
  private setupCanvasZoomControls(app: Application, canvas: HTMLCanvasElement): void {
    // Import and create HighQualityZoom instance for this canvas
    import('./HighQualityZoom').then(({ HighQualityZoom }) => {
      const zoomManager = new HighQualityZoom(app, {
        minZoom: 0.1,  // 10% minimum zoom
        maxZoom: 5.0,  // 500% maximum zoom
        zoomStep: 0.2,
        smoothZoom: true
      });

      // Register with unified zoom manager
      const canvasId = canvas.getAttribute('data-canvas-id');
      if (canvasId && this.unifiedZoomManager) {
        this.unifiedZoomManager.registerCanvas(canvasId, app, zoomManager);
      }

      // Set up wheel event handling for unified zoom
      const wheelHandler = (event: WheelEvent) => {
        if (this.unifiedZoomManager && this.unifiedZoomManager.handleWheel(event, event.clientX, event.clientY)) {
          event.preventDefault();
        }
      };
      
      canvas.addEventListener('wheel', wheelHandler, { passive: false });
      
      // Store wheel handler reference for cleanup
      (canvas as any).wheelHandler = wheelHandler;
      (canvas as any).zoomManager = zoomManager;

      console.log('🎯 Unified zoom controls enabled for canvas');
    }).catch(error => {
      console.error('❌ Failed to load zoom controls:', error);
    });
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
    canvas.removeEventListener('wheel', (canvas as any).wheelHandler);
    
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
