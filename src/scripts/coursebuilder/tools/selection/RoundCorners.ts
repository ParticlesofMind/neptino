/**
 * Corner Rounding Utility - FIXED VERSION
 * Fixes coordinate transformation and infinite redraw issues
 */

import { Point, Rectangle } from 'pixi.js';
import { redrawShapeFromMeta } from '../shapes/ShapeRedraw';

export interface RoundingState {
  active: boolean;
  corner: string | null;
  object: any | null;
  lastClickTime: number;
  lastHandleKey: string | null;
  originalBounds: Rectangle | null;
  // NEW: Add these to prevent issues
  originalPosition: Point | null;
  isUpdating: boolean; // Prevent recursive updates
  lastUpdateTime: number; // Throttle updates
}

export interface CornerRadiiData {
  tl?: number;
  tr?: number;
  br?: number;
  bl?: number;
  t?: number;
}

export class RoundCorners {
  private static UPDATE_THROTTLE = 16; // ~60fps maximum update rate
  
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Initialize rounding state
   */
  static createRoundingState(): RoundingState {
    return {
      active: false,
      corner: null,
      object: null,
      lastClickTime: 0,
      lastHandleKey: null,
      originalBounds: null,
      originalPosition: null,
      isUpdating: false,
      lastUpdateTime: 0
    };
  }

  /**
   * Start corner rounding interaction - FIXED
   */
  static startRounding(
    state: RoundingState, 
    corner: string, 
    object: any, 
    handleKey: string
  ): void {
    console.log('🟢 CORNER DEBUG - START ROUNDING:', {
      'object.x': object.x,
      'object.y': object.y,
      'corner': corner,
      'handleKey': handleKey
    });
    
    const now = Date.now();
    const isDouble = state.lastHandleKey === handleKey && (now - state.lastClickTime) < 350;
    
    state.lastClickTime = now;
    state.lastHandleKey = handleKey;
    state.active = true;
    state.corner = corner;
    state.object = object;
    state.isUpdating = false;
    state.lastUpdateTime = 0;
    
    // CRITICAL FIX: Store original position BEFORE any modifications
    state.originalPosition = new Point(object.x, object.y);
    
    console.log('🟢 STORED ORIGINAL POSITION:', {
      'originalPosition.x': state.originalPosition.x,
      'originalPosition.y': state.originalPosition.y,
      'object.__meta.x': object.__meta?.x,
      'object.__meta.y': object.__meta?.y
    });
    
    // Store original bounds
    if (object.getBounds) {
      state.originalBounds = object.getBounds().clone();
    }
    
    // Initialize corner radii if not present
    if (!object.__meta) object.__meta = {};
    if (!object.__meta.cornerRadii) {
      object.__meta.cornerRadii = { tl: 0, tr: 0, br: 0, bl: 0 };
    }
    
    // Handle double-click: reset corner
    if (isDouble) {
      const cornerKey = corner as keyof CornerRadiiData;
      if (object.__meta.cornerRadii && typeof object.__meta.cornerRadii[cornerKey] === 'number') {
        object.__meta.cornerRadii[cornerKey] = 0;
        this.safeRedrawShape(object, state);
      }
    }
  }

  /**
   * Update corner rounding - THROTTLED AND PROTECTED
   */
  static updateCornerRadius(
    state: RoundingState,
    globalPointerPosition: Point
  ): boolean {
    
    if (!state.active || !state.object || !state.corner) {
      return false;
    }
    
    // CRITICAL: Prevent recursive updates
    if (state.isUpdating) {
      return false;
    }
    
    const now = Date.now();
    // THROTTLE: Only update at most 60fps
    if (now - state.lastUpdateTime < this.UPDATE_THROTTLE) {
      return false;
    }
    
    state.isUpdating = true;
    state.lastUpdateTime = now;
    
    try {
      console.log('� CORNER ROUNDING UPDATE EXECUTING - Object before:', {
        'object.x': state.object.x,
        'object.y': state.object.y,
        'originalPos': state.originalPosition,
        'meta.x': state.object.__meta?.x,
        'meta.y': state.object.__meta?.y
      });
      
      const obj = state.object;
      
      // FIXED COORDINATE SPACE CALCULATION
      if (obj.__meta && obj.__meta.shapeType === 'rectangle') {
        const meta = obj.__meta;
        const bounds = state.originalBounds || obj.getLocalBounds();
        const localPosition = obj.toLocal(globalPointerPosition);
        
        console.log('🔥 META DATA:', {
          'meta.x': meta.x,
          'meta.y': meta.y,
          'meta.width': meta.width,
          'meta.height': meta.height,
          'meta.startX': meta.startX,
          'meta.startY': meta.startY
        });
        
        // CRITICAL FIX: Use meta dimensions if bounds are invalid (width/height = 0)
        // This happens when the object has been displaced and bounds become invalid
        const width = (bounds.width > 0) ? bounds.width : (meta.width || 100);
        const height = (bounds.height > 0) ? bounds.height : (meta.height || 100);
        
        // For position, use bounds if they're valid, otherwise fall back to meta
        const x = (bounds.width > 0) ? bounds.x : 0; // Always use 0 for local space calculation
        const y = (bounds.height > 0) ? bounds.y : 0; // Always use 0 for local space calculation
        
        const minX = x;
        const minY = y;
        
        const halfW = Math.max(0, width * 0.5);
        const halfH = Math.max(0, height * 0.5);

        const calculateRadius = (cornerKey: string): number => {
          
          switch (cornerKey) {
            case 'tl': {
              const dx = this.clamp(localPosition.x - minX, 0, halfW);
              const dy = this.clamp(localPosition.y - minY, 0, halfH);
              const result = Math.min(dx, dy);
              return result;
            }
            case 'tr': {
              const cornerX = minX + width;
              const cornerY = minY;
              const dx = this.clamp(cornerX - localPosition.x, 0, halfW);
              const dy = this.clamp(localPosition.y - cornerY, 0, halfH);
              const result = Math.min(dx, dy);
              return result;
            }
            case 'br': {
              const dx = this.clamp((minX + width) - localPosition.x, 0, halfW);
              const dy = this.clamp((minY + height) - localPosition.y, 0, halfH);
              const result = Math.min(dx, dy);
              return result;
            }
            case 'bl': {
              const dx = this.clamp(localPosition.x - minX, 0, halfW);
              const dy = this.clamp((minY + height) - localPosition.y, 0, halfH);
              const result = Math.min(dx, dy);
              return result;
            }
            default:
              return 0;
          }
        };

        const radius = Math.round(calculateRadius(state.corner));
        
        
        // Update corner radii
        if (!meta.cornerRadii) {
          meta.cornerRadii = { tl: 0, tr: 0, br: 0, bl: 0 };
        }
        
        if (meta.cornerMode === 'uniform') {
          meta.cornerRadius = radius;
          meta.cornerRadii = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
          meta.cornerRadii[state.corner] = radius;
        }
        
      }
      
      // SAFE REDRAW: Only redraw if position is stable
      this.safeRedrawShape(obj, state);
      
      console.log('� CORNER ROUNDING UPDATE COMPLETED - Object after:', {
        'object.x': obj.x,
        'object.y': obj.y
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error in updateCornerRadius:', error);
      return false;
    } finally {
      state.isUpdating = false;
    }
  }

  /**
   * Update rectangle corner radius
   */
  private static updateRectangleCorner(
    meta: any,
    bounds: Rectangle,
    localPosition: Point,
    corner: string
  ): boolean {
    // Use meta coordinates for proper coordinate space calculation
    // The bounds from getLocalBounds() include the shape's position offset
    const x = meta.x ?? bounds.x;
    const y = meta.y ?? bounds.y; 
    const width = meta.width ?? bounds.width;
    const height = meta.height ?? bounds.height;
    
    const minX = x;
    const minY = y;
    const maxX = x + width;
    const maxY = y + height;
    const halfW = Math.max(0, width * 0.5);
    const halfH = Math.max(0, height * 0.5);

    const calculateRadius = (cornerKey: string): number => {
      switch (cornerKey) {
        case 'tl': {
          const dx = this.clamp(localPosition.x - minX, 0, halfW);
          const dy = this.clamp(localPosition.y - minY, 0, halfH);
          return Math.min(dx, dy);
        }
        case 'tr': {
          const dx = this.clamp(maxX - localPosition.x, 0, halfW);
          const dy = this.clamp(localPosition.y - minY, 0, halfH);
          return Math.min(dx, dy);
        }
        case 'br': {
          const dx = this.clamp(maxX - localPosition.x, 0, halfW);
          const dy = this.clamp(maxY - localPosition.y, 0, halfH);
          return Math.min(dx, dy);
        }
        case 'bl': {
          const dx = this.clamp(localPosition.x - minX, 0, halfW);
          const dy = this.clamp(maxY - localPosition.y, 0, halfH);
          return Math.min(dx, dy);
        }
        default:
          return 0;
      }
    };

    const radius = Math.round(calculateRadius(corner));
    
    if (meta.cornerMode === 'uniform') {
      meta.cornerRadius = radius;
      meta.cornerRadii = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      meta.cornerRadii = { 
        tl: meta.cornerRadii.tl || 0, 
        tr: meta.cornerRadii.tr || 0, 
        br: meta.cornerRadii.br || 0, 
        bl: meta.cornerRadii.bl || 0 
      };
      meta.cornerRadii[corner] = radius;
    }
    
    return true;
  }

  /**
   * Update triangle corner radius
   */
  private static updateTriangleCorner(
    meta: any,
    bounds: Rectangle,
    localPosition: Point,
    corner: string
  ): boolean {
    // Use meta coordinates for proper coordinate space calculation
    const x = meta.x ?? bounds.x;
    const y = meta.y ?? bounds.y;
    const width = meta.width ?? bounds.width;
    const height = meta.height ?? bounds.height;
    
    // Triangle vertices
    const vTop = new Point(x + width / 2, y);
    const vBR = new Point(x + width, y + height);
    const vBL = new Point(x, y + height);
    
    const getVertex = (cornerKey: string): Point => {
      switch (cornerKey) {
        case 't': return vTop;
        case 'br': return vBR;
        case 'bl': return vBL;
        default: return vTop;
      }
    };

    const getPrevVertex = (cornerKey: string): Point => {
      switch (cornerKey) {
        case 't': return vBL;
        case 'br': return vTop;
        case 'bl': return vBR;
        default: return vBL;
      }
    };

    const getNextVertex = (cornerKey: string): Point => {
      switch (cornerKey) {
        case 't': return vBR;
        case 'br': return vBL;
        case 'bl': return vTop;
        default: return vBR;
      }
    };

    const vertex = getVertex(corner);
    const prevVertex = getPrevVertex(corner);
    const nextVertex = getNextVertex(corner);
    
    const lengthToPrev = Math.hypot(vertex.x - prevVertex.x, vertex.y - prevVertex.y);
    const lengthToNext = Math.hypot(vertex.x - nextVertex.x, vertex.y - nextVertex.y);
    const maxRadius = Math.min(lengthToPrev * 0.5, lengthToNext * 0.5);
    
    const distanceToVertex = Math.hypot(localPosition.x - vertex.x, localPosition.y - vertex.y);
    const radius = Math.round(Math.min(maxRadius, distanceToVertex));
    
    if (meta.cornerMode === 'uniform') {
      meta.cornerRadius = radius;
      meta.cornerRadii = { t: radius, br: radius, bl: radius };
    } else {
      meta.cornerRadii = meta.cornerRadii || {};
      meta.cornerRadii[corner] = radius;
    }
    
    return true;
  }

  /**
   * Reset corner radius to zero
   */
  static resetCornerRadius(object: any, corner: string): void {
    if (!object) return;
    
    const meta = object.__meta = object.__meta || { kind: 'shapes' };
    meta.cornerRadii = meta.cornerRadii || {};
    
    if (meta.cornerMode === 'uniform') {
      meta.cornerRadius = 0;
      meta.cornerRadii = { tl: 0, tr: 0, br: 0, bl: 0, t: 0 };
    } else {
      meta.cornerRadii[corner] = 0;
    }
    
    // Trigger redraw after resetting radius
    this.redrawShape(object);
  }

  /**
   * Stop corner rounding - CLEANUP
   */
  static stopRounding(state: RoundingState): void {
    if (!state.active) return;
    
    
    // Final position correction if needed
    if (state.object && state.originalPosition) {
      console.log('🔧 FINAL POSITION CORRECTION:', {
        currentX: state.object.x,
        currentY: state.object.y,
        originalX: state.originalPosition.x,
        originalY: state.originalPosition.y
      });
      
      // Ensure object is at original position
      state.object.x = state.originalPosition.x;
      state.object.y = state.originalPosition.y;
    }
    
    // Reset state
    state.active = false;
    state.corner = null;
    state.object = null;
    state.originalBounds = null;
    state.originalPosition = null;
    state.isUpdating = false;
    state.lastUpdateTime = 0;
  }

  /**
   * Check if object supports corner rounding
   */
  static supportsRounding(object: any): boolean {
    if (!object || !object.__meta) return false;
    
    const meta = object.__meta;
    const isShape = meta.kind === 'shapes' || object.__toolType === 'shapes';
    const shapeType = meta.shapeType || '';
    
    return isShape && (shapeType === 'rectangle' || shapeType === 'triangle');
  }

  /**
   * Get corner keys for a shape type
   */
  static getCornerKeys(shapeType: string): string[] {
    switch (shapeType) {
      case 'rectangle':
        return ['tl', 'tr', 'br', 'bl'];
      case 'triangle':
        return ['t', 'br', 'bl'];
      default:
        return [];
    }
  }

  /**
   * Get current corner radius value
   */
  static getCornerRadius(object: any, corner: string): number {
    if (!object || !object.__meta) return 0;
    
    const meta = object.__meta;
    const mode = meta.cornerMode || 'uniform';
    
    if (mode === 'uniform') {
      return Math.max(0, Number(meta.cornerRadius || 0));
    } else {
      const radii = meta.cornerRadii || {};
      return Math.max(0, Number(radii[corner] || 0));
    }
  }

  /**
   * Check if a point is near object center (for rounding activation)
   */
  static isNearObjectCenter(object: any, pointer: Point, threshold: number = 50): boolean {
    if (!object) return false;
    
    const bounds = object.getBounds ? object.getBounds() : new Rectangle(object.x, object.y, object.width || 100, object.height || 100);
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.5;
    
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < threshold;
  }

  /**
   * Safe shape redraw that preserves position
   */
  private static safeRedrawShape(object: any, state: RoundingState): void {
    
    if (!object || !state.originalPosition) {
      return;
    }
    
    try {
      // CRITICAL: Store position before redraw
      const beforeX = object.x;
      const beforeY = object.y;
      const beforeMetaX = object.__meta?.x;
      const beforeMetaY = object.__meta?.y;
      
      console.log('�️ SAFE REDRAW - BEFORE redrawShapeFromMeta:', {
        'object.x': beforeX,
        'object.y': beforeY,
        'meta.x': beforeMetaX,
        'meta.y': beforeMetaY,
        'originalPosition.x': state.originalPosition.x,
        'originalPosition.y': state.originalPosition.y
      });
      
      // CRITICAL: Ensure meta coordinates are correct BEFORE redraw
      if (object.__meta) {
        object.__meta.x = state.originalPosition.x;
        object.__meta.y = state.originalPosition.y;
      }
      
      // Perform the redraw
      const redrawResult = redrawShapeFromMeta(object);
      
      // Check position immediately after redraw
      console.log('🛠️ SAFE REDRAW - IMMEDIATELY after redrawShapeFromMeta:', {
        'object.x': object.x,
        'object.y': object.y,
        'meta.x': object.__meta?.x,
        'meta.y': object.__meta?.y
      });
      
      // CRITICAL: Always restore to ORIGINAL position, not "before" position
      object.x = state.originalPosition.x;
      object.y = state.originalPosition.y;
      
      console.log('�️ SAFE REDRAW - FINAL position after restoration:', {
        'object.x': object.x,
        'object.y': object.y
      });
      
    } catch (error) {
      console.error('❌ Error in safeRedrawShape:', error);
      // Fallback: restore original position
      if (state.originalPosition) {
        object.x = state.originalPosition.x;
        object.y = state.originalPosition.y;
      }
    }
  }

  /**
   * Trigger shape redraw after corner radius changes
   */
  static redrawShape(object: any): boolean {
    if (!object) return false;
    
    try {
      // CRITICAL FIX: Save position before redraw to prevent displacement to (0,0)
      const savedPosition = {
        x: object.x,
        y: object.y
      };
      
      
      const result = redrawShapeFromMeta(object);
      
      // CRITICAL FIX: Force restore the saved position after redraw
      object.x = savedPosition.x;
      object.y = savedPosition.y;
      
      console.log('🔧 RoundCorners: RESTORED position after redraw:', {
        x: object.x,
        y: object.y
      });
      
      return result;
    } catch (error) {
      console.warn('Error redrawing shape after corner radius change:', error);
      return false;
    }
  }
}