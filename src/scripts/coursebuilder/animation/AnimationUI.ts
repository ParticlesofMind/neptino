/**
 * AnimationUI
 * Handles animate-mode tool palette and options panels (loop, speed)
 */

import { animationState, PathSpeed } from './AnimationState';
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
        animate: new Set(['selection','scene']),
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
    });
  }

  private showAnimateTools(): void {
    // Target the dedicated animate container only; never touch build tools
    const animContainer = document.querySelector('[data-mode-tools="animate"]') as HTMLElement | null;
    if (!animContainer) return;

    // Ensure current tool is allowed; if not, switch to selection
    let currentTool = this.toolState.getCurrentTool();
    const allowed = new Set(['selection', 'scene']);
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
          <button type="button" class="tools__button" data-anim-loop>Loop</button>
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

    // Speed selector under Select tool (animate mode)
    if (!options.querySelector('.tools__item--selection [data-anim-speed]')) {
      const speedPanel = createEl(`
        <div class="tools__item tools__item--selection" style="display:none; align-items:center; gap:6px;">
          <span style="font-size:12px; opacity:0.8;">Speed:</span>
          <div class="button-group" data-anim-speed>
            <button type="button" class="tools__button" data-speed="slow">Slow</button>
            <button type="button" class="tools__button" data-speed="medium">Medium</button>
            <button type="button" class="tools__button" data-speed="fast">Fast</button>
          </div>
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
        // Persist under selection tool context to align with UI
        this.toolState.updateToolSettings('selection', { speed: val } as any);
        sync();
      });
      setTimeout(sync, 0);
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
