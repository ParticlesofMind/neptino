/**
 * Minimal Snap Menu UI
 * Shows a compact menu to the right of engine__perspective when the grid icon is clicked.
 */

import { snapManager } from './SnapManager';

export function bindSnapMenu(): void {
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
    // Use FloatingElementsManager if available for consistent positioning
    const floatingManager = (window as any).floatingElementsManager;
    if (floatingManager && typeof floatingManager.positionSnapMenu === 'function') {
      floatingManager.positionSnapMenu();
      return;
    }
    
    // Fallback to original positioning logic
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
  };

  const openMenu = () => {
    positionMenu();
    snapMenu.classList.add('engine__snap-menu--open');
  };
  
  const closeMenu = () => {
    snapMenu.classList.remove('engine__snap-menu--open');
  };

  const updateSelectedOption = (activeMode: string) => {
    // Remove active class from all items
    snapMenu.querySelectorAll('.engine__snap-item').forEach(item => {
      item.classList.remove('engine__snap-item--active');
    });

    // Set the active item
    const activeItem = snapMenu.querySelector(`[data-snap-option="${activeMode}"]`);
    if (activeItem) {
      activeItem.classList.add('engine__snap-item--active');
    }    // Update the anchor button icon and label to reflect selected option
    const anchorImg = snapAnchor.querySelector('img') as HTMLImageElement;
    const anchorLabel = snapAnchor.querySelector('.icon-label') as HTMLElement;
    
    const iconMap: Record<string, { src: string; label: string }> = {
      smart: { 
        src: '/src/assets/icons/coursebuilder/perspective/snap-smart.svg', 
        label: 'Smart' 
      },
      none: { 
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
    
    
    if (snapMenu.classList.contains('engine__snap-menu--open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Handle smart guides toggle
  const smartGuidesToggle = snapMenu.querySelector('#smart-guides-toggle') as HTMLInputElement | null;
  if (smartGuidesToggle) {
    // Load saved state
    try {
      const savedState = localStorage.getItem('smartGuidesEnabled');
      if (savedState !== null) {
        smartGuidesToggle.checked = savedState === 'true';
      }
    } catch (error) {
      console.warn('Failed to load smart guides state:', error);
    }

    // Handle toggle changes
    smartGuidesToggle.addEventListener('change', (e) => {
      e.stopPropagation();
      const isEnabled = smartGuidesToggle.checked;

      // Save state to localStorage
      try {
        localStorage.setItem('smartGuidesEnabled', String(isEnabled));
      } catch (error) {
        console.warn('Failed to save smart guides state:', error);
      }

      // If toggling off smart guides, switch to none mode (no guides)
      if (!isEnabled) {
        snapManager.setActiveMode('none');
        updateSelectedOption('smart'); // Keep UI showing smart but guides disabled
      }
      // If toggling on smart guides, switch to smart mode
      else {
        snapManager.setActiveMode('smart');
        updateSelectedOption('smart');
      }
    });
  }

  // Handle option selection
  snapMenu.querySelectorAll<HTMLElement>('[data-snap-option]').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't handle clicks on the checkbox itself
      if ((e.target as HTMLElement).id === 'smart-guides-toggle') {
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const mode = item.getAttribute('data-snap-option') || 'smart';

      // Check if smart guides is disabled and enable it when clicking on smart option
      if (mode === 'smart' && smartGuidesToggle && !smartGuidesToggle.checked) {
        smartGuidesToggle.checked = true;
        try {
          localStorage.setItem('smartGuidesEnabled', 'true');
        } catch (error) {
          console.warn('Failed to save smart guides state:', error);
        }
      }

      // Update snap manager state
      try {
        (snapManager as any).setActiveMode(mode);
      } catch (error) {
        console.warn('Failed to set snap mode:', error);
      }

      // Update UI to reflect selection
      updateSelectedOption(mode);

      closeMenu();
    });
  });

  // Handle distribute actions
  snapMenu.querySelectorAll<HTMLElement>('[data-distribute]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const distributeMode = item.getAttribute('data-distribute');
      
      // Remove active class from all distribute items
      snapMenu.querySelectorAll('[data-distribute]').forEach(distItem => {
        distItem.classList.remove('engine__snap-item--active');
      });
      
      // Add active class to clicked item
      item.classList.add('engine__snap-item--active');
      
      // Save distribute mode preference
      try {
        localStorage.setItem('distributeMode', distributeMode || 'horizontal');
      } catch (error) {
        console.warn('Failed to save distribute mode:', error);
      }

      // TODO: Implement actual distribute functionality
      console.log('Distribute mode selected:', distributeMode);
    });
  });

  // Handle guide mode actions
  snapMenu.querySelectorAll<HTMLElement>('[data-guide-mode]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const guideMode = item.getAttribute('data-guide-mode');
      
      // Remove active class from all guide mode items
      snapMenu.querySelectorAll('[data-guide-mode]').forEach(guideItem => {
        guideItem.classList.remove('engine__snap-item--active');
      });
      
      // Add active class to clicked item
      item.classList.add('engine__snap-item--active');
      
      // Update snap manager preferences
      try {
        (snapManager as any).setPrefs?.({ guideExtendMode: guideMode });
      } catch (error) {
        console.warn('Failed to set guide extend mode:', error);
      }

      console.log('Guide extension mode selected:', guideMode);
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
    const currentMode = (snapManager as any).getActiveMode?.() || 'smart';
    updateSelectedOption(currentMode);
    
    // Load saved distribute mode
    try {
      const savedDistributeMode = localStorage.getItem('distributeMode') || 'horizontal';
      snapMenu.querySelectorAll('[data-distribute]').forEach(item => {
        item.classList.remove('engine__snap-item--active');
        if (item.getAttribute('data-distribute') === savedDistributeMode) {
          item.classList.add('engine__snap-item--active');
        }
      });
    } catch (error) {
      console.warn('Failed to load distribute mode:', error);
    }
    
    // Load saved guide extend mode 
    try {
      const prefs = (snapManager as any).getPrefs?.();
      if (prefs?.guideExtendMode) {
        snapMenu.querySelectorAll('[data-guide-mode]').forEach(item => {
          item.classList.remove('engine__snap-item--active');
          if (item.getAttribute('data-guide-mode') === prefs.guideExtendMode) {
            item.classList.add('engine__snap-item--active');
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load guide extend mode:', error);
    }
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
  } catch (error) {
    console.warn('Failed to initialize snap menu state:', error);
    updateSelectedOption('smart'); // fallback to smart
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
