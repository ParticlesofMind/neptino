/**
 * GraphicsContext System for PIXI.js v8
 * Implements best practices for dynamic graphics rendering by using pre-built
 * GraphicsContext objects that can be swapped instead of clearing/redrawing Graphics
 */

import { Graphics, GraphicsContext, Point } from 'pixi.js';

/**
 * Pool of reusable GraphicsContext objects for different rendering scenarios
 */
export class GraphicsContextPool {
  private static instance: GraphicsContextPool;
  private strokeContexts: Map<string, GraphicsContext> = new Map();
  private pathContexts: GraphicsContext[] = [];
  private cursorContexts: GraphicsContext[] = [];
  private shapeContexts: Map<string, GraphicsContext> = new Map();

  static getInstance(): GraphicsContextPool {
    if (!GraphicsContextPool.instance) {
      GraphicsContextPool.instance = new GraphicsContextPool();
    }
    return GraphicsContextPool.instance;
  }

  /**
   * Get or create a stroke context for brush/pen tools
   */
  getStrokeContext(color: number, width: number, alpha: number = 1): GraphicsContext {
    const key = `stroke_${color}_${width}_${alpha}`;
    
    if (!this.strokeContexts.has(key)) {
      const context = new GraphicsContext();
      context.stroke({
        color,
        width,
        cap: 'round',
        join: 'round',
        alpha
      });
      this.strokeContexts.set(key, context);
    }
    
    return this.strokeContexts.get(key)!;
  }

  /**
   * Get a reusable path context for animation paths
   */
  getPathContext(): GraphicsContext {
    if (this.pathContexts.length === 0) {
      // Create a few pre-built path contexts
      for (let i = 0; i < 5; i++) {
        const context = new GraphicsContext();
        context.stroke({
          color: 0x4a79a4,
          width: 2,
          alpha: 0.8
        });
        this.pathContexts.push(context);
      }
    }
    
    return this.pathContexts.shift() || this.createDefaultPathContext();
  }

  /**
   * Return a path context to the pool
   */
  returnPathContext(context: GraphicsContext): void {
    if (this.pathContexts.length < 10) { // Limit pool size
      this.pathContexts.push(context);
    }
  }

  /**
   * Get a cursor context for text editing
   */
  getCursorContext(color: number = 0x000000, width: number = 2): GraphicsContext {
    if (this.cursorContexts.length === 0) {
      const context = new GraphicsContext();
      context.rect(0, 0, width, 20); // Default cursor size
      context.fill({ color, alpha: 1.0 });
      this.cursorContexts.push(context);
      return context;
    }
    
    return this.cursorContexts.shift()!;
  }

  /**
   * Return a cursor context to the pool
   */
  returnCursorContext(context: GraphicsContext): void {
    if (this.cursorContexts.length < 5) { // Limit pool size
      this.cursorContexts.push(context);
    }
  }

  /**
   * Get or create a shape context
   */
  getShapeContext(type: 'rectangle' | 'circle' | 'triangle', fillColor?: number, strokeColor?: number, strokeWidth?: number): GraphicsContext {
    const key = `shape_${type}_${fillColor || 'none'}_${strokeColor || 'none'}_${strokeWidth || 0}`;
    
    if (!this.shapeContexts.has(key)) {
      const context = new GraphicsContext();
      
      // Pre-build the shape based on type
      switch (type) {
        case 'rectangle':
          context.rect(0, 0, 100, 100);
          break;
        case 'circle':
          context.circle(50, 50, 50);
          break;
        case 'triangle':
          context.moveTo(50, 0);
          context.lineTo(100, 100);
          context.lineTo(0, 100);
          context.closePath();
          break;
      }
      
      if (fillColor !== undefined) {
        context.fill({ color: fillColor });
      }
      
      if (strokeColor !== undefined && strokeWidth !== undefined) {
        context.stroke({ color: strokeColor, width: strokeWidth });
      }
      
      this.shapeContexts.set(key, context);
    }
    
    return this.shapeContexts.get(key)!;
  }

  private createDefaultPathContext(): GraphicsContext {
    const context = new GraphicsContext();
    context.stroke({
      color: 0x4a79a4,
      width: 2,
      alpha: 0.8
    });
    return context;
  }

  /**
   * Clear all cached contexts (use sparingly)
   */
  clearAll(): void {
    this.strokeContexts.clear();
    this.pathContexts.length = 0;
    this.cursorContexts.length = 0;
    this.shapeContexts.clear();
  }
}

/**
 * Dynamic stroke renderer that builds paths efficiently using Graphics
 */
export class StrokeRenderer {
  private graphics: Graphics;
  private currentPath: Point[] = [];
  private currentColor: number = 0x000000;
  private currentWidth: number = 2;
  private currentAlpha: number = 1;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
  }

  /**
   * Start a new stroke path
   */
  startStroke(point: Point, color: number, width: number, alpha: number = 1): void {
    console.log(`🎨 STROKE_RENDERER: Starting stroke at (${point.x}, ${point.y}) with color: ${color}, width: ${width}`);
    this.currentPath = [point.clone()];
    this.currentColor = color;
    this.currentWidth = width;
    this.currentAlpha = alpha;
    
    // Clear any previous graphics
    this.graphics.clear();
    
    // Start the path and apply stroke style once
    this.graphics.moveTo(point.x, point.y);
    
    console.log(`🎨 STROKE_RENDERER: Graphics cleared and path started`);
  }

  /**
   * Add point to current stroke and render the complete stroke smoothly
   */
  addStrokePoint(point: Point): void {
    if (this.currentPath.length === 0) {
      console.warn(`🎨 STROKE_RENDERER: Cannot add stroke point - no current path started`);
      return;
    }
    
    console.log(`🎨 STROKE_RENDERER: Adding stroke point (${point.x}, ${point.y})`);
    this.currentPath.push(point.clone());
    
    // Clear and rebuild the entire smooth path for each addition
    this.graphics.clear();
    
    if (this.currentPath.length > 0) {
      this.graphics.moveTo(this.currentPath[0].x, this.currentPath[0].y);
      
      // Build the complete smooth path
      for (let i = 1; i < this.currentPath.length; i++) {
        this.graphics.lineTo(this.currentPath[i].x, this.currentPath[i].y);
      }
      
      // Apply stroke style once for the entire path
      this.graphics.stroke({
        color: this.currentColor,
        width: this.currentWidth,
        alpha: this.currentAlpha,
        cap: 'round',
        join: 'round'
      });
    }
  }

  /**
   * Finish the current stroke
   */
  finishStroke(): void {
    console.log(`🎨 STROKE_RENDERER: Finishing stroke with ${this.currentPath.length} points`);
    
    // Ensure final stroke is applied (already done in addStrokePoint, but safety check)
    if (this.currentPath.length > 0) {
      // The stroke should already be applied from the last addStrokePoint call
      // No need to duplicate the stroke call here
    }
    
    this.currentPath = [];
  }

  /**
   * Get current path points
   */
  getCurrentPath(): Point[] {
    return [...this.currentPath];
  }
}

/**
 * Optimized path renderer for animation scenes
 */
export class PathRenderer {
  private graphics: Graphics;
  private contextPool: GraphicsContextPool;
  private currentContext: GraphicsContext | null = null;

  constructor(graphics: Graphics) {
    this.graphics = graphics;
    this.contextPool = GraphicsContextPool.getInstance();
  }

  /**
   * Render path using pre-built context (no clearing needed)
   */
  renderPath(points: Point[]): void {
    if (points.length === 0) return;

    // Return previous context to pool
    if (this.currentContext) {
      this.contextPool.returnPathContext(this.currentContext);
    }

    // Get fresh context from pool
    this.currentContext = this.contextPool.getPathContext();
    
    // Build path efficiently
    this.currentContext.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.currentContext.lineTo(points[i].x, points[i].y);
    }

    // Swap context (no clear() needed)
    this.graphics.context = this.currentContext;
  }

  /**
   * Update path visibility without rebuilding
   */
  setAlpha(alpha: number): void {
    this.graphics.alpha = alpha;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.currentContext) {
      this.contextPool.returnPathContext(this.currentContext);
      this.currentContext = null;
    }
  }
}

/**
 * Optimized cursor renderer that avoids clear/redraw cycles
 */
export class CursorRenderer {
  private graphics: Graphics;
  private contextPool: GraphicsContextPool;
  private visibleContext: GraphicsContext | null = null;
  private hiddenContext: GraphicsContext | null = null;

  constructor(graphics: Graphics, color: number = 0x000000, width: number = 2) {
    this.graphics = graphics;
    this.contextPool = GraphicsContextPool.getInstance();
    
    // Pre-build visible and hidden states
    this.visibleContext = this.contextPool.getCursorContext(color, width);
    this.hiddenContext = new GraphicsContext(); // Empty context for hidden state
  }

  /**
   * Show cursor without redrawing
   */
  show(): void {
    if (this.visibleContext) {
      this.graphics.context = this.visibleContext;
    }
  }

  /**
   * Hide cursor without clearing
   */
  hide(): void {
    this.graphics.context = this.hiddenContext!;
  }

  /**
   * Update cursor dimensions (creates new context if needed)
   */
  updateDimensions(width: number, height: number, color: number): void {
    // Return old context to pool
    if (this.visibleContext) {
      this.contextPool.returnCursorContext(this.visibleContext);
    }

    // Create new context with updated dimensions
    this.visibleContext = new GraphicsContext();
    this.visibleContext.rect(0, 0, width, height);
    this.visibleContext.fill({ color, alpha: 1.0 });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.visibleContext) {
      this.contextPool.returnCursorContext(this.visibleContext);
      this.visibleContext = null;
    }
    this.hiddenContext = null;
  }
}