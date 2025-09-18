import { Point, Container, FederatedPointerEvent } from 'pixi.js';
import { BaseTool } from '../../../coursebuilder/tools/ToolInterface';
import { animationState } from '../AnimationState';

/**
 * Simple PathTool for creating animation paths by dragging objects
 */
export class PathTool extends BaseTool {
  private activeObject: any = null;
  private activeSceneId: string | null = null;
  private pathPoints: Point[] = [];
  private isDragging = false;
  private lastPointerPosition: Point = new Point(0, 0);
  
  constructor() {
    super("path", "crosshair");
  }
  
  onActivate(): void {
    console.log('🎯 PathTool: Activated');
  }

  onDeactivate(): void {
    console.log('🎯 PathTool: Deactivated');
    this.reset();
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    console.log('🎯 PathTool: Pointer down');
    
    // Find object at click position
    const globalPt = event.global;
    const local = container.toLocal(globalPt);
    
    this.activeObject = this.findObjectAt(globalPt, container);
    if (!this.activeObject) {
      console.log('🎯 PathTool: No object found');
      return;
    }

    console.log(`🎯 PathTool: Selected ${this.activeObject.constructor.name}`);
    
    // Find scene
    const scene = animationState.findSceneAt(local);
    this.activeSceneId = scene?.getId() || null;
    if (!this.activeSceneId || !scene) {
      console.log('🎯 PathTool: No scene found');
      return;
    }

    // Start path creation - use scene-relative coordinates
    this.isDragging = true;
    this.pathPoints = [];
    this.lastPointerPosition.copyFrom(local);
    
    // Record starting point based on object's current center position in scene coordinates
    const objectBounds = this.activeObject.getBounds();
    const objectCenterGlobal = new Point(
      objectBounds.x + objectBounds.width / 2,
      objectBounds.y + objectBounds.height / 2
    );
    const sceneContentLocal = scene.getContentContainer().toLocal(objectCenterGlobal);
    this.pathPoints.push(new Point(sceneContentLocal.x, sceneContentLocal.y));
    
    console.log(`🎯 PathTool: Started path at object center scene-relative (${sceneContentLocal.x.toFixed(1)}, ${sceneContentLocal.y.toFixed(1)})`);
    console.log(`🎯 PathTool: Object bounds: x=${objectBounds.x.toFixed(1)}, y=${objectBounds.y.toFixed(1)}, w=${objectBounds.width.toFixed(1)}, h=${objectBounds.height.toFixed(1)}`);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDragging || !this.activeObject || !this.activeSceneId) return;

    const local = container.toLocal(event.global);
    
    // Calculate delta movement like SelectionTool does
    const dx = local.x - this.lastPointerPosition.x;
    const dy = local.y - this.lastPointerPosition.y;
    
    // Move object by delta - this is smooth like SelectionTool
    if (this.activeObject.position) {
      this.activeObject.position.x += dx;
      this.activeObject.position.y += dy;
    }
    
    // Update last position for next delta calculation
    this.lastPointerPosition.copyFrom(local);
    
    // Add point to path if we've moved enough (minimum distance to avoid too many points)
    // Record path based on the object's actual center position after movement
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (scene) {
      // Get the object's current center position after the delta movement
      const objectBounds = this.activeObject.getBounds();
      const objectCenterGlobal = new Point(
        objectBounds.x + objectBounds.width / 2,
        objectBounds.y + objectBounds.height / 2
      );
      const sceneContentLocal = scene.getContentContainer().toLocal(objectCenterGlobal);
      
      const lastPoint = this.pathPoints[this.pathPoints.length - 1];
      const distance = Math.hypot(sceneContentLocal.x - lastPoint.x, sceneContentLocal.y - lastPoint.y);
      
      if (distance > 5) {
        this.pathPoints.push(new Point(sceneContentLocal.x, sceneContentLocal.y));
        // Real-time trajectory preview while dragging
        scene.showLivePathPreview(this.pathPoints);
      } else {
        // Still update preview to reflect object moved slightly
        scene.showLivePathPreview(this.pathPoints);
      }
    }
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    if (!this.isDragging || !this.activeObject || !this.activeSceneId) return;
    
    console.log('🎯 PathTool: Pointer up, finishing path');
    
    // Add final point based on object's final center position
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (scene) {
      const objectBounds = this.activeObject.getBounds();
      const objectCenterGlobal = new Point(
        objectBounds.x + objectBounds.width / 2,
        objectBounds.y + objectBounds.height / 2
      );
      const sceneContentLocal = scene.getContentContainer().toLocal(objectCenterGlobal);
      this.pathPoints.push(new Point(sceneContentLocal.x, sceneContentLocal.y));
      console.log(`🎯 PathTool: Final path point at object center (${sceneContentLocal.x.toFixed(1)}, ${sceneContentLocal.y.toFixed(1)})`);
    }
    
    // Create animation
    if (this.pathPoints.length >= 2) {
      this.createAnimation();
    }
    
    // Clear live preview after committing
    const sceneFinal = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    try { sceneFinal?.clearLivePathPreview(); } catch {}
    this.reset();
  }

  updateSettings(_settings: any): void {
    // No settings needed
  }

  private findObjectAt(globalPoint: Point, container: Container): any {
    const localPoint = container.toLocal(globalPoint);
    
    // Simple recursive search
    const search = (cont: Container): any => {
      for (let i = cont.children.length - 1; i >= 0; i--) {
        const child = cont.children[i];
        
        if (!child.visible) continue;
        
        // Check containers first
        if (child instanceof Container && child.children.length > 0) {
          const found = search(child as Container);
          if (found) return found;
        }
        
        // Check bounds
        try {
          const bounds = child.getBounds();
          if (localPoint.x >= bounds.x && localPoint.x <= bounds.x + bounds.width &&
              localPoint.y >= bounds.y && localPoint.y <= bounds.y + bounds.height) {
            return child;
          }
        } catch {
          // Skip if bounds check fails
        }
      }
      return null;
    };
    
    return search(container);
  }

  private createAnimation(): void {
    if (!this.activeObject || !this.activeSceneId || this.pathPoints.length < 2) return;
    
    console.log(`🎯 PathTool: Creating animation with ${this.pathPoints.length} points`);
    
    // Find the scene and register the animation path
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (scene) {
      // Ensure object has an ID for tracking
      const objectId = (this.activeObject as any).objectId || `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      (this.activeObject as any).objectId = objectId;
      
      // Add the object to the scene if it's not already there
      if (this.activeObject.parent !== scene.getContentContainer()) {
        scene.addObject(this.activeObject);
      }
      
      // Use path points directly as they are already in scene-relative coordinates
      const simplified = this.simplifyPath(this.pathPoints, scene.getDuration());

      console.log(`🎯 PathTool: Using scene-relative path points:`);
      console.log(`🎯   - Original path points:`, this.pathPoints.slice(0, 3).map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));
      console.log(`🎯   - Simplified points:`, simplified.slice(0, 3).map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));

      // Register the animation path with the scene using scene-relative coordinates
      scene.addAnimationPathSceneRelative(objectId, simplified);
      
      console.log(`🎯 PathTool: Registered animation path for object ${objectId} in scene ${this.activeSceneId}`);
      console.log(`🎯 PathTool: Simplified from ${this.pathPoints.length} to ${simplified.length} anchors`);
    } else {
      console.warn(`🎯 PathTool: Scene ${this.activeSceneId} not found`);
    }
  }

  private reset(): void {
    this.activeObject = null;
    this.activeSceneId = null;
    this.pathPoints = [];
    this.isDragging = false;
  }

  private simplifyPath(points: Point[], durationMs: number): Point[] {
    const requiredCount = this.getDesiredAnchorCount(durationMs);
    if (points.length <= requiredCount) {
      return points.map(p => new Point(p.x, p.y));
    }

    const cumulative: number[] = new Array(points.length).fill(0);
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      total += segLen;
      cumulative[i] = total;
    }

    if (total === 0) {
      return [new Point(points[0].x, points[0].y), new Point(points[points.length - 1].x, points[points.length - 1].y)];
    }

    const step = total / (requiredCount - 1);
    const simplified: Point[] = [];
    for (let i = 0; i < requiredCount; i++) {
      const targetDistance = i * step;
      simplified.push(this.samplePointAtDistance(points, cumulative, targetDistance));
    }

    // Ensure exact endpoints
    simplified[0] = new Point(points[0].x, points[0].y);
    simplified[simplified.length - 1] = new Point(points[points.length - 1].x, points[points.length - 1].y);

    return simplified;
  }

  private getDesiredAnchorCount(durationMs: number): number {
    // Optimize for clarity: few well-spaced anchors including endpoints
    if (durationMs <= 3000) return 5;   // 3s → ~5 anchors total
    if (durationMs <= 5000) return 7;   // 5s → ~7 anchors
    return 9;                           // 10s → ~9 anchors
  }

  private samplePointAtDistance(points: Point[], cumulative: number[], target: number): Point {
    if (target <= 0) {
      return new Point(points[0].x, points[0].y);
    }
    const totalLength = cumulative[cumulative.length - 1];
    if (target >= totalLength) {
      const last = points[points.length - 1];
      return new Point(last.x, last.y);
    }

    let index = 1;
    while (index < cumulative.length && cumulative[index] < target) {
      index++;
    }

    const prevIndex = Math.max(0, index - 1);
    const segmentLength = cumulative[index] - cumulative[prevIndex];
    const segmentT = segmentLength === 0 ? 0 : (target - cumulative[prevIndex]) / segmentLength;
    const start = points[prevIndex];
    const end = points[index];
    return new Point(
      start.x + (end.x - start.x) * segmentT,
      start.y + (end.y - start.y) * segmentT
    );
  }
}
