import { Container, Point, Rectangle } from 'pixi.js';
import { SelectionGroup, TransformHandle } from './types';
import { CanvasBounds } from '../BoundaryUtils';

type PerObjectState = {
  obj: any;
  startPosition: { x: number; y: number };
  startScale: { x: number; y: number };
  startRotation: number;
  startPivot: { x: number; y: number };
  localAnchor: Point; // anchor in the object's local space
};

export class TransformController {
  private objects: PerObjectState[] = [];
  private activeHandle: TransformHandle | null = null;
  private selectionGroup: SelectionGroup | null = null;
  private container: Container | null = null;
  private anchorLocal: Point = new Point(0, 0); // anchor in container-local coords
  private anchorGlobal: Point = new Point(0, 0); // anchor in world coords
  private pointerStartLocal: Point = new Point(0, 0);
  private startRotationRefAngle = 0; // for rotation handle: angle at start
  private getCanvasBounds: (() => CanvasBounds) | null = null;
  private allowMirroring = true;
  private restorePivotOnEnd = true;
  private rotationSnapRad = 0; // radians; 0 disables snapping
  private scaleSnapStep = 0;   // 0 disables snapping

  public begin(
    selectedObjects: any[],
    selectionGroup: SelectionGroup,
    container: Container,
    handle: TransformHandle,
    pointerLocal: Point,
    options?: {
      getCanvasBounds?: () => CanvasBounds;
      allowMirroring?: boolean;
      restorePivotOnEnd?: boolean;
      rotationSnapDeg?: number;
      scaleSnapStep?: number;
      modifiers?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean };
    }
  ): void {
    this.cleanup();
    this.container = container;
    this.selectionGroup = selectionGroup;
    this.activeHandle = handle;
    this.pointerStartLocal.set(pointerLocal.x, pointerLocal.y);
    this.getCanvasBounds = options?.getCanvasBounds || null;
    this.allowMirroring = options?.allowMirroring ?? true;
    this.restorePivotOnEnd = options?.restorePivotOnEnd ?? true;
    this.rotationSnapRad = (options?.rotationSnapDeg || 0) * Math.PI / 180;
    this.scaleSnapStep = options?.scaleSnapStep || 0;

    // Compute anchor from selection bounds and handle position
    const useCenter = !!options?.modifiers?.altKey;
    this.anchorLocal = this.computeAnchorLocalFromHandle(useCenter);
    this.anchorGlobal = container.toGlobal(this.anchorLocal);

    // Prepare per-object state and temporarily pivot around anchor
    this.objects = selectedObjects.map((obj) => {
      const state: PerObjectState = {
        obj,
        startPosition: { x: obj.position.x, y: obj.position.y },
        startScale: { x: obj.scale?.x ?? 1, y: obj.scale?.y ?? 1 },
        startRotation: obj.rotation ?? 0,
        startPivot: { x: obj.pivot?.x ?? 0, y: obj.pivot?.y ?? 0 },
        localAnchor: obj.toLocal(this.anchorGlobal),
      };

      // Align pivot to anchor without visual movement
      if (obj.pivot) {
        obj.pivot.set(state.localAnchor.x, state.localAnchor.y);
        // Set position so that pivot maps exactly to anchorGlobal
        const posInParent = obj.parent?.toLocal(this.anchorGlobal, undefined, undefined, false) ?? { x: 0, y: 0 };
        obj.position.set(posInParent.x, posInParent.y);
      }

      return state;
    });

    if (handle.type === 'rotation') {
      const centerLocal = new Point(
        selectionGroup.bounds.x + selectionGroup.bounds.width * 0.5,
        selectionGroup.bounds.y + selectionGroup.bounds.height * 0.5,
      );
      const dx = pointerLocal.x - centerLocal.x;
      const dy = pointerLocal.y - centerLocal.y;
      this.startRotationRefAngle = Math.atan2(dy, dx);
    }
  }

  public update(pointerLocal: Point, modifiers?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean }): void {
    if (!this.container || !this.activeHandle || !this.selectionGroup) return;

    if (this.activeHandle.type === 'rotation') {
      this.applyRotation(pointerLocal, modifiers);
    } else {
      this.applyScaling(pointerLocal, modifiers);
    }
  }

  public end(): void {
    if (this.restorePivotOnEnd) {
      this.objects.forEach((o) => {
        try {
          const currentPivotLocal = new Point(o.obj.pivot?.x ?? 0, o.obj.pivot?.y ?? 0);
          const currentPivotWorld = o.obj.toGlobal(currentPivotLocal);
          o.obj.pivot.set(o.startPivot.x, o.startPivot.y);
          const posInParent = o.obj.parent?.toLocal(currentPivotWorld, undefined, undefined, false) ?? { x: 0, y: 0 };
          o.obj.position.set(posInParent.x, posInParent.y);
        } catch {}
      });
    }
    this.cleanupEphemeral();
  }

  private applyRotation(pointerLocal: Point, modifiers?: { shiftKey?: boolean }): void {
    // Rotate around selection center by updating rotation only.
    // Pivot and position were aligned in begin(), so geometry revolves correctly around center.
    const b = this.selectionGroup!.bounds;
    const centerLocal = new Point(b.x + b.width * 0.5, b.y + b.height * 0.5);
    const dx = pointerLocal.x - centerLocal.x;
    const dy = pointerLocal.y - centerLocal.y;
    const currentAngle = Math.atan2(dy, dx);
    let delta = currentAngle - this.startRotationRefAngle;
    if (modifiers?.shiftKey && this.rotationSnapRad > 0) {
      delta = Math.round(delta / this.rotationSnapRad) * this.rotationSnapRad;
    }

    this.objects.forEach((o) => {
      if (typeof o.obj.rotation === 'number') {
        o.obj.rotation = o.startRotation + delta;
      }
    });
  }

  private applyScaling(pointerLocal: Point, modifiers?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean }): void {
    // Option/Alt: center-scale around selection center
    const useCenter = !!modifiers?.altKey;
    const currentAnchorLocal = this.computeAnchorLocalFromHandle(useCenter);

    // If anchor changed due to modifier toggle, retarget pivots
    if (currentAnchorLocal.x !== this.anchorLocal.x || currentAnchorLocal.y !== this.anchorLocal.y) {
      this.anchorLocal.copyFrom(currentAnchorLocal);
      this.anchorGlobal = this.container!.toGlobal(this.anchorLocal);
      this.objects.forEach((o) => {
        o.localAnchor = o.obj.toLocal(this.anchorGlobal);
        if (o.obj.pivot) {
          o.obj.pivot.set(o.localAnchor.x, o.localAnchor.y);
          const posInParent = o.obj.parent?.toLocal(this.anchorGlobal, undefined, undefined, false) ?? { x: 0, y: 0 };
          o.obj.position.set(posInParent.x, posInParent.y);
        }
      });
    }

    const hvx0 = this.pointerStartLocal.x - this.anchorLocal.x;
    const hvy0 = this.pointerStartLocal.y - this.anchorLocal.y;
    const hvx = pointerLocal.x - this.anchorLocal.x;
    const hvy = pointerLocal.y - this.anchorLocal.y;

    // Prevent division by zero; tiny epsilon
    const eps = 1e-6;
    let scaleX = 1;
    let scaleY = 1;

    if (this.activeHandle!.type === 'corner') {
      scaleX = Math.abs(hvx0) > eps ? hvx / hvx0 : 1;
      scaleY = Math.abs(hvy0) > eps ? hvy / hvy0 : 1;
    } else if (this.activeHandle!.type === 'edge') {
      switch (this.activeHandle!.position) {
        case 't':
        case 'b':
          scaleY = Math.abs(hvy0) > eps ? hvy / hvy0 : 1;
          scaleX = 1;
          break;
        case 'l':
        case 'r':
          scaleX = Math.abs(hvx0) > eps ? hvx / hvx0 : 1;
          scaleY = 1;
          break;
      }
    }

    // Aspect ratio lock (Shift)
    if (modifiers?.shiftKey) {
      const magX = Math.abs(scaleX);
      const magY = Math.abs(scaleY);
      const s = Math.max(magX, magY);
      const signX = Math.sign(scaleX || 1);
      const signY = Math.sign(scaleY || 1);
      scaleX = s * signX;
      scaleY = s * signY;
    }

    // Clamp to avoid collapse; allow mirroring option
    const minS = 0.05;
    const clampAxis = (s: number) => {
      if (!isFinite(s) || Math.abs(s) < minS) {
        const sign = Math.sign(s || 1);
        return this.allowMirroring ? minS * sign : minS;
      }
      return this.allowMirroring ? s : Math.max(minS, Math.abs(s));
    };
    scaleX = clampAxis(scaleX);
    scaleY = clampAxis(scaleY);

    // Scale snapping (Ctrl/Cmd)
    if (modifiers?.ctrlKey && this.scaleSnapStep > 0) {
      const snap = (s: number) => {
        const sign = Math.sign(s || 1);
        const mag = Math.round(Math.abs(s) / this.scaleSnapStep) * this.scaleSnapStep;
        return sign * Math.max(this.scaleSnapStep, mag);
      };
      if (modifiers?.shiftKey) {
        // With aspect lock, snap magnitude uniformly
        const signX = Math.sign(scaleX || 1);
        const signY = Math.sign(scaleY || 1);
        const mag = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        const snappedMag = Math.round(mag / this.scaleSnapStep) * this.scaleSnapStep;
        scaleX = signX * snappedMag;
        scaleY = signY * snappedMag;
      } else {
        scaleX = snap(scaleX);
        scaleY = snap(scaleY);
      }
    }

    // Enforce canvas bounds if provided
    if (this.getCanvasBounds) {
      const canvas = this.getCanvasBounds();
      const bounds = this.selectionGroup!.bounds; // latest bounds
      const constrained = this.clampScaleToCanvas(bounds, this.anchorLocal, canvas, scaleX, scaleY, !!modifiers?.shiftKey);
      scaleX = constrained.scaleX;
      scaleY = constrained.scaleY;
    }

    this.objects.forEach((o) => {
      if (o.obj.scale) {
        o.obj.scale.set(o.startScale.x * scaleX, o.startScale.y * scaleY);
        // Keep pivot aligned to the world anchor
        const posInParent = o.obj.parent?.toLocal(this.anchorGlobal, undefined, undefined, false) ?? { x: 0, y: 0 };
        o.obj.position.set(posInParent.x, posInParent.y);
      }
    });
  }

  private computeAnchorLocalFromHandle(useCenter: boolean = false): Point {
    const a = new Point(0, 0);
    if (!this.selectionGroup || !this.activeHandle) return a;

    if (useCenter) {
      // Prefer true object center for single-object selection
      if (this.selectionGroup.objects.length === 1) {
        try {
          const obj = this.selectionGroup.objects[0];
          const lb = obj.getLocalBounds();
          const localCenter = new Point(lb.x + lb.width * 0.5, lb.y + lb.height * 0.5);
          const world = obj.toGlobal(localCenter);
          return this.container!.toLocal(world);
        } catch {}
      }
      const b = this.selectionGroup.bounds;
      a.set(b.x + b.width * 0.5, b.y + b.height * 0.5);
      return a;
    }

    const h = this.activeHandle;
    // Use rotated handle geometry if indices and centers are available
    if (typeof h.index === 'number' && h.center) {
      let opposite: TransformHandle | undefined;
      if (h.type === 'corner') {
        const oppIndex = (h.index + 2) % 4;
        opposite = this.selectionGroup.transformHandles.find(th => th.type === 'corner' && th.index === oppIndex);
      } else if (h.type === 'edge') {
        const oppIndex = (h.index + 2) % 4;
        opposite = this.selectionGroup.transformHandles.find(th => th.type === 'edge' && th.index === oppIndex);
      }
      if (opposite?.center) {
        return new Point(opposite.center.x, opposite.center.y);
      }
    }

    // Fallback to axis-aligned opposite using bounds
    const b = this.selectionGroup.bounds;
    switch (h.type) {
      case 'corner':
        switch (h.position) {
          case 'tl': a.set(b.x + b.width, b.y + b.height); break;
          case 'tr': a.set(b.x, b.y + b.height); break;
          case 'bl': a.set(b.x + b.width, b.y); break;
          case 'br': a.set(b.x, b.y); break;
        }
        break;
      case 'edge':
        switch (h.position) {
          case 't': a.set(b.x + b.width * 0.5, b.y + b.height); break;
          case 'b': a.set(b.x + b.width * 0.5, b.y); break;
          case 'l': a.set(b.x + b.width, b.y + b.height * 0.5); break;
          case 'r': a.set(b.x, b.y + b.height * 0.5); break;
        }
        break;
      case 'rotation':
        a.set(b.x + b.width * 0.5, b.y + b.height * 0.5);
        break;
    }
    return a;
  }

  private clampScaleToCanvas(
    bounds: Rectangle,
    anchor: Point,
    canvas: CanvasBounds,
    scaleX: number,
    scaleY: number,
    lockAspect: boolean,
  ): { scaleX: number; scaleY: number } {
    const leftOffset = bounds.x - anchor.x;
    const rightOffset = bounds.x + bounds.width - anchor.x;
    const topOffset = bounds.y - anchor.y;
    const bottomOffset = bounds.y + bounds.height - anchor.y;

    const intersect = (a: [number, number], b: [number, number]): [number, number] => {
      const lo = Math.max(a[0], b[0]);
      const hi = Math.min(a[1], b[1]);
      return [lo, hi];
    };

    const intervalForX = (offset: number): [number, number] => {
      if (Math.abs(offset) < 1e-6) return [-Infinity, Infinity];
      const v1 = (canvas.left - anchor.x) / offset;
      const v2 = (canvas.right - anchor.x) / offset;
      return [Math.min(v1, v2), Math.max(v1, v2)];
    };
    const intervalForY = (offset: number): [number, number] => {
      if (Math.abs(offset) < 1e-6) return [-Infinity, Infinity];
      const v1 = (canvas.top - anchor.y) / offset;
      const v2 = (canvas.bottom - anchor.y) / offset;
      return [Math.min(v1, v2), Math.max(v1, v2)];
    };

    let xRange: [number, number] = [-Infinity, Infinity];
    xRange = intersect(xRange, intervalForX(leftOffset));
    xRange = intersect(xRange, intervalForX(rightOffset));
    let yRange: [number, number] = [-Infinity, Infinity];
    yRange = intersect(yRange, intervalForY(topOffset));
    yRange = intersect(yRange, intervalForY(bottomOffset));

    const clamp = (v: number, r: [number, number]) => Math.min(Math.max(v, r[0]), r[1]);

    if (!lockAspect) {
      return { scaleX: clamp(scaleX, xRange), scaleY: clamp(scaleY, yRange) };
    }

    const signX = Math.sign(scaleX || 1);
    const signY = Math.sign(scaleY || 1);
    const magX = clamp(Math.abs(scaleX), [Math.max(0, xRange[0] * signX), Math.max(0, xRange[1] * signX)]);
    const magY = clamp(Math.abs(scaleY), [Math.max(0, yRange[0] * signY), Math.max(0, yRange[1] * signY)]);
    const s = Math.min(magX, magY);
    return { scaleX: s * signX, scaleY: s * signY };
  }

  private cleanup(): void {
    this.objects = [];
    this.activeHandle = null;
    this.selectionGroup = null;
    this.container = null;
  }

  private cleanupEphemeral(): void {
    // no-op placeholder for future cleanup
  }
}
