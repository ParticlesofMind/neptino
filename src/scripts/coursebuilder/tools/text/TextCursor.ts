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
  private color: number = 0x000000;

  constructor(parent: Container, height: number = 20) {
    this.height = height;
    
    // Create cursor graphics
    this.graphics = new Graphics();
    this.graphics.eventMode = 'none'; // Don't interfere with input events
    this.graphics.zIndex = 2000; // Ensure cursor is above everything else including creation guide
    parent.addChild(this.graphics);

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
      // Force visible immediately on show
      this.isBlinkVisible = true;
      this.graphics.visible = true;
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
    
    // Redraw to ensure visibility with new position
    this.redraw();
    
  }

  public setHeight(height: number): void {
    this.height = height;
    this.redraw();
  }

  public setColor(color: number): void {
    this.color = color;
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
      if (this.isBlinkVisible) {
      }
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
  }

  private redraw(): void {
    this.graphics.clear();
    
    // Modern caret: solid 2px bar for crisp visibility
    const width = 2;
    this.graphics
      .rect(0, 0, width, this.height)
      .fill({ color: this.color, alpha: 1.0 });
    
    // Ensure visibility
    this.graphics.visible = this._visible && this.isBlinkVisible;
    
  }
}
