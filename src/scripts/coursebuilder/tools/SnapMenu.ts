/**
 * Minimal Snap Menu UI
 * Shows a compact menu to the right of engine__perspective when the grid icon is clicked.
 */

import { snapManager } from './SnapManager';

export function bindSnapMenu(perspectiveManager?: any): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const perspective = container.querySelector('.engine__perspective') as HTMLElement | null;
  if (!perspective) return;

  const gridBtn = perspective.querySelector('[data-perspective="grid"]') as HTMLElement | null;
  const menu = perspective.querySelector('#snap-menu') as HTMLElement | null;
  if (!gridBtn || !menu) return;

  const positionMenu = () => {
    // Align menu top with the top of the perspective column for consistency
    // (keeps layout stable across widths)
    menu.style.top = '0px';
  };

  const openMenu = () => {
    positionMenu();
    menu.classList.add('open');
  };
  const closeMenu = () => {
    menu.classList.remove('open');
  };

  gridBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (menu.classList.contains('open')) closeMenu(); else openMenu();
  });

  // Option selection
  menu.querySelectorAll<HTMLElement>('[data-snap-mode]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mode = (item.getAttribute('data-snap-mode') || 'grid') as any;
      // Set snapping mode and sync grid overlay
      try { (snapManager as any).setActiveMode(mode); } catch {}
      try { if (perspectiveManager && typeof perspectiveManager.setGridEnabled === 'function') { perspectiveManager.setGridEnabled(mode === 'grid'); } } catch {}
      closeMenu();
    });
  });

  // Close on outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target as Node) && !gridBtn.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', closeMenu);
}

