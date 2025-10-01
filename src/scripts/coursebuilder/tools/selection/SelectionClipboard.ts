import { Container, Point, Text, Sprite, Texture, Graphics } from 'pixi.js';
import { DisplayObjectManager } from '../../canvas/DisplayObjectManager';
import { createBrushFromMeta, createPenFromMeta, createShapeFromMeta, unionBoundsLocal, moveByContainerDelta, colorToNumber } from './ClipboardFactory';
import { historyManager } from '../../canvas/HistoryManager';

type TransformDesc = { x: number; y: number; scaleX: number; scaleY: number; rotation: number; pivotX?: number; pivotY?: number; anchorX?: number; anchorY?: number; skewX?: number; skewY?: number };
type CommonProps = { alpha?: number; blendMode?: number; tint?: number; roundPixels?: boolean; filters?: any[] };
type ExtraProps = {
  toolType?: string;
  meta?: any;
  metadata?: any;
  name?: string;
  cursor?: string;
  eventMode?: any;
  interactive?: boolean;
  interactiveChildren?: boolean;
  sortableChildren?: boolean;
  buttonMode?: boolean;
  visible?: boolean;
  zIndex?: number;
  cacheAsBitmap?: boolean;
};
type BaseDesc = { transform: TransformDesc; props?: CommonProps; extras?: ExtraProps };
type TextDesc = BaseDesc & { kind: 'text'; text: string; style: any };
type SpriteDesc = BaseDesc & { kind: 'sprite'; texture: Texture };
type MetaGraphicsDesc = BaseDesc & { kind: 'shapes' | 'pen' | 'brush'; meta: any };
type TableCellDesc = { x: number; y: number; width: number; height: number; text: string; style: any };
type TableDesc = BaseDesc & { kind: 'table'; settings: any; cells: TableCellDesc[] };
type ContainerDesc = BaseDesc & { kind: 'container'; children: NodeDesc[] };
type MediaSource = { url?: string; title?: string; posterUrl?: string; thumbnailUrl?: string };
type MediaDesc = BaseDesc & { kind: 'media'; mediaType: 'audio' | 'video' | string; source: MediaSource };
type NodeDesc = TextDesc | SpriteDesc | MetaGraphicsDesc | TableDesc | ContainerDesc | MediaDesc;

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

  private cloneData<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }
    const globalAny = globalThis as any;
    if (typeof globalAny?.structuredClone === 'function') {
      try {
        return globalAny.structuredClone(value);
      } catch {}
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  private cloneTextStyle(style: any): any {
    if (!style) return {};
    if (typeof style.toJSON === 'function') {
      try {
        return style.toJSON();
      } catch {}
    }
    if (typeof style === 'object') {
      return this.cloneData(style);
    }
    return style;
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
      // Record history: allow undo to remove pasted objects, redo to re-add
      try {
        const createdInfo = created.map((obj: any) => ({ obj, parent: obj.parent as Container, index: (obj.parent as Container).getChildIndex(obj) }));
        historyManager.push({
          label: 'Paste',
          undo: () => { createdInfo.forEach(({ obj }) => { try { if (obj.parent) obj.parent.removeChild(obj); } catch {} }); },
          redo: () => { createdInfo.forEach(({ obj, parent, index }) => { try { if (index >= 0 && index <= parent.children.length) parent.addChildAt(obj, Math.min(index, parent.children.length)); else parent.addChild(obj); } catch {} }); },
        });
      } catch {}
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
      skewX: (obj as any).skew?.x,
      skewY: (obj as any).skew?.y,
    };
  }

  private extractProps(obj: any): CommonProps {
    const props: CommonProps = {};
    try { if (obj.alpha !== undefined) props.alpha = obj.alpha; } catch {}
    try { if (obj.blendMode !== undefined) props.blendMode = obj.blendMode; } catch {}
    try { if ((obj as any).tint !== undefined) props.tint = (obj as any).tint; } catch {}
    try { if ((obj as any).roundPixels !== undefined) props.roundPixels = !!(obj as any).roundPixels; } catch {}
    try { if ((obj as any).filters !== undefined) props.filters = (obj as any).filters?.slice?.() || undefined; } catch {}
    return props;
  }

  private extractExtras(obj: any): ExtraProps {
    const extras: ExtraProps = {};
    try {
      if ((obj as any).__toolType) extras.toolType = String((obj as any).__toolType);
    } catch {}
    try {
      if ((obj as any).__meta && typeof (obj as any).__meta === 'object') {
        extras.meta = this.cloneData((obj as any).__meta);
      }
    } catch {}
    try {
      const metadata = (obj as any).metadata;
      if (metadata && typeof metadata === 'object') {
        const type = (metadata as any).type;
        if (type !== 'audio' && type !== 'video') {
          extras.metadata = this.cloneData(metadata);
        }
      }
    } catch {}
    try { if (obj.name) extras.name = obj.name; } catch {}
    try { if (obj.cursor) extras.cursor = obj.cursor; } catch {}
    try { if (obj.eventMode !== undefined) extras.eventMode = obj.eventMode; } catch {}
    try { if (typeof obj.interactive === 'boolean') extras.interactive = obj.interactive; } catch {}
    try { if (typeof obj.interactiveChildren === 'boolean') extras.interactiveChildren = obj.interactiveChildren; } catch {}
    try { if (typeof obj.sortableChildren === 'boolean') extras.sortableChildren = obj.sortableChildren; } catch {}
    try { if (typeof obj.buttonMode === 'boolean') extras.buttonMode = obj.buttonMode; } catch {}
    try { if (typeof obj.visible === 'boolean') extras.visible = obj.visible; } catch {}
    try { if (typeof obj.zIndex === 'number') extras.zIndex = obj.zIndex; } catch {}
    try { if (typeof (obj as any).cacheAsBitmap === 'boolean') extras.cacheAsBitmap = (obj as any).cacheAsBitmap; } catch {}
    return extras;
  }

  private applyExtras(obj: any, extras?: ExtraProps | null): void {
    if (!extras) return;
    if (extras.toolType !== undefined) (obj as any).__toolType = extras.toolType;
    if (extras.meta !== undefined) (obj as any).__meta = this.cloneData(extras.meta);
    if (extras.metadata !== undefined) (obj as any).metadata = this.cloneData(extras.metadata);
    if (extras.name !== undefined) obj.name = extras.name;
    if (extras.cursor !== undefined) obj.cursor = extras.cursor;
    if (extras.eventMode !== undefined) obj.eventMode = extras.eventMode;
    if (extras.interactive !== undefined) obj.interactive = extras.interactive;
    if (extras.interactiveChildren !== undefined) obj.interactiveChildren = extras.interactiveChildren;
    if (extras.sortableChildren !== undefined) obj.sortableChildren = extras.sortableChildren;
    if (extras.buttonMode !== undefined) obj.buttonMode = extras.buttonMode;
    if (extras.visible !== undefined) obj.visible = extras.visible;
    if (extras.zIndex !== undefined) obj.zIndex = extras.zIndex;
    if (extras.cacheAsBitmap !== undefined) (obj as any).cacheAsBitmap = extras.cacheAsBitmap;
  }

  private applyAllProperties(obj: any, desc: BaseDesc, offset: number): void {
    const transformWithOffset: TransformDesc = {
      ...desc.transform,
      x: desc.transform.x + offset,
      y: desc.transform.y + offset,
    };
    this.applyTransform(obj, transformWithOffset);
    this.applyProps(obj, desc.props);
    this.applyExtras(obj, desc.extras);
  }

  private scheduleTransformReapply(obj: any, desc: BaseDesc, offset: number): void {
    const reapply = () => this.applyAllProperties(obj, desc, offset);
    const raf = (globalThis as any).requestAnimationFrame;
    if (typeof raf === 'function') {
      raf(() => reapply());
    } else {
      setTimeout(reapply, 0);
    }
    setTimeout(reapply, 120);
    setTimeout(reapply, 320);
  }

  private buildMediaDescriptor(obj: any, tr: TransformDesc, props: CommonProps, extras: ExtraProps): MediaDesc | null {
    try {
      const metadata = (obj as any).metadata;
      if (!metadata || typeof metadata !== 'object' || !metadata.type) return null;
      const type = String(metadata.type);
      if (type !== 'audio' && type !== 'video') return null;
      const source: MediaSource = {};
      if (metadata.url) source.url = metadata.url;
      if (metadata.title) source.title = metadata.title;
      if (metadata.posterUrl) source.posterUrl = metadata.posterUrl;
      if (metadata.thumbnailUrl) source.thumbnailUrl = metadata.thumbnailUrl;
      return { kind: 'media', mediaType: type, source, transform: tr, props, extras };
    } catch {
      return null;
    }
  }

  private buildDesc(obj: any): NodeDesc | null {
    const t = this.detectToolType(obj);
    const tr = this.transformOf(obj);
    const props = this.extractProps(obj);
    const extras = this.extractExtras(obj);

    const mediaDesc = this.buildMediaDescriptor(obj, tr, props, extras);
    if (mediaDesc) {
      return mediaDesc;
    }

    if (t === 'text') {
      try {
        return {
          kind: 'text',
          text: String(obj.text ?? ''),
          style: this.cloneTextStyle((obj as any).style),
          transform: tr,
          props,
          extras,
        };
      } catch {
        return null;
      }
    }

    if (t === 'shapes' || t === 'pen' || t === 'brush') {
      const meta = (obj as any).__meta;
      if (meta) {
        return { kind: t, meta: this.cloneData(meta), transform: tr, props, extras } as MetaGraphicsDesc;
      }
      return null;
    }

    if (obj?.constructor?.name === 'Graphics' && (obj as any).__meta && (obj as any).__meta.kind) {
      const kind = String((obj as any).__meta.kind);
      if (kind === 'shapes' || kind === 'pen' || kind === 'brush') {
        const meta = (obj as any).__meta;
        return { kind: kind as 'shapes' | 'pen' | 'brush', meta: this.cloneData(meta), transform: tr, props, extras };
      }
    }

    if ((obj as any).isTable || (obj as any).__toolType === 'tables') {
      const settings = this.cloneData((obj as any).__meta || {});
      const cells: TableCellDesc[] = [];
      try {
        for (const ch of obj.children || []) {
          const cell = (ch as any).tableCell;
          if (!cell) continue;
          if (ch.constructor?.name === 'Graphics') {
            const textChild = (obj.children || []).find((c: any) => (c as any).tableCell === cell && c.constructor?.name === 'Text');
            const textValue = textChild ? String((textChild as any).text || '') : '';
            const style = textChild ? this.cloneTextStyle((textChild as any).style) : {};
            cells.push({ x: cell.bounds.x, y: cell.bounds.y, width: cell.bounds.width, height: cell.bounds.height, text: textValue, style });
          }
        }
      } catch {}
      return { kind: 'table', settings, cells, transform: tr, props, extras };
    }

    if ((obj as any).texture) {
      try {
        return { kind: 'sprite', texture: (obj as Sprite).texture, transform: tr, props, extras };
      } catch {
        return null;
      }
    }

    if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
      const children: NodeDesc[] = [];
      for (const ch of obj.children) {
        const d = this.buildDesc(ch);
        if (d) children.push(d);
      }
      return { kind: 'container', children, transform: tr, props, extras };
    }

    try {
      if (obj.constructor?.name === 'Graphics') {
        const tex = (Texture as any).from ? (Texture as any).from(obj) : null;
        if (tex) return { kind: 'sprite', texture: tex, transform: tr, props, extras } as any;
      }
    } catch {}

    return null;
  }

  private applyTransform(obj: any, tr: TransformDesc): void {
    obj.x = tr.x; obj.y = tr.y; obj.rotation = tr.rotation || 0;
    if (obj.pivot) obj.pivot.set(tr.pivotX ?? 0, tr.pivotY ?? 0);
    if (obj.scale) obj.scale.set(tr.scaleX ?? 1, tr.scaleY ?? 1);
    if ((obj as any).anchor && (tr.anchorX !== undefined || tr.anchorY !== undefined)) (obj as any).anchor.set(tr.anchorX ?? 0, tr.anchorY ?? 0);
    try { if ((obj as any).skew && (tr.skewX !== undefined || tr.skewY !== undefined)) (obj as any).skew.set(tr.skewX ?? 0, tr.skewY ?? 0); } catch {}
  }

  private applyProps(obj: any, props?: CommonProps | null): void {
    if (!props) return;
    try { if (props.alpha !== undefined) obj.alpha = props.alpha; } catch {}
    try { if (props.blendMode !== undefined) obj.blendMode = props.blendMode; } catch {}
    try { if (props.tint !== undefined && (obj as any).tint !== undefined) (obj as any).tint = props.tint; } catch {}
    try { if (props.roundPixels !== undefined && (obj as any).roundPixels !== undefined) (obj as any).roundPixels = props.roundPixels; } catch {}
    try { if (props.filters !== undefined) (obj as any).filters = props.filters; } catch {}
  }

  private constructNode(desc: NodeDesc, target: Container, offset: number): any | any[] | null {
    switch (desc.kind) {
      case 'text': {
        const t = new Text({ text: desc.text, style: desc.style });
        (t as any).isTextObject = true;
        this.addToContainer(t, target);
        this.applyAllProperties(t, desc, offset);
        return t;
      }
      case 'sprite': {
        const sp = new Sprite(desc.texture);
        this.addToContainer(sp, target);
        this.applyAllProperties(sp, desc, offset);
        return sp;
      }
      case 'shapes': {
        const gfx = createShapeFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0 /* no geom offset, we move via transform */);
        if (!gfx) return null;
        (gfx as any).__toolType = 'shapes'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target);
        this.applyAllProperties(gfx, desc, offset);
        return gfx;
      }
      case 'pen': {
        const gfx = createPenFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0);
        if (!gfx) return null;
        (gfx as any).__toolType = 'pen'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target);
        this.applyAllProperties(gfx, desc, offset);
        return gfx;
      }
      case 'brush': {
        const gfx = createBrushFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0);
        if (!gfx) return null;
        (gfx as any).__toolType = 'brush'; (gfx as any).__meta = desc.meta;
        this.addToContainer(gfx, target);
        this.applyAllProperties(gfx, desc, offset);
        return gfx;
      }
      case 'table': {
        const cont = new Graphics();
        (cont as any).isTable = true; (cont as any).__toolType = 'tables'; (cont as any).__meta = desc.settings || {};
        this.addToContainer(cont, target);
        // draw cells
        const borderW = (desc.settings?.borderWidth ?? 1) as number;
        const borderC = colorToNumber(desc.settings?.borderColor || '#000000') ?? 0x000000;
        const bgC = colorToNumber(desc.settings?.backgroundColor || '#ffffff') ?? 0xffffff;
        for (const cell of desc.cells) {
          const g = new Graphics(); g.rect(cell.x, cell.y, cell.width, cell.height); g.fill({ color: bgC }); g.stroke({ width: Math.max(1, borderW), color: borderC });
          const txt = new Text({ text: cell.text || '', style: this.cloneData(cell.style || {}) });
          txt.x = cell.x + ((desc.settings?.cellPadding ?? 4) as number); txt.y = cell.y + ((desc.settings?.cellPadding ?? 4) as number);
          (g as any).tableCell = { bounds: { x: cell.x, y: cell.y, width: cell.width, height: cell.height } };
          (txt as any).tableCell = (g as any).tableCell;
          cont.addChild(g); cont.addChild(txt);
        }
        this.applyAllProperties(cont, desc, offset);
        return cont;
      }
      case 'container': {
        const group = new Container();
        // Mark as container type for layers panel
        (group as any).__toolType = 'container';
        this.addToContainer(group, target);
        this.applyAllProperties(group, desc, offset);
        for (const ch of desc.children) {
          const node = this.constructNode(ch, group, 0);
          // Don't add to group directly - constructNode already adds to container via addToContainer
          // The child objects are already added to the proper parent through the DisplayObjectManager
          if (!node) continue;
          
          // If addToContainer wasn't called (shouldn't happen, but safety check)
          if (Array.isArray(node)) {
            node.forEach(n => {
              if (n && !n.parent) {
                this.addToContainer(n, group);
              }
            });
          } else if (node && !node.parent) {
            this.addToContainer(node, group);
          }
        }
        return group;
      }
      case 'media': {
        return this.constructMediaNode(desc, target, offset);
      }
    }
    return null;
  }

  private constructMediaNode(desc: MediaDesc, target: Container, offset: number): any | null {
    const canvasAPI = (window as any).canvasAPI;
    const source = desc.source || {};
    let created: any | null = null;
    let id: string | null | undefined = null;

    try {
      if (desc.mediaType === 'audio' && canvasAPI?.addAudioElement) {
        id = canvasAPI.addAudioElement(source.url || '', source.title || 'Audio', 0, 0);
      } else if (desc.mediaType === 'video' && canvasAPI?.addVideoElement) {
        id = canvasAPI.addVideoElement(source.url || '', source.title || 'Video', 0, 0, source.posterUrl);
      }
    } catch (error) {
      console.warn('📋 PASTE media creation failed:', error);
    }

    created = this.resolveCreatedMediaObject(id);

    if (!created) {
      console.warn('📋 PASTE warn: unable to recreate media node', desc.mediaType, source);
      return null;
    }

    if (created.parent && created.parent !== target) {
      try { created.parent.removeChild(created); } catch {}
    }
    if (created.parent !== target) {
      target.addChild(created);
    }

    this.applyAllProperties(created, desc, offset);

    if (desc.mediaType === 'video') {
      this.scheduleTransformReapply(created, desc, offset);
    }

    return created;
  }

  private resolveCreatedMediaObject(id: string | null | undefined): any | null {
    if (!id) return null;
    if (this.displayManager) {
      const obj = this.displayManager.get(id);
      if (obj) return obj;
    }
    try {
      const root = this.getContainer();
      if (root) {
        for (const child of root.children) {
          if ((child as any).__id === id) {
            return child;
          }
        }
      }
    } catch {}
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
