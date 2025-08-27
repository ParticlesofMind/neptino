/**
 * Scale Calculator
 * Handles mathematical calculations for scaling objects with anchored positioning
 */

import { Rectangle, Point } from "pixi.js";
import { ScaleConstraints } from "./ScaleConstraintManager";

export type HandlePosition = "tl" | "tr" | "bl" | "br" | "t" | "r" | "b" | "l";

export interface ScaleCalculationInput {
  originalBounds: Rectangle;
  mousePosition: Point;
  startMousePosition: Point;
  handlePosition: HandlePosition;
  anchorPoint: Point;
  constraints: ScaleConstraints;
}

export interface ScaleCalculationResult {
  newBounds: Rectangle;
  scaleFactorX: number;
  scaleFactorY: number;
  isValidScale: boolean;
}

export class ScaleCalculator {
  
  /**
   * Calculate new bounds based on handle type and mouse movement
   */
  public static calculateNewBounds(input: ScaleCalculationInput): ScaleCalculationResult {
    const {
      originalBounds,
      mousePosition,
      startMousePosition,
      handlePosition,
      anchorPoint,
      constraints
    } = input;

    // Calculate mouse delta
    const deltaX = mousePosition.x - startMousePosition.x;
    const deltaY = mousePosition.y - startMousePosition.y;

    // Calculate scale based on handle type
    if (this.isCornerHandle(handlePosition)) {
      return this.calculateCornerScale(
        originalBounds,
        deltaX,
        deltaY,
        handlePosition,
        anchorPoint,
        constraints
      );
    } else {
      return this.calculateEdgeScale(
        originalBounds,
        deltaX,
        deltaY,
        handlePosition,
        anchorPoint,
        constraints
      );
    }
  }

  /**
   * Calculate scaling for corner handles
   */
  private static calculateCornerScale(
    originalBounds: Rectangle,
    deltaX: number,
    deltaY: number,
    handle: HandlePosition,
    anchorPoint: Point,
    constraints: ScaleConstraints
  ): ScaleCalculationResult {
    let newBounds = new Rectangle(
      originalBounds.x,
      originalBounds.y,
      originalBounds.width,
      originalBounds.height
    );

    // Determine scale direction based on handle
    const scaleDirections = this.getCornerScaleDirections(handle);
    
    // Calculate new dimensions
    let newWidth = originalBounds.width + (deltaX * scaleDirections.x);
    let newHeight = originalBounds.height + (deltaY * scaleDirections.y);

    // Maintain aspect ratio if required
    if (constraints.maintainAspectRatio) {
      const aspectRatio = originalBounds.width / originalBounds.height;
      
      // Use the dimension that changed the most
      const widthChange = Math.abs(deltaX * scaleDirections.x);
      const heightChange = Math.abs(deltaY * scaleDirections.y);
      
      if (widthChange > heightChange) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }

    // Calculate scale factors
    const scaleFactorX = newWidth / originalBounds.width;
    const scaleFactorY = newHeight / originalBounds.height;

    // Calculate new position based on anchor point
    newBounds.width = newWidth;
    newBounds.height = newHeight;
    newBounds.x = anchorPoint.x - (anchorPoint.x - originalBounds.x) * scaleFactorX;
    newBounds.y = anchorPoint.y - (anchorPoint.y - originalBounds.y) * scaleFactorY;

    return {
      newBounds,
      scaleFactorX,
      scaleFactorY,
      isValidScale: this.isValidScaleResult(newBounds, constraints)
    };
  }

  /**
   * Calculate scaling for edge handles
   */
  private static calculateEdgeScale(
    originalBounds: Rectangle,
    deltaX: number,
    deltaY: number,
    handle: HandlePosition,
    anchorPoint: Point,
    constraints: ScaleConstraints
  ): ScaleCalculationResult {
    let newBounds = new Rectangle(
      originalBounds.x,
      originalBounds.y,
      originalBounds.width,
      originalBounds.height
    );

    let scaleFactorX = 1;
    let scaleFactorY = 1;

    // Apply scaling based on edge handle
    switch (handle) {
      case 't': // Top edge
        newBounds.height = originalBounds.height - deltaY;
        newBounds.y = anchorPoint.y - (anchorPoint.y - originalBounds.y) * (newBounds.height / originalBounds.height);
        scaleFactorY = newBounds.height / originalBounds.height;
        break;

      case 'b': // Bottom edge
        newBounds.height = originalBounds.height + deltaY;
        newBounds.y = anchorPoint.y - (anchorPoint.y - originalBounds.y) * (newBounds.height / originalBounds.height);
        scaleFactorY = newBounds.height / originalBounds.height;
        break;

      case 'l': // Left edge
        newBounds.width = originalBounds.width - deltaX;
        newBounds.x = anchorPoint.x - (anchorPoint.x - originalBounds.x) * (newBounds.width / originalBounds.width);
        scaleFactorX = newBounds.width / originalBounds.width;
        break;

      case 'r': // Right edge
        newBounds.width = originalBounds.width + deltaX;
        newBounds.x = anchorPoint.x - (anchorPoint.x - originalBounds.x) * (newBounds.width / originalBounds.width);
        scaleFactorX = newBounds.width / originalBounds.width;
        break;
    }

    return {
      newBounds,
      scaleFactorX,
      scaleFactorY,
      isValidScale: this.isValidScaleResult(newBounds, constraints)
    };
  }

  /**
   * Get scale directions for corner handles
   */
  private static getCornerScaleDirections(handle: HandlePosition): { x: number; y: number } {
    switch (handle) {
      case 'tl': return { x: -1, y: -1 }; // Top-left: grow left and up
      case 'tr': return { x: 1, y: -1 };  // Top-right: grow right and up
      case 'bl': return { x: -1, y: 1 };  // Bottom-left: grow left and down
      case 'br': return { x: 1, y: 1 };   // Bottom-right: grow right and down
      default: return { x: 0, y: 0 };
    }
  }

  /**
   * Check if handle is a corner handle
   */
  private static isCornerHandle(handle: HandlePosition): boolean {
    return (['tl', 'tr', 'bl', 'br'] as HandlePosition[]).includes(handle);
  }

  /**
   * Check if scale result is valid
   */
  private static isValidScaleResult(
    newBounds: Rectangle,
    constraints: ScaleConstraints
  ): boolean {
    // Check minimum size constraints
    if (newBounds.width < constraints.minWidth || newBounds.height < constraints.minHeight) {
      return false;
    }

    // Check maximum size constraints
    if (newBounds.width > constraints.maxWidth || newBounds.height > constraints.maxHeight) {
      return false;
    }

    // Check for negative dimensions (flipping)
    if (newBounds.width <= 0 || newBounds.height <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculate the scale ratio from mouse movement
   */
  public static calculateScaleRatioFromMovement(
    startMousePosition: Point,
    currentMousePosition: Point,
    originalSize: { width: number; height: number },
    handle: HandlePosition
  ): { scaleX: number; scaleY: number } {
    const deltaX = currentMousePosition.x - startMousePosition.x;
    const deltaY = currentMousePosition.y - startMousePosition.y;

    let scaleX = 1;
    let scaleY = 1;

    if (this.isCornerHandle(handle)) {
      // Corner handles affect both dimensions
      const directions = this.getCornerScaleDirections(handle);
      scaleX = 1 + (deltaX * directions.x) / originalSize.width;
      scaleY = 1 + (deltaY * directions.y) / originalSize.height;
    } else {
      // Edge handles affect single dimension
      switch (handle) {
        case 't':
        case 'b':
          scaleY = 1 + Math.abs(deltaY) / originalSize.height;
          break;
        case 'l':
        case 'r':
          scaleX = 1 + Math.abs(deltaX) / originalSize.width;
          break;
      }
    }

    return { scaleX, scaleY };
  }

  /**
   * Apply uniform scaling (for maintaining aspect ratio)
   */
  public static applyUniformScale(
    bounds: Rectangle,
    anchorPoint: Point,
    uniformScale: number
  ): Rectangle {
    const newWidth = bounds.width * uniformScale;
    const newHeight = bounds.height * uniformScale;

    const newX = anchorPoint.x - (anchorPoint.x - bounds.x) * uniformScale;
    const newY = anchorPoint.y - (anchorPoint.y - bounds.y) * uniformScale;

    return new Rectangle(newX, newY, newWidth, newHeight);
  }
}
