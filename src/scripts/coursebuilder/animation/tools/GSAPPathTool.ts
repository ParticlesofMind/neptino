import { Point, Container, FederatedPointerEvent } from 'pixi.js';
import { BaseTool } from '../../../coursebuilder/tools/ToolInterface';
import { animationState } from '../AnimationState';
import { GSAPAnimationManager, enhanceSceneWithGSAP } from '../GSAPAnimationManager';

/**
 * Enhanced PathTool with GSAP integration for creating advanced animations
 */
export class GSAPPathTool extends BaseTool {
  private activeObject: any = null;
  private activeSceneId: string | null = null;
  private pathPoints: Point[] = [];
  private isDragging = false;
  private lastPointerPosition: Point = new Point(0, 0);
  private gsapManagers: Map<string, GSAPAnimationManager> = new Map();
  
  constructor() {
    super("gsap-path", "crosshair");
  }
  
  onActivate(): void {
    console.log('🎯 GSAP PathTool activated - Enhanced animations available');
  }

  onDeactivate(): void {
    this.reset();
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    // Find object at click position
    const globalPt = event.global;
    const local = container.toLocal(globalPt);
    
    this.activeObject = this.findObjectAt(globalPt, container);
    if (!this.activeObject) {
      return;
    }

    // Find scene
    const scene = animationState.findSceneAt(local);
    this.activeSceneId = scene?.getId() || null;
    if (!this.activeSceneId || !scene) {
      return;
    }

    // Create or get GSAP manager for this scene
    let gsapManager = this.gsapManagers.get(this.activeSceneId);
    if (!gsapManager) {
      gsapManager = enhanceSceneWithGSAP(scene);
      this.gsapManagers.set(this.activeSceneId, gsapManager);
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
    }
    
    // Create enhanced GSAP animation
    if (this.pathPoints.length >= 2) {
      this.createGSAPAnimation();
    }
    
    // Clear live preview after committing
    const sceneFinal = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    try { sceneFinal?.clearLivePathPreview(); } catch {}
    this.reset();
  }

  updateSettings(_settings: any): void {
    // No settings needed for basic functionality
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

  private createGSAPAnimation(): void {
    if (!this.activeObject || !this.activeSceneId || this.pathPoints.length < 2) return;
    
    // Find the scene and GSAP manager
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    const gsapManager = this.gsapManagers.get(this.activeSceneId);
    
    if (!scene || !gsapManager) {
      console.warn(`🎯 GSAP PathTool: Scene or GSAP manager not found for ${this.activeSceneId}`);
      return;
    }
    
    // Ensure object has an ID for tracking
    const objectId = (this.activeObject as any).objectId || `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    (this.activeObject as any).objectId = objectId;
    
    // Add the object to the scene if it's not already there
    if (this.activeObject.parent !== scene.getContentContainer()) {
      scene.addObject(this.activeObject);
    }
    
    // Simplify the path for optimal animation
    const simplified = this.simplifyPath(this.pathPoints, scene.getDuration());
    
    // Create GSAP path animation with enhanced features
    gsapManager.animateObjectAlongPath(this.activeObject, simplified, {
      duration: scene.getDuration() / 1000,
      ease: 'power2.inOut',
      autoRotate: false, // Can be configured
      onComplete: () => {
        console.log(`✅ GSAP animation completed for object ${objectId}`);
      }
    });
    
    // Also register with the native scene system for compatibility
    scene.addAnimationPathSceneRelative(objectId, simplified);
    
    console.log(`🎯 Created enhanced GSAP animation for object ${objectId} with ${simplified.length} points`);
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
    // Optimize for GSAP smooth animations: fewer anchors, smoother paths
    if (durationMs <= 3000) return 4;   // 3s → ~4 anchors total
    if (durationMs <= 5000) return 6;   // 5s → ~6 anchors
    return 8;                           // 10s+ → ~8 anchors
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

  // Advanced animation creation methods

  /**
   * Create a bouncy entrance animation for objects
   */
  createBounceEntrance(objects: Container[]): void {
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    const gsapManager = this.gsapManagers.get(this.activeSceneId || '');
    
    if (scene && gsapManager) {
      gsapManager.createEntranceAnimation(objects, 'bounce', {
        stagger: 0.15,
        duration: 1.2
      });
    }
  }

  /**
   * Create elastic scale animation
   */
  createElasticScale(objects: Container[]): void {
    const gsapManager = this.gsapManagers.get(this.activeSceneId || '');
    
    if (gsapManager) {
      objects.forEach(obj => {
        gsapManager.animateObjectProperties(obj, {
          scale: 1.2,
          duration: 0.5,
          ease: 'elastic.out(1, 0.3)',
          yoyo: true,
          repeat: 1
        });
      });
    }
  }

  /**
   * Get available GSAP easings for UI
   */
  getAvailableEasings(): string[] {
    return GSAPAnimationManager.getAvailableEasings();
  }

  /**
   * Clean up GSAP managers
   */
  cleanup(): void {
    this.gsapManagers.forEach(manager => manager.destroy());
    this.gsapManagers.clear();
  }
}