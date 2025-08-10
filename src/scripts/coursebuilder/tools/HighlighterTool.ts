/**
 * Highlighter Tool
 * Similar to pen but with transparency and larger stroke
 */

import { FederatedPointerEvent, Container, Graphics } from 'pixi.js';
import { BaseTool } from './ToolInterface';

interface HighlighterSettings {
  color: string;
  opacity: number;
  size: number;
}

export class HighlighterTool extends BaseTool {
  private isDrawing: boolean = false;
  private currentStroke: Graphics | null = null;

  constructor() {
    super('highlighter', 'crosshair');
    this.settings = {
      color: '#ffff00',
      opacity: 0.5,
      size: 12
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.isDrawing = true;
    
    // Create new graphics object for this stroke
    this.currentStroke = new Graphics();
    this.currentStroke.eventMode = 'static';
    this.currentStroke.alpha = this.settings.opacity;
    
    const point = event.global;
    
    // Set stroke style with larger width for highlighter effect
    const color = this.hexToNumber(this.settings.color);
    this.currentStroke.stroke({ 
      width: this.settings.size, 
      color,
      cap: 'round',
      join: 'round'
    });
    
    // Start the path
    this.currentStroke.moveTo(point.x, point.y);
    
    // Add to container
    container.addChild(this.currentStroke);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isDrawing || !this.currentStroke) return;
    
    const point = event.global;
    // Draw line to new point
    this.currentStroke.lineTo(point.x, point.y);
  }

  onPointerUp(): void {
    this.isDrawing = false;
    this.currentStroke = null;
  }

  updateSettings(settings: HighlighterSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
