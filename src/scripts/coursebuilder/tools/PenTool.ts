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
  public isDrawing: boolean = false; // Changed to public so ToolManager can access it
  private currentStroke: Graphics | null = null;
  private points: { x: number; y: number }[] = [];

  constructor() {
    super('pen', 'crosshair');
    this.settings = {
      color: '#000000', // Black
      size: 4 // Increased size for better visibility
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.isDrawing = true;
    this.points = [];
    console.log(`✏️ PEN: Started drawing at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`);
    console.log(`✏️ PEN: Settings - Color: ${this.settings.color}, Size: ${this.settings.size}`);
    
    // Create new graphics object for this stroke
    this.currentStroke = new Graphics();
    this.currentStroke.eventMode = 'static'; // Make it selectable
    
    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    console.log(`✏️ PEN: Container local point: (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    this.points.push({ x: localPoint.x, y: localPoint.y });
    
    // Set stroke style PROPERLY for PixiJS v8
    const color = this.hexToNumber(this.settings.color);
    console.log(`✏️ PEN: Setting stroke - color: ${color} (from ${this.settings.color}), width: ${this.settings.size}`);
    
    // Start the drawing path with proper PixiJS v8 syntax
    this.currentStroke
      .moveTo(localPoint.x, localPoint.y)
      .stroke({
        width: this.settings.size,
        color: color,
        cap: 'round',
        join: 'round'
      });
    
    // Add to container
    container.addChild(this.currentStroke);
    console.log(`✏️ PEN: Graphics object created and added to container with ${container.children.length} total children`);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    // Only respond to move events when actively drawing
    if (!this.isDrawing || !this.currentStroke) return;
    
    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    this.points.push({ x: localPoint.x, y: localPoint.y });
    
    // Continue the stroke path with proper PixiJS v8 syntax
    this.currentStroke
      .lineTo(localPoint.x, localPoint.y)
      .stroke({
        width: this.settings.size,
        color: this.hexToNumber(this.settings.color),
        cap: 'round',
        join: 'round'
      });
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    if (!this.isDrawing) return;
    
    console.log(`✏️ PEN: Finished drawing stroke with ${this.points.length} points`);
    this.isDrawing = false;
    
    // Optional: Smooth the stroke
    if (this.points.length > 2) {
      console.log(`✏️ PEN: Applying smoothing to stroke`);
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
    
    // Draw to the last point and apply stroke
    const lastPoint = this.points[this.points.length - 1];
    this.currentStroke
      .lineTo(lastPoint.x, lastPoint.y)
      .stroke({ 
        width: this.settings.size, 
        color,
        cap: 'round',
        join: 'round'
      });
  }

  updateSettings(settings: PenSettings): void {
    console.log(`✏️ PEN: Updating settings from:`, this.settings);
    console.log(`✏️ PEN: Updating settings to:`, settings);
    this.settings = { ...this.settings, ...settings };
    console.log(`✏️ PEN: Final settings:`, this.settings);
  }
}
