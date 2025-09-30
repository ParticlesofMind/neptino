/**
 * SnapManager
 * Handles snapping modes and provides helpers for tools to snap points.
 *
 * Modes:
 * - grid: snap to regular grid intersections
 * - smart: enable dynamic guide behavior (objects + canvas centers/edges)
 */

import { Point, Container, Rectangle } from 'pixi.js';
import { canvasDimensionManager } from '../utils/CanvasDimensionManager';

type SnapMode = 'smart' | 'none';

  interface SnapPrefs {
    threshold: number; // snap distance
    equalTolerance: number; // px tolerance for equal spacing highlight
    matchWidth: boolean; // enable dimension width matching during creation
    matchHeight: boolean; // enable dimension height matching during creation
    centerBiasMultiplier: number; // multiplier to make center snapping easier
    enableCenterBias: boolean; // toggle for center bias snapping
    enableMidpoints: boolean;  // toggle midpoint candidate generation
    enableSymmetryGuides: boolean; // toggle short center/midpoint guides
    stickyHysteresis?: number; // px distance to break snap lock
    
    // Enhanced Figma-like features
    equalSpacingBias: number; // multiplier for equal spacing snap strength (0.5-3.0)
    showDistToAll: boolean; // show distance labels to nearest non-aligned objects
    enableResizeGuides: boolean; // show width/height matching guides during resize
    enableInteractiveLabels: boolean; // make gap labels draggable for redistribution
    enableSmartSelection: boolean; // detect equal-spaced groups with reorder dots
    guideExtendMode: 'selection' | 'viewport' | 'canvas'; // how far guides extend
    guideFadeDistance: number; // distance at which guides start to fade
    enableFullCanvasLines: boolean; // option for full-canvas guide lines
    enableColorCoding: boolean; // use different colors for different guide types
    distanceUnits: 'px' | '%' | 'pt'; // units for distance labels
    
    // New Figma-style preferences
    enableFigmaMode: boolean; // Enable Figma-style behavior
    redAlignmentGuides: boolean; // Red guides for alignments
    distanceLabelsOnAlt: boolean; // Show distances only when Alt/Option is held
    pinkEqualSpacing: boolean; // Pink guides and handles for equal spacing
    magneticSnapping: boolean; // Magnetic pull behavior
    autoShowOnDrag: boolean; // Automatically show guides during drag
    smartSelectionHandles: boolean; // Pink handles for reordering
  }

class SnapManager {
  private activeMode: SnapMode = 'smart';
  private prefs: SnapPrefs = { 
    threshold: 8, 
    equalTolerance: 1, 
    matchWidth: true, 
    matchHeight: true, 
    centerBiasMultiplier: 2.4, 
    enableCenterBias: true, 
    enableMidpoints: true, 
    enableSymmetryGuides: true, 
    stickyHysteresis: 14,
    
    // Enhanced Figma-like features
    equalSpacingBias: 1.5,
    showDistToAll: true,
    enableResizeGuides: true,
    enableInteractiveLabels: false, // disabled by default for simplicity
    enableSmartSelection: true,
    guideExtendMode: 'selection',
    guideFadeDistance: 200,
    enableFullCanvasLines: false,
    enableColorCoding: true,
    distanceUnits: 'px',
    
    // New Figma-style preferences (enabled by default for the new system)
    enableFigmaMode: true,
    redAlignmentGuides: true,
    distanceLabelsOnAlt: true,
    pinkEqualSpacing: true,
    magneticSnapping: true,
    autoShowOnDrag: true,
    smartSelectionHandles: true
  };

  // Simple accessors
  public getActiveMode(): SnapMode { return this.activeMode; }
  public isSmartEnabled(): boolean { return this.activeMode === 'smart'; }
  public isNoneEnabled(): boolean { return this.activeMode === 'none'; }
  public setActiveMode(mode: SnapMode): void {
    this.activeMode = mode;
    this.saveState();
    this.updateAnchorDisplay();
    
    // Dispatch event for enhanced snap menu handler
    document.dispatchEvent(new CustomEvent('snap:mode-changed', {
      detail: { mode: this.activeMode }
    }));
  }

  public setPrefs(p: Partial<SnapPrefs>): void {
    this.prefs = { ...this.prefs, ...p };
    this.saveState();
    this.updatePrefsDisplay();
    
    // Dispatch event for enhanced snap menu handler
    document.dispatchEvent(new CustomEvent('snap:prefs-updated', {
      detail: { prefs: this.prefs }
    }));
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
   * Enhanced with Figma-style magnetic snapping behavior
   */
  public snapPoint(p: Point, options?: {
    container?: Container;
    exclude?: any[]; // objects to ignore
  }): Point {
    let x = p.x;
    let y = p.y;

    // If snapping disabled
    if (this.activeMode === 'none') return new Point(x, y);

    if (this.activeMode === 'smart') {
      // Smart = align to other objects and canvas edges/centers
      const cand = this.getCandidates(options);

      // Figma-style magnetic snapping: stronger pull for alignments
      if (this.prefs.enableFigmaMode && this.prefs.magneticSnapping) {
        const magneticThreshold = this.prefs.threshold * 1.5; // Larger magnetic field
        
        // Enhanced center bias for Figma-style behavior
        if (this.prefs.enableCenterBias) {
          const centerXs: number[] = [];
          const centerYs: number[] = [];
          // Canvas centers
          if (cand.canvas?.v?.length) {
            const canvasCx = cand.canvas.v[Math.floor(cand.canvas.v.length / 2)];
            if (typeof canvasCx === 'number') centerXs.push(canvasCx);
          }
          if (cand.canvas?.h?.length) {
            const canvasCy = cand.canvas.h[Math.floor(cand.canvas.h.length / 2)];
            if (typeof canvasCy === 'number') centerYs.push(canvasCy);
          }
          // Object centers (precomputed for efficiency)
          if (Array.isArray((cand as any).vCenters)) centerXs.push(...((cand as any).vCenters as number[]));
          if (Array.isArray((cand as any).hCenters)) centerYs.push(...((cand as any).hCenters as number[]));
          
          // Snap X to nearest center line with magnetic behavior
          if (centerXs.length) {
            let best = x; let bestD = magneticThreshold + 1;
            for (const cx of centerXs) {
              const d = Math.abs(x - cx);
              if (d < bestD && d <= magneticThreshold) { 
                bestD = d; 
                best = cx; 
              }
            }
            x = best;
          }
          // Snap Y to nearest center line with magnetic behavior
          if (centerYs.length) {
            let best = y; let bestD = magneticThreshold + 1;
            for (const cy of centerYs) {
              const d = Math.abs(y - cy);
              if (d < bestD && d <= magneticThreshold) { 
                bestD = d; 
                best = cy; 
              }
            }
            y = best;
          }
        }

        // Enhanced edge snapping with magnetic behavior
        const vLines = cand.vLines.concat(cand.canvas.v || []);
        const hLines = cand.hLines.concat(cand.canvas.h || []);
        x = this.snapAxisMagnetic(x, vLines, magneticThreshold);
        y = this.snapAxisMagnetic(y, hLines, magneticThreshold);
      } else {
        // Original snapping behavior
        // Symmetry bias: prefer snapping to centers (canvas + object centers) with a larger effective threshold
        const centerBias = Math.max(1, this.prefs.centerBiasMultiplier || 1);
        if (this.prefs.enableCenterBias) {
          const centerXs: number[] = [];
          const centerYs: number[] = [];
          // Canvas centers
          if (cand.canvas?.v?.length) {
            const canvasCx = cand.canvas.v[Math.floor(cand.canvas.v.length / 2)];
            if (typeof canvasCx === 'number') centerXs.push(canvasCx);
          }
          if (cand.canvas?.h?.length) {
            const canvasCy = cand.canvas.h[Math.floor(cand.canvas.h.length / 2)];
            if (typeof canvasCy === 'number') centerYs.push(canvasCy);
          }
          // Object centers (precomputed for efficiency)
          if (Array.isArray((cand as any).vCenters)) centerXs.push(...((cand as any).vCenters as number[]));
          if (Array.isArray((cand as any).hCenters)) centerYs.push(...((cand as any).hCenters as number[]));
          // Snap X to nearest center line
          if (centerXs.length) {
            let best = x; let bestD = this.prefs.threshold * centerBias + 1;
            for (const cx of centerXs) {
              const d = Math.abs(x - cx);
              if (d < bestD && d <= this.prefs.threshold * centerBias) { bestD = d; best = cx; }
            }
            x = best;
          }
          // Snap Y to nearest center line
          if (centerYs.length) {
            let best = y; let bestD = this.prefs.threshold * centerBias + 1;
            for (const cy of centerYs) {
              const d = Math.abs(y - cy);
              if (d < bestD && d <= this.prefs.threshold * centerBias) { bestD = d; best = cy; }
            }
            y = best;
          }
        }

        // Fall back to nearest candidates if not center-snapped
        const vLines = cand.vLines.concat(cand.canvas.v || []);
        const hLines = cand.hLines.concat(cand.canvas.h || []);
        x = this.snapAxis(x, vLines);
        y = this.snapAxis(y, hLines);
      }
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
   * Helper: Figma-style magnetic snapping with stronger pull
   */
  private snapAxisMagnetic(value: number, candidates: number[], threshold: number): number {
    let best = value;
    let bestDist = threshold + 1;
    for (const c of candidates) {
      const d = Math.abs(value - c);
      if (d < bestDist && d <= threshold) {
        best = c; bestDist = d;
      }
    }
    return best;
  }

  /**
   * Gather simple vertical/horizontal snap lines from other objects' bounds
   */
  private collectObjectSnapLines(options?: { exclude?: any[]; container?: Container; rect?: Rectangle; margin?: number }): { vLines: number[]; hLines: number[]; vCenters: number[]; hCenters: number[] } {
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

    const centers: Array<{ x: number; y: number }> = [];
    const rect = options?.rect;
    const margin = options?.margin ?? 160;
    for (const obj of objects) {
      if (rootRef && obj === rootRef) continue; // skip the root container
      if (!obj?.getBounds || excludeSet.has(obj) || obj.visible === false) continue;
      try {
        const b: Rectangle = obj.getBounds();
        // Optional spatial filter against a reference rect (in world coords for now)
        if (rect) {
          const ax1 = b.x, ax2 = b.x + b.width, ay1 = b.y, ay2 = b.y + b.height;
          const bx1 = rect.x - margin, bx2 = rect.x + rect.width + margin;
          const by1 = rect.y - margin, by2 = rect.y + rect.height + margin;
          const overlapX = ax2 >= bx1 && ax1 <= bx2;
          const overlapY = ay2 >= by1 && ay1 <= by2;
          if (!overlapX && !overlapY) continue;
        }
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        vLines.push(b.x, cx, b.x + b.width);
        hLines.push(b.y, cy, b.y + b.height);
        centers.push({ x: cx, y: cy });
      } catch {}
    }
    // If a container is provided, convert world-space lines to that container's local space
    if (options?.container) {
      const c = options.container;
      const toLocalX = (x: number) => c.toLocal(new Point(x, 0)).x;
      const toLocalY = (y: number) => c.toLocal(new Point(0, y)).y;
      const v = vLines.map(toLocalX);
      const h = hLines.map(toLocalY);
      const localCenters = centers.map(c => ({ x: toLocalX(c.x), y: toLocalY(c.y) }));
      // Add midpoints between object centers to encourage symmetry snapping
      if (this.prefs.enableMidpoints) this.addMidpoints(localCenters, v, h);
      return { vLines: v, hLines: h, vCenters: localCenters.map(c => c.x), hCenters: localCenters.map(c => c.y) };
    }
    // World space path (rare): still add midpoints in world units
    if (this.prefs.enableMidpoints) this.addMidpoints(centers, vLines, hLines);
    return { vLines, hLines, vCenters: centers.map(c => c.x), hCenters: centers.map(c => c.y) };
  }

  /**
   * Extend candidate lines with midpoints between objects' centers.
   * If too many objects, only use neighbor midpoints to keep cost low.
   */
  private addMidpoints(centers: Array<{ x: number; y: number }>, vOut: number[], hOut: number[]): void {
    const n = centers.length;
    if (n <= 1) return;
    if (n <= 50) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const mx = (centers[i].x + centers[j].x) * 0.5;
          const my = (centers[i].y + centers[j].y) * 0.5;
          vOut.push(mx);
          hOut.push(my);
        }
      }
      return;
    }
    // Large scenes: only consecutive neighbors by axis
    const byX = centers.slice().sort((a, b) => a.x - b.x);
    for (let i = 0; i < byX.length - 1; i++) {
      vOut.push((byX[i].x + byX[i + 1].x) * 0.5);
    }
    const byY = centers.slice().sort((a, b) => a.y - b.y);
    for (let i = 0; i < byY.length - 1; i++) {
      hOut.push((byY[i].y + byY[i + 1].y) * 0.5);
    }
  }

  /**
   * Public: get snap candidates for guides and snapping decisions
   */
  public getCandidates(options?: { exclude?: any[]; container?: Container; rect?: Rectangle; margin?: number }): {
    vLines: number[];
    hLines: number[];
    canvas: { v: number[]; h: number[] };
    threshold: number;
    dims: { width: number; height: number };
    vCenters?: number[];
    hCenters?: number[];
  } {
    const dims = this.getCanvasDimensions();
    const centers = { cx: dims.width / 2, cy: dims.height / 2 };
    
    // Include both full canvas boundaries and student view area boundaries
    // Student view is 1200x1800 centered in the canvas
    const studentViewWidth = 1200;
    const studentViewHeight = 1800;
    const studentViewLeft = (dims.width - studentViewWidth) / 2;
    const studentViewRight = studentViewLeft + studentViewWidth;
    const studentViewTop = (dims.height - studentViewHeight) / 2;
    const studentViewBottom = studentViewTop + studentViewHeight;
    const studentViewCenterX = studentViewLeft + studentViewWidth / 2;
    const studentViewCenterY = studentViewTop + studentViewHeight / 2;
    
    let canvas = { 
      v: [0, studentViewLeft, studentViewCenterX, studentViewRight, centers.cx, dims.width].sort((a, b) => a - b),
      h: [0, studentViewTop, studentViewCenterY, studentViewBottom, centers.cy, dims.height].sort((a, b) => a - b)
    };
    const obj = this.collectObjectSnapLines(options);
    // If a container is provided, convert canvas lines to that container's local space
    if (options?.container) {
      const c = options.container;
      const toLocalX = (x: number) => c.toLocal(new Point(x, 0)).x;
      const toLocalY = (y: number) => c.toLocal(new Point(0, y)).y;
      canvas = {
        v: canvas.v.map(toLocalX),
        h: canvas.h.map(toLocalY),
      };
    }
    return { vLines: obj.vLines, hLines: obj.hLines, canvas, threshold: this.prefs.threshold, dims, vCenters: obj.vCenters, hCenters: obj.hCenters };
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
    // Final fallback to defaults from CanvasDimensionManager
    const defaultDims = canvasDimensionManager.getDefaultDimensions();
    return { width: defaultDims.width, height: defaultDims.height };
  }

  // ---- State & UI helpers ----
  private saveState(): void {
    try { localStorage.setItem('snap.activeMode', this.activeMode); } catch {}
    try { localStorage.setItem('snap.prefs', JSON.stringify(this.prefs)); } catch {}
  }
  private loadState(): void {
    try {
      const m = localStorage.getItem('snap.activeMode');
      const allowed: SnapMode[] = ['smart', 'none'];
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
        if (typeof (this.prefs as any).centerBiasMultiplier !== 'number') this.prefs.centerBiasMultiplier = 2.4;
        if (typeof (this.prefs as any).enableCenterBias !== 'boolean') this.prefs.enableCenterBias = true;
        if (typeof (this.prefs as any).enableMidpoints !== 'boolean') this.prefs.enableMidpoints = true;
        if (typeof (this.prefs as any).enableSymmetryGuides !== 'boolean') this.prefs.enableSymmetryGuides = true;
        if (typeof (this.prefs as any).stickyHysteresis !== 'number') (this.prefs as any).stickyHysteresis = 14;
        
        // Backward compatibility for new Figma-style preferences
        if (typeof (this.prefs as any).enableFigmaMode !== 'boolean') this.prefs.enableFigmaMode = true;
        if (typeof (this.prefs as any).redAlignmentGuides !== 'boolean') this.prefs.redAlignmentGuides = true;
        if (typeof (this.prefs as any).distanceLabelsOnAlt !== 'boolean') this.prefs.distanceLabelsOnAlt = true;
        if (typeof (this.prefs as any).pinkEqualSpacing !== 'boolean') this.prefs.pinkEqualSpacing = true;
        if (typeof (this.prefs as any).magneticSnapping !== 'boolean') this.prefs.magneticSnapping = true;
        if (typeof (this.prefs as any).autoShowOnDrag !== 'boolean') this.prefs.autoShowOnDrag = true;
        if (typeof (this.prefs as any).smartSelectionHandles !== 'boolean') this.prefs.smartSelectionHandles = true;
      }
    } catch {}
  }
  private updateAnchorDisplay(): void {
    const anchor = document.querySelector('[data-snap-anchor]') as HTMLElement | null;
    if (!anchor) return;
    const img = anchor.querySelector('img') as HTMLImageElement;
    const label = anchor.querySelector('.icon-label') as HTMLElement;
    const map: Record<SnapMode, { src: string; text: string }> = {
      smart: { src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', text: 'Smart' },
      none: { src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', text: 'Smart' },
    };
    const v = map[this.activeMode];
    if (img && v) img.src = v.src;
    if (label && v) label.textContent = v.text;
    
    // Update menu item selection state
    const menu = document.querySelector('[data-snap-menu]') as HTMLElement | null;
    if (menu) {
      menu.querySelectorAll('.engine__snap-item').forEach(item => {
        item.classList.remove('engine__snap-item--active');
      });
      const activeItem = menu.querySelector(`[data-snap-option="${this.activeMode}"]`);
      if (activeItem) {
        activeItem.classList.add('engine__snap-item--active');
      }
    }
  }
  private updatePrefsDisplay(): void {
    document.querySelectorAll<HTMLElement>('[data-snap-pref="threshold"]').forEach(btn => {
      const val = parseInt(btn.dataset.value || '0', 10);
      btn.classList.toggle('active', val === this.prefs.threshold);
    });
  }
}

export const snapManager = new SnapManager();
