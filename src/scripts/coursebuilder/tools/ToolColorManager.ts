/**
 * ToolColorManager - Manages ColorSelector instances for coursebuilder tools
 * Initializes and manages color pickers for pen, brush, text, and shapes tools
 */

import { ColorSelector, ColorOption } from './ColorSelector.js';

export class ToolColorManager {
  private colorSelectors: Map<string, ColorSelector> = new Map();
  private initialized: boolean = false;

  constructor() {
    // No need to inject styles - using button system
  }

  /**
   * Initialize color selectors for all tools
   */
  public init(): void {
    if (this.initialized) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeColorSelectors());
    } else {
      this.initializeColorSelectors();
    }

    this.initialized = true;
  }

  private initializeColorSelectors(): void {
    const colorContainers = document.querySelectorAll('[data-color-selector]');

    colorContainers.forEach((container) => {
      const toolType = container.getAttribute('data-color-selector');
      if (!toolType) return;

      const htmlContainer = container as HTMLElement;
      const initialColor = this.getInitialColorForTool(toolType);

      const colorSelector = new ColorSelector(
        htmlContainer,
        initialColor,
        (color: ColorOption) => this.handleColorChange(toolType, color)
      );

      this.colorSelectors.set(toolType, colorSelector);
    });
  }

  private getInitialColorForTool(toolType: string): string {
    const initialColors: Record<string, string> = {
      'pen': '#1a1a1a',         // Black
      'pen-stroke': '#1a1a1a',  // Black
      'pen-fill': '#ffffff',    // White
      'brush': '#4a7c59',       // Forest Green
      'text': '#1a1a1a',        // Black
      'shapes': '#4a79a4',      // Ocean Blue
      'shapes-stroke': '#4a79a4', // Ocean Blue
      'shapes-fill': '#ffffff'   // White
    };

    return initialColors[toolType] || '#1a1a1a';
  }

  private handleColorChange(toolType: string, color: ColorOption): void {
    // Map compound tool types to base tool types and color properties
    const toolMapping: Record<string, { tool: string; property: string }> = {
      'pen-stroke': { tool: 'pen', property: 'strokeColor' },
      'pen-fill': { tool: 'pen', property: 'fillColor' },
      'shapes-stroke': { tool: 'shapes', property: 'strokeColor' },
      'shapes-fill': { tool: 'shapes', property: 'fillColor' },
      'text': { tool: 'text', property: 'color' },
      'brush': { tool: 'brush', property: 'color' }
    };

    const mapping = toolMapping[toolType];
    if (mapping) {
      // Dispatch custom event for specific tool color change
      const event = new CustomEvent('toolColorChange', {
        detail: {
          tool: mapping.tool,
          property: mapping.property,
          color: color,
          hex: color.hex
        }
      });

      document.dispatchEvent(event);

      // Also trigger for backward compatibility
      const legacyEvent = new CustomEvent(`${mapping.tool}ColorChange`, {
        detail: { 
          color: color.hex,
          property: mapping.property
        }
      });

      document.dispatchEvent(legacyEvent);

      console.log(`Color changed for ${toolType} (${mapping.tool}.${mapping.property}):`, color);
    } else {
      // Fallback for simple tool types
      const event = new CustomEvent('toolColorChange', {
        detail: {
          tool: toolType,
          color: color,
          hex: color.hex
        }
      });

      document.dispatchEvent(event);

      // Also trigger for backward compatibility
      const legacyEvent = new CustomEvent(`${toolType}ColorChange`, {
        detail: { color: color.hex }
      });

      document.dispatchEvent(legacyEvent);

      console.log(`Color changed for ${toolType} tool:`, color);
    }
  }

  /**
   * Get the current color for a specific tool
   */
  public getToolColor(toolType: string): ColorOption | null {
    const selector = this.colorSelectors.get(toolType);
    return selector ? selector.getCurrentColor() : null;
  }

  /**
   * Set the color for a specific tool
   */
  public setToolColor(toolType: string, hex: string): void {
    const selector = this.colorSelectors.get(toolType);
    if (selector) {
      selector.setColor(hex);
    } else {
      // Try to find a matching selector for compound types
      const compoundSelectors = Array.from(this.colorSelectors.keys()).filter(key => 
        key.startsWith(toolType + '-') || key === toolType
      );
      
      if (compoundSelectors.length > 0) {
        // Set the color for the first matching selector (usually the main one)
        const mainSelector = this.colorSelectors.get(compoundSelectors[0]);
        if (mainSelector) {
          mainSelector.setColor(hex);
        }
      }
    }
  }

  /**
   * Get all current tool colors
   */
  public getAllToolColors(): Record<string, ColorOption> {
    const colors: Record<string, ColorOption> = {};
    
    this.colorSelectors.forEach((selector, toolType) => {
      colors[toolType] = selector.getCurrentColor();
    });

    return colors;
  }

  /**
   * Destroy all color selectors
   */
  public destroy(): void {
    this.colorSelectors.forEach((selector) => {
      selector.destroy();
    });
    
    this.colorSelectors.clear();
    this.initialized = false;
  }
}

// Create global instance
export const toolColorManager = new ToolColorManager();
