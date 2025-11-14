import { Graphics } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { hexToNumber, normalizeHex } from "../common/color";

interface StrokePoint {
  x: number;
  y: number;
}

interface ActiveStroke {
  id: string | null;
  graphics: Graphics;
  points: StrokePoint[];
}

const SETTING_SIZE = "size";
const SETTING_COLOR = "color";
const SETTING_SMOOTHING = "smoothing";
const SETTING_OPACITY = "opacity";
const SETTING_STYLE = "style";
const DEFAULT_SMOOTHING = 0.35;
const DEFAULT_OPACITY = 1;
const DEFAULT_STYLE = "solid-round";

export class BrushTool implements CanvasTool {
  public readonly id = "brush";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private stroke: ActiveStroke | null = null;
  private size = 8;
  private color = "#2E2E2E";
  private smoothing = DEFAULT_SMOOTHING;
  private opacity = DEFAULT_OPACITY;
  private style = DEFAULT_STYLE;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.size = Math.max(1, Math.min(16, Math.round(context.getSetting<number>(SETTING_SIZE, this.size))));
    this.color = normalizeHex(context.getSetting<string>(SETTING_COLOR, this.color), this.color);
    this.smoothing = this.normalizeSmoothing(context.getSetting<number>(SETTING_SMOOTHING, DEFAULT_SMOOTHING));
    this.opacity = this.normalizeOpacity(context.getSetting<number>(SETTING_OPACITY, DEFAULT_OPACITY));
    this.style = this.normalizeStyle(context.getSetting<string>(SETTING_STYLE, DEFAULT_STYLE));
  }

  public deactivate(): void {
    if (this.stroke?.id) {
      this.finishStroke(true);
    }
    this.stroke = null;
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_SIZE && typeof value === "number") {
      this.size = Math.max(1, Math.min(16, Math.round(value)));
      this.redrawStroke();
    }
    if (key === SETTING_COLOR && typeof value === "string") {
      this.color = normalizeHex(value, this.color);
      this.redrawStroke();
    }
    if (key === SETTING_SMOOTHING && typeof value === "number") {
      this.smoothing = this.normalizeSmoothing(value);
    }
    if (key === SETTING_OPACITY && typeof value === "number") {
      this.opacity = this.normalizeOpacity(value);
      this.redrawStroke();
    }
    if (key === SETTING_STYLE && typeof value === "string") {
      this.style = this.normalizeStyle(value);
      this.redrawStroke();
    }
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    const graphics = new Graphics();
    graphics.label = "brush-stroke";
    const id = this.context.canvas.addDisplayObject(graphics);
    this.stroke = {
      id,
      graphics,
      points: [{ x: event.worldX, y: event.worldY }],
    };
    this.redrawStroke();
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.stroke) {
      return;
    }
    const points = this.stroke.points;
    const last = points[points.length - 1];
    const next = {
      x: last.x + (event.worldX - last.x) * this.smoothing,
      y: last.y + (event.worldY - last.y) * this.smoothing,
    };
    points.push(next);
    this.redrawStroke();
  }

  public pointerUp(): void {
    this.finishStroke(false);
  }

  public pointerCancel(): void {
    this.finishStroke(true);
  }

  private redrawStroke(): void {
    if (!this.stroke) {
      return;
    }
    const { graphics, points } = this.stroke;
    graphics.clear();

    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      const radius = Math.max(1, this.size / 2);
      graphics.circle(points[0].x, points[0].y, radius).fill({
        color: hexToNumber(this.color, 0x2e2e2e),
        alpha: this.opacity,
      });
      return;
    }

    switch (this.style) {
      case "calligraphic":
        this.drawCalligraphicStroke(graphics, points);
        break;
      case "scatter":
        this.drawScatterStroke(graphics, points);
        break;
      case "art":
        this.drawArtStroke(graphics, points);
        break;
      case "bristle":
        this.drawBristleStroke(graphics, points);
        break;
      case "pattern":
        this.drawPatternStroke(graphics, points);
        break;
      case "textured":
        this.drawTexturedStroke(graphics, points);
        break;
      case "flat":
        this.drawSolidStroke(graphics, points, this.size, "square");
        break;
      case "spray":
        this.drawSprayStroke(graphics, points);
        break;
      case "solid-round":
      default:
        this.drawSolidStroke(graphics, points, this.size, "round");
        break;
    }
  }

  private finishStroke(remove: boolean): void {
    if (!this.stroke || !this.context) {
      return;
    }

    if (remove || this.stroke.points.length === 0) {
      if (this.stroke.id) {
        this.context.canvas.removeObject(this.stroke.id);
      }
    } else if (this.stroke.points.length === 1) {
      this.redrawStroke();
    }

    this.stroke = null;
  }

  private normalizeSmoothing(raw: number): number {
    if (!Number.isFinite(raw)) {
      return DEFAULT_SMOOTHING;
    }
    return Math.min(0.95, Math.max(0.05, raw));
  }

  private normalizeOpacity(raw: number): number {
    if (!Number.isFinite(raw)) {
      return DEFAULT_OPACITY;
    }
    return Math.min(1, Math.max(0, raw));
  }

  private normalizeStyle(value: string): string {
    const allowed = ["calligraphic", "scatter", "art", "bristle", "pattern", "textured", "solid-round", "flat", "spray"];
    return allowed.includes(value) ? value : DEFAULT_STYLE;
  }

  private midpoint(a: StrokePoint, b: StrokePoint): StrokePoint {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }

  private drawSolidStroke(graphics: Graphics, points: StrokePoint[], width: number, cap: "round" | "square"): void {
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const midpoint = this.midpoint(points[i - 1], points[i]);
      graphics.quadraticCurveTo(points[i - 1].x, points[i - 1].y, midpoint.x, midpoint.y);
    }
    const last = points[points.length - 1];
    graphics.lineTo(last.x, last.y);
    graphics.stroke({
      color: hexToNumber(this.color, 0x2e2e2e),
      width,
      cap,
      join: "round",
      alpha: this.opacity,
    });
  }

  private drawCalligraphicStroke(graphics: Graphics, points: StrokePoint[]): void {
    this.drawSolidStroke(graphics, points, this.size * 1.25, "butt");
    this.drawSolidStroke(graphics, points, this.size * 0.6, "round");
  }

  private drawScatterStroke(graphics: Graphics, points: StrokePoint[]): void {
    this.drawSolidStroke(graphics, points, this.size * 0.45, "round");
    const dotRadius = Math.max(0.5, this.size * 0.12);
    points.forEach((point) => {
      for (let i = 0; i < 3; i += 1) {
        const jitterX = (Math.random() - 0.5) * this.size;
        const jitterY = (Math.random() - 0.5) * this.size;
        graphics.circle(point.x + jitterX, point.y + jitterY, dotRadius).fill({
          color: hexToNumber(this.color, 0x2e2e2e),
          alpha: this.opacity * 0.65,
        });
      }
    });
  }

  private drawArtStroke(graphics: Graphics, points: StrokePoint[]): void {
    if (points.length < 2) {
      this.drawSolidStroke(graphics, points, this.size, "round");
      return;
    }
    const total = points.length - 1;
    for (let i = 1; i < points.length; i += 1) {
      const progress = i / total;
      const width = Math.max(1, this.size * (0.5 + 0.5 * Math.sin(progress * Math.PI)));
      graphics.moveTo(points[i - 1].x, points[i - 1].y);
      graphics.lineTo(points[i].x, points[i].y);
      graphics.stroke({
        color: hexToNumber(this.color, 0x2e2e2e),
        width,
        cap: "round",
        join: "round",
        alpha: this.opacity * (0.85 + 0.15 * Math.random()),
      });
    }
  }

  private drawBristleStroke(graphics: Graphics, points: StrokePoint[]): void {
    const strands = 5;
    const spread = this.size * 0.6;
    for (let i = 0; i < strands; i += 1) {
      const offset = -spread / 2 + (spread / (strands - 1)) * i;
      const strandPoints = points.map((point) => ({
        x: point.x + offset * 0.35 + (Math.random() - 0.5),
        y: point.y + offset * 0.35 + (Math.random() - 0.5),
      }));
      this.drawSolidStroke(graphics, strandPoints, Math.max(1, this.size * 0.25), "round");
    }
  }

  private drawPatternStroke(graphics: Graphics, points: StrokePoint[]): void {
    if (points.length < 2) {
      this.drawSolidStroke(graphics, points, this.size, "round");
      return;
    }
    const dash = Math.max(4, this.size * 1.4);
    const gap = dash;
    let drawing = true;
    let remaining = dash;
    let cursor = { ...points[0] };

    for (let i = 1; i < points.length; i += 1) {
      let segmentLength = distanceBetween(cursor, points[i]);
      let segmentStart = { ...cursor };

      while (segmentLength > 0.0001) {
        const step = Math.min(segmentLength, remaining);
        const t = step / segmentLength;
        const intermediate = {
          x: segmentStart.x + (points[i].x - segmentStart.x) * t,
          y: segmentStart.y + (points[i].y - segmentStart.y) * t,
        };

        if (drawing) {
          graphics.moveTo(segmentStart.x, segmentStart.y);
          graphics.lineTo(intermediate.x, intermediate.y);
          graphics.stroke({
            color: hexToNumber(this.color, 0x2e2e2e),
            width: this.size * 0.85,
            cap: "round",
            join: "round",
            alpha: this.opacity,
          });
        }

        segmentStart = intermediate;
        segmentLength -= step;
        remaining -= step;

        if (remaining <= 0) {
          drawing = !drawing;
          remaining = drawing ? dash : gap;
        }
      }

      cursor = { ...points[i] };
    }
  }

  private drawTexturedStroke(graphics: Graphics, points: StrokePoint[]): void {
    this.drawSolidStroke(graphics, points, this.size, "round");
    const overlays = 3;
    for (let i = 0; i < overlays; i += 1) {
      const jittered = points.map((point) => ({
        x: point.x + (Math.random() - 0.5) * 2,
        y: point.y + (Math.random() - 0.5) * 2,
      }));
      this.drawSolidStroke(graphics, jittered, Math.max(1, this.size * 0.5), "round");
    }
  }

  private drawSprayStroke(graphics: Graphics, points: StrokePoint[]): void {
    this.drawSolidStroke(graphics, points, Math.max(1, this.size * 0.2), "round");
    const density = Math.max(8, Math.round(this.size * 3));
    points.forEach((point) => {
      for (let i = 0; i < density; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (this.size * 0.8);
        const x = point.x + Math.cos(angle) * radius;
        const y = point.y + Math.sin(angle) * radius;
        graphics.circle(x, y, Math.max(0.4, this.size * 0.08)).fill({
          color: hexToNumber(this.color, 0x2e2e2e),
          alpha: this.opacity * 0.4,
        });
      }
    });
  }
}

const distanceBetween = (a: StrokePoint, b: StrokePoint): number => Math.hypot(a.x - b.x, a.y - b.y);

export const createBrushTool = (): CanvasTool => new BrushTool();
