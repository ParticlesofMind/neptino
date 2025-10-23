/**
 * Wrapper-Free Canvas Container - Direct Canvas Mounting
 * 
 * This approach removes canvas wrappers entirely while maintaining separation
 * using CSS Grid for layout and spacing.
 * 
 * Benefits:
 * - Eliminates DOM wrapper overhead
 * - Reduces memory usage
 * - Faster rendering
 * - Cleaner DOM structure
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

export interface DirectCanvasApplication {
  app: Application | null; // null until lazy-loaded
  canvas: HTMLCanvasElement | null; // Direct canvas reference
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

export class WrapperFreeCanvasContainer {
  private scrollContainer: HTMLElement | null = null;
  private canvasApplications: Map<string, DirectCanvasApplication> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private activeCanvasId: string | null = null;
  private scrollCallbacks: ((canvasId: string) => void)[] = [];

  // Canvas dimensions
  private readonly CANVAS_WIDTH = 1200;
  private readonly CANVAS_HEIGHT = 1800;
  private readonly CANVAS_MARGIN = 40; // Space between canvases
  
  // Performance optimization settings
  private readonly LAZY_LOAD_BUFFER = 2; // Load canvases 2 viewports ahead/behind
  private readonly UNLOAD_DISTANCE = 5; // Unload canvases 5 viewports away
  private readonly MAX_LOADED_CANVASES = 5; // Maximum canvases to keep loaded

  /**
   * Initialize the wrapper-free canvas container system
   */
  public initialize(): void {
    this.createGridContainer();
    this.setupIntersectionObserver();
    this.ensureSnapMenuElements();
    
    // Start performance monitoring
    multiCanvasPerformanceMonitor.startMonitoring();
  }

  /**
   * Create a CSS Grid container for direct canvas mounting
   */
  private createGridContainer(): void {
    // Find or create the canvas container
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.error('❌ Canvas container not found');
      return;
    }

    // Create grid scroll container
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
   * Setup intersection observer for direct canvas elements
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
        rootMargin: `${this.LAZY_LOAD_BUFFER * 100}% 0px ${this.LAZY_LOAD_BUFFER * 100}% 0px`,
        threshold: [0, 0.1, 0.5, 1.0]
      }
    );
  }

  /**
   * Create a canvas placeholder and add it directly to the grid (no wrapper)
   */
  public async createCanvasApplication(canvasRow: CanvasRow): Promise<void> {
    if (!this.scrollContainer) {
      throw new Error('Scroll container not initialized');
    }

    console.log(`🎨 Creating direct canvas for: ${canvasRow.id}`);

    // Create placeholder canvas element directly (no wrapper)
    const placeholderCanvas = document.createElement('canvas');
    placeholderCanvas.id = `canvas-${canvasRow.id}`;
    placeholderCanvas.className = 'canvas-direct canvas-direct--placeholder';
    placeholderCanvas.setAttribute('data-canvas-id', canvasRow.id);
    placeholderCanvas.setAttribute('data-lesson-number', canvasRow.lesson_number.toString());
    placeholderCanvas.setAttribute('data-canvas-index', canvasRow.canvas_index.toString());
    
    // Set placeholder dimensions
    placeholderCanvas.width = this.CANVAS_WIDTH;
    placeholderCanvas.height = this.CANVAS_HEIGHT;
    
    // Draw placeholder content on canvas
    this.drawPlaceholderContent(placeholderCanvas, canvasRow);

    // Store canvas application (without PixiJS app yet - lazy loading)
    const canvasApp: DirectCanvasApplication = {
      app: null,
      canvas: placeholderCanvas,
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

    // Add directly to grid container
    this.scrollContainer.appendChild(placeholderCanvas);

    // Observe for intersection (triggers lazy loading)
    this.intersectionObserver?.observe(placeholderCanvas);

    console.log(`✅ Created direct canvas: ${canvasRow.id}`);
  }

  /**
   * Draw placeholder content directly on canvas
   */
  private drawPlaceholderContent(canvas: HTMLCanvasElement, canvasRow: CanvasRow): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#6c757d';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Lesson ${canvasRow.lesson_number} - Page ${canvasRow.canvas_index}`,
      canvas.width / 2,
      canvas.height / 2 - 20
    );
    
    // Draw subtitle
    ctx.font = '14px Arial';
    ctx.fillText(
      'Scroll to load canvas',
      canvas.width / 2,
      canvas.height / 2 + 10
    );
  }

  /**
   * Lazy load a canvas (replace placeholder with PixiJS app)
   */
  private async lazyLoadCanvas(canvasId: string): Promise<void> {
    const startTime = performance.now();
    
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || canvasApp.isLoaded || !canvasApp.canvas) {
      return; // Already loaded or doesn't exist
    }

    console.log(`🔄 Lazy loading canvas: ${canvasId}`);

    try {
      // Create PixiJS application
      const app = new Application();
      await app.init({
        width: this.CANVAS_WIDTH,
        height: this.CANVAS_HEIGHT,
        backgroundColor: 0xffffff, // White background restored
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      // Replace placeholder canvas with PixiJS canvas
      const placeholderCanvas = canvasApp.canvas;
      const pixiCanvas = app.canvas;
      
      // Copy attributes from placeholder
      pixiCanvas.id = placeholderCanvas.id;
      pixiCanvas.className = placeholderCanvas.className.replace('canvas-direct--placeholder', 'canvas-direct--loaded');
      pixiCanvas.setAttribute('data-canvas-id', canvasId);
      pixiCanvas.setAttribute('data-lesson-number', canvasApp.canvasRow.lesson_number.toString());
      pixiCanvas.setAttribute('data-canvas-index', canvasApp.canvasRow.canvas_index.toString());
      
      // Replace in DOM
      placeholderCanvas.parentNode?.replaceChild(pixiCanvas, placeholderCanvas);
      
      // Update canvas reference
      canvasApp.canvas = pixiCanvas;

      // Set up zoom to fit canvas properly in container
      this.setupCanvasZoom(app, pixiCanvas);

      // Create layer system
      const layers = new CanvasLayers(app);
      layers.initialize();

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

      // Render full template layout
      await this.renderTemplateLayout(canvasApp);

      // Expose tools globally for the active canvas
      this.exposeToolsForActiveCanvas(canvasApp);

      // Ensure tools are properly exposed globally
      this.ensureToolsExposed();

      console.log(`✅ Lazy loaded canvas: ${canvasId}`);
      
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
   * Setup canvas zoom to fit properly in container and enable zoom controls
   */
  private setupCanvasZoom(app: Application, canvas: HTMLCanvasElement): void {
    // Wait for container to be properly sized
    setTimeout(() => {
      const containerRect = canvas.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      console.log(`📏 Container dimensions: ${containerWidth}x${containerHeight}`);
      console.log(`📐 Canvas dimensions: ${this.CANVAS_WIDTH}x${this.CANVAS_HEIGHT}`);
      
      // Calculate zoom to fit canvas with generous padding
      const padding = 60;
      const availableWidth = containerWidth - (padding * 2);
      const availableHeight = containerHeight - (padding * 2);
      
      // Calculate scale to fit canvas in container
      const scaleX = availableWidth / this.CANVAS_WIDTH;
      const scaleY = availableHeight / this.CANVAS_HEIGHT;
      const fitScale = Math.min(scaleX, scaleY);
      
      // Clamp between 20% and 80% for better usability
      const clampedScale = Math.max(0.2, Math.min(0.8, fitScale));
      
      // Apply zoom to the stage
      app.stage.scale.set(clampedScale);
      
      // Center the canvas in the container
      const scaledWidth = this.CANVAS_WIDTH * clampedScale;
      const scaledHeight = this.CANVAS_HEIGHT * clampedScale;
      app.stage.x = (containerWidth - scaledWidth) / 2;
      app.stage.y = (containerHeight - scaledHeight) / 2;
      
      // Set up zoom controls for this canvas
      this.setupCanvasZoomControls(app, canvas);
      
      console.log(`🎯 Canvas zoom set to ${(clampedScale * 100).toFixed(1)}%`);
      console.log(`📍 Canvas positioned at (${app.stage.x.toFixed(1)}, ${app.stage.y.toFixed(1)})`);
      console.log(`📦 Scaled canvas size: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)}`);
    }, 100);
  }

  /**
   * Setup zoom controls for a specific canvas
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

      // Set up wheel event handling for zoom/pan
      const wheelHandler = (event: WheelEvent) => {
        if (zoomManager.handleWheel(event, event.clientX, event.clientY)) {
          event.preventDefault();
        }
      };
      
      canvas.addEventListener('wheel', wheelHandler, { passive: false });
      
      // Store wheel handler reference for cleanup
      (canvas as any).wheelHandler = wheelHandler;

      // Set up keyboard shortcuts for zoom
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case '=':
            case '+':
              event.preventDefault();
              zoomManager.zoomIn();
              break;
            case '-':
              event.preventDefault();
              zoomManager.zoomOut();
              break;
            case '0':
              event.preventDefault();
              zoomManager.resetZoom();
              break;
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Store zoom manager reference for cleanup
      (canvas as any).zoomManager = zoomManager;
      (canvas as any).zoomKeyHandler = handleKeyDown;

      console.log('🎯 Zoom controls enabled for canvas');
    }).catch(error => {
      console.error('❌ Failed to load zoom controls:', error);
    });
  }

  /**
   * Optimize memory usage by limiting loaded canvases
   */
  private optimizeMemoryUsage(): void {
    const loadedCanvases = Array.from(this.canvasApplications.values())
      .filter(app => app.isLoaded);
    
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
    
    // Unload farthest canvases
    const toUnload = sortedCanvases.slice(0, loadedCanvases.length - this.MAX_LOADED_CANVASES);
    toUnload.forEach(canvas => {
      this.lazyUnloadCanvas(canvas.canvasRow.id);
    });
    
    console.log(`🧹 Memory optimization: unloaded ${toUnload.length} canvases`);
  }

  /**
   * Lazy unload a canvas (destroy PixiJS app to save memory)
   */
  private lazyUnloadCanvas(canvasId: string): void {
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || !canvasApp.isLoaded) {
      return; // Not loaded or doesn't exist
    }

    console.log(`🗑️ Lazy unloading canvas: ${canvasId}`);

    try {
      // Destroy PixiJS app
      if (canvasApp.app) {
        canvasApp.app.destroy(true);
        canvasApp.app = null;
      }

      // Destroy template layout manager
      if (canvasApp.templateLayoutManager) {
        canvasApp.templateLayoutManager.destroy();
        canvasApp.templateLayoutManager = null;
      }

      // Destroy tool system components
      if (canvasApp.toolManager) {
        canvasApp.toolManager.destroy();
        canvasApp.toolManager = null;
      }
      if (canvasApp.events) {
        canvasApp.events.destroy();
        canvasApp.events = null;
      }
      if (canvasApp.layers) {
        canvasApp.layers.destroy();
        canvasApp.layers = null;
      }
      if (canvasApp.displayManager) {
        canvasApp.displayManager = null;
      }

      // Replace with placeholder canvas again
      const currentCanvas = canvasApp.canvas;
      if (currentCanvas) {
        // Clean up zoom controls
        this.cleanupCanvasZoomControls(currentCanvas);
        
        const placeholderCanvas = document.createElement('canvas');
        placeholderCanvas.id = currentCanvas.id;
        placeholderCanvas.className = 'canvas-direct canvas-direct--placeholder';
        placeholderCanvas.setAttribute('data-canvas-id', canvasId);
        placeholderCanvas.setAttribute('data-lesson-number', canvasApp.canvasRow.lesson_number.toString());
        placeholderCanvas.setAttribute('data-canvas-index', canvasApp.canvasRow.canvas_index.toString());
        
        placeholderCanvas.width = this.CANVAS_WIDTH;
        placeholderCanvas.height = this.CANVAS_HEIGHT;
        
        // Draw placeholder content
        this.drawPlaceholderContent(placeholderCanvas, canvasApp.canvasRow);
        
        // Replace in DOM
        currentCanvas.parentNode?.replaceChild(placeholderCanvas, currentCanvas);
        canvasApp.canvas = placeholderCanvas;
      }

      canvasApp.isLoaded = false;
      console.log(`✅ Lazy unloaded canvas: ${canvasId}`);
    } catch (error) {
      console.error(`❌ Failed to lazy unload canvas ${canvasId}:`, error);
    }
  }

  /**
   * Clean up zoom controls for a canvas
   */
  private cleanupCanvasZoomControls(canvas: HTMLCanvasElement): void {
    // Remove wheel event listener
    canvas.removeEventListener('wheel', (canvas as any).wheelHandler);
    
    // Remove keyboard event listener
    const keyHandler = (canvas as any).zoomKeyHandler;
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
    }
    
    // Clean up zoom manager
    const zoomManager = (canvas as any).zoomManager;
    if (zoomManager && zoomManager.destroy) {
      zoomManager.destroy();
    }
    
    // Clear references
    delete (canvas as any).zoomManager;
    delete (canvas as any).zoomKeyHandler;
    delete (canvas as any).wheelHandler;
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
  private exposeToolsForActiveCanvas(canvasApp: DirectCanvasApplication): void {
    if (!canvasApp.isLoaded || !canvasApp.toolManager) {
      return;
    }

    // Expose tool manager globally
    (window as any).toolManager = canvasApp.toolManager;
    (window as any).displayManager = canvasApp.displayManager;
    (window as any).layers = canvasApp.layers;
    (window as any).events = canvasApp.events;

    // Connect tools to the active canvas's PixiJS app
    this.connectToolsToCanvas(canvasApp);

    console.log(`🔧 Tools exposed and connected for canvas: ${canvasApp.canvasRow.id}`);
  }

  /**
   * Connect tools to the active canvas's PixiJS application
   */
  private connectToolsToCanvas(canvasApp: DirectCanvasApplication): void {
    if (!canvasApp.app || !canvasApp.toolManager || !canvasApp.events) {
      return;
    }

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
      (perspectiveManager as any).app = canvasApp.app;
      (perspectiveManager as any).stage = canvasApp.app.stage;
    }

    // Ensure the display manager is connected to the drawing layer
    const drawingLayer = canvasApp.layers?.getLayer('drawing');
    if (drawingLayer && canvasApp.toolManager) {
      (canvasApp.toolManager as any).currentContainer = drawingLayer;
    }

    console.log(`🔗 Tools connected to PixiJS app for canvas: ${canvasApp.canvasRow.id}`);
  }

  /**
   * Ensure tools are properly exposed globally and persist
   */
  private ensureToolsExposed(): void {
    setTimeout(() => {
      const activeCanvas = this.activeCanvasId ? this.canvasApplications.get(this.activeCanvasId) : null;
      if (activeCanvas && activeCanvas.isLoaded) {
        this.exposeToolsForActiveCanvas(activeCanvas);
        console.log('🔧 Tools re-exposed to ensure persistence');
      }
    }, 100);
  }

  /**
   * Render the stored template layout using the persisted canvas data.
   */
  private async renderTemplateLayout(canvasApp: DirectCanvasApplication): Promise<void> {
    if (!canvasApp.templateLayoutManager) return;

    const resolvedRow = await this.ensureCanvasData(canvasApp);
    if (!resolvedRow?.canvas_data) {
      console.warn(`⚠️ Canvas data missing for ${canvasApp.canvasRow.id} - skipping layout render`);
      return;
    }

    const context = await this.buildRenderContext(resolvedRow);
    canvasApp.templateLayoutManager.renderCanvas(resolvedRow.canvas_data, context);
  }

  private async ensureCanvasData(canvasApp: DirectCanvasApplication): Promise<CanvasRow | null> {
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
   * Scroll to a specific canvas
   */
  public scrollToCanvas(canvasId: string): void {
    const canvasApp = this.canvasApplications.get(canvasId);
    if (!canvasApp || !canvasApp.canvas || !this.scrollContainer) return;

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
  public getActiveCanvas(): DirectCanvasApplication | null {
    if (!this.activeCanvasId) return null;
    return this.canvasApplications.get(this.activeCanvasId) || null;
  }

  /**
   * Get all canvas applications
   */
  public getAllCanvases(): DirectCanvasApplication[] {
    return Array.from(this.canvasApplications.values());
  }

  /**
   * Get canvas count
   */
  public getCanvasCount(): number {
    return this.canvasApplications.size;
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
      scrollCallbacks: this.scrollCallbacks.length,
      wrapperFree: true
    };
  }

  /**
   * Destroy the wrapper-free canvas container
   */
  public destroy(): void {
    // Stop performance monitoring
    multiCanvasPerformanceMonitor.stopMonitoring();
    
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
