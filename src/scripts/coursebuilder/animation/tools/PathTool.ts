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
  private isShiftHeld = false;
  private constraintDirection: 'horizontal' | 'vertical' | null = null;
  private startingPosition: Point = new Point(0, 0);
  
  constructor() {
    super("path", "crosshair");
    this.setupKeyboardListeners();
  }
  
  onActivate(): void {
  }

  onDeactivate(): void {
    this.reset();
    this.removeKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
  }

  private removeKeyboardListeners(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift' && !this.isShiftHeld) {
      this.isShiftHeld = true;
      // Reset constraint direction when shift is first pressed
      this.constraintDirection = null;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.isShiftHeld = false;
      this.constraintDirection = null;
    }
  };

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    // Find object at click position
    const globalPt = event.global;
    const local = container.toLocal(globalPt);
    
    console.log('🎯 PathTool: Pointer down at global:', globalPt, 'local:', local);
    
    this.activeObject = this.findObjectAt(globalPt, container);
    console.log('🎯 PathTool: Found object:', this.activeObject?.constructor?.name || 'none', this.activeObject);
    
    if (!this.activeObject) {
      console.log('🎯 PathTool: No object found, aborting');
      return;
    }

    
    // Find scene - add more debugging
    const allScenes = animationState.getScenes();
    console.log('🎯 PathTool: Total scenes available:', allScenes.length);
    allScenes.forEach((s, index) => {
      const bounds = s.getGlobalBounds();
      console.log(`🎯 PathTool: Scene ${index} (${s.getId()}):`, bounds);
    });
    
    const scene = animationState.findSceneAt(globalPt);
    console.log('🎯 PathTool: Found scene:', scene?.getId() || 'none');
    this.activeSceneId = scene?.getId() || null;
    if (!this.activeSceneId || !scene) {
      console.log('🎯 PathTool: No scene found, aborting');
      console.log('🎯 PathTool: Click point was:', globalPt);
      return;
    }

    // Start path creation - use scene-relative coordinates
    this.isDragging = true;
    this.pathPoints = [];
    this.lastPointerPosition.copyFrom(local);
    this.startingPosition.copyFrom(local);
    this.constraintDirection = null; // Reset constraint direction on new drag
    
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
    let constrainedLocal = new Point(local.x, local.y);
    
    // Apply shift key constraints for straight lines
    if (this.isShiftHeld) {
      // Determine constraint direction based on initial movement if not set
      if (!this.constraintDirection) {
        const deltaX = Math.abs(local.x - this.startingPosition.x);
        const deltaY = Math.abs(local.y - this.startingPosition.y);
        
        // Only set direction if there's significant movement
        if (deltaX > 5 || deltaY > 5) {
          this.constraintDirection = deltaX > deltaY ? 'horizontal' : 'vertical';
        }
      }
      
      // Apply the constraint
      if (this.constraintDirection === 'horizontal') {
        constrainedLocal.y = this.startingPosition.y;
      } else if (this.constraintDirection === 'vertical') {
        constrainedLocal.x = this.startingPosition.x;
      }
    }
    
    // Calculate delta movement using constrained position
    const dx = constrainedLocal.x - this.lastPointerPosition.x;
    const dy = constrainedLocal.y - this.lastPointerPosition.y;
    
    // Move object by delta - this is smooth like SelectionTool
    if (this.activeObject.position) {
      this.activeObject.position.x += dx;
      this.activeObject.position.y += dy;
    }
    
    // Update last position for next delta calculation using constrained position
    this.lastPointerPosition.copyFrom(constrainedLocal);
    
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

  // Cleanup method to remove event listeners when tool is destroyed
  destroy(): void {
    this.removeKeyboardListeners();
  }

  private findObjectAt(globalPoint: Point, rootContainer: Container): any {
    console.log('🔍 PathTool: Searching for object at global point:', globalPoint);
    
    // First search in scene content containers
    const scenes = animationState.getScenes();
    console.log('🔍 PathTool: Found', scenes.length, 'scenes to search');
    
    for (const scene of scenes) {
      const contentContainer = scene.getContentContainer();
      if (contentContainer) {
        console.log('🔍 PathTool: Searching in scene', scene.getId(), 'content container with', contentContainer.children.length, 'children');
        const result = this.searchInContainer(contentContainer, globalPoint);
        if (result) {
          console.log('🔍 PathTool: Found object in scene:', result.constructor.name, result);
          return result;
        }
      }
    }
    
    // Then search in the main canvas
    console.log('🔍 PathTool: Searching in root container with', rootContainer.children.length, 'children');
    const result = this.searchInContainer(rootContainer, globalPoint);
    if (result) {
      console.log('🔍 PathTool: Found object in root container:', result.constructor.name, result);
    } else {
      console.log('🔍 PathTool: No object found in root container');
    }
    return result;
  }


  private searchInContainer(container: Container, localPoint: Point): any {
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];
      
      if (!child.visible) continue;
      
      // Skip scene controls and scene roots to avoid selecting scenes themselves
      if ((child as any).__sceneControl || (child as any).__sceneRef) continue;
      
      // Check containers first (recursive)
      if (child instanceof Container && child.children.length > 0) {
        // For scene content containers, use the correct coordinate system
        let childLocalPoint = localPoint;
        if ((child as any).__sceneContent) {
          // This is a scene content container - convert coordinates properly  
          try {
            childLocalPoint = child.toLocal(container.toGlobal(localPoint));
          } catch {
            childLocalPoint = localPoint;
          }
        }
        
        const found = this.searchInContainer(child as Container, childLocalPoint);
        if (found) return found;
      }
      
      // Check if point hits this object
      try {
        const bounds = child.getBounds();
        if (localPoint.x >= bounds.x && localPoint.x <= bounds.x + bounds.width &&
            localPoint.y >= bounds.y && localPoint.y <= bounds.y + bounds.height) {
          // Found a valid object - make sure it's not a scene or scene control
          if (!(child as any).__sceneRef && !(child as any).__sceneControl) {
            return child;
          }
        }
      } catch {
        // Skip if bounds check fails
      }
    }
    return null;
  }

  private createAnimation(): void {
    if (!this.activeObject || !this.activeSceneId || this.pathPoints.length < 2) return;
    
    // Find the scene and register the animation path
    const scene = animationState.getScenes().find(s => s.getId() === this.activeSceneId);
    if (scene) {
      // Ensure object has an ID for tracking
      const objectId = (this.activeObject as any).objectId || `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      (this.activeObject as any).objectId = objectId;
      
      // Check if object is already in the scene to avoid double-adding
      const isAlreadyInScene = scene.containsObject(this.activeObject);
      
      if (!isAlreadyInScene) {
        // Add the object to the scene - this moves it from the main drawing layer
        // into the scene's content container where it can be properly animated
        console.log('🎯 PathTool: Adding object to scene content container');
        scene.addObject(this.activeObject);
      } else {
        console.log('🎯 PathTool: Object already in scene, adding trajectory');
      }
      
      // Mark object as having a trajectory for layers panel display
      (this.activeObject as any).__hasTrajectory = true;
      (this.activeObject as any).__trajectoryId = objectId;
      
      // Use path points directly as drawn
      const pathToUse = this.pathPoints;

      // Register the animation path with the scene using scene-relative coordinates
      scene.addAnimationPathSceneRelative(objectId, pathToUse);
      
      console.log('🎯 PathTool: Animation created for object', objectId, 'with', pathToUse.length, 'points');
      
      // Notify layers panel of the change to refresh the display
      try {
        document.dispatchEvent(new CustomEvent('displayObject:updated', { 
          detail: { id: objectId, object: this.activeObject } 
        }));
        // Also force a refresh of the layers panel to ensure scene children are shown
        const layersPanel = (window as any).layersPanel;
        if (layersPanel && layersPanel.refresh) {
          setTimeout(() => layersPanel.refresh(), 100);
        }
      } catch {}
      
    } else {
      console.warn(`🎯 PathTool: Scene ${this.activeSceneId} not found`);
    }
  }

  private reset(): void {
    this.activeObject = null;
    this.activeSceneId = null;
    this.pathPoints = [];
    this.isDragging = false;
    this.constraintDirection = null;
  }




}
