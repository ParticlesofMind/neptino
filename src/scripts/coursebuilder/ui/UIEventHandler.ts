/**
 * UI Event Handler
 * Manages DOM events and user interactions for the coursebuilder interface
 * Single Responsibility: Event handling and UI interactions only
 */

import { ToolStateManager } from './ToolStateManager.js';

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

    // Update UI
    document.querySelectorAll('.color-palette__color').forEach(color => {
      color.classList.remove('color-palette__color--active');
    });
    colorSquare.classList.add('color-palette__color--active');

    // Update tool settings
    const currentTool = this.toolStateManager.getCurrentTool();
    if (currentTool === 'pen') {
      this.toolStateManager.updateToolSettings('pen', { color: colorValue });
    } else if (currentTool === 'text') {
      this.toolStateManager.updateToolSettings('text', { color: colorValue });
    }

    // Trigger callback
    if (this.onColorChangeCallback) {
      this.onColorChangeCallback(colorValue);
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

    // Set tool to shapes and pass shape type
    this.toolStateManager.setTool('shapes');
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
