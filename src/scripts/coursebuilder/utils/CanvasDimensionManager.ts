/**
 * Canvas Dimension Manager
 * Single source of truth for canvas dimensions
 * Prevents inconsistent sizing across the application
 */

import { CanvasDimensions } from '../types/canvas';

export class CanvasDimensionManager {
  private static instance: CanvasDimensionManager;
  
  // Fixed canvas dimensions - A4 portrait (1200x1800)
  private readonly DEFAULT_WIDTH = 1200;
  private readonly DEFAULT_HEIGHT = 1800;
  
  // Current dimensions (may differ from defaults if manually set)
  private currentDimensions: CanvasDimensions;
  
  private constructor() {
    this.currentDimensions = {
      width: this.DEFAULT_WIDTH,
      height: this.DEFAULT_HEIGHT
    };
  }

  public static getInstance(): CanvasDimensionManager {
    if (!CanvasDimensionManager.instance) {
      CanvasDimensionManager.instance = new CanvasDimensionManager();
    }
    return CanvasDimensionManager.instance;
  }

  /**
   * Get current canvas dimensions
   * Tries PIXI app first, falls back to stored dimensions
   */
  public getCurrentDimensions(): CanvasDimensions {
    try {
      // Try to get from PIXI application if available
      const app = (window as any).canvasAPI?.getApp?.();
      if (app?.screen && app.screen.width && app.screen.height) {
        // Validate that screen dimensions are reasonable
        const screenWidth = app.screen.width;
        const screenHeight = app.screen.height;
        
        // Only use if dimensions seem valid (not 0 or NaN)
        if (screenWidth > 0 && screenHeight > 0 && 
            Number.isFinite(screenWidth) && Number.isFinite(screenHeight)) {
          return { width: screenWidth, height: screenHeight };
        }
      }
    } catch (error) {
      console.warn('📐 Could not get dimensions from PIXI app:', error);
    }
    
    // Fallback to stored dimensions
    return { ...this.currentDimensions };
  }

  /**
   * Set canvas dimensions (for manual override)
   */
  public setDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      console.error('📐 Invalid canvas dimensions:', { width, height });
      return;
    }
    
    this.currentDimensions = { width, height };
    
    // Notify any listeners that dimensions changed
    this.notifyDimensionChange();
  }

  /**
   * Get default canvas dimensions (1200x1800)
   */
  public getDefaultDimensions(): CanvasDimensions {
    return {
      width: this.DEFAULT_WIDTH,
      height: this.DEFAULT_HEIGHT
    };
  }

  /**
   * Reset to default dimensions
   */
  public resetToDefaults(): void {
    this.setDimensions(this.DEFAULT_WIDTH, this.DEFAULT_HEIGHT);
  }

  /**
   * Get canvas aspect ratio
   */
  public getAspectRatio(): number {
    const dims = this.getCurrentDimensions();
    return dims.width / dims.height;
  }

  /**
   * Check if current dimensions match defaults
   */
  public isUsingDefaults(): boolean {
    const current = this.getCurrentDimensions();
    return current.width === this.DEFAULT_WIDTH && current.height === this.DEFAULT_HEIGHT;
  }

  /**
   * Validate current dimensions
   */
  public validateDimensions(): { isValid: boolean; issues: string[] } {
    const dims = this.getCurrentDimensions();
    const issues: string[] = [];
    
    if (!Number.isFinite(dims.width) || dims.width <= 0) {
      issues.push(`Invalid width: ${dims.width}`);
    }
    
    if (!Number.isFinite(dims.height) || dims.height <= 0) {
      issues.push(`Invalid height: ${dims.height}`);
    }
    
    const aspectRatio = dims.width / dims.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      issues.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get dimensions as CSS string
   */
  public getDimensionsCSS(): string {
    const dims = this.getCurrentDimensions();
    return `${dims.width}px × ${dims.height}px`;
  }

  /**
   * Notify that dimensions changed (for future event system)
   */
  private notifyDimensionChange(): void {
    try {
      // Dispatch custom event for dimension changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('canvas:dimensionsChanged', {
          detail: this.getCurrentDimensions()
        }));
      }
    } catch (error) {
      console.warn('📐 Could not dispatch dimension change event:', error);
    }
  }

  /**
   * Get debugging information
   */
  public getDebugInfo(): any {
    const current = this.getCurrentDimensions();
    const defaults = this.getDefaultDimensions();
    const validation = this.validateDimensions();
    
    return {
      current,
      defaults,
      isUsingDefaults: this.isUsingDefaults(),
      aspectRatio: this.getAspectRatio(),
      validation,
      pixiApp: {
        available: !!(window as any).canvasAPI?.getApp,
        hasScreen: !!(window as any).canvasAPI?.getApp?.()?.screen
      }
    };
  }
}

// Export singleton instance
export const canvasDimensionManager = CanvasDimensionManager.getInstance();

// Export constants for backward compatibility
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 1800;