/**
 * CreationGuide - Persistent Blue Creation Guide
 * Shows the blue border and size label that persists after drag completion
 * until first input or tool switch
 */

import { Graphics, Container } from "pixi.js";
import { TextAreaBounds, TextPosition } from "./types.js";
import { SizeLabel } from "./SizeLabel.js";
import { alignRectToPixel } from "../../utils/graphicsQuality.js";

export class CreationGuide {
  private graphics: Graphics;
  private sizeLabel: SizeLabel;
  private bounds: TextAreaBounds | null = null;
  private visible: boolean = false;
  private borderColor: number = 0x4A90E2;
  private borderWidth: number = 2;

  constructor(parent: Container) {
    // Create graphics for border
    this.graphics = new Graphics();
    this.graphics.eventMode = 'none';
    this.graphics.zIndex = 1000; // Ensure it's on top but below size label
    parent.addChild(this.graphics);

    // Create size label
    this.sizeLabel = new SizeLabel(parent);

    console.log('📝 CreationGuide created');
  }

  public show(bounds: TextAreaBounds): void {
    this.bounds = bounds;
    this.visible = true;
    this.redraw();

    // Show size label
    const labelPosition: TextPosition = { 
      x: bounds.x, 
      y: bounds.y 
    };
    this.sizeLabel.show(bounds.width, bounds.height, labelPosition);

    console.log(`📝 CreationGuide shown: ${bounds.width}×${bounds.height} at (${bounds.x}, ${bounds.y})`);
  }

  public updateBounds(bounds: TextAreaBounds): void {
    if (!this.visible) return;
    
    this.bounds = bounds;
    this.redraw();

    // Update size label
    const labelPosition: TextPosition = { 
      x: bounds.x, 
      y: bounds.y 
    };
    this.sizeLabel.show(bounds.width, bounds.height, labelPosition);
  }

  public hide(): void {
    this.visible = false;
    this.graphics.visible = false;
    this.sizeLabel.hide();
    console.log('📝 CreationGuide hidden');
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  private redraw(): void {
    if (!this.bounds || !this.visible) return;

    this.graphics.clear();
    this.graphics.visible = true;

    // Align to pixel boundaries for crisp rendering
    const aligned = alignRectToPixel(
      this.bounds.x, 
      this.bounds.y, 
      this.bounds.width, 
      this.bounds.height
    );

    // Draw blue border rectangle
    this.graphics
      .rect(aligned.x, aligned.y, aligned.width, aligned.height)
      .stroke({ 
        width: this.borderWidth, 
        color: this.borderColor 
      });
  }

  public destroy(): void {
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    this.graphics.destroy();
    this.sizeLabel.destroy();
    console.log('📝 CreationGuide destroyed');
  }
}
