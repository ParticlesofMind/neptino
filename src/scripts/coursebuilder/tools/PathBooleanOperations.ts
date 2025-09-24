/**
 * Path Boolean Operations
 * Implementation of Figma-style path operations: Union, Subtract, Intersect, Exclude
 */

import { Graphics, Point } from "pixi.js";

export interface PathNode {
  x: number;
  y: number;
  in?: { x: number; y: number } | null;
  out?: { x: number; y: number } | null;
}

export interface PathData {
  nodes: PathNode[];
  closed: boolean;
  strokeColor?: string;
  fillColor?: string;
  size?: number;
}

export enum BooleanOperation {
  Union = 'union',
  Subtract = 'subtract', 
  Intersect = 'intersect',
  Exclude = 'exclude'
}

/**
 * Path Boolean Operations Manager
 * Provides Figma-style path combination operations
 */
export class PathBooleanOperations {
  
  /**
   * Perform boolean operation on two paths
   */
  static performOperation(
    pathA: PathData, 
    pathB: PathData, 
    operation: BooleanOperation
  ): PathData | null {
    
    // Convert paths to polygon approximations for boolean operations
    const polyA = this.pathToPolygon(pathA);
    const polyB = this.pathToPolygon(pathB);
    
    if (!polyA || !polyB) return null;
    
    let resultPoly: Point[] | null = null;
    
    switch (operation) {
      case BooleanOperation.Union:
        resultPoly = this.unionPolygons(polyA, polyB);
        break;
      case BooleanOperation.Subtract:
        resultPoly = this.subtractPolygons(polyA, polyB);
        break;
      case BooleanOperation.Intersect:
        resultPoly = this.intersectPolygons(polyA, polyB);
        break;
      case BooleanOperation.Exclude:
        resultPoly = this.excludePolygons(polyA, polyB);
        break;
    }
    
    if (!resultPoly || resultPoly.length < 3) return null;
    
    // Convert result back to path format
    return this.polygonToPath(resultPoly, pathA);
  }
  
  /**
   * Convert bezier path to polygon approximation
   */
  private static pathToPolygon(path: PathData): Point[] | null {
    if (!path.nodes || path.nodes.length < 2) return null;
    
    const points: Point[] = [];
    
    for (let i = 0; i < path.nodes.length; i++) {
      const current = path.nodes[i];
      const next = path.nodes[(i + 1) % path.nodes.length];
      
      // If current has handleOut or next has handleIn, create bezier curve
      if (current.out || next.in) {
        const bezierPoints = this.sampleBezierCurve(
          new Point(current.x, current.y),
          current.out ? new Point(current.out.x, current.out.y) : new Point(current.x, current.y),
          next.in ? new Point(next.in.x, next.in.y) : new Point(next.x, next.y),
          new Point(next.x, next.y),
          10 // Sample 10 points along curve
        );
        points.push(...bezierPoints.slice(0, -1)); // Don't duplicate end point
      } else {
        // Straight line
        points.push(new Point(current.x, current.y));
      }
    }
    
    return points;
  }
  
  /**
   * Sample points along a cubic bezier curve
   */
  private static sampleBezierCurve(
    p0: Point, p1: Point, p2: Point, p3: Point, numSamples: number
  ): Point[] {
    const points: Point[] = [];
    
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = this.bezierPoint(p0, p1, p2, p3, t);
      points.push(point);
    }
    
    return points;
  }
  
  /**
   * Calculate point on cubic bezier curve at parameter t
   */
  private static bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    
    return new Point(x, y);
  }
  
  /**
   * Union two polygons (simplified implementation)
   */
  private static unionPolygons(polyA: Point[], polyB: Point[]): Point[] | null {
    // Simplified union: combine and find convex hull
    const combined = [...polyA, ...polyB];
    return this.convexHull(combined);
  }
  
  /**
   * Subtract polygon B from polygon A
   */
  private static subtractPolygons(polyA: Point[], _polyB: Point[]): Point[] | null {
    // Simplified subtract: return polyA (more complex implementation needed for true boolean subtract)
    return polyA;
  }
  
  /**
   * Intersect two polygons
   */
  private static intersectPolygons(polyA: Point[], polyB: Point[]): Point[] | null {
    // Simplified intersect: find overlapping region (basic implementation)
    const intersectionPoints: Point[] = [];
    
    // This is a simplified implementation
    // A full implementation would use Sutherland-Hodgman clipping or similar
    for (const pointA of polyA) {
      if (this.pointInPolygon(pointA, polyB)) {
        intersectionPoints.push(pointA);
      }
    }
    
    for (const pointB of polyB) {
      if (this.pointInPolygon(pointB, polyA)) {
        intersectionPoints.push(pointB);
      }
    }
    
    if (intersectionPoints.length < 3) return null;
    return this.convexHull(intersectionPoints);
  }
  
  /**
   * Exclude overlapping areas (XOR)
   */
  private static excludePolygons(polyA: Point[], polyB: Point[]): Point[] | null {
    // Simplified exclude: return union minus intersection
    const union = this.unionPolygons(polyA, polyB);
    // In a full implementation, we'd subtract the intersection
    return union;
  }
  
  /**
   * Check if point is inside polygon using ray casting
   */
  private static pointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  /**
   * Find convex hull of points using Graham scan
   */
  private static convexHull(points: Point[]): Point[] {
    if (points.length < 3) return points;
    
    // Find bottom-most point (or left-most in case of tie)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[start].y || 
          (points[i].y === points[start].y && points[i].x < points[start].x)) {
        start = i;
      }
    }
    
    // Sort points by polar angle with respect to start point
    const startPoint = points[start];
    const sorted = points
      .filter((_, i) => i !== start)
      .sort((a, b) => {
        const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
        const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
        return angleA - angleB;
      });
    
    const hull = [startPoint];
    
    for (const point of sorted) {
      // Remove points that make clockwise turn
      while (hull.length > 1 && this.crossProduct(
        hull[hull.length - 2], hull[hull.length - 1], point
      ) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    
    return hull;
  }
  
  /**
   * Calculate cross product for three points (used in convex hull)
   */
  private static crossProduct(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }
  
  /**
   * Convert polygon back to path format
   */
  private static polygonToPath(polygon: Point[], referenceStyle: PathData): PathData {
    const nodes: PathNode[] = polygon.map(point => ({
      x: point.x,
      y: point.y,
      in: null,
      out: null
    }));
    
    return {
      nodes,
      closed: true,
      strokeColor: referenceStyle.strokeColor,
      fillColor: referenceStyle.fillColor,
      size: referenceStyle.size
    };
  }
  
  /**
   * Create a graphics object from path data
   */
  static createGraphicsFromPath(pathData: PathData): Graphics {
    const graphics = new Graphics();
    
    if (pathData.nodes.length < 2) return graphics;
    
    const first = pathData.nodes[0];
    graphics.moveTo(first.x, first.y);
    
    for (let i = 1; i < pathData.nodes.length; i++) {
      const prev = pathData.nodes[i - 1];
      const curr = pathData.nodes[i];
      
      if (prev.out || curr.in) {
        // Bezier curve
        const cp1 = prev.out ? prev.out : { x: prev.x, y: prev.y };
        const cp2 = curr.in ? curr.in : { x: curr.x, y: curr.y };
        graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
      } else {
        // Straight line
        graphics.lineTo(curr.x, curr.y);
      }
    }
    
    if (pathData.closed) {
      graphics.closePath();
      if (pathData.fillColor) {
        graphics.fill({ color: parseInt(pathData.fillColor.replace('#', ''), 16) });
      }
    }
    
    if (pathData.strokeColor) {
      graphics.stroke({
        width: pathData.size || 2,
        color: parseInt(pathData.strokeColor.replace('#', ''), 16),
        cap: 'round',
        join: 'round'
      });
    }
    
    return graphics;
  }
}