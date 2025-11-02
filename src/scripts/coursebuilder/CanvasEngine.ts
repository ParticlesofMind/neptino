import { Application, Assets, Container, Graphics, Sprite, Text, type DisplayObject } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { canvasMarginManager } from "./layout/CanvasMarginManager";

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const DEFAULT_ZOOM_STEP = 0.15;
const SCALE_EPSILON = 0.0001;

type LayerName = "background" | "drawing" | "ui";

interface CanvasObject {
  id: string;
  displayObject: DisplayObject;
}

interface SizeSnapshot {
  width: number;
  height: number;
}

export class CanvasEngine {
  private app: Application | null = null;
  private container: HTMLElement | null = null;
  private canvasScroll: HTMLElement | null = null;
  private perspectiveElement: HTMLElement | null = null;
  private viewport: Viewport | null = null;
  private layers: Record<LayerName, Container> | null = null;
  private marginOverlay: Graphics | null = null;
  private objects = new Map<string, CanvasObject>();
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame: number | null = null;
  private userHasInteracted = false;
  private suppressInteractionFlag = false;
  private marginUnsubscribe: (() => void) | null = null;
  private cleanupCallbacks: Array<() => void> = [];
  private lastMeasuredSize: SizeSnapshot = { width: 0, height: 0 };
  private defaultZoom = 1;
  private grabModeActive = false;
  private ready = false;
  private readyCallbacks: Array<() => void> = [];
  private zoomListeners = new Set<(scale: number) => void>();
  private zoomStep = DEFAULT_ZOOM_STEP;
  private idCounter = 0;

  constructor(private readonly selector: string) {}

  public async init(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    if (this.app) {
      this.queueResize();
      return;
    }

    this.container = document.querySelector<HTMLElement>(this.selector);
    if (!this.container) {
      return;
    }

    this.ensureDomStructure();

    const app = new Application();
    const resolution = Math.max(window.devicePixelRatio ?? 1, 2);

    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution,
      powerPreference: "high-performance",
      preference: "webgl",
    });

    this.app = app;

    const mountTarget = this.canvasScroll ?? this.container;
    mountTarget.appendChild(app.canvas);
    app.canvas.id = "pixi-canvas";
    app.canvas.classList.add("pixi-canvas");

    this.initializeViewport();
    this.createLayers();
    this.drawBackground();
    this.setupMarginOverlay();
    this.setupResizeHandling();
    this.attachWheelHandler();

    this.registerCanvasAPI();
    this.registerCourseBuilderBridge();

    // Apply margins immediately and subscribe for future updates.
    this.updateMargins(canvasMarginManager.getMargins());
    this.marginUnsubscribe = canvasMarginManager.onChange((margins) => this.updateMargins(margins));

    // Kick off an initial resize once layout has settled.
    this.queueResize();
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }

    this.cleanupCallbacks.forEach((cleanup) => cleanup());
    this.cleanupCallbacks = [];

    this.marginUnsubscribe?.();
    this.marginUnsubscribe = null;

    if (this.viewport) {
      this.viewport.destroy();
      this.viewport = null;
    }

    if (this.app) {
      this.app.destroy();
      this.app = null;
    }

    this.layers = null;
    this.marginOverlay = null;
    this.objects.clear();
    this.userHasInteracted = false;
    this.grabModeActive = false;
    this.container = null;
    this.canvasScroll = null;
    this.perspectiveElement = null;
    this.defaultZoom = 1;
    this.lastMeasuredSize = { width: 0, height: 0 };
    this.ready = false;
    this.readyCallbacks = [];
    this.zoomListeners.clear();
  }

  public resetView(): void {
    this.resetZoom();
  }

  public onReady(callback: () => void): void {
    if (this.ready) {
      callback();
      return;
    }

    this.readyCallbacks.push(callback);
  }

  public onZoomChange(callback: (scale: number) => void): () => void {
    this.zoomListeners.add(callback);
    if (this.ready) {
      callback(this.getCurrentZoom());
    }

    return () => {
      this.zoomListeners.delete(callback);
    };
  }

  public getViewport(): Viewport | null {
    return this.viewport;
  }

  public getCurrentZoom(): number {
    return this.viewport?.scale.x ?? this.defaultZoom;
  }

  public getDefaultZoom(): number {
    return this.defaultZoom;
  }

  public zoomTo(scale: number, options?: { keepCentered?: boolean; markInteraction?: boolean }): void {
    if (!this.viewport) return;

    const { keepCentered = true, markInteraction = true } = options ?? {};
    const clampedScale = this.clampScale(scale);
    const currentScale = this.getCurrentZoom();
    const scaleChanged = !this.approximatelyEqual(currentScale, clampedScale, SCALE_EPSILON);
    const previousSuppress = this.suppressInteractionFlag;

    if (!markInteraction) {
      this.suppressInteractionFlag = true;
    }

    if (scaleChanged) {
      this.viewport.setZoom(clampedScale, true);
    }

    if (keepCentered) {
      this.moveCenterIfNecessary(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    }

    this.centerViewportIfUnderflow();

    if (markInteraction) {
      this.userHasInteracted = true;
    }

    this.suppressInteractionFlag = previousSuppress;
    if (scaleChanged) {
      this.notifyZoomChange();
    }
  }

  public zoomByFactor(factor: number, options?: { keepCentered?: boolean }): void {
    if (!isFinite(factor) || factor === 0) {
      return;
    }

    const keepCentered = options?.keepCentered ?? true;
    const targetScale = this.getCurrentZoom() * factor;
    this.zoomTo(targetScale, { keepCentered, markInteraction: true });
  }

  public zoomIn(step = this.zoomStep): void {
    const factor = 1 + Math.max(step, 0);
    this.zoomByFactor(factor);
  }

  public zoomOut(step = this.zoomStep): void {
    const factor = 1 + Math.max(step, 0);
    this.zoomByFactor(1 / factor);
  }

  public resetZoom(): void {
    this.userHasInteracted = false;
    this.zoomTo(this.defaultZoom, { keepCentered: true, markInteraction: false });
  }

  public enableGrabMode(): void {
    const dragPlugin = this.viewport?.plugins.get("drag", true) as any;
    if (dragPlugin) {
      dragPlugin.keyIsPressed = true;
      this.grabModeActive = true;
    }
  }

  public disableGrabMode(): void {
    const dragPlugin = this.viewport?.plugins.get("drag", true) as any;
    if (dragPlugin) {
      dragPlugin.keyIsPressed = false;
    }
    this.grabModeActive = false;
  }

  public isGrabModeActive(): boolean {
    return this.grabModeActive;
  }

  public setZoomStep(step: number): void {
    if (!Number.isFinite(step) || step <= 0) {
      return;
    }
    this.zoomStep = step;
  }

  private ensureDomStructure(): void {
    if (!this.container) return;

    const perspective = this.container.querySelector<HTMLElement>(".engine__perspective");
    this.perspectiveElement = perspective ?? null;

    this.canvasScroll = this.container;
  }

  private initializeViewport(): void {
    if (!this.app) return;

    const renderer = this.app.renderer;

    const viewport = new Viewport({
      screenWidth: Math.max(1, renderer.width),
      screenHeight: Math.max(1, renderer.height),
      worldWidth: BASE_WIDTH,
      worldHeight: BASE_HEIGHT,
      events: renderer.events,
      ticker: this.app.ticker,
    });

    const markUserInteracted = (): void => {
      if (this.suppressInteractionFlag) {
        return;
      }
      this.userHasInteracted = true;
    };

    viewport
      .drag({
        pressDrag: true,
        mouseButtons: "left",
        keyToPress: ["Space", "Spacebar"],
        wheel: false,
        ignoreKeyToPressOnTouch: true,
      })
      .pinch()
      .wheel({
        wheelZoom: true,
        keyToPress: ["ControlLeft", "ControlRight", "MetaLeft", "MetaRight"],
        trackpadPinch: true,
      })
      .decelerate()
      .clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM });

    viewport.clamp({ direction: "all", underflow: "center" });

    viewport.on("drag-start", markUserInteracted);
    viewport.on("pinch-start", markUserInteracted);
    viewport.on("wheel-scroll", markUserInteracted);
    viewport.on("zoomed", () => {
      markUserInteracted();
      this.centerViewportIfUnderflow();
      this.notifyZoomChange();
    });
    viewport.on("moved", markUserInteracted);

    viewport.moveCenter(BASE_WIDTH / 2, BASE_HEIGHT / 2);

    this.viewport = viewport;
    this.app.stage.addChild(viewport);
    this.notifyZoomChange();
  }

  private createLayers(): void {
    if (!this.app) return;

    const background = new Container();
    background.label = "background-layer";

    const drawing = new Container();
    drawing.label = "drawing-layer";

    const ui = new Container();
    ui.label = "ui-layer";

    this.layers = { background, drawing, ui };

    const target = this.viewport ?? this.app.stage;
    target.addChild(background, drawing, ui);
  }

  private drawBackground(): void {
    if (!this.layers) return;

    const gfx = new Graphics();
    gfx.rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0xffffff, alpha: 1 });
    this.layers.background.addChild(gfx);

    const watermark = new Text({
      text: "Pixi Canvas Ready",
      style: {
        fontSize: 36,
        fill: 0x4c6ef5,
        fontWeight: "600",
      },
    });
    watermark.anchor.set(0.5, 0);
    watermark.position.set(BASE_WIDTH / 2, 48);
    this.layers.ui.addChild(watermark);
  }

  private setupMarginOverlay(): void {
    if (!this.layers) return;

    this.marginOverlay = new Graphics();
    this.marginOverlay.alpha = 0.45;
    this.layers.ui.addChild(this.marginOverlay);
  }

  private setupResizeHandling(): void {
    if (!this.app || !this.container) return;

    this.resizeObserver?.disconnect();

    const observer = new ResizeObserver(() => {
      this.queueResize();
    });
    observer.observe(this.container);
    this.resizeObserver = observer;

    const handleWindowResize = (): void => {
      this.queueResize();
    };

    window.addEventListener("resize", handleWindowResize, { passive: true });
    this.cleanupCallbacks.push(() => window.removeEventListener("resize", handleWindowResize));
  }

  private attachWheelHandler(): void {
    if (!this.container) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      if (!this.viewport) return;

      if (event.ctrlKey || event.metaKey) {
        return;
      }

      event.preventDefault();

      const scaleY = this.viewport.scale.y || 1;
      let baseDelta: number;
      switch (event.deltaMode) {
        case 1: // DOM_DELTA_LINE
          baseDelta = event.deltaY * 16;
          break;
        case 2: // DOM_DELTA_PAGE
          baseDelta = event.deltaY * (this.viewport.screenHeight || 1);
          break;
        default:
          baseDelta = event.deltaY;
      }
      const deltaY = baseDelta / scaleY;

      if (!deltaY) {
        return;
      }

      const center = this.viewport.center;
      const targetY = center.y + deltaY;

      this.viewport.moveCenter(center.x, targetY);
      this.centerViewportIfUnderflow({ allowUnderflow: true });
      this.userHasInteracted = true;
    };

    const target = this.container;
    target.addEventListener("wheel", handleWheel, { passive: false });
    this.cleanupCallbacks.push(() => target.removeEventListener("wheel", handleWheel));
  }

  private queueResize(): void {
    if (typeof window === "undefined") return;
    if (this.resizeFrame !== null) return;

    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.syncToContainer();
    });
  }

  private syncToContainer(): void {
    if (!this.app || !this.container) return;

    const width = Math.max(1, Math.round(this.container.clientWidth || this.container.getBoundingClientRect().width));
    const height = Math.max(1, Math.round(this.container.clientHeight || this.container.getBoundingClientRect().height));

    if (width === this.lastMeasuredSize.width && height === this.lastMeasuredSize.height) {
      if (!this.userHasInteracted) {
        this.applyFitToContainer(width, height);
      } else {
        this.centerViewportIfUnderflow();
      }
      this.markReady();
      return;
    }

    this.lastMeasuredSize = { width, height };

    const screen = this.app.renderer.screen;
    if (Math.round(screen.width) !== width || Math.round(screen.height) !== height) {
      this.app.renderer.resize(width, height);
    }
    this.viewport?.resize(width, height, BASE_WIDTH, BASE_HEIGHT);

    if (!this.viewport) {
      this.markReady();
      return;
    }

    const fitScale = this.computeFitScale(width, height);
    this.defaultZoom = fitScale;

    if (!this.userHasInteracted) {
      this.zoomTo(fitScale, { keepCentered: true, markInteraction: false });
    } else {
      this.centerViewportIfUnderflow();
      this.notifyZoomChange();
    }

    this.markReady();
  }

  private applyFitToContainer(width: number, height: number): void {
    const fitScale = this.computeFitScale(width, height);
    this.defaultZoom = fitScale;
    this.zoomTo(fitScale, { keepCentered: true, markInteraction: false });
  }

  private computeFitScale(width: number, height: number): number {
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    if (!isFinite(scale) || scale <= 0) {
      return this.defaultZoom;
    }
    return this.clampScale(scale);
  }

  private clampScale(scale: number): number {
    return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
  }

  private centerViewportIfUnderflow(options?: { allowUnderflow?: boolean }): void {
    if (!this.viewport) return;

    const worldScreenWidth = this.viewport.worldScreenWidth;
    const worldScreenHeight = this.viewport.worldScreenHeight;

    const { allowUnderflow = false } = options ?? {};

    if (!allowUnderflow && (worldScreenWidth <= this.viewport.screenWidth || worldScreenHeight <= this.viewport.screenHeight)) {
      this.moveCenterIfNecessary(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    }
  }

  private moveCenterIfNecessary(targetX: number, targetY: number): void {
    if (!this.viewport) return;

    const center = this.viewport.center;
    if (
      this.approximatelyEqual(center.x, targetX, 0.5) &&
      this.approximatelyEqual(center.y, targetY, 0.5)
    ) {
      return;
    }

    this.viewport.moveCenter(targetX, targetY);
  }

  private approximatelyEqual(a: number, b: number, epsilon = SCALE_EPSILON): boolean {
    return Math.abs(a - b) <= epsilon;
  }

  private markReady(): void {
    if (this.ready) {
      return;
    }

    this.ready = true;
    const callbacks = [...this.readyCallbacks];
    this.readyCallbacks = [];
    callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.warn("CanvasEngine ready callback failed:", error);
      }
    });
    this.notifyZoomChange();
  }

  private notifyZoomChange(): void {
    if (!this.ready) {
      return;
    }

    const scale = this.getCurrentZoom();
    this.zoomListeners.forEach((listener) => {
      try {
        listener(scale);
      } catch (error) {
        console.warn("CanvasEngine zoom listener error:", error);
      }
    });
  }

  private updateMargins(margins: { top: number; right: number; bottom: number; left: number }): void {
    if (!this.marginOverlay) return;

    const safeWidth = Math.max(0, BASE_WIDTH - (margins.left + margins.right));
    const safeHeight = Math.max(0, BASE_HEIGHT - (margins.top + margins.bottom));

    this.marginOverlay.clear();

    this.marginOverlay
      .rect(margins.left, margins.top, safeWidth, safeHeight)
      .stroke({ color: 0x4c6ef5, width: 4, alpha: 0.75 });

    this.marginOverlay
      .rect(margins.left, margins.top, safeWidth, safeHeight)
      .fill({ color: 0x4c6ef5, alpha: 0.04 });
  }

  private registerCanvasAPI(): void {
    if (!this.app || !this.layers) return;

    const api = {
      getApp: () => this.app,
      getViewport: () => this.viewport,
      getLayer: (name: LayerName) => this.layers?.[name] ?? null,
      getDimensions: () => ({ width: BASE_WIDTH, height: BASE_HEIGHT }),
      getCurrentZoom: () => this.getCurrentZoom(),
      getDefaultZoom: () => this.getDefaultZoom(),
      fitToContainer: () => {
        this.userHasInteracted = false;
        const { width, height } = this.lastMeasuredSize;
        if (width && height) {
          this.applyFitToContainer(width, height);
        } else {
          this.queueResize();
        }
      },
      resetView: () => this.resetView(),
      zoomIn: (step?: number) => this.zoomIn(step ?? this.zoomStep),
      zoomOut: (step?: number) => this.zoomOut(step ?? this.zoomStep),
      resetZoom: () => this.resetZoom(),
      enableGrabMode: () => this.enableGrabMode(),
      disableGrabMode: () => this.disableGrabMode(),
      isGrabModeActive: () => this.isGrabModeActive(),
      addText: (content: string, x: number, y: number) => this.addText(content, x, y),
      addImage: (url: string, x: number, y: number) => this.addImage(url, x, y),
      addAudioElement: (url: string, title: string, x: number, y: number) => this.addText(`🎧 ${title}`, x, y),
      addAudioPlaceholder: (title: string) => this.addText(`🎵 ${title}`, BASE_WIDTH / 2, BASE_HEIGHT / 2),
      addVideoElement: (url: string, title: string, x: number, y: number) => this.addText(`📹 ${title}`, x, y),
      showSnapHintForId: (id: string) => this.flashObject(id),
      destroy: () => this.destroy(),
    };

    try {
      (window as any).canvasAPI = api;
      (window as any).canvasSystem = {
        app: this.app,
        viewport: this.viewport,
        marginManager: canvasMarginManager,
        dimensionManager: {
          getCurrentDimensions: () => ({ width: BASE_WIDTH, height: BASE_HEIGHT }),
        },
        fitToContainer: api.fitToContainer,
      };
    } catch {
      /* ignore global assignment errors */
    }
  }

  private registerCourseBuilderBridge(): void {
    try {
      (window as any).courseBuilder = {
        updateCanvasMargins: (margins: { top: number; right: number; bottom: number; left: number }) => {
          canvasMarginManager.setMargins({
            top: margins.top,
            right: margins.right,
            bottom: margins.bottom,
            left: margins.left,
            unit: "px",
          });
        },
      };
    } catch {
      /* ignore */
    }
  }

  private addText(content: string, x: number, y: number): string {
    if (!this.layers) {
      return "";
    }

    const text = new Text({
      text: content,
      style: {
        fontSize: 24,
        fill: 0x1f2933,
        fontWeight: "500",
      },
    });

    text.anchor.set(0.5);
    text.position.set(x, y);

    return this.registerDisplayObject(text, "drawing");
  }

  private async addImage(url: string, x: number, y: number): Promise<string | null> {
    if (!this.layers) {
      return null;
    }

    try {
      const texture = await Assets.load(url);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(x, y);
      sprite.width = Math.min(texture.width, 320);
      sprite.height = Math.min(texture.height, 320);

      return this.registerDisplayObject(sprite, "drawing");
    } catch (error) {
      console.warn("Failed to load sprite:", error);
      return null;
    }
  }

  private registerDisplayObject(displayObject: DisplayObject, layerName: LayerName): string {
    if (!this.layers) {
      return "";
    }

    const id = `canvas-object-${++this.idCounter}`;
    displayObject.name = id;

    this.layers[layerName].addChild(displayObject);
    this.objects.set(id, { id, displayObject });

    return id;
  }

  private flashObject(id: string): void {
    const item = this.objects.get(id);
    if (!item) return;

    const target = item.displayObject as any;
    const originalAlpha = typeof target.alpha === "number" ? target.alpha : 1;

    target.alpha = 0.4;
    setTimeout(() => {
      target.alpha = originalAlpha;
    }, 250);
  }
}

export const canvasEngine = new CanvasEngine("#canvas-container");
