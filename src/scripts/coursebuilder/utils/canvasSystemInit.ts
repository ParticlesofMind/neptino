/**
 * Canvas System Initialization
 * Sets up the consolidated canvas architecture
 */

import { canvasDimensionManager } from './CanvasDimensionManager';
import { canvasMarginManager } from '../canvas/CanvasMarginManager';
import { UnitConverter } from './UnitConverter';

/**
 * Initialize the consolidated canvas system
 * Call this early in canvas initialization
 */
export function initializeCanvasSystem(): void {

  // Ensure default dimensions are set
  canvasDimensionManager.resetToDefaults();
  
  // Add debug helpers to window for development
  if (typeof window !== 'undefined') {
    (window as any).canvasSystem = {
      dimensionManager: canvasDimensionManager,
      marginManager: canvasMarginManager,
      unitConverter: UnitConverter,
      
      // Debug helpers
      debugDimensions: () => canvasDimensionManager.getDebugInfo(),
      debugMargins: () => canvasMarginManager.getMargins(),
      
      // Quick actions
      resetDimensions: () => canvasDimensionManager.resetToDefaults(),
      setDimensions: (w: number, h: number) => canvasDimensionManager.setDimensions(w, h),
      
      // Validation
      validateSystem: () => {
        const dimValidation = canvasDimensionManager.validateDimensions();
        return dimValidation;
      }
    };
    
  }
  
  // Listen for dimension changes
  if (typeof window !== 'undefined') {
    window.addEventListener('canvas:dimensionsChanged', (event: any) => {
      void event;
    });
  }
  
}

/**
 * Validate the entire canvas system
 */
export function validateCanvasSystem(): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Validate dimensions
  const dimValidation = canvasDimensionManager.validateDimensions();
  if (!dimValidation.isValid) {
    issues.push(...dimValidation.issues);
  }
  
  // Check for consistent 1200x1800 usage
  const currentDims = canvasDimensionManager.getCurrentDimensions();
  if (currentDims.width !== 1200 || currentDims.height !== 1800) {
    issues.push(`Non-standard dimensions: ${currentDims.width}x${currentDims.height} (expected 1200x1800)`);
    recommendations.push('Call canvasDimensionManager.resetToDefaults() to restore standard size');
  }
  
  // Check margins
  const margins = canvasMarginManager.getMargins();
  if (!margins.top || !margins.right || !margins.bottom || !margins.left) {
    issues.push('Invalid margin values detected');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}
