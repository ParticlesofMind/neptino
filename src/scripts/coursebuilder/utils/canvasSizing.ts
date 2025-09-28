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

// Canvas dimensions for large testing canvas (maintains 2:3 ratio)
export const CANVAS_WIDTH = 4000;
export const CANVAS_HEIGHT = 6000;

// Artboard dimensions for final output (student view area)
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
    return 1.0; // Default 100% zoom level (1:1 pixel ratio)
  }
  
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    console.warn('Invalid containerHeight:', containerHeight, 'falling back to default zoom');
    return 1.0; // Default 100% zoom level (1:1 pixel ratio)
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
    return 0.25; // Minimum zoom (25%)
  }
  
  // Calculate scale based on artboard dimensions
  // This ensures the artboard fits nicely in the viewport
  const artboardScaleX = availableWidth / ARTBOARD_WIDTH;
  const artboardScaleY = availableHeight / ARTBOARD_HEIGHT;
  const optimalScale = Math.min(artboardScaleX, artboardScaleY);
  
  // Clamp between 25% and 100% (1.0) for usability
  // If optimal scale would be higher than 1.0, return 1.0 (100% zoom)
  const clampedScale = Math.max(0.25, Math.min(1.0, optimalScale));
  
  // Log the calculation for debugging
  
  return clampedScale;
}