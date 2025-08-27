/**
 * Anchor Point Management for Professional Scaling
 * Handles the "pinned corner" behavior where objects scale from a fixed reference point
 */

import { Point, Rectangle } from "pixi.js";

export interface AnchorPoint {
  x: number;
  y: number;
  type: 'corner' | 'edge' | 'center';
  position: string; // 'tl', 'tr', 'bl', 'br', 't', 'r', 'b', 'l', 'center'
}

export class AnchorPointManager {
  /**
   * Get the professional anchor point based on the handle being dragged
   * In professional software, objects are "pinned" at specific corners when scaling
   */
  public static getAnchorPoint(
    handlePosition: string, 
    bounds: Rectangle
  ): AnchorPoint {
    switch (handlePosition) {
      // Corner handles - anchor at opposite corner
      case "tl": // Top-left handle -> anchor at bottom-right
        return {
          x: bounds.x + bounds.width,
          y: bounds.y + bounds.height,
          type: 'corner',
          position: 'br'
        };
      
      case "tr": // Top-right handle -> anchor at bottom-left
        return {
          x: bounds.x,
          y: bounds.y + bounds.height,
          type: 'corner',
          position: 'bl'
        };
      
      case "bl": // Bottom-left handle -> anchor at top-right
        return {
          x: bounds.x + bounds.width,
          y: bounds.y,
          type: 'corner',
          position: 'tr'
        };
      
      case "br": // Bottom-right handle -> anchor at top-left
        return {
          x: bounds.x,
          y: bounds.y,
          type: 'corner',
          position: 'tl'
        };
      
      // Edge handles - anchor at opposite edge center
      case "t": // Top edge -> anchor at bottom edge center
        return {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height,
          type: 'edge',
          position: 'b'
        };
      
      case "r": // Right edge -> anchor at left edge center
        return {
          x: bounds.x,
          y: bounds.y + bounds.height / 2,
          type: 'edge',
          position: 'l'
        };
      
      case "b": // Bottom edge -> anchor at top edge center
        return {
          x: bounds.x + bounds.width / 2,
          y: bounds.y,
          type: 'edge',
          position: 't'
        };
      
      case "l": // Left edge -> anchor at right edge center
        return {
          x: bounds.x + bounds.width,
          y: bounds.y + bounds.height / 2,
          type: 'edge',
          position: 'r'
        };
      
      // Default to center for unknown handles
      default:
        return {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          type: 'center',
          position: 'center'
        };
    }
  }

  /**
   * Calculate new bounds based on anchor point and mouse position
   */
  public static calculateNewBounds(
    originalBounds: Rectangle,
    anchorPoint: AnchorPoint,
    mousePosition: Point,
    handlePosition: string
  ): Rectangle {
    const anchor = anchorPoint;
    let newBounds = new Rectangle();

    if (anchorPoint.type === 'corner') {
      // Corner scaling - both width and height can change
      newBounds.x = Math.min(anchor.x, mousePosition.x);
      newBounds.y = Math.min(anchor.y, mousePosition.y);
      newBounds.width = Math.abs(mousePosition.x - anchor.x);
      newBounds.height = Math.abs(mousePosition.y - anchor.y);
    } else if (anchorPoint.type === 'edge') {
      // Edge scaling - only one dimension changes
      switch (handlePosition) {
        case "t":
        case "b":
          // Vertical scaling - height changes, width stays same
          newBounds.x = originalBounds.x;
          newBounds.width = originalBounds.width;
          newBounds.y = Math.min(anchor.y, mousePosition.y);
          newBounds.height = Math.abs(mousePosition.y - anchor.y);
          break;
        
        case "l":
        case "r":
          // Horizontal scaling - width changes, height stays same
          newBounds.y = originalBounds.y;
          newBounds.height = originalBounds.height;
          newBounds.x = Math.min(anchor.x, mousePosition.x);
          newBounds.width = Math.abs(mousePosition.x - anchor.x);
          break;
      }
    }

    return newBounds;
  }

  /**
   * Apply minimum size constraints to new bounds
   */
  public static applyMinimumConstraints(
    newBounds: Rectangle,
    minWidth: number = 10,
    minHeight: number = 10
  ): Rectangle {
    return new Rectangle(
      newBounds.x,
      newBounds.y,
      Math.max(newBounds.width, minWidth),
      Math.max(newBounds.height, minHeight)
    );
  }

  /**
   * Calculate scale factors from old and new bounds
   */
  public static calculateScaleFactors(
    oldBounds: Rectangle,
    newBounds: Rectangle
  ): { scaleX: number; scaleY: number } {
    return {
      scaleX: oldBounds.width > 0 ? newBounds.width / oldBounds.width : 1,
      scaleY: oldBounds.height > 0 ? newBounds.height / oldBounds.height : 1
    };
  }
}
