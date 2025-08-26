/**
 * Boundary Utilities
 * Canvas boundary management and constraint utilities for A4-sized canvas
 */

import { Point, Rectangle, Container } from "pixi.js";
import { canvasMarginManager } from '../canvas/CanvasMarginManager';

export interface CanvasBounds {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MarginSettings {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export class BoundaryUtils {
  // A4 Canvas dimensions (fixed)
  public static readonly CANVAS_WIDTH = 794;
  public static readonly CANVAS_HEIGHT = 1123;

  /**
   * Get canvas bounds from container with user-specified margins
   */
  public static getCanvasBounds(container?: Container, margins?: MarginSettings): CanvasBounds {
    if (!margins) {
      throw new Error('Margins are required - please provide user-specified margins from PageSetupHandler');
    }
    const appliedMargins = margins;
    
    // If container is provided, try to get bounds from it
    let canvasWidth = BoundaryUtils.CANVAS_WIDTH;
    let canvasHeight = BoundaryUtils.CANVAS_HEIGHT;
    
    if (container && container.parent) {
      // Try to get actual canvas dimensions from the container's parent (the stage)
      const stage = container.parent;
      if (stage && (stage as any).screen) {
        canvasWidth = (stage as any).screen.width || BoundaryUtils.CANVAS_WIDTH;
        canvasHeight = (stage as any).screen.height || BoundaryUtils.CANVAS_HEIGHT;
      }
    }

    return {
      width: canvasWidth,
      height: canvasHeight,
      left: appliedMargins.left,
      top: appliedMargins.top,
      right: canvasWidth - appliedMargins.right,
      bottom: canvasHeight - appliedMargins.bottom
    };
  }

  /**
   * Get canvas bounds using global margin manager (for backward compatibility)
   */
  public static getCanvasBoundsWithGlobalMargins(container?: Container): CanvasBounds {
    const margins = canvasMarginManager.getMargins();
    return BoundaryUtils.getCanvasBounds(container, margins);
  }

  /**
   * Clamp a point to stay within canvas bounds
   */
  public static clampPoint(point: Point, bounds: CanvasBounds): Point {
    const clampedX = Math.max(bounds.left, Math.min(bounds.right, point.x));
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom, point.y));
    return new Point(clampedX, clampedY);
  }

  /**
   * Clamp a point to stay within canvas bounds (with object dimensions)
   */
  public static clampPointWithSize(
    point: Point, 
    objectWidth: number, 
    objectHeight: number, 
    bounds: CanvasBounds
  ): Point {
    const clampedX = Math.max(bounds.left, Math.min(bounds.right - objectWidth, point.x));
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom - objectHeight, point.y));
    return new Point(clampedX, clampedY);
  }

  /**
   * Check if a point is within canvas bounds
   */
  public static isPointWithinBounds(point: Point, bounds: CanvasBounds): boolean {
    return point.x >= bounds.left && 
           point.x <= bounds.right &&
           point.y >= bounds.top && 
           point.y <= bounds.bottom;
  }

  /**
   * Check if a rectangle is completely within canvas bounds
   */
  public static isRectangleWithinBounds(rect: Rectangle, bounds: CanvasBounds): boolean {
    return rect.x >= bounds.left &&
           rect.y >= bounds.top &&
           rect.x + rect.width <= bounds.right &&
           rect.y + rect.height <= bounds.bottom;
  }

  /**
   * Clamp a rectangle to fit within canvas bounds
   */
  public static clampRectangle(rect: Rectangle, bounds: CanvasBounds): Rectangle {
    // Clamp position
    let clampedX = Math.max(bounds.left, Math.min(bounds.right - rect.width, rect.x));
    let clampedY = Math.max(bounds.top, Math.min(bounds.bottom - rect.height, rect.y));
    
    // If the rectangle is larger than available space, reduce its size
    let clampedWidth = Math.min(rect.width, bounds.right - bounds.left);
    let clampedHeight = Math.min(rect.height, bounds.bottom - bounds.top);
    
    // Re-adjust position if size was reduced
    if (clampedWidth < rect.width) {
      clampedX = Math.max(bounds.left, Math.min(bounds.right - clampedWidth, clampedX));
    }
    if (clampedHeight < rect.height) {
      clampedY = Math.max(bounds.top, Math.min(bounds.bottom - clampedHeight, clampedY));
    }

    return new Rectangle(clampedX, clampedY, clampedWidth, clampedHeight);
  }

  /**
   * Get the constrained bounds for dragging operations
   */
  public static getConstrainedDragBounds(
    objectBounds: Rectangle, 
    canvasBounds: CanvasBounds
  ): Rectangle {
    // Calculate the area where the object's top-left corner can be placed
    const constrainedLeft = canvasBounds.left;
    const constrainedTop = canvasBounds.top;
    const constrainedRight = canvasBounds.right - objectBounds.width;
    const constrainedBottom = canvasBounds.bottom - objectBounds.height;
    
    return new Rectangle(
      constrainedLeft,
      constrainedTop,
      Math.max(0, constrainedRight - constrainedLeft),
      Math.max(0, constrainedBottom - constrainedTop)
    );
  }

  /**
   * Calculate maximum allowed scale to keep object within bounds
   */
  public static getMaxAllowedScale(
    objectBounds: Rectangle,
    canvasBounds: CanvasBounds
  ): { scaleX: number; scaleY: number } {
    const availableWidth = canvasBounds.right - canvasBounds.left;
    const availableHeight = canvasBounds.bottom - canvasBounds.top;
    
    const maxScaleX = availableWidth / objectBounds.width;
    const maxScaleY = availableHeight / objectBounds.height;
    
    return {
      scaleX: Math.max(0.1, maxScaleX), // Minimum scale of 0.1
      scaleY: Math.max(0.1, maxScaleY)
    };
  }

  /**
   * Debug helper - log boundary information
   */
  public static logBoundaryInfo(label: string, point: Point, bounds: CanvasBounds): void {
    const isWithin = BoundaryUtils.isPointWithinBounds(point, bounds);
    console.log(
      `🎯 ${label}: Point(${Math.round(point.x)}, ${Math.round(point.y)}) - ${
        isWithin ? "✅ WITHIN" : "❌ OUTSIDE"
      } bounds [${bounds.left}-${bounds.right}, ${bounds.top}-${bounds.bottom}]`
    );
  }
}
