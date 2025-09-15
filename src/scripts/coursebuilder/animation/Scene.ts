/**
 * Scene
 * A rectangle boundary with embedded timeline and controls
 */

import { Container, Graphics, Point, Text } from 'pixi.js';
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
  private progressMarkers: Graphics;
  private playText: Text;
  private backText: Text;
  private fwdText: Text;
  private timerText: Text;
  private ctrlRoot: Container | null = null;
  private isPlaying: boolean = false;
  private t: number = 0; // normalized 0..1
  private loop: boolean = false;
  private id: string;
  private _prevRootPos: Point | null = null;
  private isScrubbing: boolean = false;

  constructor(bounds: SceneBounds, id?: string) {
    this.bounds = bounds;
    this.id = id || `scene_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    this.root = new Container();
    this.root.name = 'AnimationSceneRoot';
    // Position root at origin; draw children locally
    this.root.position.set(bounds.x, bounds.y);
    (this.root as any).__sceneRef = this;
    this.root.eventMode = 'static';

    // Draw scene rectangle (local coordinates)
    this.rect = new Graphics();
    this.rect.roundRect(0, 0, bounds.width, bounds.height, 10)
      .stroke({ color: 0x4a79a4, width: 2 })
      .fill({ color: 0x4a79a4, alpha: 0.06 });

    // Controls area (bottom bar) in UI layer (always on top)
    const controlsHeight = 48;
    const cx = 0;
    const cy = bounds.height - controlsHeight;
    this.ctrlRoot = new Container();
    this.ctrlRoot.name = 'SceneControls';
    const uiLayer = animationState.getUiLayer();
    if (uiLayer) uiLayer.addChild(this.ctrlRoot);
    this.controlsBg = new Graphics();
    this.controlsBg.roundRect(cx, cy, bounds.width, controlsHeight, 8)
      .fill({ color: 0x0b1b2b, alpha: 0.55 })
      .stroke({ color: 0x4a79a4, width: 1 });

    // Progress track (top row)
    this.progressTrack = new Graphics();
    const trackMargin = 10;
    const trackHeight = 8;
    const trackY = cy + 8;
    this.progressTrack.roundRect(cx + trackMargin, trackY, bounds.width - trackMargin * 2, trackHeight, 4)
      .fill({ color: 0xffffff, alpha: 0.35 });

    this.progressFill = new Graphics();
    this.progressMarkers = new Graphics();
    this.progressFill.roundRect(cx + trackMargin, trackY, 0, trackHeight, 4)
      .fill({ color: 0x4a79a4, alpha: 0.95 });

    // Navigation controls (bottom row) + timer
    this.backText = new Text({ text: '◀', style: { fontFamily: 'Arial', fontSize: 18, fill: 0xffffff } });
    this.playText = new Text({ text: '⏵', style: { fontFamily: 'Arial', fontSize: 20, fill: 0xffffff } });
    this.fwdText = new Text({ text: '▶', style: { fontFamily: 'Arial', fontSize: 18, fill: 0xffffff } });
    this.timerText = new Text({ text: '0:00', style: { fontFamily: 'Arial', fontSize: 12, fill: 0xffffff } });
    const centerY = cy + controlsHeight - 18 - 6;
    this.backText.position.set(cx + bounds.width / 2 - 28, centerY);
    this.playText.position.set(cx + bounds.width / 2, centerY);
    this.fwdText.position.set(cx + bounds.width / 2 + 22, centerY);
    this.timerText.position.set(cx + trackMargin, cy + controlsHeight - 22);
    this.backText.eventMode = 'static';
    this.playText.eventMode = 'static';
    this.fwdText.eventMode = 'static';
    this.backText.cursor = 'pointer';
    this.playText.cursor = 'pointer';
    this.fwdText.cursor = 'pointer';
    const stop = (e: any) => { try { e.stopPropagation?.(); } catch {} };
    this.backText.on('pointerdown', stop).on('pointertap', (e: any) => { stop(e); this.step(-0.1); });
    this.fwdText.on('pointerdown', stop).on('pointertap', (e: any) => { stop(e); this.step(0.1); });
    this.playText.on('pointerdown', stop).on('pointertap', (e: any) => { stop(e); this.togglePlay(); });

    this.root.addChild(this.rect);
    this.ctrlRoot?.addChild(this.controlsBg, this.progressTrack, this.progressFill, this.progressMarkers, this.backText, this.playText, this.fwdText, this.timerText);

    // Enable scrubbing on progress track
    const startScrub = (e: any) => {
      try { e.stopPropagation?.(); } catch {}
      this.isScrubbing = true; this.pause(); this.updateFromTrack(e);
    };
    const doScrub = (e: any) => { if (this.isScrubbing) { try { e.stopPropagation?.(); } catch {} this.updateFromTrack(e); } };
    const endScrub = (e: any) => { if (this.isScrubbing) { try { e.stopPropagation?.(); } catch {} this.isScrubbing = false; } };
    this.progressTrack.eventMode = 'static';
    this.progressFill.eventMode = 'static';
    this.progressTrack.on('pointerdown', startScrub).on('pointermove', doScrub).on('pointerup', endScrub).on('pointerupoutside', endScrub);
    this.progressFill.on('pointerdown', startScrub).on('pointermove', doScrub).on('pointerup', endScrub).on('pointerupoutside', endScrub);

    // Mount into drawing layer behind content for selection/move/delete support
    const dm = animationState.getDisplayManager();
    const drawing = dm?.getRoot();
    if (drawing) {
      try { drawing.addChildAt(this.root, 0); } catch { drawing.addChild(this.root); }
    }
    // Position UI controls over the scene
    this.updateControlsTransform();

    // Attach to ticker
    const app = animationState.getApp();
    if (app) {
      app.ticker.add(this.tick);
    }
    this._prevRootPos = new Point(this.root.position.x, this.root.position.y);
  }

  getId(): string { return this.id; }

  contains(pt: Point): boolean {
    try {
      const dm = animationState.getDisplayManager();
      const root = dm?.getRoot();
      if (root) {
        const local = this.root.toLocal(pt, root);
        return local.x >= 0 && local.x <= this.bounds.width && local.y >= 0 && local.y <= this.bounds.height;
      }
    } catch {}
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
    try { this.ctrlRoot?.destroy({ children: true }); } catch {}
    try { (animationState as any).removeScene?.(this); } catch {}
  }

  private setProgress(norm: number): void {
    const bounds = this.bounds;
    const controlsHeight = 48;
    const cx = 0;
    const cy = bounds.height - controlsHeight;
    const trackMargin = 10;
    const trackHeight = 8;
    const trackY = cy + 8;
    const fullWidth = bounds.width - trackMargin * 2;
    const fillWidth = Math.max(0, Math.min(fullWidth, fullWidth * norm));
    this.progressFill.clear();
    this.progressFill.roundRect(cx + trackMargin, trackY, fillWidth, trackHeight, 4).fill({ color: 0x4a79a4, alpha: 0.95 });
    // Draw segment markers
    try {
      this.progressMarkers.clear();
      const dm = animationState.getDisplayManager();
      const root = dm?.getRoot();
      if (root) {
        const drawMarkersFor = (obj: any) => {
          const a = obj && (obj as any).__animation;
          if (a && a.paths && a.paths[this.id] && Array.isArray(a.paths[this.id].points) && a.paths[this.id].points.length >= 2) {
            const pts = a.paths[this.id].points as Point[];
            const total = pts.length - 1;
            const segs: number[] = (Array.isArray((a.paths[this.id] as any).segments) && (a.paths[this.id] as any).segments.length === total)
              ? (a.paths[this.id] as any).segments as number[]
              : new Array(total).fill(1);
            const sum = segs.reduce((acc, w) => acc + (w || 0), 0) || 1;
            let acc = 0;
            for (let s = 0; s < total; s++) {
              const w = (segs[s] || 0) / sum;
              const mx = cx + trackMargin + (acc + w) * fullWidth;
              this.progressMarkers.rect(mx - 0.5, trackY - 2, 1, trackHeight + 4).fill({ color: 0xffffff, alpha: 0.35 });
              acc += w;
            }
          }
          if (obj && obj.children) { for (const ch of obj.children) drawMarkersFor(ch); }
        };
        drawMarkersFor(root);
      }
    } catch {}
    this.updateControlsTransform();
  }

  private tick = (ticker: any) => {
    // If scene container moved (via selection), carry content and paths with it
    try { this.syncSceneTransform(); } catch {}
    const delta = (ticker?.deltaMS ?? 16.67) / 16.67; // normalize to ~60fps units
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
    this.updateTimerText();
    this.updateControlsTransform();
  };

  private updateFromTrack(e: any): void {
    try {
      const local = this.ctrlRoot ? this.ctrlRoot.toLocal(e.global) : null;
      if (!local) return;
      const bounds = this.bounds;
      const controlsHeight = 48;
      const cx = 0; const cy = bounds.height - controlsHeight;
      const trackMargin = 10; const fullWidth = bounds.width - trackMargin * 2;
      const x = Math.max(cx + trackMargin, Math.min(cx + trackMargin + fullWidth, local.x));
      const norm = (x - (cx + trackMargin)) / fullWidth;
      this.t = Math.max(0, Math.min(1, norm));
      this.setProgress(this.t);
      this.updateAnimatedObjects(this.t);
      this.updateTimerText();
    } catch {}
  }

  private updateControlsTransform(): void {
    try {
      if (!this.ctrlRoot) return;
      this.ctrlRoot.position.set(this.root.position.x, this.root.position.y);
    } catch {}
  }

  private syncSceneTransform(): void {
    const dm = animationState.getDisplayManager();
    const root = dm?.getRoot();
    if (!dm || !root) return;
    if (!this._prevRootPos) { this._prevRootPos = new Point(this.root.position.x, this.root.position.y); return; }
    const rx = this.root.position.x, ry = this.root.position.y;
    const dx = rx - this._prevRootPos.x;
    const dy = ry - this._prevRootPos.y;
    if (dx === 0 && dy === 0) return;

    // Previous world bounds of scene in drawing coords
    const prevRect = { x: this.bounds.x, y: this.bounds.y, width: this.bounds.width, height: this.bounds.height };
    // Update stored bounds
    this.bounds.x += dx; this.bounds.y += dy;

    // Shift all path points bound to this scene
    const shiftPaths = (obj: any) => {
      const a = obj && (obj as any).__animation;
      if (a && a.paths && a.paths[this.id]) {
        const data = a.paths[this.id];
        if (data && Array.isArray(data.points)) {
          for (const p of data.points as Point[]) { p.x += dx; p.y += dy; }
        }
      }
      if (obj && obj.children) { for (const ch of obj.children) shiftPaths(ch); }
    };
    shiftPaths(root);

    // Move any objects whose centers lie within previous scene rect by the same delta
    const carryObjects = (obj: any) => {
      if (!obj || obj === this.root) { if (obj && obj.children) for (const ch of obj.children) carryObjects(ch); return; }
      try {
        const b = obj.getBounds();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        if (cx >= prevRect.x && cx <= prevRect.x + prevRect.width && cy >= prevRect.y && cy <= prevRect.y + prevRect.height) {
          const parent = obj.parent as any;
          if (parent && typeof parent.toLocal === 'function') {
            const dmRoot = root;
            const oldWorld = new Point(b.x, b.y); // top-left approximation
            // Move by dx,dy in drawing coords
            const newLocal = parent.toLocal(new Point(oldWorld.x + dx, oldWorld.y + dy), dmRoot);
            const curLocal = obj.position.clone();
            const off = new Point(newLocal.x - (curLocal.x + (b.x - (parent.toGlobal(curLocal).x))), newLocal.y - (curLocal.y + (b.y - (parent.toGlobal(curLocal).y))));
            // Simpler: convert current position to drawing coords, then add dx,dy
            const curWorld = parent.toGlobal(curLocal);
            const curDraw = dmRoot.toLocal(curWorld);
            const nextDraw = new Point(curDraw.x + dx, curDraw.y + dy);
            const nextLocal = parent.toLocal(nextDraw, dmRoot);
            obj.position.set(nextLocal.x, nextLocal.y);
          } else {
            obj.position.x += dx; obj.position.y += dy;
          }
        }
      } catch {}
      if (obj && obj.children) { for (const ch of obj.children) carryObjects(ch); }
    };
    carryObjects(root);

    // Refresh overlays
    try { (window as any).requestAnimationFrame?.(() => (animationState as any).getPathsVisible?.() && (window as any).pathOverlay?.refresh?.()); } catch {}

    this._prevRootPos.set(rx, ry);
  }

  private updateTimerText(): void {
    try {
      const ms = Math.floor(this.t * this.getSceneDurationMs());
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      this.timerText.text = `${m}:${sec.toString().padStart(2, '0')}`;
    } catch {}
  }

  private getSceneDurationMs(): number {
    const dm = animationState.getDisplayManager();
    if (!dm) return 5000;
    let maxMs = 0;
    const root = dm.getRoot();
    const visit = (obj: any) => {
      const a = obj && (obj as any).__animation;
      if (a && a.paths && a.paths[this.id]) {
        const d = a.paths[this.id].durationMs || 0;
        if (d > maxMs) maxMs = d;
      }
      if (obj && obj.children) {
        for (const ch of obj.children) visit(ch);
      }
    };
    if (root) visit(root);
    return Math.max(5000, maxMs || 0);
  }

  private updateAnimatedObjects(normT: number): void {
    const dm = animationState.getDisplayManager();
    if (!dm) return;

    const root = dm.getRoot();
    if (!root) return;

    const visit = (obj: any) => {
      const anim = obj && (obj as any).__animation;
      if (anim && anim.paths) {
        const path = anim.paths[this.id];
        if (path && path.points && path.points.length >= 2) {
          const durationMs = path.durationMs || 5000;
          const ease = (path as any).ease || 'linear';
          // Map scene normalized time to object's own duration: compute local t
          const tRaw = this.loop ? (normT * (5000 / durationMs)) % 1 : Math.min(1, normT * (5000 / durationMs));
          const tLocal = this.applyEase(ease as any, tRaw);
          const pts = path.points as Point[];
          const total = pts.length - 1;
          const segs: number[] = (Array.isArray((path as any).segments) && (path as any).segments.length === total)
            ? (path as any).segments as number[]
            : new Array(total).fill(1);
          let acc = 0;
          const sum = segs.reduce((a, b) => a + (b || 0), 0) || 1;
          let segIdx = 0;
          let segT = 0;
          for (let s = 0; s < total; s++) {
            const w = (segs[s] || 0) / sum;
            if (tLocal <= acc + w || s === total - 1) {
              segIdx = s;
              segT = (tLocal - acc) / (w || 1);
              segT = Math.max(0, Math.min(1, segT));
              break;
            }
            acc += w;
          }
          const i = segIdx;
          const segEaseArr: string[] = Array.isArray((path as any).easings) ? (path as any).easings as string[] : [];
          const segEase = (segEaseArr[i] as any) || (ease as any);
          const frac = this.applySegEase(segEase, segT);
          let x: number, y: number;
          if ((path as any).curve === 'bezier') {
            const handles = Array.isArray((path as any).handles) ? (path as any).handles as any[] : [];
            const p0 = pts[i];
            const p3 = pts[Math.min(total, i + 1)];
            const p1h = handles[i]?.out || p0;
            const p2h = handles[i + 1]?.in || p3;
            const t = frac; const u = 1 - t; const uu = u * u; const tt = t * t;
            x = uu * u * p0.x + 3 * uu * t * p1h.x + 3 * u * tt * p2h.x + tt * t * p3.x;
            y = uu * u * p0.y + 3 * uu * t * p1h.y + 3 * u * tt * p2h.y + tt * t * p3.y;
          } else {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            x = p0.x + (p1.x - p0.x) * frac;
            y = p0.y + (p1.y - p0.y) * frac;
          }
          // Convert from drawing-layer coordinates to the object's parent local space
          try {
            const parent = (obj as any).parent as any;
            if (root && parent && typeof parent.toLocal === 'function') {
              const local = parent.toLocal(new Point(x, y), root);
              obj.position.set(local.x, local.y);
            } else {
              obj.position.set(x, y);
            }
          } catch {
            try { obj.position.set(x, y); } catch {}
          }
        }
      }
      // Recurse into children (containers)
      if ((obj as any).children && Array.isArray((obj as any).children)) {
        for (const ch of (obj as any).children) visit(ch);
      }
    };

    visit(root);
  }

  private applyEase(kind: 'linear' | 'easeIn' | 'easeOut', t: number): number {
    if (kind === 'easeIn') {
      // cubic ease in
      return t * t * t;
    } else if (kind === 'easeOut') {
      // cubic ease out
      const u = t - 1;
      return 1 + u * u * u;
    }
    // linear
    return t;
  }
  private applySegEase(kind: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut', t: number): number {
    if (kind === 'easeIn') return t * t * t;
    if (kind === 'easeOut') { const u = t - 1; return 1 + u * u * u; }
    if (kind === 'easeInOut') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return t;
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
  reset(): void { this.t = 0; this.setProgress(0); this.updateAnimatedObjects(0); }
  step(deltaNorm: number): void { this.t = Math.max(0, Math.min(1, this.t + deltaNorm)); this.setProgress(this.t); this.updateAnimatedObjects(this.t); }
}
