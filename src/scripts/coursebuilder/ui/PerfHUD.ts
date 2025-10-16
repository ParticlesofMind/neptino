import { Application, Container, Sprite } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/canvasSizing';

type PerfHUDOptions = {
  containerSelector?: string; // host for absolute positioning
  position?: { top?: number; right?: number };
  sampleMs?: number; // update interval
};

export class PerfHUD {
  private app: Application | null;
  private displayRoot: Container | null;
  private host: HTMLElement | null = null;
  private rootEl: HTMLElement | null = null;
  private summaryEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private fps = 0;
  private frames = 0;
  private lastTime = performance.now();
  private timer: number | null = null;
  private opts: Required<PerfHUDOptions>;

  constructor(app: Application | null, displayRoot: Container | null, opts?: PerfHUDOptions) {
    this.app = app;
    this.displayRoot = displayRoot;
    this.opts = {
      containerSelector: '#canvas-container',
      position: { top: 8, right: 8 },
      sampleMs: 500,
      ...(opts || {}),
    } as Required<PerfHUDOptions>;
  }

  public install(): void {
    this.host = document.querySelector(this.opts.containerSelector!);
    if (!this.host) return;

    // Create root
    const root = document.createElement('div');
    root.className = 'perf-hud perf-hud--collapsed';
    root.setAttribute('data-perf-hud', '');
    root.style.position = 'absolute';
    root.style.top = `${this.opts.position.top}px`;
    root.style.right = `${this.opts.position.right}px`;
    root.style.zIndex = '1500';
    root.style.pointerEvents = 'auto';

    // Header / toggle
    const header = document.createElement('div');
    header.className = 'perf-hud__header';
    header.title = 'Performance panel (click to expand)';
    const title = document.createElement('span');
    title.className = 'perf-hud__title';
    title.textContent = 'Perf';
    const summary = document.createElement('span');
    summary.className = 'perf-hud__summary';
    summary.textContent = '—';
    const miniBtn = document.createElement('button');
    miniBtn.className = 'perf-hud__btn perf-hud__btn--mini';
    miniBtn.innerHTML = '<span aria-hidden="true">▣</span>';
    miniBtn.title = 'Toggle compact mode';
    header.appendChild(title);
    header.appendChild(summary);
    header.appendChild(miniBtn);
    root.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'perf-hud__body';
    body.innerHTML = this.renderBody({});
    root.appendChild(body);

    // Toggle behavior
    header.addEventListener('click', (e) => {
      e.preventDefault();
      root.classList.toggle('perf-hud--collapsed');
    });
    miniBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      root.classList.toggle('perf-hud--mini');
    });

    this.host.appendChild(root);
    this.rootEl = root;
    this.summaryEl = summary;
    this.bodyEl = body;

    // Start sampling
    this.start();
  }

  public start(): void {
    // FPS accumulation via rAF
    const loop = () => {
      this.frames++;
      if (this.rootEl) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // Periodic update
    const tick = () => {
      const now = performance.now();
      const dt = now - this.lastTime;
      const fps = (this.frames * 1000) / (dt || 1);
      this.fps = Math.round(fps);
      this.frames = 0;
      this.lastTime = now;
      const stats = this.collectStats();
      this.update(stats);
      this.timer = window.setTimeout(tick, this.opts.sampleMs);
    };
    this.timer = window.setTimeout(tick, this.opts.sampleMs);
  }

  public stop(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.rootEl && this.rootEl.parentElement) this.rootEl.parentElement.removeChild(this.rootEl);
    this.rootEl = null; this.summaryEl = null; this.bodyEl = null; this.host = null;
  }

  private collectStats(): any {
    const app = this.app as any;
    const renderer = app?.renderer as any;
    const dims = app?.screen ? { width: app.screen.width, height: app.screen.height } : { width: 0, height: 0 };
    const resolution = renderer?.resolution || (renderer?.renderOptions?.resolution) || window.devicePixelRatio || 1;

    const counts = {
      total: 0,
      containers: 0,
      graphics: 0,
      sprites: 0,
      texts: 0,
      others: 0,
    };

    const visit = (node: any) => {
      if (!node) return;
      counts.total++;
      const name = node?.constructor?.name || '';
      switch (name) {
        case 'Container': counts.containers++; break;
        case 'Graphics': counts.graphics++; break;
        case 'Sprite': counts.sprites++; break;
        case 'Text': counts.texts++; break;
        default: counts.others++; break;
      }
      const ch = node.children;
      if (ch && Array.isArray(ch)) for (const c of ch) visit(c);
    };

    // Prefer drawing layer content only (root of DisplayObjectManager)
    const root = this.displayRoot || app?.stage || null;
    if (root) visit(root);

    // Try to fetch draw calls if available (best-effort)
    let drawCalls: number | null = null;
    try { drawCalls = renderer?.stats?.drawCalls ?? renderer?.performance?.drawCalls ?? null; } catch { /* empty */ }

    return { dims, resolution, counts, drawCalls };
  }

  private update(stats: any): void {
    if (!this.summaryEl || !this.bodyEl) return;
    const { counts } = stats;
    this.summaryEl.textContent = `${this.fps} FPS • ${counts.graphics + counts.sprites + counts.texts} nodes`;
    this.bodyEl.innerHTML = this.renderBody(stats);
    this.bindBodyEvents();
  }

  private renderBody(stats: any): string {
    const zoomLabel = (() => {
      try {
        const z = (window as any).perspectiveManager?.getZoom?.() || 1;
        return `${Math.round(z * 100)}%`;
      } catch { return '—'; }
    })();

    const counts = stats?.counts || { total: 0, containers: 0, graphics: 0, sprites: 0, texts: 0, others: 0 };
    const dims = stats?.dims || { width: 0, height: 0 };
    const resolution = stats?.resolution || window.devicePixelRatio || 1;
    const drawCalls = stats?.drawCalls ?? 'n/a';

    const fpsClass = this.fps >= 55 ? 'ok' : this.fps >= 30 ? 'warn' : 'bad';
    const totalNodes = counts.total;
    const leafNodes = counts.graphics + counts.sprites + counts.texts;
    return `
      <div class="perf-hud__section">
        <div class="perf-hud__stat">
          <div class="perf-hud__label">FPS</div>
          <div class="perf-hud__value perf-hud__value--${fpsClass}">${this.fps}</div>
          <div class="perf-hud__bar perf-hud__bar--${fpsClass}" style="--p:${Math.min(100, Math.round((this.fps/60)*100))}%"></div>
        </div>
        <div class="perf-hud__stat">
          <div class="perf-hud__label">Zoom</div>
          <div class="perf-hud__value">${zoomLabel}</div>
        </div>
        <div class="perf-hud__stat">
          <div class="perf-hud__label">Canvas</div>
          <div class="perf-hud__value">${dims.width}×${dims.height} @ ${resolution}x</div>
        </div>
        <div class="perf-hud__stat">
          <div class="perf-hud__label">Draw Calls</div>
          <div class="perf-hud__value">${drawCalls}</div>
        </div>
      </div>

      <div class="perf-hud__section perf-hud__grid">
        <div class="perf-hud__badge">Nodes<span>${totalNodes}</span></div>
        <div class="perf-hud__badge">Leaf<span>${leafNodes}</span></div>
        <div class="perf-hud__chip">Containers<span>${counts.containers}</span></div>
        <div class="perf-hud__chip">Graphics<span>${counts.graphics}</span></div>
        <div class="perf-hud__chip">Sprites<span>${counts.sprites}</span></div>
        <div class="perf-hud__chip">Text<span>${counts.texts}</span></div>
      </div>

      <div class="perf-hud__actions">
        <button class="perf-hud__btn" data-perf-action="cache-selected" title="Cache selected objects to bitmaps">Cache Selected</button>
        <button class="perf-hud__btn" data-perf-action="cache-visible" title="Cache visible Graphics to bitmaps">Cache Visible</button>
        <button class="perf-hud__btn" data-perf-action="uncache-visible" title="Restore cached objects">Unflatten</button>
        <button class="perf-hud__btn" data-perf-action="spriteify-visible" title="Convert Graphics to Sprites (snapshot)">Spriteify</button>
        <div class="perf-hud__sep"></div>
        <button class="perf-hud__btn" data-perf-action="orientation-portrait" title="Switch canvas to 2:3 Portrait (1200×1800)">Portrait</button>
        <button class="perf-hud__btn" data-perf-action="orientation-landscape" title="Switch canvas to 3:2 Landscape (1800×1200)">Landscape</button>
      </div>
    `;
  }

  private bindBodyEvents(): void {
    if (!this.bodyEl) return;
    this.bodyEl.querySelectorAll<HTMLButtonElement>('[data-perf-action]')
      .forEach(btn => btn.addEventListener('click', () => {
        const action = btn.dataset.perfAction || '';
        this.handleAction(action);
      }));
  }

  private handleAction(action: string): void {
    const app = this.app as any;
    const dm = (window as any)._displayManager || null;
    const root = dm?.getRoot ? dm.getRoot() : app?.stage;
    if (!root || !app) return;
    if (action === 'cache-selected') {
      const selected = this.getSelectedObjects() || [];
      selected.forEach((obj: any) => { try { (obj as any).cacheAsBitmap = true; } catch { /* empty */ } });
    } else if (action === 'cache-visible') {
      const targetSet = this.getVisibleTargetSet(root);
      targetSet.forEach((obj: any) => { try { (obj as any).cacheAsBitmap = true; } catch { /* empty */ } });
    } else if (action === 'uncache-visible') {
      const targetSet = this.getVisibleTargetSet(root);
      targetSet.forEach((obj: any) => { try { (obj as any).cacheAsBitmap = false; } catch { /* empty */ } });
    } else if (action === 'spriteify-visible') {
      const targetSet = this.getVisibleTargetSet(root);
      this.spriteifyObjects(targetSet, app);
    } else if (action === 'orientation-portrait' || action === 'orientation-landscape') {
      try {
        const canvasAPI = (window as any).canvasAPI;
        const pm = (window as any).perspectiveManager;
        if (!canvasAPI) return;
        const portrait = action === 'orientation-portrait';
        const W = portrait ? CANVAS_WIDTH : CANVAS_HEIGHT;  // 1200 : 1800
        const H = portrait ? CANVAS_HEIGHT : CANVAS_WIDTH;  // 1800 : 1200
        canvasAPI.resize(W, H);
        // Reset and fit view
        try { pm?.setZoom?.(1.0); pm?.updateCanvasReference?.(); pm?.fitToContainer?.(); } catch { /* empty */ }
      } catch { /* empty */ }
    }
  }

  private getVisibleTargetSet(root: Container): any[] {
    const selectionRect = this.getSelectionRectWorld();
    const selectedSet = this.getSelectedObjects();
    if (selectedSet && selectedSet.length) {
      return selectedSet;
    }
    const out: any[] = [];
    const visit = (node: any) => {
      if (!node || node === root) {/* pass */} 
      const name = node?.constructor?.name || '';
      if (name === 'Graphics') {
        try {
          const b = node.getBounds();
          if (!selectionRect || this.rectsIntersect(b, selectionRect)) {
            out.push(node);
          }
        } catch { /* empty */ }
      }
      const ch = node.children;
      if (ch && Array.isArray(ch)) for (const c of ch) visit(c);
    };
    visit(root);
    return out;
  }

  private getSelectionRectWorld(): { x: number; y: number; width: number; height: number } | null {
    try {
      const ui = (window as any).canvasAPI?.getLayer?.('ui');
      if (!ui) return null;
      let overlay: any | null = null;
      const find = (n: any) => {
        if (!n) return;
        if (n.name === 'selection-box') { overlay = n; return; }
        const ch = n.children; if (ch) for (const c of ch) { if (!overlay) find(c); }
      };
      find(ui);
      if (!overlay) return null;
      const b = overlay.getBounds();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch { return null; }
  }

  private getSelectedObjects(): any[] | null {
    try {
      const tm = (window as any).toolManager;
      if (!tm || typeof tm.getActiveToolName !== 'function') return null;
      const activeName = tm.getActiveToolName();
      if (activeName !== 'selection') return null;
      const tool = tm.getActiveTool?.() || null;
      const arr = (tool as any)?.selected;
      if (Array.isArray(arr) && arr.length) return arr.slice();
      return null;
    } catch { return null; }
  }

  private rectsIntersect(a: any, b: any): boolean {
    return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  }

  private spriteifyObjects(objects: any[], app: Application): void {
    const renderer: any = app.renderer;
    objects.forEach((obj) => {
      try {
        const parent = obj.parent as Container | null;
        if (!parent) return;
        const worldB = obj.getBounds();
        const texture = renderer?.generateTexture ? renderer.generateTexture(obj) : null;
        if (!texture) return;
        const sprite = new Sprite(texture);
        const localPos = parent.toLocal({ x: worldB.x, y: worldB.y });
        sprite.position.set(localPos.x, localPos.y);
        sprite.alpha = obj.alpha ?? 1;
        (sprite as any).eventMode = 'none';
        parent.addChild(sprite);
        parent.removeChild(obj);
        try { obj.destroy(); } catch { /* empty */ }
      } catch { /* empty */ }
    });
  }
}

export function installPerfHUD(): void {
  try {
    if ((window as any).__DISABLE_PERF_HUD__ === true) return;
    const app = (window as any).canvasAPI?.getApp?.() || null;
    const dm = (window as any)._displayManager || null;
    const root = dm?.getRoot ? dm.getRoot() : null;
    const hud = new PerfHUD(app, root, { containerSelector: '#canvas-container' });
    hud.install();
    (window as any).perfHUD = hud;
  } catch (e) {
    console.warn('PerfHUD failed to install', e);
  }
}
