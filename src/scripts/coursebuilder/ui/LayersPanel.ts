import { Container, Application } from 'pixi.js';

export class LayersPanel {
  private listEl: HTMLOListElement | null = null;
  private refreshTimeout: number | null = null;
  private isRefreshing: boolean = false;
  private thumbnailCache: Map<string, string> = new Map();

  constructor() {
    this.listEl = document.getElementById('layers-list-root') as HTMLOListElement | null;
    this.bindGlobalListeners();
    this.bindControls();
  }

  public refresh(): void {
    if (!this.listEl || this.isRefreshing) return;
    
    this.isRefreshing = true;
    
    const canvasAPI = (window as any).canvasAPI;
    if (!canvasAPI) {
      this.isRefreshing = false;
      return;
    }
    
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) {
      this.isRefreshing = false;
      return;
    }
    
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      this.listEl!.innerHTML = '';
      this.renderChildren(drawingLayer as any as Container, this.listEl!);
      this.isRefreshing = false;
    });
  }

  private bindGlobalListeners(): void {
    // Debounced refresh on object changes - prevent rapid successive refreshes
    document.addEventListener('displayObject:added', () => {
      this.clearThumbnailCache(); // Clear cache when objects change
      this.debouncedRefresh();
    });
    document.addEventListener('displayObject:removed', (event: any) => {
      this.clearThumbnailCache(); // Clear cache when objects change
      
      // For removals, use a shorter debounce to make the UI more responsive
      // Also log the removal event for debugging
      try { 
        if ((window as any).__NEPTINO_DEBUG_LOGS) {
          console.log('🗑️ Layer panel received removal event:', event.detail); 
        }
      } catch {}
      
      this.debouncedRefresh(8); // Faster refresh for removals (8ms vs 16ms)
    });
    
    // Listen for tool changes to refresh visibility (less frequent, can be immediate)
    document.addEventListener('tool:changed', () => this.debouncedRefresh(100));
    
    // Remove the aggressive 1-second interval - it's unnecessary and causes flickering
    // Objects will refresh when they actually change via the event listeners above
  }

  private debouncedRefresh(delay: number = 16): void {
    // Clear any pending refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    // Schedule new refresh with debouncing (default 16ms = ~60fps)
    this.refreshTimeout = window.setTimeout(() => {
      this.refresh();
      this.refreshTimeout = null;
    }, delay);
  }

  private clearThumbnailCache(): void {
    this.thumbnailCache.clear();
  }

  private bindControls(): void {
    // Controls removed - group/ungroup buttons no longer needed
  }



  private renderChildren(parent: Container, list: HTMLOListElement): void {
    if (!parent || !parent.children) return;
    
    const children = parent.children.slice();
    // Filter out visual aids, UI elements, and temporary objects
    const realObjects = children.filter(child => {
      // Extra validation: make sure object still exists and isn't destroyed
      try {
        return child && !child.destroyed && this.isRealObject(child);
      } catch {
        return false; // Skip objects that cause errors
      }
    });
    
    // Track processed objects to avoid duplicates
    const processedIds = new Set<string>();
    
    realObjects.forEach((child) => {
      try {
        const id = this.getId(child);
        if (id && processedIds.has(id)) {
          // Skip duplicates
          return;
        }
        if (id) processedIds.add(id);
        
        const li = this.buildLayerItem(child);
        list.appendChild(li);
      } catch (error) {
        // Skip objects that cause errors during processing
        try { 
          if ((window as any).__NEPTINO_DEBUG_LOGS) {
            console.warn('⚠️ Error processing layer item:', error); 
          }
        } catch {}
      }
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
      this.clearThumbnailCache(); // Clear cache since structure changed
      this.debouncedRefresh(50); // Slightly longer delay for drag operations
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
        cli.classList.add('card--nested'); // Add nested styling class
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
    const objId = this.getId(obj);
    if (!objId) {
      el.style.background = '#f3f4f6';
      return;
    }

    // Check cache first to avoid expensive regeneration
    const cached = this.thumbnailCache.get(objId);
    if (cached) {
      el.style.backgroundImage = `url(${cached})`;
      return;
    }

    try {
      const canvasAPI = (window as any).canvasAPI;
      const app = canvasAPI?.getApp() as Application | null;
      if (!app) return;
      const renderer: any = app.renderer as any;
      const extract = renderer.extract;
      
      if (extract && typeof extract.canvas === 'function') {
        const cnv = extract.canvas(obj);
        const url = cnv.toDataURL('image/png');
        this.thumbnailCache.set(objId, url); // Cache the result
        el.style.backgroundImage = `url(${url})`;
        return;
      }
      
      if (typeof renderer.generateTexture === 'function') {
        const tex = renderer.generateTexture(obj);
        const spr = new (window as any).PIXI.Sprite(tex);
        const extracted = renderer.extract.canvas(spr);
        const url = extracted.toDataURL('image/png');
        this.thumbnailCache.set(objId, url); // Cache the result
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
    
    // Allow animation scene objects - these should always show in layers
    if (obj.__sceneRef || obj.__sceneId || obj.name === 'AnimationScene') return true;
    
    // Allow scene content containers - objects inside animation scenes
    if (obj.__sceneContent || obj.__parentSceneId || obj.__inScene) return true;
    
    // Allow objects that have been assigned unique IDs for animation tracking
    if (obj.objectId) return true;
    
    // IMPORTANT: Always allow basic PIXI objects created by users
    // Text objects should always appear in layers
    if (className === 'Text') return true;
    
    // Graphics objects should appear if they have actual content
    if (className === 'Graphics') {
      // Check if graphics has been drawn on (has actual visual content)
      const bounds = obj.getLocalBounds?.();
      if (bounds && (bounds.width > 0 || bounds.height > 0)) {
        return true;
      }
    }
    
    // Sprite objects (images) should always appear in layers
    if (className === 'Sprite') return true;
    
    // Allow containers that have user content children or are likely user-created
    if (className === 'Container') {
      // If container has children, check if any are real objects
      if (obj.children && obj.children.length > 0) {
        const hasRealChildren = obj.children.some((child: any) => {
          // Basic check to avoid recursion issues
          if (child === obj) return false;
          return this.isRealObject(child);
        });
        if (hasRealChildren) return true;
      }
      
      // Also allow containers that have been explicitly added by DisplayObjectManager
      // (they get __id property when added)
      if (obj.__id) return true;
    }
    
    return false;
  }
}
