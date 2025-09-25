import { Container, FederatedPointerEvent, Point, Rectangle } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
import { snapManager } from '../SnapManager';
import { ClickSelection } from './clickSelection';
import { SelectionClipboard } from './SelectionClipboard';
import { SelectionOverlay } from './SelectionOverlay';
import { SmartGuides } from './SmartGuides';
import { SelectionMarquee } from './SelectionMarquee';
import { TransformController } from './TransformController';
import { SelectionGrouping } from './SelectionGrouping';
import { SelectionStyling } from './SelectionStyling';
import { animationState } from '../../animation/AnimationState';
import { determineSelectionType, moveObjectByContainerDelta } from './SelectionUtils';
import { historyManager } from '../../canvas/HistoryManager';

type Mode = 'idle' | 'drag' | 'scale' | 'rotate';

export class SelectionTool extends BaseTool {
  private click = new ClickSelection();
  private overlay = new SelectionOverlay();
  private guides = new SmartGuides();
  private marquee = new SelectionMarquee();
  private transformer = new TransformController();
  private grouping = new SelectionGrouping();
  private styling = new SelectionStyling();
  private clipboardSvc: SelectionClipboard;

  private selected: any[] = [];
  private container: Container | null = null;

  private isDraggingGroup = false;
  public isDragging: boolean = false;
  private dragStart = new Point();
  private mode: Mode = 'idle';
  private lastPointerGlobal: Point | null = null;
  // Sticky snap state during drag so alignment feels "magnetic"
  private snapLock: { x?: number; y?: number; targetX?: 'left' | 'center' | 'right'; targetY?: 'top' | 'center' | 'bottom' } = {};

  constructor() {
    super('selection', 'default');
    this.clipboardSvc = new SelectionClipboard({
      getSelected: () => this.selected,
      setSelected: (arr) => { this.selected = arr; },
      getContainer: () => this.container || this.displayManager?.getRoot() || null,
      displayManager: this.displayManager,
    });
  }

  public setUILayer(container: Container) { this.container = container; this.overlay.setUILayer(container); this.guides.setUILayer(container); this.marquee.setUILayer(container); }
  public override setDisplayObjectManager(manager: any): void { super.setDisplayObjectManager(manager); this.clipboardSvc.setDisplayManager(manager); }

  public onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; 
    this.container = container; 
    const p = container.toLocal(event.global); 
    this.lastPointerGlobal = new Point(event.global.x, event.global.y);

    // First, check for double-click on text objects (highest priority)
    const textClickResult = this.click.handleClick(
      p,
      container,
      { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey },
      (object, point, cont) => {
        try {
          // Get the text tool directly from the manager
          const toolManager = (window as any).toolStateManager;
          const textTool = toolManager?.tools?.get('text');
          
          if (textTool && textTool.activateTextObjectForEditing) {
            // Convert local point to global point for the text tool
            const globalPoint = cont.toGlobal(point);
            textTool.activateTextObjectForEditing(object, globalPoint, cont);
          }
        } catch (error) {
          console.warn('Failed to activate text editing:', error);
        }
      }
    );



    // If it was a double-click on text, stop processing here
    if (textClickResult.isDoubleClick && this.click.isTextObject(textClickResult.clickedObject)) {
      return;
    }

    const group = this.overlay.getGroup();
    const handle = this.overlay.findHandleAtPoint(p, true);
    if (handle && group) {
      this.mode = handle.type === 'rotation' ? 'rotate' : 'scale'; this.cursor = this.cursorForHandle(handle); this.isDragging = true;
      if (handle.type === 'rotation') {
        const b = group.bounds.clone(); const cx = b.x + b.width * 0.5; const cy = b.y + b.height * 0.5; const dx0 = p.x - cx; const dy0 = p.y - cy; (this as any)._rotateStartRef = Math.atan2(dy0, dx0); (this as any)._rotateBase = b; (this as any)._rotateCenter = new Point(cx, cy);
      }
      this.transformer.begin(
        this.selected,
        group,
        container,
        handle,
        p,
        {
          restorePivotOnEnd: false,
          rotationSnapDeg: 15,
          modifiers: { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey },
        }
      );
      return;
    }

    if (group && this.overlay.pointInRect(p, group.bounds)) {
      this.isDraggingGroup = true; this.mode = 'drag'; this.cursor = 'grabbing'; this.isDragging = true; this.dragStart.copyFrom(p); return;
    }
    if (textClickResult.clickedObject) {
      const action = this.click.getSelectionAction(textClickResult.clickedObject, this.selected, event.shiftKey); this.selected = this.click.applySelectionAction(action, this.selected); this.overlay.refresh(this.selected, container);
      const bounds = this.overlay.getGroup()?.bounds; if (bounds && this.overlay.pointInRect(p, bounds)) { this.isDraggingGroup = true; this.mode = 'drag'; this.cursor = 'grabbing'; this.isDragging = true; this.dragStart.copyFrom(p); try { this.guides.update(container, this.selected, bounds); } catch {} }
      this.emitSelectionContext();
      return;
    }
    
    // Only start marquee selection if no object was clicked
    this.marquee.startMarquee(p, container, !!event.shiftKey);
  }

  public onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; const p = container.toLocal(event.global); this.lastPointerGlobal = new Point(event.global.x, event.global.y);
    if ((this.transformer as any).isActive && (this.transformer as any).isActive()) {
      this.transformer.update(p, { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey });
      const mode = this.mode; const group = this.overlay.getGroup();
      if (mode === 'rotate' && (this as any)._rotateCenter && (this as any)._rotateBase && group) {
        const cx = (this as any)._rotateCenter.x; const cy = (this as any)._rotateCenter.y; const dx = p.x - cx; const dy = p.y - cy; const currentAngle = Math.atan2(dy, dx); 
        let delta = currentAngle - (this as any)._rotateStartRef; 
        // Apply same snapping logic as TransformController when shift is held
        if (event.shiftKey) {
          const rotationSnapRad = 15 * Math.PI / 180; // 15 degrees in radians
          delta = Math.round(delta / rotationSnapRad) * rotationSnapRad;
        }
        this.overlay.setRotationPreview(new Point(cx, cy), (this as any)._rotateBase, delta);
      } else { this.overlay.refreshBoundsOnly(container); const b = this.overlay.getGroup()?.bounds; if (b) try { this.guides.update(container, this.selected, b); } catch {} }
      return;
    }
    if (this.isDraggingGroup && this.overlay.getGroup()) {
      let dx = p.x - this.dragStart.x; let dy = p.y - this.dragStart.y;
      try {
        // First, snap the pointer itself to make coarse snapping easy
        const snapped = snapManager.snapPoint(p, { container, exclude: this.selected });
        if (snapped) { dx = snapped.x - this.dragStart.x; dy = snapped.y - this.dragStart.y; }

        // Magnetic alignment: snap selection edges/center with stickiness
        const group = this.overlay.getGroup()!;
        const gb = group.bounds;
        const cand = snapManager.getCandidates({ container, exclude: this.selected, rect: group.bounds, margin: 200 });
        const prefs = snapManager.getPrefs();
        const bias = Math.max(1, prefs.centerBiasMultiplier || 1);
        const thr = (prefs.threshold || 6) * bias;
        const release = Math.max(thr, (prefs as any).stickyHysteresis || Math.round(thr * 1.6));

        // Compute ghost placement after current delta
        const leftAfter = gb.x + dx;
        const rightAfter = gb.x + gb.width + dx;
        const cxAfter = gb.x + gb.width * 0.5 + dx;
        const topAfter = gb.y + dy;
        const bottomAfter = gb.y + gb.height + dy;
        const cyAfter = gb.y + gb.height * 0.5 + dy;

        const vLines = (cand.canvas.v || []).concat(cand.vLines || []);
        const hLines = (cand.canvas.h || []).concat(cand.hLines || []);

        // Helper to find nearest candidate for axis
        const nearest = (value: number, lines: number[], limit: number): { pos: number; d: number } | null => {
          let best: { pos: number; d: number } | null = null;
          for (const ln of lines) {
            const d = Math.abs(value - ln);
            if (d <= limit && (!best || d < best.d)) best = { pos: ln, d };
          }
          return best;
        };

        // Evaluate X candidates for left/center/right, preferring center if equal
        const nxL = nearest(leftAfter, vLines, thr);
        const nxC = nearest(cxAfter, vLines, thr);
        const nxR = nearest(rightAfter, vLines, thr);
        let snapX: { pos: number; target: 'left' | 'center' | 'right' } | null = null;
        if (nxL || nxC || nxR) {
          const pick = [nxC && { ...nxC, tgt: 'center' as const }, nxL && { ...nxL, tgt: 'left' as const }, nxR && { ...nxR, tgt: 'right' as const }]
            .filter(Boolean) as Array<{ pos: number; d: number; tgt: 'left' | 'center' | 'right' }>;
          pick.sort((a, b) => a.d - b.d);
          const best = pick[0]!; snapX = { pos: best.pos, target: best.tgt };
        }

        // Evaluate Y candidates for top/center/bottom, preferring center if equal
        const nyT = nearest(topAfter, hLines, thr);
        const nyC = nearest(cyAfter, hLines, thr);
        const nyB = nearest(bottomAfter, hLines, thr);
        let snapY: { pos: number; target: 'top' | 'center' | 'bottom' } | null = null;
        if (nyT || nyC || nyB) {
          const pick = [nyC && { ...nyC, tgt: 'center' as const }, nyT && { ...nyT, tgt: 'top' as const }, nyB && { ...nyB, tgt: 'bottom' as const }]
            .filter(Boolean) as Array<{ pos: number; d: number; tgt: 'top' | 'center' | 'bottom' }>;
          pick.sort((a, b) => a.d - b.d);
          const best = pick[0]!; snapY = { pos: best.pos, target: best.tgt };
        }

        // Apply sticky locks if already engaged; otherwise engage when within threshold
        if (this.snapLock.x != null && this.snapLock.targetX) {
          const current = this.snapLock.targetX === 'left' ? leftAfter : this.snapLock.targetX === 'right' ? rightAfter : cxAfter;
          if (Math.abs(current - this.snapLock.x) <= release) {
            const targetVal = this.snapLock.x;
            if (this.snapLock.targetX === 'left') dx += (targetVal - leftAfter);
            else if (this.snapLock.targetX === 'right') dx += (targetVal - rightAfter);
            else dx += (targetVal - cxAfter);
          } else {
            this.snapLock.x = undefined; this.snapLock.targetX = undefined;
          }
        } else if (snapX) {
          // Engage lock and align immediately
          this.snapLock.x = snapX.pos; this.snapLock.targetX = snapX.target;
          if (snapX.target === 'left') dx += (snapX.pos - leftAfter);
          else if (snapX.target === 'right') dx += (snapX.pos - rightAfter);
          else dx += (snapX.pos - cxAfter);
        }

        if (this.snapLock.y != null && this.snapLock.targetY) {
          const current = this.snapLock.targetY === 'top' ? topAfter : this.snapLock.targetY === 'bottom' ? bottomAfter : cyAfter;
          if (Math.abs(current - this.snapLock.y) <= release) {
            const targetVal = this.snapLock.y;
            if (this.snapLock.targetY === 'top') dy += (targetVal - topAfter);
            else if (this.snapLock.targetY === 'bottom') dy += (targetVal - bottomAfter);
            else dy += (targetVal - cyAfter);
          } else {
            this.snapLock.y = undefined; this.snapLock.targetY = undefined;
          }
        } else if (snapY) {
          this.snapLock.y = snapY.pos; this.snapLock.targetY = snapY.target;
          if (snapY.target === 'top') dy += (snapY.pos - topAfter);
          else if (snapY.target === 'bottom') dy += (snapY.pos - bottomAfter);
          else dy += (snapY.pos - cyAfter);
        }
      } catch {}
      this.selected.forEach((obj) => { if (obj.position) { obj.position.x += dx; obj.position.y += dy; } }); this.dragStart.x += dx; this.dragStart.y += dy; this.overlay.refreshBoundsOnly(container); try { const b = this.overlay.getGroup()?.bounds; if (b) this.guides.update(container, this.selected, b); } catch {} return;
    }
    if (this.marquee.isActive()) { this.marquee.update(p); return; }
    const group = this.overlay.getGroup(); if (group) { const hoverHandle = this.overlay.findHandleAtPoint(p, true); if (hoverHandle) this.cursor = this.cursorForHandle(hoverHandle); else if (this.overlay.pointInRect(p, group.bounds)) this.cursor = 'move'; else this.cursor = 'default'; } else { this.cursor = 'default'; }
  }

  public onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; const p = container.toLocal(event.global);
    if ((this.transformer as any).isActive && (this.transformer as any).isActive()) { this.transformer.end(); this.overlay.refreshBoundsOnly(container); this.isDragging = false; this.mode = 'idle'; this.cursor = 'default'; this.guides.clear(); return; }
    if (this.isDraggingGroup) { this.isDraggingGroup = false; }
    if (this.marquee.isActive()) { this.selected = this.marquee.finish(p, container, this.click, this.selected); this.overlay.refresh(this.selected, container); }
    this.mode = 'idle'; this.isDragging = false; this.cursor = 'default'; this.guides.clear(); this.emitSelectionContext();
  }

  public onActivate(): void { super.onActivate(); document.addEventListener('selection:distribute', this.handleDistribute); }
  public onDeactivate(): void { super.onDeactivate(); this.overlay.clear(); this.guides.clear(); if (this.container) {/* keep */} document.removeEventListener('selection:distribute', this.handleDistribute); }

  private handleDistribute = (evt: Event) => {
    const group = this.overlay.getGroup(); if (!group || !this.container) return; const e = evt as CustomEvent; const dir = e.detail && (e.detail.direction as 'horizontal' | 'vertical'); if (!dir) return; this.distribute(dir);
  };

  private distribute(direction: 'horizontal' | 'vertical'): void {
    if (!this.container || !this.selected || this.selected.length < 3) return;
    const items = this.selected.map(obj => ({ obj, b: this.boundsInContainer(obj, this.container!) })).filter(it => it.b.width > 0.01 && it.b.height > 0.01);
    if (items.length < 3) return;
    if (direction === 'horizontal') {
      items.sort((a, b) => a.b.x - b.b.x); const first = items[0], last = items[items.length - 1]; const span = (last.b.x + last.b.width) - first.b.x; const sizes = items.reduce((s, it) => s + it.b.width, 0); const gap = (span - sizes) / (items.length - 1); let x = first.b.x; for (let i = 1; i < items.length - 1; i++) { const it = items[i]; x += items[i - 1].b.width + gap; const dx = x - it.b.x; moveObjectByContainerDelta(it.obj, dx, 0, this.container!); it.b.x += dx; }
    } else {
      items.sort((a, b) => a.b.y - b.b.y); const first = items[0], last = items[items.length - 1]; const span = (last.b.y + last.b.height) - first.b.y; const sizes = items.reduce((s, it) => s + it.b.height, 0); const gap = (span - sizes) / (items.length - 1); let y = first.b.y; for (let i = 1; i < items.length - 1; i++) { const it = items[i]; y += items[i - 1].b.height + gap; const dy = y - it.b.y; moveObjectByContainerDelta(it.obj, 0, dy, this.container!); it.b.y += dy; }
    }
    this.overlay.refreshBoundsOnly(this.container!);
  }

  // Keyboard shortcuts
  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return; const key = event.key; const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && (key === 'c' || key === 'C')) { const ok = this.clipboardSvc.copy(); if (ok) { console.log('📋 COPY: selection copied'); event.preventDefault(); } else { console.log('📋 COPY: nothing copied'); } return; }
    if (isMeta && (key === 'v' || key === 'V')) { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; this.overlay.refresh(this.selected, this.container || this.displayManager?.getRoot()!); console.log(`📋 PASTE: created ${created.length} item(s)`); } else { console.log('📋 PASTE: clipboard empty or construct failed'); } event.preventDefault(); return; }
    if (isMeta && (key === 'd' || key === 'D')) { const ok = this.clipboardSvc.copy(); if (ok) { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; if (this.container) this.overlay.refresh(this.selected, this.container); console.log(`📄 DUPLICATE: ${created.length} item(s)`); } } event.preventDefault(); return; }
    if (isMeta && (key === 'x' || key === 'X')) { if (this.clipboardSvc.cut()) { this.overlay.clear(); console.log('✂️ CUT: selection cut'); } event.preventDefault(); return; }
    if (isMeta && (key === 'g' || key === 'G') && !event.shiftKey) { if (this.groupSelection()) { this.overlay.refresh(this.selected, this.container || this.displayManager?.getRoot()!); console.log('🧩 GROUP: grouped selection'); } event.preventDefault(); return; }
    if (isMeta && (key === 'g' || key === 'G') && event.shiftKey) { if (this.ungroupSelection()) { this.overlay.refresh(this.selected, this.container || this.displayManager?.getRoot()!); console.log('🧩 UNGROUP: ungrouped selection'); } event.preventDefault(); return; }
    // Z-order shortcuts: Cmd/Ctrl + ] / [  (Shift = to front/back)
    if (isMeta && (key === ']' || key === '}')) { if (event.shiftKey) { this.bringToFront(); } else { this.bringForward(); } event.preventDefault(); return; }
    if (isMeta && (key === '[' || key === '{')) { if (event.shiftKey) { this.sendToBack(); } else { this.sendBackward(); } event.preventDefault(); return; }
    // Lock toggle: Cmd/Ctrl+L
    if (isMeta && (key === 'l' || key === 'L')) { this.toggleLock(); event.preventDefault(); return; }
    if ((key === 'Backspace' || key === 'Delete') && this.selected.length > 0) {
      // Capture object refs and placement for history
      const removed = this.selected.map(obj => ({ obj, parent: obj.parent as Container | null, index: obj.parent ? obj.parent.getChildIndex(obj) : -1 }));
      
      // Remove from DisplayObjectManager first (this will handle parent removal and fire events)
      removed.forEach(({ obj }) => { 
        try { 
          if (this.displayManager && (this.displayManager as any).remove) {
            // Use DisplayObjectManager.remove() which handles parent removal and events
            (this.displayManager as any).remove(obj);
          } else if (obj.parent) {
            // Fallback to direct removal if DisplayObjectManager unavailable
            obj.parent.removeChild(obj); 
          }
        } catch {} 
      });
      
      this.selected = []; this.overlay.clear();
      try {
        historyManager.push({
          label: 'Delete',
          undo: () => { 
            removed.forEach(({ obj, parent, index }) => { 
              if (!parent) return; 
              try { 
                if (index >= 0 && index <= parent.children.length) {
                  parent.addChildAt(obj, Math.min(index, parent.children.length)); 
                } else {
                  parent.addChild(obj); 
                }
                // Re-register with DisplayObjectManager on undo
                if (this.displayManager && (this.displayManager as any).add) {
                  (this.displayManager as any).add(obj, parent);
                }
              } catch {} 
            }); 
          },
          redo: () => { 
            removed.forEach(({ obj }) => { 
              try { 
                if (this.displayManager && (this.displayManager as any).remove) {
                  (this.displayManager as any).remove(obj);
                } else if (obj.parent) {
                  obj.parent.removeChild(obj); 
                }
              } catch {} 
            }); 
          },
        });
      } catch {}
      event.preventDefault(); return; }
    if (key === 'Escape' && this.selected.length > 0) { this.selected = []; this.overlay.clear(); event.preventDefault(); return; }
  }

  public updateSettings(settings: any): void { this.settings = { ...this.settings, ...settings }; }
  public applySettingsToSelection(toolName: string, settings: any): void {
    // Handle animation-path operations
    if (toolName === 'path' && settings && settings.action === 'clear') {
      try {
        const scenes = animationState.getScenes();
        if (!scenes.length) return;
        const scene = scenes[scenes.length - 1];
        for (const obj of this.selected) {
          const a = (obj as any).__animation;
          if (a && a.paths && a.paths[scene.getId()]) {
            delete a.paths[scene.getId()];
          }
        }
      } catch {}
      return;
    }
    // Default behavior for styling
    const changed = this.styling.apply(toolName, settings, this.selected);
    if (changed && this.container) { this.overlay.refresh(this.selected, this.container); }
  }
  public copySelection(): boolean { return this.clipboardSvc.copy(); }
  public pasteSelection(): boolean { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; if (this.container) this.overlay.refresh(this.selected, this.container); return true; } return false; }
  public groupSelection(): boolean { const r = this.grouping.group(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); return true; } return false; }
  public ungroupSelection(): boolean { const r = this.grouping.ungroup(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); return true; } return false; }

  // Layer and lock helpers
  private toggleLock(): void {
    if (!this.selected.length) return;
    const before = this.selected.map(o => ({ obj: o, locked: !!(o as any).__locked }));
    const nextLocked = !before.every(x => x.locked); // if any unlocked, lock all; else unlock all
    before.forEach(({ obj }) => { (obj as any).__locked = nextLocked; try { (obj as any).eventMode = nextLocked ? 'none' : 'static'; (obj as any).interactiveChildren = !nextLocked; } catch {} });
    try { historyManager.push({ label: nextLocked ? 'Lock' : 'Unlock', undo: () => before.forEach(({ obj, locked }) => { (obj as any).__locked = locked; try { (obj as any).eventMode = locked ? 'none' : 'static'; (obj as any).interactiveChildren = !locked; } catch {} }), redo: () => before.forEach(({ obj }) => { (obj as any).__locked = nextLocked; try { (obj as any).eventMode = nextLocked ? 'none' : 'static'; (obj as any).interactiveChildren = !nextLocked; } catch {} }) }); } catch {}
  }

  public toggleVisibility(show?: boolean): void {
    if (!this.selected.length) return;
    const before = this.selected.map(o => ({ obj: o, visible: (o as any).visible !== false }));
    const target = show === undefined ? !before.every(x => x.visible) : show;
    before.forEach(({ obj }) => { (obj as any).visible = target; });
    try { historyManager.push({ label: target ? 'Show' : 'Hide', undo: () => before.forEach(({ obj, visible }) => { (obj as any).visible = visible; }), redo: () => before.forEach(({ obj }) => { (obj as any).visible = target; }) }); } catch {}
  }

  public bringToFront(): void { this.reorderSelected('front'); }
  public sendToBack(): void { this.reorderSelected('back'); }
  public bringForward(): void { this.reorderSelected('forward'); }
  public sendBackward(): void { this.reorderSelected('backward'); }

  private reorderSelected(kind: 'front' | 'back' | 'forward' | 'backward'): void {
    if (!this.selected.length) return; const changes: Array<{ obj: any; parent: Container; from: number; to: number } > = [];
    for (const obj of this.selected) {
      const parent = (obj as any).parent as Container | null; if (!parent) continue;
      const from = parent.getChildIndex ? parent.getChildIndex(obj) : parent.children.indexOf(obj);
      if (from < 0) continue; let to = from;
      if (kind === 'front') to = parent.children.length - 1;
      if (kind === 'back') to = 0;
      if (kind === 'forward') to = Math.min(parent.children.length - 1, from + 1);
      if (kind === 'backward') to = Math.max(0, from - 1);
      if (to === from) continue;
      try { if (typeof parent.setChildIndex === 'function') parent.setChildIndex(obj, to); else { parent.removeChild(obj); parent.addChildAt(obj, to); } changes.push({ obj, parent, from, to }); } catch {}
    }
    if (changes.length) {
      try { historyManager.push({ label: `Reorder ${kind}`, undo: () => changes.forEach(({ obj, parent, from }) => { try { if (typeof parent.setChildIndex === 'function') parent.setChildIndex(obj, from); else { parent.removeChild(obj); parent.addChildAt(obj, from); } } catch {} }), redo: () => changes.forEach(({ obj, parent, to }) => { try { if (typeof parent.setChildIndex === 'function') parent.setChildIndex(obj, to); else { parent.removeChild(obj); parent.addChildAt(obj, to); } } catch {} }) }); } catch {}
      if (this.container) this.overlay.refreshBoundsOnly(this.container);
    }
  }

  public getCursor(): string { return this.cursor; }

  private boundsInContainer(obj: any, container: Container): Rectangle {
    try { const wb = obj.getBounds(); const tl = container.toLocal(new Point(wb.x, wb.y)); const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height)); const x = Math.min(tl.x, br.x); const y = Math.min(tl.y, br.y); const w = Math.abs(br.x - tl.x); const h = Math.abs(br.y - tl.y); return new Rectangle(x, y, w, h); } catch { return new Rectangle(0, 0, 0, 0); }
  }

  private cursorForHandle(h: any): string {
    if (h.type === 'rotation') {
      // Return directional rotation cursors using Lucide icons based on your mapping:
      // corner-down-left → bottom right corner (br)
      // corner-down-right → bottom left corner (bl)  
      // corner-up-left → top right corner (tr)
      // corner-up-right → top left corner (tl)
      switch (h.position) {
        case 'tl': return 'url("/src/assets/icons/corner-up-right-icon.svg") 12 12, crosshair';  // top-left corner
        case 'tr': return 'url("/src/assets/icons/corner-up-left-icon.svg") 12 12, crosshair';   // top-right corner  
        case 'bl': return 'url("/src/assets/icons/corner-down-right-icon.svg") 12 12, crosshair'; // bottom-left corner
        case 'br': return 'url("/src/assets/icons/corner-down-left-icon.svg") 12 12, crosshair';  // bottom-right corner
        default: return 'crosshair'; // fallback for center rotation handles
      }
    }
    if (h.type === 'edge') { switch (h.position) { case 't': case 'b': return 'ns-resize'; case 'l': case 'r': return 'ew-resize'; } }
    switch (h.position) { case 'tl': case 'br': return 'nwse-resize'; case 'tr': case 'bl': return 'nesw-resize'; default: return 'move'; }
  }

  private emitSelectionContext(): void { try { const type = determineSelectionType(this.selected); const detail = { type, count: this.selected.length } as any; const evt = new CustomEvent('selection:context', { detail }); document.dispatchEvent(evt); } catch {} }
}
