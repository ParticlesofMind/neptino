/**
 * EngineController - Manages engine button states and mode switching
 * Handles media, mode, and tool button interactions with localStorage persistence
 */

import { toolConfigs, type ModeConfig } from './config/toolConfig';

type EngineMode = 'build' | 'animate';

interface EngineState {
  currentMode: EngineMode;
  currentTool: string;
  currentMedia: string | null;
  toolSettings: Record<string, any>;
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
        return JSON.parse(saved);
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
        const optionElement = this.createOptionElement(option);
        if (optionElement) {
          optionsDiv.appendChild(optionElement);
        }
      });

      optionsContainer.appendChild(optionsDiv);
    });
  }

  private createOptionElement(option: any): HTMLElement | null {
    switch (option.type) {
      case 'number':
        return this.createNumberInput(option);
      case 'select':
        return this.createSelectInput(option);
      case 'color':
        return this.createColorSelector(option);
      case 'shape':
        return this.createShapeSelector(option);
      case 'text-style':
        return this.createTextStyleControls();
      default:
        return null;
    }
  }

  private createNumberInput(option: any): HTMLElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input input--number';
    input.title = option.label;
    input.min = option.settings.min?.toString() || '1';
    input.max = option.settings.max?.toString() || '100';
    input.value = option.settings.value?.toString() || '1';
    input.dataset.setting = option.id;
    return input;
  }

  private createSelectInput(option: any): HTMLElement {
    const select = document.createElement('select');
    select.className = 'input input--select';
    select.title = option.label;
    select.dataset.setting = option.id;

    option.settings.options.forEach((opt: any) => {
      const optElement = document.createElement('option');
      optElement.value = opt.value;
      optElement.textContent = opt.label;
      if (opt.value === option.settings.value) {
        optElement.selected = true;
      }
      select.appendChild(optElement);
    });

    return select;
  }

  private createColorSelector(option: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'color-selector';
    div.dataset.colorSelector = option.id;
    div.dataset.initialColor = option.settings.value;
    div.title = option.label;
    if (option.settings.allowTransparent) {
      div.dataset.allowTransparent = 'true';
    }
    return div;
  }

  private createShapeSelector(option: any): HTMLElement {
    const div = document.createElement('div');
    div.className = 'shape-selector';
    div.dataset.shapeSelector = option.id;
    div.dataset.initialShape = option.settings.value;
    div.title = option.label;
    return div;
  }

  private createTextStyleControls(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'text-style-controls';
    div.setAttribute('aria-label', 'Text Style');
    div.innerHTML = `
      <button type="button" class="tools__button text-style-btn icon icon--base" data-text-style="bold" title="Bold">B</button>
      <button type="button" class="tools__button text-style-btn icon icon--base" data-text-style="italic" title="Italic">I</button>
    `;
    return div;
  }

  private selectTool(tool: string): void {
    this.state.currentTool = tool;
    this.saveState();
    
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
