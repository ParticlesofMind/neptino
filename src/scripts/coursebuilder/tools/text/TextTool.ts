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
import { PROFESSIONAL_COLORS, TEXT_SIZES, FONT_FAMILIES } from "../SharedResources.js";

export class TextTool extends BaseTool {
  private state: TextInteractionState = {
    mode: 'inactive',
    isDragging: false,
    hasStarted: false
  };
  
  private dragPreview: Graphics | null = null;
  private startPoint: Point = new Point(0, 0);
  private currentPoint: Point = new Point(0, 0);
  private textAreas: TextArea[] = [];
  private activeTextArea: TextArea | null = null;
  private textCursor: TextCursor | null = null;
  private inputHandler: TextInputHandler;
  
  // Double-click detection
  private lastClickTime: number = 0;
  private lastClickPoint: Point = new Point(0, 0);
  private doubleClickThreshold: number = 300; // ms
  private doubleClickDistance: number = 10; // pixels
  
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

    this.inputHandler = new TextInputHandler();

    console.log('📝 TextTool initialized with drag-to-create system');
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) {
      console.log('📝 TextTool: Ignoring pointer down - tool not active');
      return;
    }

    const localPoint = container.toLocal(event.global);
    const currentTime = Date.now();
    
    // Check if we clicked on an existing text area
    const clickedTextArea = this.findTextAreaAtPoint(localPoint);
    
    if (clickedTextArea) {
      // Check for double-click
      const timeDiff = currentTime - this.lastClickTime;
      const distance = Math.sqrt(
        Math.pow(localPoint.x - this.lastClickPoint.x, 2) +
        Math.pow(localPoint.y - this.lastClickPoint.y, 2)
      );
      
      const isDoubleClick = timeDiff < this.doubleClickThreshold && distance < this.doubleClickDistance;
      
      if (isDoubleClick) {
        // Double-click: activate for editing
        this.handleTextAreaDoubleClick(clickedTextArea, localPoint);
      } else {
        // Single click: just select (activate without editing)
        this.handleTextAreaSingleClick(clickedTextArea);
      }
      
      // Update click tracking
      this.lastClickTime = currentTime;
      this.lastClickPoint.copyFrom(localPoint);
      return;
    }

    // Check if clicking outside all text areas (deactivate current)
    if (this.activeTextArea) {
      this.deactivateCurrentTextArea();
    }

    // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
    const canvasBounds = this.manager.getCanvasBounds();
    if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
      console.log(`📝 TextTool: 🚫 Click in margin area rejected`);
      return;
    }

    // Update click tracking for potential drag start
    this.lastClickTime = currentTime;
    this.lastClickPoint.copyFrom(localPoint);

    // Start drag creation
    this.startDragCreation(localPoint, container);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    if (this.state.isDragging && this.dragPreview) {
      const localPoint = container.toLocal(event.global);
      
      // 🎯 BOUNDARY ENFORCEMENT: Clamp to canvas bounds
      const canvasBounds = this.manager.getCanvasBounds();
      const clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
      
      this.currentPoint.copyFrom(clampedPoint);
      this.updateDragPreview();
    }
  }

  onPointerUp(_event: FederatedPointerEvent, container: Container): void {
    if (!this.isActive) return;

    if (this.state.isDragging) {
      this.finalizeDragCreation(container);
    }
  }

  onActivate(): void {
    super.onActivate();
    console.log('📝 TextTool activated');
  }

  onDeactivate(): void {
    super.onDeactivate();
    this.cleanupDragState();
    this.deactivateCurrentTextArea();
    console.log('📝 TextTool deactivated');
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
        this.inputHandler.setActiveTextArea(null);
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
    this.inputHandler.setActiveTextArea(null);
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

    const width = this.currentPoint.x - this.startPoint.x;
    const height = this.currentPoint.y - this.startPoint.y;
    
    this.dragPreview.clear();
    
    // Draw rectangle from start to current point
    const rectX = Math.min(this.startPoint.x, this.currentPoint.x);
    const rectY = Math.min(this.startPoint.y, this.currentPoint.y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);
    
    // Always draw the preview, even if small - user needs visual feedback
    if (rectWidth >= 1 && rectHeight >= 1) {
      // Draw blue-bordered rectangle
      this.dragPreview
        .rect(rectX, rectY, rectWidth, rectHeight)
        .stroke({ 
          width: this.settings.borderWidth, 
          color: this.hexToNumber(this.settings.borderColor)
        });
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
    }
    
    console.log(`📝 Drag preview updated: ${rectWidth}x${rectHeight} at (${Math.round(rectX)}, ${Math.round(rectY)})`);
  }

  private finalizeDragCreation(container: Container): void {
    if (!this.dragPreview) return;

    const width = Math.abs(this.currentPoint.x - this.startPoint.x);
    const height = Math.abs(this.currentPoint.y - this.startPoint.y);
    
    // Only create text area if drag is significant enough
    const minSize = 30; // Minimum 30px in either dimension
    if (width >= minSize && height >= minSize) {
      this.createTextArea(container);
      // Keep the drag preview visible until user starts typing
      // It will be cleaned up when the text area becomes active and shows its own border
    } else {
      console.log('📝 Drag too small, no text area created');
      // Only cleanup if no text area was created
      this.cleanupDragState();
    }

    // Reset drag state but keep preview if text area was created
    this.state = {
      mode: 'active', // Change to active since we have a text area now
      isDragging: false,
      hasStarted: false
    };
  }

  private createTextArea(container: Container): void {
    // Calculate initial bounds
    let x = Math.min(this.startPoint.x, this.currentPoint.x);
    let y = Math.min(this.startPoint.y, this.currentPoint.y);
    let width = Math.abs(this.currentPoint.x - this.startPoint.x);
    let height = Math.abs(this.currentPoint.y - this.startPoint.y);

    // 🎯 BOUNDARY ENFORCEMENT: Ensure text area respects canvas margins
    const canvasBounds = this.manager.getCanvasBounds();
    const constrainedBounds = BoundaryUtils.constrainRectangle(
      { x, y, width, height },
      canvasBounds
    );
    
    // Use the constrained bounds
    const bounds: TextAreaBounds = constrainedBounds;
    
    console.log(`📝 TextArea bounds constrained from ${width}x${height} to ${bounds.width}x${bounds.height}`);
    
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
    
    console.log(`📝 TextArea created: ${bounds.width}x${bounds.height} at (${Math.round(bounds.x)}, ${Math.round(bounds.y)})`);
  }

  private activateTextArea(textArea: TextArea): void {
    // Deactivate previous
    if (this.activeTextArea) {
      this.activeTextArea.setActive(false);
    }

    // Activate new
    this.activeTextArea = textArea;
    textArea.setActive(true);
    
    // Clean up drag preview when text area becomes active (shows its own border)
    this.cleanupDragPreview();
    
    // Create/update cursor
    if (!this.textCursor) {
      this.textCursor = new TextCursor(textArea.pixiContainer, textArea.textLineHeight);
    } else {
      // Move cursor to new text area by recreating it
      this.textCursor.destroy();
      this.textCursor = new TextCursor(textArea.pixiContainer, textArea.textLineHeight);
    }
    
    // Set up input handling
    this.inputHandler.setActiveTextArea(textArea);
    this.inputHandler.setActiveCursor(this.textCursor);
    
    // Position cursor at start
    const startPos = textArea.getCharacterPosition(0);
    (this.textCursor as any).setGraphicsPosition(startPos.x, startPos.y);
    this.textCursor.setVisible(true);
    
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
    
    this.inputHandler.setActiveTextArea(null);
    this.state.mode = 'inactive';
    
    console.log('📝 Text area deactivated');
  }

  private handleTextAreaSingleClick(textArea: TextArea): void {
    // Single click: just select the text area (visual indication)
    if (this.activeTextArea && this.activeTextArea !== textArea) {
      this.activeTextArea.setActive(false);
    }
    
    this.activeTextArea = textArea;
    textArea.setActive(true);
    
    // Don't start editing mode, just show it's selected
    if (this.textCursor) {
      this.textCursor.setVisible(false);
    }
    
    this.state.mode = 'inactive'; // Keep in inactive mode
    console.log(`📝 Text area selected: ${textArea.id}`);
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
  }

  public destroy(): void {
    this.cleanupDragState();
    this.clearAllTextAreas();
    
    if (this.textCursor) {
      this.textCursor.destroy();
      this.textCursor = null;
    }
    
    this.inputHandler.destroy();
    
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
