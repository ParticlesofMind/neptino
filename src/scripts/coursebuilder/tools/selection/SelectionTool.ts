import { Container, FederatedPointerEvent, Point, Rectangle } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
import { ClickSelection } from './clickSelection';
import { SelectionClipboard } from './SelectionClipboard';
import { SelectionOverlay } from './SelectionOverlay';
import { SmartGuides } from './SmartGuides';
import { SelectionMarquee } from './SelectionMarquee';
import { TransformController } from './TransformController';
import { SelectionGrouping } from './SelectionGrouping';
import { SelectionStyling } from './SelectionStyling';
import { determineSelectionType, moveObjectByContainerDelta } from './SelectionUtils';

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
  private uiContainer: Container | null = null;

  private isDraggingGroup = false;
  public isDragging: boolean = false;
  private dragStart = new Point();
  private mode: Mode = 'idle';
  private lastPointerGlobal: Point | null = null;

  constructor() {
    super('selection', 'default');
    this.clipboardSvc = new SelectionClipboard({
      getSelected: () => this.selected,
      setSelected: (arr) => { this.selected = arr; },
      getContainer: () => this.container || this.displayManager?.getRoot() || null,
      displayManager: this.displayManager,
    });
  }

  public setUILayer(container: Container) { this.uiContainer = container; this.overlay.setUILayer(container); this.guides.setUILayer(container); this.marquee.setUILayer(container); }
  public override setDisplayObjectManager(manager: any): void { super.setDisplayObjectManager(manager); this.clipboardSvc.setDisplayManager(manager); }

  public onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; this.container = container; const p = container.toLocal(event.global); this.lastPointerGlobal = new Point(event.global.x, event.global.y);
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
          getCanvasBounds: this.manager && this.manager.getCanvasBounds ? () => this.manager.getCanvasBounds() : undefined,
          allowMirroring: true,
          restorePivotOnEnd: false,
          rotationSnapDeg: 15,
          scaleSnapStep: 0.05,
          modifiers: { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey },
        }
      );
      return;
    }
    if (group && this.overlay.pointInRect(p, group.bounds)) {
      this.isDraggingGroup = true; this.mode = 'drag'; this.cursor = 'grabbing'; this.isDragging = true; this.dragStart.copyFrom(p); return;
    }
    const result = this.click.handleClick(
      p,
      container,
      { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey },
      (object, point, cont) => {
      try { (window as any).toolStateManager?.setTool('text'); setTimeout(() => { const textTool = this.manager?.getActiveTool && this.manager.getActiveTool(); (textTool as any)?.activateTextObjectForEditing?.(object, point, cont); }, 0); } catch {}
      }
    );
    if (result.clickedObject) {
      const action = this.click.getSelectionAction(result.clickedObject, this.selected, event.shiftKey); this.selected = this.click.applySelectionAction(action, this.selected); this.overlay.refresh(this.selected, container);
      const bounds = this.overlay.getGroup()?.bounds; if (bounds && this.overlay.pointInRect(p, bounds)) { this.isDraggingGroup = true; this.mode = 'drag'; this.cursor = 'grabbing'; this.isDragging = true; this.dragStart.copyFrom(p); try { this.guides.update(container, this.selected, bounds); } catch {} }
      this.emitSelectionContext();
      return;
    }
    this.marquee.startMarquee(p, container, !!event.shiftKey);
  }

  public onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; const p = container.toLocal(event.global); this.lastPointerGlobal = new Point(event.global.x, event.global.y);
    if ((this.transformer as any).isActive && (this.transformer as any).isActive()) {
      this.transformer.update(p, { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey });
      const mode = this.mode; const group = this.overlay.getGroup();
      if (mode === 'rotate' && (this as any)._rotateCenter && (this as any)._rotateBase && group) {
        const cx = (this as any)._rotateCenter.x; const cy = (this as any)._rotateCenter.y; const dx = p.x - cx; const dy = p.y - cy; const currentAngle = Math.atan2(dy, dx); const delta = currentAngle - (this as any)._rotateStartRef; this.overlay.setRotationPreview(new Point(cx, cy), (this as any)._rotateBase, delta, container);
      } else { this.overlay.refreshBoundsOnly(container); const b = this.overlay.getGroup()?.bounds; if (b) try { this.guides.update(container, this.selected, b); } catch {} }
      return;
    }
    if (this.isDraggingGroup && this.overlay.getGroup()) {
      let dx = p.x - this.dragStart.x; let dy = p.y - this.dragStart.y;
      try { const snapped = (window as any).snapManager?.snapPoint ? (window as any).snapManager.snapPoint(p) : null; if (snapped) { dx = snapped.x - this.dragStart.x; dy = snapped.y - this.dragStart.y; } } catch {}
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
    if (isMeta && (key === 'x' || key === 'X')) { if (this.clipboardSvc.cut()) { this.overlay.clear(); console.log('✂️ CUT: selection cut'); } event.preventDefault(); return; }
    if ((key === 'Backspace' || key === 'Delete') && this.selected.length > 0) { const toRemove = [...this.selected]; toRemove.forEach((obj) => { try { if (this.displayManager && (this.displayManager as any).remove) { (this.displayManager as any).remove(obj); } else if (obj?.parent) { obj.parent.removeChild(obj); obj.destroy?.(); } } catch {} }); this.selected = []; this.overlay.clear(); event.preventDefault(); return; }
    if (key === 'Escape' && this.selected.length > 0) { this.selected = []; this.overlay.clear(); event.preventDefault(); return; }
  }

  public updateSettings(settings: any): void { this.settings = { ...this.settings, ...settings }; }
  public applySettingsToSelection(toolName: string, settings: any): void { const changed = this.styling.apply(toolName, settings, this.selected); if (changed && this.container) { this.overlay.refresh(this.selected, this.container); } }
  public copySelection(): boolean { return this.clipboardSvc.copy(); }
  public pasteSelection(): boolean { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; if (this.container) this.overlay.refresh(this.selected, this.container); return true; } return false; }
  public groupSelection(): boolean { const r = this.grouping.group(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); return true; } return false; }
  public ungroupSelection(): boolean { const r = this.grouping.ungroup(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); return true; } return false; }

  public getCursor(): string { return this.cursor; }

  private boundsInContainer(obj: any, container: Container): Rectangle {
    try { const wb = obj.getBounds(); const tl = container.toLocal(new Point(wb.x, wb.y)); const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height)); const x = Math.min(tl.x, br.x); const y = Math.min(tl.y, br.y); const w = Math.abs(br.x - tl.x); const h = Math.abs(br.y - tl.y); return new Rectangle(x, y, w, h); } catch { return new Rectangle(0, 0, 0, 0); }
  }

  private cursorForHandle(h: any): string {
    if (h.type === 'rotation') return 'crosshair';
    if (h.type === 'edge') { switch (h.position) { case 't': case 'b': return 'ns-resize'; case 'l': case 'r': return 'ew-resize'; } }
    switch (h.position) { case 'tl': case 'br': return 'nwse-resize'; case 'tr': case 'bl': return 'nesw-resize'; default: return 'move'; }
  }

  private emitSelectionContext(): void { try { const type = determineSelectionType(this.selected); const detail = { type, count: this.selected.length } as any; const evt = new CustomEvent('selection:context', { detail }); document.dispatchEvent(evt); } catch {} }
}
