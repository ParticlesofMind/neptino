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
        animate: new Set(['selection','scene','path','modify']),
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
      const selPanel = document.querySelector('.engine__tools .engine__tools-options .engine__tools-item--selection') as HTMLElement | null;
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
    const allowed = new Set(['selection', 'scene', 'path', 'modify']);
    if (!allowed.has(currentTool)) {
      currentTool = 'selection';
      try { this.toolState.setTool('selection'); } catch {}
    }

    // Update active classes within animate container
    animContainer.querySelectorAll('.engine__tools-item').forEach(el => {
      el.classList.remove('engine__tools-item--active', 'active');
    });
    const activeBtn = animContainer.querySelector(`[data-tool="${currentTool}"]`);
    const activeItem = activeBtn?.closest('.engine__tools-item');
    if (activeItem) {
      activeItem.classList.add('engine__tools-item--active', 'active');
    }

    // Clicks are handled by UIEventHandler via delegation; no need to bind here
  }

  private restoreBuildTools(): void {
    // No-op: build tools are static markup controlled by ToolStateManager via [data-mode-tools]
    // Just ensure active state in build container matches current tool
    const buildContainer = document.querySelector('[data-mode-tools="build"]') as HTMLElement | null;
    if (!buildContainer) return;
    const currentTool = this.toolState.getCurrentTool();
    buildContainer.querySelectorAll('.engine__tools-item').forEach(el => {
      el.classList.remove('engine__tools-item--active', 'active');
    });
    const activeBtn = buildContainer.querySelector(`[data-tool="${currentTool}"]`);
    const activeItem = activeBtn?.closest('.engine__tools-item');
    if (activeItem) {
      activeItem.classList.add('engine__tools-item--active', 'active');
    }
  }

  /** Options panels for animate tools */
  private ensureOptionsPanels(): void {
    const options = document.querySelector('.engine__tools .engine__tools-options') as HTMLElement | null;
    if (!options) return;

    const existingScenePanel = options.querySelector('.engine__tools-item--scene');
    if (existingScenePanel) {
      existingScenePanel.remove();
    }

    const scenePanel = createEl(`
      <div class="engine__tools-item engine__tools-item--horizontal engine__tools-item--scene" style="display:none; align-items:center; gap:16px; padding:8px;">
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
            <span data-duration-display style="font-size:11px; font-weight:500; color:#3c748d; min-width:24px;">3s</span>
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
    const activeBorderColor = '#3c748d';
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

    // Prepare optional settings panel for path tool if already defined in markup
    const pathPanel = options.querySelector('.engine__tools-item--path') as HTMLElement | null;
    if (pathPanel) {
      pathPanel.innerHTML = 'Path options will appear here when ready. Adjust trajectories directly on the canvas.';
      pathPanel.style.display = 'none';
      pathPanel.style.fontSize = '12px';
      pathPanel.style.opacity = '0.75';
    }

    // Create modify tool options panel
    const existingModifyPanel = options.querySelector('.engine__tools-item--modify');
    if (existingModifyPanel) {
      existingModifyPanel.remove();
    }

    const modifyPanel = createEl(`
      <div class="engine__tools-item engine__tools-item--horizontal engine__tools-item--modify" style="display:none; align-items:center; gap:16px; padding:8px;">
        
        <!-- Object-Specific Properties in a clean row -->
        <div class="modify-object-controls" style="display:flex; align-items:center; gap:12px;">
          <!-- Pen/Shape Tool Properties -->
          <div class="modify-pen-controls" data-modify-type="pen" style="display:none; align-items:center; gap:8px;">
            <input type="number" min="1" max="15" value="2" class="input input--number" title="Stroke Width" data-modify-property="size" style="width:50px;">
            <div class="color-selector" data-color-selector="modify-stroke" data-initial-color="#282a29" title="Stroke Color"></div>
            <div class="color-selector" data-color-selector="modify-fill" data-initial-color="transparent" data-allow-transparent="true" title="Fill Color"></div>
          </div>
          
          <!-- Text Tool Properties -->  
          <div class="modify-text-controls" data-modify-type="text" style="display:none; align-items:center; gap:8px;">
            <select class="input input--select" title="Font Size" data-modify-property="fontSize" style="width:80px; font-size:11px; padding:2px 6px;">
              <option value="12">12pt</option>
              <option value="14">14pt</option>
              <option value="16" selected>16pt</option>
              <option value="18">18pt</option>
              <option value="24">24pt</option>
              <option value="32">32pt</option>
            </select>
            <div class="color-selector" data-color-selector="modify-color" data-initial-color="#282a29" title="Text Color"></div>
          </div>
          
          <!-- Brush Tool Properties -->
          <div class="modify-brush-controls" data-modify-type="brush" style="display:none; align-items:center; gap:8px;">
            <input type="number" min="10" max="50" value="20" class="input input--number" title="Brush Size" data-modify-property="size" style="width:50px;">
            <div class="color-selector" data-color-selector="modify-color" data-initial-color="#2b8059" title="Brush Color"></div>
          </div>
          
          <!-- Shapes Tool Properties -->
          <div class="modify-shapes-controls" data-modify-type="shapes" style="display:none; align-items:center; gap:8px;">
            <input type="number" min="1" max="10" value="2" class="input input--number" title="Stroke Width" data-modify-property="strokeWidth" style="width:50px;">
            <div class="color-selector" data-color-selector="modify-stroke" data-initial-color="#3c748d" title="Stroke Color"></div>
            <div class="color-selector" data-color-selector="modify-fill" data-initial-color="transparent" data-allow-transparent="true" title="Fill Color"></div>
          </div>
        </div>
        
        <!-- Status Message -->
        <div class="modify-status" style="display:flex; align-items:center; flex:1;">
          <span data-modify-status style="color:#666; font-size:9px; font-style:italic;">Select an object to modify its properties over time</span>
        </div>
        
        <!-- Universal Transform Controls -->
        <div class="modify-transform-controls" data-modify-transforms style="display:none; align-items:center; gap:8px;">
          <div class="transform-group" style="display:flex; align-items:center; gap:6px;">
            <label style="font-size:11px; font-weight:500; color:#666;">Scale:</label>
            <input type="range" min="0.1" max="3" step="0.05" value="1" class="input input--range" title="Scale" data-modify-property="scale" style="width:60px; accent-color:#80bfff;">
            <span class="scale-value" data-scale-display style="font-size:11px; font-weight:500; color:#3c748d; min-width:32px;">1.00</span>
          </div>
          
          <div class="transform-group" style="display:flex; align-items:center; gap:6px;">
            <label style="font-size:11px; font-weight:500; color:#666;">Opacity:</label>
            <input type="range" min="0" max="1" step="0.05" value="1" class="input input--range" title="Opacity" data-modify-property="alpha" style="width:60px; accent-color:#80bfff;">
            <span class="alpha-value" data-alpha-display style="font-size:11px; font-weight:500; color:#3c748d; min-width:32px;">100%</span>
          </div>
        </div>
        
        <!-- Status Message -->
        <div class="modify-status" style="flex:1; font-size:11px; color:var(--color-text-secondary); text-align:right; padding-right:8px;">
        </div>
      </div>
    `);
    
    options.appendChild(modifyPanel);

    // Setup modify tool event listeners
    this.setupModifyToolListeners(modifyPanel);
  }

  /** Setup event listeners for the modify tool */
  private setupModifyToolListeners(panel: HTMLElement): void {
    // Property controls - handle all modify property inputs
    const propertyInputs = panel.querySelectorAll('[data-modify-property]');
    propertyInputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement;
      const property = element.getAttribute('data-modify-property');
      if (!property) return;

      const eventType = element.type === 'range' ? 'input' : 'change';
      element.addEventListener(eventType, () => {
        let value: any = element.value;
        
        // Convert values based on property type
        switch (property) {
          case 'size':
          case 'strokeWidth':
          case 'fontSize':
            value = parseInt(element.value);
            break;
          case 'scale':
          case 'alpha':
            value = parseFloat(element.value);
            if (property === 'scale') {
              value = { x: value, y: value }; // Uniform scaling
            }
            break;
        }
        
        this.handlePropertyChange(property, value);
        
        // Update display values for range inputs
        if (element.type === 'range') {
          this.updateRangeDisplays(panel);
        }
      });
    });

    // Initialize color selectors (handled by existing color system)
    // The color system will dispatch events we can listen for

    // Listen for modify tool selection changes
    document.addEventListener('modify:selection:changed', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('🎨 AnimationUI: Received modify:selection:changed event:', detail);
      this.updateModifyToolUI(detail);
    });

    // Listen for tool color changes that affect modify tool
    document.addEventListener('tool:settings:changed', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.tool === 'modify') {
        // Handle color/property changes from color selectors
        for (const [property, value] of Object.entries(detail.settings)) {
          this.handlePropertyChange(property, value);
        }
      }
    });

    // Initialize range displays
    this.updateRangeDisplays(panel);
  }

  private handlePropertyChange(property: string, value: any): void {
    console.log(`🎨 ModifyTool UI: Property ${property} changed to`, value);
    
    // Apply the change using implicit keyframes - the change applies from current time forward
    const modifyTool = this.getModifyTool();
    if (!modifyTool) return;

    const selectedObject = modifyTool.getSelectedObject();
    if (!selectedObject) return;

    // Apply the implicit keyframe at current time with this property
    const properties = { [property]: value };
    modifyTool.setImplicitKeyframeAtCurrentTime(properties);
  }

  private updateModifyToolUI(detail: any): void {
    console.log('🎨 AnimationUI: updateModifyToolUI called with detail:', detail);
    
    const panel = document.querySelector('.engine__tools-item--modify') as HTMLElement;
    console.log('🎨 AnimationUI: ModifyTool panel found:', !!panel);
    if (!panel) return;

    const status = panel.querySelector('[data-modify-status]') as HTMLElement;
    
    // Get all control groups
    const penControls = panel.querySelector('[data-modify-type="pen"]') as HTMLElement;
    const textControls = panel.querySelector('[data-modify-type="text"]') as HTMLElement;
    const brushControls = panel.querySelector('[data-modify-type="brush"]') as HTMLElement;
    const shapesControls = panel.querySelector('[data-modify-type="shapes"]') as HTMLElement;
    const transformControls = panel.querySelector('[data-modify-transforms]') as HTMLElement;

    // Hide all control groups first
    [penControls, textControls, brushControls, shapesControls, transformControls].forEach(el => {
      if (el) el.style.display = 'none';
    });

    if (detail.hasSelection) {
      const objectType = detail.objectType;
      status.textContent = `${objectType || 'Object'} selected`;
      
      // Show relevant property controls based on object type
      switch (objectType) {
        case 'pen':
          if (penControls) penControls.style.display = 'flex';
          break;
        case 'text':
          if (textControls) textControls.style.display = 'flex';
          break;
        case 'brush':
          if (brushControls) brushControls.style.display = 'flex';
          break;
        case 'shapes':
          if (shapesControls) shapesControls.style.display = 'flex';
          break;
      }
      
      // Always show transform controls when object is selected
      if (transformControls) transformControls.style.display = 'flex';
      
      // Initialize current values from selected object
      this.initializeControlValues(panel, detail);
      
    } else {
      status.textContent = 'Select an object to modify its properties over time';
    }

  }

  private initializeControlValues(panel: HTMLElement, detail: any): void {
    // Get the current object's properties and populate the controls
    const modifyTool = this.getModifyTool();
    if (!modifyTool) return;

    const selectedObject = modifyTool.getSelectedObject();
    if (!selectedObject) return;

    // Initialize transform controls with current object values
    const scaleInput = panel.querySelector('[data-modify-property="scale"]') as HTMLInputElement;
    const alphaInput = panel.querySelector('[data-modify-property="alpha"]') as HTMLInputElement;
    
    if (scaleInput) {
      const currentScale = selectedObject.scale.x; // Assuming uniform scale
      scaleInput.value = currentScale.toString();
    }
    
    if (alphaInput) {
      alphaInput.value = selectedObject.alpha.toString();
    }

    // Initialize object-specific properties based on meta data
    const meta = (selectedObject as any).__meta || {};
    
    switch (detail.objectType) {
      case 'pen':
        const penSizeInput = panel.querySelector('[data-modify-property="size"]') as HTMLInputElement;
        if (penSizeInput && meta.size) {
          penSizeInput.value = meta.size.toString();
        }
        break;
      
      case 'brush':
        const brushSizeInput = panel.querySelector('[data-modify-property="size"]') as HTMLInputElement;
        if (brushSizeInput && meta.size) {
          brushSizeInput.value = meta.size.toString();
        }
        break;
        
      case 'shapes':
        const strokeWidthInput = panel.querySelector('[data-modify-property="strokeWidth"]') as HTMLInputElement;
        if (strokeWidthInput && meta.strokeWidth) {
          strokeWidthInput.value = meta.strokeWidth.toString();
        }
        break;
        
      case 'text':
        const fontSizeSelect = panel.querySelector('[data-modify-property="fontSize"]') as HTMLSelectElement;
        if (fontSizeSelect && meta.fontSize) {
          fontSizeSelect.value = meta.fontSize.toString();
        }
        break;
    }
    
    // Update range displays
    this.updateRangeDisplays(panel);
  }

  private updateRangeDisplays(panel: HTMLElement): void {
    // Update scale display
    const scaleInput = panel.querySelector('[data-modify-property="scale"]') as HTMLInputElement;
    const scaleDisplay = panel.querySelector('[data-scale-display]') as HTMLElement;
    if (scaleInput && scaleDisplay) {
      const value = parseFloat(scaleInput.value);
      scaleDisplay.textContent = value.toFixed(2);
    }
    
    // Update alpha display
    const alphaInput = panel.querySelector('[data-modify-property="alpha"]') as HTMLInputElement;
    const alphaDisplay = panel.querySelector('[data-alpha-display]') as HTMLElement;
    if (alphaInput && alphaDisplay) {
      const value = parseFloat(alphaInput.value);
      alphaDisplay.textContent = `${Math.round(value * 100)}%`;
    }
  }

  private getModifyTool(): any {
    try {
      const toolManager = (window as any).toolManager;
      return toolManager?.tools?.get?.('modify');
    } catch {
      return null;
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
