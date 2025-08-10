/**
 * Selection Tool
 * Allows selecting and manipulating existing objects
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

export class SelectionTool extends BaseTool {
  private selectedObject: Graphics | null = null;
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super('selection', 'default');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    // Find the object under the pointer
    const hitObject = this.findHitObject(event, container);
    
    if (hitObject && hitObject !== container) {
      this.selectObject(hitObject);
      this.isDragging = true;
      
      // Calculate drag offset
      const point = event.global;
      this.dragOffset = {
        x: point.x - hitObject.x,
        y: point.y - hitObject.y
      };
    } else {
      this.deselectObject();
    }
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (this.isDragging && this.selectedObject) {
      const point = event.global;
      this.selectedObject.x = point.x - this.dragOffset.x;
      this.selectedObject.y = point.y - this.dragOffset.y;
    }
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
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
    console.log('Object selected:', object);
  }

  private deselectObject(): void {
    if (this.selectedObject) {
      this.selectedObject.alpha = 1.0;
      this.selectedObject = null;
      console.log('Object deselected');
    }
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.deselectObject();
  }
}
