import { Container, Graphics, Point, Rectangle } from 'pixi.js';
import { ClickSelection } from './clickSelection';

export class SelectionMarquee {
  private uiContainer: Container | null = null;
  private active: boolean = false;
  private start: Point = new Point();
  private gfx: Graphics | null = null;
  private shift: boolean = false;

  public setUILayer(container: Container) { this.uiContainer = container; }

  public startMarquee(p: Point, container: Container, shift: boolean): void {
    this.active = true; this.start.copyFrom(p); this.shift = shift;
    if (!this.gfx) this.gfx = new Graphics();
    const g = this.gfx; g.clear(); g.name = 'selection-marquee'; g.eventMode = 'none';
    (g as any).__isVisualAid = true; // Mark for layer filtering
    (this.uiContainer || container).addChild(g);
    this.update(p);
  }

  public update(current: Point): void {
    if (!this.active) return;
    const g = this.gfx; if (!g) return;
    const r = this.rectFrom(this.start, current);
    g.clear(); g.rect(r.x, r.y, r.width, r.height);
    g.stroke({ width: 1, color: 0x3b82f6, alpha: 0.9 }); g.fill({ color: 0x3b82f6, alpha: 0.12 });
  }

  public finish(p: Point, container: Container, click: ClickSelection, currentSelection: any[]): any[] {
    if (!this.active) return currentSelection;
    const r = this.rectFrom(this.start, p);
    const picked: any[] = [];
    const children = container.children.slice();
    for (const child of children) {
      if (!click.isSelectableObject(child)) continue;
      try {
        const bounds = this.toContainerSpaceBounds(child, container);
        if (!bounds) continue;
        if (this.containsRect(r, bounds)) picked.push(child);
      } catch {}
    }
    if (this.gfx && this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.active = false;
    if (this.shift) {
      const set = new Set<any>(currentSelection); picked.forEach(o => set.add(o));
      return Array.from(set);
    }
    return picked;
  }

  public isActive(): boolean { return this.active; }

  private rectFrom(a: Point, b: Point): Rectangle {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
    return new Rectangle(x, y, w, h);
  }

  private toContainerSpaceBounds(child: any, container: Container): Rectangle | null {
    try {
      const worldBounds = child.getBounds?.();
      if (!worldBounds) return null;

      const topLeft = container.toLocal(new Point(worldBounds.x, worldBounds.y));
      const bottomRight = container.toLocal(new Point(worldBounds.x + worldBounds.width, worldBounds.y + worldBounds.height));

      const x = Math.min(topLeft.x, bottomRight.x);
      const y = Math.min(topLeft.y, bottomRight.y);
      const width = Math.abs(bottomRight.x - topLeft.x);
      const height = Math.abs(bottomRight.y - topLeft.y);

      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0.01 || height < 0.01) {
        return null;
      }

      return new Rectangle(x, y, width, height);
    } catch {
      return null;
    }
  }

  private containsRect(containerRect: Rectangle, candidate: Rectangle): boolean {
    const epsilon = 0.5;
    const withinX = candidate.x >= containerRect.x - epsilon &&
      candidate.x + candidate.width <= containerRect.x + containerRect.width + epsilon;
    const withinY = candidate.y >= containerRect.y - epsilon &&
      candidate.y + candidate.height <= containerRect.y + containerRect.height + epsilon;
    return withinX && withinY;
  }
}
