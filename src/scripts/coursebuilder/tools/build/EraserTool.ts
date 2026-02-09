import { Graphics, Point } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";

const SETTING_SIZE = "size";
const MIN_RADIUS = 1;
const MAX_RADIUS = 32;

export class EraserTool implements CanvasTool {
  public readonly id = "eraser";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private radius = 8;
  private active = false;
  private overlay: Graphics | null = null;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.radius = this.normalizeRadius(context.getSetting<number>(SETTING_SIZE, this.radius));
    this.ensureOverlay();
  }

  public deactivate(): void {
    this.hideOverlay();
    this.active = false;
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_SIZE && typeof value === "number") {
      this.radius = this.normalizeRadius(value);
    }
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    this.active = true;
    this.updateOverlay(event.worldX, event.worldY);
    this.eraseAt(event.worldX, event.worldY);
  }

  public pointerMove(event: ToolPointerEvent): void {
    // Always show the hover preview when the tool is active
    this.updateOverlay(event.worldX, event.worldY);
    if (!this.active) {
      return;
    }
    this.eraseAt(event.worldX, event.worldY);
  }

  public pointerUp(): void {
    this.active = false;
  }

  public pointerCancel(): void {
    this.active = false;
  }

  private ensureOverlay(): void {
    if (!this.context || this.overlay) {
      return;
    }
    this.overlay = new Graphics();
    this.overlay.label = "eraser-overlay";
    this.overlay.eventMode = "none";
    this.context.overlayLayer.addChild(this.overlay);
  }

  private hideOverlay(): void {
    if (this.overlay) {
      this.overlay.clear();
    }
  }

  /**
   * Convert world coordinates to the overlay layer's local coordinate space,
   * so the eraser circle renders correctly regardless of viewport zoom/pan.
   */
  private worldToOverlay(worldX: number, worldY: number): Point {
    if (!this.context) {
      return new Point(worldX, worldY);
    }
    const viewport = this.context.viewport;
    const screenPoint = viewport.toScreen(worldX, worldY);
    return this.context.overlayLayer.toLocal(new Point(screenPoint.x, screenPoint.y));
  }

  /**
   * Get the scale factor so the eraser circle stays constant size on screen
   * regardless of viewport zoom.
   */
  private getOverlayPixelSize(): number {
    if (!this.context) {
      return 1;
    }
    const matrix = this.context.overlayLayer.worldTransform;
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    const scale = (scaleX + scaleY) / 2;
    if (!isFinite(scale) || scale <= 1e-6) {
      return 1;
    }
    return 1 / scale;
  }

  private updateOverlay(worldX: number, worldY: number): void {
    if (!this.overlay) {
      return;
    }
    const local = this.worldToOverlay(worldX, worldY);
    const pixelSize = this.getOverlayPixelSize();
    const visualRadius = this.radius * pixelSize;
    const strokeWidth = 2 * pixelSize;

    this.overlay.clear();
    this.overlay.circle(local.x, local.y, visualRadius).stroke({
      color: this.active ? 0xc35c5c : 0x888888,
      width: strokeWidth,
      alpha: this.active ? 0.9 : 0.6,
    });
  }

  /**
   * Erase objects whose world-space bounds intersect the eraser circle.
   * Converts screen bounds to world bounds before comparison.
   */
  private eraseAt(worldX: number, worldY: number): void {
    if (!this.context) {
      return;
    }

    const viewport = this.context.viewport;
    const radiusSq = this.radius * this.radius;
    const objects = this.context.canvas.getObjectsSnapshot();

    objects.forEach(({ id, displayObject }) => {
      // getBounds returns screen-space bounds; convert to world space
      const screenBounds = displayObject.getBounds(true);
      const topLeftWorld = viewport.toWorld(new Point(screenBounds.x, screenBounds.y));
      const bottomRightWorld = viewport.toWorld(
        new Point(screenBounds.x + screenBounds.width, screenBounds.y + screenBounds.height),
      );
      const bx = Math.min(topLeftWorld.x, bottomRightWorld.x);
      const by = Math.min(topLeftWorld.y, bottomRightWorld.y);
      const bw = Math.abs(bottomRightWorld.x - topLeftWorld.x);
      const bh = Math.abs(bottomRightWorld.y - topLeftWorld.y);

      // Closest point on the world-space bounding box to the eraser center
      const closestX = Math.max(bx, Math.min(worldX, bx + bw));
      const closestY = Math.max(by, Math.min(worldY, by + bh));
      const dx = worldX - closestX;
      const dy = worldY - closestY;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq <= radiusSq) {
        const removed = this.context?.canvas.removeObject(id);
        if (removed) {
          this.context!.selection.clear();
          this.context!.transformHelper.detach();
        }
      }
    });
  }

  private normalizeRadius(value: number): number {
    if (!Number.isFinite(value)) {
      return this.radius;
    }
    const clamped = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(value)));
    return clamped;
  }
}

export const createEraserTool = (): CanvasTool => new EraserTool();
