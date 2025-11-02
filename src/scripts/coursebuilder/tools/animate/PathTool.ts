import { Graphics } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { timelineStore, type PathPoint } from "./TimelineStore";

const SETTING_SIMPLIFY = "simplify";
const SETTING_ADHERENCE = "adherence";
const SIMPLIFY_TOLERANCE = 8;

interface ActivePathState {
  id: string | null;
  graphics: Graphics;
  points: PathPoint[];
}

export class PathTool implements CanvasTool {
  public readonly id = "path";
  public readonly mode = "animate" as const;

  private context: ToolRuntimeContext | null = null;
  private path: ActivePathState | null = null;
  private originalPoints: PathPoint[] = [];
  private simplifiedPoints: PathPoint[] = [];
  private adherence = 0.5;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.adherence = Math.min(1, Math.max(0, context.getSetting<number>(SETTING_ADHERENCE, this.adherence)));
  }

  public deactivate(): void {
    this.commitPath(true);
    this.context = null;
    this.originalPoints = [];
    this.simplifiedPoints = [];
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_SIMPLIFY && value) {
      this.applySimplify();
    }
    if (key === SETTING_ADHERENCE && typeof value === "number") {
      this.adherence = Math.min(1, Math.max(0, value));
      this.renderPath();
    }
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    const graphics = new Graphics();
    graphics.label = "motion-path";
    const id = this.context.canvas.addDisplayObject(graphics);
    this.path = {
      id,
      graphics,
      points: [{ x: event.worldX, y: event.worldY }],
    };
    this.originalPoints = [{ x: event.worldX, y: event.worldY }];
    this.simplifiedPoints = [];
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.path) {
      return;
    }
    const last = this.path.points[this.path.points.length - 1];
    const next = { x: event.worldX, y: event.worldY };
    if (last && Math.hypot(next.x - last.x, next.y - last.y) < 1.5) {
      return;
    }
    this.path.points.push(next);
    this.originalPoints.push(next);
    this.renderPath();
  }

  public pointerUp(): void {
    this.commitPath(false);
  }

  public pointerCancel(): void {
    this.commitPath(true);
  }

  private renderPath(): void {
    if (!this.path) {
      return;
    }
    const points = this.computeEffectivePoints();
    const graphics = this.path.graphics;
    graphics.clear();
    if (points.length < 2) {
      return;
    }
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      graphics.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    const last = points[points.length - 1];
    graphics.lineTo(last.x, last.y);
    graphics.stroke({ color: 0x4a7fb8, width: 3, cap: "round", join: "round" });
    if (this.path.id) {
      timelineStore.setMotionPath(this.path.id, points);
    }
  }

  private computeEffectivePoints(): PathPoint[] {
    if (!this.simplifiedPoints.length) {
      return [...this.originalPoints];
    }
    if (this.adherence >= 0.999) {
      return [...this.originalPoints];
    }
    const simplified = this.simplifiedPoints;
    const original = this.originalPoints;
    if (simplified.length <= 2 || original.length <= 2) {
      return [...simplified];
    }
    const blended: PathPoint[] = [];
    for (let i = 0; i < simplified.length; i += 1) {
      const simplifiedPoint = simplified[i];
      const ratio = i / (simplified.length - 1);
      const originalIndex = Math.min(original.length - 1, Math.round(ratio * (original.length - 1)));
      const originalPoint = original[originalIndex];
      const factor = 1 - this.adherence;
      blended.push({
        x: originalPoint.x * this.adherence + simplifiedPoint.x * factor,
        y: originalPoint.y * this.adherence + simplifiedPoint.y * factor,
      });
    }
    return blended;
  }

  private applySimplify(): void {
    if (this.originalPoints.length < 3) {
      return;
    }
    this.simplifiedPoints = this.simplify(this.originalPoints, SIMPLIFY_TOLERANCE);
    this.renderPath();
  }

  private simplify(points: PathPoint[], tolerance: number): PathPoint[] {
    if (points.length < 3) {
      return [...points];
    }
    const threshold = tolerance * tolerance;
    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = true;
    keep[points.length - 1] = true;
    const stack: Array<{ start: number; end: number }> = [{ start: 0, end: points.length - 1 }];

    while (stack.length) {
      const { start, end } = stack.pop()!;
      let maxDistance = 0;
      let index = -1;
      for (let i = start + 1; i < end; i += 1) {
        const distance = this.perpendicularDistanceSquared(points[i], points[start], points[end]);
        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }
      if (index >= 0 && maxDistance > threshold) {
        keep[index] = true;
        stack.push({ start, end: index }, { start: index, end });
      }
    }

    const simplified: PathPoint[] = [];
    for (let i = 0; i < points.length; i += 1) {
      if (keep[i]) {
        simplified.push(points[i]);
      }
    }
    return simplified;
  }

  private perpendicularDistanceSquared(point: PathPoint, lineStart: PathPoint, lineEnd: PathPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    if (dx === 0 && dy === 0) {
      const dist = Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
      return dist * dist;
    }
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const projectedX = lineStart.x + t * dx;
    const projectedY = lineStart.y + t * dy;
    return (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2;
  }

  private commitPath(forceRemove: boolean): void {
    if (!this.path || !this.context) {
      return;
    }
    if (forceRemove || this.path.points.length < 2) {
      if (this.path.id) {
        this.context.canvas.removeObject(this.path.id);
      }
    } else {
      this.renderPath();
    }
    this.path = null;
  }
}

export const createPathTool = (): CanvasTool => new PathTool();
