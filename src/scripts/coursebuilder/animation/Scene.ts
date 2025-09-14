/**
 * Scene
 * A rectangle boundary with embedded timeline and controls
 */

import { Container, Graphics, Point, Rectangle, Text } from 'pixi.js';
import { animationState } from './AnimationState';

export interface SceneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Scene {
  private root: Container; // UI layer container for this scene
  private bounds: SceneBounds; // in canvas/drawing coordinates
  private rect: Graphics;
  private controlsBg: Graphics;
  private progressTrack: Graphics;
  private progressFill: Graphics;
  private playText: Text;
  private backText: Text;
  private fwdText: Text;
  private isPlaying: boolean = false;
  private t: number = 0; // normalized 0..1
  private loop: boolean = false;
  private id: string;

  constructor(bounds: SceneBounds) {
    this.bounds = bounds;
    this.id = `scene_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    this.root = new Container();
    this.root.name = 'AnimationScene';

    // Draw scene rectangle
    this.rect = new Graphics();
    this.rect.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 8)
      .stroke({ color: 0x4a79a4, width: 2 })
      .fill({ color: 0x4a79a4, alpha: 0.04 });

    // Controls area (bottom 36px)
    const controlsHeight = 36;
    const cx = bounds.x;
    const cy = bounds.y + bounds.height - controlsHeight;
    this.controlsBg = new Graphics();
    this.controlsBg.roundRect(cx, cy, bounds.width, controlsHeight, 6)
      .fill({ color: 0x000000, alpha: 0.25 })
      .stroke({ color: 0x4a79a4, width: 1 });

    // Progress track (top row)
    this.progressTrack = new Graphics();
    const trackMargin = 8;
    const trackHeight = 6;
    const trackY = cy + 6;
    this.progressTrack.roundRect(cx + trackMargin, trackY, bounds.width - trackMargin * 2, trackHeight, 3)
      .fill({ color: 0xffffff, alpha: 0.4 });

    this.progressFill = new Graphics();
    this.progressFill.roundRect(cx + trackMargin, trackY, 0, trackHeight, 3)
      .fill({ color: 0x4a79a4, alpha: 0.9 });

    // Navigation controls (bottom row)
    this.backText = new Text({ text: '◀', style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff } });
    this.playText = new Text({ text: '⏵', style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff } });
    this.fwdText = new Text({ text: '▶', style: { fontFamily: 'Arial', fontSize: 14, fill: 0xffffff } });
    const centerY = cy + controlsHeight - 14 - 4;
    this.backText.position.set(cx + bounds.width / 2 - 24, centerY);
    this.playText.position.set(cx + bounds.width / 2, centerY);
    this.fwdText.position.set(cx + bounds.width / 2 + 18, centerY);
    this.backText.eventMode = 'static';
    this.playText.eventMode = 'static';
    this.fwdText.eventMode = 'static';
    this.backText.cursor = 'pointer';
    this.playText.cursor = 'pointer';
    this.fwdText.cursor = 'pointer';
    this.backText.on('pointertap', () => this.step(-0.1));
    this.fwdText.on('pointertap', () => this.step(0.1));
    this.playText.on('pointertap', () => this.togglePlay());

    this.root.addChild(this.rect, this.controlsBg, this.progressTrack, this.progressFill, this.backText, this.playText, this.fwdText);

    // Mount into UI layer if available
    const ui = animationState.getUiLayer();
    if (ui) ui.addChild(this.root);

    // Attach to ticker
    const app = animationState.getApp();
    if (app) {
      app.ticker.add(this.tick);
    }
  }

  getId(): string { return this.id; }

  contains(pt: Point): boolean {
    return pt.x >= this.bounds.x && pt.x <= this.bounds.x + this.bounds.width && pt.y >= this.bounds.y && pt.y <= this.bounds.y + this.bounds.height;
  }

  getBounds(): SceneBounds { return { ...this.bounds }; }

  setLoop(enabled: boolean): void { this.loop = enabled; }

  destroy(): void {
    try {
      const app = animationState.getApp();
      if (app) app.ticker.remove(this.tick);
    } catch {}
    try { this.root.destroy({ children: true }); } catch {}
  }

  private setProgress(norm: number): void {
    const bounds = this.bounds;
    const controlsHeight = 36;
    const cx = bounds.x;
    const cy = bounds.y + bounds.height - controlsHeight;
    const trackMargin = 8;
    const trackHeight = 6;
    const trackY = cy + 6;
    const fullWidth = bounds.width - trackMargin * 2;
    const fillWidth = Math.max(0, Math.min(fullWidth, fullWidth * norm));
    this.progressFill.clear();
    this.progressFill.roundRect(cx + trackMargin, trackY, fillWidth, trackHeight, 3).fill({ color: 0x4a79a4, alpha: 0.9 });
  }

  private tick = (delta: number) => {
    if (!this.isPlaying) return;
    // delta ~ 1 at 60fps; we want normalized progress per frame based on a scene duration baseline (we animate per object duration)
    // Here we just drive t from 0..1 at an arbitrary rate, actual per-object durations are handled in interpolation.
    // We'll map 60 frames ~ 1 second progression (delta already accounts for FPS)
    const dt = (delta || 1) / 60; // approx seconds
    // Increase normalized time; playback controller per object will use its own duration mapping
    this.t += dt / 5; // default 5s cycle visual baseline
    if (this.t >= 1) {
      if (this.loop) {
        this.t = this.t % 1;
      } else {
        this.t = 1;
        this.pause();
      }
    }
    this.setProgress(this.t);
    this.updateAnimatedObjects(this.t);
  };

  private updateAnimatedObjects(normT: number): void {
    const dm = animationState.getDisplayManager();
    if (!dm) return;
    const objects = dm.getObjects();

    for (const obj of objects) {
      const anim = (obj as any).__animation;
      if (!anim || !anim.paths) continue;
      const path = anim.paths[this.id];
      if (!path || !path.points || path.points.length < 2) continue;
      const durationMs = path.durationMs || 5000;
      // Map scene normalized time to object's own duration: compute local t
      const tLocal = this.loop ? (normT * (5000 / durationMs)) % 1 : Math.min(1, normT * (5000 / durationMs));
      const pts = path.points as Point[];
      const total = pts.length - 1;
      const f = tLocal * total;
      const i = Math.floor(f);
      const frac = Math.min(1, Math.max(0, f - i));
      const p0 = pts[i];
      const p1 = pts[Math.min(total, i + 1)];
      const x = p0.x + (p1.x - p0.x) * frac;
      const y = p0.y + (p1.y - p0.y) * frac;
      // Assign directly in scene/drawing coordinates
      obj.position.set(x, y);
    }
  }

  play(): void {
    this.isPlaying = true;
    this.playText.text = '⏸';
  }
  pause(): void {
    this.isPlaying = false;
    this.playText.text = '⏵';
  }
  togglePlay(): void { this.isPlaying ? this.pause() : this.play(); }
  step(deltaNorm: number): void { this.t = Math.max(0, Math.min(1, this.t + deltaNorm)); this.setProgress(this.t); this.updateAnimatedObjects(this.t); }
}

