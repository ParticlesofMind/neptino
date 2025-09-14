/**
 * SceneTool
 * Draw rectangles to define animation scenes with controls
 */

import { Container, FederatedPointerEvent, Graphics, Point, Rectangle } from 'pixi.js';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState } from '../AnimationState';
import { Scene } from '../Scene';

export class SceneTool extends BaseTool {
  private start: Point | null = null;
  private preview: Graphics | null = null;
  private container: Container | null = null;

  constructor() {
    super('scene', 'crosshair');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    this.container = container;
    const p = container.toLocal(event.global);
    this.start = new Point(p.x, p.y);
    // Create preview rectangle on UI layer for clarity
    const ui = animationState.getUiLayer();
    this.preview = new Graphics();
    this.preview.alpha = 0.8;
    this.preview.lineStyle({ width: 1, color: 0x4a79a4 });
    this.preview.beginFill(0x4a79a4, 0.08);
    if (ui) ui.addChild(this.preview);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start || !this.preview) return;
    const p = container.toLocal(event.global);
    const x = Math.min(this.start.x, p.x);
    const y = Math.min(this.start.y, p.y);
    const w = Math.abs(p.x - this.start.x);
    const h = Math.abs(p.y - this.start.y);
    this.preview.clear();
    this.preview.roundRect(x, y, w, h, 8).stroke({ color: 0x4a79a4, width: 1 }).fill({ color: 0x4a79a4, alpha: 0.08 });
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start) { this.cleanup(); return; }
    const p = container.toLocal(event.global);
    const x = Math.min(this.start.x, p.x);
    const y = Math.min(this.start.y, p.y);
    const w = Math.abs(p.x - this.start.x);
    const h = Math.abs(p.y - this.start.y);
    this.cleanup();
    if (w < 10 || h < 10) return; // ignore tiny scenes
    const scene = new Scene({ x, y, width: w, height: h });
    scene.setLoop(animationState.getLoop());
    animationState.addScene(scene);
  }

  private cleanup(): void {
    this.start = null;
    if (this.preview) { try { this.preview.destroy(); } catch {} }
    this.preview = null;
  }

  onActivate(): void { super.onActivate(); }
  onDeactivate(): void { super.onDeactivate(); this.cleanup(); }
}

