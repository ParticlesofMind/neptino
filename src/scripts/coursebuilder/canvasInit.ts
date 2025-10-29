import { Application, Assets, Container, Graphics, Sprite, Text, type DisplayObject } from "pixi.js";
import { canvasMarginManager } from "./layout/CanvasMarginManager";

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;

type LayerName = "background" | "drawing" | "ui";

interface SimpleCanvasObject {
  id: string;
  displayObject: DisplayObject;
}

class SimpleCanvas {
  private app: Application | null = null;
  private container: HTMLElement | null = null;
  private layers: Record<LayerName, Container> | null = null;
  private marginOverlay: Graphics | null = null;
  private objects = new Map<string, SimpleCanvasObject>();
  private resizeHandler: (() => void) | null = null;
  private idCounter = 0;
  private leftDock: HTMLElement | null = null;
  private rightDock: HTMLElement | null = null;
  private perspectiveElement: HTMLElement | null = null;
  private canvasScroll: HTMLElement | null = null;
  private perspectiveSide: "left" | "right" = "left";
  private dragTarget: "left" | "right" = "left";
  private isDraggingPerspective = false;
  private perspectivePointerId: number | null = null;
  private perspectiveDragInitialized = false;

  constructor(private readonly selector: string) {}

  public async init(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    if (this.app) {
      return;
    }

    this.container = document.querySelector<HTMLElement>(this.selector);
    if (!this.container) {
      return;
    }

    this.ensureDomStructure();
    this.setupPerspectiveDrag();

    const app = new Application();

    await app.init({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      backgroundColor: 0xffffff,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: "high-performance",
      preference: "webgl",
      resizeTo: this.canvasScroll ?? this.container,
    });

    this.app = app;
    const mountTarget = this.canvasScroll ?? this.container;
    mountTarget.appendChild(app.canvas);
    app.canvas.id = "pixi-canvas";
    app.canvas.classList.add("pixi-canvas");

    this.createLayers();
    this.drawBackground();
    this.setupMarginOverlay();
    this.attachResizeHandler();

    this.registerCanvasAPI();
    this.registerCourseBuilderBridge();
    this.updateStageTransform();

    // Apply the current margins immediately and listen for future updates.
    this.updateMargins(canvasMarginManager.getMargins());
    canvasMarginManager.onChange((margins) => this.updateMargins(margins));
  }

  private ensureDomStructure(): void {
    if (!this.container) return;

    const controls = this.container.querySelector<HTMLElement>(".engine__controls");

    let inner = this.container.querySelector<HTMLElement>(".engine__canvas-inner");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "engine__canvas-inner";
    }

    let main = inner.querySelector<HTMLElement>(".engine__canvas-main");
    if (!main) {
      main = document.createElement("div");
      main.className = "engine__canvas-main";
    }

    let dockLeft = inner.querySelector<HTMLElement>(".engine__canvas-dock--left");
    if (!dockLeft) {
      dockLeft = document.createElement("div");
      dockLeft.className = "engine__canvas-dock engine__canvas-dock--left";
    }

    let dockRight = inner.querySelector<HTMLElement>(".engine__canvas-dock--right");
    if (!dockRight) {
      dockRight = document.createElement("div");
      dockRight.className = "engine__canvas-dock engine__canvas-dock--right";
    }

    let scroll = main.querySelector<HTMLElement>(".engine__canvas-scroll");
    if (!scroll) {
      scroll = document.createElement("div");
      scroll.className = "engine__canvas-scroll";
      main.insertBefore(scroll, main.firstChild);
    }

    if (!inner.parentElement) {
      if (controls) {
        this.container.insertBefore(inner, controls);
      } else {
        this.container.appendChild(inner);
      }
    }

    if (dockLeft.parentElement !== inner) {
      inner.insertBefore(dockLeft, inner.firstChild);
    }
    if (main.parentElement !== inner) {
      if (dockLeft.nextSibling) {
        inner.insertBefore(main, dockLeft.nextSibling);
      } else {
        inner.appendChild(main);
      }
    }
    if (dockRight.parentElement !== inner) {
      inner.appendChild(dockRight);
    }

    const perspective = this.container.querySelector<HTMLElement>(".engine__perspective");
    if (perspective) {
      if (this.perspectiveSide === "right") {
        dockRight.appendChild(perspective);
      } else {
        dockLeft.appendChild(perspective);
        this.perspectiveSide = "left";
        this.dragTarget = "left";
      }
    }

    this.leftDock = dockLeft;
    this.rightDock = dockRight;

    this.perspectiveElement = perspective ?? null;
    const movableChildren = Array.from(this.container.children).filter((child) => {
      if (child === inner || child === controls) return false;
      return true;
    });

    movableChildren.forEach((child) => {
      main.appendChild(child);
    });

    this.canvasScroll = scroll;

    if (this.perspectiveElement) {
      this.setupPerspectiveDrag();
    }

    this.updateDockStates();
  }

  private setupPerspectiveDrag(): void {
    if (this.perspectiveDragInitialized) return;
    if (!this.perspectiveElement) return;

    this.perspectiveDragInitialized = true;
    this.perspectiveElement.style.touchAction = "none";
    this.perspectiveElement.addEventListener("pointerdown", this.handlePerspectivePointerDown);
  }

  private handlePerspectivePointerDown = (event: PointerEvent): void => {
    if (!this.perspectiveElement || !this.container) return;
    if (event.button !== undefined && event.button !== 0 && event.pointerType !== "touch") {
      return;
    }

    event.preventDefault();
    this.isDraggingPerspective = true;
    this.perspectivePointerId = event.pointerId;
    this.perspectiveElement.classList.add("engine__perspective--dragging");

    try {
      this.perspectiveElement.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    this.updateDragTarget(event.clientX);

    window.addEventListener("pointermove", this.handlePerspectivePointerMove, { passive: true });
    window.addEventListener("pointerup", this.handlePerspectivePointerUp, { passive: true });
  };

  private handlePerspectivePointerMove = (event: PointerEvent): void => {
    if (!this.isDraggingPerspective) return;
    this.updateDragTarget(event.clientX);
  };

  private handlePerspectivePointerUp = (event: PointerEvent): void => {
    if (!this.isDraggingPerspective) return;
    this.isDraggingPerspective = false;

    if (this.perspectiveElement && this.perspectivePointerId !== null) {
      try {
        this.perspectiveElement.releasePointerCapture(this.perspectivePointerId);
      } catch {
        /* ignore */
      }
    }

    this.perspectivePointerId = null;
    this.perspectiveElement?.classList.remove("engine__perspective--dragging");
    if (this.perspectiveElement) {
      this.perspectiveElement.style.transform = "";
    }

    window.removeEventListener("pointermove", this.handlePerspectivePointerMove);
    window.removeEventListener("pointerup", this.handlePerspectivePointerUp);

    this.setPerspectiveDock(this.dragTarget);
    this.clearDockTargetState();
  };

  private updateDragTarget(clientX: number): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const target: "left" | "right" = clientX < midpoint ? "left" : "right";

    this.dragTarget = target;

    if (!this.isDraggingPerspective) {
      return;
    }

    this.leftDock?.classList.toggle("engine__canvas-dock--target", target === "left");
    this.rightDock?.classList.toggle("engine__canvas-dock--target", target === "right");
  }

  private clearDockTargetState(): void {
    this.leftDock?.classList.remove("engine__canvas-dock--target");
    this.rightDock?.classList.remove("engine__canvas-dock--target");
  }

  private setPerspectiveDock(side: "left" | "right"): void {
    if (!this.container) {
      return;
    }

    this.perspectiveSide = side;
    this.dragTarget = side;

    const targetDock = side === "left" ? this.leftDock : this.rightDock;

    if (this.perspectiveElement && targetDock) {
      if (this.perspectiveElement.parentElement !== targetDock) {
        targetDock.appendChild(this.perspectiveElement);
      }
    }

    if (this.perspectiveElement) {
      this.perspectiveElement.style.transform = "";
    }

    this.clearDockTargetState();
    this.updateDockStates();
  }

  private updateDockStates(): void {
    const leftActive = this.perspectiveSide === "left";
    this.leftDock?.classList.toggle("engine__canvas-dock--active", leftActive);
    this.rightDock?.classList.toggle("engine__canvas-dock--active", !leftActive);
    if (this.container) {
      this.container.classList.toggle("engine__canvas--perspective-right", !leftActive);
    }
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
    this.app.stage.addChild(background, drawing, ui);
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
    watermark.x = BASE_WIDTH / 2;
    watermark.y = 48;
    watermark.anchor.set(0.5, 0);
    this.layers.ui.addChild(watermark);
  }

  private setupMarginOverlay(): void {
    if (!this.layers) return;

    this.marginOverlay = new Graphics();
    this.marginOverlay.alpha = 0.45;
    this.layers.ui.addChild(this.marginOverlay);
  }

  private attachResizeHandler(): void {
    if (!this.app) return;

    const handler = () => this.updateStageTransform();
    this.resizeHandler = handler;

    const rendererEvents = (this.app.renderer as any)?.events;
    if (rendererEvents && typeof rendererEvents.on === "function") {
      rendererEvents.on("resize", handler);
    } else {
      window.addEventListener("resize", handler);
    }
  }

  private updateStageTransform(): void {
    if (!this.app) return;

    const screen = this.app.renderer.screen;
    const scale = Math.min(screen.width / BASE_WIDTH, screen.height / BASE_HEIGHT);

    this.app.stage.scale.set(scale);
    this.app.stage.position.set(
      (screen.width - BASE_WIDTH * scale) / 2,
      (screen.height - BASE_HEIGHT * scale) / 2,
    );
  }

  private updateMargins(margins: { top: number; right: number; bottom: number; left: number }): void {
    if (!this.marginOverlay) return;

    const safeWidth = Math.max(0, BASE_WIDTH - (margins.left + margins.right));
    const safeHeight = Math.max(0, BASE_HEIGHT - (margins.top + margins.bottom));

    this.marginOverlay.clear();

    this.marginOverlay.rect(
      margins.left,
      margins.top,
      safeWidth,
      safeHeight,
    ).stroke({ color: 0x4c6ef5, width: 4, alpha: 0.75 });

    this.marginOverlay.rect(
      margins.left,
      margins.top,
      safeWidth,
      safeHeight,
    ).fill({ color: 0x4c6ef5, alpha: 0.04 });
  }

  private registerCanvasAPI(): void {
    if (!this.app || !this.layers) return;

    const api = {
      getApp: () => this.app,
      getLayer: (name: LayerName) => this.layers?.[name] ?? null,
      getDimensions: () => ({ width: BASE_WIDTH, height: BASE_HEIGHT }),
      addText: (content: string, x: number, y: number) => this.addText(content, x, y),
      addImage: (url: string, x: number, y: number) => this.addImage(url, x, y),
      addAudioElement: (url: string, title: string, x: number, y: number) =>
        this.addText(`🎧 ${title}`, x, y),
      addAudioPlaceholder: (title: string) => this.addText(`🎵 ${title}`, BASE_WIDTH / 2, BASE_HEIGHT / 2),
      addVideoElement: (url: string, title: string, x: number, y: number) =>
        this.addText(`📹 ${title}`, x, y),
      showSnapHintForId: (id: string) => this.flashObject(id),
    };

    try {
      (window as any).canvasAPI = api;
      (window as any).canvasSystem = {
        app: this.app,
        marginManager: canvasMarginManager,
        dimensionManager: {
          getCurrentDimensions: () => ({ width: BASE_WIDTH, height: BASE_HEIGHT }),
        },
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

const simpleCanvas = new SimpleCanvas("#canvas-container");

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void simpleCanvas.init();
    });
  } else {
    void simpleCanvas.init();
  }
}
