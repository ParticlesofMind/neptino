import { Application, Assets, Container, Graphics, Sprite, Text, Rectangle, FederatedPointerEvent, type DisplayObject } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { canvasMarginManager } from "./layout/CanvasMarginManager";
import { CanvasLayoutRenderer } from "./layout/CanvasLayoutRenderer";
import type { LayoutBlocks } from "./layout/CanvasLayoutRenderer";

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const DEFAULT_ZOOM_STEP = 0.15;
const SCALE_EPSILON = 0.0001;

export type LayerName = "background" | "drawing" | "ui";

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
  private marginOverlayVisible = true;
  private layoutRenderer: CanvasLayoutRenderer | null = null;
  private layoutBlocks: LayoutBlocks | null = null;
  private interactionOverlay: Graphics | null = null;
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
  private worldSize = { width: BASE_WIDTH, height: BASE_HEIGHT };
  private interactionLocked = false;

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
    this.initializeLayout();
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

    if (this.layoutRenderer) {
      this.layoutRenderer.destroy();
      this.layoutRenderer = null;
    }
    this.layoutBlocks = null;

    if (this.interactionOverlay) {
      this.interactionOverlay.destroy();
      this.interactionOverlay = null;
    }
    this.interactionLocked = false;
    this.worldSize = { width: BASE_WIDTH, height: BASE_HEIGHT };

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
    this.marginOverlayVisible = true;
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

  public getLayers(): Record<LayerName, Container> | null {
    return this.layers;
  }

  public getCanvasElement(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  public getRootElement(): HTMLElement | null {
    return this.container;
  }

  public getLayoutBlocks(): LayoutBlocks | null {
    return this.layoutBlocks;
  }

  public setLayoutVisibility(visible: boolean): void {
    if (!this.layoutBlocks) {
      return;
    }

    this.layoutBlocks.header.visible = visible;
    this.layoutBlocks.body.visible = visible;
    this.layoutBlocks.footer.visible = visible;
  }

  public setMarginOverlayVisibility(visible: boolean): void {
    this.marginOverlayVisible = visible;
    if (this.marginOverlay) {
      this.marginOverlay.visible = visible;
    }
  }

  public getCurrentZoom(): number {
    return this.viewport?.scale.x ?? this.defaultZoom;
  }

  public getDefaultZoom(): number {
    return this.defaultZoom;
  }

  public getRendererResolution(): number {
    if (this.app?.renderer) {
      return this.app.renderer.resolution ?? 1;
    }
    return window.devicePixelRatio ?? 1;
  }

  public setWorldSize(size: { width?: number; height?: number }): void {
    const nextWidth = size.width ?? this.worldSize.width;
    const nextHeight = size.height ?? this.worldSize.height;

    if (nextWidth === this.worldSize.width && nextHeight === this.worldSize.height) {
      return;
    }

    const clampedWidth = Math.max(nextWidth, BASE_WIDTH);
    const clampedHeight = Math.max(nextHeight, BASE_HEIGHT);
    this.worldSize = { width: clampedWidth, height: clampedHeight };

    if (this.viewport) {
      this.viewport.resize(
        this.viewport.screenWidth,
        this.viewport.screenHeight,
        this.worldSize.width,
        this.worldSize.height
      );
      this.viewport.clamp({ direction: "all", underflow: "center" });
      this.centerViewportIfUnderflow({ allowUnderflow: true });
    }

    this.updateInteractionOverlay();
  }

  public resetWorldSize(): void {
    this.setWorldSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
  }

  public setInteractionLocked(locked: boolean): void {
    if (this.interactionLocked === locked) {
      return;
    }
    this.interactionLocked = locked;
    this.updateInteractionOverlay();
  }

  private updateInteractionOverlay(): void {
    if (!this.layers) {
      return;
    }

    if (!this.interactionOverlay) {
      const overlay = new Graphics();
      overlay.label = "interaction-overlay";
      overlay.alpha = 0;
      overlay.eventMode = "none";
      overlay.cursor = "default";

      const stopPropagation = (event: FederatedPointerEvent): void => {
        event.stopPropagation();
      };

      overlay.on("pointerdown", stopPropagation);
      overlay.on("pointermove", stopPropagation);
      overlay.on("pointerup", stopPropagation);
      overlay.on("pointerupoutside", stopPropagation);
      overlay.on("pointercancel", stopPropagation);
      overlay.on("pointertap", stopPropagation);

      overlay.zIndex = 1000;
      this.interactionOverlay = overlay;
      this.layers.ui.addChild(overlay);
    }

    const overlay = this.interactionOverlay;
    const width = this.worldSize.width;
    const height = this.worldSize.height;

    overlay.clear();
    overlay.rect(0, 0, width, height);
    overlay.fill({ color: 0x0f172a, alpha: this.interactionLocked ? 0.04 : 0 });
    overlay.hitArea = new Rectangle(0, 0, width, height);
    overlay.eventMode = this.interactionLocked ? "static" : "none";
    overlay.interactive = this.interactionLocked;
    overlay.cursor = this.interactionLocked ? "not-allowed" : "default";
    overlay.visible = this.interactionLocked;
  }

  public zoomTo(
    scale: number,
    options?: {
      keepCentered?: boolean;
      markInteraction?: boolean;
      targetCenter?: { x: number; y: number };
    },
  ): void {
    if (!this.viewport) return;

    const { keepCentered = true, markInteraction = true, targetCenter } = options ?? {};
    const clampedScale = this.clampScale(scale);
    const currentScale = this.getCurrentZoom();
    const scaleChanged = !this.approximatelyEqual(currentScale, clampedScale, SCALE_EPSILON);
    const previousSuppress = this.suppressInteractionFlag;
    const currentCenter = this.viewport.center;
    const preservedCenter = {
      x: currentCenter.x,
      y: currentCenter.y,
    };

    if (!markInteraction) {
      this.suppressInteractionFlag = true;
    }

    if (scaleChanged) {
      if (targetCenter) {
        this.viewport.setZoom(clampedScale, targetCenter);
      } else if (keepCentered) {
        this.viewport.setZoom(clampedScale, preservedCenter);
      } else {
        this.viewport.setZoom(clampedScale, true);
      }
    }

    if (keepCentered) {
      this.moveCenterIfNecessary(
        targetCenter?.x ?? preservedCenter.x,
        targetCenter?.y ?? preservedCenter.y,
      );
    } else if (targetCenter) {
      this.moveCenterIfNecessary(targetCenter.x, targetCenter.y);
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
    this.zoomTo(this.defaultZoom, {
      keepCentered: true,
      markInteraction: false,
      targetCenter: {
        x: this.worldSize.width / 2,
        y: this.worldSize.height / 2,
      },
    });
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
      worldWidth: this.worldSize.width,
      worldHeight: this.worldSize.height,
      events: renderer.events,
      ticker: this.app.ticker,
    });
    viewport.sortableChildren = true;

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
        wheelZoom: false,
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

    viewport.moveCenter(this.worldSize.width / 2, this.worldSize.height / 2);

    this.viewport = viewport;
    this.app.stage.addChild(viewport);
    this.notifyZoomChange();
  }

  private createLayers(): void {
    if (!this.app) return;

    const background = new Container();
    background.label = "background-layer";
    background.zIndex = 0;

    const drawing = new Container();
    drawing.label = "drawing-layer";
    drawing.sortableChildren = true;
    drawing.zIndex = 30;

    const ui = new Container();
    ui.label = "ui-layer";
    ui.sortableChildren = true;
    ui.zIndex = 60;

    this.layers = { background, drawing, ui };

    const target = this.viewport ?? this.app.stage;
    target.addChild(background, drawing, ui);

    this.updateInteractionOverlay();
  }

  private drawBackground(): void {
    if (!this.layers) return;

    const gfx = new Graphics();
    gfx.rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0xffffff, alpha: 1 });
    this.layers.background.addChild(gfx);

    const watermark = new Text({
      text: "",
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
    this.marginOverlay.visible = this.marginOverlayVisible;
  }

  private initializeLayout(): void {
    if (!this.layers) return;

    // Initialize the layout renderer with current margins
    const margins = canvasMarginManager.getMargins();
    this.layoutRenderer = new CanvasLayoutRenderer({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      margins,
    });

    // Create the layout blocks
    this.layoutBlocks = this.layoutRenderer.createLayout();

    // Add the layout blocks to the drawing layer (below user content)
    this.layoutBlocks.header.zIndex = -1000;
    this.layoutBlocks.body.zIndex = -1000;
    this.layoutBlocks.footer.zIndex = -1000;
    this.layoutBlocks.header.eventMode = "none";
    this.layoutBlocks.body.eventMode = "none";
    this.layoutBlocks.footer.eventMode = "none";
    this.layers.drawing.addChild(this.layoutBlocks.header);
    this.layers.drawing.addChild(this.layoutBlocks.body);
    this.layers.drawing.addChild(this.layoutBlocks.footer);

    console.log("✅ Canvas layout initialized with Header, Body, and Footer blocks");
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

      const baseDelta = this.normalizeWheelDelta(event);

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        this.handleModifierZoom(event, baseDelta);
        return;
      }

      if (!baseDelta) {
        return;
      }

      event.preventDefault();

      const scaleY = this.viewport.scale.y || 1;
      const deltaY = baseDelta / scaleY;

      if (!deltaY) {
        return;
      }

      const center = this.viewport.center;
      const targetY = center.y + deltaY;

      this.viewport.moveCenter(center.x, targetY);
      this.centerViewportIfUnderflow({ allowUnderflow: true });
      this.userHasInteracted = true;
      this.viewport.emit("moved", { viewport: this.viewport, type: "wheel-scroll" });
    };

    const target = this.container;
    target.addEventListener("wheel", handleWheel, { passive: false });
    this.cleanupCallbacks.push(() => target.removeEventListener("wheel", handleWheel));
  }

  private normalizeWheelDelta(event: WheelEvent): number {
    if (!event) {
      return 0;
    }

    switch (event.deltaMode) {
      case 1: // DOM_DELTA_LINE
        return event.deltaY * 16;
      case 2: // DOM_DELTA_PAGE
        return event.deltaY * (this.viewport?.screenHeight || 1);
      default:
        return event.deltaY;
    }
  }

  private handleModifierZoom(event: WheelEvent, baseDelta: number): void {
    if (!this.viewport || !baseDelta) {
      return;
    }

    const clampedDelta = Math.max(-800, Math.min(800, baseDelta));
    const intensity = 0.0012;
    const scaleFactor = Math.exp(-clampedDelta * intensity);
    const currentScale = this.getCurrentZoom();
    const targetScale = this.clampScale(currentScale * scaleFactor);

    let targetCenter = this.viewport.center;
    const rect = this.container?.getBoundingClientRect();
    if (rect) {
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldPoint = this.viewport.toWorld(pointerX, pointerY);
      if (worldPoint) {
        targetCenter = worldPoint;
      }
    }

    this.zoomTo(targetScale, {
      keepCentered: false,
      targetCenter,
    });

    this.viewport.emit("wheel-scroll", { viewport: this.viewport, type: "wheel-zoom" });
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
    this.viewport?.resize(width, height, this.worldSize.width, this.worldSize.height);

    if (!this.viewport) {
      this.markReady();
      return;
    }

    const fitScale = this.computeFitScale(width, height);
    this.defaultZoom = fitScale;

    if (!this.userHasInteracted) {
      this.zoomTo(fitScale, {
        keepCentered: true,
        markInteraction: false,
        targetCenter: {
          x: this.worldSize.width / 2,
          y: this.worldSize.height / 2,
        },
      });
    } else {
      this.centerViewportIfUnderflow();
      this.notifyZoomChange();
    }

    this.markReady();
  }

  private applyFitToContainer(width: number, height: number): void {
    const fitScale = this.computeFitScale(width, height);
    this.defaultZoom = fitScale;
    this.zoomTo(fitScale, {
      keepCentered: true,
      markInteraction: false,
      targetCenter: {
        x: this.worldSize.width / 2,
        y: this.worldSize.height / 2,
      },
    });
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
      this.moveCenterIfNecessary(this.worldSize.width / 2, this.worldSize.height / 2);
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

    // Update layout blocks with new margins
    if (this.layoutRenderer) {
      this.layoutRenderer.updateMargins({ ...margins, unit: "px" });
      console.log("📐 Layout blocks updated with new margins:", margins);
    }

    this.marginOverlay.visible = this.marginOverlayVisible;
  }

  private registerCanvasAPI(): void {
    if (!this.app || !this.layers) return;

    const api = {
      getApp: () => this.app,
      getViewport: () => this.viewport,
      getLayer: (name: LayerName) => this.layers?.[name] ?? null,
      getLayoutBlocks: () => this.getLayoutBlocks(),
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
        layoutBlocks: this.layoutBlocks,
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

  public addDisplayObject(displayObject: DisplayObject, layerName: LayerName = "drawing"): string | null {
    if (!this.layers) {
      return null;
    }

    return this.registerDisplayObject(displayObject, layerName);
  }

  public removeObject(id: string): boolean {
    const entry = this.objects.get(id);
    if (!entry) {
      return false;
    }

    const parent = entry.displayObject.parent;
    if (parent) {
      parent.removeChild(entry.displayObject);
    }

    this.objects.delete(id);
    return true;
  }

  public getObjectById(id: string): DisplayObject | null {
    return this.objects.get(id)?.displayObject ?? null;
  }

  public getObjectsSnapshot(): Array<{ id: string; displayObject: DisplayObject }> {
    return Array.from(this.objects.values()).map(({ id, displayObject }) => ({
      id,
      displayObject,
    }));
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
