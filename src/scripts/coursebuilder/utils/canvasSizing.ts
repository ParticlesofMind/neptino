/**
 * Canvas sizing utility with fixed dimensions
 * Provides consistent 1200x1800 canvas size throughout the application
 * 
 * DEPRECATED: Use CanvasDimensionManager instead for new code
 * This file is maintained for backward compatibility only
 */

import { canvasDimensionManager } from './CanvasDimensionManager';

export interface CanvasDimensions {
  width: number;
  height: number;
}

// Workspace dimensions for infinite canvas (10x larger than artboard)
export const CANVAS_WIDTH = 12000;
export const CANVAS_HEIGHT = 18000;

// Artboard dimensions for final output (A4 portrait)
export const ARTBOARD_WIDTH = 1200;
export const ARTBOARD_HEIGHT = 1800;

/**
 * Get consistent canvas dimensions
 * @deprecated Use canvasDimensionManager.getCurrentDimensions() instead
 */
export function getCanvasDimensions(): CanvasDimensions {
  console.warn('getCanvasDimensions() is deprecated. Use canvasDimensionManager.getCurrentDimensions() instead');
  return canvasDimensionManager.getCurrentDimensions();
}

/**
 * Calculate optimal zoom level to fit canvas in container
 */
export function calculateFitZoom(
  containerWidth: number,
  containerHeight: number,
  padding: number = 20 // reduced padding for better space utilization
): number {
  // Input validation
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    console.warn('Invalid containerWidth:', containerWidth, 'falling back to default zoom');
    return 0.5; // Fallback zoom level
  }
  
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    console.warn('Invalid containerHeight:', containerHeight, 'falling back to default zoom');
    return 0.5; // Fallback zoom level
  }
  
  if (!Number.isFinite(padding) || padding < 0) {
    console.warn('Invalid padding:', padding, 'using 20px default');
    padding = 20;
  }
  
  // Ensure padding doesn't exceed container dimensions
  const maxPadding = Math.min(containerWidth * 0.4, containerHeight * 0.4);
  padding = Math.min(padding, maxPadding);
  
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);
  
  // Additional safety check
  if (availableWidth <= 0 || availableHeight <= 0) {
    console.warn('Container too small after padding. Container:', containerWidth, 'x', containerHeight, 'Padding:', padding);
    return 0.2; // Minimum zoom
  }
  
  // For infinite canvas, calculate scale based on artboard dimensions (not full workspace)
  // This ensures the artboard fits nicely in the viewport
  const artboardScaleX = availableWidth / ARTBOARD_WIDTH;
  const artboardScaleY = availableHeight / ARTBOARD_HEIGHT;
  const optimalScale = Math.min(artboardScaleX, artboardScaleY);
  
  // Clamp between 20% and 100% for usability
  const clampedScale = Math.max(0.2, Math.min(1.0, optimalScale));
  
  // Log the calculation for debugging
  
  return clampedScale;
}