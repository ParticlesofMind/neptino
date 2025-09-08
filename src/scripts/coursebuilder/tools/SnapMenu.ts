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
      objects: { 
        src: '/src/assets/icons/coursebuilder/perspective/snap-objects.svg', 
        label: 'Objects' 
      },
      canvas: { 
        src: '/src/assets/icons/coursebuilder/perspective/snap-canvas.svg', 
        label: 'Canvas' 
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
    console.log('SnapMenu: Initialized successfully with mode:', currentMode);
  } catch (error) {
    console.warn('Failed to initialize snap menu state:', error);
    updateSelectedOption('grid'); // fallback to grid
  }
}

