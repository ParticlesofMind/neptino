import { TemplateLayoutManager, type CanvasDataPayload, type TemplateRenderContext } from '../layout/TemplateLayoutManager';
import { CanvasLayers } from '../layout/CanvasLayers';
import { CanvasEvents } from './CanvasEvents';
import { DisplayObjectManager } from './DisplayObjectManager';
import { ToolManager } from '../tools/ToolManager';
import { canvasMarginManager } from '../layout/CanvasMarginManager';
import { SharedCanvasEngine, type VirtualCanvasContext } from './SharedCanvasEngine';
import {
  getMaxZoom,
  getMinZoom,
  getNextZoomLevel,
  getPreviousZoomLevel,
  snapToStandardZoom,
} from './zoomLevels';
import type { CanvasRow } from './MultiCanvasManager';

interface ZoomState {
  level: number;
}

export interface CanvasApplication {
  canvasRow: CanvasRow;
  placeholder: HTMLDivElement | null;
  virtualContext: VirtualCanvasContext | null;
  templateLayoutManager: TemplateLayoutManager | null;
  layers: CanvasLayers | null;
  displayManager: DisplayObjectManager | null;
  toolManager: ToolManager | null;
  events: CanvasEvents | null;
  isActive: boolean;
  isLoaded: boolean;
}

export class VerticalCanvasContainer {
  private scrollContainer: HTMLElement | null = null;
  private canvasApplications: Map<string, CanvasApplication> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private activeCanvasId: string | null = null;
  private scrollCallbacks: ((canvasId: string) => void)[] = [];
  private readonly sharedEngine = new SharedCanvasEngine();
  private engineReady: Promise<void> | null = null;
  private sharedEvents: CanvasEvents | null = null;
  private readonly currentZoom: ZoomState = { level: 1 };

  private readonly CANVAS_WIDTH = 1200;
  private readonly CANVAS_HEIGHT = 1800;
  private readonly CANVAS_SPACING = 40;

  /**
   * Initialize DOM structure, shared Pixi application, and observers.
   */
  public initialize(): void {
    this.createScrollContainer();

    if (this.scrollContainer) {
      this.engineReady = this.sharedEngine.initialize({ container: this.scrollContainer });
    }

    this.setupIntersectionObserver();
    this.ensureSnapMenuElements();
    this.updateCanvasSpacing();
    this.setupUnifiedZoomBridge();

    document.addEventListener('canvasDataUpdated', this.handleCanvasDataUpdate as EventListener);
  }

  /**
   * Create a placeholder entry for the given canvas row.
   */
  public async createCanvasApplication(canvasRow: CanvasRow): Promise<void> {
    if (!this.scrollContainer) {
      throw new Error('Scroll container not initialized');
    }

    const placeholder = this.createPlaceholderElement(
      canvasRow.id,
      canvasRow,
      'Scroll to load canvas',
    );

    this.applyZoomToPlaceholder(placeholder, this.currentZoom.level);

    const application: CanvasApplication = {
      canvasRow,
      placeholder,
      virtualContext: null,
      templateLayoutManager: null,
      layers: null,
      displayManager: null,
      toolManager: null,
      events: null,
      isActive: false,
      isLoaded: false,
    };

    this.canvasApplications.set(canvasRow.id, application);
    this.scrollContainer.appendChild(placeholder);
    this.intersectionObserver?.observe(placeholder);
    this.updateCanvasSpacing();

    if (this.isElementInViewport(placeholder)) {
      void this.lazyLoadCanvas(canvasRow.id);
    }
  }

  /**
   * Lazy load a canvas when it enters the viewport.
   */
  public async lazyLoadCanvas(canvasId: string): Promise<void> {
    const application = this.canvasApplications.get(canvasId);
    if (!application || application.isLoaded || !application.placeholder) {
      return;
    }

    await this.ensureEngineReady();

    const virtualContext = this.sharedEngine.registerCanvas(canvasId, application.placeholder);
    const layers = virtualContext.layers;
    const drawingLayer = layers.getLayer('drawing');
    const displayManager = new DisplayObjectManager(drawingLayer);

    const toolManager = new ToolManager();
    toolManager.setDisplayManager(displayManager);

    const uiLayer = layers.getLayer('ui');
    toolManager.setUILayer(uiLayer);

    const appInstance = this.sharedEngine.getApplication();

    if (appInstance) {
      if (!this.sharedEvents) {
        this.sharedEvents = new CanvasEvents(appInstance, drawingLayer, toolManager);
        this.sharedEvents.initialize();
      } else {
        this.sharedEvents.updateContext(drawingLayer, toolManager);
      }
    }

    const templateLayoutManager = new TemplateLayoutManager();
    const layoutLayer = layers.getLayer('layout');
    await templateLayoutManager.initialize(layoutLayer);

    application.virtualContext = virtualContext;
    application.layers = layers;
    application.displayManager = displayManager;
    application.toolManager = toolManager;
    application.events = this.sharedEvents;
    application.templateLayoutManager = templateLayoutManager;
    application.isLoaded = true;

    if (application.placeholder) {
      application.placeholder.classList.add('canvas-placeholder--loaded');
      application.placeholder.style.background = 'transparent';
      application.placeholder.style.borderColor = 'transparent';
    }

    await this.renderTemplateLayout(application);

    if (!this.activeCanvasId) {
      this.setActiveCanvas(canvasId);
    }
  }

  /**
   * Intersection observer callback to manage lazy loading and active canvas detection.
   */
  private handleIntersectionEntries(entries: IntersectionObserverEntry[]): void {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

    visibleEntries.forEach((entry, index) => {
      const canvasId = entry.target.getAttribute('data-canvas-id');
      if (!canvasId) return;

      void this.lazyLoadCanvas(canvasId);

      if (index === 0 && canvasId !== this.activeCanvasId) {
        this.setActiveCanvas(canvasId);
      }
    });
  }

  /**
   * Set the active canvas and expose its tool managers globally.
   */
  public setActiveCanvas(canvasId: string): void {
    if (this.activeCanvasId === canvasId) {
      return;
    }

    if (this.activeCanvasId) {
      const previous = this.canvasApplications.get(this.activeCanvasId);
      if (previous?.placeholder) {
        previous.placeholder.classList.remove('active');
      }
      if (previous) {
        previous.isActive = false;
      }
    }

    const next = this.canvasApplications.get(canvasId);
    if (!next) {
      return;
    }

    this.activeCanvasId = canvasId;
    next.isActive = true;

    if (next.placeholder) {
      next.placeholder.classList.add('active');
    }

    if (next.toolManager) {
      (window as any).toolManager = next.toolManager;
    }
    if (next.displayManager) {
      (window as any).displayManager = next.displayManager;
    }
    if (next.layers) {
      (window as any).layers = next.layers;
    }
    if (this.sharedEvents) {
      (window as any).events = this.sharedEvents;
    }

    if (this.sharedEvents && next.toolManager && next.layers) {
      const drawingLayer = next.layers.getLayer('drawing');
      this.sharedEvents.updateContext(drawingLayer, next.toolManager);
    }

    const backgroundLayer = next.layers?.getLayer('background') ?? null;
    if (backgroundLayer) {
      canvasMarginManager.setContainer(backgroundLayer);
    }

    this.notifyScrollCallbacks(canvasId);
  }

  /**
   * Scroll to a specific canvas.
   */
  public scrollToCanvas(canvasId: string): void {
    const application = this.canvasApplications.get(canvasId);
    if (application?.placeholder && this.scrollContainer) {
      const containerRect = this.scrollContainer.getBoundingClientRect();
      const placeholderRect = application.placeholder.getBoundingClientRect();
      const scrollOffset = placeholderRect.top - containerRect.top + this.scrollContainer.scrollTop;
      
      this.scrollContainer.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Scroll to a specific lesson number.
   */
  public scrollToLesson(lessonNumber: number): void {
    const found = Array.from(this.canvasApplications.values()).find(
      (app) => app.canvasRow.lesson_number === lessonNumber,
    );
    if (found) {
      this.scrollToCanvas(found.canvasRow.id);
    }
  }

  public onScrollChange(callback: (canvasId: string) => void): void {
    this.scrollCallbacks.push(callback);
  }

  public offScrollChange(callback: (canvasId: string) => void): void {
    const index = this.scrollCallbacks.indexOf(callback);
    if (index >= 0) {
      this.scrollCallbacks.splice(index, 1);
    }
  }

  public getActiveCanvas(): CanvasApplication | null {
    if (!this.activeCanvasId) {
      return null;
    }
    return this.canvasApplications.get(this.activeCanvasId) ?? null;
  }

  public getAllCanvases(): CanvasApplication[] {
    return Array.from(this.canvasApplications.values());
  }

  public hasCanvas(canvasId: string): boolean {
    return this.canvasApplications.has(canvasId);
  }

  public getCanvasCount(): number {
    return this.canvasApplications.size;
  }

  public getLoadedCanvasIds(): string[] {
    return Array.from(this.canvasApplications.values())
      .filter((app) => app.isLoaded)
      .map((app) => app.canvasRow.id);
  }

  public getActiveCanvasTools(): {
    toolManager: ToolManager | null;
    events: CanvasEvents | null;
  } {
    const active = this.getActiveCanvas();
    return {
      toolManager: active?.toolManager ?? null,
      events: active?.events ?? null,
    };
  }

  public getDebugInfo(): any {
    return {
      total: this.canvasApplications.size,
      loaded: this.getLoadedCanvasIds(),
      activeCanvasId: this.activeCanvasId,
      zoom: this.currentZoom.level,
    };
  }

  public destroy(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.scrollCallbacks = [];
    this.canvasApplications.clear();
    this.activeCanvasId = null;
  }

  /**
   * Ensure shared engine is ready before using it.
   */
  private async ensureEngineReady(): Promise<void> {
    if (!this.engineReady) {
      return;
    }
    await this.engineReady;
  }

  /**
   * Synchronize zoom level for placeholders.
   */
  private applyZoomToPlaceholder(placeholder: HTMLElement, zoom: number): void {
    placeholder.style.width = `${this.CANVAS_WIDTH * zoom}px`;
    placeholder.style.height = `${this.CANVAS_HEIGHT * zoom}px`;
  }

  private applyZoomToAllPlaceholders(): void {
    this.canvasApplications.forEach((application) => {
      if (application.placeholder) {
        this.applyZoomToPlaceholder(application.placeholder, this.currentZoom.level);
      }
    });
  }

  private isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0;
  }

  private setupUnifiedZoomBridge(): void {
    const zoomController = {
      getZoomLevel: (): number => this.currentZoom.level,
      setZoom: (value: number): void => {
        const snapped = snapToStandardZoom(value);
        if (Math.abs(snapped - this.currentZoom.level) < 0.0001) {
          return;
        }
        this.currentZoom.level = snapped;
        this.applyZoomToAllPlaceholders();
        this.updateCanvasSpacing();
      },
      zoomIn: (): void => {
        const next = getNextZoomLevel(this.currentZoom.level);
        zoomController.setZoom(next);
      },
      zoomOut: (): void => {
        const previous = getPreviousZoomLevel(this.currentZoom.level);
        zoomController.setZoom(previous);
      },
      resetZoom: (): void => {
        zoomController.setZoom(1);
      },
      getMinZoom,
      getMaxZoom,
    };

    (window as any).unifiedZoomManager = zoomController;
  }

  private updateCanvasSpacing(): void {
    this.canvasApplications.forEach((app) => {
      if (app.placeholder) {
        app.placeholder.style.marginBottom = `${this.CANVAS_SPACING}px`;
      }
    });
  }

  /**
   * Refresh currently loaded canvases (used when template data updates).
   */
  private async refreshLoadedCanvases(): Promise<void> {
    const loaded = Array.from(this.canvasApplications.values()).filter((app) => app.isLoaded);

    for (const application of loaded) {
      await this.renderTemplateLayout(application);
    }
  }

  private handleCanvasDataUpdate = (event: Event): void => {
    const custom = event as CustomEvent<{ templateId: string; updatedLessons: number }>;
    console.log(
      `🔄 Canvas data updated for template ${custom.detail.templateId}, ${custom.detail.updatedLessons} lesson(s)`,
    );
    void this.refreshLoadedCanvases();
  };

  /**
   * Create the scroll container that will host placeholders and overlay canvas.
   */
  private createScrollContainer(): void {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.error('❌ Canvas container not found');
      return;
    }

    canvasContainer.classList.add('canvas--grid', 'single-canvas-mode');

    this.scrollContainer = document.createElement('div');
    this.scrollContainer.id = 'canvas-grid-container';
    this.scrollContainer.className = 'canvas-grid-container';
    this.scrollContainer.setAttribute('data-single-canvas', 'true');

    const preservedElements: HTMLElement[] = [];
    Array.from(canvasContainer.children).forEach((child) => {
      const element = child as HTMLElement;
      if (
        element.classList.contains('engine__perspective') ||
        element.classList.contains('engine__snap-menu') ||
        element.classList.contains('engine__controls') ||
        element.hasAttribute('data-snap-anchor') ||
        element.hasAttribute('data-snap-menu')
      ) {
        preservedElements.push(element);
      }
    });

    canvasContainer.innerHTML = '';
    preservedElements.forEach((element) => {
      canvasContainer.appendChild(element);
    });
    canvasContainer.appendChild(this.scrollContainer);
  }

  /**
   * Setup intersection observer for lazy loading and active canvas detection.
   */
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.handleIntersectionEntries(entries),
      {
        root: this.scrollContainer,
        rootMargin: '200px 0px',
        threshold: [0.1, 0.5, 0.9],
      },
    );
  }

  private ensureSnapMenuElements(): void {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      return;
    }

    const snapAnchor = canvasContainer.querySelector('[data-snap-anchor]');
    const snapMenu = canvasContainer.querySelector('[data-snap-menu]');

    if (!snapAnchor || !snapMenu) {
      this.createSnapMenuElements(canvasContainer);
    }
  }

  private createSnapMenuElements(container: HTMLElement): void {
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

      const perspective = container.querySelector('.engine__perspective');
      perspective?.appendChild(snapAnchor);
    }

    let snapMenu = container.querySelector('[data-snap-menu]');
    if (!snapMenu) {
      snapMenu = document.createElement('div');
      snapMenu.className = 'engine__snap-menu';
      snapMenu.id = 'snap-menu';
      snapMenu.setAttribute('data-snap-menu', '');
      snapMenu.innerHTML = `
        <div class="engine__snap-item engine__snap-item--active" data-snap-option="smart">
          <input type="checkbox" id="smart-guides-toggle" class="engine__snap-toggle-checkbox" checked>
          <span>Smart Guides</span>
        </div>
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
    }
  }

  private notifyScrollCallbacks(canvasId: string): void {
    this.scrollCallbacks.forEach((callback) => {
      try {
        callback(canvasId);
      } catch (error) {
        console.warn('⚠️ Error in scroll callback:', error);
      }
    });
  }

  /**
   * Create placeholder element for a canvas.
   */
  private createPlaceholderElement(
    canvasId: string,
    canvasRow: CanvasRow,
    subtitleText: string,
  ): HTMLDivElement {
    const placeholder = document.createElement('div');
    placeholder.id = `canvas-placeholder-${canvasId}`;
    placeholder.className = 'canvas-placeholder-invisible';
    placeholder.setAttribute('data-canvas-id', canvasId);
    placeholder.setAttribute('data-lesson-number', canvasRow.lesson_number.toString());
    placeholder.setAttribute('data-canvas-index', canvasRow.canvas_index.toString());

    const title = document.createElement('div');
    title.className = 'canvas-placeholder__title';
    title.textContent = `Lesson ${canvasRow.lesson_number} - Page ${canvasRow.canvas_index}`;

    const subtitle = document.createElement('div');
    subtitle.className = 'canvas-placeholder__subtitle';
    subtitle.textContent = subtitleText;

    placeholder.appendChild(title);
    placeholder.appendChild(subtitle);
    return placeholder;
  }

  /**
   * Render the template layout into the virtual canvas.
   */
  private async renderTemplateLayout(application: CanvasApplication): Promise<void> {
    if (!application.templateLayoutManager) {
      console.warn(`⚠️ No templateLayoutManager for canvas ${application.canvasRow.id}`);
      return;
    }

    try {
      const resolvedRow = await this.ensureCanvasData(application);
      if (!resolvedRow?.canvas_data) {
        console.warn(`⚠️ Canvas data missing for ${application.canvasRow.id}`);
        return;
      }

      console.log(`🎨 Rendering template for canvas "${application.canvasRow.id}"`, {
        lesson: resolvedRow.lesson_number,
        canvasIndex: resolvedRow.canvas_index,
        hasLayout: !!resolvedRow.canvas_data.layout
      });

      const renderContext = await this.buildRenderContext(resolvedRow);
      application.templateLayoutManager.renderCanvas(resolvedRow.canvas_data, renderContext);

      console.log(`✅ Template rendered for canvas "${application.canvasRow.id}"`);
    } catch (error) {
      console.warn(`⚠️ Error rendering template layout for ${application.canvasRow.id}:`, error);
    }
  }

  private async ensureCanvasData(application: CanvasApplication): Promise<CanvasRow | null> {
    if (application.canvasRow.canvas_data) {
      return application.canvasRow;
    }

    try {
      const { supabase } = await import('../../backend/supabase');
      const { data, error } = await supabase
        .from('canvases')
        .select('canvas_data, canvas_metadata')
        .eq('id', application.canvasRow.id)
        .single();

      if (error) {
        console.warn(`⚠️ Failed to load canvas data for ${application.canvasRow.id}:`, error);
        return application.canvasRow;
      }

      if (data?.canvas_data) {
        application.canvasRow.canvas_data = data.canvas_data as CanvasDataPayload;
      }

      if (data?.canvas_metadata) {
        application.canvasRow.canvas_metadata = {
          ...application.canvasRow.canvas_metadata,
          ...data.canvas_metadata,
        };
      }

      return application.canvasRow;
    } catch (error) {
      console.warn(`⚠️ Unexpected error loading canvas data for ${application.canvasRow.id}:`, error);
      return application.canvasRow;
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

  private async fetchCourseMetadata(courseId: string): Promise<{ title?: string; code?: string }> {
    try {
      if (typeof courseId !== 'string' || !courseId.trim().length) {
        return {};
      }
      const { supabase } = await import('../../backend/supabase');
      const { data } = await supabase
        .from('courses')
        .select('course_name')
        .eq('id', courseId)
        .single();

      return {
        title: data?.course_name,
      };
    } catch (error) {
      console.warn('⚠️ Failed to fetch course metadata:', error);
      return {};
    }
  }

  private async fetchTeacherMetadata(): Promise<{ name?: string }> {
    try {
      const { supabase } = await import('../../backend/supabase');
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return { name: user.user_metadata?.full_name || user.email };
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch teacher metadata:', error);
    }
    return {};
  }
}
