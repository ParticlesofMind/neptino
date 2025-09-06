/**
 * TextTool - Drag-to-Create Text System
 * Main tool implementation for creating text areas with drag interaction
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "../ToolInterface.js";
import { BoundaryUtils } from "../BoundaryUtils.js";
import { 
  TextSettings, 
  TextAreaBounds, 
  TextInteractionState,
  TextAreaConfig 
} from "./types.js";
import { TextArea } from "./TextArea.js";
import { TextCursor } from "./TextCursor.js";
import { TextInputHandler } from "./TextInputHandler.js";
import { CreationGuide } from "./CreationGuide.js";
import { SizeLabel } from "./SizeLabel.js";
import { PROFESSIONAL_COLORS, TEXT_SIZES, FONT_FAMILIES } from "../SharedResources.js";

export class TextTool extends BaseTool {
  private state: TextInteractionState = {
    mode: 'inactive',
    isDragging: false,
    hasStarted: false
  };
  
  private dragPreview: Graphics | null = null;
  private creationGuide: CreationGuide | null = null;
  private sizeLabel: SizeLabel | null = null;
  private startPoint: Point = new Point(0, 0);
  private currentPoint: Point = new Point(0, 0);
  private proportionalDrag: boolean = false; // Shift to create square
  private textAreas: TextArea[] = [];
  private activeTextArea: TextArea | null = null;
  private textCursor: TextCursor | null = null;
  private inputHandler: TextInputHandler | null = null;
  
  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickPoint: Point = new Point(0, 0);
  
  // Canvas element for cursor management
  private canvasElement: HTMLElement | null = null;
  
  declare protected settings: TextSettings;

  constructor() {
    super("text", "text");
    
    this.settings = {
      fontFamily: FONT_FAMILIES[0], // Inter
      fontSize: TEXT_SIZES[4], // 16px
      color: PROFESSIONAL_COLORS[0], // Dark charcoal
      borderColor: "#4a90e2", // Blue border
      borderWidth: 2,
      backgroundColor: undefined // Transparent by default
    };

    this.inputHandler = null; // Will be created when first needed

    console.log('📝 TextTool initialized with drag-to-create system');
  }

  private ensureInputHandler(container: Container): TextInputHandler {
    if (!this.inputHandler) {
      this.inputHandler = new TextInputHandler(container);
      console.log('📝 TextInputHandler created with container');
    }
    return this.inputHandler;
  }

    onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) {
      console.log('📝 TextTool: Ignoring pointer down - tool not active');
      return;
    }

    const localPoint = container.toLocal(event.global);
    const currentTime = Date.now();
    
    // 🎯 BOUNDARY ENFORCEMENT: Clamp to canvas bounds from the start
    const canvasBounds = this.manager.getCanvasBounds();
    const clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
    
    console.log(`📝 TextTool pointer down at (${clampedPoint.x.toFixed(1)}, ${clampedPoint.y.toFixed(1)})`);

    // Check if clicking inside an existing text area
    // Use global point for hit-testing against text areas
    const globalClamped = (container as any).toGlobal ? (container as any).toGlobal(clampedPoint) : event.global;
    const existingTextArea = this.findTextAreaAtPoint(globalClamped);
    if (existingTextArea) {
      console.log('📝 Clicked inside existing text area');
      // Convert to text-area local coordinates for precise caret placement
      const localInText = existingTextArea.pixiContainer.toLocal(globalClamped);

      // Detect double-click inside the text area to enter editing mode explicitly
      const isDoubleClick = (currentTime - this.lastClickTime < 350) &&
                            (Math.abs(localInText.x - this.lastClickPoint.x) < 8) &&
                            (Math.abs(localInText.y - this.lastClickPoint.y) < 8);

      this.activateTextArea(existingTextArea);

      const inputHandler = this.ensureInputHandler(container);
      if (isDoubleClick) {
        // Double-click: place caret and fully enter edit mode
        console.log('📝 Double-click inside text area - entering edit mode');
        this.handleTextAreaDoubleClick(existingTextArea, localInText);
      } else {
        // Single-click: place caret and prepare for drag selection
        inputHandler.handleMouseDown(localInText.x, localInText.y);
      }

      // Update click tracking in text-area local space
      this.lastClickTime = currentTime;
      this.lastClickPoint.copyFrom(localInText);
      return;
    }

    // Check for double-click to start new text area
    if (currentTime - this.lastClickTime < 300 && 
        Math.abs(clampedPoint.x - this.lastClickPoint.x) < 10 && 
        Math.abs(clampedPoint.y - this.lastClickPoint.y) < 10) {
      
      console.log('📝 Double-click detected - starting text creation');
      this.proportionalDrag = !!(event as any).shiftKey;
      this.startDragCreation(clampedPoint, container);
    } else {
      // Single click on empty area - deactivate current text
      console.log('📝 Single click on empty area - deactivating current text');
      this.deactivateCurrentTextArea();
    }

    // Update click tracking
    this.lastClickTime = currentTime;
    this.lastClickPoint.copyFrom(clampedPoint);

    // Start drag creation on single click hold
    if (!this.state.isDragging) {
      this.proportionalDrag = !!(event as any).shiftKey;
      this.startDragCreation(clampedPoint, container);
    }
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    const localPoint = container.toLocal(event.global);

    if (this.state.isDragging && this.dragPreview) {
      // 🎯 BOUNDARY ENFORCEMENT: Clamp to canvas bounds
      const canvasBounds = this.manager.getCanvasBounds();
      const clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
      
      this.currentPoint.copyFrom(clampedPoint);
      // Update proportional flag from Shift
      this.proportionalDrag = !!(event as any).shiftKey;
      this.updateDragPreview();
    } else {
      // Handle text selection drag if input handler exists
      const inputHandler = this.ensureInputHandler(container);
      if (this.activeTextArea) {
        const global = (container as any).toGlobal ? (container as any).toGlobal(localPoint) : (event as any).global;
        const localInText = this.activeTextArea.pixiContainer.toLocal(global);
        inputHandler.handleMouseMove(localInText.x, localInText.y);
      }
      
      // Update cursor based on hover context
      this.updatePointerCursor(localPoint);
    }
  }

  onPointerUp(_event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    // Notify input handler of mouse up
    const inputHandler = this.ensureInputHandler(container);
    inputHandler.handleMouseUp();

    if (this.state.isDragging) {
      this.finalizeDragCreation(container);
    }
  }

  onActivate(): void {
    super.onActivate();
    this.initializeCursorManagement();
    // Expose instance for tests and debug
    try {
      const self = this as any;
      const api = new Proxy(self, {
        get(target, prop: PropertyKey, receiver) {
          if (prop === 'activeTextArea') return target.activeTextArea;
          if (prop === 'textCursor') return target.textCursor;
          if (prop === 'settings') return target.settings;
          return Reflect.get(target, prop, receiver);
        }
      });
      (window as any).textTool = api;
    } catch {}
    console.log('📝 TextTool activated');
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.hideCreationGuide(); // Hide guide when switching tools (this is the only time it should disappear)
    this.cleanupDragState();
    this.deactivateCurrentTextArea();
    this.cleanupCursorManagement();
    console.log('📝 TextTool deactivated');
  }

  /**
   * Initialize cursor management for professional pointer behavior
   */
  private initializeCursorManagement(): void {
    this.canvasElement = document.querySelector('#pixi-canvas');
    if (this.canvasElement) {
      // Set default text I-beam cursor over empty canvas
      this.setCanvasCursor('text');
    }
  }

  /**
   * Cleanup cursor management
   */
  private cleanupCursorManagement(): void {
    if (this.canvasElement) {
      this.setCanvasCursor('default');
      this.canvasElement = null;
    }
  }

  /**
   * Set canvas cursor type
   */
  private setCanvasCursor(cursor: string): void {
    if (this.canvasElement) {
      this.canvasElement.style.cursor = cursor;
    }
  }

  /**
   * Show creation guide with persistent behavior
   */
  private showCreationGuide(bounds: TextAreaBounds, container: Container): void {
    if (!this.creationGuide) {
      this.creationGuide = new CreationGuide(container);
    }
    this.creationGuide.show(bounds);
  }

  /**
   * Hide creation guide
   */
  private hideCreationGuide(): void {
    if (this.creationGuide) {
      this.creationGuide.hide();
    }
  }

  /**
   * Update pointer cursor based on hover context
   */
  private updatePointerCursor(localPoint: Point): void {
    const hoveredTextArea = this.findTextAreaAtPoint(localPoint);
    
    if (hoveredTextArea) {
      // Over existing text area - could show resize handles or I-beam
      // For now, just show text cursor when inside text content
      this.setCanvasCursor('text');
    } else {
      // Over empty canvas - show I-beam for text creation
      this.setCanvasCursor('text');
    }
  }

  updateSettings(settings: Partial<TextSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // Update active text area if any
    if (this.activeTextArea) {
      // Update active text area settings would go here
      console.log('📝 Updated settings for active text area');
    }
  }

  /**
   * Get all text areas managed by this tool
   */
  public getTextAreas(): TextArea[] {
    return [...this.textAreas];
  }

  /**
   * Remove a specific text area
   */
  public removeTextArea(textArea: TextArea): void {
    const index = this.textAreas.indexOf(textArea);
    if (index !== -1) {
      this.textAreas.splice(index, 1);
      
      if (this.activeTextArea === textArea) {
        this.activeTextArea = null;
        this.inputHandler?.setActiveTextArea(null);
      }
      
      textArea.destroy();
      console.log(`📝 TextArea removed: ${textArea.id}`);
    }
  }

  /**
   * Clear all text areas
   */
  public clearAllTextAreas(): void {
    this.textAreas.forEach(textArea => textArea.destroy());
    this.textAreas = [];
    this.activeTextArea = null;
    this.inputHandler?.setActiveTextArea(null);
    console.log('📝 All text areas cleared');
  }

  /**
   * Activate a PIXI text object for editing (called from selection tool)
   */
  public activateTextObjectForEditing(pixiTextObject: any, point: Point, _container: Container): void {
    // Find the text area that contains this PIXI text object
    const textArea = this.findTextAreaByPixiObject(pixiTextObject);
    
    if (textArea) {
      // Convert global point to local point within the text area
      const localPoint = textArea.pixiContainer.toLocal(point);
      this.handleTextAreaDoubleClick(textArea, localPoint);
      console.log('📝 Activated text area for editing from selection tool');
    } else {
      console.warn('📝 Could not find text area for PIXI text object');
    }
  }

  /**
   * Find text area that contains a specific PIXI text object
   */
  private findTextAreaByPixiObject(pixiTextObject: any): TextArea | null {
    for (const textArea of this.textAreas) {
      // Check if this text area's container contains the PIXI text object
      if (textArea.pixiContainer.children.includes(pixiTextObject) ||
          this.isChildOfContainer(pixiTextObject, textArea.pixiContainer)) {
        return textArea;
      }
    }
    return null;
  }

  /**
   * Check if an object is a child of a container (recursively)
   */
  private isChildOfContainer(object: any, container: any): boolean {
    if (!container.children) return false;
    
    for (const child of container.children) {
      if (child === object) return true;
      if (this.isChildOfContainer(object, child)) return true;
    }
    return false;
  }

  private startDragCreation(localPoint: Point, container: Container): void {
    console.log(`📝 Starting drag creation at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    
    this.state = {
      mode: 'creating',
      isDragging: true,
      hasStarted: true
    };
    
    this.startPoint.copyFrom(localPoint);
    this.currentPoint.copyFrom(localPoint);
    
    // Create drag preview rectangle
    this.dragPreview = new Graphics();
    this.dragPreview.eventMode = 'none';
    this.dragPreview.alpha = 0.8; // Slightly transparent for better visibility
    this.dragPreview.zIndex = 1000; // Ensure it's on top
    container.addChild(this.dragPreview);
    
    this.updateDragPreview();
  }

  private updateDragPreview(): void {
    if (!this.dragPreview) return;

    let width = this.currentPoint.x - this.startPoint.x;
    let height = this.currentPoint.y - this.startPoint.y;
    
    this.dragPreview.clear();
    
    // Draw rectangle from start to current point
    let rectX = Math.min(this.startPoint.x, this.currentPoint.x);
    let rectY = Math.min(this.startPoint.y, this.currentPoint.y);
    let rectWidth = Math.abs(width);
    let rectHeight = Math.abs(height);

    // If proportional mode, enforce square
    if (this.proportionalDrag) {
      const maxDim = Math.max(rectWidth, rectHeight);
      const signX = width >= 0 ? 1 : -1;
      const signY = height >= 0 ? 1 : -1;
      rectWidth = maxDim;
      rectHeight = maxDim;
      rectX = this.startPoint.x + (signX < 0 ? -maxDim : 0);
      rectY = this.startPoint.y + (signY < 0 ? -maxDim : 0);
      // Normalize width/height variables used for label
      width = signX * maxDim;
      height = signY * maxDim;
    }
    
    // Always draw the preview, even if small - user needs visual feedback
    if (rectWidth >= 1 && rectHeight >= 1) {
      // Draw blue-bordered rectangle
      this.dragPreview
        .rect(rectX, rectY, rectWidth, rectHeight)
        .stroke({ 
          width: this.settings.borderWidth, 
          color: this.hexToNumber(this.settings.borderColor)
        });
      
      // Show size label during drag
      if (!this.sizeLabel && this.dragPreview.parent) {
        this.sizeLabel = new SizeLabel(this.dragPreview.parent);
      }
      if (this.sizeLabel) {
        this.sizeLabel.show(rectWidth, rectHeight, { x: rectX, y: rectY });
      }
    } else {
      // For very small drags, draw a small cross or dot as indicator
      this.dragPreview
        .moveTo(rectX - 5, rectY)
        .lineTo(rectX + 5, rectY)
        .moveTo(rectX, rectY - 5)
        .lineTo(rectX, rectY + 5)
        .stroke({ 
          width: 2, 
          color: this.hexToNumber(this.settings.borderColor)
        });
        
      // Hide size label for very small drags
      if (this.sizeLabel) {
        this.sizeLabel.hide();
      }
    }
    
    console.log(`📝 Drag preview updated: ${rectWidth}×${rectHeight} at (${Math.round(rectX)}, ${Math.round(rectY)})`);
  }

  private finalizeDragCreation(container: Container): void {
    if (!this.dragPreview) return;

    let width = Math.abs(this.currentPoint.x - this.startPoint.x);
    let height = Math.abs(this.currentPoint.y - this.startPoint.y);
    if (this.proportionalDrag) {
      const maxDim = Math.max(width, height);
      width = maxDim;
      height = maxDim;
    }
    
    // Only create text area if drag is significant enough
    const minSize = 30; // Minimum 30px in either dimension
    if (width >= minSize && height >= minSize) {
      // Calculate bounds with proportional constraint if needed
      let x = Math.min(this.startPoint.x, this.currentPoint.x);
      let y = Math.min(this.startPoint.y, this.currentPoint.y);
      if (this.proportionalDrag) {
        const sx = this.currentPoint.x - this.startPoint.x >= 0 ? 1 : -1;
        const sy = this.currentPoint.y - this.startPoint.y >= 0 ? 1 : -1;
        x = this.startPoint.x + (sx < 0 ? -width : 0);
        y = this.startPoint.y + (sy < 0 ? -height : 0);
      }
      const bounds = { x, y, width, height } as TextAreaBounds;
      const config: TextAreaConfig = {
        bounds,
        text: '',
        settings: { ...this.settings }
      };
      const textArea = new TextArea(config, container);
      this.textAreas.push(textArea);
      this.activateTextArea(textArea);
      
      // Hide drag preview and size label
      this.cleanupDragPreview();
      
      // Show persistent creation guide with size label at the text area bounds
      this.showCreationGuide(bounds, container);
      
      console.log('📝 Text area created and creation guide positioned at bounds');
    } else {
      console.log('📝 Drag too small, no text area created');
      // Only cleanup if no text area was created
      this.cleanupDragState();
    }

    // Reset drag state - CRITICAL: This prevents the guide from following cursor
    this.state = {
      mode: width >= minSize && height >= minSize ? 'active' : 'inactive',
      isDragging: false,
      hasStarted: false
    };
    
    // Clear drag points to prevent any residual attachment
    this.startPoint.set(0, 0);
    this.currentPoint.set(0, 0);
    this.proportionalDrag = false;
  }

  private createTextArea(container: Container): TextAreaBounds {
    // Calculate bounds
    const x = Math.min(this.startPoint.x, this.currentPoint.x);
    const y = Math.min(this.startPoint.y, this.currentPoint.y);
    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);

    const bounds: TextAreaBounds = { x, y, width, height };
    
    const config: TextAreaConfig = {
      bounds,
      text: '', // Start with empty text
      settings: { ...this.settings }
    };

    // Create text area
    const textArea = new TextArea(config, container);
    this.textAreas.push(textArea);
    
    // Activate the new text area
    this.activateTextArea(textArea);
    
    console.log(`📝 TextArea created: ${width}×${height} at (${Math.round(x)}, ${Math.round(y)})`);
    
    return bounds;
  }

  private activateTextArea(textArea: TextArea): void {
    // Deactivate previous
    if (this.activeTextArea) {
      this.activeTextArea.setActive(false);
    }

    // Activate new
    this.activeTextArea = textArea;
    textArea.setActive(true);
    
    // Create/update cursor
    if (!this.textCursor) {
      this.textCursor = new TextCursor(textArea.pixiContainer, textArea.textLineHeight);
    } else {
      // Move cursor to new text area by recreating it
      this.textCursor.destroy();
      this.textCursor = new TextCursor(textArea.pixiContainer, textArea.textLineHeight);
    }
    
    // Set proper cursor height based on text settings
    this.textCursor.setHeight(Math.max(textArea.textLineHeight, this.settings.fontSize + 4));
    
    // Set up input handling - ensure inputHandler exists
    const inputHandler = this.ensureInputHandler(textArea.pixiContainer);
    inputHandler.setActiveTextArea(textArea);
    inputHandler.setActiveCursor(this.textCursor);
    try {
      // Ensure keyboard events route to the page
      this.canvasElement = document.querySelector('#pixi-canvas');
      (this.canvasElement as any)?.focus?.();
    } catch {}
    
    // Position cursor at start
    const startPos = textArea.getCharacterPosition(0);
    (this.textCursor as any).setGraphicsPosition(startPos.x, startPos.y);
    this.textCursor.setVisible(true);
    
    console.log(`📝 Cursor activated at position (${startPos.x}, ${startPos.y}) with height ${this.textCursor.pixiGraphics.height}`);
    
    this.state.mode = 'active';
  }

  private deactivateCurrentTextArea(): void {
    if (this.activeTextArea) {
      this.activeTextArea.setActive(false);
      this.activeTextArea = null;
    }
    
    if (this.textCursor) {
      this.textCursor.setVisible(false);
    }
    
    // Clear input handler if it exists
    if (this.inputHandler) {
      this.inputHandler.setActiveTextArea(null);
    }
    this.state.mode = 'inactive';
    
    console.log('📝 Text area deactivated');
  }

  // ======= Test/Debug accessors =======
  public get activeTextAreaPublic(): TextArea | null {
    return this.activeTextArea;
  }
  public get textCursorPublic(): TextCursor | null {
    return this.textCursor;
  }
  public get settingsPublic(): TextSettings {
    return this.settings;
  }

  private handleTextAreaDoubleClick(textArea: TextArea, localPoint: Point): void {
    // Double-click: activate for editing
    this.activateTextArea(textArea);
    
    // Position cursor at click location
    const cursorPos = textArea.getCursorPositionFromPoint(localPoint);
    if (this.textCursor) {
      this.textCursor.setPosition(cursorPos);
      const graphicsPos = textArea.getCharacterPosition(cursorPos);
      (this.textCursor as any).setGraphicsPosition(graphicsPos.x, graphicsPos.y);
    }
    
    console.log(`📝 Text area double-clicked for editing: ${textArea.id}`);
  }

  private findTextAreaAtPoint(point: Point): TextArea | null {
    // Check in reverse order to prioritize recently created areas
    for (let i = this.textAreas.length - 1; i >= 0; i--) {
      const textArea = this.textAreas[i];
      if (textArea.containsPoint(point)) {
        return textArea;
      }
    }
    return null;
  }

  private cleanupDragState(): void {
    this.cleanupDragPreview();
    
    this.state = {
      mode: 'inactive',
      isDragging: false,
      hasStarted: false
    };
  }

  private cleanupDragPreview(): void {
    if (this.dragPreview) {
      this.dragPreview.parent?.removeChild(this.dragPreview);
      this.dragPreview.destroy();
      this.dragPreview = null;
    }
    
    if (this.sizeLabel) {
      this.sizeLabel.destroy();
      this.sizeLabel = null;
    }
  }

  public destroy(): void {
    this.cleanupDragState();
    this.clearAllTextAreas();
    
    if (this.creationGuide) {
      this.creationGuide.destroy();
      this.creationGuide = null;
    }
    
    if (this.textCursor) {
      this.textCursor.destroy();
      this.textCursor = null;
    }
    
    // Destroy input handler if it exists
    if (this.inputHandler) {
      this.inputHandler.destroy();
    }
    
    console.log('📝 TextTool destroyed');
  }

  // Static helper methods for UI
  static getAvailableFonts(): string[] {
    return FONT_FAMILIES;
  }

  static getAvailableSizes(): number[] {
    return TEXT_SIZES;
  }

  static getAvailableColors(): string[] {
    return PROFESSIONAL_COLORS;
  }
}
