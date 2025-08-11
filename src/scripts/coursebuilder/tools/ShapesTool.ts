/**
 * Shapes Tool
 * Allows drawing basic shapes like rectangles, circles, and lines
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

interface ShapesSettings {
  color: string;
  strokeWidth: number;
  fillColor?: string;
  shapeType: 'rectangle' | 'triangle' | 'circle';
}

export class ShapesTool extends BaseTool {
  private isDrawing: boolean = false;
  private currentShape: Graphics | null = null;
  private startPoint: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super('shapes', 'crosshair');
    this.settings = {
      color: '#000000',
      strokeWidth: 2,
      fillColor: undefined,
      shapeType: 'rectangle'
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.isDrawing = true;
    console.log(`🔶 SHAPES: Started drawing ${this.settings.shapeType} at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`);
    
    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    this.startPoint = { x: localPoint.x, y: localPoint.y };

    // Create new graphics object
    this.currentShape = new Graphics();
    this.currentShape.eventMode = 'static';
    
    container.addChild(this.currentShape);
    console.log(`🔶 SHAPES: Graphics object created and added to container`);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDrawing || !this.currentShape) return;

    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    this.drawShape(this.startPoint, { x: localPoint.x, y: localPoint.y });
  }

  onPointerUp(): void {
    if (this.isDrawing) {
      console.log(`🔶 SHAPES: Finished drawing ${this.settings.shapeType}`);
    }
    this.isDrawing = false;
    this.currentShape = null;
  }

  private drawShape(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.currentShape) return;

    // Clear previous drawing
    this.currentShape.clear();

    const color = this.hexToNumber(this.settings.color);
    const width = end.x - start.x;
    const height = end.y - start.y;

    switch (this.settings.shapeType) {
      case 'rectangle':
        this.currentShape
          .rect(start.x, start.y, width, height)
          .stroke({ width: this.settings.strokeWidth, color });
        
        // Add fill if specified
        if (this.settings.fillColor) {
          const fillColor = this.hexToNumber(this.settings.fillColor);
          this.currentShape.fill(fillColor);
        }
        break;

      case 'triangle':
        // Draw triangle using three points
        const topX = start.x + width / 2;
        const topY = start.y;
        const bottomLeftX = start.x;
        const bottomLeftY = end.y;
        const bottomRightX = end.x;
        const bottomRightY = end.y;
        
        this.currentShape
          .moveTo(topX, topY)
          .lineTo(bottomLeftX, bottomLeftY)
          .lineTo(bottomRightX, bottomRightY)
          .lineTo(topX, topY)
          .stroke({ width: this.settings.strokeWidth, color });
        
        // Add fill if specified
        if (this.settings.fillColor) {
          const fillColor = this.hexToNumber(this.settings.fillColor);
          this.currentShape.fill(fillColor);
        }
        break;

      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2;
        const centerX = start.x + width / 2;
        const centerY = start.y + height / 2;
        
        this.currentShape
          .circle(centerX, centerY, radius)
          .stroke({ width: this.settings.strokeWidth, color });
        
        // Add fill if specified
        if (this.settings.fillColor) {
          const fillColor = this.hexToNumber(this.settings.fillColor);
          this.currentShape.fill(fillColor);
        }
        break;
    }
  }

  setShapeType(shapeType: 'rectangle' | 'triangle' | 'circle'): void {
    this.settings.shapeType = shapeType;
    console.log(`🔶 SHAPES: Shape type set to ${shapeType}`);
  }

  updateSettings(settings: ShapesSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
