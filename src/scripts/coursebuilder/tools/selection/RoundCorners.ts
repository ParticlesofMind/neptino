/**
 * Corner Rounding Utility
 * Dedicated handler for object corner rounding functionality
 * Fixes coordinate transformation and object displacement issues
 */

import { Point, Rectangle } from 'pixi.js';
import { redrawShapeFromMeta } from '../shapes/ShapeRedraw';

export interface RoundingState {
  active: boolean;
  corner: string | null;
  object: any | null;
  lastClickTime: number;
  lastHandleKey: string | null;
  originalBounds: Rectangle | null; // Store original bounds to prevent displacement
}

export interface CornerRadiiData {
  tl?: number;
  tr?: number;
  br?: number;
  bl?: number;
  t?: number; // triangle top
}

export class RoundCorners {
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
      originalBounds: null
    };
  }

  /**
   * Start corner rounding interaction
   */
  static startRounding(
    state: RoundingState, 
    corner: string, 
    object: any, 
    handleKey: string
  ): void {
    // DEBUG: Log object state when corner rounding starts
    console.log('🟢 CORNER DEBUG - START ROUNDING:', {
      'object.x': object.x,
      'object.y': object.y,
      'corner': corner,
      'handleKey': handleKey,
      'meta': object.__meta
    });
    
    const now = Date.now();
    const isDouble = state.lastHandleKey === handleKey && (now - state.lastClickTime) < 350;
    
    // DEBUG: Log double-click detection
    console.log('🟢 DOUBLE-CLICK DEBUG:', {
      'isDouble': isDouble,
      'lastHandleKey': state.lastHandleKey,
      'currentHandleKey': handleKey,
      'timeDiff': now - state.lastClickTime,
      'lastClickTime': state.lastClickTime
    });
    
    state.lastClickTime = now;
    state.lastHandleKey = handleKey;
    state.active = true;
    state.corner = corner;
    state.object = object;
    
    // Store original bounds to prevent displacement
    if (object && object.getLocalBounds) {
      state.originalBounds = object.getLocalBounds().clone();
    }

    // TEMPORARILY DISABLE double-click reset to test
    if (false && isDouble) {
      // Double-click resets corner radius
      console.log('🟢 DOUBLE-CLICK: Resetting corner radius');
      this.resetCornerRadius(object, corner);
    }
  }

  /**
   * Update corner radius during drag
   */
  static updateCornerRadius(
    state: RoundingState,
    globalPointerPosition: Point
  ): boolean {
    if (!state.active || !state.object || !state.corner) {
      return false;
    }

    const obj = state.object;
    const corner = state.corner;
    
    // DEBUG: Log object state before corner radius update
    console.log('🟢 CORNER DEBUG - BEFORE UPDATE:', {
      'object.x': obj.x,
      'object.y': obj.y,
      'globalPointer': globalPointerPosition,
      'corner': corner,
      'meta': obj.__meta
    });
    
    try {
      // Use stored original bounds instead of current bounds to prevent displacement
      const bounds = state.originalBounds || obj.getLocalBounds();
      
      // Convert global position to object local coordinates
      const localPosition = obj.toLocal(globalPointerPosition);
      
      // Get or initialize metadata
      const meta = obj.__meta = obj.__meta || { kind: 'shapes' };
      meta.cornerMode = meta.cornerMode || 'uniform';
      meta.cornerRadii = meta.cornerRadii || {};
      
      const shapeType = meta.shapeType || '';
      let updated = false;
      
      if (shapeType === 'rectangle') {
        updated = this.updateRectangleCorner(meta, bounds, localPosition, corner);
      } else if (shapeType === 'triangle') {
        updated = this.updateTriangleCorner(meta, bounds, localPosition, corner);
      }
      
      // Trigger redraw if corner was updated
      if (updated) {
        console.log('🟢 CORNER DEBUG - TRIGGERING REDRAW');
        this.redrawShape(obj);
        console.log('🟢 CORNER DEBUG - AFTER REDRAW:', {
          'object.x': obj.x,
          'object.y': obj.y,
        });
      }
      
      return updated;
    } catch (error) {
      console.warn('Error updating corner radius:', error);
      return false;
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
   * Stop rounding interaction
   */
  static stopRounding(state: RoundingState): void {
    state.active = false;
    state.corner = null;
    state.object = null;
    state.originalBounds = null;
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
      
      console.log('🔧 RoundCorners: SAVED position before redraw:', savedPosition);
      
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