import { Graphics } from "pixi.js";
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
    if (!this.active) {
      return;
    }
    this.updateOverlay(event.worldX, event.worldY);
    this.eraseAt(event.worldX, event.worldY);
  }

  public pointerUp(): void {
    this.active = false;
    this.hideOverlay();
  }

  public pointerCancel(): void {
    this.active = false;
    this.hideOverlay();
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

  private updateOverlay(x: number, y: number): void {
    if (!this.overlay) {
      return;
    }
    this.overlay.clear();
    this.overlay.circle(x, y, this.radius).stroke({ color: 0xc35c5c, width: 2, alpha: 0.9 });
  }

  private eraseAt(x: number, y: number): void {
    if (!this.context) {
      return;
    }

    const radiusSq = this.radius * this.radius;
    const objects = this.context.canvas.getObjectsSnapshot();

    objects.forEach(({ id, displayObject }) => {
      const bounds = displayObject.getBounds(true);
      const closestX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width));
      const closestY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height));
      const dx = x - closestX;
      const dy = y - closestY;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq <= radiusSq) {
        const removed = this.context?.canvas.removeObject(id);
        if (removed) {
          this.context.selection.clear();
          this.context.transformHelper.detach();
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
