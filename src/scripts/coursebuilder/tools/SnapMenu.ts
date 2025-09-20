/**
 * Minimal Snap Menu UI
 * Shows a compact menu to the right of engine__perspective when the grid icon is clicked.
 */

import { snapManager } from './SnapManager';

export function bindSnapMenu(perspectiveManager?: any): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.warn('SnapMenu: canvas-container not found');
    return;
  }
  
  const snapAnchor = container.querySelector('[data-snap-anchor]') as HTMLElement | null;
  const snapMenu = container.querySelector('[data-snap-menu]') as HTMLElement | null;
  
  console.log('SnapMenu: Initializing...', { 
    container: !!container, 
    snapAnchor: !!snapAnchor, 
    snapMenu: !!snapMenu 
  });
  
  if (!snapAnchor || !snapMenu) {
    console.warn('SnapMenu: Required elements not found', { snapAnchor: !!snapAnchor, snapMenu: !!snapMenu });
    return;
  }

  const positionMenu = () => {
    // Position menu to the right of the perspective tools container
    const perspective = container.querySelector('.engine__perspective') as HTMLElement | null;
    if (!perspective) return;
    
    // Get the perspective container's position and size
    const perspectiveRect = perspective.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to the canvas container
    const left = perspectiveRect.right - containerRect.left + 8; // 8px margin to the right
    const top = perspectiveRect.top - containerRect.top; // Align with top of perspective tools
    
    snapMenu.style.position = 'absolute';
    snapMenu.style.left = `${left}px`;
    snapMenu.style.top = `${top}px`;
    snapMenu.style.zIndex = '1001';
    
    console.log('Snap menu positioned at:', { left, top, perspectiveRect, containerRect });
  };

  const openMenu = () => {
    positionMenu();
    snapMenu.classList.add('open');
    console.log('Snap menu opened');
  };
  
  const closeMenu = () => {
    snapMenu.classList.remove('open');
    console.log('Snap menu closed');
  };

  const updateSelectedOption = (activeMode: string) => {
    // Remove active class from all items
    snapMenu.querySelectorAll('.snap-menu__item').forEach(item => {
      item.classList.remove('snap-menu__item--active');
    });
    
    // Add active class to selected item
    const activeItem = snapMenu.querySelector(`[data-snap-option="${activeMode}"]`);
    if (activeItem) {
      activeItem.classList.add('snap-menu__item--active');
    }
    
    // Update the anchor button icon and label to reflect selected option
    const anchorImg = snapAnchor.querySelector('img') as HTMLImageElement;
    const anchorLabel = snapAnchor.querySelector('.icon-label') as HTMLElement;
    
    const iconMap: Record<string, { src: string; label: string }> = {
      grid: { 
        src: '/src/assets/icons/coursebuilder/perspective/grid-icon.svg', 
        label: 'Grid' 
      },
      smart: { 
        src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', 
        label: 'Smart' 
      }
    };
    
    const iconInfo = iconMap[activeMode];
    if (iconInfo && anchorImg && anchorLabel) {
      anchorImg.src = iconInfo.src;
      anchorImg.alt = iconInfo.label;
      anchorLabel.textContent = iconInfo.label;
    }
  };

  // Open/close menu on anchor click
  snapAnchor.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Prevent other handlers from firing
    
    console.log('Snap anchor clicked, menu open:', snapMenu.classList.contains('open'));
    
    if (snapMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Handle option selection
  snapMenu.querySelectorAll<HTMLElement>('[data-snap-option]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const mode = item.getAttribute('data-snap-option') || 'grid';
      
      // Update snap manager state
      try { 
        (snapManager as any).setActiveMode(mode); 
      } catch (error) {
        console.warn('Failed to set snap mode:', error);
      }
      
      // Update grid overlay for grid mode
      try { 
        if (perspectiveManager && typeof perspectiveManager.setGridEnabled === 'function') { 
          perspectiveManager.setGridEnabled(mode === 'grid'); 
        } 
      } catch (error) {
        console.warn('Failed to update grid overlay:', error);
      }
      
      // Update UI to reflect selection
      updateSelectedOption(mode);
      
      closeMenu();
    });
  });

  // Close menu on outside clicks and escape key
  document.addEventListener('click', (e) => {
    if (!snapMenu.contains(e.target as Node) && !snapAnchor.contains(e.target as Node)) {
      closeMenu();
    }
  });
  
  document.addEventListener('keydown', (e) => { 
    if (e.key === 'Escape') closeMenu(); 
  });
  
  window.addEventListener('resize', closeMenu);

  // Initialize the UI with the current snap manager state
  try {
    const currentMode = (snapManager as any).getActiveMode?.() || 'grid';
    updateSelectedOption(currentMode);
    // Initialize preferences inputs
    try {
      const prefs = (snapManager as any).getPrefs?.();
      const thr = snapMenu.querySelector('[data-snap-threshold]') as HTMLInputElement | null;
      const tol = snapMenu.querySelector('[data-snap-equaltol]') as HTMLInputElement | null;
      const mw = snapMenu.querySelector('[data-dim-match-width]') as HTMLInputElement | null;
      const mh = snapMenu.querySelector('[data-dim-match-height]') as HTMLInputElement | null;
      const mp = snapMenu.querySelector('[data-snap-midpoints]') as HTMLInputElement | null;
      const cb = snapMenu.querySelector('[data-center-bias]') as HTMLInputElement | null;
      const cbVal = snapMenu.querySelector('[data-center-bias-value]') as HTMLElement | null;
      const sg = snapMenu.querySelector('[data-symmetry-guides]') as HTMLInputElement | null;
      if (thr && prefs?.threshold != null) thr.value = String(prefs.threshold);
      if (tol && prefs?.equalTolerance != null) tol.value = String(prefs.equalTolerance);
      if (mw && prefs?.matchWidth != null) mw.checked = !!prefs.matchWidth;
      if (mh && prefs?.matchHeight != null) mh.checked = !!prefs.matchHeight;
      if (mp && typeof prefs?.enableMidpoints === 'boolean') mp.checked = !!prefs.enableMidpoints;
      if (cb && typeof prefs?.centerBiasMultiplier === 'number') {
        cb.value = String(prefs.centerBiasMultiplier);
        if (cbVal) cbVal.textContent = `×${Number(prefs.centerBiasMultiplier).toFixed(2)}`;
      }
      if (sg && typeof prefs?.enableSymmetryGuides === 'boolean') sg.checked = !!prefs.enableSymmetryGuides;
    } catch {}
    console.log('SnapMenu: Initialized successfully with mode:', currentMode);
  } catch (error) {
    console.warn('Failed to initialize snap menu state:', error);
    updateSelectedOption('grid'); // fallback to grid
  }

  // Bind threshold and equal tolerance inputs
  try {
    const thr = snapMenu.querySelector('[data-snap-threshold]') as HTMLInputElement | null;
    const tol = snapMenu.querySelector('[data-snap-equaltol]') as HTMLInputElement | null;
    const mw = snapMenu.querySelector('[data-dim-match-width]') as HTMLInputElement | null;
    const mh = snapMenu.querySelector('[data-dim-match-height]') as HTMLInputElement | null;
    const mp = snapMenu.querySelector('[data-snap-midpoints]') as HTMLInputElement | null;
    const cb = snapMenu.querySelector('[data-center-bias]') as HTMLInputElement | null;
    const cbVal = snapMenu.querySelector('[data-center-bias-value]') as HTMLElement | null;
    const sg = snapMenu.querySelector('[data-symmetry-guides]') as HTMLInputElement | null;
    if (thr) {
      thr.addEventListener('input', () => {
        const v = Math.max(0, Math.min(50, parseInt(thr.value || '0', 10) || 0));
        (snapManager as any).setPrefs?.({ threshold: v });
      });
    }
    if (tol) {
      tol.addEventListener('input', () => {
        const v = Math.max(0, Math.min(10, parseInt(tol.value || '0', 10) || 0));
        (snapManager as any).setPrefs?.({ equalTolerance: v });
      });
    }
    if (mw) {
      mw.addEventListener('change', () => {
        (snapManager as any).setPrefs?.({ matchWidth: !!mw.checked });
      });
    }
    if (mh) {
      mh.addEventListener('change', () => {
        (snapManager as any).setPrefs?.({ matchHeight: !!mh.checked });
      });
    }
    if (mp) {
      mp.addEventListener('change', () => {
        (snapManager as any).setPrefs?.({ enableMidpoints: !!mp.checked });
      });
    }
    if (cb) {
      cb.addEventListener('input', () => {
        const val = Math.max(1, Math.min(4, parseFloat(cb.value || '1.75') || 1.75));
        (snapManager as any).setPrefs?.({ centerBiasMultiplier: val });
        if (cbVal) cbVal.textContent = `×${val.toFixed(2)}`;
      });
    }
    if (sg) {
      sg.addEventListener('change', () => {
        (snapManager as any).setPrefs?.({ enableSymmetryGuides: !!sg.checked });
      });
    }
  } catch (e) {
    console.warn('SnapMenu: failed to bind pref inputs', e);
  }

  // Bind distribute buttons
  snapMenu.querySelectorAll<HTMLElement>('[data-distribute]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = (btn.getAttribute('data-distribute') || '').toLowerCase();
      if (dir === 'horizontal' || dir === 'vertical') {
        const evt = new CustomEvent('selection:distribute', { detail: { direction: dir } });
        document.dispatchEvent(evt);
        closeMenu();
      }
    });
  });
}
