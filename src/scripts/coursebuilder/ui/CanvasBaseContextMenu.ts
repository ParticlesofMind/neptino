/**
 * CanvasBaseContextMenu
 * Base context menu for canvas right-click with core actions.
 */

import { copySelection, pasteSelection, duplicateSelection, groupSelection, ungroupSelection } from './contextMenuActions';

export class CanvasBaseContextMenu {
  private menuEl: HTMLDivElement | null = null;
  private hasSelection = false;
  private hasClipboard = false;
  private containerSelector: string;

  constructor(containerSelector: string = '#canvas-container') {
    this.containerSelector = containerSelector;
    this.init();
  }

  private init(): void {
    document.addEventListener('selection:context', (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const count = Number(detail.count || 0);
      this.hasSelection = count > 0;
    });
    document.addEventListener('selection:clipboard', (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      this.hasClipboard = !!detail.hasClipboard;
    });

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'context-menu context-menu--canvas-base';
    this.menuEl.style.display = 'none';
    document.body.appendChild(this.menuEl);

    const container = document.querySelector(this.containerSelector) as HTMLElement | null;
    if (!container) return;
    container.addEventListener('contextmenu', (ev) => this.handleContextMenu(ev));

    // Fallback: capture contextmenu anywhere within the container subtree
    // Some overlays may swallow bubbling; capturing ensures our menu still appears
    document.addEventListener('contextmenu', (ev) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      // Ignore if a layers-panel or existing context menu consumed this
      const isWithinMenu = !!target.closest('.context-menu');
      const inCanvas = !!target.closest(this.containerSelector);
      if (inCanvas && !isWithinMenu) {
        this.handleContextMenu(ev as MouseEvent);
      }
    }, { capture: true });

    document.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
  }

  private handleContextMenu(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.renderMenu();
    this.positionMenu(ev.clientX, ev.clientY);
    this.show();
  }

  private renderMenu(): void {
    if (!this.menuEl) return;
    this.menuEl.innerHTML = '';

    const items: Array<{ label: string; action: () => void; enabled?: boolean } > = [];

    // Order: Copy, Paste, Duplicate, Group, Ungroup
    items.push({ label: 'Copy', action: () => this.handleCopy(), enabled: this.hasSelection });
    items.push({ label: 'Paste', action: () => this.handlePaste(), enabled: this.hasClipboard });
    items.push({ label: 'Duplicate', action: () => this.handleDuplicate(), enabled: this.hasSelection });
    items.push({ label: 'Group', action: () => this.handleGroup(), enabled: this.hasSelection });
    items.push({ label: 'Ungroup', action: () => this.handleUngroup(), enabled: this.hasSelection });

    for (const it of items) {
      const btn = document.createElement('button');
      btn.className = 'context-menu__item';
      btn.type = 'button';
      btn.textContent = it.label;
      if (it.enabled === false) {
        btn.setAttribute('aria-disabled', 'true');
        btn.disabled = true as any;
      } else {
        btn.addEventListener('click', (e) => { e.stopPropagation(); it.action(); this.hide(); });
      }
      this.menuEl.appendChild(btn);
    }
  }

  private positionMenu(x: number, y: number): void {
    if (!this.menuEl) return;
    // Let CSS handle appearance; only clamp to viewport
    const rect = this.menuEl.getBoundingClientRect();
    const w = rect.width || 180;
    const h = rect.height || 160;
    const px = Math.min(x, window.innerWidth - w - 8);
    const py = Math.min(y, window.innerHeight - h - 8);
    this.menuEl.style.position = 'fixed';
    this.menuEl.style.left = px + 'px';
    this.menuEl.style.top = py + 'px';
  }

  private show(): void { if (this.menuEl) this.menuEl.style.display = 'block'; }
  private hide(): void { if (this.menuEl) this.menuEl.style.display = 'none'; }

  // Actions reuse central APIs to avoid duplicated logic
  private handleCopy(): void { try { if (copySelection()) this.hasClipboard = true; } catch {} }
  private handlePaste(): void { try { pasteSelection(); } catch {} }
  private handleDuplicate(): void { try { duplicateSelection(); } catch {} }
  private handleGroup(): void { try { groupSelection(); } catch {} }
  private handleUngroup(): void { try { ungroupSelection(); } catch {} }
}

// Auto-init helper if needed
export function initCanvasBaseContextMenu(selector: string = '#canvas-container') {
  return new CanvasBaseContextMenu(selector);
}
