import { Container, Point, Rectangle } from 'pixi.js';
import { SelectionGroup, TransformHandle } from './types';

type PerObjectState = {
  obj: any;
  startPosition: { x: number; y: number };
  startScale: { x: number; y: number };
  startRotation: number;
  startPivot: { x: number; y: number };
  localAnchor: Point; // anchor in the object's local space
  isTextObject?: boolean;
  startTextBounds?: { x: number; y: number; width: number; height: number };
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
  private restorePivotOnEnd = true;
  private rotationSnapRad = 0; // radians; 0 disables snapping

  public isActive(): boolean {
    return !!this.activeHandle;
  }

  public begin(
    selectedObjects: any[],
    selectionGroup: SelectionGroup,
    container: Container,
    handle: TransformHandle,
    pointerLocal: Point,
    options?: {
      restorePivotOnEnd?: boolean;
      rotationSnapDeg?: number;
      modifiers?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean };
    }
  ): void {
    this.cleanup();
    this.container = container;
    this.selectionGroup = selectionGroup;
    this.activeHandle = handle;
    this.pointerStartLocal.set(pointerLocal.x, pointerLocal.y);
    this.restorePivotOnEnd = options?.restorePivotOnEnd ?? true;
    this.rotationSnapRad = (options?.rotationSnapDeg || 0) * Math.PI / 180;

    // Compute anchor from selection bounds and handle position
    const useCenter = !!options?.modifiers?.altKey;
    this.anchorLocal = this.computeAnchorLocalFromHandle(useCenter);
    this.anchorGlobal = container.toGlobal(this.anchorLocal);

    // Prepare per-object state and temporarily pivot around anchor
    const isRotation = handle.type === 'rotation';
    this.objects = selectedObjects.map((obj) => {
      const state: PerObjectState = {
        obj,
        startPosition: { x: obj.position.x, y: obj.position.y },
        startScale: { x: obj.scale?.x ?? 1, y: obj.scale?.y ?? 1 },
        startRotation: obj.rotation ?? 0,
        startPivot: { x: obj.pivot?.x ?? 0, y: obj.pivot?.y ?? 0 },
        localAnchor: new Point(0, 0),
        isTextObject: !!(obj as any)?.isTextObject,
        startTextBounds: undefined,
      };

      if (isRotation) {
        // For rotation: pivot around each object's own local center
        let lb: Rectangle | null = null;
        try { lb = obj.getLocalBounds(); } catch { /* empty */ }
        const localCenter = lb
          ? new Point(lb.x + lb.width * 0.5, lb.y + lb.height * 0.5)
          : new Point((obj.width ?? 0) * 0.5, (obj.height ?? 0) * 0.5);
        state.localAnchor = localCenter;
        if (obj.pivot) {
          const worldCenter = obj.toGlobal(localCenter);
          obj.pivot.set(localCenter.x, localCenter.y);
          if (obj.parent) {
            const posInParent = obj.parent.toLocal(worldCenter, undefined, undefined, false);
            obj.position.set(posInParent.x, posInParent.y);
          } else {
            console.warn('TransformController.begin(rotation): object has no parent; skipped position realignment to avoid (0,0) jump');
          }
        }
      } else {
        // For scaling/dragging: pivot around the active handle's anchor (selection-based)
        state.localAnchor = obj.toLocal(this.anchorGlobal);
        if (obj.pivot) {
          obj.pivot.set(state.localAnchor.x, state.localAnchor.y);
          if (obj.parent) {
            const posInParent = obj.parent.toLocal(this.anchorGlobal, undefined, undefined, false);
            obj.position.set(posInParent.x, posInParent.y);
          } else {
            console.warn('TransformController.begin(scale/drag): object has no parent; skipped position realignment to avoid (0,0) jump');
          }
        }
      }

      // Capture starting bounds for text objects so we can resize the text area instead of scaling text
      try {
        if ((obj as any)?.isTextObject && (obj as any).__textArea) {
          const ta = (obj as any).__textArea;
          const b = ta.bounds;
          state.startTextBounds = { x: b.x, y: b.y, width: b.width, height: b.height };
        }
      } catch { /* empty */ }

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

    // Apply transforms immediately for smooth real-time feedback
    if (this.activeHandle.type === 'rotation') {
      this.applyRotation(pointerLocal, modifiers);
    } else {
      this.applyScaling(pointerLocal, modifiers);
    }
  }

  public end(): void {
    // If scaling was applied to text objects, convert scale -> text area resize before cleanup
    if (this.activeHandle && this.activeHandle.type !== 'rotation') {
      const anchorGlobal = this.anchorGlobal;
      for (let i = 0; i < this.objects.length; i++) {
        const o = this.objects[i];
        const obj: any = o.obj;
        try {
          if (o.isTextObject && obj.__textArea && o.startTextBounds) {
            const sx = (obj.scale?.x ?? 1) / (o.startScale.x || 1);
            const sy = (obj.scale?.y ?? 1) / (o.startScale.y || 1);
            const newW = Math.max(10, o.startTextBounds.width * Math.abs(sx));
            const newH = Math.max(10, o.startTextBounds.height * Math.abs(sy));
            // Update text area bounds (x/y remain the same in local space)
            obj.__textArea.updateBounds({ x: o.startTextBounds.x, y: o.startTextBounds.y, width: newW, height: newH });
            // Reset scaling back to 1 so text glyphs don't stretch
            if (obj.scale) { obj.scale.set(1, 1); }
            // Keep the anchor fixed in world space
            if (obj.parent && anchorGlobal) {
              const posInParent = obj.parent.toLocal(anchorGlobal, undefined, undefined, false);
              obj.position.set(posInParent.x, posInParent.y);
            }
          }
        } catch { /* empty */ }
      }
    }

    // Avoid restoring pivot after rotation to keep objects visually stable around their centers
    const shouldRestore = this.restorePivotOnEnd && this.activeHandle?.type !== 'rotation';
    if (shouldRestore) {
      this.objects.forEach((o) => {
        try {
          const currentPivotLocal = new Point(o.obj.pivot?.x ?? 0, o.obj.pivot?.y ?? 0);
          const currentPivotWorld = o.obj.toGlobal(currentPivotLocal);
          o.obj.pivot.set(o.startPivot.x, o.startPivot.y);
          if (o.obj.parent) {
            const posInParent = o.obj.parent.toLocal(currentPivotWorld, undefined, undefined, false);
            o.obj.position.set(posInParent.x, posInParent.y);
          } else {
            console.warn('TransformController.end: object has no parent; skipped position realignment to avoid (0,0) jump');
          }
        } catch { /* empty */ }
      });
    }
    // Fully reset controller state so no further updates are applied after mouseup
    this.cleanup();
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

    // Cache anchor position to avoid repeated calculations
    let anchorX = this.anchorLocal.x;
    let anchorY = this.anchorLocal.y;
    
    // If anchor changed due to modifier toggle, retarget pivots
    if (currentAnchorLocal.x !== anchorX || currentAnchorLocal.y !== anchorY) {
      this.anchorLocal.copyFrom(currentAnchorLocal);
      anchorX = this.anchorLocal.x;
      anchorY = this.anchorLocal.y;
      this.anchorGlobal = this.container!.toGlobal(this.anchorLocal);
      
      // Batch update all object pivots
      const anchorGlobal = this.anchorGlobal;
      this.objects.forEach((o) => {
        o.localAnchor = o.obj.toLocal(anchorGlobal);
        const obj = o.obj;
        if (obj.pivot) {
          obj.pivot.set(o.localAnchor.x, o.localAnchor.y);
          if (obj.parent) {
            const posInParent = obj.parent.toLocal(anchorGlobal, undefined, undefined, false);
            obj.position.set(posInParent.x, posInParent.y);
          }
        }
      });
    }

    // Cache all vector calculations upfront
    const startX = this.pointerStartLocal.x;
    const startY = this.pointerStartLocal.y;
    const hvx0 = startX - anchorX;
    const hvy0 = startY - anchorY;
    const hvx = pointerLocal.x - anchorX;
    const hvy = pointerLocal.y - anchorY;

    // Prevent division by zero with cached epsilon
    const eps = 1e-6;
    const absHvx0 = Math.abs(hvx0);
    const absHvy0 = Math.abs(hvy0);
    
    // Calculate scale factors efficiently based on handle type
    const handle = this.activeHandle!;
    let scaleX = 1;
    let scaleY = 1;
    
    if (handle.type === 'corner') {
      scaleX = absHvx0 > eps ? hvx / hvx0 : 1;
      scaleY = absHvy0 > eps ? hvy / hvy0 : 1;
    } else if (handle.type === 'edge') {
      const pos = handle.position;
      if (pos === 't' || pos === 'b') {
        scaleY = absHvy0 > eps ? hvy / hvy0 : 1;
      } else if (pos === 'l' || pos === 'r') {
        scaleX = absHvx0 > eps ? hvx / hvx0 : 1;
      }
    }

    // Apply constraints and modifiers
    const finalScale = this.applyScaleConstraints(scaleX, scaleY, modifiers);
    const finalScaleX = finalScale.scaleX;
    const finalScaleY = finalScale.scaleY;

    // Live-resize behavior for text objects: compute the scaled bounds and
    // immediately normalize scale back to 1 while updating the TextArea size.
    const anchorGlobal = this.anchorGlobal;
    for (let i = 0; i < this.objects.length; i++) {
      const o = this.objects[i];
      const obj: any = o.obj;
      const isText = !!o.isTextObject && !!obj?.__textArea && !!o.startTextBounds;
      if (!isText) continue;
      try {
        // Live-resize: keep local x/y, only update width/height from scale deltas
        const start = o.startTextBounds!;
        const nw = Math.max(10, start.width * Math.abs(finalScaleX));
        const nh = Math.max(10, start.height * Math.abs(finalScaleY));
        // Normalize scale back to 1 and update bounds (local coordinates)
        if (obj.scale) { obj.scale.set(1, 1); }
        obj.__textArea.updateBounds({ x: start.x, y: start.y, width: nw, height: nh });

        // Keep the anchor fixed in world space (defensive realignment)
        if (obj.parent && anchorGlobal) {
          const posInParent = obj.parent.toLocal(anchorGlobal, undefined, undefined, false);
          obj.position.set(posInParent.x, posInParent.y);
        }

        // Ensure scale is kept normalized
        if (obj.scale) { obj.scale.set(1, 1); }
      } catch { /* empty */ }
    }

    // Apply scale to non-text objects only
    for (let i = 0; i < this.objects.length; i++) {
      const o = this.objects[i];
      const obj: any = o.obj;
      const isText = !!o.isTextObject && !!obj?.__textArea && !!o.startTextBounds;
      if (isText) continue;
      const objScale = obj.scale;
      if (objScale) {
        objScale.x = o.startScale.x * finalScaleX;
        objScale.y = o.startScale.y * finalScaleY;
      }
    }
  }

  private applyScaleConstraints(
    scaleX: number, 
    scaleY: number, 
    modifiers?: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean }
  ): { scaleX: number; scaleY: number } {
    // Aspect ratio lock (Shift key only)
    if (modifiers?.shiftKey) {
      const magX = Math.abs(scaleX);
      const magY = Math.abs(scaleY);
      const s = Math.max(magX, magY);
      const signX = Math.sign(scaleX || 1);
      const signY = Math.sign(scaleY || 1);
      scaleX = s * signX;
      scaleY = s * signY;
    }

    // Simple minimum scale to prevent collapse (no snapping/incremental sizing)
    const minS = 0.01;
    if (!isFinite(scaleX) || Math.abs(scaleX) < minS) {
      scaleX = minS * Math.sign(scaleX || 1);
    }
    if (!isFinite(scaleY) || Math.abs(scaleY) < minS) {
      scaleY = minS * Math.sign(scaleY || 1);
    }

    return { scaleX, scaleY };
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
        } catch { /* empty */ }
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

  private cleanup(): void {
    this.objects = [];
    this.activeHandle = null;
    this.selectionGroup = null;
    this.container = null;
  }

}
