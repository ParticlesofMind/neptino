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
  private buildToolsHTML: string | null = null;
  private installed = false;

  constructor(toolState: ToolStateManager) {
    this.toolState = toolState;
  }

  install(): void {
    if (this.installed) return;
    this.ensureOptionsPanels();
    this.bindModeListener();
    this.bindToolChangeListener(); // Add tool change listener
    this.installed = true;
  }

  /**
   * Listen for tool changes to update options panels accordingly
   */
  private bindToolChangeListener(): void {
    document.addEventListener('tool:changed', (e: Event) => {
      const toolName = (e as CustomEvent).detail as string;
      const currentMode = this.toolState.getCurrentMode();
      console.log(`🔧 TOOL CHANGED: ${toolName} in ${currentMode} mode`);
      
      // Give ToolStateManager time to update UI, then adjust options for mode
      setTimeout(() => {
        this.updateToolOptionsForMode(currentMode);
      }, 100);
    });
  }

  private bindModeListener(): void {
    document.addEventListener('mode:changed', (e: Event) => {
      const mode = (e as CustomEvent).detail as string;
      console.log(`🔧 MODE: Switching to ${mode} mode`);
      
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
      
      // If current tool is not allowed in new mode, switch to selection
      if (!allowed.has(currentTool)) {
        console.log(`🔧 MODE: Tool "${currentTool}" not allowed in ${cm} mode, switching to selection`);
        try { 
          this.toolState.setTool('selection'); 
          // Let ToolStateManager handle the UI update, then we'll adjust options
          setTimeout(() => this.updateToolOptionsForMode(cm), 50);
        } catch {}
      } else {
        // Tool is allowed, just update options
        setTimeout(() => this.updateToolOptionsForMode(cm), 50);
      }
    });
  }

  /**
   * Update tool options panels visibility based on current mode
   * This works WITH ToolStateManager's updateToolUI method, not against it
   */
  private updateToolOptionsForMode(mode: string): void {
    const options = document.querySelector('.engine__tools .tools__options') as HTMLElement | null;
    if (!options) return;

    console.log(`🎛️ OPTIONS: Updating tool options for ${mode} mode`);

    if (mode === 'animate') {
      // In animate mode, only show speed panel for selection, loop panel for scene
      const currentTool = this.toolState.getCurrentTool();
      console.log(`🎛️ OPTIONS: Current animate tool is "${currentTool}"`);
      
      // First, hide all build tool options
      options.querySelectorAll('.tools__item:not(.tools__item--selection):not(.tools__item--scene)').forEach(panel => {
        (panel as HTMLElement).style.display = 'none';
      });
      
      // Hide placeholder
      const placeholder = options.querySelector('.tools__placeholder') as HTMLElement | null;
      if (placeholder) placeholder.style.display = 'none';
      
      // Show appropriate animate panel
      if (currentTool === 'selection') {
        const selectionPanel = options.querySelector('.tools__item--selection') as HTMLElement | null;
        if (selectionPanel) {
          selectionPanel.style.display = 'flex';
          console.log(`🎛️ OPTIONS: Showing selection speed panel for animate mode`);
        }
      } else if (currentTool === 'scene') {
        const scenePanel = options.querySelector('.tools__item--scene') as HTMLElement | null;
        if (scenePanel) {
          scenePanel.style.display = 'flex';
          console.log(`🎛️ OPTIONS: Showing scene loop panel`);
        }
      }
    } else {
      // In build mode, let ToolStateManager handle showing the correct options panel
      // Just hide our animate-specific panels
      const selPanel = options.querySelector('.tools__item--selection') as HTMLElement | null;
      if (selPanel) selPanel.style.display = 'none';
      
      const scenePanel = options.querySelector('.tools__item--scene') as HTMLElement | null;
      if (scenePanel) scenePanel.style.display = 'none';
      
      // Let ToolStateManager's updateToolUI method handle the rest
      console.log(`🎛️ OPTIONS: Hiding animate panels, letting ToolStateManager handle build mode options`);
    }
    
    console.log(`🎛️ OPTIONS: Tool options updated for ${mode} mode`);
  }

  private showAnimateTools(): void {
    const toolsPalette = document.querySelector('.engine__tools .tools__palette') as HTMLElement | null;
    if (!toolsPalette) return;
    
    // Save build tools HTML if not already saved
    if (!this.buildToolsHTML) this.buildToolsHTML = toolsPalette.innerHTML;

    // Clear and rebuild with animate tools
    toolsPalette.innerHTML = '';
    
    let currentTool = this.toolState.getCurrentTool();
    const allowedAnimateTools = new Set(['selection', 'scene']);
    
    // If current tool isn't allowed in animate mode, switch to selection
    if (!allowedAnimateTools.has(currentTool)) {
      currentTool = 'selection';
      try { this.toolState.setTool('selection'); } catch {}
    }

    const createAnimateTool = (tool: string, icon: string, label: string, isActive?: boolean) => {
      return createEl(`
        <div class="tools__item${isActive ? ' tools__item--active active' : ''}" data-tool="${tool}">
          <img src="/src/assets/icons/coursebuilder/tools/${icon}" alt="${label}"
               class="tools__icon icon icon--base">
          <span class="icon-label">${label}</span>
        </div>
      `);
    };

    // Create animate-mode tools: select and scene only
    // Note: UIEventHandler's event delegation will handle clicks automatically
    const selectTool = createAnimateTool('selection', 'tool-select.svg', 'Select', currentTool === 'selection');
    const sceneTool = createAnimateTool('scene', 'tool-shapes.svg', 'Scene', currentTool === 'scene');

    toolsPalette.appendChild(selectTool);
    toolsPalette.appendChild(sceneTool);

    console.log(`🎬 ANIMATE: Showing animate tools (select, scene) - current: ${currentTool}`);
  }

  private restoreBuildTools(): void {
    const toolsPalette = document.querySelector('.engine__tools .tools__palette') as HTMLElement | null;
    if (!toolsPalette || !this.buildToolsHTML) return;
    
    console.log(`🔨 BUILD: Restoring build tools from saved HTML`);
    
    // Restore the original build tools HTML
    toolsSel.innerHTML = this.buildToolsHTML;
    
    // CRITICAL: Rebind click handlers for all restored build tool buttons
    toolsSel.querySelectorAll('[data-tool]').forEach(toolButton => {
      toolButton.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const toolName = target.dataset.tool;
        if (toolName) {
          console.log(`� BUILD: Tool "${toolName}" clicked - switching tool`);
          this.toolState.setTool(toolName);
        }
      });
    });
    
    // Ensure current tool state is properly reflected in the UI
    const currentTool = this.toolState.getCurrentTool();
    console.log(`🔨 BUILD: Current tool is "${currentTool}" - updating UI`);
    
    // Remove active class from all tools first
    toolsSel.querySelectorAll('.tools__item').forEach(item => {
      item.classList.remove('tools__item--active', 'active');
    });
    
    // Add active class to current tool
    const currentToolButton = toolsSel.querySelector(`[data-tool="${currentTool}"]`);
    if (currentToolButton) {
      const parentItem = currentToolButton.closest('.tools__item');
      if (parentItem) {
        parentItem.classList.add('tools__item--active', 'active');
        console.log(`🔨 BUILD: Activated tool button for "${currentTool}"`);
      }
    } else {
      console.warn(`� BUILD: Could not find tool button for "${currentTool}"`);
    }
    
    console.log(`🔨 BUILD: Build tools restored with proper event handlers and UI state`);
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
