import { Container, Application } from 'pixi.js';

export class LayersPanel {
  private listEl: HTMLOListElement | null = null;

  constructor() {
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
    // Immediate refresh on object changes
    document.addEventListener('displayObject:added', () => this.refresh());
    document.addEventListener('displayObject:removed', () => this.refresh());
    
    // Listen for tool changes to refresh visibility
    document.addEventListener('tool:changed', () => this.refresh());
    
    // Set up periodic refresh to catch any missed changes
    setInterval(() => this.refresh(), 1000);
  }

  private bindControls(): void {
    // Controls removed - group/ungroup buttons no longer needed
  }

  private safeRefreshSoon(): void {
    setTimeout(() => this.refresh(), 0);
  }

  private renderChildren(parent: Container, list: HTMLOListElement): void {
    const children = parent.children.slice();
    // Filter out visual aids, UI elements, and temporary objects
    const realObjects = children.filter(child => this.isRealObject(child));
    
    // Track processed objects to avoid duplicates
    const processedIds = new Set<string>();
    
    realObjects.forEach((child) => {
      const id = this.getId(child);
      if (id && processedIds.has(id)) {
        // Skip duplicates
        return;
      }
      if (id) processedIds.add(id);
      
      const li = this.buildLayerItem(child);
      list.appendChild(li);
    });
  }

  private buildLayerItem(obj: Container): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'layer__item card card--layer';
    (li as any).draggable = true;
    const id = this.getId(obj) || '';
    li.dataset.layerId = id;

    // Create main content wrapper
    const content = document.createElement('div');
    content.className = 'layer__content';
    li.appendChild(content);

    // Left side: expander + thumbnail + name
    const leftSide = document.createElement('div');
    leftSide.className = 'layer__left';
    content.appendChild(leftSide);

    // Expander for containers - only show if object has 2+ real children (excluding visual aids)
    const children = (obj as any).children;
    const realChildren = children ? children.filter((c: any) => this.isRealObject(c)) : [];
    const isContainer = realChildren.length >= 2;
    let expander: HTMLButtonElement | null = null;
    let childrenList: HTMLOListElement | null = null;
    if (isContainer) {
      expander = document.createElement('button');
      expander.className = 'layer__expander';
      expander.textContent = '▶';
      expander.setAttribute('aria-label', 'Toggle children');
      leftSide.appendChild(expander);
    }

    // Compact thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'layer__thumbnail';
    this.updateThumbnail(obj, thumb);
    leftSide.appendChild(thumb);

    // Name input - use intelligent naming as default
    const nameInput = document.createElement('input');
    nameInput.className = 'layer__name-input';
    nameInput.type = 'text';
    
    // Use intelligent naming by default, but allow custom names to override
    const customName = (obj as any).name || (obj as any).__meta?.name;
    const intelligentName = this.fallbackName(obj);
    nameInput.value = customName || intelligentName;
    
    nameInput.addEventListener('change', () => {
      const val = nameInput.value || intelligentName;
      try { (obj as any).name = val; } catch {}
      try { if ((obj as any).__meta) (obj as any).__meta.name = val; } catch {}
    });
    leftSide.appendChild(nameInput);

    // Right side: visibility and lock toggles
    const rightSide = document.createElement('div');
    rightSide.className = 'layer__controls';
    content.appendChild(rightSide);

    // Visibility toggle
    const vis = document.createElement('button');
    vis.className = 'layer__toggle layer__visibility';
    vis.title = 'Toggle visibility';
    const visImg = document.createElement('img');
    visImg.alt = 'Visibility';
    visImg.width = 16;
    visImg.height = 16;
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
    rightSide.appendChild(vis);

    // Lock toggle
    const lock = document.createElement('button');
    lock.className = 'layer__toggle layer__lock';
    lock.title = 'Toggle lock';
    const lockImg = document.createElement('img');
    lockImg.alt = 'Lock';
    lockImg.width = 16;
    lockImg.height = 16;
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
    rightSide.appendChild(lock);

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
            .filter(Boolean) as Container[];
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
      // Render children now - filter out visual aids and UI elements
      const realChildren = (obj as any).children?.filter((c: any) => this.isRealObject(c)) || [];
      realChildren.forEach((c: any) => {
        const cli = this.buildLayerItem(c);
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

  private fallbackName(obj: Container): string {
    // Check for tool metadata first
    const meta = (obj as any).__meta;
    const toolType = (obj as any).__toolType;
    
    // Handle objects with metadata (shapes, brush, pen, etc.)
    if (meta && meta.kind) {
      switch (meta.kind) {
        case 'shapes':
          return this.getShapeName(meta.shapeType || 'rectangle');
        case 'brush':
          return 'stroke';
        case 'pen':
          return 'line';
        case 'tables':
          return 'table';
        case 'video':
          return meta.name || 'video'; // Use custom name for scenes
        case 'scene':
          return meta.name || 'animation scene';
        default:
          return meta.kind;
      }
    }
    
    // Handle objects by tool type
    if (toolType) {
      switch (toolType) {
        case 'container':
          return 'group';
        case 'brush':
          return 'stroke';
        case 'pen':
          return 'line';
        case 'shapes':
          return 'rectangle'; // Default shape
        case 'text':
          return 'text';
        case 'tables':
          return 'table';
        case 'scene':
          return meta?.name || 'animation scene'; // Scene/video objects
        default:
          return toolType;
      }
    }
    
    // Handle by PIXI class type
    const className = (obj as any).constructor?.name || 'Object';
    switch (className) {
      case 'Text':
        return 'text';
      case 'Graphics':
        // Try to determine what kind of graphics this is
        if ((obj as any).children && (obj as any).children.length > 1) {
          return 'group';
        }
        return 'graphic';
      case 'Container':
        if ((obj as any).children && (obj as any).children.length > 1) {
          return 'group';
        }
        return 'container';
      case 'Sprite':
        return 'image';
      default:
        return className.toLowerCase();
    }
  }
  
  private getShapeName(shapeType: string): string {
    const shapeNames: Record<string, string> = {
      'rectangle': 'rectangle',
      'circle': 'circle', 
      'ellipse': 'ellipse',
      'triangle': 'triangle',
      'line': 'line',
      'arrow': 'arrow',
      'polygon': 'polygon'
    };
    return shapeNames[shapeType] || 'shape';
  }

  private getId(obj: any): string | null {
    if (!obj) return null;
    if (obj.__id) return obj.__id;
    const dm = (window as any)._displayManager as any;
    if (dm && typeof dm.getIdForObject === 'function') return dm.getIdForObject(obj);
    return null;
  }

  private getObjectById(id: string): Container | null {
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

  /**
   * Filter out visual aids, UI elements, and temporary objects
   * Only show actual user-created content in layers
   */
  private isRealObject(obj: any): boolean {
    if (!obj) return false;

    // Filter by object name patterns (visual aids and UI elements)
    const name = (obj.name || '').toLowerCase();
    const excludedNames = [
      'cursor', 'guide', 'overlay', 'handle', 'anchor', 'marquee', 'indicator',
      'preview', 'helper', 'visual', 'aid', 'temp', 'temporary', 'ui-',
      'selection-', 'snap-', 'drag-', 'resize-', 'path-', 'scene-',
      'interaction', 'background-fill', 'grid', 'ruler'
    ];
    
    if (excludedNames.some(excluded => name.includes(excluded))) {
      return false;
    }

    // Filter by constructor name (UI elements)
    const className = obj.constructor?.name || '';
    if (className === 'TextCursor') return false;
    
    // Filter by high zIndex (UI overlays typically have high zIndex)
    if (obj.zIndex && obj.zIndex > 1000) return false;
    
    // Filter by special properties that indicate UI/visual aid objects
    if (obj.__isVisualAid || obj.__isUIElement || obj.__isTemporary) return false;
    
    // Filter by parent container type (if in UI layer, be more selective)
    const parent = obj.parent;
    if (parent && parent.label === 'ui-layer') {
      // In UI layer, only show objects that have a tool type (user-created content)
      if (!obj.__toolType && !obj.__meta?.kind) return false;
    }
    
    // Filter by alpha (very transparent objects are likely visual aids)
    if (obj.alpha !== undefined && obj.alpha < 0.01) return false;
    
    // Allow objects with tool types (user-created content)
    if (obj.__toolType || obj.__meta?.kind) return true;
    
    // Allow Text objects (user content)
    if (className === 'Text') return true;
    
    // Allow Sprite objects (user images)
    if (className === 'Sprite') return true;
    
    // Allow containers that have user content children
    if (className === 'Container' && obj.children && obj.children.length > 0) {
      // Check if any child is a real object (recursive check to avoid infinite loops)
      const hasRealChildren = obj.children.some((child: any) => {
        // Basic check to avoid recursion issues
        if (child === obj) return false;
        return this.isRealObject(child);
      });
      return hasRealChildren;
    }
    
    // Allow Graphics objects that are not in excluded categories
    if (className === 'Graphics') {
      // Graphics without tool type might still be user content if they have substance
      const bounds = obj.getLocalBounds?.();
      if (bounds && (bounds.width > 1 || bounds.height > 1)) {
        return true;
      }
    }
    
    return false;
  }
}
