import { Graphics, Point, type Container } from "pixi.js";

export interface SelectionTarget {
  id: string;
  object: Container;
}

interface SelectionOptions {
  additive?: boolean;
  toggle?: boolean;
}

export class SelectionManager {
  private selected: SelectionTarget[] = [];
  private readonly highlight: Graphics;

  constructor(private readonly overlayLayer: Container) {
    this.highlight = new Graphics();
    this.highlight.eventMode = "none";
    overlayLayer.addChild(this.highlight);
  }

  public setSelection(targets: SelectionTarget[], options: boolean | SelectionOptions = {}): void {
    const resolved = this.normalizeOptions(options);
    const normalizedTargets = this.normalizeTargets(targets);

    if (resolved.toggle) {
      const next = new Map(this.selected.map((target) => [target.id, target]));
      normalizedTargets.forEach((target) => {
        if (next.has(target.id)) {
          next.delete(target.id);
        } else {
          next.set(target.id, target);
        }
      });
      this.selected = Array.from(next.values());
      this.render();
      return;
    }

    if (resolved.additive && this.selected.length) {
      const existing = new Map(this.selected.map((target) => [target.id, target]));
      normalizedTargets.forEach((target) => {
        existing.set(target.id, target);
      });
      this.selected = Array.from(existing.values());
    } else {
      this.selected = normalizedTargets;
    }
    this.render();
  }

  public clear(): void {
    this.selected = [];
    this.render();
  }

  public refresh(): void {
    this.render();
  }

  public isSelected(id: string): boolean {
    return this.selected.some((target) => target.id === id);
  }

  public getSelection(): SelectionTarget[] {
    return [...this.selected];
  }

  private render(): void {
    this.highlight.clear();
    if (!this.selected.length) {
      return;
    }

    const pixelSize = this.getPixelSize();
    const strokeWidth = 1.2 * pixelSize;

    this.selected.forEach(({ object }) => {
      const rect = this.toOverlayRect(object);
      this.highlight.rect(rect.x, rect.y, rect.width, rect.height).fill({
        color: 0x4a7fb8,
        alpha: 0.08,
      });
      this.highlight.rect(rect.x, rect.y, rect.width, rect.height).stroke({
        color: 0xb3d7ff,
        width: strokeWidth,
        alignment: 0.5,
        alpha: 0.85,
      });
    });
  }

  private toOverlayRect(object: Container): { x: number; y: number; width: number; height: number } {
    const bounds = object.getBounds();
    const topLeft = this.overlayLayer.toLocal(new Point(bounds.x, bounds.y));
    const bottomRight = this.overlayLayer.toLocal(new Point(bounds.x + bounds.width, bounds.y + bounds.height));
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  private normalizeTargets(targets: SelectionTarget[]): SelectionTarget[] {
    const deduped: SelectionTarget[] = [];
    const seen = new Set<string>();
    targets.forEach((target) => {
      if (!target || !target.id || !target.object) {
        return;
      }
      if (seen.has(target.id)) {
        return;
      }
      seen.add(target.id);
      deduped.push(target);
    });
    return deduped;
  }

  private normalizeOptions(options: boolean | SelectionOptions): SelectionOptions {
    if (typeof options === "boolean") {
      return { additive: options, toggle: false };
    }
    return {
      additive: Boolean(options.additive),
      toggle: Boolean(options.toggle),
    };
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
}
