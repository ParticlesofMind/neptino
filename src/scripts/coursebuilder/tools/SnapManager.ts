/**
 * SnapManager
 * Handles snapping modes and provides helpers for tools to snap points.
 *
 * Modes:
 * - grid: snap to regular grid intersections
 * - objects: snap to edges/centers of other objects
 * - canvas: snap to canvas boundaries and center lines
 * - smart: enable dynamic guide behavior (basic center/edge alignment)
 */

import { Container, Point, Rectangle } from 'pixi.js';

type SnapMode = 'grid' | 'objects' | 'canvas' | 'smart' | 'none';

interface SnapPrefs {
  gridSize: number;
  threshold: number;
}

class SnapManager {
  private activeMode: SnapMode = 'grid';
  private prefs: SnapPrefs = { gridSize: 20, threshold: 6 };

  // Simple accessors
  public getActiveMode(): SnapMode { return this.activeMode; }
  public isSmartEnabled(): boolean { return this.activeMode === 'smart'; }
  public isGridEnabled(): boolean { return this.activeMode === 'grid'; }
  public isCanvasEnabled(): boolean { return this.activeMode === 'canvas'; }
  public isObjectsEnabled(): boolean { return this.activeMode === 'objects'; }
  public setActiveMode(mode: SnapMode): void {
    this.activeMode = mode;
    this.saveState();
    this.updateAnchorDisplay();
  }

  public setPrefs(p: Partial<SnapPrefs>): void {
    this.prefs = { ...this.prefs, ...p };
    this.saveState();
    this.updatePrefsDisplay();
  }

  /**
   * Bind UI elements with data-snap attributes
   * Optionally coordinate with perspectiveManager for grid overlay
   */
  public bindUI(perspectiveManager?: any): void {
    this.loadState();
    const anchor = document.querySelector('[data-snap-anchor]') as HTMLElement | null;
    const menu = document.querySelector('[data-snap-menu]') as HTMLElement | null;
    if (!anchor || !menu) return;

    const openMenu = () => {
      try {
        const perspective = anchor.closest('.engine__perspective') as HTMLElement | null;
        if (perspective && menu.parentElement !== perspective) perspective.appendChild(menu);
        const aRect = anchor.getBoundingClientRect();
        const pRect = (anchor.closest('.engine__perspective') as HTMLElement).getBoundingClientRect();
        const top = Math.max(0, Math.round(aRect.top - pRect.top));
        const left = Math.max(0, Math.round(aRect.left - pRect.left + anchor.offsetWidth + 8));
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
      } catch {}
      menu.classList.add('open');
    };
    const closeMenu = () => { menu.classList.remove('open'); };

    anchor.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (menu.classList.contains('open')) closeMenu(); else openMenu();
    });

    menu.querySelectorAll<HTMLElement>('[data-snap-option]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const mode = (item.getAttribute('data-snap-option') || 'grid') as SnapMode;
        this.setActiveMode(mode);
        closeMenu();
        if (perspectiveManager && typeof perspectiveManager.setGridEnabled === 'function') {
          perspectiveManager.setGridEnabled(mode === 'grid');
        }
      });
    });

    // Outside click closes
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node)) closeMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', closeMenu);

    // Initial sync: update icon/label and grid overlay
    this.updateAnchorDisplay();
    if (perspectiveManager && typeof perspectiveManager.setGridEnabled === 'function') {
      perspectiveManager.setGridEnabled(this.activeMode === 'grid');
    }
  }

  /**
   * Snap a point in container-local space according to enabled modes
   */
  public snapPoint(p: Point, options?: {
    container?: Container;
    exclude?: any[]; // objects to ignore
  }): Point {
    let x = p.x;
    let y = p.y;

    // If snapping disabled
    if (this.activeMode === 'none') return new Point(x, y);

    if (this.activeMode === 'grid') {
      x = Math.round(x / this.prefs.gridSize) * this.prefs.gridSize;
      y = Math.round(y / this.prefs.gridSize) * this.prefs.gridSize;
    } else if (this.activeMode === 'canvas') {
      const dims = this.getCanvasDimensions();
      const centers = { cx: dims.width / 2, cy: dims.height / 2 };
      x = this.snapAxis(x, [0, centers.cx, dims.width]);
      y = this.snapAxis(y, [0, centers.cy, dims.height]);
    } else if (this.activeMode === 'objects') {
      const candidates = this.collectObjectSnapLines(options);
      x = this.snapAxis(x, candidates.vLines);
      y = this.snapAxis(y, candidates.hLines);
    } else if (this.activeMode === 'smart') {
      // Smart = objects + canvas lines
      const dims = this.getCanvasDimensions();
      const centers = { cx: dims.width / 2, cy: dims.height / 2 };
      const cV = [0, centers.cx, dims.width];
      const cH = [0, centers.cy, dims.height];
      const obj = this.collectObjectSnapLines(options);
      x = this.snapAxis(x, [...cV, ...obj.vLines]);
      y = this.snapAxis(y, [...cH, ...obj.hLines]);
    }

    return new Point(x, y);
  }

  /**
   * Helper: snap a scalar to nearest candidate if within threshold
   */
  private snapAxis(value: number, candidates: number[]): number {
    let best = value;
    let bestDist = this.prefs.threshold + 1;
    for (const c of candidates) {
      const d = Math.abs(value - c);
      if (d < bestDist && d <= this.prefs.threshold) {
        best = c; bestDist = d;
      }
    }
    return best;
  }

  /**
   * Gather simple vertical/horizontal snap lines from other objects' bounds
   */
  private collectObjectSnapLines(options?: { exclude?: any[] }): { vLines: number[]; hLines: number[] } {
    const vLines: number[] = [];
    const hLines: number[] = [];

    // Attempt to get a global DisplayObjectManager via window (set by Canvas init)
    const dom = (window as any)._displayManager as { getObjects: () => any[] } | undefined;
    const objects = dom?.getObjects?.() || [];
    const excludeSet = new Set((options?.exclude || []).map(o => o));

    for (const obj of objects) {
      if (!obj?.getBounds || excludeSet.has(obj)) continue;
      try {
        const b: Rectangle = obj.getBounds();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        // Add world-space lines assuming tools convert consistently to container-local
        vLines.push(b.x, cx, b.x + b.width);
        hLines.push(b.y, cy, b.y + b.height);
      } catch {}
    }
    return { vLines, hLines };
  }

  /**
   * Get the PIXI canvas dimensions from DOM
   */
  private getCanvasDimensions(): { width: number; height: number } {
    const canvas = document.getElementById('pixi-canvas') as HTMLCanvasElement | null;
    if (canvas) return { width: canvas.width, height: canvas.height };
    // Fallback to default
    return { width: 900, height: 1200 };
  }

  // ---- State & UI helpers ----
  private saveState(): void {
    try { localStorage.setItem('snap.activeMode', this.activeMode); } catch {}
    try { localStorage.setItem('snap.prefs', JSON.stringify(this.prefs)); } catch {}
  }
  private loadState(): void {
    try {
      const m = localStorage.getItem('snap.activeMode') as SnapMode | null;
      if (m) this.activeMode = m;
      const p = localStorage.getItem('snap.prefs');
      if (p) this.prefs = { ...this.prefs, ...(JSON.parse(p) as SnapPrefs) };
    } catch {}
  }
  private updateAnchorDisplay(): void {
    const anchor = document.querySelector('[data-snap-anchor]') as HTMLElement | null;
    if (!anchor) return;
    const img = anchor.querySelector('img');
    const label = anchor.querySelector('.icon-label');
    const map: Record<SnapMode, { src: string; text: string }> = {
      grid: { src: '/src/assets/icons/coursebuilder/perspective/grid-icon.svg', text: 'Grid' },
      objects: { src: '/src/assets/icons/coursebuilder/perspective/snap-objects.svg', text: 'Objects' },
      canvas: { src: '/src/assets/icons/coursebuilder/perspective/snap-canvas.svg', text: 'Canvas' },
      smart: { src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', text: 'Smart' },
      none: { src: '/src/assets/icons/coursebuilder/perspective/snap-none.svg', text: 'None' },
    };
    const v = map[this.activeMode];
    if (img && v) (img as HTMLImageElement).src = v.src;
    if (label && v) label.textContent = v.text;
  }
  private updatePrefsDisplay(): void {
    document.querySelectorAll<HTMLElement>('[data-snap-pref="gridSize"]').forEach(btn => {
      const val = parseInt(btn.dataset.value || '0', 10);
      btn.classList.toggle('active', val === this.prefs.gridSize);
    });
    document.querySelectorAll<HTMLElement>('[data-snap-pref="threshold"]').forEach(btn => {
      const val = parseInt(btn.dataset.value || '0', 10);
      btn.classList.toggle('active', val === this.prefs.threshold);
    });
  }
}

export const snapManager = new SnapManager();
