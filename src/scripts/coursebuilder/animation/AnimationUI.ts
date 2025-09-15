/**
 * AnimationUI
 * Handles animate-mode tool palette and options panels (loop, speed)
 */

import { animationState, PathSpeed, PathEase } from './AnimationState';
import { pathOverlay } from './PathOverlay';
import { ToolStateManager } from '../ui/ToolStateManager';

function createEl(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export class AnimationUI {
  private toolState: ToolStateManager;
  private installed = false;

  constructor(toolState: ToolStateManager) {
    this.toolState = toolState;
  }

  install(): void {
    if (this.installed) return;
    this.ensureOptionsPanels();
    this.bindModeListener();
    this.installed = true;
    // Initial overlay draw if applicable
    try { pathOverlay.refresh(); } catch {}
  }

  private bindModeListener(): void {
    document.addEventListener('mode:changed', (e: Event) => {
      const mode = (e as CustomEvent).detail as string;
      if (mode === 'animate') {
        this.showAnimateTools();
      } else {
        this.restoreBuildTools();
      }

      // Gate tool by mode to avoid invalid tools carrying over
      const allowedByMode: Record<string, Set<string>> = {
        build: new Set(['selection','pen','brush','text','shapes','eraser','tables']),
        animate: new Set(['selection','scene','path']),
        workflow: new Set(['selection']),
        optimize: new Set(['selection'])
      } as any;
      const cm = (this.toolState.getCurrentMode?.() || mode) as string;
      const allowed = (allowedByMode[cm] || allowedByMode.build);
      const currentTool = this.toolState.getCurrentTool();
      if (!allowed.has(currentTool)) {
        try { this.toolState.setTool('selection'); } catch {}
      }

      // Hide selection speed panel when not in animate mode
      const selPanel = document.querySelector('.engine__tools .tools__options .tools__item--selection') as HTMLElement | null;
      if (selPanel) selPanel.style.display = (cm === 'animate') ? selPanel.style.display : 'none';
      try { pathOverlay.refresh(); } catch {}
    });
  }

  private showAnimateTools(): void {
    // Target the dedicated animate container only; never touch build tools
    const animContainer = document.querySelector('[data-mode-tools="animate"]') as HTMLElement | null;
    if (!animContainer) return;

    // Ensure current tool is allowed; if not, switch to selection
    let currentTool = this.toolState.getCurrentTool();
    const allowed = new Set(['selection', 'scene', 'path']);
    if (!allowed.has(currentTool)) {
      currentTool = 'selection';
      try { this.toolState.setTool('selection'); } catch {}
    }

    // Update active classes within animate container
    animContainer.querySelectorAll('.tools__item').forEach(el => {
      el.classList.remove('tools__item--active', 'active');
    });
    const activeBtn = animContainer.querySelector(`[data-tool="${currentTool}"]`);
    const activeItem = activeBtn?.closest('.tools__item');
    if (activeItem) {
      activeItem.classList.add('tools__item--active', 'active');
    }

    // Clicks are handled by UIEventHandler via delegation; no need to bind here
  }

  private restoreBuildTools(): void {
    // No-op: build tools are static markup controlled by ToolStateManager via [data-mode-tools]
    // Just ensure active state in build container matches current tool
    const buildContainer = document.querySelector('[data-mode-tools="build"]') as HTMLElement | null;
    if (!buildContainer) return;
    const currentTool = this.toolState.getCurrentTool();
    buildContainer.querySelectorAll('.tools__item').forEach(el => {
      el.classList.remove('tools__item--active', 'active');
    });
    const activeBtn = buildContainer.querySelector(`[data-tool="${currentTool}"]`);
    const activeItem = activeBtn?.closest('.tools__item');
    if (activeItem) {
      activeItem.classList.add('tools__item--active', 'active');
    }
  }

  /** Options panels for animate tools */
  private ensureOptionsPanels(): void {
    const options = document.querySelector('.engine__tools .tools__options') as HTMLElement | null;
    if (!options) return;

    // Loop toggle (for Scene tool)
    if (!options.querySelector('.tools__item--scene')) {
      const loopPanel = createEl(`
        <div class="tools__item tools__item--scene" style="display:none; align-items:center; gap:8px;">
          <button type="button" class="button button--small button--outline" data-anim-loop>Loop</button>
          <span style="font-size:12px; opacity:0.8;">Toggle scene looping</span>
        </div>
      `);
      options.appendChild(loopPanel);
      const btn = loopPanel.querySelector('[data-anim-loop]') as HTMLButtonElement;
      const syncLoopBtn = () => { btn.classList.toggle('active', animationState.getLoop()); };
      btn.addEventListener('click', () => {
        const next = !animationState.getLoop();
        animationState.setLoop(next);
        this.toolState.updateToolSettings('scene', { loop: next });
        syncLoopBtn();
      });
      setTimeout(syncLoopBtn, 0);
    }

    // Speed selector under Path tool (animate mode)
    if (!options.querySelector('.tools__item--path [data-anim-speed]')) {
      const speedPanel = createEl(`
        <div class="tools__item tools__item--path" style="display:none; align-items:center; gap:6px;">
      
          <div class="button-group" data-anim-speed>
            <button type="button" class="button button--small button--outline" data-speed="slow">Slow</button>
            <button type="button" class="button button--small button--outline" data-speed="medium">Medium</button>
            <button type="button" class="button button--small button--outline" data-speed="fast">Fast</button>
          </div>
        
          <div class="button-group" data-anim-ease>
            <button type="button" class="button button--small button--outline" data-ease="linear">Linear</button>
            <button type="button" class="button button--small button--outline" data-ease="easeIn">Ease‑In</button>
            <button type="button" class="button button--small button--outline" data-ease="easeOut">Ease‑Out</button>
          </div>
          <div class="button-group" data-anim-curve>
            <button type="button" class="button button--small button--outline" data-curve="linear">Linear</button>
            <button type="button" class="button button--small button--outline" data-curve="bezier">Bezier</button>
          </div>
          <div class="button-group" data-anim-anchors>
            <button type="button" class="button button--small button--outline" data-anchor-action="insertBefore">+ Before</button>
            <button type="button" class="button button--small button--outline" data-anchor-action="insertAfter">+ After</button>
            <button type="button" class="button button--small button--outline" data-anchor-action="insert">+ Add</button>
            <button type="button" class="button button--small button--outline" data-anchor-action="delete">− Remove</button>
          </div>
        
          <div class="button-group" data-anim-anchor-speed>
            <button type="button" class="button button--small button--outline" data-weight="slower">Slower</button>
            <button type="button" class="button button--small button--outline" data-weight="faster">Faster</button>
          </div>
         
          <div class="button-group" data-anim-timing>
            <button type="button" class="button button--small button--outline" data-timing-action="normalize">Normalize</button>
          </div>
   
          <div class="button-group" data-anim-seg-ease>
            <button type="button" class="button button--small button--outline" data-seg-ease="linear">Linear</button>
            <button type="button" class="button button--small button--outline" data-seg-ease="easeIn">In</button>
            <button type="button" class="button button--small button--outline" data-seg-ease="easeOut">Out</button>
            <button type="button" class="button button--small button--outline" data-seg-ease="easeInOut">InOut</button>
          </div>
        
          <button type="button" class="button button--small" data-paths-visibility>Show</button>
          <button type="button" class="button button--small button--outline" data-paths-clear-selected>Clear Selected</button>
          <button type="button" class="button button--small button--delete" data-paths-clear>Clear Scene</button>
        </div>
      `);
      options.appendChild(speedPanel);
      const group = speedPanel.querySelector('[data-anim-speed]') as HTMLElement;
      const sync = () => {
        const current = animationState.getPathSpeed();
        group.querySelectorAll('[data-speed]').forEach(el => {
          el.classList.toggle('active', (el as HTMLElement).dataset.speed === current);
        });
      };
      group.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-speed]') as HTMLElement | null;
        if (!btn) return;
        const val = (btn.dataset.speed || 'slow') as PathSpeed;
        animationState.setPathSpeed(val);
        // Persist under path tool context to align with UI
        this.toolState.updateToolSettings('path', { speed: val } as any);
        sync();
      });
      setTimeout(sync, 0);

      // Ease selector
      const easeGroup = speedPanel.querySelector('[data-anim-ease]') as HTMLElement;
      const syncEase = () => {
        const cur = animationState.getDefaultPathEase();
        easeGroup.querySelectorAll('[data-ease]').forEach(el => {
          el.classList.toggle('active', (el as HTMLElement).dataset.ease === cur);
        });
      };
      easeGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-ease]') as HTMLElement | null;
        if (!btn) return;
        const val = (btn.dataset.ease || 'linear') as PathEase;
        animationState.setDefaultPathEase(val);
        this.toolState.updateToolSettings('path', { ease: val } as any);
        syncEase();
      });
      setTimeout(syncEase, 0);

      // Anchor insert/delete (route to active Path tool via CanvasAPI tool settings)
      const anchorGroup = speedPanel.querySelector('[data-anim-anchors]') as HTMLElement;
      anchorGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-anchor-action]') as HTMLElement | null;
        if (!btn) return;
        const action = btn.dataset.anchorAction || '';
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          canvasAPI.setToolSettings('path', { anchorAction: action });
        } catch {}
      });

      const timingGroup = speedPanel.querySelector('[data-anim-timing]') as HTMLElement;
      timingGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-timing-action]') as HTMLElement | null;
        if (!btn) return;
        const action = btn.dataset.timingAction || '';
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          canvasAPI.setToolSettings('path', { timingAction: action });
        } catch {}
      });

      // Curve selection
      const curveGroup = speedPanel.querySelector('[data-anim-curve]') as HTMLElement;
      const syncCurve = () => {
        // No stored curve in global state; rely on PathTool to persist per-path
      };
      curveGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-curve]') as HTMLElement | null;
        if (!btn) return;
        const curve = btn.dataset.curve || 'linear';
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          canvasAPI.setToolSettings('path', { curve });
        } catch {}
      });
      setTimeout(syncCurve, 0);

      // Anchor speed adjust
      const speedGroup = speedPanel.querySelector('[data-anim-anchor-speed]') as HTMLElement;
      speedGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-weight]') as HTMLElement | null;
        if (!btn) return;
        const w = btn.dataset.weight || '';
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          const delta = w === 'slower' ? 1 : -1;
          canvasAPI.setToolSettings('path', { anchorWeightDelta: delta });
        } catch {}
      });

      // Per-segment easing selection
      const segEaseGroup = speedPanel.querySelector('[data-anim-seg-ease]') as HTMLElement;
      segEaseGroup.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-seg-ease]') as HTMLElement | null;
        if (!btn) return;
        const val = btn.dataset.segEase || 'linear';
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          canvasAPI.setToolSettings('path', { segEasing: val });
        } catch {}
      });

      // Paths visibility toggle
      const visBtn = speedPanel.querySelector('[data-paths-visibility]') as HTMLButtonElement;
      const syncVis = () => {
        const on = animationState.getPathsVisible();
        visBtn.textContent = on ? 'Hide' : 'Show';
        visBtn.classList.toggle('button--outline', on);
      };
      visBtn.addEventListener('click', () => {
        animationState.setPathsVisible(!animationState.getPathsVisible());
        syncVis();
        try { pathOverlay.refresh(); } catch {}
      });
      setTimeout(syncVis, 0);

      // Clear paths for current scene
      const clearBtn = speedPanel.querySelector('[data-paths-clear]') as HTMLButtonElement;
      clearBtn.addEventListener('click', () => {
        try {
          const dm = animationState.getDisplayManager();
          const scenes = animationState.getScenes();
          if (!dm || !scenes.length) return;
          const scene = scenes[scenes.length - 1]; // most recent
          for (const obj of dm.getObjects()) {
            const a = (obj as any).__animation;
            if (a && a.paths && a.paths[scene.getId()]) {
              delete a.paths[scene.getId()];
            }
          }
          pathOverlay.refresh();
        } catch {}
      });

      // Clear paths for selected objects (current scene)
      const clearSelBtn = speedPanel.querySelector('[data-paths-clear-selected]') as HTMLButtonElement;
      clearSelBtn.addEventListener('click', () => {
        try {
          const canvasAPI = (window as any).canvasAPI;
          if (!canvasAPI) return;
          canvasAPI.applySettingsToSelection('path', { action: 'clear', scope: 'scene' });
          pathOverlay.refresh();
        } catch {}
      });
    }
  }
}

export function initializeAnimationUI(toolState: ToolStateManager): void {
  const ui = new AnimationUI(toolState);
  ui.install();
  // Ensure correct palette on load based on persisted mode
  try {
    const mode = toolState.getCurrentMode();
    const evt = new CustomEvent('mode:changed', { detail: mode });
    document.dispatchEvent(evt);
  } catch {}
}
