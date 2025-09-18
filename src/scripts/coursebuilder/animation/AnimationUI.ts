/**
 * AnimationUI
 * Handles animate-mode tool palette and options panels (loop, speed)
 */

import { animationState } from './AnimationState';
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

    const existingScenePanel = options.querySelector('.tools__item--scene');
    if (existingScenePanel) {
      existingScenePanel.remove();
    }

    const scenePanel = createEl(`
      <div class="tools__item tools__item--scene" style="display:none; align-items:center; gap:12px; padding:8px;">
        <button type="button" class="button button--small button--outline" data-anim-loop title="Loop Animation" style="min-width:36px;">∞</button>
        <div class="button-group" data-scene-duration style="gap:4px;">
          <button type="button" class="button button--small button--outline" data-duration="3000">3s</button>
          <button type="button" class="button button--small button--outline" data-duration="5000">5s</button>
          <button type="button" class="button button--small button--outline" data-duration="10000">10s</button>
        </div>
      </div>
    `);
    options.appendChild(scenePanel);

    const loopButton = scenePanel.querySelector('[data-anim-loop]') as HTMLButtonElement;
    const activeColor = '#80bfff';
    const activeBorderColor = '#4a79a4';
    const activeTextColor = '#0b2a4a';
    
    const syncLoop = () => {
      const on = animationState.getLoop();
      loopButton.classList.toggle('active', on);
      if (on) {
        loopButton.style.backgroundColor = activeColor;
        loopButton.style.borderColor = activeBorderColor;
        loopButton.style.color = activeTextColor;
        loopButton.style.fontWeight = '600';
      } else {
        loopButton.style.backgroundColor = '';
        loopButton.style.borderColor = '';
        loopButton.style.color = '';
        loopButton.style.fontWeight = '';
      }
    };
    loopButton.addEventListener('click', () => {
      const next = !animationState.getLoop();
      animationState.setLoop(next);
      this.toolState.updateToolSettings('scene', { loop: next });
      syncLoop();
    });
    syncLoop();

    const durationGroup = scenePanel.querySelector('[data-scene-duration]') as HTMLElement;
    const syncDuration = () => {
      const current = animationState.getSceneDuration();
      durationGroup.querySelectorAll<HTMLButtonElement>('button[data-duration]').forEach(btn => {
        const val = Number(btn.dataset.duration || '0');
        const on = val === current;
        btn.classList.toggle('active', on);
        if (on) {
          btn.style.backgroundColor = activeColor;
          btn.style.borderColor = activeBorderColor;
          btn.style.color = activeTextColor;
          btn.style.fontWeight = '600';
        } else {
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.style.fontWeight = '';
        }
      });
    };
    durationGroup.addEventListener('click', (event) => {
      const btn = (event.target as HTMLElement).closest('[data-duration]') as HTMLButtonElement | null;
      if (!btn) return;
      const val = Number(btn.dataset.duration || '3000');
      animationState.setSceneDuration(val);
      this.toolState.updateToolSettings('scene', { duration: val });
      syncDuration();
    });
    syncDuration();

    let pathPanel = options.querySelector('.tools__item--path') as HTMLElement | null;
    if (!pathPanel) {
      pathPanel = createEl(`
        <div class="tools__item tools__item--path" style="display:none; font-size:12px; opacity:0.75;">
          Path options will appear here when ready. Adjust trajectories directly on the canvas.
        </div>
      `);
      options.appendChild(pathPanel);
    } else {
      pathPanel.innerHTML = 'Path options will appear here when ready. Adjust trajectories directly on the canvas.';
      pathPanel.style.display = 'none';
      pathPanel.style.fontSize = '12px';
      pathPanel.style.opacity = '0.75';
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
