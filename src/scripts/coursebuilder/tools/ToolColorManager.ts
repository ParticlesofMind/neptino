/**
 * ToolColorManager - Manages native color input elements for coursebuilder tools
 * Initializes and manages color pickers for pen, brush, text, and shapes tools
 */

export interface ColorOption {
  name: string;
  value: string;
  hex: string;
}

export class ToolColorManager {
  private colorSelects: Map<string, HTMLSelectElement> = new Map();
  private initialized: boolean = false;

  constructor() {
    // No need to inject styles - using native inputs
  }

  /**
   * Initialize color selects for all tools
   */
  public init(): void {
    if (this.initialized) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeColorSelects());
    } else {
      this.initializeColorSelects();
    }

    this.initialized = true;
  }

  private initializeColorSelects(): void {
    const colorSelects = document.querySelectorAll('select[data-color-selector]');

    colorSelects.forEach((select) => {
      const htmlSelect = select as HTMLSelectElement;
      const toolType = htmlSelect.getAttribute('data-color-selector');
      if (!toolType) return;

      // Set initial color (should already be set by HTML selected attribute)
      // Add event listener for color changes
      htmlSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const selectedOption = target.selectedOptions[0];
        const color: ColorOption = {
          name: selectedOption.textContent || target.value,
          value: target.value,
          hex: target.value
        };
        this.handleColorChange(toolType, color);
      });

      this.colorSelects.set(toolType, htmlSelect);
    });
  }

  /*
  private getInitialColorForTool(toolType: string): string {
    const initialColors: Record<string, string> = {
      'pen': '#282a29',
      'pen-stroke': '#282a29',
      'pen-fill': '#fef6eb',
      'brush': '#2b8059',
      'text': '#282a29',
      'shapes': '#3c748d',
      'shapes-stroke': '#3c748d',
      'shapes-fill': '#fef6eb'
    };

    return initialColors[toolType] || '#282a29';
  }
  */

  private handleColorChange(toolType: string, color: ColorOption): void {
    // Map compound tool types to base tool types and color properties
    const toolMapping: Record<string, { tool: string; property: string }> = {
      'pen-stroke': { tool: 'pen', property: 'strokeColor' },
      'pen-fill': { tool: 'pen', property: 'fillColor' },
      'shapes-stroke': { tool: 'shapes', property: 'color' }, // Fixed: shapes stroke uses 'color' property
      'shapes-fill': { tool: 'shapes', property: 'fillColor' },
      'text': { tool: 'text', property: 'color' },
      'brush': { tool: 'brush', property: 'color' },
      // Tables: support separate selectors if UI adds them
      'tables-border': { tool: 'tables', property: 'borderColor' },
      'tables-background': { tool: 'tables', property: 'backgroundColor' },
      'tables-font': { tool: 'tables', property: 'fontColor' }
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

    }
  }

  /**
   * Get the current color for a specific tool
   */
  public getToolColor(toolType: string): ColorOption | null {
    const select = this.colorSelects.get(toolType);
    if (select) {
      const selectedOption = select.selectedOptions[0];
      return {
        name: selectedOption.textContent || select.value,
        value: select.value,
        hex: select.value
      };
    }
    return null;
  }

  /**
   * Set the color for a specific tool
   */
  public setToolColor(toolType: string, hex: string): void {
    const select = this.colorSelects.get(toolType);
    if (select) {
      select.value = hex;
      // Trigger change event to update the tool
      select.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Try to find a matching select for compound types
      const compoundSelects = Array.from(this.colorSelects.keys()).filter(key => 
        key.startsWith(toolType + '-') || key === toolType
      );
      
      if (compoundSelects.length > 0) {
        // Set the color for the first matching select (usually the main one)
        const mainSelect = this.colorSelects.get(compoundSelects[0]);
        if (mainSelect) {
          mainSelect.value = hex;
          mainSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }

  /**
   * Get all current tool colors
   */
  public getAllToolColors(): Record<string, ColorOption> {
    const colors: Record<string, ColorOption> = {};
    
    this.colorSelects.forEach((select, toolType) => {
      const selectedOption = select.selectedOptions[0];
      colors[toolType] = {
        name: selectedOption.textContent || select.value,
        value: select.value,
        hex: select.value
      };
    });

    return colors;
  }

  /**
   * Destroy all color selects (remove event listeners)
   */
  public destroy(): void {
    this.colorSelects.forEach((_select) => {
      // Remove event listeners (they'll be garbage collected with the selects)
    });
    
    this.colorSelects.clear();
    this.initialized = false;
  }
}

// Create global instance
export const toolColorManager = new ToolColorManager();
