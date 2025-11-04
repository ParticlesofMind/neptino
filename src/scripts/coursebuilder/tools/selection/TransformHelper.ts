import { Container, Graphics, Point, Rectangle, type DisplayObject } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { CanvasEngine } from "../../CanvasEngine";
import type { SelectionTarget } from "./SelectionManager";

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

interface SelectionSnapshotEntry {
  object: DisplayObject;
  parent: Container | null;
  startWorldPosition: Point;
  offsetFromCenter: Point;
  startScale: Point;
  startRotation: number;
}

interface InteractionState {
  kind: InteractionKind;
  pointerId: number;
  startWorld: Point;
  startCenter: Point;
  startPointerVector: Point;
  handle?: HandleConfig;
  snapshots: SelectionSnapshotEntry[];
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
  private readonly selectionMutated?: () => void;
  private selection: SelectionTarget[] = [];
  private viewport: Viewport | null = null;
  private interaction: InteractionState | null = null;
  private readonly canvasElement: HTMLCanvasElement | null;

  constructor(private readonly overlayLayer: Container, private readonly canvas: CanvasEngine, selectionMutated?: () => void) {
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
    this.selectionMutated = selectionMutated;
  }

  public attach(selection: SelectionTarget[]): void {
    const normalized = this.normalizeSelection(selection);
    if (!normalized.length) {
      this.detach();
      return;
    }

    if (this.isSameSelection(normalized)) {
      this.selection = normalized;
      this.render();
      this.frame.visible = true;
      this.rotateHandle.visible = true;
      return;
    }

    this.selection = normalized;
    this.viewport = this.canvas.getViewport();
    this.ensureHandles();
    this.render();
    this.frame.visible = true;
    this.rotateHandle.visible = true;
  }

  public translate(deltaX: number, deltaY: number): void {
    if (!this.selection.length) {
      return;
    }
    if (Math.abs(deltaX) < 1e-4 && Math.abs(deltaY) < 1e-4) {
      return;
    }

    this.selection.forEach(({ object }) => {
      const parent = object.parent ?? null;
      const worldPosition = parent ? parent.toGlobal(object.position) : new Point(object.position.x, object.position.y);
      worldPosition.x += deltaX;
      worldPosition.y += deltaY;
      if (parent) {
        const nextLocal = parent.toLocal(worldPosition);
        object.position.set(nextLocal.x, nextLocal.y);
      } else {
        object.position.set(worldPosition.x, worldPosition.y);
      }
    });

    this.render();
    this.selectionMutated?.();
  }

  public detach(): void {
    this.selection = [];
    this.frame.clear();
    this.frame.visible = false;
    this.rotateHandle.clear();
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
    const bounds = this.computeSelectionBounds();
    if (!bounds) {
      this.frame.visible = false;
      this.rotateHandle.visible = false;
      this.handles.forEach(({ graphic }) => (graphic.visible = false));
      return;
    }

    const cornerPoints = [
      this.toOverlayPoint(bounds.x, bounds.y),
      this.toOverlayPoint(bounds.x + bounds.width, bounds.y),
      this.toOverlayPoint(bounds.x, bounds.y + bounds.height),
      this.toOverlayPoint(bounds.x + bounds.width, bounds.y + bounds.height),
    ];
    const xs = cornerPoints.map((point) => point.x);
    const ys = cornerPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const center = new Point((minX + maxX) / 2, (minY + maxY) / 2);

    const pixelSize = this.getPixelSize();
    const strokeWidth = 2 * pixelSize;
    const handleRadius = (HANDLE_SIZE / 2) * pixelSize;
    const rotateOffset = ROTATE_OFFSET * pixelSize;

    this.frame.clear();
    this.frame.rect(minX, minY, width, height).fill({ color: 0xffffff, alpha: 0.001 });
    this.frame.rect(minX, minY, width, height).stroke({
      color: 0x4a7fb8,
      width: strokeWidth,
      alignment: 0.5,
    });

    const handlePositions: Record<HandleId, Point> = {
      "top-left": new Point(minX, minY),
      "top-right": new Point(maxX, minY),
      "bottom-left": new Point(minX, maxY),
      "bottom-right": new Point(maxX, maxY),
      top: new Point(center.x, minY),
      bottom: new Point(center.x, maxY),
      left: new Point(minX, center.y),
      right: new Point(maxX, center.y),
    };

    this.handles.forEach(({ config, graphic }) => {
      const position = handlePositions[config.id];
      this.drawHandle(graphic, position.x, position.y, handleRadius);
      graphic.visible = true;
    });

    const rotateLocal = this.toOverlayPoint(bounds.x + bounds.width / 2, bounds.y - rotateOffset);
    this.drawRotateHandle(rotateLocal.x, rotateLocal.y, handleRadius * 0.9);
    this.rotateHandle.visible = true;
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
    this.rotateHandle
      .lineStyle({ width: radius * 0.4, color: 0x4a7fb8 })
      .moveTo(x, y + radius)
      .lineTo(x, y + radius * 3);
  }

  private toOverlayPoint(x: number, y: number): Point {
    return this.overlayLayer.toLocal(new Point(x, y));
  }

  private getPixelSize(): number {
    const matrix = this.overlayLayer.worldTransform;
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    const scale = (scaleX + scaleY) / 2;
    if (!isFinite(scale) || scale <= 1e-6) {
      return 1;
    }
    return 1 / scale;
  }

  private beginMove(event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.computeSelectionBounds();
    if (!bounds) {
      return;
    }
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const snapshots = this.captureSnapshots(center);
    if (!snapshots.length) {
      return;
    }
    this.interaction = {
      kind: "move",
      pointerId: native.pointerId,
      startWorld: world,
      startCenter: center,
      startPointerVector: new Point(1, 1),
      snapshots,
    };
    this.bindPointerEvents();
    native.preventDefault();
    event.stopPropagation();
  }

  private beginRotate(event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.computeSelectionBounds();
    if (!bounds) {
      return;
    }
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const snapshots = this.captureSnapshots(center);
    if (!snapshots.length) {
      return;
    }
    this.interaction = {
      kind: "rotate",
      pointerId: native.pointerId,
      startWorld: world,
      startCenter: center,
      startPointerVector: new Point(world.x - center.x, world.y - center.y),
      snapshots,
    };
    this.bindPointerEvents();
    native.preventDefault();
    event.stopPropagation();
  }

  private beginScale(config: HandleConfig, event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (!native) {
      return;
    }
    const world = this.pointerToWorld(native);
    if (!world) {
      return;
    }
    const bounds = this.computeSelectionBounds();
    if (!bounds) {
      return;
    }
    const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const snapshots = this.captureSnapshots(center);
    if (!snapshots.length) {
      return;
    }
    this.interaction = {
      kind: "scale",
      pointerId: native.pointerId,
      handle: config,
      startWorld: world,
      startCenter: center,
      startPointerVector: new Point(world.x - center.x, world.y - center.y),
      snapshots,
    };
    this.bindPointerEvents();
    native.preventDefault();
    event.stopPropagation();
  }

  private pointerToWorld(event: PointerEvent): Point | null {
    if (!this.viewport) {
      return null;
    }

    const screenPoint = new Point();
    const eventSystem = this.viewport.options?.events;
    const mapper = eventSystem?.mapPositionToPoint;
    if (typeof mapper === "function") {
      mapper.call(eventSystem, screenPoint, event.clientX, event.clientY);
    } else if (this.canvasElement) {
      const rect = this.canvasElement.getBoundingClientRect();
      const resolution = this.canvas.getRendererResolution();
      screenPoint.x = (event.clientX - rect.left) * resolution;
      screenPoint.y = (event.clientY - rect.top) * resolution;
    } else {
      screenPoint.set(event.clientX, event.clientY);
    }

    const world = this.viewport.toWorld(screenPoint);
    return new Point(world.x, world.y);
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
    if (!world) {
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
    if (!this.interaction) {
      return;
    }
    const deltaX = world.x - this.interaction.startWorld.x;
    const deltaY = world.y - this.interaction.startWorld.y;

    this.interaction.snapshots.forEach((entry) => {
      const nextWorld = new Point(entry.startWorldPosition.x + deltaX, entry.startWorldPosition.y + deltaY);
      this.applyPosition(entry, nextWorld);
    });
    this.selectionMutated?.();
  }

  private applyScale(world: Point, uniform: boolean): void {
    if (!this.interaction || this.interaction.kind !== "scale" || !this.interaction.handle) {
      return;
    }
    const { handle, startCenter, startPointerVector } = this.interaction;
    const delta = new Point(world.x - startCenter.x, world.y - startCenter.y);
    const reference = startPointerVector;

    const safeDiv = (numerator: number, denominator: number): number => {
      return Math.abs(denominator) > 1e-4 ? numerator / denominator : Math.sign(numerator) || 1;
    };

    let factorX = 1;
    let factorY = 1;

    if (handle.axisX !== 0) {
      factorX = safeDiv(delta.x, reference.x) * handle.axisX;
    }
    if (handle.axisY !== 0) {
      factorY = safeDiv(delta.y, reference.y) * handle.axisY;
    }

    if (uniform && handle.kind === "corner") {
      const magnitude = Math.max(Math.abs(factorX), Math.abs(factorY));
      const baseX = handle.axisX !== 0 ? handle.axisX : Math.sign(factorX) || 1;
      const baseY = handle.axisY !== 0 ? handle.axisY : Math.sign(factorY) || 1;
      factorX = magnitude * (Math.sign(factorX) || baseX);
      factorY = magnitude * (Math.sign(factorY) || baseY);
    }

    this.interaction.snapshots.forEach((entry) => {
      const nextScaleX = this.clampScale(entry.startScale.x * factorX);
      const nextScaleY = this.clampScale(entry.startScale.y * factorY);
      entry.object.scale.set(nextScaleX, nextScaleY);

      const offsetX = entry.offsetFromCenter.x * factorX;
      const offsetY = entry.offsetFromCenter.y * factorY;
      const nextWorld = new Point(startCenter.x + offsetX, startCenter.y + offsetY);
      this.applyPosition(entry, nextWorld);
    });
    this.selectionMutated?.();
  }

  private applyRotate(world: Point, snap: boolean): void {
    if (!this.interaction || this.interaction.kind !== "rotate") {
      return;
    }
    const { startCenter, startPointerVector } = this.interaction;
    const deltaX = world.x - startCenter.x;
    const deltaY = world.y - startCenter.y;
    const angle = Math.atan2(deltaY, deltaX);
    const initialAngle = Math.atan2(startPointerVector.y, startPointerVector.x);
    let deltaAngle = angle - initialAngle;
    if (snap) {
      deltaAngle = Math.round(deltaAngle / SNAP_ANGLE) * SNAP_ANGLE;
    }

    this.interaction.snapshots.forEach((entry) => {
      const rotated = this.rotateVector(entry.offsetFromCenter, deltaAngle);
      const nextWorld = new Point(startCenter.x + rotated.x, startCenter.y + rotated.y);
      this.applyPosition(entry, nextWorld);
      entry.object.rotation = entry.startRotation + deltaAngle;
    });
    this.selectionMutated?.();
  }

  private clampScale(value: number): number {
    const sign = Math.sign(value) || 1;
    return sign * Math.max(MIN_SCALE, Math.abs(value));
  }

  private applyPosition(entry: SelectionSnapshotEntry, world: Point): void {
    const parent = entry.parent;
    if (parent) {
      const local = parent.toLocal(world);
      entry.object.position.set(local.x, local.y);
      return;
    }
    entry.object.position.set(world.x, world.y);
  }

  private rotateVector(vector: Point, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Point(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
  }

  private captureSnapshots(center: Point): SelectionSnapshotEntry[] {
    return this.selection
      .map(({ object }) => object)
      .filter((object): object is DisplayObject => Boolean(object))
      .map((object) => {
        const parent = object.parent ?? null;
        const worldPosition = parent ? parent.toGlobal(object.position) : new Point(object.position.x, object.position.y);
        const offsetFromCenter = new Point(worldPosition.x - center.x, worldPosition.y - center.y);
        const startScale = new Point(object.scale?.x ?? 1, object.scale?.y ?? 1);
        const startRotation = object.rotation ?? 0;
        return {
          object,
          parent,
          startWorldPosition: worldPosition,
          offsetFromCenter,
          startScale,
          startRotation,
        };
      });
  }

  private computeSelectionBounds(): Rectangle | null {
    if (!this.selection.length) {
      return null;
    }
    let result: Rectangle | null = null;
    this.selection.forEach(({ object }) => {
      const bounds = object.getBounds(true);
      if (!result) {
        result = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
        return;
      }
      const minX = Math.min(result.x, bounds.x);
      const minY = Math.min(result.y, bounds.y);
      const maxX = Math.max(result.x + result.width, bounds.x + bounds.width);
      const maxY = Math.max(result.y + result.height, bounds.y + bounds.height);
      result.x = minX;
      result.y = minY;
      result.width = maxX - minX;
      result.height = maxY - minY;
    });
    return result;
  }

  private cancelInteraction(): void {
    this.interaction = null;
    this.unbindPointerEvents();
  }

  private normalizeSelection(selection: SelectionTarget[]): SelectionTarget[] {
    const map = new Map<string, SelectionTarget>();
    selection.forEach((target) => {
      if (target?.id && target.object) {
        map.set(target.id, target);
      }
    });
    return Array.from(map.values());
  }

  private isSameSelection(next: SelectionTarget[]): boolean {
    if (this.selection.length !== next.length) {
      return false;
    }
    for (let i = 0; i < next.length; i += 1) {
      if (this.selection[i].id !== next[i].id) {
        return false;
      }
    }
    return true;
  }
}
