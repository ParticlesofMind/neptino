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

    // Lightweight debug helper: inspect center-band thresholds quickly from console
    try {
      if (!(window as any).testLayersCenterBand) {
        (window as any).testLayersCenterBand = () => {
          const root = document.documentElement as HTMLElement;
          const lowerStr = getComputedStyle(root).getPropertyValue('--layers-center-band-lower').trim() || '0.4';
          const upperStr = getComputedStyle(root).getPropertyValue('--layers-center-band-upper').trim() || '0.6';
          const lower = parseFloat(lowerStr);
          const upper = parseFloat(upperStr);
          const isValid = isFinite(lower) && isFinite(upper) && lower >= 0 && upper <= 1 && lower < upper;
          const samples = [0.1, 0.3, 0.45, 0.5, 0.7, 0.9].map((ratio) => ({ ratio, isCenter: ratio >= lower && ratio <= upper }));
          const result = { lower, upper, isValid, samples };
          console.log('🧪 Layers DnD center-band check:', result);
          return result;
        };
      }
    } catch {}
  }

  public refresh(): void {
    if (!this.listEl || this.isRefreshing) return;
    
    this.isRefreshing = true;
    
    try {
      const canvasAPI = (window as any).canvasAPI;
      if (!canvasAPI) {
        console.warn('⚠️ LayersPanel refresh: canvasAPI not available');
        this.isRefreshing = false;
        return;
      }
      
      const drawingLayer = canvasAPI.getDrawingLayer();
      if (!drawingLayer) {
        console.warn('⚠️ LayersPanel refresh: drawingLayer not available');
        this.isRefreshing = false;
        return;
      }
      
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        try {
          if (this.listEl) {
            this.listEl.innerHTML = '';
            this.renderChildren(drawingLayer as any as Container, this.listEl);
          }
        } catch (renderError) {
          console.error('❌ LayersPanel render error:', renderError);
          // Try to recover by showing a basic error message
          if (this.listEl) {
            this.listEl.innerHTML = '<li class="layer__item" style="color: red; padding: 8px;">Error: Unable to render layers. Please refresh the page.</li>';
          }
        } finally {
          this.isRefreshing = false;
        }
      });
    } catch (error) {
      console.error('❌ LayersPanel refresh error:', error);
      this.isRefreshing = false;
    }
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
      } catch (error) {
        console.warn('Error logging removal event:', error);
      }
      
      this.debouncedRefresh(8); // Faster refresh for removals (8ms vs 16ms)
    });
    document.addEventListener('displayObject:updated', (ev: any) => {
      try {
        const id = ev?.detail?.id as string | undefined;
        if (id && this.listEl) {
          // Targeted thumbnail update to avoid full refresh when only style changed
          const thumbEl = this.listEl.querySelector(`li[data-layer-id="${id}"] .layer__thumbnail`) as HTMLElement | null;
          if (thumbEl) {
            const obj = this.getObjectById(id);
            if (obj) {
              this.updateThumbnail(obj, thumbEl);
              return; // Skip broader refresh if we handled the update directly
            }
          }
        }
      } catch {}
      // Fallback to the usual refresh path
      this.clearThumbnailCache(); // Clear cache when objects change
      this.debouncedRefresh(8); // Fast refresh for updates
    });
    // Update thumbnails on style changes coming from tools
    document.addEventListener('displayObject:styled', (ev: any) => {
      const id = ev?.detail?.id;
      if (!id) { this.debouncedRefresh(32); return; }
      const thumbEl = this.listEl?.querySelector(`li[data-layer-id="${id}"] .layer__thumbnail`) as HTMLElement | null;
      if (thumbEl) {
        const obj = this.getObjectById(id);
        if (obj) {
          this.updateThumbnail(obj, thumbEl);
        }
      } else {
        this.debouncedRefresh(32);
      }
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
    if (!parent || !parent.children || !list) {
      console.warn('⚠️ renderChildren: Invalid parameters');
      return;
    }
    
    try {
      // Reverse so the list shows top-most (front) first
      const children = parent.children.slice().reverse();
      
      // Filter out visual aids, UI elements, and temporary objects
      const realObjects = children.filter(child => {
        // Extra validation: make sure object still exists and isn't destroyed
        try {
          return child && 
                 !child.destroyed && 
                 this.isRealObject(child) &&
                 child.parent === parent; // Ensure parent relationship is consistent
        } catch (filterError) {
          console.warn('⚠️ Error filtering child object:', filterError);
          return false; // Skip objects that cause errors
        }
      });
      
      // Track processed objects to avoid duplicates and infinite loops
      const processedIds = new Set<string>();
      const processedObjects = new Set<Container>();
      
      realObjects.forEach((child) => {
        try {
          // Prevent infinite loops with object circular references
          if (processedObjects.has(child)) {
            console.warn('⚠️ Skipping duplicate object reference');
            return;
          }
          processedObjects.add(child);
          
          const id = this.getId(child);
          if (id && processedIds.has(id)) {
            console.warn('⚠️ Skipping duplicate ID:', id);
            return;
          }
          if (id) processedIds.add(id);
          
          const li = this.buildLayerItem(child);
          if (li) {
            list.appendChild(li);
            
            // Special handling for animation scenes: also show objects from their content containers
            if ((child as any).__sceneRef || (child as any).name === 'AnimationScene') {
              const scene = (child as any).__sceneRef;
              if (scene && scene.getContentContainer) {
                const contentContainer = scene.getContentContainer();
                if (contentContainer && contentContainer.children && contentContainer.children.length > 0) {
                  // Find the child list element for this scene to add scene objects to it
                  const childrenList = li.querySelector('ol.layers-list') as HTMLOListElement;
                  if (childrenList) {
                    // Recursively render children with depth limit to prevent infinite recursion
                    const currentDepth = this.getDepth(list);
                    if (currentDepth < 10) { // Max depth of 10 levels
                      this.renderChildren(contentContainer, childrenList);
                    } else {
                      console.warn('⚠️ Max nesting depth reached for scene, skipping deeper children');
                    }
                  }
                }
              }
            }
          }
        } catch (itemError) {
          console.warn('⚠️ Failed to render layer item:', itemError, {
            childType: child?.constructor?.name,
            childId: this.getId(child),
            hasParent: !!child?.parent
          });
        }
      });
      
    } catch (globalError) {
      console.error('❌ renderChildren failed:', globalError);
      // Add error indicator to the list
      const errorLi = document.createElement('li');
      errorLi.className = 'layer__item layer__error';
      errorLi.style.color = 'red';
      errorLi.style.fontStyle = 'italic';
      errorLi.textContent = 'Error loading layers';
      list.appendChild(errorLi);
    }
  }

  /**
   * Get the nesting depth of a list element to prevent infinite recursion
   */
  private getDepth(element: HTMLElement): number {
    let depth = 0;
    let current = element.parentElement;
    while (current) {
      if (current.classList.contains('layers-list')) {
        depth++;
      }
      current = current.parentElement;
    }
    return depth;
  }

  private buildLayerItem(obj: Container): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'layer__item';
    (li as any).draggable = true;
    const id = this.getId(obj) || '';
    li.dataset.layerId = id;

    // Selection highlighting
    const updateSelectedUI = () => {
      const selected = !!(obj as any).__selected;
      li.classList.toggle('layer__item--selected', selected);
    };
    updateSelectedUI();
    document.addEventListener('selection:changed', () => updateSelectedUI());

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
    
    // Special handling for animation scenes - they should always be expandable if they have content
    // Treat declared containers as expandable regardless (to allow collapsing even with 1 child)
    let isContainer = ((obj as any).__toolType === 'container') || realChildren.length >= 2;
    if ((obj as any).__sceneRef || (obj as any).name === 'AnimationScene') {
      const scene = (obj as any).__sceneRef;
      if (scene && scene.getContentContainer) {
        const contentContainer = scene.getContentContainer();
        if (contentContainer && contentContainer.children && contentContainer.children.length > 0) {
          // Scene has content, so it should be expandable
          isContainer = true;
        }
      }
    }
    let expander: HTMLButtonElement | null = null;
    let childrenList: HTMLOListElement | null = null;
    if (isContainer) {
      expander = document.createElement('button');
      expander.className = 'layer__expander';
      expander.textContent = '▶';
      expander.setAttribute('aria-label', 'Toggle children');
      leftSide.appendChild(expander);
    }

    // Hover border highlight to indicate grouping target when hovering center band or meta/ctrl
    li.addEventListener('dragenter', (ev) => {
      const dEv = ev as DragEvent;
      const rect = (dEv.currentTarget as HTMLElement).getBoundingClientRect();
      const localY = dEv.clientY - rect.top;
      const ratio = rect.height ? localY / rect.height : 0.5;
      const lower = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-lower').trim() || '0.4');
      const upper = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-upper').trim() || '0.6');
      const isCenterBand = ratio >= (isNaN(lower) ? 0.4 : lower) && ratio <= (isNaN(upper) ? 0.6 : upper);
      const metaCtrl = dEv.metaKey || dEv.ctrlKey;
      const canGroup = ((metaCtrl || isCenterBand));
      li.classList.toggle('layer__item--group-target', !!canGroup);
      li.classList.toggle('layer__item--center-band', !!isCenterBand);
    });
    li.addEventListener('dragover', (ev) => {
      const dEv = ev as DragEvent;
      const rect = (dEv.currentTarget as HTMLElement).getBoundingClientRect();
      const localY = dEv.clientY - rect.top;
      const ratio = rect.height ? localY / rect.height : 0.5;
      const lower = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-lower').trim() || '0.4');
      const upper = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-upper').trim() || '0.6');
      const isCenterBand = ratio >= (isNaN(lower) ? 0.4 : lower) && ratio <= (isNaN(upper) ? 0.6 : upper);
      const metaCtrl = dEv.metaKey || dEv.ctrlKey;
      const canGroup = ((metaCtrl || isCenterBand));
      li.classList.toggle('layer__item--group-target', !!canGroup);
      li.classList.toggle('layer__item--center-band', !!isCenterBand);
    });
    li.addEventListener('dragleave', () => {
      li.classList.remove('layer__item--group-target');
      li.classList.remove('layer__item--center-band');
    });
    li.addEventListener('drop', () => {
      li.classList.remove('layer__item--group-target');
      li.classList.remove('layer__item--center-band');
    });

    // Compact thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'layer__thumbnail';
    this.updateThumbnail(obj, thumb);
    leftSide.appendChild(thumb);

    // Name input - use intelligent naming as default; editing on double-click only
    const nameInput = document.createElement('input');
    nameInput.className = 'layer__name-input';
    nameInput.type = 'text';
    nameInput.readOnly = true; // prevent accidental edits during DnD; enable on dblclick
    
    // Use intelligent naming by default, but allow custom names to override
    const customName = (obj as any).name || (obj as any).__meta?.name;
    const intelligentName = this.fallbackName(obj);
    nameInput.value = customName || intelligentName;
    
    nameInput.addEventListener('change', () => {
      const val = nameInput.value || intelligentName;
      try { (obj as any).name = val; } catch (error) {
        console.warn('Failed to set object name:', error);
      }
      try { if ((obj as any).__meta) (obj as any).__meta.name = val; } catch (error) {
        console.warn('Failed to set meta name:', error);
      }
    });
    nameInput.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      nameInput.readOnly = false;
      nameInput.focus();
      // place cursor at end
      const v = nameInput.value; nameInput.value = ''; nameInput.value = v;
    });
    nameInput.addEventListener('blur', () => { nameInput.readOnly = true; });
    // Avoid showing text cursor to prioritize DnD affordance
    nameInput.style.cursor = 'default';
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
      try { (obj as any).eventMode = locked ? 'none' : 'static'; } catch (error) {
        console.warn('Failed to set eventMode:', error);
      }
      try { (obj as any).interactiveChildren = !locked; } catch (error) {
        console.warn('Failed to set interactiveChildren:', error);
      }
      updateLockIcon();
    });
    rightSide.appendChild(lock);

    // Context menu (right-click)
    li.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      this.openContextMenu(ev.clientX, ev.clientY, obj);
    });

    // DnD handlers
    // Insertion indicator line (single shared per item)
    const indicator = document.createElement('div');
    indicator.className = 'layers-drop-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    li.style.position = li.style.position || 'relative';
    li.appendChild(indicator);

    li.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/layer-id', id);
      e.dataTransfer?.setData('text/plain', id);
      e.dataTransfer!.effectAllowed = 'move';
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      // Show single indicator between items
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = (e as DragEvent).clientY;
      const localY = y - rect.top;
      const ratio = rect.height ? localY / rect.height : 0.5;
      const lower = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-lower').trim() || '0.4');
      const upper = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--layers-center-band-upper').trim() || '0.6');
      const isCenterBand = ratio >= (isNaN(lower) ? 0.4 : lower) && ratio <= (isNaN(upper) ? 0.6 : upper);
      if (isCenterBand) {
        // Hide insert indicator when the intention is to group inside
        indicator.classList.remove('layers-drop-indicator--visible');
        indicator.classList.remove('layers-drop-indicator--top');
        indicator.classList.remove('layers-drop-indicator--bottom');
      } else {
        const topHalf = ratio < 0.5;
        // ensure only current indicator shows
        document.querySelectorAll('.layers-drop-indicator').forEach((el) => {
          el.classList.remove('layers-drop-indicator--visible');
          el.classList.remove('layers-drop-indicator--top');
          el.classList.remove('layers-drop-indicator--bottom');
        });
        indicator.classList.toggle('layers-drop-indicator--top', topHalf);
        indicator.classList.toggle('layers-drop-indicator--bottom', !topHalf);
        indicator.classList.add('layers-drop-indicator--visible');
      }
    });
    li.addEventListener('dragleave', () => {
      indicator.classList.remove('layers-drop-indicator--visible');
      indicator.classList.remove('layers-drop-indicator--top');
      indicator.classList.remove('layers-drop-indicator--bottom');
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      indicator.classList.remove('layers-drop-indicator--visible');
      indicator.classList.remove('layers-drop-indicator--top');
      indicator.classList.remove('layers-drop-indicator--bottom');
      const dragId = e.dataTransfer?.getData('text/layer-id');
      if (!dragId) return;
      
      try {
        const canvasAPI = (window as any).canvasAPI;
        const app = canvasAPI?.getApp() as Application | null;
        const drawingLayer = canvasAPI?.getDrawingLayer() as Container | null;
        const displayManager = (window as any)._displayManager as any;
        if (!app || !drawingLayer || !displayManager) {
          console.warn('⚠️ Drop operation failed: Missing required components');
          return;
        }

        const dragged = this.getObjectById(dragId);
        if (!dragged) {
          console.warn('⚠️ Drop operation failed: Dragged object not found:', dragId);
          return;
        }

        const dropTargetId = (e.currentTarget as HTMLElement).dataset.layerId || '';
        const dropTarget = this.getObjectById(dropTargetId);
        if (!dropTarget) {
          console.warn('⚠️ Drop operation failed: Drop target not found:', dropTargetId);
          return;
        }

        // Ensure we don't create circular references (dragging parent into child)
        if (this.wouldCreateCycle(dragged, dropTarget)) {
          console.warn('⚠️ Drop operation prevented: Would create circular reference');
          return;
        }

        // Store original parent for rollback if needed
        const originalParent = dragged.parent as Container | null;
        const originalIndex = originalParent ? originalParent.children.indexOf(dragged) : -1;

        // Determine intent by cursor position:
        // - Above top half => insert above
        // - Below bottom half => insert below
        // - If holding meta/ctrl and target is container => nest inside (group)
        // - If hovering centrally inside target (between 35%-65% height), treat as group intent too
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const localY = (e as DragEvent).clientY - rect.top;
        const ratio = rect.height ? localY / rect.height : 0.5;
        const isAbove = ratio < 0.5;
        // Center band thresholds use CSS custom properties for easy tuning
        const root = document.documentElement as HTMLElement;
        const lowerStr = getComputedStyle(root).getPropertyValue('--layers-center-band-lower').trim() || '0.4';
        const upperStr = getComputedStyle(root).getPropertyValue('--layers-center-band-upper').trim() || '0.6';
        const lower = parseFloat(lowerStr);
        const upper = parseFloat(upperStr);
        const isCenterBand = ratio >= (isNaN(lower) ? 0.4 : lower) && ratio <= (isNaN(upper) ? 0.6 : upper);
        const metaCtrl = (e as DragEvent).metaKey || (e as DragEvent).ctrlKey;
        const wantNestInside = (metaCtrl || isCenterBand);
        const isContainerTarget = ((dropTarget as any).__toolType === 'container') || (String((dropTarget as any).name || '').toLowerCase() === 'group');

        if (wantNestInside && dragged !== dropTarget && isContainerTarget) {
          try {
            if (dragged.parent) dragged.parent.removeChild(dragged);
            (dropTarget as any).addChild(dragged);
            try { (dropTarget as any).sortableChildren = true; } catch {}
            document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id: dragId, object: dragged, action: 'reparented' } }));
            console.log('✅ Nested object into container (meta/ctrl-drop)');

            // Auto-expand the target container in layers panel so items are visible
            try {
              const dropId = this.getId(dropTarget) || '';
              if (dropId) {
                const map = this.getExpansionMap();
                map[dropId] = true;
                localStorage.setItem('layersPanel:expansion', JSON.stringify(map));
              }
            } catch {}

            // Immediate refresh to show nested item without delay
            this.clearThumbnailCache();
            this.refresh();
          } catch (error) {
            console.error('❌ Failed to reparent, rolling back:', error);
            if (originalParent && originalIndex >= 0) {
              try { if (dragged.parent) dragged.parent.removeChild(dragged); originalParent.addChildAt(dragged, originalIndex); } catch {}
            }
            return;
          }
        } else if (wantNestInside && dragged !== dropTarget && !isContainerTarget) {
          // Auto-create a group container and place both dropTarget and dragged into it
          const parentCont = dropTarget.parent as Container | null;
          if (!parentCont) { console.warn('⚠️ Drop target has no parent'); return; }
          try {
            const dmLocal = (window as any)._displayManager as any;
            const created = dmLocal && typeof dmLocal.createContainer === 'function'
              ? dmLocal.createContainer(parentCont)
              : { container: new (window as any).PIXI.Container(), id: '' };
            const group = created.container;
            try { (group as any).__toolType = 'container'; } catch {}
            try { (group as any).name = (group as any).name || 'group'; } catch {}
            try { (group as any).sortableChildren = true; } catch {}
            if (!(group as any).parent) parentCont.addChild(group);

            // Insert group at the position of the drop target
            const targetIndex = parentCont.getChildIndex ? parentCont.getChildIndex(dropTarget) : parentCont.children.indexOf(dropTarget);
            try { if (typeof parentCont.setChildIndex === 'function') parentCont.setChildIndex(group, targetIndex); } catch {}

            // Preserve world positions while regrouping
            const moveInto = (child: any) => {
              try {
                const world = child.getGlobalPosition ? child.getGlobalPosition(new (window as any).PIXI.Point()) : { x: child.x || 0, y: child.y || 0 };
                child.parent?.removeChild(child);
                (group as any).addChild(child);
                const local = (group as any).toLocal ? (group as any).toLocal(world) : world;
                child.position?.set(local.x, local.y);
              } catch {}
            };
            // Move objects into the new group (preserving world positions)
            moveInto(dropTarget);
            moveInto(dragged);

            // Sanity check: ensure both objects ended up inside the new group; if not, force reparent
            try {
              const ensureInGroup = (child: any) => {
                if (child.parent !== group) {
                  try {
                    const world = child.getGlobalPosition ? child.getGlobalPosition(new (window as any).PIXI.Point()) : { x: child.x || 0, y: child.y || 0 };
                    child.parent?.removeChild(child);
                    (group as any).addChild(child);
                    const local = (group as any).toLocal ? (group as any).toLocal(world) : world;
                    child.position?.set(local.x, local.y);
                  } catch (err) {
                    console.warn('⚠️ Fallback reparent (no world transform):', err);
                    try { child.parent?.removeChild(child); (group as any).addChild(child); } catch {}
                  }
                }
              };
              ensureInGroup(dropTarget);
              ensureInGroup(dragged);
            } catch {}

            document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id: dragId, object: dragged, action: 'grouped' } }));
            const dropId = this.getId(dropTarget);
            if (dropId) document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id: dropId, object: dropTarget, action: 'grouped' } }));
            console.log('✅ Auto-grouped items via DnD into new container');

            // Auto-expand the newly created group so both children are visible immediately
            try {
              const groupId = (created as any).id || (this.getId(group) || '');
              if (groupId) {
                const map = this.getExpansionMap();
                map[groupId] = true;
                localStorage.setItem('layersPanel:expansion', JSON.stringify(map));
                // Mark selection to the new group for consistency with other grouping methods
                try { (group as any).__selected = true; } catch {}
                try { document.dispatchEvent(new CustomEvent('selection:changed', { detail: { count: 1 } })); } catch {}
              }
            } catch {}

            // Force an immediate refresh to avoid a transient empty group render
            this.clearThumbnailCache();
            this.refresh();
          } catch (error) {
            console.error('❌ Failed to auto-group via DnD, rolling back:', error);
            if (originalParent && originalIndex >= 0) {
              try { if (dragged.parent) dragged.parent.removeChild(dragged); originalParent.addChildAt(dragged, originalIndex); } catch {}
            }
            return;
          }
        } else {
          // Reorder relative to dropTarget within dropTarget's parent
          const parentCont = dropTarget.parent as Container | null;
          if (!parentCont) { console.warn('⚠️ Drop target has no parent'); return; }
          try {
            const targetIndex = parentCont.getChildIndex ? parentCont.getChildIndex(dropTarget) : parentCont.children.indexOf(dropTarget);
            if (targetIndex < 0) return;
            // Compute insertion index based on desired side
            const insertIndex = Math.max(0, Math.min(parentCont.children.length, isAbove ? targetIndex : targetIndex + 1));
            if (dragged.parent !== parentCont) {
              if (dragged.parent) dragged.parent.removeChild(dragged);
              parentCont.addChildAt(dragged, insertIndex);
            } else {
              const newIndex = Math.max(0, Math.min(parentCont.children.length - 1, insertIndex));
              if (typeof (parentCont as any).setChildIndex === 'function') (parentCont as any).setChildIndex(dragged, newIndex);
              else { parentCont.removeChild(dragged); parentCont.addChildAt(dragged, newIndex); }
            }
            document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id: dragId, object: dragged, action: 'reordered' } }));
            console.log('✅ Reordered object', isAbove ? 'above' : 'below', 'drop target');
          } catch (error) {
            console.error('❌ Failed to reorder, rolling back:', error);
            if (originalParent && originalIndex >= 0) {
              try { if (dragged.parent) dragged.parent.removeChild(dragged); originalParent.addChildAt(dragged, originalIndex); } catch {}
            }
            return;
          }
        }
        
        // Clear cache and refresh UI after successful operation
        this.clearThumbnailCache();
        this.debouncedRefresh(100); // Slight delay for stability after changes
        
      } catch (globalError) {
        console.error('❌ Drop operation failed with global error:', globalError);
        // Force refresh to restore UI state
        this.clearThumbnailCache();
        this.debouncedRefresh(200);
      }
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
        cli.classList.add('layer__item--nested');
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
    const hasTrajectory = (obj as any).__hasTrajectory;
    
    let baseName = '';
    
    // Handle objects with metadata (shapes, brush, pen, etc.)
    if (meta && meta.kind) {
      switch (meta.kind) {
        case 'shapes':
          baseName = this.getShapeName(meta.shapeType || 'rectangle');
          break;
        case 'brush':
          baseName = 'stroke';
          break;
        case 'pen':
          baseName = 'line';
          break;
        case 'tables':
          baseName = 'table';
          break;
        case 'video':
          baseName = meta.name || 'video'; // Use custom name for scenes
          break;
        case 'scene':
          baseName = meta.name || 'animation scene';
          break;
        default:
          baseName = meta.kind;
      }
    }
    
    // Handle objects by tool type if no metadata provided a name
    if (!baseName && toolType) {
      switch (toolType) {
        case 'container':
          baseName = 'group';
          break;
        case 'brush':
          baseName = 'stroke';
          break;
        case 'pen':
          baseName = 'line';
          break;
        case 'shapes':
          baseName = 'rectangle'; // Default shape
          break;
        case 'text':
          baseName = 'text';
          break;
        case 'tables':
          baseName = 'table';
          break;
        case 'scene':
          baseName = meta?.name || 'animation scene'; // Scene/video objects
          break;
        default:
          baseName = toolType;
      }
    }
    
    // Handle by PIXI class type if still no name
    if (!baseName) {
      const className = (obj as any).constructor?.name || 'Object';
      switch (className) {
        case 'Text':
          baseName = 'text';
          break;
        case 'Graphics':
          // Try to determine what kind of graphics this is
          if ((obj as any).children && (obj as any).children.length > 1) {
            baseName = 'group';
          } else {
            baseName = 'graphic';
          }
          break;
        case 'Container':
          if ((obj as any).children && (obj as any).children.length > 1) {
            baseName = 'group';
          } else {
            baseName = 'container';
          }
          break;
        case 'Sprite':
          baseName = 'image';
          break;
        default:
          baseName = className.toLowerCase();
      }
    }
    
    // Fallback if still no name
    if (!baseName) {
      baseName = 'object';
    }
    
    // Add trajectory indicator if the object has a trajectory
    if (hasTrajectory) {
      baseName += ' (trajectory)';
    }
    
    return baseName;
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

  /**
   * Check if moving dragged object into dropTarget would create a circular reference
   * (e.g., moving a parent into one of its own children)
   */
  private wouldCreateCycle(dragged: Container, dropTarget: Container): boolean {
    if (!dragged || !dropTarget) return false;
    
    // Check if dropTarget is a descendant of dragged
    let current = dropTarget.parent;
    while (current) {
      if (current === dragged) {
        return true; // Found cycle: dropTarget is descendant of dragged
      }
      current = current.parent;
    }
    
    return false;
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
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
    }
    
    // Fallback placeholder
    el.style.background = '#f3f4f6';
  }

  // Simple reusable context menu for layers
  private openContextMenu(x: number, y: number, obj: any) {
    // Remove existing
    document.querySelectorAll('.context-menu').forEach(el => el.remove());
    const menu = document.createElement('div');
    menu.className = 'context-menu context-menu--layers';
    Object.assign(menu.style, { position: 'fixed', top: `${y}px`, left: `${x}px`, zIndex: '10000' });

    const dm = (window as any)._displayManager as any;
    const id = this.getId(obj);
    const locked = !!(obj as any).__locked;

    const addItem = (label: string, onClick: (() => void) | null, disabled = false) => {
      const item = document.createElement('button');
      item.className = 'context-menu__item';
      item.textContent = label;
      if (disabled || !onClick) {
        item.disabled = true; item.setAttribute('aria-disabled', 'true');
      } else {
        item.addEventListener('click', () => { try { onClick(); } finally { menu.remove(); } });
      }
      menu.appendChild(item);
    };

    addItem('Delete', () => { if (dm && id) dm.remove(id); });
    addItem('Duplicate', () => {
      try {
        const parent = obj.parent;
        if (!parent) return;
        const json = (obj as any).toJSON ? (obj as any).toJSON() : null;
        let clone: any = null;
        const dmLocal = (window as any)._displayManager as any;
        if (json && (window as any).PIXI?.Container?.from) {
          clone = (window as any).PIXI.Container.from(json);
        } else if ((obj as any).clone) {
          clone = (obj as any).clone();
        } else if (dmLocal && typeof dmLocal.add === 'function') {
          // Create a minimal container as fallback and copy meta
          const created = dmLocal.createContainer ? dmLocal.createContainer(parent) : null;
          clone = created?.container || new (window as any).PIXI.Container();
          if (!created) parent.addChild(clone);
          try { (clone as any).__meta = JSON.parse(JSON.stringify((obj as any).__meta || {})); } catch {}
          try { (clone as any).__toolType = (obj as any).__toolType; } catch {}
        }
        if (clone) {
          parent.addChild(clone);
          const newId = dmLocal?.add ? dmLocal.add(clone, parent) : null;
          document.dispatchEvent(new CustomEvent('displayObject:added', { detail: { id: newId, object: clone } }));
        }
      } catch {}
    });
    addItem('Rename', () => {
      const li = this.listEl?.querySelector(`li[data-layer-id="${id}"]`) as HTMLElement | null;
      const input = li?.querySelector('.layer__name-input') as HTMLInputElement | null;
      if (input) { input.readOnly = false; input.focus(); }
    });
    addItem('Lock', () => { (obj as any).__locked = true; try { (obj as any).eventMode = 'none'; (obj as any).interactiveChildren = false; } catch {} document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id, object: obj, action: 'lock' } })); }, locked);
    addItem('Unlock', () => { (obj as any).__locked = false; try { (obj as any).eventMode = 'static'; (obj as any).interactiveChildren = true; } catch {} document.dispatchEvent(new CustomEvent('displayObject:updated', { detail: { id, object: obj, action: 'unlock' } })); }, !locked);

    document.body.appendChild(menu);
    const close = () => menu.remove();
    setTimeout(() => {
      document.addEventListener('click', close, { once: true });
      document.addEventListener('contextmenu', close, { once: true });
      window.addEventListener('blur', close, { once: true });
    });
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
    
    // Allow objects inside animation scenes, but NOT the scene content containers themselves
    if (obj.__parentSceneId || obj.__inScene) return true;
    
    // Exclude scene content containers - these are internal structure, not user objects
    if (obj.__sceneContent && obj.name === 'SceneContent') return false;
    
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
