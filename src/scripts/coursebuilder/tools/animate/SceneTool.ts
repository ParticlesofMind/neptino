import { Graphics } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1800;
const SETTING_ASPECT = "aspectRatio";
const SETTING_DURATION = "duration";

type AspectRatio = "16:9" | "4:3" | "3:2" | "1:1" | "9:16";

const ASPECT_MAP: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "1:1": 1,
  "9:16": 9 / 16,
};

export class SceneTool implements CanvasTool {
  public readonly id = "scene";
  public readonly mode = "animate" as const;

  private context: ToolRuntimeContext | null = null;
  private aspect: AspectRatio = "16:9";
  private duration = 5;
  private overlay: Graphics | null = null;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.aspect = (context.getSetting<string>(SETTING_ASPECT, this.aspect) as AspectRatio) ?? "16:9";
    this.duration = context.getSetting<number>(SETTING_DURATION, this.duration);
    this.ensureOverlay();
    this.renderOverlay();
    this.syncDuration();
  }

  public deactivate(): void {
    this.clearOverlay();
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_ASPECT && typeof value === "string" && value in ASPECT_MAP) {
      this.aspect = value as AspectRatio;
      this.renderOverlay();
    }
    if (key === SETTING_DURATION && typeof value === "number") {
      this.duration = value;
      this.syncDuration();
    }
  }

  public pointerDown(_: ToolPointerEvent): void {}
  public pointerMove(_: ToolPointerEvent): void {}
  public pointerUp(_: ToolPointerEvent): void {}
  public pointerCancel(): void {}

  private ensureOverlay(): void {
    if (!this.context || this.overlay) {
      return;
    }
    this.overlay = new Graphics();
    this.overlay.label = "scene-overlay";
    this.overlay.eventMode = "none";
    this.context.overlayLayer.addChild(this.overlay);
  }

  private clearOverlay(): void {
    this.overlay?.clear();
  }

  private renderOverlay(): void {
    if (!this.overlay) {
      return;
    }
    const frame = this.computeFrame();
    this.overlay.clear();
    this.overlay.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).fill({ color: 0x000000, alpha: 0.08 });
    this.overlay
      .rect(frame.x, frame.y, frame.width, frame.height)
      .fill({ color: 0xffffff, alpha: 0.02 })
      .stroke({ color: 0x4a7fb8, width: 3, alignment: 0.5, alpha: 0.9 });
  }

  private computeFrame(): { x: number; y: number; width: number; height: number } {
    const ratio = ASPECT_MAP[this.aspect] ?? ASPECT_MAP["16:9"];
    const widthBasedHeight = CANVAS_WIDTH / ratio;
    if (widthBasedHeight <= CANVAS_HEIGHT) {
      const offsetY = (CANVAS_HEIGHT - widthBasedHeight) / 2;
      return { x: 0, y: offsetY, width: CANVAS_WIDTH, height: widthBasedHeight };
    }
    const heightBasedWidth = CANVAS_HEIGHT * ratio;
    const offsetX = (CANVAS_WIDTH - heightBasedWidth) / 2;
    return { x: offsetX, y: 0, width: heightBasedWidth, height: CANVAS_HEIGHT };
  }

  private syncDuration(): void {
    try {
      (window as any).__neptinoScene = {
        aspect: this.aspect,
        duration: this.duration,
      };
    } catch {
      /* noop */
    }
  }
}

export const createSceneTool = (): CanvasTool => new SceneTool();
