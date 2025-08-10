/**
 * Text Tool
 * Allows adding and editing text on the canvas
 */

import { FederatedPointerEvent, Container, Text, TextStyle } from 'pixi.js';
import { BaseTool } from './ToolInterface';

interface TextSettings {
  fontFamily: string;
  fontSize: number;
  color: string;
}

export class TextTool extends BaseTool {
  private activeTextInput: HTMLInputElement | null = null;
  private tempText: Text | null = null;

  constructor() {
    super('text', 'text');
    this.settings = {
      fontFamily: 'Arial',
      fontSize: 16,
      color: '#000000'
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    const point = event.global;
    this.createTextInput(point.x, point.y, container);
  }

  onPointerMove(): void {
    // Text tool doesn't need move events
  }

  onPointerUp(): void {
    // Text tool doesn't need up events
  }

  private createTextInput(x: number, y: number, container: Container): void {
    // Remove any existing text input
    this.removeTextInput();

    // Create HTML input for text entry
    this.activeTextInput = document.createElement('input');
    this.activeTextInput.type = 'text';
    this.activeTextInput.style.position = 'absolute';
    this.activeTextInput.style.left = `${x}px`;
    this.activeTextInput.style.top = `${y}px`;
    this.activeTextInput.style.fontSize = `${this.settings.fontSize}px`;
    this.activeTextInput.style.fontFamily = this.settings.fontFamily;
    this.activeTextInput.style.color = this.settings.color;
    this.activeTextInput.style.background = 'transparent';
    this.activeTextInput.style.border = '1px dashed #ccc';
    this.activeTextInput.style.outline = 'none';
    this.activeTextInput.style.zIndex = '1000';
    this.activeTextInput.placeholder = 'Enter text...';

    // Add to page
    document.body.appendChild(this.activeTextInput);
    this.activeTextInput.focus();

    // Handle text completion
    this.activeTextInput.addEventListener('blur', () => {
      this.finalizeText(x, y, container);
    });

    this.activeTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.finalizeText(x, y, container);
      } else if (e.key === 'Escape') {
        this.removeTextInput();
      }
    });
  }

  private finalizeText(x: number, y: number, container: Container): void {
    if (!this.activeTextInput) return;

    const textContent = this.activeTextInput.value.trim();
    
    if (textContent) {
      // Create PixiJS text object
      const style = new TextStyle({
        fontFamily: this.settings.fontFamily,
        fontSize: this.settings.fontSize,
        fill: this.settings.color,
      });

      const textObject = new Text({ text: textContent, style });
      textObject.x = x;
      textObject.y = y;
      textObject.eventMode = 'static'; // Make it selectable

      container.addChild(textObject);
    }

    this.removeTextInput();
  }

  private removeTextInput(): void {
    if (this.activeTextInput) {
      this.activeTextInput.remove();
      this.activeTextInput = null;
    }
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.removeTextInput();
  }

  updateSettings(settings: TextSettings): void {
    this.settings = { ...this.settings, ...settings };
  }
}
