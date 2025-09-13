/**
 * CanvasContextMenu
 * Lightweight HTML context menu for canvas interactions (copy/paste, delete)
 */

export class CanvasContextMenu {
  private menuEl: HTMLDivElement | null = null;
  private hasSelection: boolean = false;
  private hasClipboard: boolean = false;
  private containerSelector: string;

  constructor(containerSelector: string = '#canvas-container') {
    this.containerSelector = containerSelector;
    this.init();
  }

  private init(): void {
    // Track selection context
    document.addEventListener('selection:context', (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const count = Number(detail.count || 0);
      this.hasSelection = count > 0;
    });
    // Track clipboard state
    document.addEventListener('selection:clipboard', (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      this.hasClipboard = !!detail.hasClipboard;
    });

    // Create menu element
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'canvas-context-menu';
    Object.assign(this.menuEl.style, {
      position: 'fixed',
      minWidth: '160px',
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.15)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
      borderRadius: '8px',
      padding: '6px 0',
      zIndex: '99999',
      display: 'none',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '13px'
    } as CSSStyleDeclaration);
    document.body.appendChild(this.menuEl);

    // Bind contextmenu on canvas container
    const container = document.querySelector(this.containerSelector) as HTMLElement | null;
    if (!container) return;
    container.addEventListener('contextmenu', (ev) => this.handleContextMenu(ev));

    // Global close handlers
    document.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
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

    // Offer Paste if clipboard exists
    if (this.hasClipboard) {
      items.push({ label: 'Paste', action: () => this.handlePaste(), enabled: true });
    }

    // Offer Copy when there is a selection
    if (this.hasSelection) {
      items.push({ label: 'Copy', action: () => this.handleCopy(), enabled: true });
      items.push({ label: 'Duplicate', action: () => this.handleDuplicate(), enabled: true });
      items.push({ label: 'Delete', action: () => this.handleDelete(), enabled: true });
    }

    // Fallback: if neither selection nor clipboard, show disabled items for clarity
    if (items.length === 0) {
      items.push({ label: 'Copy', action: () => {}, enabled: false });
      items.push({ label: 'Paste', action: () => {}, enabled: false });
    }

    for (const it of items) {
      const el = document.createElement('div');
      el.textContent = it.label;
      Object.assign(el.style, {
        padding: '8px 12px',
        cursor: it.enabled === false ? 'not-allowed' : 'pointer',
        color: it.enabled === false ? '#9ca3af' : '#111827'
      } as CSSStyleDeclaration);
      el.onmouseenter = () => { el.style.background = '#f3f4f6'; };
      el.onmouseleave = () => { el.style.background = 'transparent'; };
      if (it.enabled !== false) {
        el.onclick = (e) => {
          e.stopPropagation();
          it.action();
          this.hide();
        };
      }
      this.menuEl.appendChild(el);
    }
  }

  private positionMenu(x: number, y: number): void {
    if (!this.menuEl) return;
    const { innerWidth, innerHeight } = window;
    const rect = { w: 180, h: 160 };
    const px = Math.min(x, innerWidth - rect.w - 8);
    const py = Math.min(y, innerHeight - rect.h - 8);
    this.menuEl.style.left = px + 'px';
    this.menuEl.style.top = py + 'px';
  }

  private show(): void { if (this.menuEl) this.menuEl.style.display = 'block'; }
  private hide(): void { if (this.menuEl) this.menuEl.style.display = 'none'; }

  // Actions
  private handleCopy(): void {
    try {
      const canvasAPI = (window as any).canvasAPI;
      if (canvasAPI) {
        const ok = canvasAPI.copySelection();
        if (ok) this.hasClipboard = true;
      }
    } catch {}
  }
  private handlePaste(): void {
    try {
      const canvasAPI = (window as any).canvasAPI;
      if (canvasAPI) {
        canvasAPI.pasteSelection();
      }
    } catch {}
  }
  private handleDuplicate(): void {
    // Copy then Paste in one action
    this.handleCopy();
    // small async to ensure clipboard state propagates
    setTimeout(() => this.handlePaste(), 0);
  }
  private handleDelete(): void {
    // Simulate Delete key to reuse existing selection tool handling
    const evt = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(evt);
  }
}

