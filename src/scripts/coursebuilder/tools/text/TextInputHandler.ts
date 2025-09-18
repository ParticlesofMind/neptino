/**
 * TextInputHandler - Keyboard Input Management
 * Handles text input, cursor movement, and editing operations
 */

import { ITextInputHandler, ITextArea, ITextCursor } from "./types.js";
import { TextSelection } from './TextSelection.js';
import { Point } from "pixi.js";

export class TextInputHandler implements ITextInputHandler {
  private activeTextArea: ITextArea | null = null;
  private activeCursor: ITextCursor | null = null;
  private cursorPosition: number = 0;
  private textSelection: TextSelection;
  private isMouseDown: boolean = false;
  private lastClickTime: number = 0;
  private lastClickPosition: number = 0;
  private selectionAnchor: number = 0;
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyPress: (event: KeyboardEvent) => void;
  private boundInput: (event: Event) => void;
  private onTextChange: ((text: string) => void) | null = null;

  constructor(parent: any) {
    // Create text selection system
    this.textSelection = new TextSelection(parent);
    
    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyPress = this.handleKeyPress.bind(this);
    this.boundInput = this.handleInput.bind(this);

    // Add event listeners
    document.addEventListener('keydown', this.boundKeyDown);
    // Some environments fire both keydown and keypress for printable chars.
    // We handle insertion on keydown; keep keypress as a no-op to avoid duplicates.
    document.addEventListener('keypress', this.boundKeyPress);
    document.addEventListener('input', this.boundInput);

    console.log('📝 TextInputHandler created');
  }

  public setActiveTextArea(textArea: ITextArea | null): void {
    this.activeTextArea = textArea;
    
    // Update text selection to use new text area
    this.textSelection.setTextArea(textArea);
    
    if (textArea) {
      // Position cursor at end of text initially
      this.cursorPosition = textArea.text.length;
      this.updateCursorPosition();
    }
  }

  public setActiveCursor(cursor: ITextCursor | null): void {
    this.activeCursor = cursor;
  }

  public destroy(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keypress', this.boundKeyPress);
    document.removeEventListener('input', this.boundInput);

    // Cleanup components
    this.textSelection?.destroy();
    
    // Clear references
    this.activeTextArea = null;
    this.activeCursor = null;
    
    console.log('📝 TextInputHandler destroyed');
  }

  public setOnTextChange(cb: ((text: string) => void) | null): void {
    this.onTextChange = cb;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.activeTextArea) return;

    // Note: We'll selectively stop propagation for keys we handle so
    // global canvas/tool shortcuts don't trigger while typing.

    // Handle keyboard shortcuts first
    if ((event.ctrlKey || event.metaKey)) {
      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          event.stopPropagation();
          this.handleSelectAll();
          return;
        case 'arrowleft':
          event.preventDefault();
          event.stopPropagation();
          this.handleWordJump('left', event.shiftKey);
          return;
        case 'arrowright':
          event.preventDefault();
          event.stopPropagation();
          this.handleWordJump('right', event.shiftKey);
          return;
      }
    }

    // Prevent default behavior for navigation and editing keys
    if (this.isNavigationOrEditKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }

    switch (event.key) {
      case 'Backspace':
        this.handleBackspace();
        break;
      case 'Delete':
        this.handleDelete();
        break;
      case 'ArrowLeft':
        this.handleArrowLeft(event.shiftKey);
        break;
      case 'ArrowRight':
        this.handleArrowRight(event.shiftKey);
        break;
      case 'ArrowUp':
        this.handleArrowUp(event.shiftKey);
        break;
      case 'ArrowDown':
        this.handleArrowDown(event.shiftKey);
        break;
      case 'Home':
        this.handleHome(event.shiftKey);
        break;
      case 'End':
        this.handleEnd(event.shiftKey);
        break;
      case 'Enter':
        this.handleEnter();
        break;
      case 'Tab':
        this.handleTab();
        event.preventDefault();
        break;
    }

    // Fallback: handle printable characters on keydown as well (keypress may not fire in all environments)
    if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.insertCharacter(event.key);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private handleKeyPress(_event: KeyboardEvent): void {
    // Intentionally no-op to avoid double-insertion; keydown handles input.
  }

  private handleInput(event: Event): void {
    // Handle input from IME or other input methods
    const inputEvent = event as InputEvent;
    if (!this.activeTextArea || !inputEvent.data) return;
    
    this.insertCharacter(inputEvent.data);
  }

  private insertCharacter(char: string): void {
    if (!this.activeTextArea) return;

    // Handle selection replacement first
    if (this.textSelection.hasSelection) {
      const newCursorPos = this.textSelection.replaceSelection(char);
      if (newCursorPos >= 0) {
        this.cursorPosition = newCursorPos;
        this.updateCursorPosition();
        console.log(`📝 Replaced selection with character '${char}' at position ${this.cursorPosition}`);
        return;
      }
    }

    this.activeTextArea.insertText(char, this.cursorPosition);
    this.cursorPosition += char.length;
    this.updateCursorPosition();
    if (this.onTextChange) {
      try { this.onTextChange(this.activeTextArea.text); } catch {}
    }
    
    console.log(`📝 Inserted character '${char}' at position ${this.cursorPosition - char.length}`);
  }

  /**
   * Handle mouse click for cursor positioning and text selection
   */
  public handleMouseDown(x: number, y: number): void {
    if (!this.activeTextArea) return;
    
    const point = new Point(x, y);
    const clickPosition = this.activeTextArea.getCursorPositionFromPoint(point);
    const currentTime = Date.now();
    
    // Check for double-click
    if (currentTime - this.lastClickTime < 300 && Math.abs(clickPosition - this.lastClickPosition) <= 1) {
      // Double click - select word
      this.textSelection.selectWordAt(clickPosition);
      console.log('📝 Double-click detected - selected word');
    } else {
      // Single click - position cursor and start potential selection
      this.cursorPosition = clickPosition;
      this.updateCursorPosition();
      this.textSelection.clearSelection();
      this.isMouseDown = true;
      
      // Store the selection anchor for potential drag selection
      this.selectionAnchor = clickPosition;
    }
    
    this.lastClickTime = currentTime;
    this.lastClickPosition = clickPosition;
  }

  /**
   * Handle mouse drag for text selection
   */
  public handleMouseMove(x: number, y: number): void {
    if (!this.activeTextArea || !this.isMouseDown) return;
    
    const point = new Point(x, y);
    const dragPosition = this.activeTextArea.getCursorPositionFromPoint(point);
    
    // Create or update selection from anchor to current position
    if (dragPosition !== this.selectionAnchor) {
      this.textSelection.startSelectionFrom(this.selectionAnchor, dragPosition);
      this.cursorPosition = dragPosition;
      this.updateCursorPosition();
    }
  }

  /**
   * Handle mouse release
   */
  public handleMouseUp(): void {
    this.isMouseDown = false;
  }

  private handleSelectAll(): void {
    this.textSelection.selectAll();
    console.log('📝 Selected all text via Ctrl/Cmd+A');
  }

  private handleBackspace(): void {
    if (!this.activeTextArea) return;
    
    // If there's a selection, delete it
    if (this.textSelection.hasSelection) {
      const newCursorPos = this.textSelection.selectionStart;
      this.textSelection.deleteSelection();
      this.cursorPosition = newCursorPos;
      this.updateCursorPosition();
      return;
    }
    
    // Otherwise, delete character before cursor
    if (this.cursorPosition === 0) return;

    this.activeTextArea.deleteText(this.cursorPosition - 1, 1);
    this.cursorPosition--;
    this.updateCursorPosition();
    if (this.onTextChange) {
      try { this.onTextChange(this.activeTextArea.text); } catch {}
    }
  }

  private handleDelete(): void {
    if (!this.activeTextArea) return;
    
    // If there's a selection, delete it
    if (this.textSelection.hasSelection) {
      const newCursorPos = this.textSelection.selectionStart;
      this.textSelection.deleteSelection();
      this.cursorPosition = newCursorPos;
      this.updateCursorPosition();
      return;
    }

    // Otherwise, delete character after cursor
    const textLength = this.activeTextArea.text.length;
    if (this.cursorPosition < textLength) {
      this.activeTextArea.deleteText(this.cursorPosition, 1);
      this.updateCursorPosition();
      if (this.onTextChange) {
        try { this.onTextChange(this.activeTextArea.text); } catch {}
      }
    }
  }

  private handleArrowLeft(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (shiftKey) {
      // Extend selection to the left
      this.extendSelection(-1);
    } else {
      // Clear selection and move cursor
      this.textSelection.clearSelection();
      if (this.cursorPosition > 0) {
        this.cursorPosition--;
        this.updateCursorPosition();
      }
    }
  }

  private handleArrowRight(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (shiftKey) {
      // Extend selection to the right
      this.extendSelection(1);
    } else {
      // Clear selection and move cursor
      this.textSelection.clearSelection();
      const textLength = this.activeTextArea.text.length;
      if (this.cursorPosition < textLength) {
        this.cursorPosition++;
        this.updateCursorPosition();
      }
    }
  }

  private handleArrowUp(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (shiftKey) {
      // Extend selection upward
      const originalPos = this.cursorPosition;
      this.moveCursorVertically(-1);
      this.extendSelectionFromTo(originalPos, this.cursorPosition);
    } else {
      // Clear selection and move cursor up
      this.textSelection.clearSelection();
      this.moveCursorVertically(-1);
    }
  }

  private handleArrowDown(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (shiftKey) {
      // Extend selection downward
      const originalPos = this.cursorPosition;
      this.moveCursorVertically(1);
      this.extendSelectionFromTo(originalPos, this.cursorPosition);
    } else {
      // Clear selection and move cursor down
      this.textSelection.clearSelection();
      this.moveCursorVertically(1);
    }
  }

  private handleHome(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    const originalPos = this.cursorPosition;
    const newPos = this.findLineStart(this.cursorPosition);
    this.cursorPosition = newPos;

    if (shiftKey) {
      // Extend selection to beginning of line
      this.extendSelectionFromTo(originalPos, newPos);
    } else {
      // Clear selection and move cursor
      this.textSelection.clearSelection();
    }

    this.updateCursorPosition();
  }

  private handleEnd(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    const originalPos = this.cursorPosition;
    const newPos = this.findLineEnd(this.cursorPosition);
    this.cursorPosition = newPos;

    if (shiftKey) {
      // Extend selection to end of line
      this.extendSelectionFromTo(originalPos, newPos);
    } else {
      // Clear selection and move cursor
      this.textSelection.clearSelection();
    }

    this.updateCursorPosition();
  }

  private handleEnter(): void {
    if (!this.activeTextArea) return;

    this.insertCharacter('\n');
  }

  private handleTab(): void {
    if (!this.activeTextArea) return;

    this.insertCharacter('    '); // Insert 4 spaces
  }

  /**
   * Extend selection by moving cursor and updating selection range
   */
  private extendSelection(direction: -1 | 1): void {
    if (!this.activeTextArea) return;

    const oldPosition = this.cursorPosition;
    
    // Move cursor
    if (direction === -1 && this.cursorPosition > 0) {
      this.cursorPosition--;
    } else if (direction === 1 && this.cursorPosition < this.activeTextArea.text.length) {
      this.cursorPosition++;
    }

    // Update selection
    if (!this.textSelection.hasSelection) {
      // Start new selection from old position
      this.textSelection.setSelection(oldPosition, this.cursorPosition);
    } else {
      // Extend existing selection
      this.textSelection.extendSelectionTo(this.cursorPosition);
    }

    this.updateCursorPosition();
  }

  /**
   * Extend selection between two specific positions
   */
  private extendSelectionFromTo(fromPos: number, toPos: number): void {
    if (!this.activeTextArea) return;

    if (!this.textSelection.hasSelection) {
      // Create new selection
      this.textSelection.setSelection(fromPos, toPos);
    } else {
      // Extend from the selection start that's furthest from the new position
      const selectionStart = this.textSelection.selectionStart;
      const selectionEnd = this.textSelection.selectionEnd;
      
      // Determine which end of the selection to keep as anchor
      const distanceFromStart = Math.abs(toPos - selectionStart);
      const distanceFromEnd = Math.abs(toPos - selectionEnd);
      
      if (distanceFromStart > distanceFromEnd) {
        // Keep start as anchor, extend from end
        this.textSelection.setSelection(selectionStart, toPos);
      } else {
        // Keep end as anchor, extend from start
        this.textSelection.setSelection(selectionEnd, toPos);
      }
    }

    this.updateCursorPosition();
  }

  /**
   * Handle word-by-word navigation with Ctrl/Cmd+arrow keys
   */
  private handleWordJump(direction: 'left' | 'right', shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    const originalPos = this.cursorPosition;
    let newPos = this.cursorPosition;

    if (direction === 'left') {
      newPos = this.findPreviousWordBoundary(this.cursorPosition);
    } else {
      newPos = this.findNextWordBoundary(this.cursorPosition);
    }

    this.cursorPosition = newPos;

    if (shiftKey) {
      // Extend selection to new position
      this.extendSelectionFromTo(originalPos, newPos);
    } else {
      // Clear selection and move cursor
      this.textSelection.clearSelection();
    }

    this.updateCursorPosition();
  }

  private findPreviousWordBoundary(position: number): number {
    if (!this.activeTextArea) return position;

    const text = this.activeTextArea.text;
    let pos = position - 1;

    // Skip whitespace
    while (pos > 0 && /\s/.test(text[pos])) {
      pos--;
    }

    // Skip word characters
    while (pos > 0 && /\w/.test(text[pos])) {
      pos--;
    }

    return Math.max(0, pos + 1);
  }

  private findNextWordBoundary(position: number): number {
    if (!this.activeTextArea) return position;

    const text = this.activeTextArea.text;
    let pos = position;

    // Skip current word
    while (pos < text.length && /\w/.test(text[pos])) {
      pos++;
    }

    // Skip whitespace
    while (pos < text.length && /\s/.test(text[pos])) {
      pos++;
    }

    return Math.min(text.length, pos);
  }

  private updateCursorPosition(): void {
    if (!this.activeTextArea || !this.activeCursor) return;

    // Clamp cursor position
    const textLength = this.activeTextArea.text.length;
    this.cursorPosition = Math.max(0, Math.min(this.cursorPosition, textLength));

    // Update cursor visual position
    this.activeCursor.setPosition(this.cursorPosition);
    const graphicsPos = this.activeTextArea.getCharacterPosition(this.cursorPosition);
    
    // Now we can call setGraphicsPosition properly since it's in the interface
    this.activeCursor.setGraphicsPosition(graphicsPos.x, graphicsPos.y);
    // Ensure cursor is visible immediately after movement/typing
    this.activeCursor.startBlinking();
    
    console.log(`🔍 Cursor updated to text position ${this.cursorPosition} at graphics position (${graphicsPos.x.toFixed(1)}, ${graphicsPos.y.toFixed(1)})`);
  }

  /**
   * Move cursor up or down by lines
   */
  private moveCursorVertically(direction: -1 | 1): void {
    if (!this.activeTextArea) return;
    
    const text = this.activeTextArea.text;
    const lines = text.split('\n');
    let currentLine = 0;
    let positionInLine = 0;
    let charCount = 0;
    
    // Find current line and position in line
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= this.cursorPosition) {
        currentLine = i;
        positionInLine = this.cursorPosition - charCount;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline
    }
    
    // Calculate target line
    const targetLine = currentLine + direction;
    
    if (targetLine >= 0 && targetLine < lines.length) {
      // Move to same position in target line, or end of line if shorter
      const targetPosition = Math.min(positionInLine, lines[targetLine].length);
      
      // Calculate absolute position
      let absolutePosition = 0;
      for (let i = 0; i < targetLine; i++) {
        absolutePosition += lines[i].length + 1; // +1 for newline
      }
      absolutePosition += targetPosition;
      
      this.cursorPosition = absolutePosition;
    }
  }

  private isNavigationOrEditKey(key: string): boolean {
    const navKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab'
    ];
    return navKeys.includes(key);
  }

  private findLineStart(position: number): number {
    if (!this.activeTextArea) return position;

    const text = this.activeTextArea.text;
    let pos = position;

    while (pos > 0 && text[pos - 1] !== '\n') {
      pos--;
    }

    return pos;
  }

  private findLineEnd(position: number): number {
    if (!this.activeTextArea) return position;

    const text = this.activeTextArea.text;
    let pos = position;

    while (pos < text.length && text[pos] !== '\n') {
      pos++;
    }

    return pos;
  }
}
