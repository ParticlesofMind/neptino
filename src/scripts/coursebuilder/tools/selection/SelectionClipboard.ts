import { Container, Point, Text, Sprite, Texture, Graphics } from 'pixi.js';
import { DisplayObjectManager } from '../../canvas/DisplayObjectManager';
import { createBrushFromMeta, createPenFromMeta, createShapeFromMeta, unionBoundsLocal, moveByContainerDelta } from './ClipboardFactory';

type TransformDesc = { x: number; y: number; scaleX: number; scaleY: number; rotation: number; pivotX?: number; pivotY?: number; anchorX?: number; anchorY?: number };
type TextDesc = { kind: 'text'; text: string; style: any; transform: TransformDesc };
type SpriteDesc = { kind: 'sprite'; texture: Texture; transform: TransformDesc };
type MetaGraphicsDesc = { kind: 'shapes' | 'pen' | 'brush'; meta: any; transform: TransformDesc };
type TableCellDesc = { x: number; y: number; width: number; height: number; text: string; style: any };
type TableDesc = { kind: 'table'; settings: any; cells: TableCellDesc[]; transform: TransformDesc };
type ContainerDesc = { kind: 'container'; children: NodeDesc[]; transform: TransformDesc };
type NodeDesc = TextDesc | SpriteDesc | MetaGraphicsDesc | TableDesc | ContainerDesc;

export class SelectionClipboard {
  private items: NodeDesc[] = [];
  private pasteCount = 0;
  private getSelected: () => any[];
  private setSelected: (arr: any[]) => void;
  private getContainer: () => Container | null;
  private displayManager: DisplayObjectManager | null;

  constructor(opts: {
    getSelected: () => any[];
    setSelected: (arr: any[]) => void;
    getContainer: () => Container | null;
    displayManager: DisplayObjectManager | null;
  }) {
    this.getSelected = opts.getSelected;
    this.setSelected = opts.setSelected;
    this.getContainer = opts.getContainer;
    this.displayManager = opts.displayManager;
  }

  public setDisplayManager(manager: DisplayObjectManager | null) {
    this.displayManager = manager;
  }

  public hasClipboard(): boolean {
    return this.items.length > 0;
  }

  public clear(): void {
    this.items = [];
    this.pasteCount = 0;
    this.dispatchClipboardEvent();
  }

  public copy(): boolean {
    const selected = this.getSelected() || [];
    if (!selected.length) return false;

    const next: NodeDesc[] = [];
    for (const obj of selected) {
      const desc = this.buildDesc(obj);
      if (desc) next.push(desc);
    }

    if (!next.length) return false;
    this.items = next;
    this.pasteCount = 0;
    this.dispatchClipboardEvent();
    return true;
  }

  public cut(): boolean {
    const ok = this.copy();
    if (!ok) return false;
    const selected = this.getSelected().slice();
    for (const obj of selected) {
      try {
        if (this.displayManager && (this.displayManager as any).remove) {
          (this.displayManager as any).remove(obj);
        } else if (obj?.parent) {
          obj.parent.removeChild(obj);
          obj.destroy?.();
        }
      } catch {}
    }
    this.setSelected([]);
    this.dispatchClipboardEvent();
    return true;
  }

  public pasteAt(globalPoint: Point | null): any[] {
    if (!this.items.length) return [];
    const target = this.getContainer() || this.displayManager?.getRoot() || null;
    if (!target) return [];

    const bump = 12;
    const offset = ++this.pasteCount * bump;
    const created: any[] = [];

    for (const item of this.items) {
      try {
        // Debug: log item kind
        try { console.log('📋 PASTE item:', (item as any).kind || (item as any).type || typeof item); } catch {}
        const nodes = this.constructNode(item, target, offset);
        if (Array.isArray(nodes)) nodes.forEach(n => created.push(n)); else if (nodes) created.push(nodes);
        else { try { console.warn('📋 PASTE warn: constructNode returned null for item', item); } catch {} }
      } catch (e) {
        try { console.warn('📋 PASTE error:', e); } catch {}
      }
    }

    if (created.length && globalPoint) {
      // Center new items at the cursor
      try {
        const localTarget = target.toLocal(globalPoint);
        const b = unionBoundsLocal(created, target);
        const cx = b.x + b.width * 0.5;
        const cy = b.y + b.height * 0.5;
        const dx = localTarget.x - cx;
        const dy = localTarget.y - cy;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          created.forEach(obj => moveByContainerDelta(obj, dx, dy, target));
        }
      } catch {}
    }

    if (created.length) {
      this.setSelected(created);
      this.dispatchClipboardEvent({ pasted: true });
    }
    return created;
  }

  private addToContainer(obj: any, container: Container): void {
    if (this.displayManager) {
      this.displayManager.add(obj, container);
    } else {
      container.addChild(obj);
    }
  }

  // --- helpers ---
  private transformOf(obj: any): TransformDesc {
    return {
      x: obj.x || 0,
      y: obj.y || 0,
      scaleX: obj.scale?.x ?? 1,
      scaleY: obj.scale?.y ?? 1,
      rotation: obj.rotation ?? 0,
      pivotX: obj.pivot?.x ?? 0,
      pivotY: obj.pivot?.y ?? 0,
      anchorX: (obj as any).anchor?.x,
      anchorY: (obj as any).anchor?.y,
    };
  }

  private buildDesc(obj: any): NodeDesc | null {
    const t = this.detectToolType(obj);
    const tr = this.transformOf(obj);
    if (t === 'text') {
      try { return { kind: 'text', text: String(obj.text ?? ''), style: { ...(obj.style || {}) }, transform: tr }; } catch { return null; }
    }
    if (t === 'shapes' || t === 'pen' || t === 'brush') {
      const meta = (obj as any).__meta; if (meta) return { kind: t, meta: JSON.parse(JSON.stringify(meta)), transform: tr } as MetaGraphicsDesc; return null;
    }
    // Fallback: graphics with __meta.kind but missing __toolType
    if (obj?.constructor?.name === 'Graphics' && (obj as any).__meta && (obj as any).__meta.kind) {
      const kind = String((obj as any).__meta.kind);
      if (kind === 'shapes' || kind === 'pen' || kind === 'brush') {
        const meta = (obj as any).__meta; return { kind, meta: JSON.parse(JSON.stringify(meta)), transform: tr } as MetaGraphicsDesc;
      }
    }
    if ((obj as any).isTable || (obj as any).__toolType === 'tables') {
      // Build table cells from children that expose tableCell
      const settings = (obj as any).__meta || {};
      const cells: TableCellDesc[] = [];
      try {
        for (const ch of (obj.children || [])) {
          const cell = (ch as any).tableCell; if (!cell) continue;
          if (ch.constructor?.name === 'Graphics') {
            // find sibling text for this cell
            const textChild = (obj.children || []).find((c: any) => (c as any).tableCell === cell && c.constructor?.name === 'Text');
            const text = textChild ? String((textChild as any).text || '') : '';
            const style = textChild ? { ...((textChild as any).style || {}) } : {};
            cells.push({ x: cell.bounds.x, y: cell.bounds.y, width: cell.bounds.width, height: cell.bounds.height, text, style });
          }
        }
      } catch {}
      return { kind: 'table', settings, cells, transform: tr };
    }
    if ((obj as any).texture) {
      try { return { kind: 'sprite', texture: (obj as Sprite).texture, transform: tr }; } catch { return null; }
    }
    // Generic container tree
    if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
      const children: NodeDesc[] = [];
      for (const ch of obj.children) { const d = this.buildDesc(ch); if (d) children.push(d); }
      return { kind: 'container', children, transform: tr };
    }
    // Unknown leaf Graphics: try to snapshot to sprite texture as last resort (avoid losing content)
    try {
      if (obj.constructor?.name === 'Graphics') {
        const tex = (Texture as any).from ? (Texture as any).from(obj) : null;
        if (tex) return { kind: 'sprite', texture: tex, transform: tr } as any;
      }
    } catch {}
    return null;
  }

  private applyTransform(obj: any, tr: TransformDesc): void {
    obj.x = tr.x; obj.y = tr.y; obj.rotation = tr.rotation || 0;
    if (obj.pivot) obj.pivot.set(tr.pivotX ?? 0, tr.pivotY ?? 0);
    if (obj.scale) obj.scale.set(tr.scaleX ?? 1, tr.scaleY ?? 1);
    if ((obj as any).anchor && (tr.anchorX !== undefined || tr.anchorY !== undefined)) (obj as any).anchor.set(tr.anchorX ?? 0, tr.anchorY ?? 0);
  }

  private constructNode(desc: NodeDesc, target: Container, offset: number): any | any[] | null {
    switch (desc.kind) {
      case 'text': {
        const t = new Text({ text: desc.text, style: desc.style });
        (t as any).isTextObject = true;
        this.addToContainer(t, target); this.applyTransform(t, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return t;
      }
      case 'sprite': {
        const sp = new Sprite(desc.texture);
        this.addToContainer(sp, target); this.applyTransform(sp, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return sp;
      }
      case 'shapes': {
        const gfx = createShapeFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0 /* no geom offset, we move via transform */);
        if (!gfx) return null;
        (gfx as any).__toolType = 'shapes'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target); this.applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return gfx;
      }
      case 'pen': {
        const gfx = createPenFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0);
        if (!gfx) return null;
        (gfx as any).__toolType = 'pen'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target); this.applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return gfx;
      }
      case 'brush': {
        const gfx = createBrushFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0);
        if (!gfx) return null;
        (gfx as any).__toolType = 'brush'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target); this.applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return gfx;
      }
      case 'table': {
        const cont = new Graphics();
        (cont as any).isTable = true; (cont as any).__toolType = 'tables'; (cont as any).__meta = desc.settings || {};
        this.addToContainer(cont, target);
        // draw cells
        const borderW = (desc.settings?.borderWidth ?? 1) as number;
        const borderC = parseInt(String((desc.settings?.borderColor || '#000000')).replace('#', '0x'));
        const bgC = parseInt(String((desc.settings?.backgroundColor || '#ffffff')).replace('#', '0x'));
        for (const cell of desc.cells) {
          const g = new Graphics(); g.rect(cell.x, cell.y, cell.width, cell.height); g.fill({ color: bgC }); g.stroke({ width: Math.max(1, borderW), color: borderC });
          const txt = new Text({ text: cell.text || '', style: { ...(cell.style || {}) } });
          txt.x = cell.x + ((desc.settings?.cellPadding ?? 4) as number); txt.y = cell.y + ((desc.settings?.cellPadding ?? 4) as number);
          (g as any).tableCell = { bounds: { x: cell.x, y: cell.y, width: cell.width, height: cell.height } };
          (txt as any).tableCell = (g as any).tableCell;
          cont.addChild(g); cont.addChild(txt);
        }
        this.applyTransform(cont, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        return cont;
      }
      case 'container': {
        const group = new Container();
        this.addToContainer(group, target); this.applyTransform(group, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset });
        for (const ch of desc.children) {
          const node = this.constructNode(ch, group, 0);
          if (Array.isArray(node)) node.forEach(n => group.addChild(n));
          else if (node) group.addChild(node);
        }
        return group;
      }
    }
    return null;
  }
  private detectToolType(obj: any): 'text' | 'shapes' | 'pen' | 'brush' | null {
    let cur: any = obj;
    for (let i = 0; i < 5 && cur; i++) {
      if (cur.__toolType) return String(cur.__toolType) as any;
      if (cur.isTextObject === true || cur.constructor?.name === 'Text') return 'text';
      cur = cur.parent;
    }
    return null;
  }

  

  private dispatchClipboardEvent(extra?: any): void {
    try {
      const evt = new CustomEvent('selection:clipboard', { detail: { hasClipboard: this.items.length > 0, ...(extra || {}) } });
      document.dispatchEvent(evt);
    } catch {}
  }
}
