/**
 * SizeLabel - Size Display Component
 * Shows W×H dimensions during drag creation and while guide persists
 */

import { Graphics, Text, Container } from "pixi.js";
import { TextPosition } from "./types.js";
import { alignPointToPixel } from "../../utils/graphicsQuality.js";

export class SizeLabel {
  private container: Container;
  private background: Graphics;
  private label: Text;
  private visible: boolean = false;

  constructor(parent: Container) {
    this.container = new Container();
    this.container.eventMode = 'none';
    this.container.zIndex = 1001; // Above drag preview
    parent.addChild(this.container);

    // Create background
    this.background = new Graphics();
    this.container.addChild(this.background);

    // Create text label
    this.label = new Text({
      text: '',
      style: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fill: '#ffffff',
        fontWeight: '500'
      }
    });
    this.container.addChild(this.label);

    console.log('📝 SizeLabel created');
  }

  public show(width: number, height: number, position: TextPosition): void {
    if (width < 1 || height < 1) {
      this.hide();
      return;
    }

    this.visible = true;
    this.container.visible = true;

    // Update text
    this.label.text = `${Math.round(width)}×${Math.round(height)}`;
    
    // Update background to fit text
    const padding = 6;
    const textBounds = this.label.getBounds();
    
    this.background.clear();
    this.background
      .roundRect(0, 0, textBounds.width + padding * 2, textBounds.height + padding, 3)
      .fill({ color: 0x4A90E2, alpha: 0.9 });

    // Position text with padding
    this.label.x = padding;
    this.label.y = padding;

    // Position container near top-left of the rectangle, but offset to avoid overlap
    const aligned = alignPointToPixel(position.x + 8, position.y - textBounds.height - padding * 2 - 4);
    this.container.x = aligned.x;
    this.container.y = aligned.y;

    console.log(`📝 SizeLabel updated: ${Math.round(width)}×${Math.round(height)} at (${aligned.x}, ${aligned.y})`);
  }

  public hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy();
    console.log('📝 SizeLabel destroyed');
  }
}
