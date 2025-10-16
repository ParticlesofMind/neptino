/**
 * TextSelection - Text Selection and Highlighting System
 * Handles text selection, highlighting, and selection-related operations
 */

import { Graphics, Container } from "pixi.js";
import { ITextArea } from "./types.js";
import { alignRectToPixel } from "../../utils/graphicsQuality.js";

export interface SelectionRange {
  start: number;
  end: number;
}

export class TextSelection {
  private graphics: Graphics;
  private textArea: ITextArea | null = null;
  private _selectionStart: number = 0;
  private _selectionEnd: number = 0;
  private _hasSelection: boolean = false;

  constructor(parent: Container) {
    this.graphics = new Graphics();
    this.graphics.eventMode = 'none';
    this.graphics.zIndex = 1500; // Below cursor (2000) but above text
    parent.addChild(this.graphics);
    
  }

  public get hasSelection(): boolean {
    return this._hasSelection;
  }

  public get selectionStart(): number {
    return Math.min(this._selectionStart, this._selectionEnd);
  }

  public get selectionEnd(): number {
    return Math.max(this._selectionStart, this._selectionEnd);
  }

  public get selectedText(): string {
    if (!this._hasSelection || !this.textArea) return '';
    
    const start = this.selectionStart;
    const end = this.selectionEnd;
    return this.textArea.text.substring(start, end);
  }

  public setTextArea(textArea: ITextArea | null): void {
    this.textArea = textArea;
    this.clearSelection();
  }

  /**
   * Set selection range
   */
  public setSelection(start: number, end: number): void {
    if (!this.textArea) return;

    const textLength = this.textArea.text.length;
    this._selectionStart = Math.max(0, Math.min(start, textLength));
    this._selectionEnd = Math.max(0, Math.min(end, textLength));
    this._hasSelection = this._selectionStart !== this._selectionEnd;
    
    if (this._hasSelection) {
      this.renderSelection();
    } else {
      this.clearVisualSelection();
    }

  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this._hasSelection = false;
    this._selectionStart = 0;
    this._selectionEnd = 0;
    this.clearVisualSelection();
  }

  /**
   * Select word at position
   */
  public selectWordAt(position: number): void {
    if (!this.textArea) return;

    const text = this.textArea.text;
    if (position < 0 || position >= text.length) return;

    // Find word boundaries
    const start = this.findWordStart(text, position);
    const end = this.findWordEnd(text, position);

    this.setSelection(start, end);
  }

  /**
   * Select all text
   */
  public selectAll(): void {
    if (!this.textArea) return;
    
    this.setSelection(0, this.textArea.text.length);
  }

  /**
   * Extend selection to position
   */
  public extendSelectionTo(position: number): void {
    if (!this.textArea) return;

    if (!this._hasSelection) {
      // Start new selection from current position to target position
      // We need the current cursor position, so we'll use position 0 as fallback
      this.setSelection(0, position);
      return;
    }

    // Extend existing selection to new position
    this._selectionEnd = Math.max(0, Math.min(position, this.textArea.text.length));
    this._hasSelection = this._selectionStart !== this._selectionEnd;

    if (this._hasSelection) {
      this.renderSelection();
    } else {
      this.clearVisualSelection();
    }

  }

  /**
   * Start a new selection from a specific anchor position
   */
  public startSelectionFrom(anchorPosition: number, currentPosition: number): void {
    if (!this.textArea) return;

    const textLength = this.textArea.text.length;
    this._selectionStart = Math.max(0, Math.min(anchorPosition, textLength));
    this._selectionEnd = Math.max(0, Math.min(currentPosition, textLength));
    this._hasSelection = this._selectionStart !== this._selectionEnd;
    
    if (this._hasSelection) {
      this.renderSelection();
    } else {
      this.clearVisualSelection();
    }

  }

  /**
   * Delete selected text
   */
  public deleteSelection(): boolean {
    if (!this._hasSelection || !this.textArea) return false;

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const length = end - start;

    this.textArea.deleteText(start, length);
    this.clearSelection();

    return true;
  }

  /**
   * Replace selected text with new text
   */
  public replaceSelection(newText: string): number {
    if (!this._hasSelection || !this.textArea) {
      return -1;
    }

    const start = this.selectionStart;
    const end = this.selectionEnd;
    const length = end - start;

    // Delete selected text
    this.textArea.deleteText(start, length);
    
    // Insert new text
    this.textArea.insertText(newText, start);
    
    this.clearSelection();

    return start + newText.length; // Return new cursor position
  }

  public destroy(): void {
    this.clearSelection();
    this.graphics.parent?.removeChild(this.graphics);
    this.graphics.destroy();
  }

  private renderSelection(): void {
    if (!this.textArea || !this._hasSelection) return;

    this.graphics.clear();

    const start = this.selectionStart;
    const end = this.selectionEnd;

    // Get positions for start and end of selection (relative to TextArea container)
    const startPos = this.textArea.getCharacterPosition(start);
    const endPos = this.textArea.getCharacterPosition(end);
    const lineHeight = this.textArea.textLineHeight;
    const textLines = this.textArea.textLines;

    // Get TextArea container bounds for coordinate transformation
    const textAreaContainer = this.textArea.pixiContainer;
    const textAreaBounds = this.textArea.bounds;
    
    // Transform positions to drawing layer coordinates
    const globalStartPos = {
      x: textAreaContainer.x + startPos.x,
      y: textAreaContainer.y + startPos.y
    };
    const globalEndPos = {
      x: textAreaContainer.x + endPos.x,
      y: textAreaContainer.y + endPos.y
    };

    // Check if it's a single line selection
    if (Math.floor(startPos.y / lineHeight) === Math.floor(endPos.y / lineHeight)) {
      // Same line selection
      const rect = alignRectToPixel(
        globalStartPos.x,
        globalStartPos.y,
        globalEndPos.x - globalStartPos.x,
        lineHeight
      );

      this.graphics
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: 0x0066CC, alpha: 0.3 }); // Blue highlight

    } else {
      // Multi-line selection
      this.renderMultiLineSelection(start, end, globalStartPos, globalEndPos, lineHeight, textLines, textAreaContainer, textAreaBounds);
    }

  }

  /**
   * Render selection that spans multiple lines
   */
  private renderMultiLineSelection(
    _start: number, 
    _end: number, 
    startPos: { x: number; y: number }, 
    endPos: { x: number; y: number },
    lineHeight: number,
    textLines: any[],
    textAreaContainer: any,
    textAreaBounds: any
  ): void {
    const startLineIndex = Math.floor((startPos.y - textAreaContainer.y) / lineHeight);
    const endLineIndex = Math.floor((endPos.y - textAreaContainer.y) / lineHeight);
    
    // Get text area bounds for calculating line widths
    if (!textAreaBounds) return;
    
    const maxLineWidth = textAreaBounds.width - 10; // Account for padding

    for (let lineIndex = startLineIndex; lineIndex <= endLineIndex; lineIndex++) {
      const lineY = textAreaContainer.y + (lineIndex * lineHeight) + (startPos.y - textAreaContainer.y - (startLineIndex * lineHeight));
      
      let selectionX: number;
      let selectionWidth: number;
      
      if (lineIndex === startLineIndex && lineIndex === endLineIndex) {
        // Single line case (shouldn't happen here, but safety check)
        selectionX = startPos.x;
        selectionWidth = endPos.x - startPos.x;
      } else if (lineIndex === startLineIndex) {
        // First line: from start position to end of line
        selectionX = startPos.x;
        
        // Find the actual line width by getting the end position of this line
        const lineInfo = textLines[lineIndex];
        if (lineInfo) {
          const lineEndPos = this.textArea?.getCharacterPosition(lineInfo.endIndex + 1);
          selectionWidth = lineEndPos ? (textAreaContainer.x + lineEndPos.x) - startPos.x : maxLineWidth - (startPos.x - textAreaContainer.x);
        } else {
          selectionWidth = maxLineWidth - (startPos.x - textAreaContainer.x);
        }
      } else if (lineIndex === endLineIndex) {
        // Last line: from start of line to end position
        const lineStartCharPos = this.textArea?.getCharacterPosition(textLines[lineIndex]?.startIndex || 0);
        selectionX = textAreaContainer.x + (lineStartCharPos?.x || 5);
        selectionWidth = endPos.x - selectionX;
      } else {
        // Middle lines: full line width
        const lineStartPos = this.textArea?.getCharacterPosition(textLines[lineIndex]?.startIndex || 0);
        const lineEndPos = this.textArea?.getCharacterPosition(textLines[lineIndex]?.endIndex + 1 || 0);
        
        selectionX = textAreaContainer.x + (lineStartPos?.x || 5);
        selectionWidth = lineEndPos ? (textAreaContainer.x + lineEndPos.x) - selectionX : maxLineWidth - (lineStartPos?.x || 5);
      }

      // Ensure minimum width for visibility
      selectionWidth = Math.max(selectionWidth, 2);

      const rect = alignRectToPixel(selectionX, lineY, selectionWidth, lineHeight);
      
      this.graphics
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill({ color: 0x0066CC, alpha: 0.3 }); // Blue highlight
        
    }
  }

  private clearVisualSelection(): void {
    this.graphics.clear();
  }

  private findWordStart(text: string, position: number): number {
    let pos = Math.min(position, text.length - 1);
    
    // If we're at the very end, move back one character
    if (pos === text.length) pos--;
    
    // If we're on whitespace, move to the previous word
    while (pos > 0 && this.isWhitespace(text[pos])) {
      pos--;
    }
    
    // Now find the start of this word
    while (pos > 0 && !this.isWordBoundary(text[pos - 1])) {
      pos--;
    }
    
    return pos;
  }

  private findWordEnd(text: string, position: number): number {
    let pos = Math.min(position, text.length - 1);
    
    // If we're on whitespace, move to the next word
    while (pos < text.length && this.isWhitespace(text[pos])) {
      pos++;
    }
    
    // Now find the end of this word
    while (pos < text.length && !this.isWordBoundary(text[pos])) {
      pos++;
    }
    
    return pos;
  }

  private isWordBoundary(char: string): boolean {
    // More comprehensive word boundary detection
    return this.isWhitespace(char) || this.isPunctuation(char);
  }
  
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }
  
  private isPunctuation(char: string): boolean {
    // Common punctuation that should break words
    return /[.,;:!?'"()[\]{}<>/\\|@#$%^&*+=~`-]/.test(char);
  }
}
