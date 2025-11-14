import { Graphics } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { hexToNumber } from "../common/color";

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  id: string | null;
  graphics: Graphics;
}

const SETTING_ROWS = "rows";
const SETTING_COLUMNS = "columns";
const SETTING_STROKE = "strokeWidth";

const MIN_DIMENSION = 48;
const MAX_ROWS = 12;
const MAX_COLS = 12;

const clampInt = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)));

export class TableTool implements CanvasTool {
  public readonly id = "tables";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private drag: DragState | null = null;
  private rows = 3;
  private columns = 3;
  private strokeWidth = 2;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.rows = clampInt(context.getSetting<number>(SETTING_ROWS, this.rows), 1, MAX_ROWS);
    this.columns = clampInt(context.getSetting<number>(SETTING_COLUMNS, this.columns), 1, MAX_COLS);
    this.strokeWidth = clampInt(context.getSetting<number>(SETTING_STROKE, this.strokeWidth), 1, 6);
  }

  public deactivate(): void {
    if (this.drag?.id && this.context) {
      this.context.canvas.removeObject(this.drag.id);
    }
    this.drag = null;
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_ROWS && typeof value === "number") {
      this.rows = clampInt(value, 1, MAX_ROWS);
    }
    if (key === SETTING_COLUMNS && typeof value === "number") {
      this.columns = clampInt(value, 1, MAX_COLS);
    }
    if (key === SETTING_STROKE && typeof value === "number") {
      this.strokeWidth = clampInt(value, 1, 6);
    }
    this.redraw();
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    const graphics = new Graphics();
    graphics.label = "table";
    const id = this.context.canvas.addDisplayObject(graphics);
    this.drag = {
      startX: event.worldX,
      startY: event.worldY,
      currentX: event.worldX + MIN_DIMENSION,
      currentY: event.worldY + MIN_DIMENSION,
      id,
      graphics,
    };
    this.redraw();
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

    const { graphics, startX, startY, currentX, currentY } = this.drag;
    graphics.clear();

    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);
    const width = Math.max(Math.abs(currentX - startX), MIN_DIMENSION);
    const height = Math.max(Math.abs(currentY - startY), MIN_DIMENSION);
    const strokeColor = hexToNumber("#2E2E2E", 0x2e2e2e);

    graphics.rect(minX, minY, width, height);
    graphics.fill({ color: 0xffffff, alpha: 0.1 });
    graphics.stroke({ color: strokeColor, width: this.strokeWidth, alignment: 0.5 });

    const cellWidth = width / this.columns;
    const cellHeight = height / this.rows;

    for (let col = 1; col < this.columns; col += 1) {
      const x = minX + cellWidth * col;
      graphics.moveTo(x, minY).lineTo(x, minY + height).stroke({ color: strokeColor, width: this.strokeWidth });
    }

    for (let row = 1; row < this.rows; row += 1) {
      const y = minY + cellHeight * row;
      graphics.moveTo(minX, y).lineTo(minX + width, y).stroke({ color: strokeColor, width: this.strokeWidth });
    }
  }
}

export const createTableTool = (): CanvasTool => new TableTool();
