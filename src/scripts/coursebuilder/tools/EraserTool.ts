/**
 * Eraser Tool
 * Removes objects from the canvas
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

interface EraserSettings {
  size: number;
}

export class EraserTool extends BaseTool {
  private eraserCursor: Graphics | null = null;

  constructor() {
    super('eraser', 'none'); // We'll create a custom cursor
    this.settings = {
      size: 20
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.eraseAtPoint(event, container);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    this.updateCursorPosition(event);
    // Continue erasing while mouse is down
    this.eraseAtPoint(event, container);
  }

  onPointerUp(): void {
    // Nothing special needed for pointer up
  }

  onActivate(): void {
    super.onActivate();
    this.createEraserCursor();
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.removeEraserCursor();
  }

  private eraseAtPoint(event: FederatedPointerEvent, container: Container): void {
    const point = event.global;
    const eraserRadius = this.settings.size / 2;

    // Check all objects in the container
    for (let i = container.children.length - 1; i >= 0; i--) {
      const child = container.children[i];
      const bounds = child.getBounds();

      // Simple collision detection - check if eraser overlaps with object bounds
      if (this.circleRectCollision(
        point.x, point.y, eraserRadius,
        bounds.x, bounds.y, bounds.width, bounds.height
      )) {
        container.removeChild(child);
        child.destroy();
      }
    }
  }

  private circleRectCollision(
    circleX: number, circleY: number, radius: number,
    rectX: number, rectY: number, rectWidth: number, rectHeight: number
  ): boolean {
    // Find the closest point to the circle within the rectangle
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

    // Calculate the distance between the circle's center and this closest point
    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;

    // If the distance is less than the circle's radius, an intersection occurs
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (radius * radius);
  }

  private createEraserCursor(): void {
    // Create a visual cursor for the eraser
    this.eraserCursor = new Graphics();
    this.eraserCursor.circle(0, 0, this.settings.size / 2);
    this.eraserCursor.stroke({ width: 1, color: 0x000000 });
    this.eraserCursor.alpha = 0.5;

    // Add to document body as an overlay
    const cursorElement = document.createElement('div');
    cursorElement.style.position = 'fixed';
    cursorElement.style.pointerEvents = 'none';
    cursorElement.style.zIndex = '10000';
    cursorElement.style.width = `${this.settings.size}px`;
    cursorElement.style.height = `${this.settings.size}px`;
    cursorElement.style.border = '1px solid #000';
    cursorElement.style.borderRadius = '50%';
    cursorElement.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    cursorElement.id = 'eraser-cursor';
    
    document.body.appendChild(cursorElement);

    // Hide default cursor
    document.body.style.cursor = 'none';
  }

  private updateCursorPosition(event: FederatedPointerEvent): void {
    const cursorElement = document.getElementById('eraser-cursor');
    if (cursorElement) {
      cursorElement.style.left = `${event.global.x - this.settings.size / 2}px`;
      cursorElement.style.top = `${event.global.y - this.settings.size / 2}px`;
    }
  }

  private removeEraserCursor(): void {
    const cursorElement = document.getElementById('eraser-cursor');
    if (cursorElement) {
      cursorElement.remove();
    }
    document.body.style.cursor = 'default';
  }

  updateSettings(settings: EraserSettings): void {
    this.settings = { ...this.settings, ...settings };
    
    // Update cursor size if it exists
    const cursorElement = document.getElementById('eraser-cursor');
    if (cursorElement) {
      cursorElement.style.width = `${this.settings.size}px`;
      cursorElement.style.height = `${this.settings.size}px`;
    }
  }
}
