import { Graphics } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { hexToNumber, normalizeHex } from "../common/color";

type ShapeType = "circle" | "square" | "triangle" | "rectangle" | "star";

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  id: string | null;
  graphics: Graphics;
}

const SETTING_SHAPE = "shapeType";
const SETTING_STROKE_WIDTH = "strokeWidth";
const SETTING_STROKE_COLOR = "strokeColor";
const SETTING_FILL_COLOR = "fillColor";
const MIN_SIZE = 12;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class ShapesTool implements CanvasTool {
  public readonly id = "shapes";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private drag: DragState | null = null;
  private shapeType: ShapeType = "rectangle";
  private strokeWidth = 2;
  private strokeColor = "#2E2E2E";
  private fillColor = "#A0A0A0";

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.shapeType = (context.getSetting<string>(SETTING_SHAPE, this.shapeType) as ShapeType) ?? "rectangle";
    this.strokeWidth = clamp(Math.round(context.getSetting<number>(SETTING_STROKE_WIDTH, this.strokeWidth)), 1, 20);
    this.strokeColor = normalizeHex(context.getSetting<string>(SETTING_STROKE_COLOR, this.strokeColor), this.strokeColor);
    this.fillColor = context.getSetting<string>(SETTING_FILL_COLOR, this.fillColor) ?? this.fillColor;
  }

  public deactivate(): void {
    if (this.drag?.id && this.context) {
      this.context.canvas.removeObject(this.drag.id);
    }
    this.drag = null;
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    switch (key) {
      case SETTING_SHAPE:
        if (typeof value === "string") {
          this.shapeType = value as ShapeType;
        }
        break;
      case SETTING_STROKE_WIDTH:
        if (typeof value === "number" && Number.isFinite(value)) {
          this.strokeWidth = clamp(Math.round(value), 1, 20);
        }
        break;
      case SETTING_STROKE_COLOR:
        if (typeof value === "string") {
          this.strokeColor = normalizeHex(value, this.strokeColor);
        }
        break;
      case SETTING_FILL_COLOR:
        if (typeof value === "string") {
          this.fillColor = value;
        }
        break;
      default:
        break;
    }
    this.redraw();
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    const graphics = new Graphics();
    graphics.label = "shape";
    const id = this.context.canvas.addDisplayObject(graphics);
    this.drag = {
      startX: event.worldX,
      startY: event.worldY,
      currentX: event.worldX,
      currentY: event.worldY,
      id,
      graphics,
    };
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.drag) {
      return;
    }
    this.drag.currentX = event.worldX;
    this.drag.currentY = event.worldY;
    this.redraw();
  }

  public pointerUp(): void {
    if (!this.drag || !this.context) {
      return;
    }
    const width = Math.abs(this.drag.currentX - this.drag.startX);
    const height = Math.abs(this.drag.currentY - this.drag.startY);
    if (width < MIN_SIZE && height < MIN_SIZE) {
      // replace with default sized shape
      this.drag.currentX = this.drag.startX + MIN_SIZE * 2;
      this.drag.currentY = this.drag.startY + MIN_SIZE * 2;
      this.redraw();
    }
    this.drag = null;
  }

  public pointerCancel(): void {
    if (this.drag?.id && this.context) {
      this.context.canvas.removeObject(this.drag.id);
    }
    this.drag = null;
  }

  private redraw(): void {
    if (!this.drag) {
      return;
    }
    const { startX, startY, currentX, currentY, graphics } = this.drag;
    graphics.clear();

    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.max(Math.abs(currentX - startX), MIN_SIZE);
    const height = Math.max(Math.abs(currentY - startY), MIN_SIZE);
    const stroke = hexToNumber(this.strokeColor, 0x2e2e2e);
    const fill = this.resolveFill();

    switch (this.shapeType) {
      case "circle":
        this.drawCircle(minX, minY, width, height);
        break;
      case "square":
        this.drawSquare(minX, minY, width, height);
        break;
      case "triangle":
        this.drawTriangle(minX, minY, width, height);
        break;
      case "star":
        this.drawStar(minX, minY, width, height);
        break;
      default:
        this.drawRectangle(minX, minY, width, height);
        break;
    }

    graphics.fill({ color: fill.color, alpha: fill.alpha });
    graphics.stroke({ color: stroke, width: this.strokeWidth, alignment: 0.5, join: "round" });
  }

  private drawCircle(minX: number, minY: number, width: number, height: number): void {
    if (!this.drag) return;
    const radius = Math.min(width, height) / 2;
    const cx = minX + radius;
    const cy = minY + radius;
    this.drag.graphics.circle(cx, cy, radius);
  }

  private drawSquare(minX: number, minY: number, width: number, height: number): void {
    if (!this.drag) return;
    const size = Math.min(width, height);
    this.drag.graphics.rect(minX, minY, size, size);
  }

  private drawRectangle(minX: number, minY: number, width: number, height: number): void {
    if (!this.drag) return;
    this.drag.graphics.rect(minX, minY, width, height);
  }

  private drawTriangle(minX: number, minY: number, width: number, height: number): void {
    if (!this.drag) return;
    const gfx = this.drag.graphics;
    const topX = minX + width / 2;
    const topY = minY;
    const leftX = minX;
    const leftY = minY + height;
    const rightX = minX + width;
    const rightY = minY + height;
    gfx.moveTo(topX, topY).lineTo(leftX, leftY).lineTo(rightX, rightY).closePath();
  }

  private drawStar(minX: number, minY: number, width: number, height: number): void {
    if (!this.drag) return;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.48;
    const cx = minX + width / 2;
    const cy = minY + height / 2;
    this.drag.graphics.star(cx, cy, 5, radius, innerRadius);
  }

  private resolveFill(): { color: number; alpha: number } {
    if (typeof this.fillColor !== "string" || this.fillColor === "" || this.fillColor === "transparent") {
      return { color: 0xffffff, alpha: 0 };
    }
    return { color: hexToNumber(this.fillColor, 0xa0a0a0), alpha: 0.85 };
  }
}

export const createShapesTool = (): CanvasTool => new ShapesTool();
