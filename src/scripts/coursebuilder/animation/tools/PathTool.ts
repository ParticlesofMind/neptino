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
    this.activeSceneId = animationState.findSceneAt(local)?.getId() || null;
    if (!this.activeSceneId) {
      console.log('🎯 PathTool: No scene found');
      return;
    }

    // Start path creation - use simple approach like SelectionTool
    this.isDragging = true;
    this.pathPoints = [];
    this.lastPointerPosition.copyFrom(local);
    
    // Record starting point in container coordinates
    this.pathPoints.push(new Point(local.x, local.y));
    
    console.log(`🎯 PathTool: Started path at (${local.x.toFixed(1)}, ${local.y.toFixed(1)})`);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDragging || !this.activeObject) return;

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
    const lastPoint = this.pathPoints[this.pathPoints.length - 1];
    const distance = Math.hypot(local.x - lastPoint.x, local.y - lastPoint.y);
    
    if (distance > 5) {
      this.pathPoints.push(new Point(local.x, local.y));
      console.log(`🎯 PathTool: Added path point (${local.x.toFixed(1)}, ${local.y.toFixed(1)})`);
    }
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDragging || !this.activeObject || !this.activeSceneId) return;
    
    console.log('🎯 PathTool: Pointer up, finishing path');
    
    // Add final point
    const local = container.toLocal(event.global);
    this.pathPoints.push(new Point(local.x, local.y));
    
    // Create animation
    if (this.pathPoints.length >= 2) {
      this.createAnimation();
    }
    
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
      if (this.activeObject.parent !== scene.getRoot()) {
        scene.addObject(this.activeObject);
      }
      
      // Convert path points from container space to scene-local space
      // The scene root container is positioned at (sceneBounds.x, sceneBounds.y)
      // Objects within the scene are positioned relative to the scene's root container
      // So we need to subtract the scene's position to get scene-local coordinates
      const sceneContainer = scene.getRoot();
      const sceneLocalPoints = this.pathPoints.map(p => {
        // Convert from container coordinates to scene-local coordinates
        // by subtracting the scene's position on the canvas
        return new Point(p.x - sceneContainer.x, p.y - sceneContainer.y);
      });
      
      // Register the animation path with the scene
      scene.addAnimationPath(objectId, sceneLocalPoints);
      
      console.log(`🎯 PathTool: Registered animation path for object ${objectId} in scene ${this.activeSceneId}`);
      console.log(`🎯 PathTool: Scene container position: (${sceneContainer.x.toFixed(1)}, ${sceneContainer.y.toFixed(1)})`);
      console.log(`🎯 PathTool: Original path points:`, this.pathPoints.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));
      console.log(`🎯 PathTool: Scene-local points:`, sceneLocalPoints.map(p => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`));
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
}