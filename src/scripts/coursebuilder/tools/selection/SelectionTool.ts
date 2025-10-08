import { Container, FederatedPointerEvent, Point, Rectangle } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
import { snapManager } from './guides/SnapManager';
import { ClickSelection } from './clickSelection';
import { SelectionClipboard } from './SelectionClipboard';
import { SelectionOverlay } from './SelectionOverlay';
import { SmartGuides } from './guides';
import { SelectionMarquee } from './SelectionMarquee';
import { TransformController } from './TransformController';
import { SelectionGrouping } from './SelectionGrouping';
import { SelectionStyling } from './SelectionStyling';
import { animationState } from '../../animation/AnimationState';
import { determineSelectionType, moveObjectByContainerDelta, computeCombinedBoundsLocal } from './SelectionUtils';
import { historyManager } from '../../canvas/HistoryManager';
import { PenPathEditor } from '../pen/PenPathEditor';

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
  private penEditor: PenPathEditor;

  private selected: any[] = [];
  private container: Container | null = null;

  private isDraggingGroup = false;
  public isDragging: boolean = false;
  private dragStart = new Point();
  private mode: Mode = 'idle';
  private lastPointerGlobal: Point | null = null;
  private rotateBaseRect: Rectangle | null = null;
  private rotateCenter: Point | null = null;
  private rotateStartRef = 0;
  private rotateBaseAngle = 0;

  constructor() {
    super('selection', 'default');
    this.clipboardSvc = new SelectionClipboard({
      getSelected: () => this.selected,
      setSelected: (arr) => { this.selected = arr; this.updateObjectSelectionStates(); },
      getContainer: () => this.container || this.displayManager?.getRoot() || null,
      displayManager: this.displayManager,
    });
    this.penEditor = new PenPathEditor({
      onCommit: this.handlePenEditFinalize,
      onCancel: this.handlePenEditFinalize,
    });
  }

  public setUILayer(container: Container) { 
    this.container = container; 
    this.overlay.setUILayer(container); 
    this.guides.setUILayer(container); 
    this.marquee.setUILayer(container); 
    
    // Add debug command for smart guides
    (window as any).testSmartGuides = () => {
      console.log('🧪 Testing Smart Guides from SelectionTool');
      this.guides.debugTest();
    };
  }
  public override setDisplayObjectManager(manager: any): void { super.setDisplayObjectManager(manager); this.clipboardSvc.setDisplayManager(manager); }

  public onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; 
    this.container = container; 
    this.lastPointerGlobal = new Point(event.global.x, event.global.y);

    if (this.penEditor.isEditing()) {
      const consumed = this.penEditor.handlePointerDown(event, container);
      if (consumed) {
        return;
      }
    }

    const p = container.toLocal(event.global);

    // First, check for double-click interactions (text highest priority)
    const clickResult = this.click.handleClick(
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
    if (clickResult.isTextDoubleClick) {
      return;
    }

    if (clickResult.isDoubleClick) {
      const clicked = clickResult.clickedObject;
      if (clicked && this.isPenShape(clicked)) {
        if (this.beginPenEditing(clicked, container)) {
          return;
        }
      }
    }

    const group = this.overlay.getGroup();
    const handle = this.overlay.findHandleAtPoint(p, true);
    if (handle && group) {
      this.mode = handle.type === 'rotation' ? 'rotate' : 'scale'; this.cursor = this.cursorForHandle(handle); this.isDragging = true;
      if (handle.type === 'rotation') {
        const frame = group.frame;
        const bounds = group.bounds.clone();
        const cx = frame?.center.x ?? bounds.x + bounds.width * 0.5;
        const cy = frame?.center.y ?? bounds.y + bounds.height * 0.5;
        const dx0 = p.x - cx; const dy0 = p.y - cy;
        this.rotateStartRef = Math.atan2(dy0, dx0);
        this.rotateCenter = new Point(cx, cy);
        const baseWidth = frame?.width ?? bounds.width;
        const baseHeight = frame?.height ?? bounds.height;
        this.rotateBaseRect = new Rectangle(0, 0, baseWidth, baseHeight);
        this.rotateBaseAngle = frame?.rotation ?? 0;
        this.overlay.setRotationState(this.rotateCenter, this.rotateBaseRect, this.rotateBaseAngle);
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
    if (clickResult.clickedObject) {
      const action = this.click.getSelectionAction(clickResult.clickedObject, this.selected, event.shiftKey); this.selected = this.click.applySelectionAction(action, this.selected); this.overlay.refresh(this.selected, container);
      this.updateObjectSelectionStates();
      const bounds = this.overlay.getGroup()?.bounds; if (bounds && this.overlay.pointInRect(p, bounds)) { this.isDraggingGroup = true; this.mode = 'drag'; this.cursor = 'grabbing'; this.isDragging = true; this.dragStart.copyFrom(p); try { this.guides.update(container, this.selected, bounds); } catch {} }
      this.emitSelectionContext();
      return;
    }
    
    // Only start marquee selection if no object was clicked
    this.marquee.startMarquee(p, container, !!event.shiftKey);
  }

  public onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; this.lastPointerGlobal = new Point(event.global.x, event.global.y);

    if (this.penEditor.isEditing()) {
      this.penEditor.handlePointerMove(event, container);
      return;
    }

    const p = container.toLocal(event.global);
    if ((this.transformer as any).isActive && (this.transformer as any).isActive()) {
      this.transformer.update(p, { shiftKey: event.shiftKey, altKey: (event as any).altKey, ctrlKey: (event as any).ctrlKey || (event as any).metaKey });
      const mode = this.mode; const group = this.overlay.getGroup();
      if (mode === 'rotate' && this.rotateCenter && this.rotateBaseRect && group) {
        const cx = this.rotateCenter.x; const cy = this.rotateCenter.y; const dx = p.x - cx; const dy = p.y - cy; const currentAngle = Math.atan2(dy, dx); 
        let delta = currentAngle - this.rotateStartRef; 
        // Apply same snapping logic as TransformController when shift is held
        if (event.shiftKey) {
          const rotationSnapRad = 15 * Math.PI / 180; // 15 degrees in radians
          delta = Math.round(delta / rotationSnapRad) * rotationSnapRad;
        }
        const previewAngle = this.rotateBaseAngle + delta;
        this.overlay.setRotationPreview(new Point(cx, cy), this.rotateBaseRect, previewAngle);
      } else { 
        this.overlay.refreshBoundsOnly(container); 
        const b = this.overlay.getGroup()?.bounds; 
        if (b) {
          try { 
            // Use resize guides during scale operations
            if (this.mode === 'scale') {
              this.guides.updateResizeGuides(container, this.selected, b, 'both');
            } else {
              this.guides.update(container, this.selected, b); 
            }
          } catch {} 
        }
      }
      return;
    }
    if (this.isDraggingGroup && this.overlay.getGroup()) {
      let dx = p.x - this.dragStart.x; let dy = p.y - this.dragStart.y;
      try {
        // First, snap the pointer itself to make coarse snapping easy
        const snapped = snapManager.snapPoint(p, { container, exclude: this.selected });
        if (snapped) { dx = snapped.x - this.dragStart.x; dy = snapped.y - this.dragStart.y; }

        // Enhanced magnetic alignment with dynamic equal-spacing snap
        // Manual snapping disabled - smart guides control all alignment
      } catch {}
      this.selected.forEach((obj) => { if (obj.position) { obj.position.x += dx; obj.position.y += dy; } }); this.dragStart.x += dx; this.dragStart.y += dy; this.overlay.refreshBoundsOnly(container); try { const b = this.overlay.getGroup()?.bounds; if (b) this.guides.update(container, this.selected, b); } catch {} return;
    }
    if (this.marquee.isActive()) { this.marquee.update(p); return; }
    const group = this.overlay.getGroup(); if (group) { const hoverHandle = this.overlay.findHandleAtPoint(p, true); if (hoverHandle) this.cursor = this.cursorForHandle(hoverHandle); else if (this.overlay.pointInRect(p, group.bounds)) this.cursor = 'move'; else this.cursor = 'default'; } else { this.cursor = 'default'; }
  }

  public onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return; 
    if (this.penEditor.isEditing()) {
      this.penEditor.handlePointerUp(event);
      return;
    }
    const p = container.toLocal(event.global);
  if ((this.transformer as any).isActive && (this.transformer as any).isActive()) { this.transformer.end(); this.overlay.refreshBoundsOnly(container); this.rotateBaseRect = null; this.rotateCenter = null; this.rotateBaseAngle = 0; this.rotateStartRef = 0; this.isDragging = false; this.mode = 'idle'; this.cursor = 'default'; this.guides.clear(); return; }
    if (this.isDraggingGroup) { this.isDraggingGroup = false; }
    if (this.marquee.isActive()) { this.selected = this.marquee.finish(p, container, this.click, this.selected); this.overlay.refresh(this.selected, container); this.updateObjectSelectionStates(); }
    this.mode = 'idle'; this.isDragging = false; this.cursor = 'default'; this.guides.clear(); this.emitSelectionContext();
  }

  public onActivate(): void { 
    super.onActivate(); 
    document.addEventListener('selection:distribute', this.handleDistribute);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }
  
  public onDeactivate(): void { 
    super.onDeactivate(); 
    if (this.penEditor.isEditing()) { this.penEditor.cancel(); } 
    this.overlay.clear(); 
    this.guides.clear(); 
    if (this.container) {/* keep */} 
    document.removeEventListener('selection:distribute', this.handleDistribute);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleDistribute = (evt: Event) => {
    const group = this.overlay.getGroup(); if (!group || !this.container) return; const e = evt as CustomEvent; const dir = e.detail && (e.detail.direction as 'horizontal' | 'vertical'); if (!dir) return; this.distribute(dir);
  };

  private handleKeyDown = (evt: KeyboardEvent) => {
    this.guides.handleKeyDown(evt);
  };

  private handleKeyUp = (evt: KeyboardEvent) => {
    this.guides.handleKeyUp(evt);
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

  private beginPenEditing(target: any, container: Container): boolean {
    if (!target) return false;
    if (!this.penEditor.startEditing(target, container)) {
      return false;
    }
    this.selected = [target];
    this.overlay.clear();
    this.guides.clear();
    this.cursor = 'default';
    this.isDragging = false;
    this.mode = 'idle';
    this.updateObjectSelectionStates();
    this.emitSelectionContext();
    return true;
  }

  private isPenShape(obj: any): boolean {
    return !!(obj && (obj as any).__toolType === 'pen');
  }

  // Keyboard shortcuts
  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return; 
    if (this.penEditor.isEditing()) {
      if (this.penEditor.handleKeyDown(event)) {
        event.preventDefault();
        return;
      }
    }
    const key = event.key; const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && (key === 'c' || key === 'C')) { const ok = this.clipboardSvc.copy(); if (ok) { console.log('📋 COPY: selection copied'); event.preventDefault(); } else { console.log('📋 COPY: nothing copied'); } return; }
    if (isMeta && (key === 'v' || key === 'V')) { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; this.overlay.refresh(this.selected, this.container || this.displayManager?.getRoot()!); this.updateObjectSelectionStates(); console.log(`📋 PASTE: created ${created.length} item(s)`); } else { console.log('📋 PASTE: clipboard empty or construct failed'); } event.preventDefault(); return; }
    if (isMeta && (key === 'd' || key === 'D')) { const ok = this.clipboardSvc.copy(); if (ok) { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; if (this.container) this.overlay.refresh(this.selected, this.container); this.updateObjectSelectionStates(); console.log(`📄 DUPLICATE: ${created.length} item(s)`); } } event.preventDefault(); return; }
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
      
      this.selected = []; this.overlay.clear(); this.updateObjectSelectionStates();
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
    if (key === 'Escape' && this.selected.length > 0) { this.selected = []; this.overlay.clear(); this.updateObjectSelectionStates(); event.preventDefault(); return; }
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
    if (changed) {
      // Notify interested UI (LayersPanel) so thumbnails can refresh without full rerender
      try {
        const dm: any = (this as any).displayManager;
        for (const obj of this.selected) {
          let id: string | null = null;
          try { id = (obj as any).__id || (obj as any).objectId || (dm?.getIdForObject?.(obj) ?? null); } catch {}
          if (!id) {
            // Assign a temporary objectId for event correlation if none exists
            const tmp = `sel_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            try { (obj as any).objectId = tmp; } catch {}
            id = tmp;
          }
          try { document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id, object: obj, action: 'styled' } })); } catch {}
          try { document.dispatchEvent(new CustomEvent('displayObject:styled', { detail: { id, object: obj } })); } catch {}
        }
      } catch {}
      if (this.container) { this.overlay.refresh(this.selected, this.container); }
    }
  }
  public copySelection(): boolean { return this.clipboardSvc.copy(); }
  public pasteSelection(): boolean { const created = this.clipboardSvc.pasteAt(this.lastPointerGlobal || null); if (created.length) { this.selected = created; if (this.container) this.overlay.refresh(this.selected, this.container); this.updateObjectSelectionStates(); return true; } return false; }
  public groupSelection(): boolean { const r = this.grouping.group(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); this.updateObjectSelectionStates(); return true; } return false; }
  public ungroupSelection(): boolean { const r = this.grouping.ungroup(this.selected, this.container, this.displayManager); if (r && this.container) { this.selected = r.newSelection; this.overlay.refresh(this.selected, this.container); this.updateObjectSelectionStates(); return true; } return false; }
  public flipHorizontal(): boolean { return this.flipSelection('horizontal'); }
  public flipVertical(): boolean { return this.flipSelection('vertical'); }

  private flipSelection(axis: 'horizontal' | 'vertical'): boolean {
    if (!this.selected.length) return false;
    const container = this.container || this.displayManager?.getRoot?.();
    if (!container) return false;

    const bounds = computeCombinedBoundsLocal(this.selected, container);
    const widthOk = bounds.width > 0.0001;
    const heightOk = bounds.height > 0.0001;
    if ((axis === 'horizontal' && !widthOk) || (axis === 'vertical' && !heightOk)) {
      return false;
    }

    const center = new Point(
      bounds.x + bounds.width * 0.5,
      bounds.y + bounds.height * 0.5,
    );

    const originalStates: Array<{ obj: any; position: { x: number; y: number }; scale: { x: number; y: number } }> = [];
    const nextStates: Array<{ obj: any; position: { x: number; y: number }; scale: { x: number; y: number } }> = [];

    let changed = false;

    for (const obj of this.selected) {
      const parent = obj?.parent;
      if (!parent) continue;

      const pos = {
        x: Number(obj.position?.x ?? 0),
        y: Number(obj.position?.y ?? 0),
      };
      const scale = {
        x: Number(obj.scale?.x ?? 1),
        y: Number(obj.scale?.y ?? 1),
      };

      originalStates.push({ obj, position: { ...pos }, scale: { ...scale } });

      const globalPos = parent.toGlobal(new Point(pos.x, pos.y));
      const localInContainer = container.toLocal(globalPos);

      const mirroredLocal = new Point(
        axis === 'horizontal' ? (center.x * 2 - localInContainer.x) : localInContainer.x,
        axis === 'vertical' ? (center.y * 2 - localInContainer.y) : localInContainer.y,
      );

      const mirroredGlobal = container.toGlobal(mirroredLocal);
      const mirroredParent = parent.toLocal(mirroredGlobal);

      const newScale = {
        x: axis === 'horizontal' ? -scale.x || 0 : scale.x,
        y: axis === 'vertical' ? -scale.y || 0 : scale.y,
      };

      nextStates.push({
        obj,
        position: { x: mirroredParent.x, y: mirroredParent.y },
        scale: newScale,
      });

      if (!changed) {
        if (Math.abs(mirroredParent.x - pos.x) > 0.0001 || Math.abs(mirroredParent.y - pos.y) > 0.0001) {
          changed = true;
        } else if (Math.abs(newScale.x - scale.x) > 0.0001 || Math.abs(newScale.y - scale.y) > 0.0001) {
          changed = true;
        }
      }
    }

    if (!nextStates.length || !changed) return false;

    const applyStates = (states: Array<{ obj: any; position: { x: number; y: number }; scale: { x: number; y: number } }>) => {
      for (const state of states) {
        const target = state.obj;
        if (!target) continue;
        try {
          if (target.position) {
            target.position.x = state.position.x;
            target.position.y = state.position.y;
          }
          if (target.scale) {
            target.scale.x = state.scale.x;
            target.scale.y = state.scale.y;
          }
        } catch {}
        try {
          const dm: any = (this as any).displayManager;
          let id: string | null = null;
          try { id = (target as any).__id || (target as any).objectId || (dm?.getIdForObject?.(target) ?? null); } catch {}
          if (!id) {
            const tmp = `sel_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            try { (target as any).objectId = tmp; } catch {}
            id = tmp;
          }
          document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id, object: target, action: 'transform' } }));
        } catch {}
      }
      const activeContainer = this.container || this.displayManager?.getRoot?.();
      if (activeContainer) {
        this.overlay.refresh(this.selected, activeContainer);
      } else {
        this.overlay.clear();
      }
      this.updateObjectSelectionStates();
    };

    applyStates(nextStates);

    const label = axis === 'horizontal' ? 'Flip Horizontal' : 'Flip Vertical';
    try {
      historyManager.push({
        label,
        undo: () => applyStates(originalStates),
        redo: () => applyStates(nextStates),
      });
    } catch {}

    return true;
  }

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

  private updateObjectSelectionStates(): void {
    // Update selection flags on objects and notify UI
    try {
      // Clear previous selection flags across known objects (best-effort)
      const dm: any = (this as any).displayManager;
      const all: any[] = dm && dm.getObjects ? dm.getObjects() : [];
      if (all && Array.isArray(all)) {
        all.forEach((o: any) => { try { o.__selected = false; } catch {} });
      }
      // Set selection flags
      this.selected.forEach((o) => { try { (o as any).__selected = true; } catch {} });
      // Emit selection change for panels (layers, etc.)
      document.dispatchEvent(new CustomEvent('selection:changed', { detail: { count: this.selected.length } }));
    } catch {}
    // Get all scenes from animation state and update their selection status
    try {
      const scenes = animationState.getScenes();
      scenes.forEach(scene => {
        const isSelected = this.selected.includes(scene.getRoot());
        scene.setSelected(isSelected);
      });
    } catch (error) {
      console.warn('Failed to update scene selection states:', error);
    }
  }

  private handlePenEditFinalize = () => {
    if (this.container && this.selected.length) {
      this.overlay.refresh(this.selected, this.container);
    } else {
      this.overlay.clear();
    }
    this.updateObjectSelectionStates();
    this.emitSelectionContext();
  };
}
