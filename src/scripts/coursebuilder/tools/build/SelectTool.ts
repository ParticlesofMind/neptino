import { Graphics, Point, type Container } from "pixi.js";
import type { CanvasTool, ToolMode, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import type { SelectionTarget } from "../selection/SelectionManager";

type SelectionMode = "contain" | "intersect";
type SelectionIntent = "replace" | "add" | "toggle";

const SETTING_MODE = "mode";
const CLICK_THRESHOLD = 6;

const isClose = (value: number): boolean => Math.abs(value) < CLICK_THRESHOLD;

const rectsIntersect = (
  rectA: { x: number; y: number; width: number; height: number },
  rectB: { x: number; y: number; width: number; height: number },
): boolean => {
  return !(
    rectA.x > rectB.x + rectB.width ||
    rectA.x + rectA.width < rectB.x ||
    rectA.y > rectB.y + rectB.height ||
    rectA.y + rectA.height < rectB.y
  );
};

const rectContains = (
  outer: { x: number; y: number; width: number; height: number },
  inner: { x: number; y: number; width: number; height: number },
): boolean => {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
};

export class SelectTool implements CanvasTool {
  public readonly id = "selection";
  public readonly mode: ToolMode;

  private context: ToolRuntimeContext | null = null;
  private selectionOverlay: Graphics | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragStartScreen: { x: number; y: number } | null = null;
  private currentRect: { x: number; y: number; width: number; height: number } | null = null;
  private selectionMode: SelectionMode = "contain";
  private selectionIntent: SelectionIntent = "replace";
  private gestureMode: SelectionMode | null = null;

  constructor(mode: ToolMode) {
    this.mode = mode;
  }

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.selectionMode = context.getSetting<SelectionMode>(SETTING_MODE, "contain");
    this.ensureOverlay(context);
  }

  public deactivate(): void {
    this.clearOverlay();
    this.context?.selection.clear();
    this.context?.transformHelper.detach();
    this.dragStart = null;
    this.dragStartScreen = null;
    this.currentRect = null;
    this.selectionIntent = "replace";
    this.gestureMode = null;
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_MODE && (value === "contain" || value === "intersect")) {
      this.selectionMode = value;
    }
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    this.selectionIntent = this.resolveSelectionIntent(event);
    this.gestureMode = event.altKey ? "intersect" : this.selectionMode;
    this.dragStart = { x: event.worldX, y: event.worldY };
    this.dragStartScreen = { x: event.screenX, y: event.screenY };
    this.currentRect = { x: event.worldX, y: event.worldY, width: 0, height: 0 };
    this.updateOverlay();
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.context || !this.dragStart) {
      return;
    }

    const { x, y } = this.dragStart;
    const width = event.worldX - x;
    const height = event.worldY - y;
    this.currentRect = this.normalizeRect(x, y, x + width, y + height);
    this.updateOverlay();
  }

  public pointerUp(event: ToolPointerEvent): void {
    if (!this.context || !this.dragStart) {
      this.resetGesture();
      return;
    }

    const rect = this.currentRect ?? this.normalizeRect(this.dragStart.x, this.dragStart.y, event.worldX, event.worldY);
    const isScreenClick =
      this.dragStartScreen &&
      isClose(event.screenX - this.dragStartScreen.x) &&
      isClose(event.screenY - this.dragStartScreen.y);
    const isClick = isClose(rect.width) && isClose(rect.height) && Boolean(isScreenClick);
    this.clearOverlay();

    if (isClick) {
      this.performPointPick(event);
    } else {
      this.performAreaSelection(rect);
    }

    this.resetGesture();
  }

  public pointerCancel(): void {
    this.resetGesture();
    this.clearOverlay();
  }

  public keyDown(event: KeyboardEvent): void {
    if (!this.context) {
      return;
    }

    if (this.handleArrowMovement(event)) {
      return;
    }

    if (event.key !== "Backspace" && event.key !== "Delete") {
      return;
    }

    const selection = this.context.selection.getSelection();
    if (!selection.length) {
      return;
    }

    selection.forEach(({ id }) => {
      if (id) {
        this.context?.canvas.removeObject(id);
      }
    });

    this.context.selection.clear();
    this.context.transformHelper.detach();
    event.preventDefault();
  }

  private performPointPick(event: ToolPointerEvent): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const objects = context.canvas.getObjectsSnapshot();
    const hits = objects.filter(({ displayObject }) => this.hitTest(displayObject, event));

    if (!hits.length) {
      context.selection.clear();
      context.transformHelper.detach();
      return;
    }

    const ordered = this.sortByDrawOrder(hits);
    const primary = ordered[ordered.length - 1];
    if (!primary) {
      return;
    }

    const targets = [
      {
        id: primary.id,
        object: primary.displayObject,
      },
    ];

    this.commitSelection(targets);
  }

  private performAreaSelection(rect: { x: number; y: number; width: number; height: number }): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const objects = context.canvas.getObjectsSnapshot();
    const mode = this.gestureMode ?? this.selectionMode;
    const selected = objects.filter(({ displayObject }) => {
      const targetRect = this.getWorldBounds(displayObject);
      if (mode === "contain") {
        return rectContains(rect, targetRect);
      }
      return rectsIntersect(rect, targetRect);
    });

    if (!selected.length) {
      context.selection.clear();
      context.transformHelper.detach();
      return;
    }

    const ordered = this.sortByDrawOrder(selected);
    const targets = ordered.map(({ id, displayObject }) => ({
      id,
      object: displayObject,
    }));
    this.commitSelection(targets);
  }

  private ensureOverlay(context: ToolRuntimeContext): void {
    if (this.selectionOverlay) {
      return;
    }
    this.selectionOverlay = new Graphics();
    this.selectionOverlay.label = "selection-overlay";
    context.overlayLayer.addChild(this.selectionOverlay);
  }

  private clearOverlay(): void {
    if (this.selectionOverlay) {
      this.selectionOverlay.clear();
    }
  }

  private updateOverlay(): void {
    if (!this.selectionOverlay || !this.currentRect) {
      return;
    }

    const { x, y, width, height } = this.currentRect;
    const topLeft = this.worldToOverlayPoint(x, y);
    const bottomRight = this.worldToOverlayPoint(x + width, y + height);
    const minX = Math.min(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const maxX = Math.max(topLeft.x, bottomRight.x);
    const maxY = Math.max(topLeft.y, bottomRight.y);
    const overlayWidth = maxX - minX;
    const overlayHeight = maxY - minY;

    this.selectionOverlay.clear();
    this.selectionOverlay
      .rect(minX, minY, overlayWidth, overlayHeight)
      .fill({ color: 0x4a7fb8, alpha: 0.08 })
      .stroke({ color: 0x4a7fb8, width: 2, alpha: 0.85 });
  }

  private normalizeRect(x1: number, y1: number, x2: number, y2: number): { x: number; y: number; width: number; height: number } {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    return { x, y, width, height };
  }

  private resetGesture(): void {
    this.dragStart = null;
    this.dragStartScreen = null;
    this.currentRect = null;
    this.selectionIntent = "replace";
    this.gestureMode = null;
  }

  private hitTest(displayObject: Container, event: ToolPointerEvent): boolean {
    const interactive = displayObject as Container & { containsPoint?: (point: Point) => boolean };
    // PIXI v8 containsPoint expects a point in the object's local coordinate space
    if (typeof interactive.containsPoint === "function") {
      try {
        const localPoint = displayObject.toLocal(new Point(event.screenX, event.screenY));
        if (interactive.containsPoint(localPoint)) {
          return true;
        }
      } catch {
        // Ignore containsPoint errors and fall back to bounds-based hit test.
      }
    }
    // Fallback: bounds-based hit test in world coordinates
    const bounds = this.getWorldBounds(displayObject);
    return (
      event.worldX >= bounds.x &&
      event.worldX <= bounds.x + bounds.width &&
      event.worldY >= bounds.y &&
      event.worldY <= bounds.y + bounds.height
    );
  }

  private getWorldBounds(displayObject: Container): { x: number; y: number; width: number; height: number } {
    const bounds = displayObject.getBounds(true);
    if (!this.context) {
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    }
    const viewport = this.context.viewport;
    const topLeft = viewport.toWorld(new Point(bounds.x, bounds.y));
    const bottomRight = viewport.toWorld(new Point(bounds.x + bounds.width, bounds.y + bounds.height));
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  private worldToOverlayPoint(x: number, y: number): Point {
    const context = this.context;
    if (!context) {
      return new Point(x, y);
    }
    const viewport = context.viewport;
    const screenPoint = viewport.toScreen(new Point(x, y));
    return context.overlayLayer.toLocal(new Point(screenPoint.x, screenPoint.y));
  }

  private sortByDrawOrder<T extends { displayObject: Container }>(items: T[]): T[] {
    return [...items].sort((a, b) => this.getDrawOrder(a.displayObject) - this.getDrawOrder(b.displayObject));
  }

  private getDrawOrder(displayObject: Container): number {
    const parent = displayObject.parent;
    if (!parent) {
      return -1;
    }
    return parent.getChildIndex(displayObject);
  }

  private resolveSelectionIntent(event: ToolPointerEvent): SelectionIntent {
    if (event.ctrlKey || event.metaKey) {
      return "toggle";
    }
    if (event.shiftKey) {
      return "add";
    }
    return "replace";
  }

  private intentToSelectionOptions(): { additive?: boolean; toggle?: boolean } {
    switch (this.selectionIntent) {
      case "toggle":
        return { toggle: true };
      case "add":
        return { additive: true };
      default:
        return {};
    }
  }

  private commitSelection(targets: SelectionTarget[]): void {
    if (!this.context) {
      return;
    }

    this.context.selection.setSelection(targets, this.intentToSelectionOptions());
    const active = this.context.selection.getSelection();
    if (!active.length) {
      this.context.transformHelper.detach();
      return;
    }
    this.context.transformHelper.attach(active);
  }

  private handleArrowMovement(event: KeyboardEvent): boolean {
    if (!this.context) {
      return false;
    }

    let deltaX = 0;
    let deltaY = 0;

    switch (event.key) {
      case "ArrowUp":
        deltaY = -1;
        break;
      case "ArrowDown":
        deltaY = 1;
        break;
      case "ArrowLeft":
        deltaX = -1;
        break;
      case "ArrowRight":
        deltaX = 1;
        break;
      default:
        return false;
    }

    const step = event.shiftKey ? 10 : 1;
    deltaX *= step;
    deltaY *= step;

    if (deltaX === 0 && deltaY === 0) {
      return false;
    }

    this.context.transformHelper.translate(deltaX, deltaY);
    this.context.selection.refresh();
    event.preventDefault();
    return true;
  }
}

export const createBuildSelectTool = (): CanvasTool => new SelectTool("build");
