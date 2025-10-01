/**
 * SnapManager
 * Handles snapping modes and provides helpers for tools to snap points.
 *
 * Modes:
 * - grid: snap to regular grid intersections
 * - smart: enable dynamic guide behavior (objects + canvas centers/edges)
 */

import { Point, Container, Rectangle } from 'pixi.js';
import { canvasDimensionManager } from '../../../utils/CanvasDimensionManager';
import { SNAP_STRENGTH_TOLERANCE } from './config';
import { AxisCandidate, SnapStrength } from './types';

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
  enableQuadrantGuides: boolean; // Optional canvas quadrant guides
  gridStyle: 'dots' | 'lines' | 'hybrid'; // Visual style for grid overlay
  theme: 'auto' | 'light' | 'dark'; // Determines default guide color selection
    
    // Smart Guide Reference Modes
    referenceMode: 'canvas' | 'object' | 'grid'; // how smart guides behave
    showGrid: boolean; // show grid when grid reference mode is active
    gridSpacing: number; // spacing between grid lines in pixels
  }

type CandidateResult = {
  vertical: AxisCandidate[];
  horizontal: AxisCandidate[];
  objectVertical: AxisCandidate[];
  objectHorizontal: AxisCandidate[];
  canvasVertical: AxisCandidate[];
  canvasHorizontal: AxisCandidate[];
  centers: { x: number[]; y: number[] };
  dims: { width: number; height: number };
};

class SnapManager {
  private activeMode: SnapMode = 'smart';
  private prefs: SnapPrefs = { 
    threshold: 6, 
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
    smartSelectionHandles: true,
  enableQuadrantGuides: true,
  gridStyle: 'dots',
  theme: 'auto',
    
    // Smart Guide Reference Modes
    referenceMode: 'canvas',
    showGrid: true,
    gridSpacing: 20
  };
  private temporarilyDisabled = false;

  // Simple accessors
  public getActiveMode(): SnapMode { return this.activeMode; }
  public isSmartEnabled(): boolean { return this.activeMode === 'smart'; }
  public isNoneEnabled(): boolean { return this.activeMode === 'none'; }
  public setTemporaryDisabled(flag: boolean): void { this.temporarilyDisabled = flag; }
  public isTemporarilyDisabled(): boolean { return this.temporarilyDisabled; }
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

    if (this.activeMode === 'none' || this.temporarilyDisabled) {
      return new Point(x, y);
    }

    if (this.activeMode !== 'smart') {
      return new Point(x, y);
    }

    const referenceMode = this.prefs.referenceMode || 'canvas';
    if (referenceMode === 'grid') {
      return this.snapToGrid(p);
    }

    const candidates = this.getCandidates(options);
    const useMagnetic = !!(this.prefs.enableFigmaMode && this.prefs.magneticSnapping);

    const verticalCandidates = referenceMode === 'canvas'
      ? candidates.vertical
      : candidates.objectVertical;
    const horizontalCandidates = referenceMode === 'canvas'
      ? candidates.horizontal
      : candidates.objectHorizontal;

    x = this.snapAxisWithStrength(x, verticalCandidates, useMagnetic);
    y = this.snapAxisWithStrength(y, horizontalCandidates, useMagnetic);

    return new Point(x, y);
  }

  private snapAxisWithStrength(value: number, candidates: AxisCandidate[], useMagnetic: boolean): number {
    if (!candidates.length) {
      return value;
    }

    let bestValue = value;
    let bestStrengthIndex = Number.POSITIVE_INFINITY;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const baseTolerance = SNAP_STRENGTH_TOLERANCE[candidate.strength];
      if (!baseTolerance) continue;
      const effectiveTolerance = this.getEffectiveTolerance(candidate, baseTolerance, useMagnetic);
      const distance = Math.abs(value - candidate.value);
      if (distance > effectiveTolerance) continue;

      const strengthIndex = this.strengthPriority(candidate.strength);
      if (
        strengthIndex < bestStrengthIndex ||
        (strengthIndex === bestStrengthIndex && distance < bestDistance - 0.001)
      ) {
        bestStrengthIndex = strengthIndex;
        bestDistance = distance;
        bestValue = candidate.value;
      }
    }

    return bestValue;
  }

  private getEffectiveTolerance(candidate: AxisCandidate, baseTolerance: number, useMagnetic: boolean): number {
    let tolerance = baseTolerance;
    if (useMagnetic) {
      tolerance *= 1.5;
    }

    if (this.prefs.enableCenterBias) {
      const isCenter = candidate.source === 'canvas-center' || candidate.source === 'object-center';
      if (isCenter) {
        tolerance *= Math.max(1, this.prefs.centerBiasMultiplier || 1);
      }
    }

    return tolerance;
  }

  private strengthPriority(strength: SnapStrength): number {
    switch (strength) {
      case 'strong':
        return 0;
      case 'medium':
        return 1;
      default:
        return 2;
    }
  }

  private getStrengthForSource(source: AxisCandidate['source']): SnapStrength {
    switch (source) {
      case 'canvas-center':
      case 'grid':
        return 'strong';
      case 'canvas-edge':
      case 'object-edge':
      case 'object-edge-to-center':
        return 'medium';
      default:
        return 'weak';
    }
  }

  private toCandidate(value: number, source: AxisCandidate['source'], axis: 'x' | 'y', container?: Container): AxisCandidate {
    let localValue = value;
    if (container) {
      localValue = axis === 'x'
        ? container.toLocal(new Point(value, 0)).x
        : container.toLocal(new Point(0, value)).y;
    }

    return {
      value: localValue,
      source,
      strength: this.getStrengthForSource(source)
    };
  }

  private collectObjectCandidates(options?: { exclude?: any[]; container?: Container; rect?: Rectangle; margin?: number }): {
    vertical: AxisCandidate[];
    horizontal: AxisCandidate[];
    centers: Array<{ x: number; y: number }>;
  } {
    const vertical: AxisCandidate[] = [];
    const horizontal: AxisCandidate[] = [];
    const centers: Array<{ x: number; y: number }> = [];

    const dom = (window as any)._displayManager as { getObjects?: () => any[]; getRoot?: () => Container } | undefined;
    const rootRef = dom?.getRoot ? dom.getRoot() : undefined;
    let objects: any[] = [];

    try {
      const list = dom?.getObjects?.();
      if (Array.isArray(list) && list.length > 0) {
        objects = list;
      } else if (dom?.getRoot) {
        const root = dom.getRoot();
        const acc: any[] = [];
        const visit = (node: any) => {
          if (!node) return;
          acc.push(node);
          if (Array.isArray(node.children)) {
            node.children.forEach(visit);
          }
        };
        if (root) visit(root);
        objects = acc;
      }
    } catch {}

    const excludeSet = new Set((options?.exclude || []).map(o => o));
    const rect = options?.rect;
    const margin = options?.margin ?? 300;
    const container = options?.container;

    for (const obj of objects) {
      if (!obj || obj.visible === false) continue;
      if (rootRef && obj === rootRef) continue;
      if ((obj as any).__isGuide) continue;
      if (excludeSet.has(obj)) continue;
      if (typeof obj.getBounds !== 'function') continue;

      try {
        const b: Rectangle = obj.getBounds();
        if (rect) {
          const ax1 = b.x;
          const ax2 = b.x + b.width;
          const ay1 = b.y;
          const ay2 = b.y + b.height;
          const bx1 = rect.x - margin;
          const bx2 = rect.x + rect.width + margin;
          const by1 = rect.y - margin;
          const by2 = rect.y + rect.height + margin;
          const overlapX = ax2 >= bx1 && ax1 <= bx2;
          const overlapY = ay2 >= by1 && ay1 <= by2;
          if (!overlapX && !overlapY) continue;
        }

        const left = b.x;
        const right = b.x + b.width;
        const top = b.y;
        const bottom = b.y + b.height;
        const centerX = left + b.width / 2;
        const centerY = top + b.height / 2;

        vertical.push(this.toCandidate(left, 'object-edge', 'x', container));
        vertical.push(this.toCandidate(right, 'object-edge', 'x', container));
        const centerCandidateX = this.toCandidate(centerX, 'object-center', 'x', container);
        vertical.push(centerCandidateX);

        horizontal.push(this.toCandidate(top, 'object-edge', 'y', container));
        horizontal.push(this.toCandidate(bottom, 'object-edge', 'y', container));
        const centerCandidateY = this.toCandidate(centerY, 'object-center', 'y', container);
        horizontal.push(centerCandidateY);

        centers.push({ x: centerCandidateX.value, y: centerCandidateY.value });
      } catch {}
    }

    if (this.prefs.enableMidpoints) {
      this.addMidpointCandidates(centers, vertical, horizontal);
    }

    return { vertical, horizontal, centers };
  }

  private addMidpointCandidates(
    centers: Array<{ x: number; y: number }>,
    vertical: AxisCandidate[],
    horizontal: AxisCandidate[]
  ): void {
    const count = centers.length;
    if (count <= 1) return;

    const pushCenter = (x: number, y: number) => {
      const candidateX: AxisCandidate = { value: x, source: 'object-center', strength: 'weak' };
      const candidateY: AxisCandidate = { value: y, source: 'object-center', strength: 'weak' };
      vertical.push(candidateX);
      horizontal.push(candidateY);
    };

    if (count <= 50) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          pushCenter((centers[i].x + centers[j].x) * 0.5, (centers[i].y + centers[j].y) * 0.5);
        }
      }
      return;
    }

    const byX = centers.slice().sort((a, b) => a.x - b.x);
    for (let i = 0; i < byX.length - 1; i++) {
      pushCenter((byX[i].x + byX[i + 1].x) * 0.5, (byX[i].y + byX[i + 1].y) * 0.5);
    }

    const byY = centers.slice().sort((a, b) => a.y - b.y);
    for (let i = 0; i < byY.length - 1; i++) {
      pushCenter((byY[i].x + byY[i + 1].x) * 0.5, (byY[i].y + byY[i + 1].y) * 0.5);
    }
  }

  private buildCanvasCandidates(
    dims: { width: number; height: number },
    container?: Container
  ): { vertical: AxisCandidate[]; horizontal: AxisCandidate[] } {
    const vertical: AxisCandidate[] = [];
    const horizontal: AxisCandidate[] = [];

    const pushVertical = (value: number, source: AxisCandidate['source']) => {
      vertical.push(this.toCandidate(value, source, 'x', container));
    };
    const pushHorizontal = (value: number, source: AxisCandidate['source']) => {
      horizontal.push(this.toCandidate(value, source, 'y', container));
    };

    pushVertical(0, 'canvas-edge');
    pushVertical(dims.width, 'canvas-edge');
    pushVertical(dims.width / 2, 'canvas-center');

    pushHorizontal(0, 'canvas-edge');
    pushHorizontal(dims.height, 'canvas-edge');
    pushHorizontal(dims.height / 2, 'canvas-center');

    if (this.prefs.enableQuadrantGuides) {
      pushVertical(dims.width * 0.25, 'canvas-quadrant');
      pushVertical(dims.width * 0.75, 'canvas-quadrant');
      pushHorizontal(dims.height * 0.25, 'canvas-quadrant');
      pushHorizontal(dims.height * 0.75, 'canvas-quadrant');
    }

    // Preserve student view safe area guides for backward compatibility
    const studentWidth = 1200;
    const studentHeight = 1800;
    const studentLeft = (dims.width - studentWidth) / 2;
    const studentRight = studentLeft + studentWidth;
    const studentTop = (dims.height - studentHeight) / 2;
    const studentBottom = studentTop + studentHeight;

    pushVertical(studentLeft, 'canvas-edge');
    pushVertical(studentRight, 'canvas-edge');
    pushVertical(studentLeft + studentWidth / 2, 'canvas-center');

    pushHorizontal(studentTop, 'canvas-edge');
    pushHorizontal(studentBottom, 'canvas-edge');
    pushHorizontal(studentTop + studentHeight / 2, 'canvas-center');

    return { vertical, horizontal };
  }

  private mergeCandidates(primary: AxisCandidate[], secondary: AxisCandidate[]): AxisCandidate[] {
    const map = new Map<string, AxisCandidate>();
    const push = (candidate: AxisCandidate) => {
      const key = `${candidate.source}:${Math.round(candidate.value * 1000)}`;
      const existing = map.get(key);
      if (!existing || this.strengthPriority(candidate.strength) < this.strengthPriority(existing.strength)) {
        map.set(key, candidate);
      }
    };

    primary.forEach(push);
    secondary.forEach(push);

    return Array.from(map.values()).sort((a, b) => a.value - b.value);
  }

  public getCandidates(options?: { exclude?: any[]; container?: Container; rect?: Rectangle; margin?: number }): CandidateResult {
    const dims = this.getCanvasDimensions();
    const objectCandidates = this.collectObjectCandidates(options);
    const canvasCandidates = this.buildCanvasCandidates(dims, options?.container);

    const centersX = objectCandidates.centers.map(c => c.x);
    const centersY = objectCandidates.centers.map(c => c.y);

    canvasCandidates.vertical
      .filter(candidate => candidate.source === 'canvas-center')
      .forEach(candidate => centersX.push(candidate.value));
    canvasCandidates.horizontal
      .filter(candidate => candidate.source === 'canvas-center')
      .forEach(candidate => centersY.push(candidate.value));

    return {
      vertical: this.mergeCandidates(canvasCandidates.vertical, objectCandidates.vertical),
      horizontal: this.mergeCandidates(canvasCandidates.horizontal, objectCandidates.horizontal),
      objectVertical: objectCandidates.vertical,
      objectHorizontal: objectCandidates.horizontal,
      canvasVertical: canvasCandidates.vertical,
      canvasHorizontal: canvasCandidates.horizontal,
      centers: { x: centersX, y: centersY },
      dims
    };
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
        if (typeof (this.prefs as any).enableQuadrantGuides !== 'boolean') this.prefs.enableQuadrantGuides = true;
        const gridStyle = (this.prefs as any).gridStyle;
        if (gridStyle !== 'dots' && gridStyle !== 'lines' && gridStyle !== 'hybrid') {
          this.prefs.gridStyle = 'dots';
        }
        const theme = (this.prefs as any).theme;
        if (theme !== 'auto' && theme !== 'light' && theme !== 'dark') {
          this.prefs.theme = 'auto';
        }
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

  /**
   * Snap to grid positions only
   */
  private snapToGrid(p: Point): Point {
    const gridSpacing = this.prefs.gridSpacing || 20;
    const threshold = SNAP_STRENGTH_TOLERANCE.strong;
    
    const x = p.x;
    const y = p.y;
    
    // Find nearest grid points
    const nearestGridX = Math.round(x / gridSpacing) * gridSpacing;
    const nearestGridY = Math.round(y / gridSpacing) * gridSpacing;
    
    // Snap if within threshold
    const snapX = Math.abs(x - nearestGridX) <= threshold ? nearestGridX : x;
    const snapY = Math.abs(y - nearestGridY) <= threshold ? nearestGridY : y;
    
    return new Point(snapX, snapY);
  }
}

export const snapManager = new SnapManager();
