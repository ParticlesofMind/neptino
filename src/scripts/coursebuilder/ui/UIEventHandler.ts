/**
 * UI Event Handler
 * Manages DOM events and user interactions for the coursebuilder interface
 * Single Responsibility: Event handling and UI interactions only
 */

import { ToolStateManager } from './ToolStateManager';

export class UIEventHandler {
  private toolStateManager: ToolStateManager;
  private onToolChangeCallback: ((toolName: string) => void) | null = null;
  private onColorChangeCallback: ((color: string) => void) | null = null;

  constructor(toolStateManager: ToolStateManager) {
    this.toolStateManager = toolStateManager;
    this.bindEvents();
  }

  /**
   * Set callback for tool changes
   */
  setOnToolChange(callback: (toolName: string) => void): void {
    this.onToolChangeCallback = callback;
  }

  /**
   * Set callback for color changes
   */
  setOnColorChange(callback: (color: string) => void): void {
    this.onColorChangeCallback = callback;
  }

  /**
   * Bind all UI events
   */
  private bindEvents(): void {
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    
    // Tool selection events
    document.querySelectorAll('[data-tool]').forEach(button => {
      button.addEventListener('click', this.handleToolSelection.bind(this));
    });

    // Color palette events
    document.querySelectorAll('.color-palette__color').forEach(color => {
      color.addEventListener('click', this.handleColorSelection.bind(this));
    });

    // Shape tool events
    document.querySelectorAll('.shape-btn').forEach(button => {
      button.addEventListener('click', this.handleShapeSelection.bind(this));
    });

    // Slider events for tool settings
    document.querySelectorAll('input[type="range"][data-setting]').forEach(slider => {
      slider.addEventListener('input', this.handleSliderChange.bind(this));
    });

    // Select dropdown events for font settings
    document.querySelectorAll('select[data-setting]').forEach(select => {
      select.addEventListener('change', this.handleSelectChange.bind(this));
    });

    // Canvas actions
    this.bindCanvasActions();
  }

  /**
   * Handle global click events
   */
  private handleGlobalClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Handle color selection
    if (target.classList.contains('color-palette__color')) {
      this.handleColorSelection(event);
      return;
    }

    // Handle shape selection
    if (target.classList.contains('shape-btn') || target.closest('.shape-btn')) {
      this.handleShapeSelection(event);
      return;
    }
  }

  /**
   * Handle tool selection
   */
  private handleToolSelection(event: Event): void {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    const toolName = button.dataset.tool;
    
    if (!toolName) return;

    this.toolStateManager.setTool(toolName);
    this.toolStateManager.updateCanvasCursor();

    // Trigger callback
    if (this.onToolChangeCallback) {
      this.onToolChangeCallback(toolName);
    }
  }

  /**
   * Handle color selection
   */
  private handleColorSelection(event: Event): void {
    event.preventDefault();
    const colorSquare = event.currentTarget as HTMLElement;
    const colorValue = colorSquare.dataset.color;
    
    if (!colorValue) return;

    // Update UI - find the parent color palette and update active state
    const parentPalette = colorSquare.closest('.color-palette');
    if (parentPalette) {
      parentPalette.querySelectorAll('.color-palette__color').forEach(color => {
        color.classList.remove('color-palette__color--active');
      });
      colorSquare.classList.add('color-palette__color--active');
    }

    // Update tool settings based on currently active tool
    const currentTool = this.toolStateManager.getCurrentTool();
    if (currentTool === 'pen') {
      this.toolStateManager.updateToolSettings('pen', { color: colorValue });
    } else if (currentTool === 'text') {
      this.toolStateManager.updateToolSettings('text', { color: colorValue });
    } else if (currentTool === 'highlighter') {
      this.toolStateManager.updateToolSettings('highlighter', { color: colorValue });
    } else if (currentTool === 'shapes') {
      this.toolStateManager.updateToolSettings('shapes', { color: colorValue });
    }

    // Trigger callback
    if (this.onColorChangeCallback) {
      this.onColorChangeCallback(colorValue);
    }
  }

  /**
   * Handle slider changes for tool settings
   */
  private handleSliderChange(event: Event): void {
    const slider = event.currentTarget as HTMLInputElement;
    const setting = slider.dataset.setting;
    const value = slider.value;
    
    if (!setting) return;

    // Update the displayed value
    const valueDisplay = slider.parentElement?.querySelector('.size-slider__value');
    if (valueDisplay) {
      if (setting === 'opacity') {
        const percentage = Math.round(parseFloat(value) * 100);
        valueDisplay.textContent = `${percentage}%`;
      } else {
        valueDisplay.textContent = `${value}px`;
      }
    }

    // Update tool settings based on currently active tool
    const currentTool = this.toolStateManager.getCurrentTool();
    const numericValue = setting === 'opacity' ? parseFloat(value) : parseInt(value);
    
    if (currentTool === 'pen' && (setting === 'size')) {
      this.toolStateManager.updateToolSettings('pen', { [setting]: numericValue });
    } else if (currentTool === 'text' && (setting === 'fontSize')) {
      this.toolStateManager.updateToolSettings('text', { [setting]: numericValue });
    } else if (currentTool === 'highlighter' && (setting === 'size' || setting === 'opacity')) {
      this.toolStateManager.updateToolSettings('highlighter', { [setting]: numericValue });
    } else if (currentTool === 'shapes' && (setting === 'strokeWidth')) {
      this.toolStateManager.updateToolSettings('shapes', { [setting]: numericValue });
    } else if (currentTool === 'eraser' && (setting === 'size')) {
      this.toolStateManager.updateToolSettings('eraser', { [setting]: numericValue });
    }
  }

  /**
   * Handle select changes for tool settings
   */
  private handleSelectChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const setting = select.dataset.setting;
    const value = select.value;
    
    if (!setting) return;

    // Update tool settings based on currently active tool
    const currentTool = this.toolStateManager.getCurrentTool();
    
    if (currentTool === 'text' && setting === 'fontFamily') {
      this.toolStateManager.updateToolSettings('text', { [setting]: value });
    }
  }

  /**
   * Handle shape selection
   */
  private handleShapeSelection(event: Event): void {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    const shapeType = button.dataset.shape;
    
    if (!shapeType) return;

    // Update UI - set active state for shape buttons
    const parentShapeButtons = button.closest('.shape-buttons');
    if (parentShapeButtons) {
      parentShapeButtons.querySelectorAll('.shape-btn').forEach(btn => {
        btn.classList.remove('shape-btn--active');
      });
      button.classList.add('shape-btn--active');
    }

    // Set tool to shapes and update shape type
    this.toolStateManager.setTool('shapes');
    this.toolStateManager.updateToolSettings('shapes', { shapeType: shapeType as 'rectangle' | 'triangle' | 'circle' });
    this.toolStateManager.updateCanvasCursor();

    console.log(`🔷 Shape selected: ${shapeType}`);

    // Trigger tool change callback
    if (this.onToolChangeCallback) {
      this.onToolChangeCallback('shapes');
    }
  }

  /**
   * Bind canvas action events
   */
  private bindCanvasActions(): void {
    // Clear canvas button
    const clearBtn = document.getElementById('clear-canvas');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const event = new CustomEvent('clearCanvas');
        document.dispatchEvent(event);
      });
    }

    // Clear all button
    const clearAllBtn = document.getElementById('clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        const event = new CustomEvent('clearAll');
        document.dispatchEvent(event);
      });
    }

    // Add page button
    const addPageBtn = document.getElementById('add-page');
    if (addPageBtn) {
      addPageBtn.addEventListener('click', () => {
        const event = new CustomEvent('addPage');
        document.dispatchEvent(event);
      });
    }

    // Layout toggle button
    const layoutToggleBtn = document.getElementById('toggle-layout');
    if (layoutToggleBtn) {
      layoutToggleBtn.addEventListener('click', () => {
        const event = new CustomEvent('toggleLayout');
        document.dispatchEvent(event);
      });
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('click', this.handleGlobalClick);
    // Additional cleanup as needed
  }
}
