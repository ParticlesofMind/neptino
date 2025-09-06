import { Container, FederatedPointerEvent, Graphics, Point, Rectangle, Text } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
import { snapManager } from '../SnapManager';
import { ClickSelection } from './clickSelection';
import { TransformController } from './TransformController';
import { TransformHandle, SelectionGroup } from './types';

type Modifiers = { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean };

export class AABBSelectionTool extends BaseTool {
  private click = new ClickSelection();
  private transformer = new TransformController();
  private selected: any[] = [];
  private group: SelectionGroup | null = null;
  private container: Container | null = null;
  private uiContainer: Container | null = null;
  private marquee: { active: boolean; start: Point; gfx: Graphics | null; shift: boolean } = {
    active: false,
    start: new Point(),
    gfx: null,
    shift: false,
  };
  private isDraggingGroup = false;
  private dragStart = new Point();
  public isDragging: boolean = false; // for logging/UX
  private mode: 'idle' | 'drag' | 'scale' | 'rotate' = 'idle';
  // Size indicator UI (below selection)
  private sizeIndicator: { container: Container; bg: Graphics; text: Text } | null = null;
  // Smart guide visuals
  private guideGfx: Graphics | null = null;
  // Clipboard for copy/paste
  private clipboard: Array<{ type: string; meta?: any; textInfo?: { text: string; style: any; x: number; y: number } }> = [];
  private pasteCount: number = 0;

  constructor() {
    super('selection', 'default');
  }

  // Handle keyboard shortcuts when selection tool is active
  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;
    const key = event.key;
    const isMeta = event.metaKey || event.ctrlKey;

    // Copy
    if (isMeta && (key === 'c' || key === 'C')) {
      const copied = this.copySelectionToClipboard();
      if (copied) {
        this.pasteCount = 0; // reset paste offset chain after a new copy
        event.preventDefault();
        console.log('📋 SELECTION: Copied selection to clipboard');
        return;
      }
    }

    // Paste
    if (isMeta && (key === 'v' || key === 'V')) {
      const targetContainer = this.container || this.displayManager?.getRoot();
      if (targetContainer) {
        this.pasteClipboard(targetContainer);
        event.preventDefault();
        console.log('📋 SELECTION: Pasted clipboard');
        return;
      }
    }
    if ((key === 'Backspace' || key === 'Delete') && this.selected.length > 0) {
      // Delete selected objects
      const toRemove = [...this.selected];
      toRemove.forEach((obj) => {
        try {
          if (this.displayManager && (this.displayManager as any).remove) {
            (this.displayManager as any).remove(obj);
          } else if (obj?.parent) {
            obj.parent.removeChild(obj);
            obj.destroy?.();
          }
        } catch {}
      });
      this.selected = [];
      this.clearGroup();
      // Ensure any size indicator overlay is removed when deleting
      this.removeSizeIndicator();
      this.isDraggingGroup = false;
      this.isDragging = false;
      this.mode = 'idle';
      this.cursor = 'default';
      event.preventDefault();
      console.log('🗑️ SELECTION: Deleted selected objects via keyboard');
    }
    // Escape clears selection
    if (key === 'Escape' && this.selected.length > 0) {
      this.selected = [];
      this.clearGroup();
      this.removeSizeIndicator();
      this.isDraggingGroup = false;
      this.isDragging = false;
      this.mode = 'idle';
      this.cursor = 'default';
      event.preventDefault();
      console.log('➡️ SELECTION: Cleared selection via Escape');
    }
  }

  // Provided by ToolManager to keep helper visuals in the UI layer (sibling of drawing)
  public setUILayer(container: Container) {
    this.uiContainer = container;
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    this.container = container;

    const p = container.toLocal(event.global);

    // Check handle hit
    const handle = this.findHandleAtPoint(p, true);
    if (handle && this.group) {
      // Set cursor/mode based on handle
      if (handle.type === 'rotation') {
        this.mode = 'rotate';
        this.cursor = "url('/src/assets/cursors/rotate-cursor.svg') 12 12, crosshair";
      } else {
        this.mode = 'scale';
        this.cursor = this.cursorForHandle(handle);
      }
      this.isDragging = true;
      this.transformer.begin(
        this.selected,
        this.group,
        container,
        handle,
        p,
        {
          // Provide canvas bounds so scaling is constrained within margins
          getCanvasBounds: this.manager && this.manager.getCanvasBounds
            ? () => this.manager.getCanvasBounds()
            : undefined,
          allowMirroring: true,
          restorePivotOnEnd: false,
          rotationSnapDeg: 15,
          scaleSnapStep: 0.05,
          modifiers: { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey },
        }
      );
      return;
    }

    // If clicking inside existing selection frame (even if not on the object), start dragging
    if (this.group && this.pointInRect(p, this.group.bounds)) {
      this.isDraggingGroup = true;
      this.mode = 'drag';
      this.cursor = 'grabbing';
      this.isDragging = true;
      this.dragStart.copyFrom(p);
      return;
    }

    // Click selection path on drawing objects
    const result = this.click.handleClick(p, container, event.shiftKey);
    if (result.clickedObject) {
      const action = this.click.getSelectionAction(result.clickedObject, this.selected, event.shiftKey);
      this.selected = this.click.applySelectionAction(action, this.selected);
      this.refreshGroup();

      // If clicked inside selection box, start dragging group
      const bounds = this.group?.bounds;
      if (bounds && this.pointInRect(p, bounds)) {
        this.isDraggingGroup = true;
        this.mode = 'drag';
        this.cursor = 'grabbing';
        this.isDragging = true;
        this.dragStart.copyFrom(p);
      }
      return;
    }

    // Start marquee
    this.startMarquee(p, container, !!event.shiftKey);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    const p = container.toLocal(event.global);

    // Defensive: if no button is pressed, end any dragging state
    // Some environments may miss pointerup; this prevents sticky drags
    try {
      const buttons = (event as any).buttons as number | undefined;
      if (this.isDraggingGroup && (buttons === 0 || buttons === undefined)) {
        this.isDraggingGroup = false;
        this.isDragging = false;
        this.mode = 'idle';
        this.cursor = 'default';
      }
    } catch {}

    if (this.group && this.group.objects.length > 0 && (this.transformer as any).isActive && (this.transformer as any).isActive()) {
      // If a transform is in progress, update
      this.transformer.update(p, { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey });
      this.refreshGroupBoundsOnly();
      return;
    }

    if (this.isDraggingGroup && this.group) {
      // Compute proposed delta (apply snapping to pointer position first)
      const snapped = snapManager.snapPoint(p, { exclude: this.selected });
      let dx = snapped.x - this.dragStart.x;
      let dy = snapped.y - this.dragStart.y;

      // Constrain movement to canvas content bounds if available
      try {
        if (this.manager && this.manager.getCanvasBounds) {
          const canvas = this.manager.getCanvasBounds();
          const b = this.group.bounds;
          // Allowed deltas so the group stays within [left, right] x [top, bottom]
          const maxLeft = canvas.left - b.x; // negative value or 0
          const maxRight = canvas.right - (b.x + b.width); // positive value or 0
          const maxUp = canvas.top - b.y; // negative or 0
          const maxDown = canvas.bottom - (b.y + b.height); // positive or 0
          // Clamp dx, dy to allowed ranges
          dx = Math.min(Math.max(dx, maxLeft), maxRight);
          dy = Math.min(Math.max(dy, maxUp), maxDown);
        }
      } catch {}

      if (dx !== 0 || dy !== 0) {
        this.selected.forEach((obj) => {
          if (obj.position) {
            obj.position.x += dx;
            obj.position.y += dy;
          }
        });
        // Update drag start by the applied delta (not raw p) to maintain precision near edges
        this.dragStart.x += dx;
        this.dragStart.y += dy;
        this.refreshGroupBoundsOnly();

        // Update smart guide visuals if enabled
        try { this.updateSmartGuides(); } catch {}
      }
      return;
    }

    if (this.marquee.active) {
      this.updateMarquee(p);
      return;
    }

    // Hover cursor updates when idle
    if (this.group) {
      const hoverHandle = this.findHandleAtPoint(p, true);
      if (hoverHandle) {
        // Update cursor based on hovered handle
        this.cursor = this.cursorForHandle(hoverHandle);
      } else if (this.pointInRect(p, this.group.bounds)) {
        this.cursor = 'move';
      } else {
        this.cursor = 'default';
      }
    } else {
      this.cursor = 'default';
    }
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    const p = container.toLocal(event.global);

    if (this.group) {
      this.transformer.end();
    }
    if (this.isDraggingGroup) {
      this.isDraggingGroup = false;
    }
    if (this.marquee.active) {
      this.finishMarquee(p, container);
    }
    // Reset mode/cursor
    this.mode = 'idle';
    this.isDragging = false;
    this.cursor = 'default';
    this.clearGuides();
  }

  onActivate(): void {
    super.onActivate();
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.clearGroup();
    if (this.marquee.gfx && this.marquee.gfx.parent) this.marquee.gfx.parent.removeChild(this.marquee.gfx);
    this.marquee = { active: false, start: new Point(), gfx: null, shift: false };
    // Remove size indicator
    this.removeSizeIndicator();
  }

  // ----- Group visuals -----
  private refreshGroup() {
    this.clearGroup();
    if (!this.container || this.selected.length === 0) return;

    const bounds = this.computeCombinedBoundsLocal(this.selected, this.container);
    const selectionBox = new Graphics();
    selectionBox.name = 'selection-box';
    selectionBox.rect(0, 0, bounds.width, bounds.height);
    selectionBox.stroke({ width: 2, color: 0x3b82f6 });
    selectionBox.position.set(bounds.x, bounds.y);
    (this.uiContainer || this.container).addChild(selectionBox);

    const { handles } = this.createHandles(bounds);
    handles.forEach(h => (this.uiContainer || this.container)!.addChild(h.graphics));

    this.group = {
      objects: [...this.selected],
      bounds,
      transformHandles: handles,
      selectionBox,
    } as any;

    // Update size indicator visual
    this.updateSizeIndicator(bounds);

    // Notify UI about selection context
    this.emitSelectionContext();
  }

  private refreshGroupBoundsOnly() {
    if (!this.group || !this.container) return;
    const bounds = this.computeCombinedBoundsLocal(this.group.objects, this.container);
    this.group.bounds = bounds;
    // update selection box
    const g = this.group.selectionBox;
    g.clear();
    g.rect(0, 0, bounds.width, bounds.height);
    g.stroke({ width: 2, color: 0x3b82f6 });
    g.position.set(bounds.x, bounds.y);
    // update handles
    this.group.transformHandles.forEach(h => {
      const s = 8; const hs = s / 2;
      const pos = this.getHandlePosition(bounds, h.position);
      h.graphics.position.set(pos.x, pos.y);
      h.bounds.x = pos.x - hs; h.bounds.y = pos.y - hs;
      h.center = new Point(pos.x, pos.y);
    });
    // update size indicator
    this.updateSizeIndicator(bounds);
  }

  private clearGroup() {
    if (!this.group) return;
    const parent = this.group.selectionBox.parent;
    if (parent) parent.removeChild(this.group.selectionBox);
    this.group.transformHandles.forEach(h => h.graphics.parent && h.graphics.parent.removeChild(h.graphics));
    this.group = null;
    // Notify that selection is cleared
    this.emitSelectionContext();
    this.clearGuides();
  }

  // ----- Smart Guides -----
  private clearGuides(): void {
    if (this.guideGfx && this.guideGfx.parent) {
      this.guideGfx.parent.removeChild(this.guideGfx);
    }
    this.guideGfx = null;
  }

  private updateSmartGuides(): void {
    if (!this.uiContainer && !this.container) return;
    if (!this.group) return;
    if (!snapManager.isSmartEnabled()) { this.clearGuides(); return; }

    const ui = this.uiContainer || this.container!;
    const b = this.group.bounds;

    // Prepare gfx
    if (!this.guideGfx) {
      this.guideGfx = new Graphics();
      this.guideGfx.zIndex = 10000;
      ui.addChild(this.guideGfx);
    } else {
      this.guideGfx.clear();
    }

    // Canvas centers
    const canvas = document.getElementById('pixi-canvas') as HTMLCanvasElement | null;
    const cw = canvas?.width || 0; const ch = canvas?.height || 0;
    const cx = cw / 2; const cy = ch / 2;
    const gbx = b.x + b.width / 2; const gby = b.y + b.height / 2;
    const threshold = 6;

    // Draw center alignment guides when close
    const guideColor = 0x3b82f6; // elegant blue
    if (Math.abs(gbx - cx) <= threshold) {
      this.guideGfx.moveTo(cx, 0).lineTo(cx, ch).stroke({ width: 1, color: guideColor, alpha: 0.8 });
    }
    if (Math.abs(gby - cy) <= threshold) {
      this.guideGfx.moveTo(0, cy).lineTo(cw, cy).stroke({ width: 1, color: guideColor, alpha: 0.8 });
    }

    // Canvas edge alignment guides
    if (Math.abs(b.x - 0) <= threshold) {
      this.guideGfx.moveTo(0, 0).lineTo(0, ch).stroke({ width: 1, color: guideColor, alpha: 0.6 });
    }
    if (Math.abs(b.x + b.width - cw) <= threshold) {
      this.guideGfx.moveTo(cw, 0).lineTo(cw, ch).stroke({ width: 1, color: guideColor, alpha: 0.6 });
    }
    if (Math.abs(b.y - 0) <= threshold) {
      this.guideGfx.moveTo(0, 0).lineTo(cw, 0).stroke({ width: 1, color: guideColor, alpha: 0.6 });
    }
    if (Math.abs(b.y + b.height - ch) <= threshold) {
      this.guideGfx.moveTo(0, ch).lineTo(cw, ch).stroke({ width: 1, color: guideColor, alpha: 0.6 });
    }
  }

  // ----- Copy/Paste Helpers -----
  private copySelectionToClipboard(): boolean {
    if (!this.selected || this.selected.length === 0) return false;
    const items: Array<{ type: string; meta?: any; textInfo?: { text: string; style: any; x: number; y: number } }> = [];

    for (const obj of this.selected) {
      const type = this.detectToolType(obj) || (obj.constructor?.name === 'Text' ? 'text' : null);
      if (!type) continue;
      if (type === 'text') {
        // Duplicate PIXI Text objects
        try {
          const txt = obj as any;
          const text = String(txt.text ?? '');
          const style = { ...(txt.style || {}) };
          items.push({ type: 'text', textInfo: { text, style, x: txt.x, y: txt.y } });
        } catch {}
        continue;
      }
      const meta = (obj as any).__meta;
      if (!meta) continue; // only copy objects with metadata
      // Store a shallow clone of meta to avoid mutation
      items.push({ type, meta: JSON.parse(JSON.stringify(meta)) });
    }

    if (items.length === 0) return false;
    this.clipboard = items;
    return true;
  }

  private pasteClipboard(container: Container): void {
    if (!this.clipboard || this.clipboard.length === 0) return;
    const bump = 12;
    const offset = ++this.pasteCount * bump;
    const created: any[] = [];

    for (const item of this.clipboard) {
      try {
        if (item.type === 'shapes' && item.meta) {
          const gfx = this.createShapeFromMeta(item.meta, offset);
          if (!gfx) continue;
          (gfx as any).__toolType = 'shapes';
          (gfx as any).__meta = item.meta;
          container.addChild(gfx);
          this.displayManager?.add(gfx, container);
          created.push(gfx);
          continue;
        }
        if (item.type === 'pen' && item.meta) {
          const gfx = this.createPenFromMeta(item.meta, offset);
          if (!gfx) continue;
          (gfx as any).__toolType = 'pen';
          (gfx as any).__meta = item.meta;
          container.addChild(gfx);
          this.displayManager?.add(gfx, container);
          created.push(gfx);
          continue;
        }
        if (item.type === 'brush' && item.meta) {
          const gfx = this.createBrushFromMeta(item.meta, offset);
          if (!gfx) continue;
          (gfx as any).__toolType = 'brush';
          (gfx as any).__meta = item.meta;
          container.addChild(gfx);
          this.displayManager?.add(gfx, container);
          created.push(gfx);
          continue;
        }
        if (item.type === 'text' && item.textInfo) {
          const t = new Text({ text: item.textInfo.text, style: item.textInfo.style });
          t.x = (item.textInfo.x || 0) + offset;
          t.y = (item.textInfo.y || 0) + offset;
          (t as any).isTextObject = true;
          container.addChild(t);
          this.displayManager?.add(t, container);
          created.push(t);
          continue;
        }
      } catch (e) {
        console.warn('⚠️ Paste failed for item', item, e);
      }
    }

    if (created.length > 0) {
      // Select newly created items
      this.selected = created;
      this.refreshGroup();
    }
  }

  private createBrushFromMeta(meta: any, offset: number): Graphics | null {
    if (!meta || !meta.points || meta.points.length < 2) return null;
    const gfx = new Graphics();
    const color = this.colorToNumber(meta.color) ?? 0x000000;
    const width = Math.max(1, meta.size ?? 2);
    const pts = meta.points.map((p: any) => ({ x: (p.x || 0) + offset, y: (p.y || 0) + offset }));
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    // update meta coordinates for the clone
    try { meta.points = pts; } catch {}
    return gfx;
  }

  private createPenFromMeta(meta: any, offset: number): Graphics | null {
    if (!meta || !meta.nodes || meta.nodes.length < 2) return null;
    const gfx = new Graphics();
    const color = this.colorToNumber(meta.strokeColor) ?? 0x000000;
    const width = Math.max(1, meta.size ?? 2);
    const nodes = (meta.nodes as Array<{ x: number; y: number }>).map(n => ({ x: (n.x || 0) + offset, y: (n.y || 0) + offset }));
    gfx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) gfx.lineTo(nodes[i].x, nodes[i].y);
    if (meta.closed) {
      gfx.lineTo(nodes[0].x, nodes[0].y);
      gfx.closePath();
      const fillNum = this.colorToNumber(meta.fillColor);
      if (fillNum !== undefined) gfx.fill({ color: fillNum });
    }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    try { meta.nodes = nodes; } catch {}
    return gfx;
  }

  private createShapeFromMeta(meta: any, offset: number): Graphics | null {
    if (!meta) return null;
    const gfx = new Graphics();
    const strokeColor = this.colorToNumber(meta.strokeColor) ?? 0x000000;
    const strokeWidth = Math.max(1, meta.strokeWidth ?? 2);
    const fillColorNum = this.colorToNumber(meta.fillColor);
    const fillEnabled = meta.fillEnabled === true || (fillColorNum !== undefined);

    const x = (meta.x ?? meta.startX ?? 0) + offset;
    const y = (meta.y ?? meta.startY ?? 0) + offset;
    const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0));
    const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));

    switch (meta.shapeType) {
      case 'rectangle': {
        const r = meta.cornerRadius ?? 0;
        if (r > 0) gfx.roundRect(x, y, w, h, r); else gfx.rect(x, y, w, h);
        break;
      }
      case 'circle': {
        const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(w, h) / 2;
        gfx.ellipse(cx, cy, radius, radius);
        break;
      }
      case 'ellipse': {
        const cx = x + w / 2; const cy = y + h / 2; gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2));
        break;
      }
      case 'triangle': {
        const topX = x + w / 2, topY = y;
        const blX = x, blY = y + h;
        const brX = x + w, brY = y + h;
        gfx.moveTo(topX, topY).lineTo(blX, blY).lineTo(brX, brY).closePath();
        break;
      }
      case 'line': {
        const x1 = meta.startX !== undefined ? meta.startX + offset : x;
        const y1 = meta.startY !== undefined ? meta.startY + offset : y;
        const x2 = meta.currentX !== undefined ? meta.currentX + offset : (x + w);
        const y2 = meta.currentY !== undefined ? meta.currentY + offset : (y + h);
        gfx.moveTo(x1, y1).lineTo(x2, y2);
        break;
      }
      case 'arrow': {
        const x1 = meta.startX !== undefined ? meta.startX + offset : x;
        const y1 = meta.startY !== undefined ? meta.startY + offset : y;
        const x2 = meta.currentX !== undefined ? meta.currentX + offset : (x + w);
        const y2 = meta.currentY !== undefined ? meta.currentY + offset : (y + h);
        gfx.moveTo(x1, y1).lineTo(x2, y2);
        const dx = x2 - x1, dy = y2 - y1; const angle = Math.atan2(dy, dx);
        const length = Math.hypot(dx, dy); const headLength = Math.min(20, length * 0.3); const headAngle = Math.PI / 6;
        const hx1 = x2 - headLength * Math.cos(angle - headAngle);
        const hy1 = y2 - headLength * Math.sin(angle - headAngle);
        const hx2 = x2 - headLength * Math.cos(angle + headAngle);
        const hy2 = y2 - headLength * Math.sin(angle + headAngle);
        gfx.moveTo(x2, y2).lineTo(hx1, hy1).moveTo(x2, y2).lineTo(hx2, hy2);
        break;
      }
      case 'polygon': {
        const sides = Math.max(3, meta.sides ?? 5);
        const cx = x + w / 2, cy = y + h / 2;
        const rx = w / 2, ry = h / 2;
        for (let i = 0; i < sides; i++) {
          const theta = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const px = cx + rx * Math.cos(theta);
          const py = cy + ry * Math.sin(theta);
          if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
        }
        gfx.closePath();
        break;
      }
      default: {
        gfx.rect(x, y, w, h);
      }
    }

    if (fillEnabled && fillColorNum !== undefined) {
      gfx.fill({ color: fillColorNum });
    }
    gfx.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });

    // Update meta positions for the clone
    try {
      if (meta.x !== undefined) meta.x = x; if (meta.y !== undefined) meta.y = y;
      if (meta.startX !== undefined) meta.startX += offset; if (meta.startY !== undefined) meta.startY += offset;
      if (meta.currentX !== undefined) meta.currentX += offset; if (meta.currentY !== undefined) meta.currentY += offset;
    } catch {}
    return gfx;
  }

  // Determine selection type and broadcast to UI so options can be shown
  private emitSelectionContext(): void {
    try {
      const type = this.determineSelectionType();
      const detail = { type, count: this.selected.length } as any;
      const evt = new CustomEvent('selection:context', { detail });
      document.dispatchEvent(evt);
    } catch {}
  }

  private determineSelectionType(): string | null {
    if (!this.selected || this.selected.length === 0) return null;
    const detect = (obj: any): string | null => {
      // Walk up a few ancestors to find tagged containers
      let cur: any = obj;
      for (let i = 0; i < 5 && cur; i++) {
        if (cur.__toolType) return String(cur.__toolType);
        if (cur.isTextObject === true || cur.constructor?.name === 'Text') return 'text';
        if (cur.isTable === true || cur.tableCell) return 'tables';
        cur = cur.parent;
      }
      return null;
    };
    let t: string | null = null;
    for (const obj of this.selected) {
      const tt = detect(obj);
      if (!t) t = tt;
      else if (tt && t !== tt) return 'mixed';
    }
    return t || 'unknown';
  }

  private computeCombinedBoundsLocal(objects: any[], container: Container): Rectangle {
    // Union world-space AABBs
    let minWX = Infinity, minWY = Infinity, maxWX = -Infinity, maxWY = -Infinity;
    objects.forEach(obj => {
      try {
        const b = obj.getBounds(); // world-space
        minWX = Math.min(minWX, b.x); minWY = Math.min(minWY, b.y);
        maxWX = Math.max(maxWX, b.x + b.width); maxWY = Math.max(maxWY, b.y + b.height);
      } catch {}
    });
    if (!isFinite(minWX)) return new Rectangle(0, 0, 0, 0);

    // Convert world-space corners to container-local
    const tl = container.toLocal(new Point(minWX, minWY));
    const br = container.toLocal(new Point(maxWX, maxWY));
    const x = Math.min(tl.x, br.x);
    const y = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x);
    const h = Math.abs(br.y - tl.y);
    return new Rectangle(x, y, w, h);
  }

  private createHandles(bounds: Rectangle): { handles: TransformHandle[] } {
    const positions: Array<{ key: TransformHandle['position']; x: number; y: number }>
      = [
        { key: 'tl', x: bounds.x, y: bounds.y },
        { key: 'tr', x: bounds.x + bounds.width, y: bounds.y },
        { key: 'br', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { key: 'bl', x: bounds.x, y: bounds.y + bounds.height },
        { key: 't', x: bounds.x + bounds.width / 2, y: bounds.y },
        { key: 'r', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
        { key: 'b', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
        { key: 'l', x: bounds.x, y: bounds.y + bounds.height / 2 },
      ];
    const size = 8; const hs = size / 2;
    let cornerIdx = 0;
    let edgeIdx = 0;
    const handles = positions.map((p, idx) => {
      const g = new Graphics();
      g.name = `transform-handle-${p.key}`;
      g.rect(-hs, -hs, size, size);
      g.fill({ color: 0xffffff });
      g.stroke({ width: 1, color: 0x3b82f6 });
      g.position.set(p.x, p.y);
      const isCorner = idx < 4;
      const index = isCorner ? cornerIdx++ : edgeIdx++;
      return {
        type: isCorner ? 'corner' : 'edge',
        position: p.key as any,
        graphics: g,
        bounds: new Rectangle(p.x - hs, p.y - hs, size, size),
        index,
        center: new Point(p.x, p.y),
      } as TransformHandle;
    });
    // No explicit rotation handle; rotation via diagonal hotspots around corners
    return { handles };
  }

  private getHandlePosition(bounds: Rectangle, position: TransformHandle['position']): Point {
    switch (position) {
      case 'tl': return new Point(bounds.x, bounds.y);
      case 'tr': return new Point(bounds.x + bounds.width, bounds.y);
      case 'br': return new Point(bounds.x + bounds.width, bounds.y + bounds.height);
      case 'bl': return new Point(bounds.x, bounds.y + bounds.height);
      case 't': return new Point(bounds.x + bounds.width / 2, bounds.y);
      case 'r': return new Point(bounds.x + bounds.width, bounds.y + bounds.height / 2);
      case 'b': return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height);
      case 'l': return new Point(bounds.x, bounds.y + bounds.height / 2);
      default: return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    }
  }

  private getRotationHandlePosition(bounds: Rectangle): Point {
    // Deprecated: rotation handle removed. Retained for potential future use.
    const offset = 24;
    return new Point(bounds.x + bounds.width / 2, bounds.y - offset);
  }

  private findHandleAtPoint(point: Point, includeRotationHotspots: boolean = false): TransformHandle | null {
    if (!this.group) return null;
    for (const h of this.group.transformHandles) {
      const b = h.bounds;
      if (point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height) {
        return h;
      }
    }

    // Rotation hotspots near corners (diagonal zones outside the box)
    if (includeRotationHotspots && this.group) {
      const b = this.group.bounds;
      const margin = 18; // hotspot distance outside the bounds
      const thresh = 6;  // how close to diagonal (|dx - dy|)

      // TL hotspot: above and left
      const dxTL = b.x - point.x; // >=0 if left of left edge
      const dyTL = b.y - point.y; // >=0 if above top edge
      if (dxTL >= 0 && dyTL >= 0 && dxTL < margin && dyTL < margin && Math.abs(dxTL - dyTL) <= thresh) {
        return { type: 'rotation', position: 'rotate' } as TransformHandle;
      }
      // TR hotspot: above and right
      const dxTR = point.x - (b.x + b.width);
      const dyTR = b.y - point.y;
      if (dxTR >= 0 && dyTR >= 0 && dxTR < margin && dyTR < margin && Math.abs(dxTR - dyTR) <= thresh) {
        return { type: 'rotation', position: 'rotate' } as TransformHandle;
      }
      // BL hotspot: below and left
      const dxBL = b.x - point.x;
      const dyBL = point.y - (b.y + b.height);
      if (dxBL >= 0 && dyBL >= 0 && dxBL < margin && dyBL < margin && Math.abs(dxBL - dyBL) <= thresh) {
        return { type: 'rotation', position: 'rotate' } as TransformHandle;
      }
      // BR hotspot: below and right
      const dxBR = point.x - (b.x + b.width);
      const dyBR = point.y - (b.y + b.height);
      if (dxBR >= 0 && dyBR >= 0 && dxBR < margin && dyBR < margin && Math.abs(dxBR - dyBR) <= thresh) {
        return { type: 'rotation', position: 'rotate' } as TransformHandle;
      }
    }
    return null;
  }

  // ----- Marquee helpers -----
  private startMarquee(p: Point, container: Container, shift: boolean) {
    this.marquee.active = true;
    this.marquee.start.copyFrom(p);
    this.marquee.shift = shift;
    if (!this.marquee.gfx) this.marquee.gfx = new Graphics();
    const g = this.marquee.gfx;
    g.clear();
    g.name = 'selection-marquee';
    (this.uiContainer || container).addChild(g);
    this.updateMarquee(p);
  }
  private updateMarquee(current: Point) {
    const g = this.marquee.gfx; if (!g) return;
    const r = this.rectFrom(this.marquee.start, current);
    g.clear();
    g.rect(r.x, r.y, r.width, r.height);
    g.stroke({ width: 1, color: 0x3b82f6, alpha: 0.9 });
    g.fill({ color: 0x3b82f6, alpha: 0.12 });
  }
  private finishMarquee(p: Point, container: Container) {
    if (!this.marquee.active) return;
    const r = this.rectFrom(this.marquee.start, p);
    const picked: any[] = [];
    const children = container.children.slice();
    for (const child of children) {
      if (!this.click.isSelectableObject(child)) continue;
      try {
        const b = child.getBounds();
        if (this.intersects(r, b)) picked.push(child);
      } catch {}
    }
    if (this.marquee.shift) {
      const set = new Set<any>(this.selected); picked.forEach(o => set.add(o));
      this.selected = Array.from(set);
    } else {
      this.selected = picked;
    }
    if (this.marquee.gfx && this.marquee.gfx.parent) this.marquee.gfx.parent.removeChild(this.marquee.gfx);
    this.marquee.active = false;
    this.refreshGroup();
  }

  private rectFrom(a: Point, b: Point): Rectangle {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
    return new Rectangle(x, y, w, h);
  }
  private intersects(a: Rectangle, b: Rectangle): boolean {
    return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
  }
  private pointInRect(p: Point, r: Rectangle): boolean {
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  }

  private cursorForHandle(h: TransformHandle): string {
    if (h.type === 'rotation') return "url('/src/assets/cursors/rotate-cursor.svg') 12 12, crosshair";
    if (h.type === 'edge') {
      switch (h.position) {
        case 't':
        case 'b':
          return 'ns-resize';
        case 'l':
        case 'r':
          return 'ew-resize';
      }
    }
    // corners
    switch (h.position) {
      case 'tl':
      case 'br':
        return 'nwse-resize';
      case 'tr':
      case 'bl':
        return 'nesw-resize';
      default:
        return 'move';
    }
  }

  // ----- Size indicator below selection -----
  private updateSizeIndicator(bounds: Rectangle): void {
    if (!this.container) return;
    const ui = this.uiContainer || this.container;

    const width = Math.max(0, Math.round(bounds.width));
    const height = Math.max(0, Math.round(bounds.height));
    const label = `${width} x ${height}`;

    if (!this.sizeIndicator) {
      const container = new Container();
      container.name = 'selection-size-indicator';
      const bg = new Graphics();
      const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 12, fill: 0x111111 } });
      container.addChild(bg);
      container.addChild(text);
      ui.addChild(container);
      this.sizeIndicator = { container, bg, text };
    } else {
      this.sizeIndicator.text.text = label;
    }

    // Layout: measure and draw background
    const paddingX = 6;
    const paddingY = 3;
    const textW = (this.sizeIndicator.text as any).width || 0;
    const textH = (this.sizeIndicator.text as any).height || 0;
    const boxW = Math.ceil(textW + paddingX * 2);
    const boxH = Math.ceil(textH + paddingY * 2);

    this.sizeIndicator.bg.clear();
    this.sizeIndicator.bg.rect(0, 0, boxW, boxH);
    this.sizeIndicator.bg.fill({ color: 0xffffff, alpha: 1 });
    this.sizeIndicator.bg.stroke({ width: 1, color: 0x3b82f6 });

    // Position text
    this.sizeIndicator.text.position.set(paddingX, paddingY - 1);

    // Position container centered below bounds
    const cx = bounds.x + bounds.width * 0.5 - boxW * 0.5;
    const cy = bounds.y + bounds.height + 8; // 8px gap below
    this.sizeIndicator.container.position.set(cx, cy);
  }

  private removeSizeIndicator(): void {
    if (this.sizeIndicator) {
      if (this.sizeIndicator.container.parent) {
        this.sizeIndicator.container.parent.removeChild(this.sizeIndicator.container);
      }
      this.sizeIndicator = null;
    }
  }

  // ====== Apply settings to currently selected objects ======
  public applySettingsToSelection(toolName: string, settings: any): void {
    if (!this.selected || this.selected.length === 0) return;
    const effectiveTool = toolName;
    let changed = false;

    for (const obj of this.selected) {
      const t = this.detectToolType(obj);
      if (!t || t !== effectiveTool) continue;
      const meta = (obj as any).__meta || {};

      try {
        switch (t) {
          case 'brush':
            changed = this.restyleBrush(obj as any, meta, settings) || changed;
            break;
          case 'pen':
            changed = this.restylePen(obj as any, meta, settings) || changed;
            break;
          case 'shapes':
            changed = this.restyleShape(obj as any, meta, settings) || changed;
            break;
          case 'text':
            changed = this.restyleText(obj as any, settings) || changed;
            break;
          default:
            break;
        }
      } catch (e) {
        console.warn('⚠️ Selection restyle failed for object', e);
      }
    }

    if (changed) {
      // Recompute selection visuals to reflect new bounds
      this.refreshGroup();
    }
  }

  private detectToolType(obj: any): string | null {
    // Walk up a few parents to find tag
    let cur: any = obj;
    for (let i = 0; i < 5 && cur; i++) {
      if (cur.__toolType) return String(cur.__toolType);
      if (cur.isTextObject === true) return 'text';
      cur = cur.parent;
    }
    return null;
  }

  private colorToNumber(c?: string): number | undefined {
    if (!c) return undefined;
    if (typeof c === 'number') return c;
    try { return parseInt(c.replace('#', ''), 16); } catch { return undefined; }
  }

  private restyleBrush(gfx: any, meta: any, settings: any): boolean {
    if (!meta || !meta.points || meta.points.length < 2) return false;
    const color = this.colorToNumber(settings.color) ?? this.colorToNumber(meta.color) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear();
    gfx.moveTo(meta.points[0].x, meta.points[0].y);
    for (let i = 1; i < meta.points.length; i++) {
      const p = meta.points[i];
      gfx.lineTo(p.x, p.y);
    }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    // persist meta
    meta.size = width;
    meta.color = typeof settings.color === 'string' ? settings.color : meta.color;
    gfx.__meta = meta;
    return true;
  }

  private restylePen(gfx: any, meta: any, settings: any): boolean {
    if (!meta || !meta.nodes || meta.nodes.length < 2) return false;
    const color = this.colorToNumber(settings.strokeColor || settings.color) ?? this.colorToNumber(meta.strokeColor) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear();
    const nodes = meta.nodes as Array<{ x: number; y: number }>;
    gfx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i];
      gfx.lineTo(p.x, p.y);
    }
    if (meta.closed) {
      gfx.lineTo(nodes[0].x, nodes[0].y);
      gfx.closePath();
      // Determine fill color: allow live update from settings.fillColor, else keep meta
      const fillCandidate = (settings.fillColor !== undefined) ? settings.fillColor : meta.fillColor;
      const fillNum = this.colorToNumber(fillCandidate);
      if (fillNum !== undefined) {
        gfx.fill({ color: fillNum });
      }
    }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    meta.size = width;
    meta.strokeColor = settings.strokeColor || settings.color || meta.strokeColor;
    if ('fillColor' in settings) {
      // Store 'transparent' as null to indicate no-fill
      meta.fillColor = (typeof settings.fillColor === 'string' && settings.fillColor !== 'transparent')
        ? settings.fillColor
        : null;
    }
    gfx.__meta = meta;
    return true;
  }

  private restyleShape(gfx: any, meta: any, settings: any): boolean {
    if (!meta) return false;
    const strokeColor = this.colorToNumber(settings.strokeColor || settings.color) ?? this.colorToNumber(meta.strokeColor) ?? 0x000000;
    const strokeWidth = (settings.strokeWidth ?? meta.strokeWidth ?? 2) as number;
    const fillColorNum = this.colorToNumber(settings.fillColor !== undefined ? settings.fillColor : meta.fillColor);
    let fillEnabled = (settings.fillEnabled ?? meta.fillEnabled);
    if (settings.fillColor !== undefined) {
      // If a fillColor was provided, infer fillEnabled from it unless explicitly set
      const inferred = fillColorNum !== undefined;
      fillEnabled = (settings.fillEnabled !== undefined) ? settings.fillEnabled : inferred;
    }

    gfx.clear();
    const type = meta.shapeType as string;
    const x = meta.x ?? meta.startX ?? 0;
    const y = meta.y ?? meta.startY ?? 0;
    const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0));
    const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));

    switch (type) {
      case 'rectangle': {
        const r = meta.cornerRadius ?? 0;
        if (r > 0) gfx.roundRect(x, y, w, h, r); else gfx.rect(x, y, w, h);
        break;
      }
      case 'circle': {
        const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(w, h) / 2;
        gfx.ellipse(cx, cy, radius, radius);
        break;
      }
      case 'ellipse': {
        const cx = x + w / 2; const cy = y + h / 2; gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2));
        break;
      }
      case 'triangle': {
        const topX = x + w / 2, topY = y;
        const blX = x, blY = y + h;
        const brX = x + w, brY = y + h;
        gfx.moveTo(topX, topY).lineTo(blX, blY).lineTo(brX, brY).closePath();
        break;
      }
      case 'line': {
        const x1 = meta.startX ?? x, y1 = meta.startY ?? y;
        const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h);
        gfx.moveTo(x1, y1).lineTo(x2, y2);
        break;
      }
      case 'arrow': {
        const x1 = meta.startX ?? x, y1 = meta.startY ?? y;
        const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h);
        gfx.moveTo(x1, y1).lineTo(x2, y2);
        // Arrow head similar to ArrowDrawer
        const dx = x2 - x1, dy = y2 - y1; const angle = Math.atan2(dy, dx);
        const length = Math.hypot(dx, dy); const headLength = Math.min(20, length * 0.3); const headAngle = Math.PI / 6;
        const hx1 = x2 - headLength * Math.cos(angle - headAngle);
        const hy1 = y2 - headLength * Math.sin(angle - headAngle);
        const hx2 = x2 - headLength * Math.cos(angle + headAngle);
        const hy2 = y2 - headLength * Math.sin(angle + headAngle);
        gfx.moveTo(x2, y2).lineTo(hx1, hy1).moveTo(x2, y2).lineTo(hx2, hy2);
        break;
      }
      case 'polygon': {
        const sides = Math.max(3, meta.sides ?? 5);
        const cx = x + w / 2, cy = y + h / 2;
        const rx = w / 2, ry = h / 2;
        for (let i = 0; i < sides; i++) {
          const theta = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const px = cx + rx * Math.cos(theta);
          const py = cy + ry * Math.sin(theta);
          if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
        }
        gfx.closePath();
        break;
      }
      default: {
        // default to rectangle
        gfx.rect(x, y, w, h);
        break;
      }
    }

    if (fillEnabled && fillColorNum !== undefined) {
      gfx.fill({ color: fillColorNum });
    }
    gfx.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });

    // persist meta
    meta.strokeWidth = strokeWidth;
    meta.strokeColor = settings.strokeColor || settings.color || meta.strokeColor;
    if ('fillColor' in settings) meta.fillColor = settings.fillColor;
    if ('fillEnabled' in settings) meta.fillEnabled = settings.fillEnabled;
    // If only fillColor changed, sync meta.fillEnabled accordingly
    if ('fillColor' in settings && settings.fillEnabled === undefined) {
      meta.fillEnabled = (fillColorNum !== undefined);
    }
    gfx.__meta = meta;
    return true;
  }

  private restyleTables(container: any, settings: any): boolean {
    try {
      if (!container || !container.children) return false;
      let changed = false;
      const borderColorNum = this.colorToNumber(settings.borderColor);
      const backgroundColorNum = this.colorToNumber(settings.backgroundColor);
      const fontColor = settings.fontColor as string | undefined;
      const borderWidth = settings.borderWidth as number | undefined;
      const fontSize = settings.fontSize as number | undefined;

      for (const child of container.children) {
        const cell = (child as any).tableCell;
        if (!cell) continue;
        // Cell background (Graphics)
        if (child.constructor?.name === 'Graphics') {
          const b = cell.bounds;
          child.clear();
          child.rect(b.x, b.y, b.width, b.height);
          const fillC = backgroundColorNum ?? parseInt((child.fill?.color ?? '0xFFFFFF').toString());
          child.fill({ color: fillC });
          const strokeC = borderColorNum ?? 0x000000;
          const strokeW = Math.max(1, borderWidth ?? 1);
          child.stroke({ width: strokeW, color: strokeC });
          changed = true;
        }
        // Cell text (Text)
        if (child.constructor?.name === 'Text') {
          if (fontColor) { child.style.fill = fontColor; changed = true; }
          if (fontSize) { child.style.fontSize = fontSize; changed = true; }
        }
      }
      return changed;
    } catch { return false; }
  }

  private restyleText(container: any, settings: any): boolean {
    try {
      const children = container.children || [];
      const textObj = children.find((c: any) => c.constructor?.name === 'Text');
      if (!textObj) return false;
      let changed = false;
      if (settings.color) { textObj.style.fill = settings.color; changed = true; }
      if (settings.fontSize) { textObj.style.fontSize = settings.fontSize; changed = true; }
      return changed;
    } catch { return false; }
  }
}
