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
  public isDrawing: boolean = false; // Changed to public so ToolManager can access it
  private currentStroke: Graphics | null = null;

  constructor() {
    super('highlighter', 'crosshair');
    this.settings = {
      color: '#ffff00', // Bright yellow
      opacity: 0.8, // Increased opacity for better visibility
      size: 20 // Larger size for better visibility
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    this.isDrawing = true;
    console.log(`🖍️ HIGHLIGHTER: Started drawing at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`);
    console.log(`🖍️ HIGHLIGHTER: Settings - Color: ${this.settings.color}, Size: ${this.settings.size}, Opacity: ${this.settings.opacity}`);
    
    // Create new graphics object for this stroke
    this.currentStroke = new Graphics();
    this.currentStroke.eventMode = 'static';
    this.currentStroke.alpha = this.settings.opacity;
    
    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    console.log(`🖍️ HIGHLIGHTER: Container local point: (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    
    // Set stroke style with proper PixiJS v8 syntax
    const color = this.hexToNumber(this.settings.color);
    console.log(`🖍️ HIGHLIGHTER: Setting stroke - color: ${color} (from ${this.settings.color}), width: ${this.settings.size}, opacity: ${this.settings.opacity}`);
    
    // Start the drawing path
    this.currentStroke
      .moveTo(localPoint.x, localPoint.y)
      .stroke({ 
        width: this.settings.size, 
        color,
        cap: 'round',
        join: 'round'
      });
    
    // Add to container
    container.addChild(this.currentStroke);
    console.log(`🖍️ HIGHLIGHTER: Graphics object created and added to container with ${container.children.length} total children`);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    // Only respond to move events when actively drawing
    if (!this.isDrawing || !this.currentStroke) return;
    
    // Use local coordinates relative to the container
    const localPoint = container.toLocal(event.global);
    console.log(`🖍️ HIGHLIGHTER: Drawing to (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    
    // Continue the stroke with proper PixiJS v8 syntax
    this.currentStroke
      .lineTo(localPoint.x, localPoint.y)
      .stroke({ 
        width: this.settings.size, 
        color: this.hexToNumber(this.settings.color),
        cap: 'round',
        join: 'round'
      });
  }

  onPointerUp(): void {
    if (this.isDrawing) {
      console.log(`🖍️ HIGHLIGHTER: Finished drawing stroke`);
    }
    this.isDrawing = false;
    this.currentStroke = null;
  }

  updateSettings(settings: HighlighterSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
