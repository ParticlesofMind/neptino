import { Container, Graphics, Text } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";

type ContentType = "text" | "image";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SETTING_TYPE = "contentType";
const SETTING_PROMPT = "prompt";
const SETTING_SEND = "send";
const MIN_SIZE = 64;

export class GenerateTool implements CanvasTool {
  public readonly id = "generate";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private overlay: Graphics | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private bounds: Rect | null = null;
  private contentType: ContentType = "text";
  private prompt = "";
  private lastSendToken = 0;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.contentType = (context.getSetting<string>(SETTING_TYPE, this.contentType) as ContentType) ?? "text";
    this.prompt = context.getSetting<string>(SETTING_PROMPT, this.prompt) ?? "";
    this.ensureOverlay();
  }

  public deactivate(): void {
    this.clearOverlay();
    this.context = null;
    this.dragStart = null;
    this.bounds = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_TYPE && typeof value === "string") {
      this.contentType = value as ContentType;
    }
    if (key === SETTING_PROMPT && typeof value === "string") {
      this.prompt = value;
    }
    if (key === SETTING_SEND) {
      const token = typeof value === "number" ? value : this.lastSendToken + 1;
      if (token !== this.lastSendToken) {
        this.lastSendToken = token;
        void this.generate();
      }
    }
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.overlay) {
      this.ensureOverlay();
    }
    this.dragStart = { x: event.worldX, y: event.worldY };
    this.bounds = { x: event.worldX, y: event.worldY, width: 0, height: 0 };
    this.drawOverlay();
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.dragStart || !this.bounds) {
      return;
    }
    this.bounds = this.createRect(this.dragStart.x, this.dragStart.y, event.worldX, event.worldY);
    this.drawOverlay();
  }

  public pointerUp(event: ToolPointerEvent): void {
    if (!this.dragStart) {
      return;
    }
    this.bounds = this.createRect(this.dragStart.x, this.dragStart.y, event.worldX, event.worldY);
    this.dragStart = null;
    this.drawOverlay();
  }

  public pointerCancel(): void {
    this.dragStart = null;
    this.bounds = null;
    this.clearOverlay();
  }

  private ensureOverlay(): void {
    if (!this.context || this.overlay) {
      return;
    }
    this.overlay = new Graphics();
    this.overlay.label = "generate-overlay";
    this.context.overlayLayer.addChild(this.overlay);
  }

  private clearOverlay(): void {
    if (this.overlay) {
      this.overlay.clear();
    }
  }

  private drawOverlay(): void {
    if (!this.overlay || !this.bounds) {
      this.clearOverlay();
      return;
    }
    const { x, y, width, height } = this.bounds;
    this.overlay.clear();
    this.overlay.rect(x, y, Math.max(width, MIN_SIZE), Math.max(height, MIN_SIZE)).stroke({
      color: 0x4a7fb8,
      alpha: 0.9,
      width: 2,
      alignment: 0.5,
    });
    this.overlay.rect(x, y, Math.max(width, MIN_SIZE), Math.max(height, MIN_SIZE)).fill({
      color: 0x4a7fb8,
      alpha: 0.1,
    });
  }

  private createRect(x1: number, y1: number, x2: number, y2: number): Rect {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.max(Math.abs(x2 - x1), MIN_SIZE);
    const height = Math.max(Math.abs(y2 - y1), MIN_SIZE);
    return { x: minX, y: minY, width, height };
  }

  private async generate(): Promise<void> {
    if (!this.context || !this.bounds) {
      return;
    }
    const bounds = this.bounds;
    this.clearOverlay();
    this.bounds = null;

    if (this.contentType === "image") {
      this.createImagePlaceholder(bounds);
    } else {
      this.createTextNode(bounds);
    }
  }

  private createTextNode(bounds: Rect): void {
    if (!this.context) {
      return;
    }
    const content = this.prompt || "Generated text content";
    const padding = 12;
    const text = new Text({
      text: content,
      style: {
        fontSize: 20,
        fill: 0x2e2e2e,
        wordWrap: true,
        wordWrapWidth: Math.max(bounds.width - padding * 2, 80),
        breakWords: true,
      },
    });
    text.position.set(bounds.x + padding, bounds.y + padding);
    text.anchor.set(0, 0);

    const container = new Container();
    const background = new Graphics();
    background.rect(0, 0, bounds.width, bounds.height);
    background.fill({ color: 0xf5f7fb, alpha: 0.8 });
    background.stroke({ color: 0x4a7fb8, width: 2, alignment: 0.5 });
    container.addChild(background, text);
    container.position.set(bounds.x, bounds.y);

    const id = this.context.canvas.addDisplayObject(container);
    if (id) {
      const targets = [{ id, object: container }];
      this.context.selection.setSelection(targets);
      this.context.transformHelper.attach(targets);
    }
  }

  private createImagePlaceholder(bounds: Rect): void {
    if (!this.context) {
      return;
    }

    const container = new Container();
    const frame = new Graphics();
    frame.rect(0, 0, bounds.width, bounds.height);
    frame.fill({ color: 0xdbeafe, alpha: 0.95 });
    frame.stroke({ color: 0x4a7fb8, width: 3, alignment: 0.5 });

    const cross = new Graphics();
    cross.moveTo(12, 12).lineTo(bounds.width - 12, bounds.height - 12);
    cross.moveTo(bounds.width - 12, 12).lineTo(12, bounds.height - 12);
    cross.stroke({ color: 0x4a7fb8, width: 2 });

    const label = new Text({
      text: this.prompt ? this.prompt : "Generated image",
      style: {
        fontSize: 18,
        fill: 0x1f2933,
        wordWrap: true,
        wordWrapWidth: bounds.width - 24,
        align: "center",
      },
    });
    label.anchor.set(0.5);
    label.position.set(bounds.width / 2, bounds.height / 2);

    container.addChild(frame, cross, label);
    container.position.set(bounds.x, bounds.y);

    const id = this.context.canvas.addDisplayObject(container);
    if (id) {
      const targets = [{ id, object: container }];
      this.context.selection.setSelection(targets);
      this.context.transformHelper.attach(targets);
    }
  }
}

export const createGenerateTool = (): CanvasTool => new GenerateTool();
