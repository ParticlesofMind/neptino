import { Application, Container, Graphics } from 'pixi.js';
import { canvasDimensionManager } from '../layout/CanvasDimensionManager';
import { CanvasLayers, type LayerSystem } from '../layout/CanvasLayers';

export interface VirtualCanvasContext {
  id: string;
  root: Container;
  mask: Graphics;
  layers: CanvasLayers;
  placeholder: HTMLElement;
  isVisible: boolean;
  lastRect: DOMRect | null;
  scale: number;
}

export interface SharedCanvasEngineConfig {
  container: HTMLElement;
}

/**
 * SharedCanvasEngine
 *
 * Maintains a single PixiJS Application instance and maps each logical "canvas"
 * to a virtual container that is positioned over the corresponding placeholder.
 * Rendering happens once per frame for all visible virtual canvases.
 */
export class SharedCanvasEngine {
  private app: Application | null = null;
  private config: SharedCanvasEngineConfig | null = null;
  private virtualCanvases: Map<string, VirtualCanvasContext> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private isInitialized = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private baseWidth = 1200;
  private baseHeight = 1800;

  /**
   * Initialize the shared engine with a container element that stores placeholders.
   */
  public async initialize(config: SharedCanvasEngineConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = config;

    const dimensions = canvasDimensionManager.getCurrentDimensions();
    this.baseWidth = dimensions.width;
    this.baseHeight = dimensions.height;

    this.viewportWidth = config.container.clientWidth || window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.app = new Application();

    await this.app.init({
      width: Math.max(1, this.viewportWidth),
      height: this.viewportHeight,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });

    this.mountCanvas();
    this.bindEvents();

    this.app.ticker.add(this.update, this);

    this.isInitialized = true;
  }

  /**
   * Register a placeholder with the shared engine and create the virtual containers.
   */
  public registerCanvas(id: string, placeholder: HTMLElement): VirtualCanvasContext {
    if (!this.app) {
      throw new Error('SharedCanvasEngine not initialized');
    }

    if (this.virtualCanvases.has(id)) {
      return this.virtualCanvases.get(id)!;
    }

    const root = new Container();
    root.label = `virtual-canvas-${id}`;
    root.visible = false;

    const mask = new Graphics();
    mask.label = `virtual-canvas-mask-${id}`;
    mask.visible = false;
    mask.rect(0, 0, this.baseWidth, this.baseHeight).fill({ color: 0xffffff, alpha: 1 });

    root.mask = mask;
    root.addChild(mask);

    this.app.stage.addChild(root);

    const layers = new CanvasLayers(this.app, { parent: root });
    layers.initialize();

    const context: VirtualCanvasContext = {
      id,
      root,
      mask,
      layers,
      placeholder,
      isVisible: false,
      lastRect: null,
      scale: 1,
    };

    this.virtualCanvases.set(id, context);

    return context;
  }

  /**
   * Remove a registered canvas.
   */
  public unregisterCanvas(id: string): void {
    const context = this.virtualCanvases.get(id);
    if (!context || !this.app) {
      return;
    }

    context.root.removeChild(context.mask);
    context.mask.destroy();

    context.root.removeChildren();
    this.app.stage.removeChild(context.root);
    context.root.destroy({ children: true });

    this.virtualCanvases.delete(id);
  }

  public getLayers(id: string): LayerSystem | null {
    const context = this.virtualCanvases.get(id);
    return context?.layers.getAllLayers() ?? null;
  }

  public getApplication(): Application | null {
    return this.app;
  }

  private mountCanvas(): void {
    if (!this.app || !this.config) {
      return;
    }

    const { container } = this.config;
    if (!container) {
      throw new Error('SharedCanvasEngine container not provided');
    }

    // Ensure container is positioned to host overlay.
    const existingPosition = window.getComputedStyle(container).position;
    if (existingPosition === 'static' || !existingPosition) {
      container.style.position = 'relative';
    }

    if (!container.classList.contains('single-canvas-host')) {
      container.classList.add('single-canvas-host');
    }

    container.appendChild(this.app.canvas);

    const canvasStyle = this.app.canvas.style;
    canvasStyle.position = 'absolute';
    canvasStyle.top = '0';
    canvasStyle.left = '50%';
    canvasStyle.transform = 'translateX(-50%)';
    canvasStyle.width = '100%';
    canvasStyle.height = '100%';
    canvasStyle.pointerEvents = 'auto';
    canvasStyle.zIndex = '1';
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize, { passive: true });

    if (this.config) {
      this.resizeObserver = new ResizeObserver(() => {
        this.viewportWidth = this.config!.container.clientWidth || window.innerWidth;
        this.viewportHeight = window.innerHeight;
        this.resizeRenderer();
      });
      this.resizeObserver.observe(this.config.container);
    }
  }

  private handleResize = (): void => {
    this.viewportWidth = this.config?.container.clientWidth || window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.resizeRenderer();
  };

  private resizeRenderer(): void {
    if (!this.app) {
      return;
    }

    this.app.renderer.resize(this.viewportWidth, this.viewportHeight);
  }

  private update(): void {
    if (!this.app) {
      return;
    }

    this.virtualCanvases.forEach((context) => {
      this.updateVirtualCanvas(context);
    });
  }

  private updateVirtualCanvas(context: VirtualCanvasContext): void {
    if (!this.app) {
      return;
    }

    const { placeholder, root, mask } = context;
    if (!placeholder.isConnected) {
      root.visible = false;
      context.isVisible = false;
      return;
    }

    const rect = placeholder.getBoundingClientRect();
    const hostRect = this.config?.container.getBoundingClientRect();

    if (!hostRect) {
      root.visible = false;
      context.isVisible = false;
      return;
    }

    const viewportHeight = this.viewportHeight || window.innerHeight;

    const fullyOffscreen = rect.bottom <= 0 || rect.top >= viewportHeight;
    if (fullyOffscreen) {
      root.visible = false;
      context.isVisible = false;
      context.lastRect = rect;
      return;
    }

    context.isVisible = true;
    root.visible = true;

    const scaleX = rect.width / this.baseWidth;
    const scaleY = rect.height / this.baseHeight;
    const scale = Math.min(scaleX, scaleY);
    context.scale = scale;

    const relativeX = rect.left - hostRect.left;
    const relativeY = rect.top - hostRect.top;

    root.position.set(relativeX, relativeY);
    root.scale.set(scale);

    context.lastRect = rect;
  }
}
