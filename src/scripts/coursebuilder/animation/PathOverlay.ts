/**
 * PathOverlay
 * Draws visible overlays for animation paths in animate mode.
 */

import { Container, Graphics, Point } from 'pixi.js';
import { animationState } from './AnimationState';

export class PathOverlay {
  private root: Container | null = null;
  private installed = false;

  install(): void {
    if (this.installed) return;
    const ui = animationState.getUiLayer();
    if (!ui) return;
    this.root = new Container();
    this.root.name = 'AnimationPathOverlay';
    ui.addChild(this.root);
    this.installed = true;
  }

  clear(): void {
    if (!this.root) return;
    try { 
      this.root.removeChildren().forEach(c => {
        if (typeof (c as any).destroy === 'function') {
          (c as any).destroy();
        }
      }); 
    } catch (error) {
      console.warn('Failed to clear path overlay children:', error);
    }
  }

  refresh(): void {
    if (!this.installed) this.install();
    if (!this.root) return;
    this.clear();

    // Only show in animate mode when enabled
    const mode = (window as any).toolStateManager?.getCurrentMode?.() || 'build';
    const show = (animationState as any).getPathsVisible?.() !== false; // default true
    if (mode !== 'animate' || !show) return;

    const dm = animationState.getDisplayManager();
    if (!dm) return;
    const scenes = animationState.getScenes();
    const root = dm.getRoot();
    if (!root) return;

    const drawFor = (obj: any) => {
      for (const scene of scenes) {
        const anim = (obj as any).__animation;
        if (!anim || !anim.paths || !anim.paths[scene.getId()]) continue;
        const data = anim.paths[scene.getId()];
        const pts: Point[] = (data.points || []) as Point[];
        if (!pts || pts.length < 2) continue;

        const g = new Graphics();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          g.lineTo(pts[i].x, pts[i].y);
        }
        g.stroke({ color: 0x4a79a4, width: 1, alpha: 0.6 });
        for (const p of pts) {
          g.circle(p.x, p.y, 3).fill({ color: 0xffffff, alpha: 1 }).stroke({ color: 0x4a79a4, width: 1, alpha: 0.9 });
        }
        this.root!.addChild(g);
      }
      if (obj && (obj as any).children && Array.isArray((obj as any).children)) {
        for (const ch of (obj as any).children) drawFor(ch);
      }
    };

    drawFor(root);
  }

  destroy(): void {
    if (!this.root) return;
    try { this.root.destroy({ children: true }); } catch { /* empty */ }
    this.root = null;
    this.installed = false;
  }
}

export const pathOverlay = new PathOverlay();
