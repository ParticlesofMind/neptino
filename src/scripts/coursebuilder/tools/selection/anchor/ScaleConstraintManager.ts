/**
 * Scale Constraints System
 * Handles minimum/maximum size limits and boundary enforcement
 */

import { Rectangle } from "pixi.js";
import { BoundaryUtils } from "../../BoundaryUtils";

export interface ScaleConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  maintainAspectRatio: boolean;
  respectCanvasBounds: boolean;
}

export class ScaleConstraintManager {
  private static readonly DEFAULT_MIN_SIZE = 10;

  /**
   * Create default scale constraints
   */
  public static createDefaultConstraints(): ScaleConstraints {
    return {
      minWidth: this.DEFAULT_MIN_SIZE,
      minHeight: this.DEFAULT_MIN_SIZE,
      maxWidth: Infinity,
      maxHeight: Infinity,
      maintainAspectRatio: false,
      respectCanvasBounds: true
    };
  }

  /**
   * Apply all constraints to new bounds
   */
  public static applyConstraints(
    originalBounds: Rectangle,
    newBounds: Rectangle,
    constraints: ScaleConstraints,
    anchorX: number,
    anchorY: number
  ): Rectangle {
    let constrainedBounds = new Rectangle(
      newBounds.x,
      newBounds.y,
      newBounds.width,
      newBounds.height
    );

    // Apply minimum size constraints
    constrainedBounds = this.applyMinimumSize(
      constrainedBounds, 
      constraints, 
      anchorX, 
      anchorY
    );

    // Apply maximum size constraints
    constrainedBounds = this.applyMaximumSize(
      constrainedBounds, 
      constraints, 
      anchorX, 
      anchorY
    );

    // Apply aspect ratio constraints if needed
    if (constraints.maintainAspectRatio) {
      constrainedBounds = this.applyAspectRatio(
        originalBounds,
        constrainedBounds,
        anchorX,
        anchorY
      );
    }

    // Apply canvas boundary constraints
    if (constraints.respectCanvasBounds) {
      constrainedBounds = this.applyCanvasBounds(
        constrainedBounds,
        anchorX,
        anchorY
      );
    }

    return constrainedBounds;
  }

  /**
   * Apply minimum size constraints while respecting anchor point
   */
  private static applyMinimumSize(
    bounds: Rectangle,
    constraints: ScaleConstraints,
    anchorX: number,
    anchorY: number
  ): Rectangle {
    let { x, y, width, height } = bounds;

    // Enforce minimum width
    if (width < constraints.minWidth) {
      const widthDiff = constraints.minWidth - width;
      width = constraints.minWidth;
      
      // Adjust x position based on anchor point
      if (anchorX > x + width / 2) {
        x -= widthDiff; // Anchor is on the right, grow left
      }
      // If anchor is on the left or center, x stays the same
    }

    // Enforce minimum height
    if (height < constraints.minHeight) {
      const heightDiff = constraints.minHeight - height;
      height = constraints.minHeight;
      
      // Adjust y position based on anchor point
      if (anchorY > y + height / 2) {
        y -= heightDiff; // Anchor is on the bottom, grow up
      }
      // If anchor is on the top or center, y stays the same
    }

    return new Rectangle(x, y, width, height);
  }

  /**
   * Apply maximum size constraints while respecting anchor point
   */
  private static applyMaximumSize(
    bounds: Rectangle,
    constraints: ScaleConstraints,
    anchorX: number,
    anchorY: number
  ): Rectangle {
    let { x, y, width, height } = bounds;

    // Enforce maximum width
    if (width > constraints.maxWidth) {
      const widthDiff = width - constraints.maxWidth;
      width = constraints.maxWidth;
      
      // Adjust x position based on anchor point
      if (anchorX < x + width / 2) {
        x += widthDiff; // Anchor is on the left, shrink from right
      }
      // If anchor is on the right or center, x stays the same
    }

    // Enforce maximum height
    if (height > constraints.maxHeight) {
      const heightDiff = height - constraints.maxHeight;
      height = constraints.maxHeight;
      
      // Adjust y position based on anchor point
      if (anchorY < y + height / 2) {
        y += heightDiff; // Anchor is on the top, shrink from bottom
      }
      // If anchor is on the bottom or center, y stays the same
    }

    return new Rectangle(x, y, width, height);
  }

  /**
   * Apply aspect ratio constraints
   */
  private static applyAspectRatio(
    originalBounds: Rectangle,
    newBounds: Rectangle,
    anchorX: number,
    anchorY: number
  ): Rectangle {
    const originalRatio = originalBounds.width / originalBounds.height;
    let { x, y, width, height } = newBounds;

    // Calculate what the height should be based on width
    const constrainedHeight = width / originalRatio;
    
    // Use the smaller scale factor to maintain ratio
    if (constrainedHeight > height) {
      // Width is the limiting factor, adjust width
      width = height * originalRatio;
    } else {
      // Height is the limiting factor, adjust height
      height = constrainedHeight;
    }

    // Adjust position based on anchor point to maintain anchor position
    const currentCenterX = x + newBounds.width / 2;
    const currentCenterY = y + newBounds.height / 2;
    
    // Calculate new position based on anchor
    if (anchorX < currentCenterX) {
      // Anchor on left side
      x = anchorX;
    } else if (anchorX > currentCenterX) {
      // Anchor on right side
      x = anchorX - width;
    } else {
      // Anchor in center
      x = anchorX - width / 2;
    }

    if (anchorY < currentCenterY) {
      // Anchor on top
      y = anchorY;
    } else if (anchorY > currentCenterY) {
      // Anchor on bottom
      y = anchorY - height;
    } else {
      // Anchor in center
      y = anchorY - height / 2;
    }

    return new Rectangle(x, y, width, height);
  }

  /**
   * Apply canvas boundary constraints
   */
  private static applyCanvasBounds(
    bounds: Rectangle,
    anchorX: number,
    anchorY: number
  ): Rectangle {
    const canvasBounds = BoundaryUtils.getCanvasBoundsWithGlobalMargins();
    let { x, y, width, height } = bounds;

    // Constrain to canvas bounds while respecting anchor point
    const maxWidth = canvasBounds.right - canvasBounds.left;
    const maxHeight = canvasBounds.bottom - canvasBounds.top;

    // If object is too wide for canvas
    if (width > maxWidth) {
      width = maxWidth;
      x = canvasBounds.left;
    } else {
      // Keep within horizontal bounds
      if (x < canvasBounds.left) {
        x = canvasBounds.left;
      } else if (x + width > canvasBounds.right) {
        x = canvasBounds.right - width;
      }
    }

    // If object is too tall for canvas
    if (height > maxHeight) {
      height = maxHeight;
      y = canvasBounds.top;
    } else {
      // Keep within vertical bounds
      if (y < canvasBounds.top) {
        y = canvasBounds.top;
      } else if (y + height > canvasBounds.bottom) {
        y = canvasBounds.bottom - height;
      }
    }

    return new Rectangle(x, y, width, height);
  }

    /**
   * Check if shift key constraint should maintain aspect ratio
   */
  public static shouldMaintainAspectRatio(
    isShiftPressed: boolean,
    handleType: 'corner' | 'edge'
  ): boolean {
    // Only corner handles can maintain aspect ratio when shift is pressed
    return isShiftPressed && handleType === 'corner';
  }
}
