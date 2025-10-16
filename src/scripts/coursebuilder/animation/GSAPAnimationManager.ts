/**
 * Lightweight GSAPAnimationManager stub
 * Provides a minimal animation API used by GSAPCanvasIntegration without external deps.
 */

import { Scene } from './Scene';

type TimelineItem = {
  target: any;
  animation: Record<string, any>;
  duration: number;
  delay?: number;
  ease?: string;
};

export interface GSAPLike {
  animateProperty(target: any, props: Record<string, any>, duration?: number, _ease?: string, delay?: number): void;
  animateAlongPath(target: any, points: Array<{ x: number; y: number }>, duration?: number, _ease?: string, autoRotate?: boolean): void;
  createStaggeredAnimation(targets: any[], props: Record<string, any>, duration?: number, stagger?: number, _ease?: string): void;
  createTimeline(): { addToTimeline(item: TimelineItem): void; play(): void };
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function applyProps(target: any, props: Record<string, any>) {
  for (const [k, v] of Object.entries(props)) {
    try { (target as any)[k] = v; } catch { /* empty */ }
  }
}

export function enhanceSceneWithGSAP(scene: Scene): GSAPLike {
  void scene;
  const gsapLike: GSAPLike = {
    animateProperty(target, props, duration = 1, _ease, delay = 0) {
      const startValues: Record<string, any> = {};
      for (const key of Object.keys(props)) {
        startValues[key] = (target as any)[key];
      }
      const start = performance.now() + delay * 1000;
      const end = start + duration * 1000;
      const tick = (now: number) => {
        if (now < start) { requestAnimationFrame(tick); return; }
        const t = Math.min(1, (now - start) / (end - start));
        const current: Record<string, any> = {};
        for (const key of Object.keys(props)) {
          const sv = startValues[key]; const ev = (props as any)[key];
          if (typeof sv === 'number' && typeof ev === 'number') current[key] = lerp(sv, ev, t);
          else current[key] = t < 1 ? sv : ev;
        }
        applyProps(target, current);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    animateAlongPath(target, points, duration = 2, _ease, autoRotate = false) {
      if (!points || points.length < 2) return;
      const segCount = points.length - 1;
      const start = performance.now();
      const end = start + duration * 1000;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (end - start));
        const ft = t * segCount;
        const idx = Math.min(segCount - 1, Math.floor(ft));
        const lt = ft - idx;
        const p0 = points[idx]; const p1 = points[idx + 1];
        const x = lerp(p0.x, p1.x, lt);
        const y = lerp(p0.y, p1.y, lt);
        (target as any).position?.set?.(x, y);
        if (autoRotate) {
          const prev = idx > 0 ? points[idx] : points[0];
          const angle = Math.atan2(y - prev.y, x - prev.x);
          try { (target as any).rotation = angle; } catch { /* empty */ }
        }
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },

    createStaggeredAnimation(targets, props, duration = 1, stagger = 0.1, _ease) {
      targets.forEach((t, i) => this.animateProperty(t, props, duration, undefined, i * stagger));
    },

    createTimeline() {
      const items: TimelineItem[] = [];
      return {
        addToTimeline(item: TimelineItem) { items.push(item); },
        play() { let acc = 0; for (const it of items) { const delay = (it.delay || 0) + acc; gsapLike.animateProperty(it.target, it.animation, it.duration, it.ease, delay); acc += it.duration; } },
      };
    },
  };
  return gsapLike;
}

export function createGSAPScene(bounds: { x: number; y: number; width: number; height: number }): { scene: Scene; gsap: GSAPLike } {
  const scene = new Scene(bounds as any);
  const gsap = enhanceSceneWithGSAP(scene);
  return { scene, gsap };
}
