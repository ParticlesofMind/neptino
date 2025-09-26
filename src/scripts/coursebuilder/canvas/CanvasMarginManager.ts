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
    const canvasWidth = dimensions.width;   // 1200
    const canvasHeight = dimensions.height; // 1800
    
    // Use canvas coordinates directly (pasteboard system removed)
    const offsetX = 0;
    const offsetY = 0;
    const margins = this.currentMargins;
    
    // Professional blue lines for margins
    const marginColor = 0x0066FF; // Blue
    const lineWidth = 1;
    const alpha = 0.8; // Clear and visible

    // Align to device pixels for crisp 1px lines (offset to canvas position)
    const half = 0.5;
    const maxX = Math.round(offsetX + canvasWidth) - half;
    const maxY = Math.round(offsetY + canvasHeight) - half;
    const yTop = Math.round(offsetY + margins.top) + half;
    const yBottom = Math.round(offsetY + canvasHeight - margins.bottom) + half;
    const xLeft = Math.round(offsetX + margins.left) + half;
    const xRight = Math.round(offsetX + canvasWidth - margins.right) + half;

    // Draw canvas border (outer rectangle, offset to correct position)
    this.marginGraphics
      .rect(offsetX + half, offsetY + half, canvasWidth - 1, canvasHeight - 1)
      .stroke({ color: marginColor, width: 2, alpha: 0.9 });

    // Draw margin boundary lines using modern PIXI.js API (offset to correct position)
    this.marginGraphics
      // Top margin line
      .moveTo(offsetX + half, yTop)
      .lineTo(maxX, yTop)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Right margin line  
      .moveTo(xRight, offsetY + half)
      .lineTo(xRight, maxY)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Bottom margin line
      .moveTo(offsetX + half, yBottom)
      .lineTo(maxX, yBottom)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Left margin line
      .moveTo(xLeft, offsetY + half)
      .lineTo(xLeft, maxY)
      .stroke({ color: marginColor, width: lineWidth, alpha });

    this.marginGraphics.label = 'canvas-border-and-margin-lines';
    
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
