/**
 * Text Tool Types and Interfaces
 * Defines structures for the drag-to-create text system
 */

import { Point } from "pixi.js";

export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  borderColor: string;
  borderWidth: number;
}

export interface TextAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextPosition {
  x: number;
  y: number;
}

export interface CursorInfo {
  visible: boolean;
  position: TextPosition;
  lineIndex: number;
  charIndex: number;
}

export interface LineInfo {
  text: string;
  width: number;
  startIndex: number;
  endIndex: number;
}

export interface TextInteractionState {
  mode: 'creating' | 'active' | 'inactive';
  isDragging: boolean;
  hasStarted: boolean;
}

export interface TextAreaConfig {
  bounds: TextAreaBounds;
  text: string;
  settings: TextSettings;
}

/**
 * Interface for text area management
 */
export interface ITextArea {
  readonly id: string;
  readonly bounds: TextAreaBounds;
  readonly text: string;
  readonly isActive: boolean;
  
  setActive(active: boolean): void;
  updateBounds(bounds: TextAreaBounds): void;
  updateText(text: string): void;
  insertText(text: string, position: number): void;
  deleteText(start: number, length: number): void;
  getCursorPositionFromPoint(point: Point): number;
  getCharacterPosition(index: number): TextPosition;
  destroy(): void;
}

/**
 * Interface for cursor management
 */
export interface ITextCursor {
  readonly visible: boolean;
  readonly position: number;
  readonly graphicsPosition: TextPosition;
  
  setVisible(visible: boolean): void;
  setPosition(position: number): void;
  startBlinking(): void;
  stopBlinking(): void;
  destroy(): void;
}

/**
 * Interface for text input handling
 */
export interface ITextInputHandler {
  setActiveTextArea(textArea: ITextArea | null): void;
  destroy(): void;
}

/**
 * Interface for text flow management
 */
export interface ITextFlowManager {
  wrapText(text: string, maxWidth: number): LineInfo[];
  calculateTextBounds(text: string, maxWidth: number): { width: number; height: number };
  getLineFromCharIndex(charIndex: number, lines: LineInfo[]): number;
  getCharIndexFromPosition(position: TextPosition, lines: LineInfo[], lineHeight: number): number;
}
