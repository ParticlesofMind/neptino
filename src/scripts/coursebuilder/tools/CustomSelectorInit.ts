/**
 * Initialize custom selectors to replace Select2 dropdowns
 */

import { CustomColorSelector } from './CustomColorSelector';
import { CustomShapeSelector } from './CustomShapeSelector';

export function initializeCustomSelectors(): void {
  initializeCustomColorSelectors();
  initializeCustomShapeSelectors();
}

function initializeCustomColorSelectors(): void {
  // Find all color selector containers
  const colorSelectors = document.querySelectorAll('.color-selector[data-color-selector]');
  
  colorSelectors.forEach((container) => {
    const element = container as HTMLElement;
    const selectorType = element.dataset.colorSelector;
    const initialColor = element.dataset.initialColor || '#1a1a1a';
    const allowTransparent = element.dataset.allowTransparent === 'true';
    
    if (!selectorType) return;

    // Create the custom color selector
    const colorSelector = new CustomColorSelector(
      element,
      initialColor,
      (color) => {
        // Handle color change - integrate with existing uiEventHandler
        if ((window as any).uiEventHandler && (window as any).uiEventHandler.handleColorChange) {
          (window as any).uiEventHandler.handleColorChange(selectorType, color.value);
        }
        
        // Also update tool state manager directly
        if ((window as any).toolStateManager) {
          const toolName = getToolNameFromSelector(selectorType);
          const settingName = getSettingNameFromSelector(selectorType);
          
          if (toolName && settingName) {
            (window as any).toolStateManager.updateToolSettings(toolName, {
              [settingName]: color.value
            });
          }
        }
      },
      allowTransparent
    );

    // Store reference for later access
    (element as any)._colorSelector = colorSelector;
  });
}

function initializeCustomShapeSelectors(): void {
  // Find all shape selector containers
  const shapeSelectors = document.querySelectorAll('.shape-selector[data-shape-selector]');
  
  shapeSelectors.forEach((container) => {
    const element = container as HTMLElement;
    const selectorType = element.dataset.shapeSelector;
    const initialShape = element.dataset.initialShape || 'rectangle';
    
    if (!selectorType) return;

    // Create the custom shape selector
    const shapeSelector = new CustomShapeSelector(
      element,
      initialShape,
      (shape) => {
        // Handle shape change - integrate with existing uiEventHandler
        if ((window as any).uiEventHandler && (window as any).uiEventHandler.handleShapeSelection) {
          (window as any).uiEventHandler.handleShapeSelection(shape.value);
        }
        
        // Also update tool state manager directly
        if ((window as any).toolStateManager) {
          (window as any).toolStateManager.updateToolSettings('shapes', {
            shapeType: shape.value
          });
        }
      }
    );

    // Store reference for later access
    (element as any)._shapeSelector = shapeSelector;
  });
}

function getToolNameFromSelector(selectorType: string): string | null {
  if (selectorType.startsWith('pen-')) return 'pen';
  if (selectorType.startsWith('brush')) return 'brush';
  if (selectorType.startsWith('text')) return 'text';
  if (selectorType.startsWith('shapes-')) return 'shapes';
  return null;
}

function getSettingNameFromSelector(selectorType: string): string | null {
  if (selectorType.includes('stroke')) return 'strokeColor';
  if (selectorType.includes('fill')) return 'fillColor';
  if (selectorType === 'text') return 'color';
  if (selectorType === 'brush') return 'color';
  return null;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCustomSelectors);
} else {
  initializeCustomSelectors();
}