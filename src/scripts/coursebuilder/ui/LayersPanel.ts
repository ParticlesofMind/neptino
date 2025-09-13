import { Container, DisplayObject, Application } from 'pixi.js';

export class LayersPanel {
  private rootEl: HTMLElement | null = null;
  private listEl: HTMLOListElement | null = null;

  constructor(rootSelector: string = '#preview-layers') {
    this.rootEl = document.querySelector(rootSelector) as HTMLElement | null;
    this.listEl = document.getElementById('layers-list-root') as HTMLOListElement | null;
    this.bindGlobalListeners();
    this.bindControls();
  }

  public refresh(): void {
    if (!this.listEl) return;
    const canvasAPI = (window as any).canvasAPI;
    if (!canvasAPI) return;
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) return;
    this.listEl.innerHTML = '';
    this.renderChildren(drawingLayer as any as Container, this.listEl);
  }

  private bindGlobalListeners(): void {
    document.addEventListener('displayObject:added', () => this.safeRefreshSoon());
    document.addEventListener('displayObject:removed', () => this.safeRefreshSoon());
  }

  private bindControls(): void {
    try {
      const grp = document.getElementById('layers-group');
      const ungrp = document.getElementById('layers-ungroup');
      grp?.addEventListener('click', () => {
        const canvasAPI = (window as any).canvasAPI;
        canvasAPI?.groupSelection();
        this.safeRefreshSoon();
      });
      ungrp?.addEventListener('click', () => {
        const canvasAPI = (window as any).canvasAPI;
        canvasAPI?.ungroupSelection();
        this.safeRefreshSoon();
      });
    } catch {}
  }

  private safeRefreshSoon(): void {
    setTimeout(() => this.refresh(), 0);
  }

  private renderChildren(parent: Container, list: HTMLOListElement): void {
    const children = parent.children.slice();
    children.forEach((child) => {
      const li = this.buildLayerItem(child, parent);
      list.appendChild(li);
    });
  }

  private buildLayerItem(obj: DisplayObject, parent: Container): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'layer__item card card--layer';
    (li as any).draggable = true;
    const id = this.getId(obj) || '';
    li.dataset.layerId = id;

    // Expander for containers
    const isContainer = (obj as any).children && Array.isArray((obj as any).children);
    let expander: HTMLButtonElement | null = null;
    let childrenList: HTMLOListElement | null = null;
    if (isContainer) {
      expander = document.createElement('button');
      expander.className = 'layer__expander layer__toggle';
      expander.textContent = '▶';
      expander.setAttribute('aria-label', 'Toggle children');
      li.appendChild(expander);
    }

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'layer__thumbnail';
    this.updateThumbnail(obj, thumb);
    li.appendChild(thumb);

    // Name input
    const nameInput = document.createElement('input');
    nameInput.className = 'layer__name-input';
    nameInput.type = 'text';
    nameInput.value = (obj as any).name || (obj as any).__meta?.name || this.fallbackName(obj);
    nameInput.addEventListener('change', () => {
      const val = nameInput.value || this.fallbackName(obj);
      try { (obj as any).name = val; } catch {}
      try { if ((obj as any).__meta) (obj as any).__meta.name = val; } catch {}
    });
    li.appendChild(nameInput);

    // Visibility toggle
    const vis = document.createElement('button');
    vis.className = 'layer__toggle layer__visibility';
    const visImg = document.createElement('img');
    visImg.alt = 'Visibility';
    const updateVisIcon = () => {
      const v = (obj as any).visible !== false;
      visImg.src = v ? '/src/assets/icons/eye.svg' : '/src/assets/icons/eye-off.svg';
    };
    updateVisIcon();
    vis.appendChild(visImg);
    vis.addEventListener('click', () => {
      (obj as any).visible = !(obj as any).visible;
      updateVisIcon();
    });
    li.appendChild(vis);

    // Lock toggle
    const lock = document.createElement('button');
    lock.className = 'layer__toggle layer__lock';
    const lockImg = document.createElement('img');
    lockImg.alt = 'Lock';
    const updateLockIcon = () => {
      const locked = !!(obj as any).__locked;
      lockImg.src = locked ? '/src/assets/icons/lock.svg' : '/src/assets/icons/unlock.svg';
    };
    updateLockIcon();
    lock.appendChild(lockImg);
    lock.addEventListener('click', () => {
      const locked = !(obj as any).__locked;
      (obj as any).__locked = locked;
      try { (obj as any).eventMode = locked ? 'none' : 'static'; } catch {}
      try { (obj as any).interactiveChildren = !locked; } catch {}
      updateLockIcon();
    });
    li.appendChild(lock);

    // Z-order quick actions: send back/front and step forward/backward
    const toFront = document.createElement('button');
    toFront.className = 'layer__toggle layer__front';
    toFront.title = 'Bring to front';
    toFront.textContent = '⤴';
    toFront.addEventListener('click', () => {
      const parent = (obj as any).parent;
      if (!parent) return;
      try { parent.removeChild(obj as any); parent.addChild(obj as any); } catch {}
      this.safeRefreshSoon();
    });
    li.appendChild(toFront);

    const toBack = document.createElement('button');
    toBack.className = 'layer__toggle layer__back';
    toBack.title = 'Send to back';
    toBack.textContent = '⤵';
    toBack.addEventListener('click', () => {
      const parent = (obj as any).parent;
      if (!parent) return;
      try { parent.removeChild(obj as any); parent.addChildAt(obj as any, 0); } catch {}
      this.safeRefreshSoon();
    });
    li.appendChild(toBack);

    const forward = document.createElement('button');
    forward.className = 'layer__toggle layer__forward';
    forward.title = 'Bring forward one step';
    forward.textContent = '▶';
    forward.addEventListener('click', () => {
      const parent = (obj as any).parent;
      if (!parent) return;
      try {
        const idx = parent.getChildIndex ? parent.getChildIndex(obj as any) : parent.children.indexOf(obj as any);
        const newIdx = Math.min(parent.children.length - 1, idx + 1);
        if (typeof parent.setChildIndex === 'function') {
          parent.setChildIndex(obj as any, newIdx);
        } else {
          parent.removeChild(obj as any);
          parent.addChildAt(obj as any, newIdx);
        }
      } catch {}
      this.safeRefreshSoon();
    });
    li.appendChild(forward);

    const backward = document.createElement('button');
    backward.className = 'layer__toggle layer__backward';
    backward.title = 'Send backward one step';
    backward.textContent = '◀';
    backward.addEventListener('click', () => {
      const parent = (obj as any).parent;
      if (!parent) return;
      try {
        const idx = parent.getChildIndex ? parent.getChildIndex(obj as any) : parent.children.indexOf(obj as any);
        const newIdx = Math.max(0, idx - 1);
        if (typeof parent.setChildIndex === 'function') {
          parent.setChildIndex(obj as any, newIdx);
        } else {
          parent.removeChild(obj as any);
          parent.addChildAt(obj as any, newIdx);
        }
      } catch {}
      this.safeRefreshSoon();
    });
    li.appendChild(backward);

    // Drag handle
    const drag = document.createElement('span');
    drag.className = 'layer__drag-handle';
    drag.textContent = '⋮⋮';
    li.appendChild(drag);

    // DnD handlers
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/layer-id', id);
      e.dataTransfer?.setData('text/plain', id);
      e.dataTransfer!.effectAllowed = 'move';
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const dragId = e.dataTransfer?.getData('text/layer-id');
      if (!dragId) return;
      const canvasAPI = (window as any).canvasAPI;
      const app = canvasAPI?.getApp() as Application | null;
      const drawingLayer = canvasAPI?.getDrawingLayer() as Container | null;
      const displayManager = (window as any)._displayManager as any;
      if (!app || !drawingLayer || !displayManager) return;

      const dragged = this.getObjectById(dragId);
      if (!dragged) return;

      const dropTargetId = (e.currentTarget as HTMLElement).dataset.layerId || '';
      const dropTarget = this.getObjectById(dropTargetId);
      if (!dropTarget) return;

      // If drop target is container and Alt not pressed, nest as child
      if ((dropTarget as any).addChild && !(e as DragEvent).altKey) {
        try {
          if (dragged.parent) dragged.parent.removeChild(dragged);
          (dropTarget as any).addChild(dragged);
        } catch {}
      } else {
        // Reorder within same parent of drop target
        const parentCont = dropTarget.parent as Container;
        if (!parentCont) return;
        try {
          if (dragged.parent !== parentCont) {
            dragged.parent?.removeChild(dragged);
            parentCont.addChild(dragged);
          }
          // Compute new index based on DOM order of that list
          const containerLi = (e.currentTarget as HTMLElement).parentElement as HTMLOListElement;
          const ids = Array.from(containerLi.querySelectorAll(':scope > li')).map(li => (li as HTMLElement).dataset.layerId || '');
          const newOrder = ids
            .map((i) => this.getObjectById(i))
            .filter(Boolean) as DisplayObject[];
          newOrder.forEach((child, idx) => {
            try { parentCont.addChildAt(child as any, idx); } catch {}
          });
        } catch {}
      }
      // Refresh the UI after drop to reflect new structure
      this.refresh();
    });

    // Children list
    if (isContainer) {
      childrenList = document.createElement('ol');
      childrenList.className = 'layers-list';
      // Expansion memory
      const openMap = this.getExpansionMap();
      const idStr = this.getId(obj) || '';
      const isOpen = openMap[idStr] === true;
      childrenList.style.display = isOpen ? 'block' : 'none';
      li.appendChild(childrenList);
      expander!.textContent = isOpen ? '▼' : '▶';
      expander!.addEventListener('click', () => {
        const open = childrenList!.style.display !== 'none';
        const nextOpen = !open;
        childrenList!.style.display = nextOpen ? 'block' : 'none';
        expander!.textContent = nextOpen ? '▼' : '▶';
        // Persist
        const map = this.getExpansionMap();
        map[idStr] = nextOpen;
        localStorage.setItem('layersPanel:expansion', JSON.stringify(map));
      });
      // Render children now
      (obj as any).children?.forEach((c: any) => {
        const cli = this.buildLayerItem(c, obj as any);
        childrenList!.appendChild(cli);
      });
    }

    return li;
  }

  private getExpansionMap(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem('layersPanel:expansion');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  private fallbackName(obj: DisplayObject): string {
    const cn = (obj as any).constructor?.name || 'Object';
    return cn;
  }

  private getId(obj: any): string | null {
    if (!obj) return null;
    if (obj.__id) return obj.__id;
    const dm = (window as any)._displayManager as any;
    if (dm && typeof dm.getIdForObject === 'function') return dm.getIdForObject(obj);
    return null;
  }

  private getObjectById(id: string): DisplayObject | null {
    const dm = (window as any)._displayManager as any;
    if (!dm) return null;
    return dm.get(id);
  }

  private updateThumbnail(obj: any, el: HTMLElement): void {
    try {
      const canvasAPI = (window as any).canvasAPI;
      const app = canvasAPI?.getApp() as Application | null;
      if (!app) return;
      const renderer: any = app.renderer as any;
      const extract = renderer.extract;
      if (extract && typeof extract.canvas === 'function') {
        const cnv = extract.canvas(obj);
        const url = cnv.toDataURL('image/png');
        el.style.backgroundImage = `url(${url})`;
        return;
      }
      if (typeof renderer.generateTexture === 'function') {
        const tex = renderer.generateTexture(obj);
        const spr = new (window as any).PIXI.Sprite(tex);
        const extracted = renderer.extract.canvas(spr);
        const url = extracted.toDataURL('image/png');
        el.style.backgroundImage = `url(${url})`;
        tex.destroy(true);
        return;
      }
    } catch {}
    // Fallback placeholder
    el.style.background = '#f3f4f6';
  }
}
