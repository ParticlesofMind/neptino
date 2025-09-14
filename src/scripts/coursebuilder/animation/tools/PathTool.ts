/**
 * PathTool
 * Define movement trajectories for objects by dragging within a scene
 */

import { Container, FederatedPointerEvent, Graphics, Point, Rectangle } from 'pixi.js';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState, PathSpeed } from '../AnimationState';

function durationFor(speed: PathSpeed): number {
  switch (speed) {
    case 'fast': return 1700;
    case 'medium': return 3300;
    case 'slow':
    default: return 5000;
  }
}

export class PathTool extends BaseTool {
  private container: Container | null = null;
  private activeObject: any | null = null;
  private pathPoints: Point[] = [];
  private overlay: Graphics | null = null;
  private activeSceneId: string | null = null;
  private drawing: boolean = false;

  constructor() {
    super('path', 'crosshair');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    this.container = container;
    const local = container.toLocal(event.global);

    // Find scene under pointer
    const scene = animationState.findSceneAt(local);
    if (!scene) { return; }
    this.activeSceneId = scene.getId();

    // Find topmost object under pointer (global bounds)
    const globalPt = event.global;
    const dm = animationState.getDisplayManager();
    if (!dm) return;
    const objects = dm.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      try {
        const b = obj.getBounds();
        if (globalPt.x >= b.x && globalPt.x <= b.x + b.width && globalPt.y >= b.y && globalPt.y <= b.y + b.height) {
          this.activeObject = obj;
          break;
        }
      } catch {}
    }
    if (!this.activeObject) return;

    // Begin path capture
    this.pathPoints = [];
    this.drawing = true;
    const clamped = this.clampToScene(local, scene.getBounds());
    this.pathPoints.push(new Point(clamped.x, clamped.y));

    // Overlay line on UI layer
    const ui = animationState.getUiLayer();
    this.overlay = new Graphics();
    this.overlay.lineStyle({ width: 2, color: 0x4a79a4 });
    if (ui) ui.addChild(this.overlay);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.drawing || !this.activeSceneId) return;
    const local = container.toLocal(event.global);
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (!scene) return;
    const p = this.clampToScene(local, scene.getBounds());

    const last = this.pathPoints[this.pathPoints.length - 1];
    // Add point if moved enough to avoid overcrowding
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2) {
      this.pathPoints.push(new Point(p.x, p.y));
      // Draw segment
      if (this.overlay) {
        this.overlay.moveTo(last?.x ?? p.x, last?.y ?? p.y).lineTo(p.x, p.y).stroke({ color: 0x4a79a4, width: 2 });
      }
    }

    // Preview move object to current point
    try { if (this.activeObject) this.activeObject.position.set(p.x, p.y); } catch {}
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    if (!this.isActive) { this.reset(); return; }
    if (this.activeObject && this.activeSceneId && this.pathPoints.length > 1) {
      const speed = animationState.getPathSpeed();
      const durationMs = durationFor(speed);
      const anim = (this.activeObject as any).__animation || { paths: {} };
      anim.paths[this.activeSceneId] = { points: this.pathPoints.map(p => new Point(p.x, p.y)), durationMs };
      (this.activeObject as any).__animation = anim;
    }
    this.reset();
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
    if (this.overlay) { try { this.overlay.destroy(); } catch {} }
    this.overlay = null;
  }

  onActivate(): void { super.onActivate(); }
  onDeactivate(): void { super.onDeactivate(); this.reset(); }
}

