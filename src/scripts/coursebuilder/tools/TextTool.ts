/**
 * Text Tool
 * Professional text area system with rich formatting and proper canvas integration
 */

import { FederatedPointerEvent, Container, Text, TextStyle, Point } from 'pixi.js';
import { BaseTool } from './ToolInterface';
import { PROFESSIONAL_COLORS, TEXT_SIZES, FONT_FAMILIES, TEXT_CONSTANTS, hexToNumber } from './SharedResources';

interface TextSettings {
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontStyle: string;
  align: string;
}

export class TextTool extends BaseTool {
  private activeTextArea: HTMLTextAreaElement | null = null;
  private textPosition: Point = new Point(0, 0);
  private canvasContainer: HTMLElement | null = null;

  constructor() {
    super('text', 'text');
    this.settings = {
      fontFamily: FONT_FAMILIES[0], // Start with Inter
      fontSize: TEXT_SIZES[4],      // Start with 16px
      color: PROFESSIONAL_COLORS[0], // Start with dark charcoal
      fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'left'
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    console.log(`📝 TEXT: Text placement at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`);
    console.log(`📝 TEXT: Settings - Font: ${this.settings.fontFamily}, Size: ${this.settings.fontSize}px, Color: ${this.settings.color}`);
    
    const localPoint = container.toLocal(event.global);
    this.textPosition.copyFrom(localPoint);
    
    // Find canvas container for proper positioning
    this.findCanvasContainer();
    
    this.createTextArea(event.global.x, event.global.y, container);
  }

  onPointerMove(): void {
    // Text tool doesn't need move events for placement
  }

  onPointerUp(): void {
    // Text tool doesn't need up events for placement
  }

  private findCanvasContainer(): void {
    // Try to find the canvas container element for proper positioning
    const canvasElement = document.querySelector('canvas');
    if (canvasElement) {
      this.canvasContainer = canvasElement.parentElement || document.body;
    } else {
      this.canvasContainer = document.body;
    }
  }

  private createTextArea(x: number, y: number, container: Container): void {
    // Remove any existing text area
    this.removeTextArea();

    console.log(`📝 TEXT: Creating professional text area at global (${Math.round(x)}, ${Math.round(y)})`);

    // Create HTML textarea for professional text entry
    this.activeTextArea = document.createElement('textarea');
    
    // Professional styling
    this.activeTextArea.style.position = 'absolute';
    this.activeTextArea.style.left = `${x}px`;
    this.activeTextArea.style.top = `${y}px`;
    this.activeTextArea.style.minWidth = `${TEXT_CONSTANTS.MIN_TEXT_AREA_SIZE.width}px`;
    this.activeTextArea.style.minHeight = `${TEXT_CONSTANTS.MIN_TEXT_AREA_SIZE.height}px`;
    this.activeTextArea.style.fontSize = `${this.settings.fontSize}px`;
    this.activeTextArea.style.fontFamily = this.settings.fontFamily;
    this.activeTextArea.style.fontWeight = this.settings.fontWeight;
    this.activeTextArea.style.fontStyle = this.settings.fontStyle;
    this.activeTextArea.style.color = this.settings.color;
    this.activeTextArea.style.textAlign = this.settings.align as any;
    this.activeTextArea.style.background = TEXT_CONSTANTS.TEXTAREA_BACKGROUND;
    this.activeTextArea.style.border = TEXT_CONSTANTS.TEXTAREA_BORDER;
    this.activeTextArea.style.outline = 'none';
    this.activeTextArea.style.resize = 'both';
    this.activeTextArea.style.zIndex = '1000';
    this.activeTextArea.style.padding = '8px';
    this.activeTextArea.style.borderRadius = '4px';
    this.activeTextArea.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    this.activeTextArea.placeholder = 'Enter your text here...';

    // Professional interaction
    this.activeTextArea.rows = 3;
    this.activeTextArea.cols = 30;

    // Add to appropriate container
    this.canvasContainer?.appendChild(this.activeTextArea);
    this.activeTextArea.focus();
    this.activeTextArea.select(); // Select all text for immediate editing

    console.log(`📝 TEXT: Professional text area created and focused`);

    // Handle text completion with improved events
    this.activeTextArea.addEventListener('blur', () => {
      // Small delay to allow other interactions
      setTimeout(() => {
        if (this.activeTextArea) {
          this.finalizeText(container);
        }
      }, 100);
    });

    this.activeTextArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter to finalize
        e.preventDefault();
        this.finalizeText(container);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.removeTextArea();
      }
      // Allow normal Enter for line breaks
    });

    // Auto-resize textarea as user types
    this.activeTextArea.addEventListener('input', () => {
      this.autoResizeTextArea();
    });
  }

  private autoResizeTextArea(): void {
    if (!this.activeTextArea) return;
    
    // Reset height to auto to get proper scrollHeight
    this.activeTextArea.style.height = 'auto';
    
    // Set height to scrollHeight with some padding
    const newHeight = Math.max(
      TEXT_CONSTANTS.MIN_TEXT_AREA_SIZE.height,
      this.activeTextArea.scrollHeight + 4
    );
    
    this.activeTextArea.style.height = `${newHeight}px`;
  }

  private finalizeText(container: Container): void {
    if (!this.activeTextArea) return;

    const textContent = this.activeTextArea.value.trim();
    
    console.log(`📝 TEXT: Finalizing text: "${textContent}"`);
    
    if (textContent) {
      // Create professional PixiJS text object
      const style = new TextStyle({
        fontFamily: this.settings.fontFamily,
        fontSize: this.settings.fontSize,
        fontWeight: this.settings.fontWeight,
        fontStyle: this.settings.fontStyle,
        fill: this.settings.color,
        align: this.settings.align as any,
        wordWrap: true,
        wordWrapWidth: 400, // Reasonable wrap width
        lineHeight: this.settings.fontSize * 1.2, // Professional line spacing
        padding: 4 // Prevent text clipping
      });

      const textObject = new Text({ text: textContent, style });
      textObject.position.set(this.textPosition.x, this.textPosition.y);
      textObject.eventMode = 'static'; // Make it selectable for future tools

      container.addChild(textObject);
      
      console.log(`📝 TEXT: Professional text object created and added to canvas`);
    }

    this.removeTextArea();
  }

  private removeTextArea(): void {
    if (this.activeTextArea && this.activeTextArea.parentNode) {
      this.activeTextArea.parentNode.removeChild(this.activeTextArea);
      this.activeTextArea = null;
      console.log(`📝 TEXT: Text area removed`);
    }
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.removeTextArea();
    console.log(`📝 TEXT: Tool deactivated, cleaned up text area`);
  }

  updateSettings(settings: TextSettings): void {
    console.log(`📝 TEXT: Updating settings from:`, this.settings);
    console.log(`📝 TEXT: Updating settings to:`, settings);
    this.settings = { ...this.settings, ...settings };
    console.log(`📝 TEXT: Final text settings:`, this.settings);
    
    // Update active text area if it exists
    if (this.activeTextArea) {
      this.activeTextArea.style.fontSize = `${this.settings.fontSize}px`;
      this.activeTextArea.style.fontFamily = this.settings.fontFamily;
      this.activeTextArea.style.fontWeight = this.settings.fontWeight;
      this.activeTextArea.style.fontStyle = this.settings.fontStyle;
      this.activeTextArea.style.color = this.settings.color;
      this.activeTextArea.style.textAlign = this.settings.align as any;
    }
  }

  // Get available fonts for UI
  static getAvailableFonts(): string[] {
    return FONT_FAMILIES;
  }

  // Get available text sizes for UI
  static getAvailableTextSizes(): number[] {
    return TEXT_SIZES;
  }

  // Get available colors for UI
  static getAvailableColors(): string[] {
    return PROFESSIONAL_COLORS;
  }

  // Get text alignment options
  static getAlignmentOptions(): string[] {
    return ['left', 'center', 'right', 'justify'];
  }

  // Get font weight options
  static getFontWeights(): string[] {
    return ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  }

  // Get font style options
  static getFontStyles(): string[] {
    return ['normal', 'italic', 'oblique'];
  }
}
