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
  shapeType: 'rectangle' | 'circle' | 'line';
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
    const point = event.global;
    this.startPoint = { x: point.x, y: point.y };

    // Create new graphics object
    this.currentShape = new Graphics();
    this.currentShape.eventMode = 'static';
    
    container.addChild(this.currentShape);
  }

  onPointerMove(event: FederatedPointerEvent): void {
    if (!this.isDrawing || !this.currentShape) return;

    const point = event.global;
    this.drawShape(this.startPoint, point);
  }

  onPointerUp(): void {
    this.isDrawing = false;
    this.currentShape = null;
  }

  private drawShape(start: { x: number; y: number }, end: { x: number; y: number }): void {
    if (!this.currentShape) return;

    // Clear previous drawing
    this.currentShape.clear();

    const color = this.hexToNumber(this.settings.color);
    const strokeStyle = { width: this.settings.strokeWidth, color };

    // Set stroke
    this.currentShape.stroke(strokeStyle);

    // Set fill if specified
    if (this.settings.fillColor) {
      const fillColor = this.hexToNumber(this.settings.fillColor);
      this.currentShape.fill(fillColor);
    }

    const width = end.x - start.x;
    const height = end.y - start.y;

    switch (this.settings.shapeType) {
      case 'rectangle':
        this.currentShape.rect(start.x, start.y, width, height);
        break;

      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2;
        const centerX = start.x + width / 2;
        const centerY = start.y + height / 2;
        this.currentShape.circle(centerX, centerY, radius);
        break;

      case 'line':
        this.currentShape.moveTo(start.x, start.y);
        this.currentShape.lineTo(end.x, end.y);
        break;
    }
  }

  setShapeType(shapeType: 'rectangle' | 'circle' | 'line'): void {
    this.settings.shapeType = shapeType;
  }

  updateSettings(settings: ShapesSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
