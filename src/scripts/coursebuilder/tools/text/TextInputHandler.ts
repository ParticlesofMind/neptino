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
  private lastClickCount: number = 0;
  private selectionAnchor: number = 0;
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyUp: (event: KeyboardEvent) => void;
  private boundKeyPress: (event: KeyboardEvent) => void;
  private boundInput: (event: Event) => void;
  private onTextChange: ((text: string) => void) | null = null;

  constructor(parent: any) {
    // Create text selection system
    this.textSelection = new TextSelection(parent);
    
    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyPress = this.handleKeyPress.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundInput = this.handleInput.bind(this);

    // Add event listeners
    // Capture phase to intercept before global handlers (e.g., spacebar panning)
    document.addEventListener('keydown', this.boundKeyDown, { capture: true } as any);
    // Some environments fire both keydown and keypress for printable chars.
    // We handle insertion on keydown; keep keypress as a no-op to avoid duplicates.
    document.addEventListener('keypress', this.boundKeyPress, { capture: true } as any);
    document.addEventListener('keyup', this.boundKeyUp, { capture: true } as any);
    document.addEventListener('input', this.boundInput);

  }

  /**
   * Get current cursor position (for debugging and external access)
   */
  public get currentCursorPosition(): number {
    return this.cursorPosition;
  }

  /**
   * Set cursor position (for external updates)
   */
  public set currentCursorPosition(position: number) {
    this.cursorPosition = position;
    this.updateCursorPosition();
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

  /**
   * Public API: select all text in the active text area
   */
  public selectAll(): void {
    if (!this.activeTextArea) return;
    this.textSelection.selectAll();
    // Keep caret blinking and visible while selection is active
    this.updateCursorPosition();
  }

  /**
   * Public API: insert character (for debugging and external access)
   */
  public insertCharacter(char: string): void {
    this.insertCharacterInternal(char);
  }

  public destroy(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.boundKeyDown, { capture: true } as any);
    document.removeEventListener('keypress', this.boundKeyPress, { capture: true } as any);
    document.removeEventListener('keyup', this.boundKeyUp, { capture: true } as any);
    document.removeEventListener('input', this.boundInput);

    // Cleanup components
    this.textSelection?.destroy();
    
    // Clear references
    this.activeTextArea = null;
    this.activeCursor = null;
    
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
      try { (event as any).stopImmediatePropagation?.(); } catch { /* empty */ }
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

    // Handle printable characters including space
    const isSpace = (event.key === ' ' || (event as any).code === 'Space');
    if ((event.key && event.key.length === 1) || isSpace) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const ch = isSpace ? ' ' : event.key;
        this.insertCharacterInternal(ch);
        event.preventDefault();
        event.stopPropagation();
        try { (event as any).stopImmediatePropagation?.(); } catch { /* empty */ }
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  private handleKeyPress(_event: KeyboardEvent): void {
    // Intentionally no-op to avoid double-insertion; keydown handles input.
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.activeTextArea) return;
    // Extra guard: prevent browser/page scroll on Space key on keyup too
    if (event.key === ' ' || (event as any).code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      try { (event as any).stopImmediatePropagation?.(); } catch { /* empty */ }
    }
  }

  private handleInput(event: Event): void {
    // Handle input from IME or other input methods
    const inputEvent = event as InputEvent;
    if (!this.activeTextArea || !inputEvent.data) return;
    
    this.insertCharacterInternal(inputEvent.data);
  }

  private insertCharacterInternal(char: string): void {
    if (!this.activeTextArea) return;

    // Handle selection replacement first
    if (this.textSelection.hasSelection) {
      const newCursorPos = this.textSelection.replaceSelection(char);
      if (newCursorPos >= 0) {
        this.cursorPosition = newCursorPos;
        this.updateCursorPosition();
        return;
      }
    }

    this.activeTextArea.insertText(char, this.cursorPosition);
    this.cursorPosition += char.length;
    this.updateCursorPosition();
    
    // Special handling for space characters to ensure cursor visibility
    if (char === ' ') {
      // Force cursor to be visible immediately after space insertion
      if (this.activeCursor) {
        this.activeCursor.setVisible(true);
        // Restart blinking to ensure the cursor is visible
        this.activeCursor.startBlinking();
      }
    }
    
    if (this.onTextChange) {
      try { this.onTextChange(this.activeTextArea.text); } catch { /* empty */ }
    }
    
  }

  /**
   * Handle mouse click for cursor positioning and text selection
   */
  public handleMouseDown(x: number, y: number): void {
    if (!this.activeTextArea) return;
    
    const point = new Point(x, y);
    const clickPosition = this.activeTextArea.getCursorPositionFromPoint(point);
    const currentTime = Date.now();
    
    // Click sequencing (single/double/triple)
    const isQuick = (currentTime - this.lastClickTime) < 350 && Math.abs(clickPosition - this.lastClickPosition) <= 1;
    this.lastClickCount = isQuick ? (this.lastClickCount + 1) : 1;

    if (this.lastClickCount >= 3) {
      // Triple click: select entire line
      const start = this.findLineStart(clickPosition);
      const end = this.findLineEnd(clickPosition);
      this.textSelection.setSelection(start, end);
      this.cursorPosition = end;
      this.updateCursorPosition();
      this.isMouseDown = false;
    } else if (this.lastClickCount === 2) {
      // Double click: select word
      this.textSelection.selectWordAt(clickPosition);
      this.isMouseDown = false;
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
      try { this.onTextChange(this.activeTextArea.text); } catch { /* empty */ }
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
        try { this.onTextChange(this.activeTextArea.text); } catch { /* empty */ }
      }
    }
  }

  private handleArrowLeft(shiftKey: boolean): void {
    if (!this.activeTextArea) return;

    if (this.textSelection.hasSelection && !shiftKey) {
      // Collapse selection to start
      this.cursorPosition = this.textSelection.selectionStart;
      this.textSelection.clearSelection();
      this.updateCursorPosition();
      return;
    }

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

    if (this.textSelection.hasSelection && !shiftKey) {
      // Collapse selection to end
      this.cursorPosition = this.textSelection.selectionEnd;
      this.textSelection.clearSelection();
      this.updateCursorPosition();
      return;
    }

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

    this.insertCharacterInternal('\n');
  }

  private handleTab(): void {
    if (!this.activeTextArea) return;

    this.insertCharacterInternal('    '); // Insert 4 spaces
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
    // Ensure cursor is flagged visible during any keyboard navigation/editing
    this.activeCursor.setVisible(true);
    this.activeCursor.setPosition(this.cursorPosition);
    const graphicsPos = this.activeTextArea.getCharacterPosition(this.cursorPosition);
    
    // Now we can call setGraphicsPosition properly since it's in the interface
    this.activeCursor.setGraphicsPosition(graphicsPos.x, graphicsPos.y);
    // Ensure cursor is visible immediately after movement/typing
    this.activeCursor.startBlinking();
    
    // Force render update to ensure text changes are reflected
    if (this.activeTextArea && (this.activeTextArea as any).render) {
      (this.activeTextArea as any).render();
    }
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
      'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab', ' '
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
