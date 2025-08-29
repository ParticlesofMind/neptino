/**
 * TextInputHandler - Keyboard Input Management
 * Handles text input, cursor movement, and editing operations
 */

import { ITextInputHandler, ITextArea, ITextCursor } from "./types.js";

export class TextInputHandler implements ITextInputHandler {
  private activeTextArea: ITextArea | null = null;
  private activeCursor: ITextCursor | null = null;
  private cursorPosition: number = 0;
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyPress: (event: KeyboardEvent) => void;
  private boundInput: (event: Event) => void;

  constructor() {
    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyPress = this.handleKeyPress.bind(this);
    this.boundInput = this.handleInput.bind(this);

    // Add event listeners
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keypress', this.boundKeyPress);
    document.addEventListener('input', this.boundInput);

    console.log('📝 TextInputHandler created');
  }

  public setActiveTextArea(textArea: ITextArea | null): void {
    this.activeTextArea = textArea;
    
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
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keypress', this.boundKeyPress);
    document.removeEventListener('input', this.boundInput);
    
    this.activeTextArea = null;
    this.activeCursor = null;
    
    console.log('📝 TextInputHandler destroyed');
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.activeTextArea) return;

    // Prevent default behavior for navigation and editing keys
    if (this.isNavigationOrEditKey(event.key)) {
      event.preventDefault();
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
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.activeTextArea) return;

    // Handle printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      this.insertCharacter(event.key);
      event.preventDefault();
    }
  }

  private handleInput(event: Event): void {
    // Handle input from IME or other input methods
    const inputEvent = event as InputEvent;
    if (!this.activeTextArea || !inputEvent.data) return;
    
    this.insertCharacter(inputEvent.data);
  }

  private insertCharacter(char: string): void {
    if (!this.activeTextArea) return;

    this.activeTextArea.insertText(char, this.cursorPosition);
    this.cursorPosition += char.length;
    this.updateCursorPosition();
  }

  private handleBackspace(): void {
    if (!this.activeTextArea || this.cursorPosition === 0) return;

    this.activeTextArea.deleteText(this.cursorPosition - 1, 1);
    this.cursorPosition--;
    this.updateCursorPosition();
  }

  private handleDelete(): void {
    if (!this.activeTextArea) return;

    const textLength = this.activeTextArea.text.length;
    if (this.cursorPosition < textLength) {
      this.activeTextArea.deleteText(this.cursorPosition, 1);
      this.updateCursorPosition();
    }
  }

  private handleArrowLeft(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (this.cursorPosition > 0) {
      if (shiftKey) {
        // Move to beginning of word
        this.cursorPosition = this.findPreviousWordBoundary(this.cursorPosition);
      } else {
        this.cursorPosition--;
      }
      this.updateCursorPosition();
    }
  }

  private handleArrowRight(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    const textLength = this.activeTextArea.text.length;
    if (this.cursorPosition < textLength) {
      if (shiftKey) {
        // Move to end of word
        this.cursorPosition = this.findNextWordBoundary(this.cursorPosition);
      } else {
        this.cursorPosition++;
      }
      this.updateCursorPosition();
    }
  }

  private handleArrowUp(_shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    // Move cursor up one line
    const newPosition = this.findPositionOneLineUp(this.cursorPosition);
    this.cursorPosition = newPosition;
    this.updateCursorPosition();
  }

  private handleArrowDown(_shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    // Move cursor down one line
    const newPosition = this.findPositionOneLineDown(this.cursorPosition);
    this.cursorPosition = newPosition;
    this.updateCursorPosition();
  }

  private handleHome(_shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    // Move to beginning of line
    this.cursorPosition = this.findLineStart(this.cursorPosition);
    this.updateCursorPosition();
  }

  private handleEnd(_shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    // Move to end of line
    this.cursorPosition = this.findLineEnd(this.cursorPosition);
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

  private updateCursorPosition(): void {
    if (!this.activeTextArea || !this.activeCursor) return;

    // Clamp cursor position
    const textLength = this.activeTextArea.text.length;
    this.cursorPosition = Math.max(0, Math.min(this.cursorPosition, textLength));

    // Update cursor visual position
    this.activeCursor.setPosition(this.cursorPosition);
    const graphicsPos = this.activeTextArea.getCharacterPosition(this.cursorPosition);
    
    if (typeof (this.activeCursor as any).setGraphicsPosition === 'function') {
      (this.activeCursor as any).setGraphicsPosition(graphicsPos.x, graphicsPos.y);
    }
  }

  private isNavigationOrEditKey(key: string): boolean {
    const navKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab'
    ];
    return navKeys.includes(key);
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

    return Math.max(0, pos);
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

  private findPositionOneLineUp(position: number): number {
    // Simplified implementation - would need more complex logic for proper line handling
    return Math.max(0, position - 20); // Rough approximation
  }

  private findPositionOneLineDown(position: number): number {
    if (!this.activeTextArea) return position;

    // Simplified implementation - would need more complex logic for proper line handling
    return Math.min(this.activeTextArea.text.length, position + 20); // Rough approximation
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
