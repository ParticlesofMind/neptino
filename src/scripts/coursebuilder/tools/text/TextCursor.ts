/**
 * TextCursor - Blinking Cursor System
 * Handles visual cursor rendering and blinking animation
 */

import { Graphics, Container } from "pixi.js";
import { TextPosition, ITextCursor } from "./types.js";
import { alignPointToPixel } from "../../utils/graphicsQuality.js";

export class TextCursor implements ITextCursor {
  private graphics: Graphics;
  private _visible: boolean = false;
  private _position: number = 0;
  private _graphicsPosition: TextPosition = { x: 0, y: 0 };
  private blinkTimer: number | null = null;
  private isBlinkVisible: boolean = true;
  private height: number = 20;

  constructor(parent: Container, height: number = 20) {
    this.height = height;
    
    // Create cursor graphics
    this.graphics = new Graphics();
    this.graphics.eventMode = 'none'; // Don't interfere with input events
    parent.addChild(this.graphics);

    console.log('📝 TextCursor created');
  }

  public get visible(): boolean {
    return this._visible;
  }

  public get position(): number {
    return this._position;
  }

  public get graphicsPosition(): TextPosition {
    return { ...this._graphicsPosition };
  }

  public get pixiGraphics(): Graphics {
    return this.graphics;
  }

  public setVisible(visible: boolean): void {
    if (this._visible === visible) return;
    
    this._visible = visible;
    
    if (visible) {
      this.startBlinking();
    } else {
      this.stopBlinking();
      this.graphics.visible = false;
    }
  }

  public setPosition(position: number): void {
    this._position = position;
  }

  public setGraphicsPosition(x: number, y: number): void {
    const aligned = alignPointToPixel(x, y);
    this._graphicsPosition.x = aligned.x;
    this._graphicsPosition.y = aligned.y;
    
    // Update graphics position
    this.graphics.x = aligned.x;
    this.graphics.y = aligned.y;
  }

  public setHeight(height: number): void {
    this.height = height;
    this.redraw();
  }

  public startBlinking(): void {
    this.stopBlinking(); // Clear any existing timer
    
    this.isBlinkVisible = true;
    this.graphics.visible = true;
    this.redraw();

    // Start blinking animation
    this.blinkTimer = window.setInterval(() => {
      this.isBlinkVisible = !this.isBlinkVisible;
      this.graphics.visible = this.isBlinkVisible && this._visible;
    }, 500); // Blink every 500ms
  }

  public stopBlinking(): void {
    if (this.blinkTimer !== null) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  public destroy(): void {
    this.stopBlinking();
    this.graphics.parent?.removeChild(this.graphics);
    this.graphics.destroy();
    console.log('📝 TextCursor destroyed');
  }

  private redraw(): void {
    this.graphics.clear();
    
    // Draw vertical line cursor
    this.graphics.stroke({ width: 1, color: 0x000000 }); // Black cursor
    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(0, this.height);
    
    console.log(`📝 Cursor redrawn at (${this._graphicsPosition.x}, ${this._graphicsPosition.y}) height: ${this.height}`);
  }
}
