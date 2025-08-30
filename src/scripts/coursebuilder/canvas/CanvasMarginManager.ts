/**
 * Canvas Margin Manager
 * Bridges PageSetupHandler margins to canvas system
 * Provides synchronous access to user-specified margins in pixels
 */

import { PageLayoutSettings } from '../../backend/courses/settings/pageSetupHandler';
import { MarginSettings } from '../tools/BoundaryUtils';
import { Graphics } from 'pixi.js';

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
      left: 96    // ~2.54cm at 96 DPI
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
    const dpi = 96; // Standard DPI for web

    // Convert all units to pixels
    let pixelMargins: MarginSettings;

    switch (margins.unit) {
      case 'inches':
        pixelMargins = {
          top: margins.top * dpi,
          right: margins.right * dpi,
          bottom: margins.bottom * dpi,
          left: margins.left * dpi
        };
        break;
      case 'cm':
        // 1 inch = 2.54 cm, so cm to pixels = (cm / 2.54) * dpi
        pixelMargins = {
          top: (margins.top / 2.54) * dpi,
          right: (margins.right / 2.54) * dpi,
          bottom: (margins.bottom / 2.54) * dpi,
          left: (margins.left / 2.54) * dpi
        };
        break;
      case 'mm':
        // 1 inch = 25.4 mm, so mm to pixels = (mm / 25.4) * dpi
        pixelMargins = {
          top: (margins.top / 25.4) * dpi,
          right: (margins.right / 25.4) * dpi,
          bottom: (margins.bottom / 25.4) * dpi,
          left: (margins.left / 25.4) * dpi
        };
        break;
      default:
        return;
    }

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

    const canvasWidth = 794;  // A4 width
    const canvasHeight = 1123; // A4 height
    const margins = this.currentMargins;

    // Professional blue lines for margins
    const marginColor = 0x0066FF; // Blue
    const lineWidth = 1;
    const alpha = 0.8; // Clear and visible

    // Draw clean margin boundary lines using modern PIXI.js API
    this.marginGraphics
      // Top margin line
      .moveTo(0, margins.top)
      .lineTo(canvasWidth, margins.top)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Right margin line  
      .moveTo(canvasWidth - margins.right, 0)
      .lineTo(canvasWidth - margins.right, canvasHeight)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Bottom margin line
      .moveTo(0, canvasHeight - margins.bottom)
      .lineTo(canvasWidth, canvasHeight - margins.bottom)
      .stroke({ color: marginColor, width: lineWidth, alpha })
      
      // Left margin line
      .moveTo(margins.left, 0)
      .lineTo(margins.left, canvasHeight)
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
