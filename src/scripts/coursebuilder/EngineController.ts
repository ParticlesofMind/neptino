/**
 * EngineController - Manages engine button states and mode switching
 * Handles media, mode, and tool button interactions with localStorage persistence
 */

import { toolConfigs, type ModeConfig } from './config/toolConfig';

const MODE_CHANGED_EVENT = 'engine:mode-change';
const TOOL_CHANGED_EVENT = 'engine:tool-change';
const TOOL_SETTING_EVENT = 'engine:tool-setting';

type EngineMode = 'build' | 'animate';

interface EngineState {
  currentMode: EngineMode;
  currentTool: string;
  currentMedia: string | null;
  toolSettings: Record<string, Record<string, unknown>>;
}

const STORAGE_KEY = 'neptino_engine_state';

export class EngineController {
  private state: EngineState;
  private toolsContainer: HTMLElement | null = null;

  constructor() {
    this.state = this.loadState();
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  private loadState(): EngineState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<EngineState>;
        const settings = parsed.toolSettings && typeof parsed.toolSettings === 'object' ? parsed.toolSettings : {};
        return {
          currentMode: parsed.currentMode === 'animate' ? 'animate' : 'build',
          currentTool: typeof parsed.currentTool === 'string' ? parsed.currentTool : 'selection',
          currentMedia: typeof parsed.currentMedia === 'string' ? parsed.currentMedia : null,
          toolSettings: settings as Record<string, Record<string, unknown>>,
        };
      }
    } catch (error) {
      console.warn('Failed to load engine state from localStorage:', error);
    }

    // Return default state
    return {
      currentMode: 'build',
      currentTool: 'selection',
      currentMedia: null,
      toolSettings: {},
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save engine state to localStorage:', error);
    }
  }

  private dispatchModeChange(mode: EngineMode): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(new CustomEvent(MODE_CHANGED_EVENT, { detail: { mode } }));
  }

  private dispatchToolChange(toolId: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    const detail = { mode: this.state.currentMode, toolId };
    window.dispatchEvent(new CustomEvent(TOOL_CHANGED_EVENT, { detail }));
  }

  private dispatchToolSetting(toolId: string, setting: string, value: unknown): void {
    if (typeof window === 'undefined') {
      return;
    }
    const detail = { toolId, setting, value, mode: this.state.currentMode };
    window.dispatchEvent(new CustomEvent(TOOL_SETTING_EVENT, { detail }));
  }

  private updateToolSetting(toolId: string, setting: string, value: unknown, persist = true): void {
    if (!this.state.toolSettings[toolId]) {
      this.state.toolSettings[toolId] = {};
    }
    this.state.toolSettings[toolId][setting] = value;
    if (persist) {
      this.saveState();
    }
    this.dispatchToolSetting(toolId, setting, value);
  }

  private setupEventListeners(): void {
    this.toolsContainer = document.querySelector('.engine__tools-selection');

    // Setup media buttons
    this.setupMediaButtons();
    
    // Setup mode buttons and render initial mode
    this.setupModeButtons();
    this.renderModeTools(this.state.currentMode);
    
    // Restore previous selections
    this.restoreState();
  }

  private setupMediaButtons(): void {
    const mediaButtons = document.querySelectorAll<HTMLButtonElement>('[data-media]');
    
    mediaButtons.forEach(button => {
      button.addEventListener('click', () => {
        const media = button.dataset.media;
        if (media) {
          this.selectMedia(media);
        }
      });
    });
  }

  private setupModeButtons(): void {
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
    
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode as EngineMode;
        if (mode && toolConfigs[mode]) {
          this.selectMode(mode);
        }
      });
    });
  }

  private restoreState(): void {
    // Restore media selection
    if (this.state.currentMedia) {
      const mediaButton = document.querySelector<HTMLButtonElement>(`[data-media="${this.state.currentMedia}"]`);
      if (mediaButton) {
        mediaButton.classList.add('button--active');
      }
    }

    // Restore mode selection
    const modeButton = document.querySelector<HTMLButtonElement>(`[data-mode="${this.state.currentMode}"]`);
    if (modeButton) {
      modeButton.classList.add('button--active');
    }

    // Restore tool selection
    const toolButton = this.toolsContainer?.querySelector<HTMLButtonElement>(`[data-tool="${this.state.currentTool}"]`);
    if (toolButton) {
      toolButton.classList.add('button--active');
      this.showToolOptions(this.state.currentTool);
    }
  }

  private selectMedia(media: string): void {
    this.state.currentMedia = media;
    this.saveState();
    
    // Remove active class from all media buttons
    const mediaButtons = document.querySelectorAll<HTMLButtonElement>('[data-media]');
    mediaButtons.forEach(btn => btn.classList.remove('button--active'));
    
    // Add active class to selected media button
    const selectedButton = document.querySelector<HTMLButtonElement>(`[data-media="${media}"]`);
    if (selectedButton) {
      selectedButton.classList.add('button--active');
    }
    
    console.log(`Media selected: ${media}`);
  }

  private selectMode(mode: EngineMode): void {
    this.state.currentMode = mode;
    this.saveState();
    this.dispatchModeChange(mode);
    
    // Remove active class from all mode buttons
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.engine__modes [data-mode]');
    modeButtons.forEach(btn => btn.classList.remove('button--active'));
    
    // Add active class to selected mode button
    const selectedButton = document.querySelector<HTMLButtonElement>(`.engine__modes [data-mode="${mode}"]`);
    if (selectedButton) {
      selectedButton.classList.add('button--active');
    }
    
    // Render tools for the new mode
    this.renderModeTools(mode);
    
    console.log(`Mode selected: ${mode}`);
  }

  private renderModeTools(mode: EngineMode): void {
    if (!this.toolsContainer) return;

    const config = toolConfigs[mode];
    if (!config) return;

    // Clear existing tools
    this.toolsContainer.innerHTML = '';

    // Render tools for this mode
    config.tools.forEach((tool, index) => {
      const button = document.createElement('button');
      button.className = 'button button--engine';
      button.dataset.tool = tool.id;
      
      // Set first tool (or saved tool) as active
      if (tool.id === this.state.currentTool || (index === 0 && !this.state.currentTool)) {
        button.classList.add('button--active');
        this.state.currentTool = tool.id;
      }

      button.innerHTML = `
        <img src="${tool.icon}" alt="${tool.name} Tool" class="icon icon--base">
        <span class="label label--small">${tool.name}</span>
      `;

      button.addEventListener('click', () => {
        this.selectTool(tool.id);
      });

      this.toolsContainer!.appendChild(button);
    });

    // Render tool options
    this.renderToolOptions(config);
    
    // Show options for current tool
    this.showToolOptions(this.state.currentTool);
    this.dispatchToolChange(this.state.currentTool);
  }

  private renderToolOptions(config: ModeConfig): void {
    const optionsContainer = document.querySelector('.engine__tools-options');
    if (!optionsContainer) return;

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Render options for each tool
    config.tools.forEach(tool => {
      if (!tool.options || tool.options.length === 0) return;

      const optionsDiv = document.createElement('div');
      optionsDiv.className = `engine__tools-item engine__tools-item--${tool.id}`;
      optionsDiv.style.display = 'none';

      // Render each option based on type
      tool.options.forEach(option => {
        const optionElement = this.createOptionElement(tool.id, option);
        if (optionElement) {
          optionsDiv.appendChild(optionElement);
        }
      });

      optionsContainer.appendChild(optionsDiv);
    });
  }

  private createOptionElement(toolId: string, option: any): HTMLElement | null {
    switch (option.type) {
      case 'slider':
        return this.createSliderControl(toolId, option);
      case 'dropdown':
        return this.createDropdownControl(toolId, option);
      case 'swatches':
        return this.createSwatchControl(toolId, option);
      case 'toggle':
        return this.createToggleControl(toolId, option);
      case 'toggle-group':
        return this.createToggleGroupControl(toolId, option);
      case 'number':
        return this.createNumberControl(toolId, option);
      case 'text':
        return this.createTextControl(toolId, option);
      case 'button':
        return this.createButtonControl(toolId, option);
      default:
        return null;
    }
  }

  private createSliderControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'tools__control tools__control--slider';
    wrapper.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'tools__slider-input';
    input.min = option.settings.min?.toString() ?? '0';
    input.max = option.settings.max?.toString() ?? '100';
    input.step = option.settings.step?.toString() ?? '0.1';

    const currentValue = Number(this.getInitialValue(toolId, option));
    input.value = Number.isFinite(currentValue) ? currentValue.toString() : option.settings.value?.toString() ?? input.min;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'tools__value';
    valueDisplay.textContent = input.value;

    const snaps: number[] | undefined = option.settings.snaps;

    input.addEventListener('input', () => {
      let numeric = Number.parseFloat(input.value);
      if (Array.isArray(snaps) && snaps.length) {
        numeric = this.snapToNearest(numeric, snaps);
        input.value = numeric.toString();
      }
      valueDisplay.textContent = this.formatSliderValue(numeric);
      this.updateToolSetting(toolId, option.id, numeric);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(valueDisplay);
    this.updateToolSetting(toolId, option.id, Number(input.value), false);
    return wrapper;
  }

  private createDropdownControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'tools__control tools__control--dropdown';
    wrapper.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;

    const select = document.createElement('select');
    select.className = 'input input--select';

    const initialValue = this.getInitialValue(toolId, option) ?? option.settings.value;

    option.settings.options.forEach((opt: any) => {
      const optionElement = document.createElement('option');
      optionElement.value = opt.value;
      optionElement.textContent = opt.label;
      if (opt.value === initialValue) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    });

    select.addEventListener('change', () => {
      this.updateToolSetting(toolId, option.id, select.value);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    this.updateToolSetting(toolId, option.id, select.value, false);
    return wrapper;
  }

  private createSwatchControl(toolId: string, option: any): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tools__control tools__control--swatches';
    container.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;
    container.appendChild(label);

    const swatchGrid = document.createElement('div');
    swatchGrid.className = 'tools__swatches';
    container.appendChild(swatchGrid);

    const initialValue = (this.getInitialValue(toolId, option) ?? option.settings.value) as string;

    option.settings.options.forEach((color: string) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tools__swatch';
      button.dataset.value = color;
      button.title = color === 'transparent' ? 'No Fill' : color;
      if (color === initialValue) {
        button.classList.add('is-active');
      }
      if (color === 'transparent') {
        button.classList.add('tools__swatch--transparent');
      } else {
        button.style.setProperty('--swatch-color', color);
        button.style.backgroundColor = color;
      }
      button.addEventListener('click', () => {
        swatchGrid.querySelectorAll('.tools__swatch').forEach((el) => el.classList.remove('is-active'));
        button.classList.add('is-active');
        this.updateToolSetting(toolId, option.id, color);
      });
      swatchGrid.appendChild(button);
    });

    this.updateToolSetting(toolId, option.id, initialValue, false);
    return container;
  }

  private createToggleControl(toolId: string, option: any): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tools__control tools__control--toggle';
    button.textContent = option.label;
    let active = Boolean(this.getInitialValue(toolId, option) ?? option.settings.value ?? false);
    if (active) {
      button.classList.add('is-active');
    }

    button.addEventListener('click', () => {
      active = !active;
      button.classList.toggle('is-active', active);
      this.updateToolSetting(toolId, option.id, active);
    });

    this.updateToolSetting(toolId, option.id, active, false);
    return button;
  }

  private createToggleGroupControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--group';
    wrapper.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;
    wrapper.appendChild(label);

    const group = document.createElement('div');
    group.className = 'tools__segment';
    wrapper.appendChild(group);

    let currentValue = (this.getInitialValue(toolId, option) ?? option.settings.value) as string;

    option.settings.options.forEach((entry: any) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tools__segment-button';
      button.textContent = entry.label;
      if (entry.value === currentValue) {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => {
        currentValue = entry.value;
        group.querySelectorAll('.tools__segment-button').forEach((el) => el.classList.remove('is-active'));
        button.classList.add('is-active');
        this.updateToolSetting(toolId, option.id, currentValue);
      });
      group.appendChild(button);
    });

    this.updateToolSetting(toolId, option.id, currentValue, false);
    return wrapper;
  }

  private createNumberControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'tools__control tools__control--number';
    wrapper.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input input--number';
    if (option.settings.min !== undefined) input.min = option.settings.min.toString();
    if (option.settings.max !== undefined) input.max = option.settings.max.toString();
    if (option.settings.step !== undefined) input.step = option.settings.step.toString();

    const initialValue = Number(this.getInitialValue(toolId, option) ?? option.settings.value ?? 0);
    input.value = initialValue.toString();

    input.addEventListener('change', () => {
      const numeric = Number.parseFloat(input.value);
      this.updateToolSetting(toolId, option.id, numeric);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    this.updateToolSetting(toolId, option.id, initialValue, false);
    return wrapper;
  }

  private createTextControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'tools__control tools__control--text';
    wrapper.title = option.label;

    const label = document.createElement('span');
    label.className = 'tools__label';
    label.textContent = option.label;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input input--text';
    if (option.settings.placeholder) {
      input.placeholder = option.settings.placeholder;
    }
    const initialValue = (this.getInitialValue(toolId, option) ?? option.settings.value ?? '').toString();
    input.value = initialValue;

    input.addEventListener('input', () => {
      this.updateToolSetting(toolId, option.id, input.value);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    this.updateToolSetting(toolId, option.id, initialValue, false);
    return wrapper;
  }

  private createButtonControl(toolId: string, option: any): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tools__control tools__control--button';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      this.updateToolSetting(toolId, option.id, Date.now());
    });
    return button;
  }

  private getInitialValue(toolId: string, option: any): unknown {
    const stored = this.state.toolSettings[toolId]?.[option.id];
    if (stored !== undefined) {
      return stored;
    }
    return option.settings?.value;
  }

  private snapToNearest(value: number, snaps: number[]): number {
    let closest = snaps[0];
    let minDiff = Math.abs(value - snaps[0]);
    for (let i = 1; i < snaps.length; i += 1) {
      const diff = Math.abs(value - snaps[i]);
      if (diff < minDiff) {
        closest = snaps[i];
        minDiff = diff;
      }
    }
    return closest;
  }

  private formatSliderValue(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  private selectTool(tool: string): void {
    this.state.currentTool = tool;
    this.saveState();
    this.dispatchToolChange(tool);
    
    // Remove active class from all tool buttons
    const toolButtons = this.toolsContainer?.querySelectorAll<HTMLButtonElement>('[data-tool]');
    toolButtons?.forEach(btn => btn.classList.remove('button--active'));
    
    // Add active class to selected tool button
    const selectedButton = this.toolsContainer?.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
    if (selectedButton) {
      selectedButton.classList.add('button--active');
    }
    
    // Show tool options
    this.showToolOptions(tool);
    
    console.log(`Tool selected: ${tool}`);
  }

  private showToolOptions(tool: string): void {
    // Hide all tool options
    const allOptions = document.querySelectorAll<HTMLElement>('.engine__tools-item');
    allOptions.forEach(option => {
      option.style.display = 'none';
    });
    
    // Show options for current tool
    const currentOptions = document.querySelector<HTMLElement>(`.engine__tools-item--${tool}`);
    if (currentOptions) {
      currentOptions.style.display = 'flex';
    }
  }

  // Public API
  public getCurrentMode(): EngineMode {
    return this.state.currentMode;
  }

  public getCurrentTool(): string {
    return this.state.currentTool;
  }

  public getCurrentMedia(): string | null {
    return this.state.currentMedia;
  }

  public clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.loadState();
  }
}

// Initialize the engine controller
if (typeof window !== 'undefined') {
  // Export to window for debugging
  (window as any).engineController = new EngineController();
}
