import { Container, Graphics, Point, Rectangle } from 'pixi.js';
import { TransformHandle, SelectionGroup } from './types';
import { computeCombinedBoundsLocal } from './SelectionUtils';
import { SelectionSizeIndicator } from './SelectionSizeIndicator';

export class SelectionOverlay {
  private uiContainer: Container | null = null;
  private group: SelectionGroup | null = null;
  private sizeIndicator = new SelectionSizeIndicator();
  // Rotation overlay state
  private overlayCenter: Point | null = null;
  private overlayBaseBounds: Rectangle | null = null;
  private overlayRotationAngle: number = 0;

  public setUILayer(container: Container) {
    this.uiContainer = container; this.sizeIndicator.setUILayer(container);
  }

  public getGroup(): SelectionGroup | null { return this.group; }

  public clear(): void {
    if (!this.group) return;
    const parent = this.group.selectionBox.parent;
    if (parent) parent.removeChild(this.group.selectionBox);
    try { this.group.selectionBox.destroy({ children: false }); } catch {}
    this.group.transformHandles.forEach(h => {
      if (h.graphics?.parent) h.graphics.parent.removeChild(h.graphics);
      try { h.graphics?.destroy({ children: false }); } catch {}
    });
    this.group = null;
    this.overlayCenter = null;
    this.overlayBaseBounds = null;
    this.overlayRotationAngle = 0;
    this.sizeIndicator.clear();
  }

  public refresh(objects: any[], container: Container): void {
    this.clear();
    if (!container || !objects.length) return;
    const bounds = computeCombinedBoundsLocal(objects, container);
    const selectionBox = new Graphics();
    selectionBox.name = 'selection-box';
    selectionBox.eventMode = 'none';
    // Intentionally do not draw the selection rectangle to avoid distracting outlines
    if (this.overlayCenter && this.overlayBaseBounds) {
      const cx = bounds.x + bounds.width * 0.5;
      const cy = bounds.y + bounds.height * 0.5;
      selectionBox.pivot.set(bounds.width * 0.5, bounds.height * 0.5);
      selectionBox.position.set(cx, cy);
      selectionBox.rotation = this.overlayRotationAngle || 0;
      this.overlayBaseBounds = bounds.clone();
      this.overlayCenter = new Point(cx, cy);
    } else {
      selectionBox.position.set(bounds.x, bounds.y);
      selectionBox.rotation = 0;
      selectionBox.pivot.set(0, 0);
    }
    (this.uiContainer || container).addChild(selectionBox);
    const { handles } = this.createHandles(bounds);
    // Optional: add rounding handles for single shape selections
    const rounding = this.createRoundingHandles(objects, container);
    const allHandles = handles.concat(rounding);
    allHandles.forEach(h => (this.uiContainer || container)!.addChild(h.graphics!));
    this.group = { objects: [...objects], bounds, transformHandles: allHandles, selectionBox } as any;
    this.sizeIndicator.update(bounds, container);
  }

  public refreshBoundsOnly(container: Container): void {
    if (!this.group) return;
    const bounds = computeCombinedBoundsLocal(this.group.objects, container);
    this.group.bounds = bounds;
    const g = this.group.selectionBox;
    g.clear();
    // Do not draw selection rectangle (keep handles only)
    if (this.overlayCenter && this.overlayBaseBounds) {
      const cx = bounds.x + bounds.width * 0.5;
      const cy = bounds.y + bounds.height * 0.5;
      g.pivot.set(bounds.width * 0.5, bounds.height * 0.5);
      g.position.set(cx, cy);
      g.rotation = this.overlayRotationAngle || 0;
      this.overlayBaseBounds = bounds.clone();
      this.overlayCenter = new Point(cx, cy);
    } else {
      g.position.set(bounds.x, bounds.y);
      g.rotation = 0;
      g.pivot.set(0, 0);
    }
    // update handles
    const s = 8; const hs = s / 2;
    if (this.overlayCenter && this.overlayBaseBounds) {
      const cx = (this.overlayCenter as Point).x;
      const cy = (this.overlayCenter as Point).y;
      const angle = this.overlayRotationAngle || 0;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      this.group.transformHandles.forEach(h => {
        const pos = this.getHandlePosition(bounds, h.position);
        const vx = pos.x - cx; const vy = pos.y - cy;
        const rx = cx + (vx * cos - vy * sin);
        const ry = cy + (vx * sin + vy * cos);
        h.graphics!.position.set(rx, ry);
        h.bounds!.x = rx - hs; h.bounds!.y = ry - hs;
        h.center = new Point(rx, ry);
      });
    } else {
      this.group.transformHandles.forEach(h => {
        if (h.type === 'rounding') return; // handled below
        const pos = this.getHandlePosition(bounds, h.position);
        h.graphics!.position.set(pos.x, pos.y);
        h.bounds!.x = pos.x - hs; h.bounds!.y = pos.y - hs;
        h.center = new Point(pos.x, pos.y);
      });
    }
    // Update rounding handles to match object corners in container space
    this.updateRoundingHandles(container);
    this.sizeIndicator.update(bounds, container);
  }

  public setRotationPreview(center: Point, base: Rectangle, angle: number): void {
    if (!this.group) return;
    this.overlayCenter = center; this.overlayBaseBounds = base; this.overlayRotationAngle = angle;
    const g = this.group.selectionBox;
    const cx = center.x, cy = center.y;
    g.clear();
    // Do not draw selection rectangle during rotation preview
    g.pivot.set(base.width * 0.5, base.height * 0.5);
    g.position.set(cx, cy);
    g.rotation = angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const s = 8; const hs = s / 2;
    this.group.transformHandles.forEach(h => {
      const basePos = this.getHandlePosition(base, h.position);
      const vx = basePos.x - cx; const vy = basePos.y - cy;
      const rx = cx + (vx * cos - vy * sin);
      const ry = cy + (vx * sin + vy * cos);
      h.graphics!.position.set(rx, ry);
      h.bounds!.x = rx - hs; h.bounds!.y = ry - hs;
      h.center = new Point(rx, ry);
    });
  }

  public findHandleAtPoint(point: Point, includeRotationHotspots: boolean = false): TransformHandle | null {
    if (!this.group) return null;
    for (const h of this.group.transformHandles) {
      const b = h.bounds!;
      if (point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height) {
        return h;
      }
    }
    if (!includeRotationHotspots || !this.group) return null;
    const b = this.group.bounds;
    const angle = this.overlayRotationAngle || 0;
    const cx = b.x + b.width * 0.5;
    const cy = b.y + b.height * 0.5;
    const sin = Math.sin(-angle); // inverse rotation
    const cos = Math.cos(-angle);
    const px = point.x - cx;
    const py = point.y - cy;
    const qx = cx + (px * cos - py * sin);
    const qy = cy + (px * sin + py * cos);
    const q = new Point(qx, qy);
    const margin = 18; const thresh = 6;
    const dxTL = b.x - q.x; const dyTL = b.y - q.y;
    if (dxTL >= 0 && dyTL >= 0 && dxTL < margin && dyTL < margin && Math.abs(dxTL - dyTL) <= thresh) return { type: 'rotation', position: 'tl' } as any;
    const dxTR = q.x - (b.x + b.width); const dyTR = b.y - q.y;
    if (dxTR >= 0 && dyTR >= 0 && dxTR < margin && dyTR < margin && Math.abs(dxTR - dyTR) <= thresh) return { type: 'rotation', position: 'tr' } as any;
    const dxBL = b.x - q.x; const dyBL = q.y - (b.y + b.height);
    if (dxBL >= 0 && dyBL >= 0 && dxBL < margin && dyBL < margin && Math.abs(dxBL - dyBL) <= thresh) return { type: 'rotation', position: 'bl' } as any;
    const dxBR = q.x - (b.x + b.width); const dyBR = q.y - (b.y + b.height);
    if (dxBR >= 0 && dyBR >= 0 && dxBR < margin && dyBR < margin && Math.abs(dxBR - dyBR) <= thresh) return { type: 'rotation', position: 'br' } as any;
    return null;
  }

  public pointInRect(p: Point, r: Rectangle): boolean {
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  }

  public setRotationState(center: Point, baseBounds: Rectangle, angle: number): void {
    this.overlayCenter = center; this.overlayBaseBounds = baseBounds; this.overlayRotationAngle = angle;
  }

  private createHandles(bounds: Rectangle): { handles: TransformHandle[] } {
    const positions: Array<{ key: TransformHandle['position']; x: number; y: number }> = [
      { key: 'tl', x: bounds.x, y: bounds.y },
      { key: 'tr', x: bounds.x + bounds.width, y: bounds.y },
      { key: 'br', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { key: 'bl', x: bounds.x, y: bounds.y + bounds.height },
      { key: 't', x: bounds.x + bounds.width / 2, y: bounds.y },
      { key: 'r', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { key: 'b', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { key: 'l', x: bounds.x, y: bounds.y + bounds.height / 2 },
    ];
    const size = 8; const hs = size / 2;
    let cornerIdx = 0; let edgeIdx = 0;
    const handles = positions.map((p, idx) => {
      const g = new Graphics();
      g.name = `transform-handle-${p.key}`;
      g.eventMode = 'none';
      g.roundRect(-hs, -hs, size, size, 2);
      g.fill({ color: 0xffffff });
      g.stroke({ width: 1, color: 0x4a79a4 });
      g.position.set(p.x, p.y);
      const isCorner = idx < 4;
      const index = isCorner ? cornerIdx++ : edgeIdx++;
      return { type: isCorner ? 'corner' : 'edge', position: p.key as any, graphics: g, bounds: new Rectangle(p.x - hs, p.y - hs, size, size), index, center: new Point(p.x, p.y) } as TransformHandle;
    });
    return { handles };
  }

  private getHandlePosition(bounds: Rectangle, position: TransformHandle['position']): Point {
    switch (position) {
      case 'tl': return new Point(bounds.x, bounds.y);
      case 'tr': return new Point(bounds.x + bounds.width, bounds.y);
      case 'br': return new Point(bounds.x + bounds.width, bounds.y + bounds.height);
      case 'bl': return new Point(bounds.x, bounds.y + bounds.height);
      case 't': return new Point(bounds.x + bounds.width / 2, bounds.y);
      case 'r': return new Point(bounds.x + bounds.width, bounds.y + bounds.height / 2);
      case 'b': return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height);
      case 'l': return new Point(bounds.x, bounds.y + bounds.height / 2);
      default: return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    }
  }

  // ----- Rounding handles for corner curvature editing -----
  private createRoundingHandles(objects: any[], container: Container): TransformHandle[] {
    try {
      if (!objects || objects.length !== 1) return [];
      const obj = objects[0];
      const isShape = (obj as any).__toolType === 'shapes' || (obj as any).__meta?.kind === 'shapes';
      const type = (obj as any).__meta?.shapeType || '';
      if (!isShape) return [];
      if (type !== 'rectangle' && type !== 'triangle') return [];

      const positions = this.computeRoundingHandlePositions(obj, container, type);
      const size = 8; const hs = size / 2;
      const mk = (key: string, x: number, y: number): TransformHandle => {
        const g = new Graphics();
        g.name = `round-handle-${key}`;
        g.eventMode = 'none';
        g.circle(0, 0, hs).fill({ color: 0xffffff }).stroke({ width: 1, color: 0x10b981 });
        g.position.set(x, y);
        return { type: 'rounding', position: (key as any), graphics: g, bounds: new Rectangle(x - hs, y - hs, size, size), center: new Point(x, y) } as TransformHandle;
      };
      const out: TransformHandle[] = [];
      for (const k of Object.keys(positions)) {
        const p = (positions as any)[k];
        out.push(mk(k, p.x, p.y));
      }
      return out;
    } catch { return []; }
  }

  private updateRoundingHandles(container: Container): void {
    if (!this.group) return;
    const objs = this.group.objects || [];
    if (objs.length !== 1) return;
    const obj = objs[0];
    const type = (obj as any).__meta?.shapeType || '';
    if (type !== 'rectangle' && type !== 'triangle') return;
    const positions = this.computeRoundingHandlePositions(obj, container, type);
    const s = 8; const hs = s / 2;
    for (const h of this.group.transformHandles) {
      if (h.type !== 'rounding') continue;
      const p = (positions as any)[h.position];
      if (!p) continue;
      h.graphics!.position.set(p.x, p.y);
      h.bounds!.x = p.x - hs; h.bounds!.y = p.y - hs;
      h.center = new Point(p.x, p.y);
    }
  }

  private computeRoundingHandlePositions(obj: any, container: Container, shapeType: string): Record<string, Point> {
    if (shapeType === 'rectangle') {
      // Use object's local bounds corners, but offset inward to avoid conflicts with corner anchors
      const b = obj.getLocalBounds() as Rectangle;
      const inset = 16; // Distance from corner to avoid anchor point conflicts
      const to = (x: number, y: number) => container.toLocal(obj.toGlobal(new Point(x, y)));
      return {
        tl: to(b.x + inset, b.y + inset),           // Top-left: move inward from corner
        tr: to(b.x + b.width - inset, b.y + inset), // Top-right: move inward from corner
        br: to(b.x + b.width - inset, b.y + b.height - inset), // Bottom-right: move inward from corner
        bl: to(b.x + inset, b.y + b.height - inset), // Bottom-left: move inward from corner
      };
    } else {
      // Triangle vertices: move inward from vertices to avoid anchor conflicts
      const b = obj.getLocalBounds() as Rectangle;
      const inset = 16; // Distance from vertex to avoid anchor point conflicts
      const top = new Point(b.x + b.width / 2, b.y + inset); // Move down from top vertex
      const br = new Point(b.x + b.width - inset, b.y + b.height - inset); // Move inward from bottom-right
      const bl = new Point(b.x + inset, b.y + b.height - inset); // Move inward from bottom-left
      const to = (p: Point) => container.toLocal(obj.toGlobal(p));
      return {
        t: to(top),
        br: to(br),
        bl: to(bl),
      } as any;
    }
  }

  // size indicator moved to SelectionSizeIndicator.ts
}
