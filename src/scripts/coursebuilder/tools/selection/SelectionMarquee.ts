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
        const b = child.getBounds();
        if (this.intersects(r, b)) picked.push(child);
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

  private intersects(a: Rectangle, wb: any): boolean {
    const x2 = wb.x + wb.width; const y2 = wb.y + wb.height;
    return !(x2 < a.x || wb.x > a.x + a.width || y2 < a.y || wb.y > a.y + a.height);
  }
}
