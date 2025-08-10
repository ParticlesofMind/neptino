/**
 * Pen Tool
 * Allows free-hand drawing on the canvas
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

interface PenSettings {
  color: string;
  size: number;
}

export class PenTool extends BaseTool {
  private isDrawing: boolean = false;
  private currentStroke: Graphics | null = null;
  private points: { x: number; y: number }[] = [];

  constructor() {
    super('pen', 'crosshair');
    this.settings = {
      color: '#000000',
      size: 2
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.isDrawing = true;
    this.points = [];
    
    // Create new graphics object for this stroke
    this.currentStroke = new Graphics();
    this.currentStroke.eventMode = 'static'; // Make it selectable
    
    const point = event.global;
    this.points.push({ x: point.x, y: point.y });
    
    // Set stroke style
    const color = this.hexToNumber(this.settings.color);
    this.currentStroke.stroke({ width: this.settings.size, color });
    
    // Start the path
    this.currentStroke.moveTo(point.x, point.y);
    
    // Add to container
    container.addChild(this.currentStroke);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDrawing || !this.currentStroke) return;
    
    const point = event.global;
    this.points.push({ x: point.x, y: point.y });
    
    // Draw line to new point
    this.currentStroke.lineTo(point.x, point.y);
  }

  onPointerUp(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    // Optional: Smooth the stroke
    if (this.points.length > 2) {
      this.smoothStroke();
    }
    
    this.currentStroke = null;
    this.points = [];
  }

  private smoothStroke(): void {
    if (!this.currentStroke || this.points.length < 3) return;
    
    // Clear and redraw with smoothing
    this.currentStroke.clear();
    const color = this.hexToNumber(this.settings.color);
    this.currentStroke.stroke({ width: this.settings.size, color });
    
    // Start at first point
    this.currentStroke.moveTo(this.points[0].x, this.points[0].y);
    
    // Draw quadratic curves between points for smoothing
    for (let i = 1; i < this.points.length - 1; i++) {
      const current = this.points[i];
      const next = this.points[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      this.currentStroke.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    
    // Draw to the last point
    const lastPoint = this.points[this.points.length - 1];
    this.currentStroke.lineTo(lastPoint.x, lastPoint.y);
  }

  updateSettings(settings: PenSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
