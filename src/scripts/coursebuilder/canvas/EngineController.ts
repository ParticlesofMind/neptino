/**
 * EngineController - Manages engine button states and mode switching
 * Handles media, mode, and tool button interactions with localStorage persistence
 */

import { toolConfigs, type ModeConfig } from '../config/toolConfig';
import { initializeContentTypeSelect, isContentTypeSelect } from '../utils/contentTypeSelect';
import {
  applyEngineButtonBase,
  setButtonActive,
  setElementHidden,
  setFieldError,
} from '../../utils/tailwindState';

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
        const savedTool = typeof parsed.currentTool === 'string' ? parsed.currentTool : 'pen';
        const normalizedTool = savedTool === 'node' ? 'pen' : savedTool;
        return {
          currentMode: parsed.currentMode === 'animate' ? 'animate' : 'build',
          currentTool: normalizedTool,
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
      currentTool: 'pen',
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

    const tools = document.querySelector('[data-engine-tools]');
    if (!tools) {
      return null;
    }

    let layer = tools.querySelector<HTMLElement>('[data-engine-color-layer]');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'h-8 w-full rounded-md border border-neutral-200 bg-white';
      layer.dataset.engineColorLayer = '';
      const options = tools.querySelector('[data-engine-tools-options]');
      if (options) {
        tools.insertBefore(layer, options);
      } else {
        tools.appendChild(layer);
      }
    }

    this.colorLayer = layer;
    return layer;
  }

  private setupEventListeners(): void {
    this.toolsContainer = document.querySelector('[data-engine-tools-selection]');

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
        setButtonActive(mediaButton, true);
      }
    }

    // Restore mode selection
    const modeButton = document.querySelector<HTMLButtonElement>(`[data-mode="${this.state.currentMode}"]`);
    if (modeButton) {
      setButtonActive(modeButton, true);
    }

    // Restore tool selection
    const toolButton = this.toolsContainer?.querySelector<HTMLButtonElement>(`[data-tool="${this.state.currentTool}"]`);
    if (toolButton) {
      setButtonActive(toolButton, true);
      this.showToolOptions(this.state.currentTool);
    }
  }

  private selectMedia(media: string): void {
    this.state.currentMedia = media;
    this.saveState();
    
    // Remove active class from all media buttons
    const mediaButtons = document.querySelectorAll<HTMLButtonElement>('[data-media]');
    mediaButtons.forEach(btn => setButtonActive(btn, false));
    
    // Add active class to selected media button
    const selectedButton = document.querySelector<HTMLButtonElement>(`[data-media="${media}"]`);
    if (selectedButton) {
      setButtonActive(selectedButton, true);
    }
    
    console.log(`Media selected: ${media}`);
  }

  private selectMode(mode: EngineMode): void {
    this.state.currentMode = mode;
    this.saveState();
    this.dispatchModeChange(mode);
    
    // Remove active class from all mode buttons
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-engine-modes] [data-mode]');
    modeButtons.forEach(btn => setButtonActive(btn, false));
    
    // Add active class to selected mode button
    const selectedButton = document.querySelector<HTMLButtonElement>(`[data-engine-modes] [data-mode="${mode}"]`);
    if (selectedButton) {
      setButtonActive(selectedButton, true);
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
      button.className = '';
      applyEngineButtonBase(button);
      button.dataset.tool = tool.id;
      
      // Set first tool (or saved tool) as active
      if (tool.id === this.state.currentTool || (index === 0 && !this.state.currentTool)) {
        setButtonActive(button, true);
        this.state.currentTool = tool.id;
      }

      button.innerHTML = `
        <img src="${tool.icon}" alt="${tool.name} Tool" class="h-6 w-6">
        <span class="text-[11px] leading-tight font-medium">${tool.name}</span>
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
    const optionsContainer = document.querySelector('[data-engine-tools-options]');
    if (!optionsContainer) return;

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Render options for each tool
    config.tools.forEach(tool => {
      if (!tool.options || tool.options.length === 0) return;

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'hidden flex flex-wrap items-center gap-3';
      optionsDiv.dataset.engineToolOptions = tool.id;

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
    wrapper.className = 'flex flex-col gap-2 text-sm text-neutral-700';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const min = Number(option.settings.min ?? 0);
    const max = Number(option.settings.max ?? 100);
    const step = Number(option.settings.step ?? 1);
    const snaps: number[] | undefined = option.settings.snaps;

    const currentValue = Number(this.getInitialValue(toolId, option));
    const initialValue = Number.isFinite(currentValue) ? currentValue : Number(option.settings.value ?? min);

    // Container for the stepper (minus button + input + plus button)
    const stepperContainer = document.createElement('div');
    stepperContainer.className = 'flex items-center gap-2';

    // Minus button
    const minusButton = document.createElement('button');
    minusButton.type = 'button';
    minusButton.className = 'inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
    minusButton.setAttribute('data-button-stepper', 'minus');
    minusButton.setAttribute('aria-label', 'Decrease');
    minusButton.textContent = '−';

    // Number input
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'w-16 rounded-md border-0 py-1 text-center text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 bg-white';
    input.setAttribute('data-input-stepper', 'true');
    input.min = min.toString();
    input.max = max.toString();
    input.step = step.toString();
    input.value = initialValue.toString();
    input.setAttribute('aria-label', option.label);

    // Plus button
    const plusButton = document.createElement('button');
    plusButton.type = 'button';
    plusButton.className = 'inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
    plusButton.setAttribute('data-button-stepper', 'plus');
    plusButton.setAttribute('aria-label', 'Increase');
    plusButton.textContent = '+';

    // Helper function to snap to nearest value if snaps are defined
    const snapToNearest = (value: number): number => {
      if (!Array.isArray(snaps) || snaps.length === 0) {
        return value;
      }
      return snaps.reduce((prev, curr) => 
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      );
    };

    // Helper function to update value
    const updateValue = (newValue: number) => {
      const clampedValue = Math.max(min, Math.min(max, newValue));
      const snappedValue = snapToNearest(clampedValue);
      input.value = snappedValue.toString();
      this.updateToolSetting(toolId, option.id, snappedValue);
    };

    // Minus button handler
    minusButton.addEventListener('click', () => {
      const currentVal = Number.parseFloat(input.value) || initialValue;
      if (Array.isArray(snaps) && snaps.length > 0) {
        // Find next lower snap value
        const lowerSnaps = snaps.filter(s => s < currentVal);
        const nextValue = lowerSnaps.length > 0 ? Math.max(...lowerSnaps) : currentVal - step;
        updateValue(nextValue);
      } else {
        updateValue(currentVal - step);
      }
    });

    // Plus button handler
    plusButton.addEventListener('click', () => {
      const currentVal = Number.parseFloat(input.value) || initialValue;
      if (Array.isArray(snaps) && snaps.length > 0) {
        // Find next higher snap value
        const higherSnaps = snaps.filter(s => s > currentVal);
        const nextValue = higherSnaps.length > 0 ? Math.min(...higherSnaps) : currentVal + step;
        updateValue(nextValue);
      } else {
        updateValue(currentVal + step);
      }
    });

    // Input change handler
    input.addEventListener('change', () => {
      const numeric = Number.parseFloat(input.value);
      if (Number.isFinite(numeric)) {
        updateValue(numeric);
      } else {
        input.value = initialValue.toString();
      }
    });

    // Input blur handler to ensure valid value
    input.addEventListener('blur', () => {
      const numeric = Number.parseFloat(input.value);
      if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
        input.value = initialValue.toString();
      }
    });

    // Assemble the stepper
    stepperContainer.appendChild(minusButton);
    stepperContainer.appendChild(input);
    stepperContainer.appendChild(plusButton);
    
    wrapper.appendChild(stepperContainer);
    
    // Initialize the setting
    this.updateToolSetting(toolId, option.id, initialValue, false);
    
    return wrapper;
  }

  private createDropdownControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center';
    wrapper.setAttribute('data-control', 'dropdown');
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const select = document.createElement('select');
    select.className = 'block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white';
    select.setAttribute('aria-label', option.label);

    const initialValue = this.getInitialValue(toolId, option) ?? option.settings.value;

    option.settings.options.forEach((opt: any) => {
      const optionElement = document.createElement('option');
      optionElement.value = opt.value;
      optionElement.textContent = opt.label;
      if (opt.icon) {
        optionElement.dataset.icon = opt.icon;
      }
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

    // Initialize Select2 for content type dropdowns after element is in DOM
    if (isContentTypeSelect(select)) {
      console.log('🎯 Content type dropdown detected, enabling icon options');
      requestAnimationFrame(() => {
        try {
          initializeContentTypeSelect(select);
        } catch (error) {
          console.error('Failed to initialize content type select:', error);
        }
      });
    }

    return wrapper;
  }

  private createSwatchControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative flex items-center';
    wrapper.setAttribute('data-control', 'color');
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
    trigger.className = 'inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white shadow-sm hover:bg-neutral-50 cursor-pointer';
    trigger.setAttribute('data-color-trigger', 'true');
    trigger.setAttribute('aria-label', `${option.label} color picker`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');

    const preview = document.createElement('span');
    preview.className = 'h-6 w-6 rounded-full border border-neutral-300';
    preview.setAttribute('data-color-preview', 'true');
    trigger.appendChild(preview);

    const popoverId = `tools-color-${toolId}-${option.id}`;
    trigger.setAttribute('aria-controls', popoverId);

    const popover = document.createElement('div');
    popover.className = 'absolute right-0 z-50 mt-2 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg';
    popover.setAttribute('data-color-popover', 'true');
    popover.id = popoverId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');
    popover.hidden = true;

    const content = document.createElement('div');
    content.className = 'flex flex-col gap-4 p-4';
    content.setAttribute('data-color-content', 'true');
    popover.appendChild(content);

    const favorites = document.createElement('div');
    favorites.className = 'flex flex-col gap-2';
    favorites.setAttribute('data-color-favorites', 'true');

    const favoritesHeader = document.createElement('span');
    favoritesHeader.className = 'text-sm font-semibold text-neutral-900';
    favoritesHeader.setAttribute('data-color-section-title', 'true');
    favoritesHeader.textContent = 'Favorites';
    favorites.appendChild(favoritesHeader);

    const paletteList = document.createElement('div');
    paletteList.className = 'flex flex-wrap gap-2';
    paletteList.setAttribute('data-color-list', 'true');
    favorites.appendChild(paletteList);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'inline-flex items-center gap-1 rounded-md border border-dashed border-neutral-400 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50';
    addButton.setAttribute('data-color-add', 'true');
    applyEngineButtonBase(addButton);
    addButton.textContent = 'Add to favorites';
    favorites.appendChild(addButton);

    const editor = document.createElement('div');
    editor.className = 'rounded-lg border border-neutral-200 bg-neutral-50 p-3';
    editor.setAttribute('data-color-editor', 'true');

    const editorHeader = document.createElement('span');
    editorHeader.className = 'text-sm font-semibold text-neutral-900';
    editorHeader.setAttribute('data-color-section-title', 'true');
    editorHeader.textContent = 'Color';
    editor.appendChild(editorHeader);

    // Curated color palette grid for coursebuilding
    const colorGrid = document.createElement('div');
    colorGrid.className = 'grid grid-cols-6 gap-2';
    colorGrid.setAttribute('data-color-grid', 'true');
    
    const curatedColors = [
      // Row 1: Reds to Purples
      '#E74C3C', '#C0392B', '#EC407A', '#E91E63', '#9C27B0', '#7B1FA2',
      // Row 2: Oranges to Pinks
      '#FF5722', '#E64A19', '#FF7043', '#F06292', '#BA68C8', '#9575CD',
      // Row 3: Yellows to Light Blues
      '#FFC107', '#FFA000', '#FFD54F', '#4FC3F7', '#29B6F6', '#039BE5',
      // Row 4: Greens to Cyans
      '#66BB6A', '#43A047', '#26A69A', '#00897B', '#0097A7', '#00ACC1',
      // Row 5: Blues
      '#42A5F5', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1', '#0277BD',
      // Row 6: Grays
      '#757575', '#616161', '#424242', '#212121', '#9E9E9E', '#BDBDBD'
    ];

    curatedColors.forEach((color) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'h-6 w-6 rounded-full border border-neutral-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary-500';
      button.setAttribute('data-color-grid-option', 'true');
      button.style.background = color;
      button.dataset.value = color;
      button.title = color;
      button.setAttribute('aria-label', color);
      button.addEventListener('click', () => {
        workingColor = color;
        hexInput.value = color;
        setFieldError(hexInput, false);
        updatePreview(color);
      });
      colorGrid.appendChild(button);
    });

    editor.appendChild(colorGrid);

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white';
    hexInput.setAttribute('data-color-hex-input', 'true');
    hexInput.placeholder = '#RRGGBB';
    editor.appendChild(hexInput);

    content.appendChild(favorites);
    content.appendChild(editor);

    const actions = document.createElement('div');
    actions.className = 'flex gap-2 border-t border-neutral-200 pt-3';
    actions.setAttribute('data-color-actions', 'true');
    popover.appendChild(actions);

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50';
    cancelButton.setAttribute('data-color-cancel', 'true');
    applyEngineButtonBase(cancelButton);
    cancelButton.textContent = 'Cancel';

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'inline-flex items-center justify-center rounded-md border border-primary-300 bg-primary-400 px-3 py-2 text-sm font-medium text-white hover:bg-primary-500';
    applyButton.setAttribute('data-color-apply', 'true');
    applyEngineButtonBase(applyButton);
    setButtonActive(applyButton, true);
    applyButton.textContent = 'Select';

    actions.appendChild(cancelButton);
    actions.appendChild(applyButton);

    const updatePreview = (color: string): void => {
      if (color === 'transparent') {
        preview.classList.add('bg-transparent', 'border', 'border-dashed', 'border-neutral-300');
        preview.style.background = '';
      } else {
        preview.classList.remove('bg-transparent', 'border', 'border-dashed', 'border-neutral-300');
        preview.style.background = color;
      }
    };

    const highlightSelection = (color: string): void => {
      paletteList.querySelectorAll<HTMLButtonElement>('[data-color-palette-option]').forEach((button) => {
        const value = button.dataset.value;
        setButtonActive(button, value === color);
      });
    };

    const setInputsForColor = (color: string): void => {
      if (color === 'transparent') {
        hexInput.value = '';
        hexInput.disabled = true;
      } else {
        hexInput.disabled = false;
        const normalized = this.normalizeColorValue(color);
        hexInput.value = normalized;
      }
      setFieldError(hexInput, false);
      highlightSelection(color);
      updatePreview(color);
    };

    const renderPalette = (): void => {
      paletteList.innerHTML = '';
      palette.forEach((color) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'h-6 w-6 rounded-full border border-neutral-200 shadow-sm';
        button.setAttribute('data-color-palette-option', 'true');
        button.dataset.value = color;
        button.setAttribute('aria-label', color === 'transparent' ? 'Transparent' : color);
        button.title = color === 'transparent' ? 'Transparent' : color;
        if (color === 'transparent') {
          button.classList.add('bg-transparent', 'border', 'border-dashed', 'border-neutral-300');
        } else {
          button.style.background = color;
        }
        if (color === workingColor) {
          setButtonActive(button, true);
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
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);

      const host = this.colorLayer;
      if (host && host.contains(popover)) {
        // no-op for Tailwind: rely on hidden state
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
        host.appendChild(popover);
      }

      popover.hidden = false;
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
          setFieldError(hexInput, true);
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
        setFieldError(hexInput, true);
        hexInput.focus();
        return;
      }
      setFieldError(hexInput, false);
      if (!palette.includes(normalized)) {
        palette = [...palette, normalized];
        this.storeColorPalette(toolId, option.id, palette);
        workingColor = normalized;
        renderPalette();
        setInputsForColor(normalized);
      }
    });

    hexInput.addEventListener('input', () => {
      setFieldError(hexInput, false);
      const normalized = this.tryNormalizeHex(hexInput.value);
      if (normalized) {
        workingColor = normalized;
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
    button.className = '';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    applyEngineButtonBase(button);
    
    let contentSet = false;

    // Add specific styling classes and text content for text formatting toggles
    if (option.id === 'bold') {
      button.classList.add('font-semibold');
      button.textContent = 'B';
      contentSet = true;
    } else if (option.id === 'italic') {
      button.classList.add('italic');
      button.textContent = 'I';
      contentSet = true;
    } else if (option.id === 'underline') {
      button.classList.add('underline');
      button.textContent = 'U';
      contentSet = true;
    }

    if (!contentSet && option.icon) {
      const img = document.createElement('img');
      img.src = option.icon;
      img.alt = option.label;
      img.className = 'h-6 w-6';
      button.appendChild(img);
      button.classList.add('p-2');
      contentSet = true;
    }

    if (!contentSet) {
      button.textContent = typeof option.label === 'string' ? option.label : '';
      contentSet = true;
    }
    
    let active = Boolean(this.getInitialValue(toolId, option) ?? option.settings.value ?? false);
    if (active) {
      setButtonActive(button, true);
    }

    button.addEventListener('click', () => {
      active = !active;
      setButtonActive(button, active);
      this.updateToolSetting(toolId, option.id, active);
    });

    this.updateToolSetting(toolId, option.id, active, false);
    return button;
  }

  private createToggleGroupControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-2 text-sm text-neutral-700';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const group = document.createElement('div');
    group.className = 'flex flex-wrap gap-2';
    group.dataset.engineToggleGroup = '';
    wrapper.appendChild(group);

    let currentValue = (this.getInitialValue(toolId, option) ?? option.settings.value) as string;

    option.settings.options.forEach((entry: any) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = '';
      button.dataset.engineToggleGroupButton = '';
      button.title = entry.label;
      button.setAttribute('aria-label', entry.label);
      applyEngineButtonBase(button);
      
      // Add icon if provided, otherwise use text label
      if (entry.icon) {
        const img = document.createElement('img');
        img.src = entry.icon;
        img.alt = entry.label;
        img.className = 'h-6 w-6';
        button.appendChild(img);
      } else {
        // Use the full label text
        button.textContent = entry.label;
      }
      
      if (entry.value === currentValue) {
        setButtonActive(button, true);
      }
      button.addEventListener('click', () => {
        currentValue = entry.value;
        group.querySelectorAll<HTMLButtonElement>('[data-engine-toggle-group-button]').forEach((el) => setButtonActive(el, false));
        setButtonActive(button, true);
        this.updateToolSetting(toolId, option.id, currentValue);
      });
      group.appendChild(button);
    });

    this.updateToolSetting(toolId, option.id, currentValue, false);
    return wrapper;
  }

  private createNumberControl(toolId: string, option: any): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-2 text-sm text-neutral-700';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white';
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
    wrapper.className = 'flex flex-col gap-2 text-sm text-neutral-700';
    wrapper.title = option.label;
    wrapper.setAttribute('aria-label', option.label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white';
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
    button.className = '';
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    applyEngineButtonBase(button);
    
    if (option.icon) {
      const img = document.createElement('img');
      img.src = option.icon;
      img.alt = option.label;
      img.className = 'h-6 w-6';
      button.appendChild(img);
    } else {
      button.textContent = '';
    }
    
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

  private selectTool(tool: string): void {
    this.state.currentTool = tool;
    this.saveState();
    this.dispatchToolChange(tool);
    
    // Remove active class from all tool buttons
    const toolButtons = this.toolsContainer?.querySelectorAll<HTMLButtonElement>('[data-tool]');
    toolButtons?.forEach(btn => setButtonActive(btn, false));
    
    // Add active class to selected tool button
    const selectedButton = this.toolsContainer?.querySelector<HTMLButtonElement>(`[data-tool="${tool}"]`);
    if (selectedButton) {
      setButtonActive(selectedButton, true);
    }
    
    // Show tool options
    this.showToolOptions(tool);
    
    console.log(`Tool selected: ${tool}`);
  }

  private showToolOptions(tool: string): void {
    // Hide all tool options
    const allOptions = document.querySelectorAll<HTMLElement>('[data-engine-tool-options]');
    allOptions.forEach(option => {
      option.style.display = '';
      setElementHidden(option, true);
    });
    
    // Show options for current tool
    const currentOptions = document.querySelector<HTMLElement>(`[data-engine-tool-options="${tool}"]`);
    if (currentOptions) {
      setElementHidden(currentOptions, false);
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
