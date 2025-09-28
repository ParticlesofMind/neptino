/**
 * SpatialIndex - Quadtree-based spatial indexing for fast object queries
 * Replaces the recursive scene traversal for better performance with large canvases
 */

import { Rectangle, Container, Point } from 'pixi.js';

interface SpatialObject {
  bounds: Rectangle;
  object: any;
  id: string;
}

interface QuadNode {
  bounds: Rectangle;
  objects: SpatialObject[];
  children?: QuadNode[];
  level: number;
}

export class SpatialIndex {
  private root: QuadNode;
  private maxObjects = 10;
  private maxLevels = 8;

  constructor(bounds: Rectangle) {
    this.root = {
      bounds: bounds.clone(),
      objects: [],
      level: 0
    };
  }

  /**
   * Build spatial index from container hierarchy
   */
  public buildFromContainer(container: Container, exclude: Set<any> = new Set()): void {
    this.clear();
    this.collectObjects(container, exclude);
  }

  /**
   * Query objects within a region with optional margin
   */
  public queryRegion(region: Rectangle, margin: number = 0): SpatialObject[] {
    const queryBounds = new Rectangle(
      region.x - margin,
      region.y - margin,
      region.width + margin * 2,
      region.height + margin * 2
    );
    
    const results: SpatialObject[] = [];
    this.queryNode(this.root, queryBounds, results);
    return results;
  }

  /**
   * Query objects within radius of a point
   */
  public queryRadius(point: Point, radius: number): SpatialObject[] {
    const queryBounds = new Rectangle(
      point.x - radius,
      point.y - radius,
      radius * 2,
      radius * 2
    );
    
    const candidates = this.queryRegion(queryBounds);
    return candidates.filter(obj => {
      const center = new Point(
        obj.bounds.x + obj.bounds.width / 2,
        obj.bounds.y + obj.bounds.height / 2
      );
      const dx = center.x - point.x;
      const dy = center.y - point.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  /**
   * Find nearest objects to a point within max distance
   */
  public findNearest(point: Point, maxDistance: number, count: number = 5): SpatialObject[] {
    const candidates = this.queryRadius(point, maxDistance);
    
    return candidates
      .map(obj => ({
        obj,
        distance: this.distanceToRect(point, obj.bounds)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count)
      .map(item => item.obj);
  }

  private clear(): void {
    this.root.objects = [];
    this.root.children = undefined;
  }

  private collectObjects(container: Container, exclude: Set<any>): void {
    const visit = (node: any, parentContainer: Container) => {
      if (!node || exclude.has(node)) return;

      // Skip UI overlay elements
      try {
        const name = (node as any).name || '';
        if (name === 'selection-box' || 
            name.startsWith('transform-handle-') || 
            name.startsWith('round-handle-') ||
            name === 'selection-size-indicator') {
          return;
        }
      } catch {}

      // Add object if it has valid bounds
      try {
        if (typeof node.getBounds === 'function' && node.visible !== false) {
          const wb = node.getBounds();
          const tl = parentContainer.toLocal(new Point(wb.x, wb.y));
          const br = parentContainer.toLocal(new Point(wb.x + wb.width, wb.y + wb.height));
          
          const x = Math.min(tl.x, br.x);
          const y = Math.min(tl.y, br.y);
          const w = Math.abs(br.x - tl.x);
          const h = Math.abs(br.y - tl.y);

          if (isFinite(x) && isFinite(y) && w > 0.01 && h > 0.01) {
            this.insert({
              bounds: new Rectangle(x, y, w, h),
              object: node,
              id: (node as any).__uuid || `obj_${Date.now()}_${Math.random()}`
            });
          }
        }
      } catch {}

      // Recurse to children
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child, parentContainer);
        }
      }
    };

    for (const child of container.children) {
      visit(child, container);
    }
  }

  private insert(obj: SpatialObject): void {
    this.insertIntoNode(this.root, obj);
  }

  private insertIntoNode(node: QuadNode, obj: SpatialObject): void {
    // If object doesn't fit in node, don't insert
    if (!this.boundsIntersect(node.bounds, obj.bounds)) {
      return;
    }

    // If node has children, try to insert into appropriate child
    if (node.children) {
      for (const child of node.children) {
        if (this.boundsIntersect(child.bounds, obj.bounds)) {
          this.insertIntoNode(child, obj);
        }
      }
      return;
    }

    // Add to this node
    node.objects.push(obj);

    // Split if necessary
    if (node.objects.length > this.maxObjects && node.level < this.maxLevels) {
      this.split(node);
    }
  }

  private split(node: QuadNode): void {
    const { bounds, level } = node;
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;

    node.children = [
      // Top-left
      { bounds: new Rectangle(bounds.x, bounds.y, halfW, halfH), objects: [], level: level + 1 },
      // Top-right  
      { bounds: new Rectangle(bounds.x + halfW, bounds.y, halfW, halfH), objects: [], level: level + 1 },
      // Bottom-left
      { bounds: new Rectangle(bounds.x, bounds.y + halfH, halfW, halfH), objects: [], level: level + 1 },
      // Bottom-right
      { bounds: new Rectangle(bounds.x + halfW, bounds.y + halfH, halfW, halfH), objects: [], level: level + 1 }
    ];

    // Redistribute objects to children
    for (const obj of node.objects) {
      for (const child of node.children) {
        if (this.boundsIntersect(child.bounds, obj.bounds)) {
          child.objects.push(obj);
        }
      }
    }

    // Clear parent objects
    node.objects = [];
  }

  private queryNode(node: QuadNode, queryBounds: Rectangle, results: SpatialObject[]): void {
    if (!this.boundsIntersect(node.bounds, queryBounds)) {
      return;
    }

    // Add objects from this node
    for (const obj of node.objects) {
      if (this.boundsIntersect(obj.bounds, queryBounds)) {
        results.push(obj);
      }
    }

    // Query children
    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, queryBounds, results);
      }
    }
  }

  private boundsIntersect(a: Rectangle, b: Rectangle): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  private distanceToRect(point: Point, rect: Rectangle): number {
    const dx = Math.max(0, Math.max(rect.x - point.x, point.x - (rect.x + rect.width)));
    const dy = Math.max(0, Math.max(rect.y - point.y, point.y - (rect.y + rect.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }
}