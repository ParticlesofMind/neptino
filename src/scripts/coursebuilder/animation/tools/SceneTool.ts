/**
 * SceneTool
 * Draw rectangles to define animation scenes with controls
 */

import { Container, FederatedPointerEvent, Graphics, Point } from 'pixi.js';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState } from '../AnimationState';
import { Scene, SceneBounds } from '../Scene';
import { ToolManager } from '../../tools/ToolManager';

export class SceneTool extends BaseTool {
  private start: Point | null = null;
  private preview: Graphics | null = null;
  private toolManager: ToolManager | null = null;
  // Minimum scene dimensions to ensure usability
  private readonly minWidth = 100;
  private readonly minHeight = 60;

  constructor(toolManager?: ToolManager) {
    super('scene', 'crosshair');
    this.toolManager = toolManager || null;
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    const p = container.toLocal(event.global);
    this.start = new Point(p.x, p.y);
    
    
    // Create preview rectangle on UI layer for clarity
    const ui = animationState.getUiLayer();
    if (ui) {
      this.preview = new Graphics();
      this.preview.alpha = 0.8;
      this.preview.zIndex = 1000; // Ensure preview is on top
      this.preview.name = 'scene-preview';
      (this.preview as any).__isVisualAid = true; // Mark for layer filtering
      ui.addChild(this.preview);
      
      // Draw initial preview at click point
      this.preview.roundRect(this.start.x, this.start.y, 1, 1, 8)
        .stroke({ color: 0x4a79a4, width: 2 })
        .fill({ color: 0x4a79a4, alpha: 0.1 });
      
    } else {
      console.warn('🎬 SceneTool: No UI layer available for preview');
    }
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start || !this.preview) return;
    
    const p = container.toLocal(event.global);
    
    // Get aspect ratio from tool settings
    let aspectRatio = 16/9; // default
    if (this.toolManager) {
      const settings = this.toolManager.getToolSettings();
      const sceneSettings = settings.scene || {};
      const ratioStr = (sceneSettings as any).aspectRatio || '16:9';
      const [w, h] = ratioStr.split(':').map((n: string) => parseInt(n));
      aspectRatio = w / h;
    }
    
    // Calculate the distance from start point to cursor
    const deltaX = p.x - this.start.x;
    const deltaY = p.y - this.start.y;
    const absWidth = Math.abs(deltaX);
    const absHeight = Math.abs(deltaY);
    
    // Determine which dimension to constrain based on the drag direction
    // Use the larger dimension and constrain the other to maintain aspect ratio
    let constrainedWidth: number;
    let constrainedHeight: number;
    
    if (absWidth * (1 / aspectRatio) >= absHeight) {
      // Width is the dominant dimension
      constrainedWidth = Math.max(100, absWidth); // minimum width
      constrainedHeight = constrainedWidth / aspectRatio;
    } else {
      // Height is the dominant dimension  
      constrainedHeight = Math.max(60, absHeight); // minimum height
      constrainedWidth = constrainedHeight * aspectRatio;
    }
    
    // Position rectangle to follow cursor direction
    // The rectangle should expand towards the cursor while maintaining aspect ratio
    let x: number, y: number;
    
    if (deltaX >= 0) {
      // Expanding to the right
      x = this.start.x;
    } else {
      // Expanding to the left
      x = this.start.x - constrainedWidth;
    }
    
    if (deltaY >= 0) {
      // Expanding downward
      y = this.start.y;
    } else {
      // Expanding upward
      y = this.start.y - constrainedHeight;
    }
    
    // Show preview with aspect-ratio constrained dimensions
    this.preview.clear();
    this.preview.roundRect(x, y, constrainedWidth, constrainedHeight, 8)
      .stroke({ color: 0x4a79a4, width: 2 })
      .fill({ color: 0x4a79a4, alpha: 0.1 });
      
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start) { this.cleanup(); return; }
    const p = container.toLocal(event.global);
    
    // Get aspect ratio from tool settings
    let aspectRatio = 16/9; // default
    let aspectRatioStr = '16:9';
    if (this.toolManager) {
      const settings = this.toolManager.getToolSettings();
      const sceneSettings = settings.scene || {};
      aspectRatioStr = (sceneSettings as any).aspectRatio || '16:9';
      const [w, h] = aspectRatioStr.split(':').map((n: string) => parseInt(n));
      aspectRatio = w / h;
    }
    
    // Calculate the distance from start point to cursor (same logic as preview)
    const deltaX = p.x - this.start.x;
    const deltaY = p.y - this.start.y;
    const absWidth = Math.abs(deltaX);
    const absHeight = Math.abs(deltaY);
    
    let constrainedWidth: number;
    let constrainedHeight: number;
    
    if (absWidth * (1 / aspectRatio) >= absHeight) {
      constrainedWidth = Math.max(100, absWidth);
      constrainedHeight = constrainedWidth / aspectRatio;
    } else {
      constrainedHeight = Math.max(60, absHeight);
      constrainedWidth = constrainedHeight * aspectRatio;
    }
    
    // Position rectangle to follow cursor direction (same as preview)
    let x: number, y: number;
    
    if (deltaX >= 0) {
      x = this.start.x;
    } else {
      x = this.start.x - constrainedWidth;
    }
    
    if (deltaY >= 0) {
      y = this.start.y;
    } else {
      y = this.start.y - constrainedHeight;
    }
    
    this.cleanup();
    
    // Require meaningful drag distance to create scene
    if (constrainedWidth < 100 || constrainedHeight < 60) {
      return;
    }

    // Allow multiple animation scenes to coexist
    // Deselect all existing scenes before selecting the new one
    const existingScenes = animationState.getScenes();
    existingScenes.forEach(existingScene => {
      try { existingScene.setSelected(false); } catch {}
    });

    const bounds = this.normalizeBounds(x, y, constrainedWidth, constrainedHeight);
    const scene = new Scene(bounds, undefined, aspectRatioStr);
    scene.setLoop(animationState.getLoop());
    scene.setDuration(animationState.getSceneDuration());
    animationState.addScene(scene);
    try { scene.setSelected(true); } catch {}
  }

  private normalizeBounds(x: number, y: number, width: number, height: number): SceneBounds {
    // Ensure minimum dimensions for usability
    const finalWidth = Math.max(this.minWidth, width);
    const finalHeight = Math.max(this.minHeight, height);

    return {
      x: x,
      y: y,
      width: finalWidth,
      height: finalHeight
    };
  }

  private cleanup(): void {
    this.start = null;
    if (this.preview) { 
      try { 
        if (this.preview.parent) {
          this.preview.parent.removeChild(this.preview);
        }
        this.preview.destroy(); 
      } catch (e) {
        console.warn('🎬 SceneTool: Error cleaning up preview:', e);
      }
    }
    this.preview = null;
  }

  onActivate(): void { 
    super.onActivate(); 
  }
  
  onDeactivate(): void { 
    super.onDeactivate(); 
    this.cleanup();
  }
}
