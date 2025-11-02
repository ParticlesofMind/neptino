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
  private colorLayer: HTMLElement | null = null;
  private activeColorPopover: { popover: HTMLElement; close: () => void } | null = null;
  private colorPopoverOwners = new WeakMap<HTMLElement, HTMLElement>();

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

  private getPaletteKey(toolId: string, optionId: string): string {
    return `${toolId}__${optionId}__palette`;
  }

  private getColorPalette(toolId: string, option: any): string[] {
    const defaults = Array.isArray(option?.settings?.options)
      ? (option.settings.options as string[])
      : [];
    const stored = this.state.toolSettings[toolId]?.[this.getPaletteKey(toolId, option.id)];
    if (Array.isArray(stored)) {
      return (stored as unknown[]).filter((color): color is string => typeof color === 'string');
    }
    return defaults;
  }

  private storeColorPalette(toolId: string, optionId: string, palette: string[]): void {
    if (!this.state.toolSettings[toolId]) {
      this.state.toolSettings[toolId] = {};
    }
    this.state.toolSettings[toolId][this.getPaletteKey(toolId, optionId)] = palette;
    this.saveState();
  }

  private tryNormalizeHex(value: string): string | null {
    const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) {
      return null;
    }
    return `#${match[1].toUpperCase()}`;
  }

  private normalizeColorValue(value: unknown): string {
    if (typeof value !== 'string') {
      return '#000000';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '#000000';
    }
    if (trimmed.toLowerCase() === 'transparent') {
      return 'transparent';
    }
    return this.tryNormalizeHex(trimmed) ?? '#000000';
  }

  private ensureColorLayer(): HTMLElement | null {
    if (typeof document === 'undefined') {
      return null;
    }

    if (this.colorLayer && this.colorLayer.isConnected) {
      return this.colorLayer;
    }

    const tools = document.querySelector('.engine__tools');
    if (!tools) {
      return null;
    }

    let layer = tools.querySelector<HTMLElement>('.engine__color-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'engine__color-layer';
      const selection = tools.querySelector('.engine__tools-selection');
      tools.insertBefore(layer, selection ?? null);
    }

    this.colorLayer = layer;
    return layer;
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
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--slider';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'input input--slider';
    input.min = option.settings.min?.toString() ?? '0';
    input.max = option.settings.max?.toString() ?? '100';
    input.step = option.settings.step?.toString() ?? '0.1';
    input.setAttribute('aria-label', option.label);

    const currentValue = Number(this.getInitialValue(toolId, option));
    input.value = Number.isFinite(currentValue) ? currentValue.toString() : option.settings.value?.toString() ?? input.min;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'tools__value';
    valueDisplay.textContent = input.value;

    const snaps: number[] | undefined = option.settings.snaps;

    // Add snap indicators if defined
    if (Array.isArray(snaps) && snaps.length > 0) {
      const snapContainer = document.createElement('div');
      snapContainer.className = 'tools__slider-snaps';
      
      const min = Number(input.min);
      const max = Number(input.max);
      const range = max - min;
      
      snaps.forEach((snapValue) => {
        const indicator = document.createElement('span');
        indicator.className = 'tools__slider-snap';
        // Calculate percentage position
        const position = ((snapValue - min) / range) * 100;
        indicator.style.left = `${position}%`;
        snapContainer.appendChild(indicator);
      });
      
      wrapper.appendChild(snapContainer);
    }

    input.addEventListener('input', () => {
      let numeric = Number.parseFloat(input.value);
      if (Array.isArray(snaps) && snaps.length) {
        numeric = this.snapToNearest(numeric, snaps);
        input.value = numeric.toString();
      }
      valueDisplay.textContent = this.formatSliderValue(numeric);
      this.updateToolSetting(toolId, option.id, numeric);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(valueDisplay);
    this.updateToolSetting(toolId, option.id, Number(input.value), false);
    return wrapper;
  }

  private createDropdownControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--dropdown';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const select = document.createElement('select');
    select.className = 'input input--select';
    select.setAttribute('aria-label', option.label);

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

    wrapper.appendChild(select);
    this.updateToolSetting(toolId, option.id, select.value, false);
    return wrapper;
  }

  private createSwatchControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--color';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);
    wrapper.dataset.toolId = toolId;
    wrapper.dataset.optionId = option.id;

    const defaults = Array.isArray(option?.settings?.options)
      ? (option.settings.options as string[])
      : [];
    let palette = Array.from(
      new Set(
        this.getColorPalette(toolId, option).map((color: string) => this.normalizeColorValue(color))
      )
    );

    const initialValueRaw =
      this.getInitialValue(toolId, option) ?? option.settings.value ?? defaults[0] ?? '#000000';
    let currentValue = this.normalizeColorValue(initialValueRaw);
    let workingColor = currentValue;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'button button--engine tools__color-trigger';
    trigger.setAttribute('aria-label', `${option.label} color picker`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');

    const preview = document.createElement('span');
    preview.className = 'tools__color-preview';
    trigger.appendChild(preview);

    const popoverId = `tools-color-${toolId}-${option.id}`;
    trigger.setAttribute('aria-controls', popoverId);

    const popover = document.createElement('div');
    popover.className = 'tools__color-popover';
    popover.id = popoverId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');
    popover.hidden = true;

    const content = document.createElement('div');
    content.className = 'tools__color-content';
    popover.appendChild(content);

    const favorites = document.createElement('div');
    favorites.className = 'tools__color-favorites';

    const favoritesHeader = document.createElement('span');
    favoritesHeader.className = 'tools__color-section-title';
    favoritesHeader.textContent = 'Favorites';
    favorites.appendChild(favoritesHeader);

    const paletteList = document.createElement('div');
    paletteList.className = 'tools__color-list';
    favorites.appendChild(paletteList);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'button button--engine tools__color-add';
    addButton.textContent = 'Add to favorites';
    favorites.appendChild(addButton);

    const editor = document.createElement('div');
    editor.className = 'tools__color-editor';

    const editorHeader = document.createElement('span');
    editorHeader.className = 'tools__color-section-title';
    editorHeader.textContent = 'Color';
    editor.appendChild(editorHeader);

    const colorWheel = document.createElement('input');
    colorWheel.type = 'color';
    colorWheel.className = 'tools__color-wheel';
    editor.appendChild(colorWheel);

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'input input--text tools__color-hex-input';
    hexInput.placeholder = '#RRGGBB';
    editor.appendChild(hexInput);

    content.appendChild(favorites);
    content.appendChild(editor);

    const actions = document.createElement('div');
    actions.className = 'tools__color-actions';
    popover.appendChild(actions);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button button--engine tools__color-cancel';
    cancelButton.textContent = 'Cancel';

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'button button--engine button--active tools__color-apply';
    applyButton.textContent = 'Select';

    actions.appendChild(cancelButton);
    actions.appendChild(applyButton);

    const updatePreview = (color: string): void => {
      if (color === 'transparent') {
        preview.classList.add('is-transparent');
        preview.style.background = '';
      } else {
        preview.classList.remove('is-transparent');
        preview.style.background = color;
      }
    };

    const highlightSelection = (color: string): void => {
      paletteList.querySelectorAll<HTMLButtonElement>('.tools__color-option').forEach((button) => {
        const value = button.dataset.value;
        button.classList.toggle('is-active', value === color);
      });
    };

    const setInputsForColor = (color: string): void => {
      if (color === 'transparent') {
        colorWheel.value = '#000000';
        colorWheel.disabled = true;
        hexInput.value = '';
      } else {
        colorWheel.disabled = false;
        const normalized = this.normalizeColorValue(color);
        colorWheel.value = normalized === 'transparent' ? '#000000' : normalized;
        hexInput.value = normalized;
      }
      hexInput.classList.remove('is-invalid');
      highlightSelection(color);
      updatePreview(color);
    };

    const renderPalette = (): void => {
      paletteList.innerHTML = '';
      palette.forEach((color) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tools__color-option';
        button.dataset.value = color;
        button.setAttribute('aria-label', color === 'transparent' ? 'Transparent' : color);
        button.title = color === 'transparent' ? 'Transparent' : color;
        if (color === 'transparent') {
          button.classList.add('tools__color-option--transparent');
        } else {
          button.style.background = color;
        }
        if (color === workingColor) {
          button.classList.add('is-active');
        }
        button.addEventListener('click', () => {
          workingColor = color;
          setInputsForColor(color);
        });
        paletteList.appendChild(button);
      });
    };

    let handleOutsideClick!: (event: MouseEvent) => void;
    let handleEscape!: (event: KeyboardEvent) => void;

    const closePopover = (): void => {
      if (popover.hidden) {
        return;
      }

      popover.hidden = true;
      popover.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);

      const host = this.colorLayer;
      if (host && host.contains(popover)) {
        host.classList.remove('is-open');
      }

      const owner = this.colorPopoverOwners.get(popover);
      if (owner && owner !== popover.parentElement) {
        owner.appendChild(popover);
      }

      if (this.activeColorPopover?.popover === popover) {
        this.activeColorPopover = null;
      }
    };

    handleOutsideClick = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!popover.contains(target) && target !== trigger) {
        closePopover();
      }
    };

    handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopover();
      }
    };

    const openPopover = (): void => {
      const host = this.ensureColorLayer();

      if (this.activeColorPopover && this.activeColorPopover.popover !== popover) {
        this.activeColorPopover.close();
      }

      if (host) {
        host.classList.add('is-open');
        host.appendChild(popover);
      }

      popover.hidden = false;
      popover.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
      setInputsForColor(workingColor);
      this.activeColorPopover = { popover, close: closePopover };
    };

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (popover.hidden) {
        openPopover();
      } else {
        closePopover();
      }
    });

    cancelButton.addEventListener('click', () => {
      workingColor = currentValue;
      setInputsForColor(currentValue);
      closePopover();
    });

    applyButton.addEventListener('click', () => {
      if (workingColor !== 'transparent') {
        const normalized = this.tryNormalizeHex(workingColor);
        if (!normalized) {
          hexInput.classList.add('is-invalid');
          hexInput.focus();
          return;
        }
        workingColor = normalized;
      }
      currentValue = workingColor;
      this.updateToolSetting(toolId, option.id, currentValue);
      updatePreview(currentValue);
      closePopover();
    });

    addButton.addEventListener('click', () => {
      const normalized = this.tryNormalizeHex(hexInput.value);
      if (!normalized) {
        hexInput.classList.add('is-invalid');
        hexInput.focus();
        return;
      }
      hexInput.classList.remove('is-invalid');
      if (!palette.includes(normalized)) {
        palette = [...palette, normalized];
        this.storeColorPalette(toolId, option.id, palette);
        workingColor = normalized;
        renderPalette();
        setInputsForColor(normalized);
      }
    });

    hexInput.addEventListener('input', () => {
      hexInput.classList.remove('is-invalid');
      const normalized = this.tryNormalizeHex(hexInput.value);
      if (normalized) {
        workingColor = normalized;
        colorWheel.disabled = false;
        colorWheel.value = normalized;
        highlightSelection(normalized);
        updatePreview(normalized);
      }
    });

    colorWheel.addEventListener('input', () => {
      const normalized = this.tryNormalizeHex(colorWheel.value);
      if (normalized) {
        workingColor = normalized;
        hexInput.value = normalized;
        hexInput.classList.remove('is-invalid');
        highlightSelection(normalized);
        updatePreview(normalized);
      }
    });

    renderPalette();
    setInputsForColor(currentValue);

    wrapper.appendChild(trigger);
    wrapper.appendChild(popover);
    this.colorPopoverOwners.set(popover, wrapper);

    this.updateToolSetting(toolId, option.id, currentValue, false);
    return wrapper;
  }

  private createToggleControl(toolId: string, option: any): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tools__control tools__control--toggle';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.classList.add('button', 'button--engine');
    
    // Add specific styling classes and text content for text formatting toggles
    if (option.id === 'bold') {
      button.classList.add('tools__control--bold');
      button.textContent = 'B';
    } else if (option.id === 'italic') {
      button.classList.add('tools__control--italic');
      button.textContent = 'I';
    } else if (option.id === 'underline') {
      button.classList.add('tools__control--underline');
      button.textContent = 'U';
    } else {
      button.textContent = '';
    }
    
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
    wrapper.setAttribute('aria-label', option.label);

    const group = document.createElement('div');
    group.className = 'tools__segment';
    wrapper.appendChild(group);

    let currentValue = (this.getInitialValue(toolId, option) ?? option.settings.value) as string;

    option.settings.options.forEach((entry: any) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tools__segment-button';
      button.title = entry.label;
      button.setAttribute('aria-label', entry.label);
      button.textContent = '';
      button.classList.add('button', 'button--engine');
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
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--number';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input input--number';
    if (option.settings.min !== undefined) input.min = option.settings.min.toString();
    if (option.settings.max !== undefined) input.max = option.settings.max.toString();
    if (option.settings.step !== undefined) input.step = option.settings.step.toString();
    input.setAttribute('aria-label', option.label);

    const initialValue = Number(this.getInitialValue(toolId, option) ?? option.settings.value ?? 0);
    input.value = initialValue.toString();

    input.addEventListener('change', () => {
      const numeric = Number.parseFloat(input.value);
      this.updateToolSetting(toolId, option.id, numeric);
    });

    wrapper.appendChild(input);
    this.updateToolSetting(toolId, option.id, initialValue, false);
    return wrapper;
  }

  private createTextControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'tools__control tools__control--text';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input input--text';
    if (option.settings.placeholder) {
      input.placeholder = option.settings.placeholder;
    }
    input.setAttribute('aria-label', option.label);
    const initialValue = (this.getInitialValue(toolId, option) ?? option.settings.value ?? '').toString();
    input.value = initialValue;

    input.addEventListener('input', () => {
      this.updateToolSetting(toolId, option.id, input.value);
    });

    wrapper.appendChild(input);
    this.updateToolSetting(toolId, option.id, initialValue, false);
    return wrapper;
  }

  private createButtonControl(toolId: string, option: any): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tools__control tools__control--button';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.textContent = '';
    button.classList.add('button', 'button--engine');
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
