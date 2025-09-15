/**
 * PathTool
 * Define movement trajectories for objects by dragging within a scene
 */

import { Container, FederatedPointerEvent, Graphics, Point, Rectangle } from 'pixi.js';
import { snapManager } from '../../tools/SnapManager';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState, PathSpeed } from '../AnimationState';
import { pathOverlay } from '../PathOverlay';

function durationFor(speed: PathSpeed): number {
  switch (speed) {
    case 'fast': return 2500;    // accelerated
    case 'medium': return 5000;  // baseline
    case 'slow':
    default: return 8000;        // extended
  }
}

export class PathTool extends BaseTool {
  private activeObject: any | null = null;
  private pathPoints: Point[] = [];
  private overlay: Graphics | null = null;
  private activeSceneId: string | null = null;
  private drawing: boolean = false;
  private dragOffsetDrawing: Point | null = null; // pointer-to-object offset in drawing coords
  private editingIndex: number = -1;
  private isEditing: boolean = false;
  private lastPointerLocal: Point | null = null;
  private lastClickTime: number = 0;
  private lastClickPos: Point = new Point(0, 0);
  private overlayRoot: Container | null = null;
  private overlayPath: Graphics | null = null;
  private overlayHandles: Container | null = null;
  private draggingHandle: boolean = false;
  private editingHandleType: 'anchor' | 'in' | 'out' | null = null;
  private spacePressed: boolean = false;

  constructor() {
    // Use a move cursor to indicate draggable behavior in path mode
    super('path', 'move');
    // Track Space key for whole-path translate
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space') { this.spacePressed = true; }
    });
    document.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space') { this.spacePressed = false; }
    });
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    const local = container.toLocal(event.global);

    // Find scene under pointer
    const scene = animationState.findSceneAt(local);
    if (!scene) { return; }
    this.activeSceneId = scene.getId();

    // Pick topmost object under pointer (deep hit test within drawing layer)
    const globalPt = event.global;
    const dm = animationState.getDisplayManager();
    if (!dm) return;
    const root = dm.getRoot();
    if (!root) return;
    // If clicking on an overlay handle, capture that first
    const target: any = (event as any).target || null;
    if (target && typeof target.__pathHandleIndex === 'number') {
      this.activeSceneId = (this.activeSceneId || animationState.findSceneAt(local)?.getId() || null);
      this.editingIndex = target.__pathHandleIndex;
      this.isEditing = true;
      this.draggingHandle = true;
      this.editingHandleType = target.__pathHandleType || 'anchor';
      this.ensureOverlay();
      return;
    }

    this.activeObject = this.pickTopmostObjectAt(globalPt, root);
    if (!this.activeObject) return;
    // If clicking near an existing anchor, double-click to split, or alt-click to insert, enter edit mode
    const existing = (this.activeObject as any).__animation?.paths?.[this.activeSceneId];
    if (existing && Array.isArray(existing.points) && existing.points.length >= 2) {
      const localPt = container.toLocal(event.global);
      const alt = !!((event as any).altKey);
      const now = Date.now();
      const isDouble = (now - this.lastClickTime < 300) && (Math.hypot(localPt.x - this.lastClickPos.x, localPt.y - this.lastClickPos.y) < 6);
      this.pathPoints = (existing.points as Point[]).map(p => new Point(p.x, p.y));

      if (alt) {
        // Insert a new anchor into the nearest segment at click position
        const ins = this.projectPointToPolyline(new Point(localPt.x, localPt.y), this.pathPoints);
        if (ins && ins.index >= 0) {
          this.pathPoints.splice(ins.index + 1, 0, new Point(ins.point.x, ins.point.y));
          this.editingIndex = ins.index + 1;
          this.isEditing = true;
          this.drawing = false;
          this.ensureOverlay();
          const anim = (this.activeObject as any).__animation;
          const handles = anim?.paths?.[this.activeSceneId!]?.handles || null;
          this.redrawOverlay(this.pathPoints, handles as any);
          return;
        }
      } else if (isDouble) {
        const ins = this.projectPointToPolyline(new Point(localPt.x, localPt.y), this.pathPoints);
        if (ins && ins.index >= 0) {
          this.pathPoints.splice(ins.index + 1, 0, new Point(ins.point.x, ins.point.y));
          this.editingIndex = ins.index + 1;
          this.isEditing = true;
          this.drawing = false;
          this.ensureOverlay();
          const anim = (this.activeObject as any).__animation;
          const handles = anim?.paths?.[this.activeSceneId!]?.handles || null;
          this.redrawOverlay(this.pathPoints, handles as any);
          this.lastClickTime = now; this.lastClickPos = new Point(localPt.x, localPt.y);
          return;
        }
      } else {
        const nearIdx = this.findNearestAnchorIndex(localPt, this.pathPoints, 8);
        if (nearIdx >= 0) {
          this.editingIndex = nearIdx;
          this.isEditing = true;
          this.drawing = false;
          this.ensureOverlay();
          const anim = (this.activeObject as any).__animation;
          const handles = anim?.paths?.[this.activeSceneId!]?.handles || null;
          this.redrawOverlay(this.pathPoints, handles as any);
          return; // stay in edit mode
        }
      }
    }

    // Compute drag offset so the same point stays under the cursor
    try {
      const parent = (this.activeObject as any).parent as any;
      const objWorld = parent.toGlobal((this.activeObject as any).position);
      const objInDrawing = root.toLocal(objWorld);
      const pointerDrawing = local; // local is already drawing-layer local coords
      this.dragOffsetDrawing = new Point(pointerDrawing.x - objInDrawing.x, pointerDrawing.y - objInDrawing.y);
    } catch {
      this.dragOffsetDrawing = new Point(0, 0);
    }

    // Begin path capture
    this.pathPoints = [];
    this.drawing = true;
    const desiredX = local.x - (this.dragOffsetDrawing?.x || 0);
    const desiredY = local.y - (this.dragOffsetDrawing?.y || 0);
    const b = scene.getBounds();
    const startX = Math.max(b.x, Math.min(b.x + b.width, desiredX));
    const startY = Math.max(b.y, Math.min(b.y + b.height, desiredY));
    this.pathPoints.push(new Point(startX, startY));

    // Overlay line on UI layer
    this.ensureOverlay();
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.activeSceneId) return;
    const local = container.toLocal(event.global);
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (!scene) return;
    // Snap pointer in drawing space before clamping, then clamp to scene
    let snapped = snapManager.snapPoint(new Point(local.x, local.y));
    const p = this.clampToScene(snapped, scene.getBounds());
    this.lastPointerLocal = new Point(local.x, local.y);

    // Editing an existing anchor
    if (this.editingIndex >= 0) {
      // If Shift is held, translate the entire path by delta
      const whole = !!((event as any).ctrlKey || (event as any).metaKey || this.spacePressed);
      if (whole) {
        const prev = this.pathPoints[this.editingIndex].clone();
        // Compute desired delta in drawing coords
        let dx = p.x - prev.x;
        let dy = p.y - prev.y;
        // Constrain delta so no point leaves the scene
        const b = scene.getBounds();
        let minDx = Number.NEGATIVE_INFINITY, maxDx = Number.POSITIVE_INFINITY;
        let minDy = Number.NEGATIVE_INFINITY, maxDy = Number.POSITIVE_INFINITY;
        for (const pt of this.pathPoints) {
          minDx = Math.max(minDx, b.x - pt.x);
          maxDx = Math.min(maxDx, (b.x + b.width) - pt.x);
          minDy = Math.max(minDy, b.y - pt.y);
          maxDy = Math.min(maxDy, (b.y + b.height) - pt.y);
        }
        dx = Math.max(minDx, Math.min(maxDx, dx));
        dy = Math.max(minDy, Math.min(maxDy, dy));
        for (const pt of this.pathPoints) { pt.x += dx; pt.y += dy; }
        this.redrawOverlay(this.pathPoints);
        return;
      }

      // Snap position for edit
      const sp = snapManager.snapPoint(new Point(p.x, p.y));
      const qx = Math.max(scene.getBounds().x, Math.min(scene.getBounds().x + scene.getBounds().width, sp.x));
      const qy = Math.max(scene.getBounds().y, Math.min(scene.getBounds().y + scene.getBounds().height, sp.y));
      const i = this.editingIndex;
      if (this.editingHandleType === 'in' || this.editingHandleType === 'out') {
        const anim = (this.activeObject as any).__animation || { paths: {} };
        const data = anim.paths[this.activeSceneId!] || {};
        let handles = Array.isArray((data as any).handles) ? (data as any).handles : new Array(this.pathPoints.length).fill(null).map(() => ({ in: null, out: null }));
        const anchor = this.pathPoints[i];
        const alt = !!((event as any).altKey);
        handles[i] = handles[i] || { in: null, out: null } as any;
        if (this.editingHandleType === 'out') {
          (handles[i] as any).out = new Point(qx, qy);
          if (!alt) {
            const dx = ((handles[i] as any).out.x - anchor.x);
            const dy = ((handles[i] as any).out.y - anchor.y);
            (handles[i] as any).in = new Point(anchor.x - dx, anchor.y - dy);
          }
        } else {
          (handles[i] as any).in = new Point(qx, qy);
          if (!alt) {
            const dx = ((handles[i] as any).in.x - anchor.x);
            const dy = ((handles[i] as any).in.y - anchor.y);
            (handles[i] as any).out = new Point(anchor.x - dx, anchor.y - dy);
          }
        }
        (this.activeObject as any).__animation.paths[this.activeSceneId!].handles = handles;
        this.redrawOverlay(this.pathPoints, handles as any);
      } else {
        if (i >= 0 && i < this.pathPoints.length) {
          this.pathPoints[i].x = qx;
          this.pathPoints[i].y = qy;
          const hs = ((this.activeObject as any).__animation?.paths?.[this.activeSceneId!]?.handles) || null;
          this.redrawOverlay(this.pathPoints, hs as any);
        }
      }
      return;
    }
    const sLocal = snapManager.snapPoint(new Point(local.x, local.y));
    const desiredX = sLocal.x - (this.dragOffsetDrawing?.x || 0);
    const desiredY = sLocal.y - (this.dragOffsetDrawing?.y || 0);
    const qx = Math.max(scene.getBounds().x, Math.min(scene.getBounds().x + scene.getBounds().width, desiredX));
    const qy = Math.max(scene.getBounds().y, Math.min(scene.getBounds().y + scene.getBounds().height, desiredY));

    const last = this.pathPoints[this.pathPoints.length - 1];
    // Add point if moved enough to avoid overcrowding
    if (!last || Math.hypot(qx - last.x, qy - last.y) > 5) {
      this.pathPoints.push(new Point(qx, qy));
      this.redrawOverlay(this.pathPoints);
    }

    // Preview move object to current point (respect parent transform)
    try {
      if (this.activeObject) {
        const dm = animationState.getDisplayManager();
        const parent = (this.activeObject as any).parent as any;
        const root = dm?.getRoot();
        if (parent && root && typeof parent.toLocal === 'function') {
          const desired = parent.toLocal(new Point(qx, qy), root);
          this.activeObject.position.set(desired.x, desired.y);
        } else {
          this.activeObject.position.set(qx, qy);
        }
      }
    } catch {}
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    if (!this.isActive) { this.reset(); return; }
    if (this.activeObject && this.activeSceneId) {
      // Ensure the final pointer location is captured as the last point
      try {
        if (this.editingIndex < 0) {
          const dm = animationState.getDisplayManager();
          const root = dm?.getRoot();
          const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId!)!;
          if (root && scene) {
            const container = root; // drawing layer
            const endLocal = container.toLocal((_event as any).global);
            const desiredX = endLocal.x - (this.dragOffsetDrawing?.x || 0);
            const desiredY = endLocal.y - (this.dragOffsetDrawing?.y || 0);
            const qx = Math.max(scene.getBounds().x, Math.min(scene.getBounds().x + scene.getBounds().width, desiredX));
            const qy = Math.max(scene.getBounds().y, Math.min(scene.getBounds().y + scene.getBounds().height, desiredY));
            const last = this.pathPoints[this.pathPoints.length - 1];
            if (!last || Math.hypot(qx - last.x, qy - last.y) > 0.1) {
              this.pathPoints.push(new Point(qx, qy));
            }
          }
        }
      } catch {}

      if (this.pathPoints.length > 1) {
        // Simplify only when recording new path; preserve anchors when editing
        const simplified = this.isEditing ? this.pathPoints : this.simplifyPath(this.pathPoints, 3);
        const speed = animationState.getPathSpeed();
        const durationMs = durationFor(speed);
        const ease = (animationState as any).getDefaultPathEase?.() || 'linear';
        const anim = (this.activeObject as any).__animation || { paths: {} };
        const segments = new Array(Math.max(0, simplified.length - 1)).fill(1);
        anim.paths[this.activeSceneId] = { points: simplified.map(p => new Point(p.x, p.y)), durationMs, ease, segments, curve: (anim.paths[this.activeSceneId]?.curve || 'linear') } as any;
        (this.activeObject as any).__animation = anim;
        // Auto-play the scene immediately after path commit
        try { const sc = animationState.getScenes().find(s => s.getId() === this.activeSceneId); (sc as any)?.reset?.(); sc?.play(); } catch {}
        try { pathOverlay.refresh(); } catch {}
      }
    }
    this.reset();
    // Track double-click
    try {
      const dm = animationState.getDisplayManager();
      const root = dm?.getRoot();
      if (root) {
        const localPt = root.toLocal((_event as any).global);
        this.lastClickTime = Date.now();
        this.lastClickPos = new Point(localPt.x, localPt.y);
      }
    } catch {}
  }

  private clampToScene(p: Point, b: Rectangle | { x: number; y: number; width: number; height: number }): Point {
    const x = Math.max(b.x, Math.min(b.x + b.width, p.x));
    const y = Math.max(b.y, Math.min(b.y + b.height, p.y));
    return new Point(x, y);
  }

  private reset(): void {
    this.drawing = false;
    this.activeObject = null;
    this.activeSceneId = null;
    this.pathPoints = [];
    if (this.overlayRoot) { try { this.overlayRoot.destroy({ children: true }); } catch {} }
    this.overlayRoot = null;
    this.overlayPath = null;
    this.overlayHandles = null;
    this.dragOffsetDrawing = null;
    this.editingIndex = -1;
    this.isEditing = false;
    this.draggingHandle = false;
    this.editingHandleType = null;
  }

  onActivate(): void { super.onActivate(); }
  onDeactivate(): void { super.onDeactivate(); this.reset(); }

  private pickTopmostObjectAt(ptGlobal: Point, root: Container): any | null {
    const hit = (container: Container): any | null => {
      // Iterate children from topmost to back
      for (let i = container.children.length - 1; i >= 0; i--) {
        const child: any = container.children[i];
        // Recurse into children first to respect rendering order
        if (child.children && child.children.length) {
          const r = hit(child);
          if (r) return r;
        }
        try {
          if (!child.visible || child.worldAlpha === 0) continue;
          // Skip scene roots when drawing paths for objects
          if ((child as any).__sceneRef) continue;
          const b = child.getBounds();
          if (ptGlobal.x >= b.x && ptGlobal.x <= b.x + b.width && ptGlobal.y >= b.y && ptGlobal.y <= b.y + b.height) {
            return child;
          }
        } catch {}
      }
      return null;
    };
    return hit(root);
  }

  private findNearestAnchorIndex(p: Point, pts: Point[], radius: number): number {
    for (let i = 0; i < pts.length; i++) {
      if (Math.hypot(p.x - pts[i].x, p.y - pts[i].y) <= radius) return i;
    }
    return -1;
  }

  private ensureOverlay(): void {
    const ui = animationState.getUiLayer();
    if (!ui) return;
    if (!this.overlayRoot) {
      this.overlayRoot = new Container();
      this.overlayRoot.name = 'PathToolOverlay';
      (this.overlayRoot as any).zIndex = 9999;
      ui.addChild(this.overlayRoot);
      this.overlayPath = new Graphics();
      this.overlayHandles = new Container();
      this.overlayRoot.addChild(this.overlayPath!, this.overlayHandles!);
    }
  }

  private redrawOverlay(pts: Point[]): void {
    this.ensureOverlay();
    if (!this.overlayRoot || !this.overlayPath || !this.overlayHandles) return;
    this.overlayPath.clear();
    if (!pts.length) return;
    this.overlayPath.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      this.overlayPath.lineTo(pts[i].x, pts[i].y);
    }
    this.overlayPath.stroke({ color: 0x4a79a4, width: 2 });

    // Rebuild handles
    this.overlayHandles.removeChildren().forEach(c => (c as any).destroy?.());
    for (let i = 0; i < pts.length; i++) {
      const h = new Graphics();
      h.circle(pts[i].x, pts[i].y, 5).fill({ color: 0xffffff, alpha: 1 }).stroke({ color: 0x4a79a4, width: 2 });
      (h as any).__pathHandleIndex = i;
      (h as any).__pathHandleType = 'anchor';
      (h as any).eventMode = 'static';
      (h as any).cursor = 'pointer';
      this.overlayHandles.addChild(h);
      if (handles && handles[i]) {
        const set: any = handles[i];
        if (set.in) {
          const line = new Graphics();
          line.moveTo(pts[i].x, pts[i].y).lineTo(set.in.x, set.in.y).stroke({ color: 0x8fbbe2, width: 1 });
          this.overlayHandles.addChild(line);
          const hi = new Graphics();
          hi.rect(set.in.x - 3, set.in.y - 3, 6, 6).fill({ color: 0xffffff }).stroke({ color: 0x8fbbe2, width: 1 });
          (hi as any).__pathHandleIndex = i;
          (hi as any).__pathHandleType = 'in';
          (hi as any).eventMode = 'static';
          (hi as any).cursor = 'nwse-resize';
          this.overlayHandles.addChild(hi);
        }
        if (set.out) {
          const line = new Graphics();
          line.moveTo(pts[i].x, pts[i].y).lineTo(set.out.x, set.out.y).stroke({ color: 0x8fbbe2, width: 1 });
          this.overlayHandles.addChild(line);
          const ho = new Graphics();
          ho.rect(set.out.x - 3, set.out.y - 3, 6, 6).fill({ color: 0xffffff }).stroke({ color: 0x8fbbe2, width: 1 });
          (ho as any).__pathHandleIndex = i;
          (ho as any).__pathHandleType = 'out';
          (ho as any).eventMode = 'static';
          (ho as any).cursor = 'nwse-resize';
          this.overlayHandles.addChild(ho);
        }
      }
    }
  }

  // Ramer–Douglas–Peucker simplification
  private simplifyPath(pts: Point[], epsilon: number): Point[] {
    if (pts.length <= 2) return pts.slice();
    const dmaxInfo = this.findMaxDistance(pts);
    if (dmaxInfo.dist > epsilon) {
      const rec1 = this.simplifyPath(pts.slice(0, dmaxInfo.index + 1), epsilon);
      const rec2 = this.simplifyPath(pts.slice(dmaxInfo.index), epsilon);
      return rec1.slice(0, -1).concat(rec2);
    } else {
      return [pts[0], pts[pts.length - 1]];
    }
  }
  private findMaxDistance(pts: Point[]): { index: number; dist: number } {
    let index = 0;
    let dist = 0;
    const a = pts[0], b = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = this.perpDistance(pts[i], a, b);
      if (d > dist) { dist = d; index = i; }
    }
    return { index, dist };
  }
  private perpDistance(p: Point, a: Point, b: Point): number {
    const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    const den = Math.hypot(b.y - a.y, b.x - a.x) || 1;
    return num / den;
  }

  private projectPointToPolyline(p: Point, pts: Point[]): { index: number; point: Point } | null {
    if (pts.length < 2) return null;
    let best = { index: -1, dist: Number.POSITIVE_INFINITY, point: new Point(pts[0].x, pts[0].y) };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const proj = this.projectPointToSegment(p, a, b);
      const d = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (d < best.dist) {
        best = { index: i, dist: d, point: proj };
      }
    }
    return best.index >= 0 ? { index: best.index, point: best.point } : null;
  }

  private projectPointToSegment(p: Point, a: Point, b: Point): Point {
    const abx = b.x - a.x, aby = b.y - a.y;
    const apx = p.x - a.x, apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby || 1;
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    return new Point(a.x + abx * t, a.y + aby * t);
  }

  // Keyboard: delete selected anchor while editing
  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;
    const key = event.key;
    if (key !== 'Backspace' && key !== 'Delete') return;
    if (!this.isEditing || this.editingIndex < 0) return;
    if (this.pathPoints.length <= 2) {
      // Removing to less than 2 points deletes the path entirely
      if (this.activeObject && this.activeSceneId) {
        const anim = (this.activeObject as any).__animation;
        if (anim && anim.paths && anim.paths[this.activeSceneId]) {
          delete anim.paths[this.activeSceneId];
          try { pathOverlay.refresh(); } catch {}
        }
      }
      this.reset();
      event.preventDefault();
      return;
    }
    // Remove the selected anchor
    this.pathPoints.splice(this.editingIndex, 1);
    // Clamp selection to a neighbor if exists
    this.editingIndex = Math.min(this.editingIndex, this.pathPoints.length - 1);
    this.redrawOverlay(this.pathPoints);
    // Persist immediately
    if (this.activeObject && this.activeSceneId) {
      const anim = (this.activeObject as any).__animation || { paths: {} };
      const existing = anim.paths[this.activeSceneId] || {};
      const durationMs = existing.durationMs || 5000;
      const ease = existing.ease || 'linear';
      anim.paths[this.activeSceneId] = { points: this.pathPoints.map(p => new Point(p.x, p.y)), durationMs, ease } as any;
      (this.activeObject as any).__animation = anim;
      try { pathOverlay.refresh(); } catch {}
    }
    event.preventDefault();
  }

  // Accept tool settings from UI (insert/delete anchors, before/after, normalize timing, curve, weight adjust)
  public override updateSettings(settings: any): void {
    super.updateSettings(settings);
    if (!settings) return;
    const action = settings.anchorAction as (undefined | 'insert' | 'delete' | 'insertBefore' | 'insertAfter');
    const timing = settings.timingAction as (undefined | 'normalize');
    const curve = settings.curve as (undefined | 'linear' | 'bezier');
    const weightDelta = settings.anchorWeightDelta as (undefined | number);
    const segEase = settings.segEasing as (undefined | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut');
    if (!action && !timing && !curve && typeof weightDelta !== 'number' && !segEase) return;
    if (!this.activeSceneId || !this.activeObject) return;
    const dm = animationState.getDisplayManager();
    const root = dm?.getRoot();
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    const anim = (this.activeObject as any).__animation || { paths: {} };
    const existing = anim.paths[this.activeSceneId];
    if (!existing || !Array.isArray(existing.points) || existing.points.length < 2 || !root || !scene) return;

    // Curve toggle
    if (curve === 'linear' || curve === 'bezier') {
      anim.paths[this.activeSceneId] = { ...existing, curve } as any;
      (this.activeObject as any).__animation = anim;
      try { pathOverlay.refresh(); } catch {}
      return;
    }

    // Anchor speed adjust via segment weights
    if (typeof weightDelta === 'number') {
      const segs: number[] = Array.isArray((existing as any).segments) && (existing as any).segments.length === this.pathPoints.length - 1
        ? ([...(existing as any).segments] as number[])
        : new Array(Math.max(0, this.pathPoints.length - 1)).fill(1);
      const i = this.editingIndex;
      if (i >= 0) {
        const factor = weightDelta > 0 ? 1.25 : 0.8; // slower=factor>1, faster=factor<1
        if (i > 0) segs[i - 1] = Math.max(0.1, Math.min(10, segs[i - 1] * factor));
        if (i < segs.length) segs[i] = Math.max(0.1, Math.min(10, segs[i] * factor));
        anim.paths[this.activeSceneId] = { ...existing, segments: segs } as any;
        (this.activeObject as any).__animation = anim;
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }

    // Working copy
    this.pathPoints = (existing.points as Point[]).map(p => new Point(p.x, p.y));

    if (timing === 'normalize') {
      if (this.pathPoints.length >= 3) {
        const resampled = this.resampleEqualDistance(this.pathPoints, this.pathPoints.length);
        anim.paths[this.activeSceneId] = { ...existing, points: resampled.map(p => new Point(p.x, p.y)) } as any;
        (this.activeObject as any).__animation = anim;
        this.pathPoints = resampled;
        this.ensureOverlay();
        this.redrawOverlay(this.pathPoints);
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }

    if (action === 'insert') {
      const lp = this.lastPointerLocal || new Point(scene.getBounds().x + scene.getBounds().width / 2, scene.getBounds().y + scene.getBounds().height / 2);
      const ins = this.projectPointToPolyline(lp, this.pathPoints);
      if (ins && ins.index >= 0) {
        this.pathPoints.splice(ins.index + 1, 0, new Point(ins.point.x, ins.point.y));
        this.editingIndex = ins.index + 1;
        this.isEditing = true;
        anim.paths[this.activeSceneId] = { ...existing, points: this.pathPoints.map(p => new Point(p.x, p.y)) } as any;
        (this.activeObject as any).__animation = anim;
        this.ensureOverlay();
        this.redrawOverlay(this.pathPoints);
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }

    if (action === 'insertBefore' || action === 'insertAfter') {
      if (this.editingIndex >= 0) {
        const i = this.editingIndex;
        if (action === 'insertBefore' && i > 0) {
          const a = this.pathPoints[i - 1], b = this.pathPoints[i];
          const mid = new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
          this.pathPoints.splice(i, 0, mid);
          this.editingIndex = i;
        } else if (action === 'insertAfter' && i < this.pathPoints.length - 1) {
          const a = this.pathPoints[i], b = this.pathPoints[i + 1];
          const mid = new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
          this.pathPoints.splice(i + 1, 0, mid);
          this.editingIndex = i + 1;
        }
        anim.paths[this.activeSceneId] = { ...existing, points: this.pathPoints.map(p => new Point(p.x, p.y)) } as any;
        (this.activeObject as any).__animation = anim;
        this.ensureOverlay();
        this.redrawOverlay(this.pathPoints);
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }

    if (action === 'delete') {
      if (this.editingIndex >= 0 && this.pathPoints.length > 2) {
        this.pathPoints.splice(this.editingIndex, 1);
        this.editingIndex = Math.min(this.editingIndex, this.pathPoints.length - 1);
        anim.paths[this.activeSceneId] = { ...existing, points: this.pathPoints.map(p => new Point(p.x, p.y)) } as any;
        (this.activeObject as any).__animation = anim;
        this.ensureOverlay();
        this.redrawOverlay(this.pathPoints);
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }

    if (segEase) {
      const total = Math.max(0, this.pathPoints.length - 1);
      if (total > 0) {
        const arr = Array.isArray((existing as any).easings) && (existing as any).easings.length === total
          ? ([...(existing as any).easings] as string[])
          : new Array(total).fill('linear');
        let idx = this.editingIndex;
        if (idx >= total) idx = total - 1;
        if (idx < 0) idx = 0;
        arr[idx] = segEase;
        anim.paths[this.activeSceneId] = { ...existing, easings: arr } as any;
        (this.activeObject as any).__animation = anim;
        try { pathOverlay.refresh(); } catch {}
      }
      return;
    }
  }

  private resampleEqualDistance(pts: Point[], count: number): Point[] {
    if (pts.length < 2 || count < 2) return pts.slice();
    const lengths: number[] = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lengths.push(total);
    }
    const out: Point[] = [];
    for (let k = 0; k < count; k++) {
      const t = (total * k) / (count - 1);
      let j = 1;
      while (j < lengths.length && lengths[j] < t) j++;
      if (j >= lengths.length) { out.push(new Point(pts[pts.length - 1].x, pts[pts.length - 1].y)); continue; }
      const t0 = lengths[j - 1], t1 = lengths[j];
      const u = (t1 - t0) > 0 ? (t - t0) / (t1 - t0) : 0;
      const a = pts[j - 1], b = pts[j];
      out.push(new Point(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u));
    }
    return out;
  }
}
