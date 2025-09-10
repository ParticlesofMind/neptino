/**
 * TextArea - Visual Text Container
 * Handles rendering of text areas with borders and text content
 */

import { Container, Graphics, Text as PixiText } from "pixi.js";
import { 
  TextAreaBounds, 
  TextSettings, 
  TextPosition,
  ITextArea,
  LineInfo,
  TextAreaConfig
} from "./types.js";
import { TextFlowManager } from "./TextFlowManager.js";
import { alignToPixel, alignPointToPixel } from "../../utils/graphicsQuality.js";

export class TextArea implements ITextArea {
  public readonly id: string;
  private container: Container;
  private border: Graphics;
  private textObject: PixiText;
  private _bounds: TextAreaBounds;
  private _text: string;
  private _isActive: boolean = false;
  private settings: TextSettings;
  private flowManager: TextFlowManager;
  private lines: LineInfo[] = [];
  private lineHeight: number = 20;

  constructor(config: TextAreaConfig, parent: Container) {
    this.id = `text-area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this._bounds = { ...config.bounds };
    this._text = config.text;
    this.settings = { ...config.settings };
    this.flowManager = new TextFlowManager();

    // Create container
    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.sortableChildren = true; // Enable z-index sorting
    
    // Mark this container as a text object for selection tool identification
    (this.container as any).isTextObject = true;
    (this.container as any).textAreaId = this.id;
    
    parent.addChild(this.container);

    // Create border graphics
    this.border = new Graphics();
    this.container.addChild(this.border);

    // Create text object
    const contentWidth = Math.max(10, this._bounds.width - 10); // 5px padding on each side
    this.textObject = new PixiText({
      text: '',
      style: {
        fontFamily: this.settings.fontFamily,
        fontSize: this.settings.fontSize,
        fontWeight: (this.settings as any).fontWeight || 'normal',
        fontStyle: (this.settings as any).fontStyle || 'normal',
        fill: this.settings.color,
        wordWrap: true,
        wordWrapWidth: contentWidth,
        breakWords: true, // Allow breaking long words
        whiteSpace: 'normal' // Ensure normal text wrapping behavior
      }
    });
    this.textObject.x = alignToPixel(5); // 5px padding from left
    this.textObject.y = alignToPixel(5); // 5px padding from top
    this.container.addChild(this.textObject);

    console.log(`📝 TextArea text object created with wordWrapWidth: ${contentWidth}`);

    // Calculate line height from text metrics
    this.calculateLineHeight();

    // Initial render
    this.render();

    console.log(`📝 TextArea created: ${this.id}`);
  }

  public get bounds(): TextAreaBounds {
    return { ...this._bounds };
  }

  public get text(): string {
    return this._text;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get pixiContainer(): Container {
    return this.container;
  }

  public get textLines(): LineInfo[] {
    return [...this.lines];
  }

  public get textLineHeight(): number {
    return this.lineHeight;
  }

  public setActive(active: boolean): void {
    if (this._isActive === active) return;
    
    this._isActive = active;
    this.updateBorderStyle();
    
    console.log(`📝 TextArea ${this.id} ${active ? 'activated' : 'deactivated'}`);
  }

  public updateBounds(bounds: TextAreaBounds): void {
    this._bounds = { ...bounds };
    
    // Update word wrap width with proper minimum
    const contentWidth = Math.max(10, this._bounds.width - 10); // Minimum content width
    this.textObject.style.wordWrapWidth = contentWidth;
    
    // Force text update to apply new wrapping
    const currentText = this._text;
    this.textObject.text = '';
    this.textObject.text = currentText;
    
    this.render();
    
    console.log(`📝 TextArea bounds updated: ${bounds.width}x${bounds.height}, new wordWrapWidth: ${contentWidth}`);
  }

  public updateText(text: string): void {
    this._text = text;
    this.recalculateTextFlow();
    this.render();
  }

  public insertText(text: string, position: number): void {
    const before = this._text.substring(0, position);
    const after = this._text.substring(position);
    this._text = before + text + after;
    
    // Ensure word wrap width is current before recalculating
    const contentWidth = Math.max(10, this._bounds.width - 10);
    this.textObject.style.wordWrapWidth = contentWidth;
    
    this.recalculateTextFlow();
    this.render();
  }

  public deleteText(start: number, length: number): void {
    const before = this._text.substring(0, start);
    const after = this._text.substring(start + length);
    this._text = before + after;
    
    this.recalculateTextFlow();
    this.render();
  }

  public getCursorPositionFromPoint(localPoint: { x: number; y: number }): number {
    // Convert point relative to text object
    const textX = localPoint.x - this.textObject.x;
    const textY = localPoint.y - this.textObject.y;
    
    return this.flowManager.getCharIndexFromPosition(
      { x: textX, y: textY },
      this.lines,
      this.lineHeight
    );
  }

  public getCharacterPosition(index: number): TextPosition {
    // For empty text or position 0, return the text area's top-left with padding
    if (this._text.length === 0 || index === 0) {
      const x = this.textObject.x; // Already includes 5px padding
      const y = this.textObject.y; // Already includes 5px padding
      console.log(`📝 Cursor position for index ${index}: (${x}, ${y}) - empty text or start`);
      return alignPointToPixel(x, y);
    }

    if (this.lines.length === 0) {
      return { x: this.textObject.x, y: this.textObject.y };
    }

    // Find which line the character is on
    const lineIndex = this.flowManager.getLineFromCharIndex(index, this.lines);
    const line = this.lines[lineIndex];
    
    if (!line) {
      return { x: this.textObject.x, y: this.textObject.y };
    }

    // Calculate position within the line
    const charInLine = index - line.startIndex;
    const lineText = line.text.substring(0, charInLine);
    
    // Use PIXI's text measurement
    const tempText = new PixiText({
      text: lineText,
      style: this.textObject.style
    });
    
    const x = this.textObject.x + tempText.width;
    const y = this.textObject.y + (lineIndex * this.lineHeight);
    
    tempText.destroy();
    
    console.log(`📝 Cursor position for index ${index}: (${x}, ${y}) - line ${lineIndex}`);
    return alignPointToPixel(x, y);
  }

  public containsPoint(globalPoint: { x: number; y: number }): boolean {
    const localPoint = this.container.toLocal(globalPoint);
    
    return (
      localPoint.x >= 0 &&
      localPoint.x <= this._bounds.width &&
      localPoint.y >= 0 &&
      localPoint.y <= this._bounds.height
    );
  }

  public destroy(): void {
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
    console.log(`📝 TextArea destroyed: ${this.id}`);
  }

  private calculateLineHeight(): void {
    const tempText = new PixiText({
      text: 'Ag', // Use characters with ascenders and descenders
      style: this.textObject.style
    });
    
    this.lineHeight = Math.ceil(tempText.height * 1.2); // Add some line spacing
    tempText.destroy();
  }

  private recalculateTextFlow(): void {
    const maxWidth = Math.max(10, this._bounds.width - 10); // 5px padding each side
    this.lines = this.flowManager.wrapText(this._text, maxWidth);
  }

  private render(): void {
    // Position and draw border
    this.drawBorder();
    
    // Update text content and ensure word wrap width is current
    const contentWidth = Math.max(10, this._bounds.width - 10); // 5px padding on each side
    this.textObject.style.wordWrapWidth = contentWidth;
    
    // Force text refresh to apply wrapping changes
    const currentText = this._text;
    this.textObject.text = '';
    this.textObject.text = currentText;
    
    // Recalculate text flow
    this.recalculateTextFlow();
    
    // Position container
    const alignedPos = alignPointToPixel(this._bounds.x, this._bounds.y);
    this.container.x = alignedPos.x;
    this.container.y = alignedPos.y;
    
    console.log(`📝 TextArea render: bounds=${this._bounds.width}x${this._bounds.height}, wordWrapWidth=${contentWidth}, text="${this._text}"`);
  }

  private drawBorder(): void {
    this.border.clear();
    
    // Determine border style based on active state
    const borderColor = this.getBorderColor();
    const borderWidth = this._isActive ? 2 : 1;
    
    // Draw border rectangle
    this.border.stroke({ width: borderWidth, color: borderColor });
    
    // Add background if specified
    if (this.settings.backgroundColor) {
      this.border.fill(this.settings.backgroundColor);
    }
    
    // Draw rectangle
    this.border.rect(0, 0, this._bounds.width, this._bounds.height);
    
    console.log(`📝 Border drawn: ${this._bounds.width}x${this._bounds.height}, active: ${this._isActive}`);
  }

  private getBorderColor(): number {
    return this.hexToNumber(this.settings.borderColor);
  }

  private updateBorderStyle(): void {
    this.drawBorder();
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }
}
