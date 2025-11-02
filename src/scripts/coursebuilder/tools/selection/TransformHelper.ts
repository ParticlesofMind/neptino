import { Container, Graphics, Point, type DisplayObject } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { CanvasEngine } from "../../CanvasEngine";

type HandleId =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";

type HandleType = "corner" | "edge";

interface HandleConfig {
  id: HandleId;
  cursor: string;
  axisX: -1 | 0 | 1;
  axisY: -1 | 0 | 1;
  kind: HandleType;
}

interface TransformHandle {
  config: HandleConfig;
  graphic: Graphics;
}

type InteractionKind = "move" | "scale" | "rotate";

interface InteractionState {
  kind: InteractionKind;
  pointerId: number;
  startWorld: Point;
  startCenter: Point;
  startScale: Point;
  startVector: Point;
  startRotation: number;
  handle?: HandleConfig;
}

const HANDLE_CONFIGS: HandleConfig[] = [
  { id: "top-left", cursor: "nwse-resize", axisX: -1, axisY: -1, kind: "corner" },
  { id: "top-right", cursor: "nesw-resize", axisX: 1, axisY: -1, kind: "corner" },
  { id: "bottom-left", cursor: "nesw-resize", axisX: -1, axisY: 1, kind: "corner" },
  { id: "bottom-right", cursor: "nwse-resize", axisX: 1, axisY: 1, kind: "corner" },
  { id: "top", cursor: "ns-resize", axisX: 0, axisY: -1, kind: "edge" },
  { id: "bottom", cursor: "ns-resize", axisX: 0, axisY: 1, kind: "edge" },
  { id: "left", cursor: "ew-resize", axisX: -1, axisY: 0, kind: "edge" },
  { id: "right", cursor: "ew-resize", axisX: 1, axisY: 0, kind: "edge" },
];

const HANDLE_SIZE = 18;
const ROTATE_OFFSET = 48;
const SNAP_ANGLE = (Math.PI / 180) * 15;
const MIN_SCALE = 0.05;

export class TransformHelper {
  private readonly frame = new Graphics();
  private readonly handles: TransformHandle[] = [];
  private readonly rotateHandle: Graphics;
  private target: DisplayObject | null = null;
  private viewport: Viewport | null = null;
  private interaction: InteractionState | null = null;
  private readonly canvasElement: HTMLCanvasElement | null;

  constructor(private readonly overlayLayer: Container, private readonly canvas: CanvasEngine) {
    this.frame.eventMode = "static";
    this.frame.cursor = "move";
    this.frame.alpha = 0.9;
    this.frame.on("pointerdown", (event: FederatedPointerEvent) => this.beginMove(event));

    this.rotateHandle = new Graphics();
    this.rotateHandle.eventMode = "static";
    this.rotateHandle.cursor = "crosshair";
    this.rotateHandle.on("pointerdown", (event: FederatedPointerEvent) => this.beginRotate(event));

    overlayLayer.addChild(this.frame, this.rotateHandle);
    this.canvasElement = canvas.getCanvasElement();
  }

  public attach(target: DisplayObject): void {
    if (this.target === target) {
      this.render();
      return;
    }

    this.target = target;
    this.viewport = this.canvas.getViewport();
    this.ensureHandles();
    this.render();
    this.frame.visible = true;
    this.rotateHandle.visible = true;
  }

  public detach(): void {
    this.target = null;
    this.frame.clear();
    this.frame.visible = false;
    this.rotateHandle.visible = false;
    this.handles.forEach(({ graphic }) => {
      graphic.clear();
      graphic.visible = false;
    });
    this.cancelInteraction();
  }

  public destroy(): void {
    this.detach();
    this.frame.destroy();
    this.rotateHandle.destroy();
    this.handles.forEach(({ graphic }) => graphic.destroy());
  }

  private ensureHandles(): void {
    if (this.handles.length) {
      return;
    }

    HANDLE_CONFIGS.forEach((config) => {
      const handle = new Graphics();
      handle.eventMode = "static";
      handle.cursor = config.cursor;
      handle.on("pointerdown", (event: FederatedPointerEvent) => this.beginScale(config, event));
      this.overlayLayer.addChild(handle);
      this.handles.push({ config, graphic: handle });
    });
  }

  private render(): void {
    if (!this.target) {
      return;
    }

    const bounds = this.target.getBounds(true);
    const scale = Math.max(this.canvas.getCurrentZoom(), 0.0001);
    const handleRadius = HANDLE_SIZE / scale / 2;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    this.frame.clear();
    this.frame.rect(bounds.x, bounds.y, bounds.width, bounds.height).stroke({
      color: 0x4a7fb8,
      width: 2 / scale,
      alignment: 0.5,
    });

    this.handles.forEach(({ config, graphic }) => {
      const position = this.resolveHandlePosition(config.id, bounds, centerX, centerY);
      this.drawHandle(graphic, position.x, position.y, handleRadius);
      graphic.visible = true;
    });

    this.drawRotateHandle(centerX, bounds.y - ROTATE_OFFSET / scale, handleRadius * 0.9);
  }

  private drawHandle(graphic: Graphics, x: number, y: number, radius: number): void {
    graphic.clear();
    graphic.circle(x, y, radius * 1.6).fill({ color: 0xffffff, alpha: 0.001 });
    graphic.circle(x, y, radius).fill({ color: 0xb3d7ff, alpha: 1 }).stroke({ color: 0x4a7fb8, width: radius * 0.35 });
  }

  private drawRotateHandle(x: number, y: number, radius: number): void {
    this.rotateHandle.clear();
    this.rotateHandle.circle(x, y, radius * 1.9).fill({ color: 0xffffff, alpha: 0.001 });
    this.rotateHandle.circle(x, y, radius).fill({ color: 0xb3d7ff, alpha: 1 }).stroke({
      color: 0x4a7fb8,
      width: radius * 0.3,
    });
    this.rotateHandle.lineStyle({ width: radius * 0.4, color: 0x4a7fb8 }).moveTo(x, y + radius).lineTo(x, y + radius * 3);
  }

  private resolveHandlePosition(id: HandleId, bounds: { x: number; y: number; width: number; height: number }, cx: number, cy: number): Point {
    switch (id) {
      case "top-left":
        return new Point(bounds.x, bounds.y);
      case "top-right":
        return new Point(bounds.x + bounds.width, bounds.y);
      case "bottom-left":
        return new Point(bounds.x, bounds.y + bounds.height);
      case "bottom-right":
        return new Point(bounds.x + bounds.width, bounds.y + bounds.height);
      case "top":
        return new Point(cx, bounds.y);
      case "bottom":
        return new Point(cx, bounds.y + bounds.height);
      case "left":
        return new Point(bounds.x, cy);
      case "right":
        return new Point(bounds.x + bounds.width, cy);
      default:
        return new Point(cx, cy);
    }
  }

  private beginMove(event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native || !this.target) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.target.getBounds(true);
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    this.interaction = {
      kind: "move",
      pointerId: native.pointerId,
      startWorld: world,
      startCenter: center,
      startScale: new Point(this.target.scale.x, this.target.scale.y),
      startVector: new Point(1, 1),
      startRotation: this.target.rotation,
    };
    this.bindPointerEvents();
    native.preventDefault();
  }

  private beginRotate(event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native || !this.target) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.target.getBounds(true);
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    this.interaction = {
      kind: "rotate",
      pointerId: native.pointerId,
      startWorld: world,
      startCenter: center,
      startScale: new Point(this.target.scale.x, this.target.scale.y),
      startVector: new Point(world.x - center.x, world.y - center.y),
      startRotation: this.target.rotation,
    };
    this.bindPointerEvents();
    native.preventDefault();
  }

  private beginScale(config: HandleConfig, event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native || !this.target) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.target.getBounds(true);
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    this.interaction = {
      kind: "scale",
      pointerId: native.pointerId,
      handle: config,
      startWorld: world,
      startCenter: center,
      startScale: new Point(this.target.scale.x, this.target.scale.y),
      startVector: new Point(world.x - center.x, world.y - center.y),
      startRotation: this.target.rotation,
    };
    this.bindPointerEvents();
    native.preventDefault();
    event.stopPropagation();
  }

  private pointerToWorld(event: PointerEvent): Point | null {
    if (!this.viewport || !this.canvasElement) {
      return null;
    }
    const rect = this.canvasElement.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const converted = this.viewport.toWorld(localX, localY);
    return new Point(converted.x, converted.y);
  }

  private bindPointerEvents(): void {
    window.addEventListener("pointermove", this.handlePointerMove, { passive: false });
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointercancel", this.handlePointerUp);
  }

  private unbindPointerEvents(): void {
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerUp);
  }

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.interaction || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    const world = this.pointerToWorld(event);
    if (!world || !this.target) {
      return;
    }

    switch (this.interaction.kind) {
      case "move":
        this.applyMove(world);
        break;
      case "scale":
        this.applyScale(world, event.shiftKey);
        break;
      case "rotate":
        this.applyRotate(world, event.altKey || event.metaKey);
        break;
      default:
        break;
    }

    event.preventDefault();
    this.render();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.interaction || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    this.cancelInteraction();
  };

  private applyMove(world: Point): void {
    if (!this.interaction || !this.target) {
      return;
    }
    const deltaX = world.x - this.interaction.startWorld.x;
    const deltaY = world.y - this.interaction.startWorld.y;
    const parent = this.target.parent;
    if (!parent) {
      return;
    }
    const nextCenter = new Point(this.interaction.startCenter.x + deltaX, this.interaction.startCenter.y + deltaY);
    const local = parent.toLocal(nextCenter);
    this.target.position.set(local.x, local.y);
  }

  private applyScale(world: Point, uniform: boolean): void {
    if (!this.interaction || !this.target || !this.interaction.handle) {
      return;
    }
    const { handle } = this.interaction;
    const delta = new Point(world.x - this.interaction.startCenter.x, world.y - this.interaction.startCenter.y);
    const startVec = this.interaction.startVector;
    const scale = this.interaction.startScale.clone();

    if (handle.axisX !== 0 && Math.abs(startVec.x) > 1e-4) {
      const ratioX = delta.x / startVec.x;
      scale.x = this.clampScale(this.interaction.startScale.x * ratioX * handle.axisX);
    }
    if (handle.axisY !== 0 && Math.abs(startVec.y) > 1e-4) {
      const ratioY = delta.y / startVec.y;
      scale.y = this.clampScale(this.interaction.startScale.y * ratioY * handle.axisY);
    }

    if (uniform && handle.kind === "corner") {
      const magnitude = Math.max(Math.abs(scale.x), Math.abs(scale.y));
      const signX = Math.sign(scale.x) || 1;
      const signY = Math.sign(scale.y) || 1;
      scale.x = magnitude * signX;
      scale.y = magnitude * signY;
    }

    this.target.scale.set(scale.x, scale.y);
  }

  private applyRotate(world: Point, snap: boolean): void {
    if (!this.interaction || !this.target) {
      return;
    }
    const deltaX = world.x - this.interaction.startCenter.x;
    const deltaY = world.y - this.interaction.startCenter.y;
    const angle = Math.atan2(deltaY, deltaX);
    const initialVec = this.interaction.startVector;
    const initialAngle = Math.atan2(initialVec.y, initialVec.x);
    let rotation = this.interaction.startRotation + (angle - initialAngle);
    if (snap) {
      rotation = Math.round(rotation / SNAP_ANGLE) * SNAP_ANGLE;
    }
    this.target.rotation = rotation;
  }

  private clampScale(value: number): number {
    const sign = Math.sign(value) || 1;
    return sign * Math.max(MIN_SCALE, Math.abs(value));
  }

  private cancelInteraction(): void {
    this.interaction = null;
    this.unbindPointerEvents();
  }
}
