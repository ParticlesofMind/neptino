/**
 * ViewportAdapter - Adapt canvas rendering to different viewport sizes
 * 
 * Responsibilities:
 * - Handle viewport scaling and positioning
 * - Manage canvas scaling for different screen sizes
 * - Coordinate with display objects for responsive behavior
 * - Handle zoom and pan for mobile devices
 * 
 * Target: ~200 lines
 */

import { Application } from 'pixi.js';
import { ResponsiveSettings, ResponsiveDimensions } from './ResponsiveTypes';
import { ViewportUtils } from './ViewportUtils';

export class ViewportAdapter {
  private app: Application | null = null;
  private settings: ResponsiveSettings;
  private originalDimensions: ResponsiveDimensions | null = null;
  private currentScale: number = 1;

  constructor(settings: ResponsiveSettings) {
    this.settings = { ...settings };
  }

  /**
   * Initialize viewport adapter
   */
  public initialize(app: Application): void {
    this.app = app;

    // Store original canvas dimensions
    this.originalDimensions = {
      width: app.renderer.width,
      height: app.renderer.height,
      aspectRatio: app.renderer.width / app.renderer.height
    };

    console.log('🖥️ ViewportAdapter initialized with original dimensions:', this.originalDimensions);
  }

  /**
   * Update viewport when canvas is resized
   */
  public updateViewport(newDimensions: ResponsiveDimensions): void {
    if (!this.app || !this.originalDimensions) return;

    console.log('🖥️ Updating viewport for new dimensions:', newDimensions);

    // Calculate scale factor
    this.calculateScale(newDimensions);

    // Apply responsive adjustments
    this.applyResponsiveAdjustments(newDimensions);

    console.log('📏 Viewport updated - scale:', this.currentScale);
  }

  /**
   * Calculate appropriate scale factor for new dimensions
   */
  private calculateScale(newDimensions: ResponsiveDimensions): void {
    if (!this.originalDimensions) return;

    if (this.settings.maintainAspectRatio) {
      // Calculate scale to fit within new dimensions while maintaining aspect ratio
      const scaleX = newDimensions.width / this.originalDimensions.width;
      const scaleY = newDimensions.height / this.originalDimensions.height;
      
      this.currentScale = Math.min(scaleX, scaleY);
    } else {
      // Use average scale if not maintaining aspect ratio
      const scaleX = newDimensions.width / this.originalDimensions.width;
      const scaleY = newDimensions.height / this.originalDimensions.height;
      
      this.currentScale = (scaleX + scaleY) / 2;
    }

    // Apply scale constraints
    this.currentScale = Math.max(0.1, Math.min(5.0, this.currentScale));
  }

  /**
   * Apply responsive adjustments to canvas and stage
   */
  private applyResponsiveAdjustments(newDimensions: ResponsiveDimensions): void {
    if (!this.app) return;

    const viewport = ViewportUtils.getViewportInfo();

    // Handle mobile-specific adjustments
    if (viewport.isMobile) {
      this.applyMobileAdjustments(newDimensions);
    }
    // Handle tablet-specific adjustments
    else if (viewport.isTablet) {
      this.applyTabletAdjustments(newDimensions);
    }
    // Handle desktop adjustments
    else {
      this.applyDesktopAdjustments(newDimensions);
    }
  }

  /**
   * Apply mobile-specific viewport adjustments
   */
  private applyMobileAdjustments(dimensions: ResponsiveDimensions): void {
    if (!this.app) return;

    console.log('📱 Applying mobile viewport adjustments');

    // Mobile devices might need different scaling
    // Consider touch interaction areas, screen density, etc.
    const mobileScale = this.currentScale * 0.9; // Slightly smaller for mobile
    
    // You can add mobile-specific transformations here
    // For example, ensuring minimum touch target sizes
  }

  /**
   * Apply tablet-specific viewport adjustments
   */
  private applyTabletAdjustments(dimensions: ResponsiveDimensions): void {
    if (!this.app) return;

    console.log('📱 Applying tablet viewport adjustments');
    
    // Tablet adjustments - balance between mobile and desktop
  }

  /**
   * Apply desktop-specific viewport adjustments
   */
  private applyDesktopAdjustments(dimensions: ResponsiveDimensions): void {
    if (!this.app) return;

    console.log('🖥️ Applying desktop viewport adjustments');
    
    // Desktop can handle full resolution and precision
  }

  /**
   * Get current scale factor
   */
  public getCurrentScale(): number {
    return this.currentScale;
  }

  /**
   * Get original dimensions
   */
  public getOriginalDimensions(): ResponsiveDimensions | null {
    return this.originalDimensions;
  }

  /**
   * Update settings
   */
  public updateSettings(settings: ResponsiveSettings): void {
    this.settings = { ...settings };
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  public screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    if (!this.app) return { x: screenX, y: screenY };

    // Account for canvas positioning and scaling
    const rect = this.app.canvas.getBoundingClientRect();
    
    const canvasX = (screenX - rect.left) / this.currentScale;
    const canvasY = (screenY - rect.top) / this.currentScale;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  public canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    if (!this.app) return { x: canvasX, y: canvasY };

    const rect = this.app.canvas.getBoundingClientRect();
    
    const screenX = canvasX * this.currentScale + rect.left;
    const screenY = canvasY * this.currentScale + rect.top;

    return { x: screenX, y: screenY };
  }

  /**
   * Check if point is within canvas bounds
   */
  public isPointInCanvas(screenX: number, screenY: number): boolean {
    if (!this.app) return false;

    const rect = this.app.canvas.getBoundingClientRect();
    
    return (
      screenX >= rect.left &&
      screenX <= rect.right &&
      screenY >= rect.top &&
      screenY <= rect.bottom
    );
  }

  /**
   * Get visible canvas area (accounting for scaling and positioning)
   */
  public getVisibleArea(): { x: number; y: number; width: number; height: number } {
    if (!this.app) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: 0,
      y: 0,
      width: this.app.renderer.width,
      height: this.app.renderer.height
    };
  }

  /**
   * Reset viewport to original state
   */
  public reset(): void {
    if (!this.app || !this.originalDimensions) return;

    console.log('🔄 Resetting viewport to original state');
    
    this.currentScale = 1;
    
    // Reset any transformations applied to stage
    if (this.app.stage) {
      this.app.stage.scale.set(1, 1);
      this.app.stage.position.set(0, 0);
    }
  }

  /**
   * Destroy viewport adapter
   */
  public destroy(): void {
    console.log('🧹 Cleaning up ViewportAdapter...');

    this.app = null;
    this.originalDimensions = null;
    this.currentScale = 1;

    console.log('✅ ViewportAdapter cleaned up');
  }
}
