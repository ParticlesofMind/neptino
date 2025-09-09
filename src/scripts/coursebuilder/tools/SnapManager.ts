/**
 * SnapManager
 * Handles snapping modes and provides helpers for tools to snap points.
 *
 * Modes:
 * - grid: snap to regular grid intersections
 * - smart: enable dynamic guide behavior (objects + canvas centers/edges)
 */

import { Container, Point, Rectangle } from 'pixi.js';

type SnapMode = 'grid' | 'smart' | 'none';

interface SnapPrefs {
  gridSize: number;
  threshold: number; // snap distance
  equalTolerance: number; // px tolerance for equal spacing highlight
  matchWidth: boolean; // enable dimension width matching during creation
  matchHeight: boolean; // enable dimension height matching during creation
}

class SnapManager {
  private activeMode: SnapMode = 'smart';
  private prefs: SnapPrefs = { gridSize: 20, threshold: 6, equalTolerance: 1, matchWidth: true, matchHeight: true };

  // Simple accessors
  public getActiveMode(): SnapMode { return this.activeMode; }
  public isSmartEnabled(): boolean { return this.activeMode === 'smart'; }
  public isGridEnabled(): boolean { return this.activeMode === 'grid'; }
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
  public getPrefs(): Readonly<SnapPrefs> { return this.prefs; }

  /**
   * Initialize the snap manager - load saved state and update UI
   */
  public initialize(): void {
    this.loadState();
    this.updateAnchorDisplay();
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
    } else if (this.activeMode === 'smart') {
      // Smart = align to other objects only (edges and centers)
      const obj = this.collectObjectSnapLines(options);
      x = this.snapAxis(x, obj.vLines);
      y = this.snapAxis(y, obj.hLines);
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
  private collectObjectSnapLines(options?: { exclude?: any[]; container?: Container }): { vLines: number[]; hLines: number[] } {
    const vLines: number[] = [];
    const hLines: number[] = [];

    // Attempt to get a global DisplayObjectManager via window (set by Canvas init)
    const dom = (window as any)._displayManager as { getObjects?: () => any[]; getRoot?: () => Container } | undefined;
    const rootRef = dom?.getRoot ? dom.getRoot() : undefined;
    let objects: any[] = [];
    try {
      const list = dom?.getObjects?.();
      if (Array.isArray(list) && list.length > 0) {
        objects = list;
      } else if (dom?.getRoot) {
        // Fallback: traverse root container to collect display objects
        const root = dom.getRoot();
        const acc: any[] = [];
        const visit = (node: any) => {
          if (!node) return;
          acc.push(node);
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) visit(child);
          }
        };
        if (root) visit(root);
        objects = acc;
      }
    } catch {}
    const excludeSet = new Set((options?.exclude || []).map(o => o));

    for (const obj of objects) {
      if (rootRef && obj === rootRef) continue; // skip the root container
      if (!obj?.getBounds || excludeSet.has(obj) || obj.visible === false) continue;
      try {
        const b: Rectangle = obj.getBounds();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        vLines.push(b.x, cx, b.x + b.width);
        hLines.push(b.y, cy, b.y + b.height);
      } catch {}
    }
    // If a container is provided, convert world-space lines to that container's local space
    if (options?.container) {
      const c = options.container;
      const toLocalX = (x: number) => c.toLocal(new Point(x, 0)).x;
      const toLocalY = (y: number) => c.toLocal(new Point(0, y)).y;
      return {
        vLines: vLines.map(toLocalX),
        hLines: hLines.map(toLocalY),
      };
    }
    return { vLines, hLines };
  }

  /**
   * Public: get snap candidates for guides and snapping decisions
   */
  public getCandidates(options?: { exclude?: any[]; container?: Container }): {
    vLines: number[];
    hLines: number[];
    canvas: { v: number[]; h: number[] };
    threshold: number;
    dims: { width: number; height: number };
  } {
    const dims = this.getCanvasDimensions();
    const centers = { cx: dims.width / 2, cy: dims.height / 2 };
    const canvas = { v: [0, centers.cx, dims.width], h: [0, centers.cy, dims.height] };
    const obj = this.collectObjectSnapLines(options);
    return { vLines: obj.vLines, hLines: obj.hLines, canvas, threshold: this.prefs.threshold, dims };
  }

  /**
   * Get the PIXI canvas dimensions from DOM
   */
  private getCanvasDimensions(): { width: number; height: number } {
    // Prefer Pixi Application screen size (world units), which is independent of resolution
    try {
      const canvasAPI = (window as any).canvasAPI;
      const app = canvasAPI && typeof canvasAPI.getApp === 'function' ? canvasAPI.getApp() : null;
      const w = (app && (app as any).screen && (app as any).screen.width) || null;
      const h = (app && (app as any).screen && (app as any).screen.height) || null;
      if (typeof w === 'number' && typeof h === 'number') {
        return { width: w, height: h };
      }
    } catch {}
    // Fallback to DOM canvas size (may be scaled by resolution) only if Pixi app not available
    const canvas = document.getElementById('pixi-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      // Try to derive CSS size if autoDensity is used; otherwise use width/height
      const cssW = parseFloat(getComputedStyle(canvas).width || '0');
      const cssH = parseFloat(getComputedStyle(canvas).height || '0');
      if (cssW && cssH) return { width: cssW, height: cssH } as any;
      return { width: canvas.width, height: canvas.height };
    }
    // Final fallback to defaults
    return { width: 900, height: 1200 };
  }

  // ---- State & UI helpers ----
  private saveState(): void {
    try { localStorage.setItem('snap.activeMode', this.activeMode); } catch {}
    try { localStorage.setItem('snap.prefs', JSON.stringify(this.prefs)); } catch {}
  }
  private loadState(): void {
    try {
      const m = localStorage.getItem('snap.activeMode');
      const allowed: SnapMode[] = ['grid', 'smart', 'none'];
      if (m && (allowed as string[]).includes(m)) {
        this.activeMode = m as SnapMode;
      } else if (m) {
        // Migrate legacy modes to smart
        this.activeMode = 'smart';
      }
      const p = localStorage.getItem('snap.prefs');
      if (p) {
        const parsed = JSON.parse(p) as Partial<SnapPrefs>;
        this.prefs = { ...this.prefs, ...parsed };
        // Backward compatibility for missing fields
        if (typeof (this.prefs as any).equalTolerance !== 'number') this.prefs.equalTolerance = 1;
        if (typeof (this.prefs as any).matchWidth !== 'boolean') this.prefs.matchWidth = true;
        if (typeof (this.prefs as any).matchHeight !== 'boolean') this.prefs.matchHeight = true;
      }
    } catch {}
  }
  private updateAnchorDisplay(): void {
    const anchor = document.querySelector('[data-snap-anchor]') as HTMLElement | null;
    if (!anchor) return;
    const img = anchor.querySelector('img') as HTMLImageElement;
    const label = anchor.querySelector('.icon-label') as HTMLElement;
    const map: Record<SnapMode, { src: string; text: string }> = {
      grid: { src: '/src/assets/icons/coursebuilder/perspective/grid-icon.svg', text: 'Grid' },
      smart: { src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', text: 'Smart' },
      none: { src: '/src/assets/icons/coursebuilder/perspective/snap-none.svg', text: 'None' },
    };
    const v = map[this.activeMode];
    if (img && v) img.src = v.src;
    if (label && v) label.textContent = v.text;
    
    // Update menu item selection state
    const menu = document.querySelector('[data-snap-menu]') as HTMLElement | null;
    if (menu) {
      menu.querySelectorAll('.snap-menu__item').forEach(item => {
        item.classList.remove('snap-menu__item--active');
      });
      const activeItem = menu.querySelector(`[data-snap-option="${this.activeMode}"]`);
      if (activeItem) {
        activeItem.classList.add('snap-menu__item--active');
      }
    }
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
