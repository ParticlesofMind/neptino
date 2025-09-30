/**
 * Distance label calculation and management
 */

import { Rectangle } from 'pixi.js';
import { DistanceLabel } from './types';
import { GUIDE_LIMITS } from './config';

export class DistanceCalculator {
  
  /**
   * Generate distance labels between target and nearby objects
   */
  public generateDistanceLabels(
    targetBounds: Rectangle, 
    nearbyObjects: Rectangle[]
  ): DistanceLabel[] {
    const distances: DistanceLabel[] = [];
    
    for (const obj of nearbyObjects) {
      // Calculate horizontal distance
      const hDistance = this.calculateDistance(targetBounds, obj, 'horizontal');
      if (hDistance > 0) {
        distances.push({
          x: (targetBounds.x + targetBounds.width / 2 + obj.x + obj.width / 2) / 2,
          y: Math.max(targetBounds.y, obj.y) - 10,
          distance: hDistance,
          fromRect: targetBounds,
          toRect: obj,
          direction: 'horizontal'
        });
      }
      
      // Calculate vertical distance
      const vDistance = this.calculateDistance(targetBounds, obj, 'vertical');
      if (vDistance > 0) {
        distances.push({
          x: Math.max(targetBounds.x, obj.x) - 30,
          y: (targetBounds.y + targetBounds.height / 2 + obj.y + obj.height / 2) / 2,
          distance: vDistance,
          fromRect: targetBounds,
          toRect: obj,
          direction: 'vertical'
        });
      }
    }
    
    return distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, GUIDE_LIMITS.MAX_DISTANCE_LABELS);
  }

  /**
   * Calculate distance between two rectangles
   */
  public calculateDistance(
    rect1: Rectangle, 
    rect2: Rectangle, 
    direction: 'horizontal' | 'vertical'
  ): number {
    if (direction === 'horizontal') {
      // Check if rects overlap vertically
      if (rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y) {
        return 0;
      }
      
      if (rect1.x + rect1.width < rect2.x) {
        return rect2.x - (rect1.x + rect1.width);
      } else if (rect2.x + rect2.width < rect1.x) {
        return rect1.x - (rect2.x + rect2.width);
      }
      return 0; // Overlapping
    } else {
      // Check if rects overlap horizontally
      if (rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x) {
        return 0;
      }
      
      if (rect1.y + rect1.height < rect2.y) {
        return rect2.y - (rect1.y + rect1.height);
      } else if (rect2.y + rect2.height < rect1.y) {
        return rect1.y - (rect2.y + rect2.height);
      }
      return 0; // Overlapping
    }
  }

  /**
   * Format distance value for display
   */
  public formatDistance(distance: number, units: 'px' | '%' | 'pt' = 'px'): string {
    switch (units) {
      case '%':
        return `${Math.round(distance * 100 / 1000)}%`;
      case 'pt':
        return `${Math.round(distance * 0.75)}pt`;
      default:
        return `${Math.round(distance)}px`;
    }
  }
}