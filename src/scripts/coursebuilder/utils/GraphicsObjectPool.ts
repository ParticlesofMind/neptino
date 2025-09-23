/**
 * Graphics Object Pool System
 * Implements object pooling for frequently created/destroyed Graphics objects
 * to reduce garbage collection and improve performance
 */

import { Graphics, Container, Point } from 'pixi.js';
import { createHighQualityGraphics } from './graphicsQuality';

/**
 * Generic object pool for reusable objects
 */
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize: number = 20) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get an object from the pool or create a new one
   */
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.resetFn(obj);
      return obj;
    }
    return this.createFn();
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Specialized Graphics object pool
 */
export class GraphicsPool {
  private static instance: GraphicsPool;
  private basicGraphicsPool: ObjectPool<Graphics>;
  private strokeGraphicsPool: ObjectPool<Graphics>;
  private anchorGraphicsPool: ObjectPool<Graphics>;
  private previewGraphicsPool: ObjectPool<Graphics>;

  constructor() {
    // Basic graphics pool for simple shapes
    this.basicGraphicsPool = new ObjectPool<Graphics>(
      () => createHighQualityGraphics(),
      (graphics) => this.resetGraphics(graphics),
      15 // Keep up to 15 basic graphics objects
    );

    // Stroke graphics pool for brush/pen tools
    this.strokeGraphicsPool = new ObjectPool<Graphics>(
      () => {
        const graphics = createHighQualityGraphics();
        graphics.eventMode = 'static';
        return graphics;
      },
      (graphics) => this.resetGraphics(graphics),
      10 // Keep up to 10 stroke graphics objects
    );

    // Anchor graphics pool for path anchors
    this.anchorGraphicsPool = new ObjectPool<Graphics>(
      () => {
        const graphics = createHighQualityGraphics();
        graphics.eventMode = 'static';
        return graphics;
      },
      (graphics) => this.resetGraphics(graphics),
      25 // Keep up to 25 anchor graphics (scenes can have many)
    );

    // Preview graphics pool for temporary UI elements
    this.previewGraphicsPool = new ObjectPool<Graphics>(
      () => {
        const graphics = createHighQualityGraphics();
        graphics.alpha = 0.7; // Typical preview alpha
        return graphics;
      },
      (graphics) => this.resetGraphics(graphics),
      8 // Keep up to 8 preview graphics objects
    );
  }

  static getInstance(): GraphicsPool {
    if (!GraphicsPool.instance) {
      GraphicsPool.instance = new GraphicsPool();
    }
    return GraphicsPool.instance;
  }

  /**
   * Reset a Graphics object to clean state
   */
  private resetGraphics(graphics: Graphics): void {
    graphics.clear();
    graphics.position.set(0, 0);
    graphics.scale.set(1, 1);
    graphics.rotation = 0;
    graphics.alpha = 1;
    graphics.visible = true;
    graphics.eventMode = 'auto';
    graphics.removeAllListeners();
    
    // Remove from parent if attached
    if (graphics.parent) {
      graphics.parent.removeChild(graphics);
    }
    
    // Clear any custom metadata
    delete (graphics as any).__meta;
    delete (graphics as any).__toolType;
  }

  /**
   * Get a basic Graphics object from pool
   */
  acquireBasicGraphics(): Graphics {
    return this.basicGraphicsPool.acquire();
  }

  /**
   * Return a basic Graphics object to pool
   */
  releaseBasicGraphics(graphics: Graphics): void {
    this.basicGraphicsPool.release(graphics);
  }

  /**
   * Get a stroke Graphics object from pool (for brush/pen tools)
   */
  acquireStrokeGraphics(): Graphics {
    const graphics = this.strokeGraphicsPool.acquire();
    graphics.eventMode = 'static';
    return graphics;
  }

  /**
   * Return a stroke Graphics object to pool
   */
  releaseStrokeGraphics(graphics: Graphics): void {
    this.strokeGraphicsPool.release(graphics);
  }

  /**
   * Get an anchor Graphics object from pool (for animation paths)
   */
  acquireAnchorGraphics(): Graphics {
    const graphics = this.anchorGraphicsPool.acquire();
    graphics.eventMode = 'static';
    return graphics;
  }

  /**
   * Return an anchor Graphics object to pool
   */
  releaseAnchorGraphics(graphics: Graphics): void {
    this.anchorGraphicsPool.release(graphics);
  }

  /**
   * Get a preview Graphics object from pool (for UI previews)
   */
  acquirePreviewGraphics(): Graphics {
    const graphics = this.previewGraphicsPool.acquire();
    graphics.alpha = 0.7;
    return graphics;
  }

  /**
   * Return a preview Graphics object to pool
   */
  releasePreviewGraphics(graphics: Graphics): void {
    this.previewGraphicsPool.release(graphics);
  }

  /**
   * Get pool statistics for debugging
   */
  getStats(): {
    basic: number;
    stroke: number;
    anchor: number;
    preview: number;
  } {
    return {
      basic: this.basicGraphicsPool.getPoolSize(),
      stroke: this.strokeGraphicsPool.getPoolSize(),
      anchor: this.anchorGraphicsPool.getPoolSize(),
      preview: this.previewGraphicsPool.getPoolSize(),
    };
  }

  /**
   * Clear all pools (use sparingly)
   */
  clearAll(): void {
    this.basicGraphicsPool.clear();
    this.strokeGraphicsPool.clear();
    this.anchorGraphicsPool.clear();
    this.previewGraphicsPool.clear();
  }
}

/**
 * Helper class for common Graphics object patterns
 */
export class PooledGraphicsFactory {
  private static pool = GraphicsPool.getInstance();

  /**
   * Create a pooled stroke graphics for brush tools
   */
  static createStroke(color: number, width: number, alpha: number = 1): Graphics {
    const graphics = this.pool.acquireStrokeGraphics();
    graphics.alpha = alpha;
    (graphics as any).__toolType = 'brush';
    // Note: color and width will be applied via GraphicsContext system
    return graphics;
  }

  /**
   * Create a pooled anchor graphics for animation paths
   */
  static createAnchor(point: Point, radius: number = 5): Graphics {
    const graphics = this.pool.acquireAnchorGraphics();
    graphics.circle(0, 0, radius);
    graphics.fill({ color: 0xffffff, alpha: 1 });
    graphics.stroke({ color: 0x4a79a4, width: 2, alpha: 0.9 });
    graphics.position.set(point.x, point.y);
    return graphics;
  }

  /**
   * Create a pooled preview graphics for temporary UI
   */
  static createPreview(alpha: number = 0.7): Graphics {
    const graphics = this.pool.acquirePreviewGraphics();
    graphics.alpha = alpha;
    return graphics;
  }

  /**
   * Create a pooled rectangle graphics
   */
  static createRectangle(x: number, y: number, width: number, height: number, fillColor?: number, strokeColor?: number, strokeWidth?: number): Graphics {
    const graphics = this.pool.acquireBasicGraphics();
    graphics.rect(x, y, width, height);
    
    if (fillColor !== undefined) {
      graphics.fill({ color: fillColor });
    }
    
    if (strokeColor !== undefined && strokeWidth !== undefined) {
      graphics.stroke({ color: strokeColor, width: strokeWidth });
    }
    
    return graphics;
  }

  /**
   * Create a pooled circle graphics
   */
  static createCircle(x: number, y: number, radius: number, fillColor?: number, strokeColor?: number, strokeWidth?: number): Graphics {
    const graphics = this.pool.acquireBasicGraphics();
    graphics.circle(x, y, radius);
    
    if (fillColor !== undefined) {
      graphics.fill({ color: fillColor });
    }
    
    if (strokeColor !== undefined && strokeWidth !== undefined) {
      graphics.stroke({ color: strokeColor, width: strokeWidth });
    }
    
    return graphics;
  }

  /**
   * Return a graphics object to the appropriate pool
   */
  static release(graphics: Graphics): void {
    const toolType = (graphics as any).__toolType;
    
    if (toolType === 'brush') {
      this.pool.releaseStrokeGraphics(graphics);
    } else if (graphics.alpha < 1 && graphics.alpha > 0.5) {
      // Likely a preview graphics
      this.pool.releasePreviewGraphics(graphics);
    } else if (graphics.eventMode === 'static' && graphics.children.length === 0) {
      // Likely an anchor graphics
      this.pool.releaseAnchorGraphics(graphics);
    } else {
      // Default to basic graphics pool
      this.pool.releaseBasicGraphics(graphics);
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStats() {
    return this.pool.getStats();
  }
}

/**
 * Container pool for managing Container objects
 */
export class ContainerPool {
  private static instance: ContainerPool;
  private pool: ObjectPool<Container>;

  constructor() {
    this.pool = new ObjectPool<Container>(
      () => new Container(),
      (container) => {
        // Reset container to clean state
        container.removeChildren();
        container.position.set(0, 0);
        container.scale.set(1, 1);
        container.rotation = 0;
        container.alpha = 1;
        container.visible = true;
        container.removeAllListeners();
        
        if (container.parent) {
          container.parent.removeChild(container);
        }
      },
      10 // Keep up to 10 containers
    );
  }

  static getInstance(): ContainerPool {
    if (!ContainerPool.instance) {
      ContainerPool.instance = new ContainerPool();
    }
    return ContainerPool.instance;
  }

  acquire(): Container {
    return this.pool.acquire();
  }

  release(container: Container): void {
    this.pool.release(container);
  }

  getStats(): { size: number } {
    return { size: this.pool.getPoolSize() };
  }
}