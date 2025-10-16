import { Container, Graphics, Point, Rectangle } from 'pixi.js';
import { TransformHandle, SelectionFrame, SelectionGroup } from './types';
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
  private frame: SelectionFrame | null = null;

  private static readonly ROTATION_EPSILON = 0.0001;

  private resetRotationTracking(): void {
    this.overlayCenter = null;
    this.overlayBaseBounds = null;
    this.overlayRotationAngle = 0;
  }

  private extractObjectGeometry(obj: any, container: Container): {
    origin: Point;
    axisX: Point;
    axisY: Point;
    width: number;
    height: number;
    corners: [Point, Point, Point, Point];
  } | null {
    try {
      if (!obj || typeof obj.toGlobal !== 'function' || typeof obj.getLocalBounds !== 'function') {
        return null;
      }

      const lb = obj.getLocalBounds();
      if (!lb || !isFinite(lb.width) || !isFinite(lb.height)) {
        return null;
      }

      const localCorners = [
        new Point(lb.x, lb.y),
        new Point(lb.x + lb.width, lb.y),
        new Point(lb.x + lb.width, lb.y + lb.height),
        new Point(lb.x, lb.y + lb.height),
      ];

      const worldCorners = localCorners.map((pt) => obj.toGlobal(pt));
      const containerCorners = worldCorners.map((pt) => container.toLocal(pt)) as [Point, Point, Point, Point];

      const axisXVec = new Point(
        containerCorners[1].x - containerCorners[0].x,
        containerCorners[1].y - containerCorners[0].y,
      );
      const axisYVec = new Point(
        containerCorners[3].x - containerCorners[0].x,
        containerCorners[3].y - containerCorners[0].y,
      );

      const width = Math.hypot(axisXVec.x, axisXVec.y);
      const height = Math.hypot(axisYVec.x, axisYVec.y);

      if (!isFinite(width) || !isFinite(height) || width < 0.0001 || height < 0.0001) {
        return null;
      }

      const axisX = new Point(axisXVec.x / width, axisXVec.y / width);
      let axisY = new Point(axisYVec.x / height, axisYVec.y / height);

      // Ensure axisY forms a right-handed basis with axisX
      const cross = axisX.x * axisY.y - axisX.y * axisY.x;
      if (cross < 0) {
        axisY = new Point(-axisY.x, -axisY.y);
      }

      return {
        origin: containerCorners[0],
        axisX,
        axisY,
        width,
        height,
        corners: containerCorners,
      };
    } catch {
      return null;
    }
  }

  private inferFrameFromObjects(objects: any[], container: Container): SelectionFrame | null {
    if (!objects.length) {
      return null;
    }

    const base = this.extractObjectGeometry(objects[0], container);
    if (!base) {
      return null;
    }

    const origin = base.origin;
    const axisX = base.axisX;
    const axisY = base.axisY;
    const rotation = Math.atan2(axisX.y, axisX.x);

    let minProjX = 0;
    let maxProjX = base.width;
    let minProjY = 0;
    let maxProjY = base.height;

    const projectPoint = (pt: Point) => {
      const vx = pt.x - origin.x;
      const vy = pt.y - origin.y;
      const projX = vx * axisX.x + vy * axisX.y;
      const projY = vx * axisY.x + vy * axisY.y;
      if (projX < minProjX) minProjX = projX;
      if (projX > maxProjX) maxProjX = projX;
      if (projY < minProjY) minProjY = projY;
      if (projY > maxProjY) maxProjY = projY;
    };

    base.corners.forEach(projectPoint);

    const axisTolerance = 0.015;

    for (let i = 1; i < objects.length; i++) {
      const geom = this.extractObjectGeometry(objects[i], container);
      if (!geom) {
        return null;
      }
      const dot = Math.abs(geom.axisX.x * axisX.x + geom.axisX.y * axisX.y);
      const cross = geom.axisX.x * axisX.y - geom.axisX.y * axisX.x;
      if (Math.abs(1 - dot) > axisTolerance || Math.abs(cross) > axisTolerance) {
        return null;
      }
      geom.corners.forEach(projectPoint);
    }

    const width = maxProjX - minProjX;
    const height = maxProjY - minProjY;

    if (!isFinite(width) || !isFinite(height) || width < 0.0001 || height < 0.0001) {
      return null;
    }

    const centerOffsetX = (minProjX + maxProjX) * 0.5;
    const centerOffsetY = (minProjY + maxProjY) * 0.5;

    const center = new Point(
      origin.x + axisX.x * centerOffsetX + axisY.x * centerOffsetY,
      origin.y + axisX.y * centerOffsetX + axisY.y * centerOffsetY,
    );

    const cornerFromProjection = (projX: number, projY: number) => new Point(
      origin.x + axisX.x * projX + axisY.x * projY,
      origin.y + axisX.y * projX + axisY.y * projY,
    );

    const tl = cornerFromProjection(minProjX, minProjY);
    const tr = cornerFromProjection(maxProjX, minProjY);
    const br = cornerFromProjection(maxProjX, maxProjY);
    const bl = cornerFromProjection(minProjX, maxProjY);

    return {
      center,
      width,
      height,
      rotation,
      corners: { tl, tr, br, bl },
    };
  }

  public setUILayer(container: Container) {
    this.uiContainer = container; this.sizeIndicator.setUILayer(container);
  }

  private computeFrame(bounds: Rectangle): SelectionFrame {
    const center = new Point(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
    let width = bounds.width;
    let height = bounds.height;
    let rotation = 0;

    if (this.overlayBaseBounds && Math.abs(this.overlayRotationAngle) > SelectionOverlay.ROTATION_EPSILON) {
      width = this.overlayBaseBounds.width;
      height = this.overlayBaseBounds.height;
      rotation = this.overlayRotationAngle;
    } else {
      this.overlayBaseBounds = bounds.clone();
      this.overlayRotationAngle = 0;
    }

    this.overlayCenter = center;
    // Mark overlayCenter as read to satisfy strict TS usage checks
    void this.overlayCenter;
    return this.buildFrame(center, width, height, rotation);
  }

  private buildFrame(center: Point, width: number, height: number, rotation: number): SelectionFrame {
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const transformCorner = (dx: number, dy: number) => {
      return new Point(
        center.x + dx * cos - dy * sin,
        center.y + dx * sin + dy * cos,
      );
    };

    const tl = transformCorner(-halfW, -halfH);
    const tr = transformCorner(halfW, -halfH);
    const br = transformCorner(halfW, halfH);
    const bl = transformCorner(-halfW, halfH);

    return {
      center,
      width,
      height,
      rotation,
      corners: { tl, tr, br, bl },
    };
  }

  private createSelectionBox(frame: SelectionFrame): Graphics {
    const selectionBox = new Graphics();
    selectionBox.name = 'selection-box';
    selectionBox.eventMode = 'none';
    this.drawSelectionBox(selectionBox, frame);
    return selectionBox;
  }

  private drawSelectionBox(target: Graphics, frame: SelectionFrame): void {
    target.clear();
    target
      .roundRect(0, 0, frame.width, frame.height, 4)
      .stroke({
        color: 0x4a79a4,
        width: 2,
        alpha: 0.6,
      });
    target.pivot.set(frame.width * 0.5, frame.height * 0.5);
    target.position.set(frame.center.x, frame.center.y);
    target.rotation = frame.rotation;
  }

  private applyFrameToGraphics(frame: SelectionFrame): void {
    if (!this.group) return;
    this.drawSelectionBox(this.group.selectionBox, frame);
    this.updateHandles(frame);
    this.group.frame = frame;
  }

  private computeHandlePositions(frame: SelectionFrame): Record<TransformHandle['position'], Point> {
    const clonePoint = (p: Point) => new Point(p.x, p.y);
    const { tl, tr, br, bl } = frame.corners;
    const positions: Record<string, Point> = {
      tl: clonePoint(tl),
      tr: clonePoint(tr),
      br: clonePoint(br),
      bl: clonePoint(bl),
    };

    const midpoint = (a: Point, b: Point) => new Point((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    positions.t = midpoint(positions.tl, positions.tr);
    positions.r = midpoint(positions.tr, positions.br);
    positions.b = midpoint(positions.br, positions.bl);
    positions.l = midpoint(positions.bl, positions.tl);

    return positions as Record<TransformHandle['position'], Point>;
  }

  private createHandles(frame: SelectionFrame): TransformHandle[] {
    const positions = this.computeHandlePositions(frame);
    const size = 8;
    const halfSize = size * 0.5;
    let cornerIdx = 0;
    let edgeIdx = 0;

    const descriptors: Array<{ key: TransformHandle['position']; type: 'corner' | 'edge' }> = [
      { key: 'tl', type: 'corner' },
      { key: 'tr', type: 'corner' },
      { key: 'br', type: 'corner' },
      { key: 'bl', type: 'corner' },
      { key: 't', type: 'edge' },
      { key: 'r', type: 'edge' },
      { key: 'b', type: 'edge' },
      { key: 'l', type: 'edge' },
    ];

    return descriptors.map(({ key, type }) => {
      const pos = positions[key];
      const graphics = new Graphics();
      graphics.name = `transform-handle-${key}`;
      graphics.eventMode = 'none';
      graphics.roundRect(-halfSize, -halfSize, size, size, 2);
      graphics.fill({ color: 0xffffff });
      graphics.stroke({ width: 1, color: 0x4a79a4 });
      graphics.position.set(pos.x, pos.y);

      const index = type === 'corner' ? cornerIdx++ : edgeIdx++;
      const bounds = new Rectangle(pos.x - halfSize, pos.y - halfSize, size, size);

      return {
        type,
        position: key,
        graphics,
        bounds,
        index,
        center: new Point(pos.x, pos.y),
      } as TransformHandle;
    });
  }

  private updateHandles(frame: SelectionFrame): void {
    if (!this.group) return;
    const positions = this.computeHandlePositions(frame);
    const size = 8;
    const halfSize = size * 0.5;

    this.group.transformHandles.forEach((handle) => {
      const pos = positions[handle.position];
      if (!pos || !handle.graphics || !handle.bounds) return;
      handle.graphics.position.set(pos.x, pos.y);
      handle.bounds.x = pos.x - halfSize;
      handle.bounds.y = pos.y - halfSize;
      handle.bounds.width = size;
      handle.bounds.height = size;
      handle.center = new Point(pos.x, pos.y);
    });
  }
  public getGroup(): SelectionGroup | null { return this.group; }

  public clear(): void {
    if (!this.group) return;
    const parent = this.group.selectionBox.parent;
    if (parent) parent.removeChild(this.group.selectionBox);
    try { this.group.selectionBox.destroy({ children: false }); } catch { /* empty */ }
    this.group.transformHandles.forEach(h => {
      if (h.graphics?.parent) h.graphics.parent.removeChild(h.graphics);
      try { h.graphics?.destroy({ children: false }); } catch { /* empty */ }
    });
    this.group = null;
    this.frame = null;
    this.resetRotationTracking();
    this.sizeIndicator.clear();
  }

  public refresh(objects: any[], container: Container): void {
    this.clear();
    if (!container || !objects.length) return;

    const bounds = computeCombinedBoundsLocal(objects, container);
    const orientedFrame = this.inferFrameFromObjects(objects, container);
    let frame: SelectionFrame;

    if (orientedFrame) {
      frame = orientedFrame;
      this.overlayCenter = new Point(frame.center.x, frame.center.y);
      this.overlayBaseBounds = new Rectangle(0, 0, frame.width, frame.height);
      this.overlayRotationAngle = frame.rotation;
    } else {
      this.resetRotationTracking();
      frame = this.computeFrame(bounds);
    }

    const selectionBox = this.createSelectionBox(frame);
    (this.uiContainer || container).addChild(selectionBox);

    const handles = this.createHandles(frame);
    handles.forEach(h => (this.uiContainer || container)!.addChild(h.graphics!));

    this.group = {
      objects: [...objects],
      bounds,
      transformHandles: handles,
      selectionBox,
      frame,
    };

    this.frame = frame;
    this.sizeIndicator.update(frame, container);
  }

  public refreshBoundsOnly(container: Container): void {
    if (!this.group) return;

    const bounds = computeCombinedBoundsLocal(this.group.objects, container);
    const orientedFrame = this.inferFrameFromObjects(this.group.objects, container);
    let frame: SelectionFrame;

    if (orientedFrame) {
      frame = orientedFrame;
      this.overlayCenter = new Point(frame.center.x, frame.center.y);
      this.overlayBaseBounds = new Rectangle(0, 0, frame.width, frame.height);
      this.overlayRotationAngle = frame.rotation;
    } else {
      this.resetRotationTracking();
      frame = this.computeFrame(bounds);
    }

    this.group.bounds = bounds;
    this.group.frame = frame;
    this.frame = frame;

    this.applyFrameToGraphics(frame);
    this.sizeIndicator.update(frame, container);
  }

  public setRotationPreview(center: Point, base: Rectangle, angle: number): void {
    if (!this.group) return;
    this.overlayCenter = center;
    this.overlayBaseBounds = base.clone();
    this.overlayRotationAngle = angle;

    const frame = this.buildFrame(center, base.width, base.height, angle);
    this.frame = frame;
    this.applyFrameToGraphics(frame);

    const fallback = (this.uiContainer || this.group.selectionBox.parent) as Container | null;
    if (fallback) {
      this.sizeIndicator.update(frame, fallback);
    }
  }

  public findHandleAtPoint(point: Point, includeRotationHotspots: boolean = false): TransformHandle | null {
    if (!this.group) return null;
    for (const h of this.group.transformHandles) {
      const b = h.bounds!;
      if (point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height) {
        return h;
      }
    }

  if (!includeRotationHotspots || !this.group || !this.frame) return null;

    const frame = this.frame;
    const rotation = frame.rotation;

    const cx = frame.center.x;
    const cy = frame.center.y;
    const sin = Math.sin(-rotation);
    const cos = Math.cos(-rotation);
    const px = point.x - cx;
    const py = point.y - cy;
    const localX = px * cos - py * sin;
    const localY = px * sin + py * cos;
    const halfW = frame.width * 0.5;
    const halfH = frame.height * 0.5;
    const margin = 18;
    const thresh = 6;

    const checkCorner = (tx: number, ty: number, position: TransformHandle['position']) => {
      const dx = tx - localX;
      const dy = ty - localY;
      if (Math.abs(dx) <= margin && Math.abs(dy) <= margin && Math.abs(Math.abs(dx) - Math.abs(dy)) <= thresh) {
        return { type: 'rotation', position } as TransformHandle;
      }
      return null;
    };

    return (
      checkCorner(-halfW, -halfH, 'tl') ||
      checkCorner(halfW, -halfH, 'tr') ||
      checkCorner(-halfW, halfH, 'bl') ||
      checkCorner(halfW, halfH, 'br')
    );
  }

  public pointInRect(p: Point, r: Rectangle): boolean {
    if (this.frame && Math.abs(this.frame.rotation) > SelectionOverlay.ROTATION_EPSILON) {
      const rotation = -this.frame.rotation;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const dx = p.x - this.frame.center.x;
      const dy = p.y - this.frame.center.y;
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      return Math.abs(localX) <= this.frame.width * 0.5 && Math.abs(localY) <= this.frame.height * 0.5;
    }
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  }

  public setRotationState(center: Point, baseBounds: Rectangle, angle: number): void {
    if (Math.abs(angle) < SelectionOverlay.ROTATION_EPSILON) {
      this.clearRotationState();
      return;
    }

    this.overlayCenter = center;
    this.overlayBaseBounds = baseBounds.clone();
    this.overlayRotationAngle = angle;

    const frame = this.buildFrame(center, baseBounds.width, baseBounds.height, angle);
    this.frame = frame;
    this.applyFrameToGraphics(frame);

    const fallback = (this.uiContainer || this.group?.selectionBox.parent) as Container | null;
    if (fallback) {
      this.sizeIndicator.update(frame, fallback);
    }
  }

  public clearRotationState(): void {
    this.resetRotationTracking();

    if (!this.group) return;

    const bounds = this.group.bounds;
    const center = new Point(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
    const frame = this.buildFrame(center, bounds.width, bounds.height, 0);
    this.frame = frame;
    this.applyFrameToGraphics(frame);

    const fallback = (this.uiContainer || this.group.selectionBox.parent) as Container | null;
    if (fallback) {
      this.sizeIndicator.update(frame, fallback);
    }
  }



  // size indicator moved to SelectionSizeIndicator.ts
}
