import { Container, FederatedPointerEvent, Graphics, Point, Rectangle, Text } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
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

  constructor() {
    super('selection', 'default');
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
          getCanvasBounds: undefined,
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

    if (this.group && this.group.objects.length > 0 && (this.transformer as any).isActive && (this.transformer as any).isActive()) {
      // If a transform is in progress, update
      this.transformer.update(p, { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey });
      this.refreshGroupBoundsOnly();
      return;
    }

    if (this.isDraggingGroup && this.group) {
      const dx = p.x - this.dragStart.x;
      const dy = p.y - this.dragStart.y;
      this.selected.forEach((obj) => {
        if (obj.position) {
          obj.position.x += dx;
          obj.position.y += dy;
        }
      });
      this.dragStart.copyFrom(p);
      this.refreshGroupBoundsOnly();
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
}
