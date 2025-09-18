/**
 * SceneTool
 * Draw rectangles to define animation scenes with controls
 */

import { Container, FederatedPointerEvent, Graphics, Point } from 'pixi.js';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState } from '../AnimationState';
import { Scene, SceneBounds } from '../Scene';

export class SceneTool extends BaseTool {
  private start: Point | null = null;
  private preview: Graphics | null = null;
  // Minimum scene dimensions to ensure usability
  private readonly minWidth = 100;
  private readonly minHeight = 60;

  constructor() {
    super('scene', 'crosshair');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;
    const p = container.toLocal(event.global);
    this.start = new Point(p.x, p.y);
    
    console.log('🎬 SceneTool: Starting scene creation at', this.start);
    
    // Create preview rectangle on UI layer for clarity
    const ui = animationState.getUiLayer();
    if (ui) {
      this.preview = new Graphics();
      this.preview.alpha = 0.8;
      this.preview.zIndex = 1000; // Ensure preview is on top
      ui.addChild(this.preview);
      
      // Draw initial preview at click point
      this.preview.roundRect(this.start.x, this.start.y, 1, 1, 8)
        .stroke({ color: 0x4a79a4, width: 2 })
        .fill({ color: 0x4a79a4, alpha: 0.1 });
      
      console.log('🎬 SceneTool: Preview created on UI layer with initial size');
    } else {
      console.warn('🎬 SceneTool: No UI layer available for preview');
    }
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start || !this.preview) return;
    
    const p = container.toLocal(event.global);
    const x = Math.min(this.start.x, p.x);
    const y = Math.min(this.start.y, p.y);
    const w = Math.max(1, Math.abs(p.x - this.start.x)); // Ensure minimum 1px width
    const h = Math.max(1, Math.abs(p.y - this.start.y)); // Ensure minimum 1px height
    
    // Show preview with actual dragged dimensions
    this.preview.clear();
    this.preview.roundRect(x, y, w, h, 8)
      .stroke({ color: 0x4a79a4, width: 2 })
      .fill({ color: 0x4a79a4, alpha: 0.1 });
      
    console.log(`🎬 SceneTool: Preview updated - (${x.toFixed(1)}, ${y.toFixed(1)}) ${w.toFixed(1)}x${h.toFixed(1)}`);
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive || !this.start) { this.cleanup(); return; }
    const p = container.toLocal(event.global);
    const x = Math.min(this.start.x, p.x);
    const y = Math.min(this.start.y, p.y);
    const w = Math.abs(p.x - this.start.x);
    const h = Math.abs(p.y - this.start.y);
    this.cleanup();
    
    // Require meaningful drag distance to create scene
    if (w < 20 || h < 20) {
      console.log('🎬 Scene creation cancelled - insufficient drag distance');
      return;
    }

    // CRITICAL FIX: Clear existing scenes to prevent UI fragmentation
    // Only one scene should be active at a time to maintain cohesive interface
    animationState.clearScenes();
    console.log('🎬 Creating new scene, cleared previous scenes');

    const bounds = this.normalizeBounds(x, y, w, h);
    const scene = new Scene(bounds);
    scene.setLoop(animationState.getLoop());
    scene.setDuration(animationState.getSceneDuration());
    animationState.addScene(scene);
    try { scene.setSelected(true); } catch {}
    console.log('🎬 New scene created:', bounds);
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
    console.log('🎬 SceneTool: Cleaned up preview');
  }

  onActivate(): void { 
    super.onActivate(); 
    console.log('🎬 SceneTool: Activated - ready for drag-to-create');
  }
  
  onDeactivate(): void { 
    super.onDeactivate(); 
    this.cleanup();
    console.log('🎬 SceneTool: Deactivated');
  }
}
