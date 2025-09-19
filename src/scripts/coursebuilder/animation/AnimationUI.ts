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
      <div class="tools__item tools__item--scene" style="display:none; align-items:center; gap:16px; padding:8px;">
        <button type="button" class="button button--small button--outline" data-anim-loop title="Loop Animation" style="min-width:36px;">∞</button>
        
        <div class="scene-controls" style="display:flex; align-items:center; gap:12px;">
          <!-- Duration Slider -->
          <div class="duration-control" style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:11px; font-weight:500; color:#666;">Duration:</label>
            <input type="range" 
                   data-duration-slider 
                   min="0" 
                   max="4" 
                   value="0" 
                   step="1"
                   style="width:80px; accent-color:#80bfff;"
                   title="Animation Duration">
            <span data-duration-display style="font-size:11px; font-weight:500; color:#4a79a4; min-width:24px;">3s</span>
          </div>
          
          <!-- Resolution Selector -->
          <div class="resolution-control" style="display:flex; align-items:center; gap:8px;">

            <select data-resolution-select 
                    style="font-size:11px; padding:2px 6px; border:1px solid #ddd; border-radius:3px; background:white;">
              <option value="16:9" selected>16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
            </select>
          </div>
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

    console.log('🎬 AnimationUI: Scene options panel created and added to options container');

    // Duration slider setup
    const durationSlider = scenePanel.querySelector('[data-duration-slider]') as HTMLInputElement;
    const durationDisplay = scenePanel.querySelector('[data-duration-display]') as HTMLSpanElement;
    const durationValues = [3000, 5000, 10000, 20000, 30000]; // 3s, 5s, 10s, 20s, 30s
    const durationLabels = ['3s', '5s', '10s', '20s', '30s'];
    
    const syncDuration = () => {
      const current = animationState.getSceneDuration();
      const index = durationValues.indexOf(current);
      if (index >= 0) {
        durationSlider.value = index.toString();
        durationDisplay.textContent = durationLabels[index];
      }
    };
    
    durationSlider.addEventListener('input', () => {
      const index = parseInt(durationSlider.value);
      const duration = durationValues[index];
      const label = durationLabels[index];
      durationDisplay.textContent = label;
      animationState.setSceneDuration(duration);
      this.toolState.updateToolSettings('scene', { duration });
    });

    // Resolution selector setup
    const resolutionSelect = scenePanel.querySelector('[data-resolution-select]') as HTMLSelectElement;
    
    const syncResolution = () => {
      // Get current resolution from tool settings if available
      const settings = this.toolState.getToolSettings();
      const sceneSettings = settings.scene || {};
      const currentResolution = (sceneSettings as any).aspectRatio || '16:9';
      resolutionSelect.value = currentResolution;
    };
    
    resolutionSelect.addEventListener('change', () => {
      const aspectRatio = resolutionSelect.value;
      this.toolState.updateToolSettings('scene', { aspectRatio });
    });
    
    syncDuration();
    syncResolution();

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
