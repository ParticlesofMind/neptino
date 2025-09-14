import { Container, Graphics, Point, Rectangle, Text } from 'pixi.js';
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
    selectionBox.rect(0, 0, bounds.width, bounds.height);
    selectionBox.stroke({ width: 2, color: 0x3b82f6 });
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
    handles.forEach(h => (this.uiContainer || container)!.addChild(h.graphics!));
    this.group = { objects: [...objects], bounds, transformHandles: handles, selectionBox } as any;
    this.sizeIndicator.update(bounds, container);
  }

  public refreshBoundsOnly(container: Container): void {
    if (!this.group) return;
    const bounds = computeCombinedBoundsLocal(this.group.objects, container);
    this.group.bounds = bounds;
    const g = this.group.selectionBox;
    g.clear();
    g.rect(0, 0, bounds.width, bounds.height);
    g.stroke({ width: 2, color: 0x3b82f6 });
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
        const pos = this.getHandlePosition(bounds, h.position);
        h.graphics!.position.set(pos.x, pos.y);
        h.bounds!.x = pos.x - hs; h.bounds!.y = pos.y - hs;
        h.center = new Point(pos.x, pos.y);
      });
    }
    this.sizeIndicator.update(bounds, container);
  }

  public setRotationPreview(center: Point, base: Rectangle, angle: number, container: Container): void {
    if (!this.group) return;
    this.overlayCenter = center; this.overlayBaseBounds = base; this.overlayRotationAngle = angle;
    const g = this.group.selectionBox;
    const cx = center.x, cy = center.y;
    g.clear();
    g.rect(0, 0, base.width, base.height);
    g.stroke({ width: 2, color: 0x3b82f6 });
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
      g.rect(-hs, -hs, size, size);
      g.fill({ color: 0xffffff });
      g.stroke({ width: 1, color: 0x3b82f6 });
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

  // size indicator moved to SelectionSizeIndicator.ts
}
