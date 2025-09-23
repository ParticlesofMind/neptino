/**
 * ObjectCuller - Efficient Viewport-based Object Culling
 * 
 * Performs fast bounds checking to determine which objects should be visible
 * based on the current viewport, with configurable padding and limits.
 * 
 * Features:
 * - Fast AABB (Axis-Aligned Bounding Box) intersection tests
 * - Configurable padding around viewport for smooth scrolling
 * - Maximum visible object limits to prevent performance degradation
 * - Distance-based priority for when object limit is exceeded
 */

import { Container, Rectangle, Bounds } from 'pixi.js';

export interface ObjectCullerConfig {
  padding?: number; // Extra padding around viewport
  maxVisible?: number; // Maximum objects to keep visible
  usePriority?: boolean; // Use distance-based priority
}

export interface CullResult {
  visible: string[];
  hidden: string[];
  totalChecked: number;
}

export class ObjectCuller {
  private readonly padding: number;
  private readonly maxVisible: number;
  private readonly usePriority: boolean;
  
  // Performance metrics
  private cullCount = 0;
  private lastCullTime = 0;
  
  constructor(config: ObjectCullerConfig = {}) {
    this.padding = config.padding || 100;
    this.maxVisible = config.maxVisible || 1000;
    this.usePriority = config.usePriority !== false;
  }
  
  /**
   * Cull objects based on viewport bounds
   */
  public cullObjects(
    objects: Map<string, Container>,
    viewportBounds: Rectangle
  ): CullResult {
    const startTime = performance.now();
    
    // Expand viewport bounds with padding
    const cullBounds = this.expandBounds(viewportBounds, this.padding);
    
    const visible: string[] = [];
    const hidden: string[] = [];
    const candidates: Array<{ id: string; distance: number }> = [];
    
    // First pass: Check visibility and calculate distances
    for (const [objectId, obj] of objects) {
      if (!obj || obj.destroyed) {
        hidden.push(objectId);
        continue;
      }
      
      const isVisible = this.isObjectVisible(obj, cullBounds);
      
      if (isVisible) {
        if (this.usePriority && visible.length + candidates.length >= this.maxVisible) {
          // Calculate distance from viewport center for priority
          const distance = this.calculateDistanceFromViewport(obj, viewportBounds);
          candidates.push({ id: objectId, distance });
        } else {
          visible.push(objectId);
        }
      } else {
        hidden.push(objectId);
      }
    }
    
    // Second pass: Apply priority sorting if needed
    if (candidates.length > 0) {
      const remainingSlots = this.maxVisible - visible.length;
      
      if (remainingSlots > 0) {
        // Sort by distance and take closest objects
        candidates.sort((a, b) => a.distance - b.distance);
        
        for (let i = 0; i < Math.min(remainingSlots, candidates.length); i++) {
          visible.push(candidates[i].id);
        }
        
        // Add remaining candidates to hidden list
        for (let i = remainingSlots; i < candidates.length; i++) {
          hidden.push(candidates[i].id);
        }
      } else {
        // No slots available, hide all candidates
        for (const candidate of candidates) {
          hidden.push(candidate.id);
        }
      }
    }
    
    // Update performance metrics
    this.cullCount++;
    this.lastCullTime = performance.now() - startTime;
    
    return {
      visible,
      hidden,
      totalChecked: objects.size
    };
  }
  
  /**
   * Check if a single object is visible within bounds
   */
  public isObjectVisible(obj: Container, bounds: Rectangle): boolean {
    if (!obj || obj.destroyed || !obj.visible) {
      return false;
    }
    
    try {
      const objBounds = obj.getBounds();
      return this.boundsIntersect(objBounds, bounds);
    } catch (error) {
      // If bounds calculation fails, assume visible to be safe
      console.warn('Failed to get object bounds:', error);
      return true;
    }
  }
  
  /**
   * Fast AABB intersection test between object bounds and viewport bounds
   */
  private boundsIntersect(objBounds: Bounds, viewportBounds: Rectangle): boolean {
    // Convert Bounds to Rectangle-like structure for intersection test
    const objRect = {
      x: objBounds.minX,
      y: objBounds.minY,
      width: objBounds.maxX - objBounds.minX,
      height: objBounds.maxY - objBounds.minY
    };
    
    return !(
      objRect.x + objRect.width < viewportBounds.x ||
      objRect.x > viewportBounds.x + viewportBounds.width ||
      objRect.y + objRect.height < viewportBounds.y ||
      objRect.y > viewportBounds.y + viewportBounds.height
    );
  }
  
  /**
   * Expand bounds with padding
   */
  private expandBounds(bounds: Rectangle, padding: number): Rectangle {
    return new Rectangle(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
  }
  
  /**
   * Calculate distance from object center to viewport center
   */
  private calculateDistanceFromViewport(obj: Container, viewportBounds: Rectangle): number {
    try {
      const objBounds = obj.getBounds();
      
      // Object center
      const objCenterX = objBounds.minX + (objBounds.maxX - objBounds.minX) / 2;
      const objCenterY = objBounds.minY + (objBounds.maxY - objBounds.minY) / 2;
      
      // Viewport center
      const viewportCenterX = viewportBounds.x + viewportBounds.width / 2;
      const viewportCenterY = viewportBounds.y + viewportBounds.height / 2;
      
      // Euclidean distance
      const dx = objCenterX - viewportCenterX;
      const dy = objCenterY - viewportCenterY;
      
      return Math.sqrt(dx * dx + dy * dy);
    } catch (error) {
      // If bounds calculation fails, return max distance
      return Number.MAX_SAFE_INTEGER;
    }
  }
  
  /**
   * Get performance statistics
   */
  public getStats(): {
    cullCount: number;
    lastCullTime: number;
    averageCullTime: number;
    padding: number;
    maxVisible: number;
  } {
    return {
      cullCount: this.cullCount,
      lastCullTime: this.lastCullTime,
      averageCullTime: this.cullCount > 0 ? this.lastCullTime / this.cullCount : 0,
      padding: this.padding,
      maxVisible: this.maxVisible
    };
  }
  
  /**
   * Reset performance counters
   */
  public resetStats(): void {
    this.cullCount = 0;
    this.lastCullTime = 0;
  }
  
  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ObjectCullerConfig>): void {
    if (config.padding !== undefined) {
      (this as any).padding = config.padding;
    }
    if (config.maxVisible !== undefined) {
      (this as any).maxVisible = config.maxVisible;
    }
    if (config.usePriority !== undefined) {
      (this as any).usePriority = config.usePriority;
    }
  }
}