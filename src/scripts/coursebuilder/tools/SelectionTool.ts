/**
 * Selection Tool
 * Allows selecting and manipulating existing objects
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

export class SelectionTool extends BaseTool {
  private selectedObject: Graphics | null = null;
  public isDragging: boolean = false; // Changed to public so ToolManager can access it
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super('selection', 'default');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    console.log(`🎯 SELECTION: Pointer down at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`);
    
    // Find the object under the pointer
    const hitObject = this.findHitObject(event, container);
    
    if (hitObject && hitObject !== container) {
      console.log(`🎯 SELECTION: Found object to select`);
      this.selectObject(hitObject);
      this.isDragging = true;
      
      // Calculate drag offset
      const point = event.global;
      this.dragOffset = {
        x: point.x - hitObject.x,
        y: point.y - hitObject.y
      };
      console.log(`🎯 SELECTION: Started dragging with offset (${Math.round(this.dragOffset.x)}, ${Math.round(this.dragOffset.y)})`);
    } else {
      console.log(`🎯 SELECTION: No object found, deselecting`);
      this.deselectObject();
    }
  }

  onPointerMove(event: FederatedPointerEvent, _container: Container): void {
    // Only respond to move events when actively dragging
    if (this.isDragging && this.selectedObject) {
      const point = event.global;
      this.selectedObject.x = point.x - this.dragOffset.x;
      this.selectedObject.y = point.y - this.dragOffset.y;
    }
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    this.isDragging = false;
  }

  private findHitObject(event: FederatedPointerEvent, container: Container): Graphics | null {
    // Simple hit testing - check all children
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i] as Graphics;
      if (child.eventMode === 'static' || child.eventMode === 'dynamic') {
        const bounds = child.getBounds();
        const point = event.global;
        
        // Check if point is within bounds
        if (point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
          return child;
        }
      }
    }
    return null;
  }

  private selectObject(object: Graphics): void {
    this.deselectObject(); // Clear previous selection
    this.selectedObject = object;
    
    // Visual feedback for selection (you can customize this)
    object.alpha = 0.8;
    console.log(`🎯 SELECTION: Object selected and highlighted`);
  }

  private deselectObject(): void {
    if (this.selectedObject) {
      this.selectedObject.alpha = 1.0;
      this.selectedObject = null;
      console.log(`🎯 SELECTION: Object deselected`);
    }
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.deselectObject();
  }
}
