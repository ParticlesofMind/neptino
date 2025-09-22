/**
 * Canvas Margin Manager
 * Bridges PageSetupHandler margins to canvas system
 * Provides synchronous access to user-specified margins in pixels
 */

import { PageLayoutSettings } from '../../backend/courses/settings/pageSetupHandler';
import { MarginSettings } from '../types/canvas';
import { Graphics } from 'pixi.js';
import { canvasDimensionManager } from '../utils/CanvasDimensionManager';
import { UnitConverter } from '../utils/UnitConverter';

export class CanvasMarginManager {
  private static instance: CanvasMarginManager;
  private currentMargins: MarginSettings;
  private marginGraphics: Graphics | null = null;
  private container: any = null; // Will be set when canvas is available
  
  private constructor() {
    // Default margins in pixels (96 DPI, 2.54cm = 1 inch)
    this.currentMargins = {
      top: 96,    // ~2.54cm at 96 DPI
      right: 96,  // ~2.54cm at 96 DPI  
      bottom: 96, // ~2.54cm at 96 DPI
      left: 96,   // ~2.54cm at 96 DPI
      unit: 'px'
    };
  }

  public static getInstance(): CanvasMarginManager {
    if (!CanvasMarginManager.instance) {
      CanvasMarginManager.instance = new CanvasMarginManager();
    }
    return CanvasMarginManager.instance;
  }

  /**
   * Set margins from PageSetupHandler settings
   * Convert units to pixels synchronously
   */
  public setMarginsFromPageLayout(settings: PageLayoutSettings): void {
    const { margins } = settings;

    // Use UnitConverter for consistent unit conversion
    const pixelMargins = UnitConverter.marginsToPixels({
      top: margins.top,
      right: margins.right,
      bottom: margins.bottom,
      left: margins.left,
      unit: margins.unit as any // PageSetupHandler uses different unit type
    });

    this.currentMargins = pixelMargins;
    
    // Update visual margins if canvas is available
    this.updateMarginVisuals();
  }

  /**
   * Get current margins in pixels (synchronous)
   */
  public getMargins(): MarginSettings {
    return { ...this.currentMargins };
  }

  /**
   * Set the canvas container for visual margin rendering
   */
  public setContainer(container: any): void {
    this.container = container;
    this.updateMarginVisuals();
  }

   /**
   * Update visual margin indicators (clean blue lines)
   */
  private updateMarginVisuals(): void {
    if (!this.container) {
      return;
    }

    // Remove existing margin graphics
    if (this.marginGraphics) {
      this.container.removeChild(this.marginGraphics);
    }

    // Create new margin graphics
    this.marginGraphics = new Graphics();
    
    // Use consistent canvas dimensions from CanvasDimensionManager
    const dimensions = canvasDimensionManager.getCurrentDimensions();
    let canvasWidth = dimensions.width;   // 1200
    let canvasHeight = dimensions.height; // 1800
    
    // Legacy: try to get from PIXI app but validate against expected dimensions
    try {
      const app = (window as any).canvasAPI?.getApp?.();
      if (app && ((app as any).screen || app.renderer?.screen)) {
        const screen = (app as any).screen || app.renderer.screen;
        // Only use screen dimensions if they match our expected ratio
        if (screen.width && screen.height) {
          canvasWidth = screen.width; 
          canvasHeight = screen.height;
        }
      }
    } catch {}
    const margins = this.currentMargins;
    
    // Professional blue lines for margins
    const marginColor = 0x0066FF; // Blue
    const lineWidth = 1;
    const alpha = 0.8; // Clear and visible

    // Align to device pixels for crisp 1px lines
    const half = 0.5;
    const maxX = Math.round(canvasWidth) - half;
    const maxY = Math.round(canvasHeight) - half;
    const yTop = Math.round(margins.top) + half;
    const yBottom = Math.round(canvasHeight - margins.bottom) + half;
    const xLeft = Math.round(margins.left) + half;
    const xRight = Math.round(canvasWidth - margins.right) + half;

    // Draw clean margin boundary lines using modern PIXI.js API
    this.marginGraphics
      // Top margin line
      .moveTo(half, yTop)
      .lineTo(maxX, yTop)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Right margin line  
      .moveTo(xRight, half)
      .lineTo(xRight, maxY)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Bottom margin line
      .moveTo(half, yBottom)
      .lineTo(maxX, yBottom)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Left margin line
      .moveTo(xLeft, half)
      .lineTo(xLeft, maxY)
      .stroke({ color: marginColor, width: lineWidth, alpha });

    this.marginGraphics.label = 'blue-margin-lines';
    
    // Add to container (should be background or guides layer)
    this.container.addChild(this.marginGraphics);
    
  }  /**
   * Hide margin visuals
   */
  public hideMargins(): void {
    if (this.marginGraphics) {
      this.marginGraphics.visible = false;
    }
  }

  /**
   * Show margin visuals
   */
  public showMargins(): void {
    if (this.marginGraphics) {
      this.marginGraphics.visible = true;
    }
  }

  /**
   * Destroy margin manager
   */
  public destroy(): void {
    if (this.marginGraphics && this.container) {
      this.container.removeChild(this.marginGraphics);
    }
    this.marginGraphics = null;
    this.container = null;
  }
}

// Export singleton instance for global access
export const canvasMarginManager = CanvasMarginManager.getInstance();
