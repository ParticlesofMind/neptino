/**
 * PixiJS Canvas Manager
 * Handles the PixiJS application and canvas interactions for the course builder
 */

import { Application, Container, FederatedPointerEvent, Graphics, Text } from 'pixi.js';
import { ToolManager } from './tools/ToolManager';

export class PixiCanvas {
  private app: Application | null = null;
  private layoutContainer: Container | null = null; // Protected layout layer
  private drawingContainer: Container | null = null; // User drawing layer
  private toolManager: ToolManager;
  private canvasElement: HTMLElement | null = null;
  private layoutBlocks: any[] = []; // Store current layout for protection

  constructor(containerSelector: string) {
    // Handle both ID (#id) and class (.class) selectors
    if (containerSelector.startsWith('#') || containerSelector.startsWith('.')) {
      this.canvasElement = document.querySelector(containerSelector);
    } else {
      // Fallback for plain ID strings (legacy compatibility)
      this.canvasElement = document.getElementById(containerSelector);
    }
    
    if (!this.canvasElement) {
      throw new Error(`Canvas container with selector "${containerSelector}" not found`);
    }
    this.toolManager = new ToolManager();
  }

  /**
   * Initialize the PixiJS application
   */
  public async init(): Promise<void> {
    try {
      // Create PixiJS application
      this.app = new Application();
      
      // Use fixed A4 dimensions since container is now properly sized in CSS
      const canvasWidth = 794;
      const canvasHeight = 1123;
      const a4AspectRatio = canvasWidth / canvasHeight;

      console.log(`🎨 Using fixed A4 dimensions: ${canvasWidth}x${canvasHeight}`);
      console.log(`🎨 A4 aspect ratio: ${a4AspectRatio}`);

      // Initialize the application with A4 dimensions
      await this.app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0xffffff, // White background
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Clear the canvas container and add PixiJS canvas
      this.canvasElement!.innerHTML = '';
      this.canvasElement!.appendChild(this.app.canvas);

      // Style the canvas to be centered in container
      this.app.canvas.style.display = 'block';
      this.app.canvas.style.margin = 'auto';
      this.app.canvas.style.border = '2px solid #6495ed';
      this.app.canvas.style.borderRadius = '8px';
      this.app.canvas.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';

      // Store the scale factor for layout calculations
      (this.app as any).scaleToA4 = {
        width: 794 / canvasWidth,
        height: 1123 / canvasHeight,
        canvasWidth,
        canvasHeight
      };

      // Create layered container structure for layout protection
      this.initializeLayers();

      // Add a background grid to the layout layer
      this.addBackgroundGrid();

      // Make the stage interactive
      this.app.stage.eventMode = 'static';
      this.app.stage.hitArea = this.app.screen;

      // Add event listeners
      this.setupEvents();

      console.log('🎨 PixiJS Canvas initialized successfully');
      console.log(`🎨 Canvas dimensions: ${canvasWidth}x${canvasHeight} (A4 dimensions)`);
      console.log(`🎨 Canvas screen bounds:`, this.app.screen);
      console.log('🎨 Background grid added');
      console.log('🎨 Event listeners attached');
      console.log('🎨 Drawing container ready');
    } catch (error) {
      console.error('❌ Failed to initialize PixiJS Canvas:', error);
      throw error;
    }
  }

  /**
   * Set up pointer events for tool interactions
   */
  private setupEvents(): void {
    if (!this.app || !this.drawingContainer) return;

    // CRITICAL: Use drawingContainer to protect layout from erasure
    const targetContainer = this.drawingContainer; // Only user drawings, NOT layout

    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      console.log('🎯 EVENT: Passing drawingContainer (layout protected)');
      this.toolManager.onPointerDown(event, targetContainer);
    });

    this.app.stage.on('pointermove', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerMove(event, targetContainer);
    });

    this.app.stage.on('pointerup', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, targetContainer);
    });

    this.app.stage.on('pointerupoutside', (event: FederatedPointerEvent) => {
      this.toolManager.onPointerUp(event, targetContainer);
    });
  }

  /**
   * Add a subtle background grid to help with visual orientation
   */
  private addBackgroundGrid(): void {
    if (!this.app) return;

    const grid = new Graphics();
    const gridSize = 20; // 20px grid
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }

    // Style the grid lines
    grid.stroke({ width: 0.5, color: 0xe0e0e0, alpha: 0.3 });

    // Add grid to layout layer (behind everything)
    if (this.layoutContainer) {
      this.layoutContainer.addChild(grid);
    }
  }

  /**
   * Initialize the layered container structure
   */
  private initializeLayers(): void {
    if (!this.app) return;

    // Create layout container (protected layer)
    this.layoutContainer = new Container();
    this.layoutContainer.name = 'layout-layer';
    this.layoutContainer.interactive = false; // Prevent direct interaction
    this.app.stage.addChild(this.layoutContainer);

    // Create drawing container (user content layer)
    this.drawingContainer = new Container();
    this.drawingContainer.name = 'drawing-layer';
    this.app.stage.addChild(this.drawingContainer);
  }

  /**
   * Set the active tool
   */
  public setTool(toolName: string): boolean {
    console.log(`🔧 PixiCanvas: Attempting to set tool to ${toolName}`);
    const success = this.toolManager.setActiveTool(toolName);
    if (success) {
      this.updateCanvasCursor();
      console.log(`🔧 PixiCanvas: Tool successfully set to ${toolName}`);
    } else {
      console.error(`🔧 PixiCanvas: Failed to set tool to ${toolName}`);
    }
    return success;
  }

  /**
   * Update the canvas cursor based on the active tool
   */
  private updateCanvasCursor(): void {
    if (this.canvasElement) {
      this.canvasElement.style.cursor = this.toolManager.getCursor();
    }
  }

  /**
   * Update color for the current tool
   */
  public updateToolColor(color: string): void {
    this.toolManager.updateColorForCurrentTool(color);
  }

  /**
   * Update tool settings
   */
  public updateToolSettings(toolName: string, settings: any): void {
    this.toolManager.updateToolSettings(toolName, settings);
  }

  /**
   * Get the current active tool name
   */
  public getActiveToolName(): string {
    return this.toolManager.getActiveToolName();
  }

  /**
   * Clear all user drawings from the canvas (LAYOUT PROTECTED)
   * This will NOT erase the pedagogical layout structure
   */
  public clearCanvas(): void {
    if (this.drawingContainer) {
      // Only clear user drawings, preserve layout
      this.drawingContainer.removeChildren();
      console.log('🗑️ User drawings cleared (layout protected)');
    }
  }

  /**
   * DANGEROUS: Clear everything including layout (admin only)
   * This method should be restricted to authorized users
   */
  public clearAll(): void {
    if (this.app) {
      // Clear everything including layout
      this.app.stage.removeChildren();
      
      // Recreate layer structure
      this.initializeLayers();
      
      // Restore layout if it exists
      if (this.layoutBlocks.length > 0) {
        this.renderLayoutAsBackground(this.layoutBlocks);
      }
      
      console.log('⚠️ Everything cleared and restored');
    }
  }  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
      console.log(`Canvas resized to ${width}x${height}`);
    }
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    if (this.app) {
      return {
        width: this.app.screen.width,
        height: this.app.screen.height
      };
    }
    return { width: 0, height: 0 };
  }

  /**
   * Export canvas as image data URL
   */
  public async exportAsImage(): Promise<string> {
    if (!this.app) {
      throw new Error('PixiJS application not initialized');
    }

    try {
      const renderTexture = this.app.renderer.generateTexture(this.app.stage);
      const canvas = this.app.renderer.extract.canvas(renderTexture) as HTMLCanvasElement;
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to export canvas as image:', error);
      throw new Error('Failed to export canvas as image');
    }
  }

  /**
   * Destroy the PixiJS application and clean up resources
   */
  public destroy(): void {
    this.toolManager.destroy();
    
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
      this.layoutContainer = null;
      this.drawingContainer = null;
      this.layoutBlocks = [];
      console.log('PixiJS Canvas destroyed (layout protection cleared)');
    }
  }

  /**
   * Get the PixiJS application instance (for advanced usage)
   */
  public getApp(): Application | null {
    return this.app;
  }

  /**
   * Get the actual canvas dimensions
   */
  public getCanvasDimensions(): { width: number; height: number } {
    if (this.app) {
      return {
        width: this.app.screen.width,
        height: this.app.screen.height
      };
    }
    return { width: 794, height: 1123 }; // A4 fallback
  }

  /**
   * Get detailed canvas information for debugging
   */
  public getCanvasInfo(): any {
    if (!this.app || !this.canvasElement) {
      return { error: 'Canvas not initialized' };
    }

    const containerRect = this.canvasElement.getBoundingClientRect();
    const appScreen = this.app.screen;
    const canvasElement = this.app.canvas;

    return {
      container: {
        width: containerRect.width,
        height: containerRect.height,
        x: containerRect.x,
        y: containerRect.y
      },
      pixiScreen: {
        width: appScreen.width,
        height: appScreen.height
      },
      canvasElement: {
        width: canvasElement.width,
        height: canvasElement.height,
        styleWidth: canvasElement.style.width,
        styleHeight: canvasElement.style.height
      },
      aspectRatio: appScreen.width / appScreen.height,
      a4AspectRatio: 794 / 1123
    };
  }

  /**
   * Get the drawing container (for adding custom elements)
   */
  public getDrawingContainer(): Container | null {
    return this.drawingContainer;
  }

  /**
   * Get the layout container (READ-ONLY - for inspection only)
   * WARNING: Do not modify this container directly!
   */
  public getLayoutContainer(): Container | null {
    console.warn('⚠️ Layout container is READ-ONLY and protected from modification');
    return this.layoutContainer;
  }

  /**
   * Check if the layout is currently protected
   */
  public isLayoutProtected(): boolean {
    return this.layoutBlocks.length > 0;
  }

  /**
   * Get current protected layout blocks (READ-ONLY)
   */
  public getProtectedLayout(): readonly any[] {
    return Object.freeze([...this.layoutBlocks]);
  }

  /**
   * Check if a coordinate is within a user-editable area
   * Returns the area information if editable, null if in protected layout area
   */
  public isCoordinateEditable(x: number, y: number): { editable: boolean; area?: any; reason?: string } {
    if (!this.isLayoutProtected()) {
      return { editable: true, reason: 'No layout protection active' };
    }

    // Check if coordinates are within any layout area that allows user content
    for (const block of this.layoutBlocks) {
      if (block.areas) {
        for (const area of block.areas) {
          if (x >= area.x && x <= area.x + area.width && 
              y >= area.y && y <= area.y + area.height) {
            // Found the area - check if it allows user content
            return {
              editable: area.allowsDrawing || area.allowsMedia || area.allowsText,
              area: area,
              reason: area.allowsDrawing || area.allowsMedia || area.allowsText 
                ? `Within editable area: ${area.areaId}`
                : `Within protected area: ${area.areaId}`
            };
          }
        }
      }
    }

    return { 
      editable: false, 
      reason: 'Outside defined layout areas - layout structure is protected' 
    };
  }

  /**
   * Get the tool manager (for advanced tool operations)
   */
  public getToolManager(): ToolManager {
    return this.toolManager;
  }

  /**
   * Render layout as PROTECTED background structure
   * This layout cannot be erased by normal user actions
   */
  public renderLayoutAsBackground(layoutBlocks: any[]): void {
    if (!this.app || !this.layoutContainer) return;

    // Store layout blocks for protection and restoration
    this.layoutBlocks = [...layoutBlocks];

    // Clear only the layout container, not user drawings
    this.layoutContainer.removeChildren();

    // Create main background
    const background = new Graphics();
    background.rect(0, 0, this.app.screen.width, this.app.screen.height);
    background.fill(0xffffff);
    this.layoutContainer.addChild(background);

    // Add grid to layout layer
    this.addBackgroundGrid();

    // Render each layout block as a PROTECTED background section
    console.log(`🔒 Rendering ${layoutBlocks.length} PROTECTED layout blocks:`, layoutBlocks.map(b => `${b.blockId}: ${b.width}x${b.height}`));
    
    for (const block of layoutBlocks) {
      console.log(`🔒 Rendering PROTECTED block ${block.blockId}: ${block.width}x${block.height} at (${block.x}, ${block.y})`);
      
      const blockGraphics = new Graphics();
      
      // Block colors for different sections
      const blockColors = {
        header: 0xE3F2FD,    // Light blue
        program: 0xF3E5F5,   // Light purple  
        resources: 0xE8F5E8, // Light green
        content: 0xFFF8E1,   // Light yellow/cream
        assignment: 0xFCE4EC, // Light pink
        footer: 0xF5F5F5     // Light gray
      };
      
      const bgColor = blockColors[block.blockId as keyof typeof blockColors] || 0xF9F9F9;
      
      // Fill block area with color
      blockGraphics.rect(block.x, block.y, block.width, block.height);
      blockGraphics.fill({ color: bgColor, alpha: 0.3 });
      
      // Add border
      blockGraphics.rect(block.x, block.y, block.width, block.height);
      blockGraphics.stroke({ width: 1, color: 0xcccccc, alpha: 0.8 });
      
      // Mark this as protected layout content
      blockGraphics.name = `layout-block-${block.blockId}`;
      blockGraphics.interactive = false; // Prevent user interaction
      
      this.layoutContainer.addChild(blockGraphics);

      // Add block title - use consistent font size regardless of block height
      const blockTitle = new Text({
        text: block.blockId.charAt(0).toUpperCase() + block.blockId.slice(1),
        style: {
          fontFamily: 'Arial',
          fontSize: 16, // Fixed font size for consistency across all blocks
          fill: 0x333333, // Darker text for better visibility
          fontWeight: 'bold'
        }
      });
      
      blockTitle.position.set(block.x + 15, block.y + 12); // Increased padding
      blockTitle.name = `layout-title-${block.blockId}`;
      blockTitle.interactive = false; // Prevent user interaction
      this.layoutContainer.addChild(blockTitle);

      // Render sub-areas if they exist
      for (const area of block.areas || []) {
        const areaGraphics = new Graphics();
        
        // Dashed border for areas
        areaGraphics.rect(area.x + 1, area.y + 1, area.width - 2, area.height - 2);
        areaGraphics.stroke({ width: 1, color: 0x999999, alpha: 0.4 });
        
        areaGraphics.name = `layout-area-${area.areaId}`;
        areaGraphics.interactive = false; // Prevent user interaction
        this.layoutContainer.addChild(areaGraphics);

        // Render template content if available (interactive input field representations)
        if (area.content && Array.isArray(area.content) && area.content.length > 0) {
          // Check if this is header content area for row layout
          const isHeaderContentArea = area.areaId === 'header-content-area';
          console.log(`🔍 Debug - Block: "${block.id}", Area: "${area.areaId}", isHeaderContentArea: ${isHeaderContentArea}, fields: ${area.content.length}`);
          
          // Also update document title for debugging
          document.title = `Block: ${block.id}, Area: ${area.areaId}, HeaderContentArea: ${isHeaderContentArea}`;
          
          if (isHeaderContentArea) {
            // Header: Horizontal row layout
            console.log(`🎯 Using HORIZONTAL layout for header content area with ${area.content.length} fields`);
            let xOffset = 10;
            
            for (const field of area.content) {
              // Calculate field width based on type
              const fieldWidth = field.inputType === 'checkbox' ? 80 : 120;
              
              // Check if field fits in current row
              if (xOffset + fieldWidth > area.width - 10) break;
              
              // Create field label
              const fieldLabel = new Text({
                text: field.label + (field.required ? ' *' : ''),
                style: {
                  fontFamily: 'Arial',
                  fontSize: 8,
                  fill: 0x333333,
                  fontWeight: field.required ? 'bold' : 'normal'
                }
              });
              
              fieldLabel.position.set(area.x + xOffset, area.y + 5);
              fieldLabel.name = `field-label-${area.areaId}-${field.key}`;
              fieldLabel.interactive = false;
              this.layoutContainer.addChild(fieldLabel);
              
              // Create interactive input field representation
              const inputContainer = new Container();
              inputContainer.name = `field-container-${area.areaId}-${field.key}`;
              
              const inputBg = new Graphics();
              const inputWidth = field.inputType === 'checkbox' ? 12 : Math.min(fieldWidth - 20, 100);
              const inputHeight = field.inputType === 'checkbox' ? 12 : 16;
              
              // Different visual styles for different input types
              if (field.inputType === 'checkbox') {
                // Checkbox representation
                inputBg.rect(0, 0, 12, 12);
                inputBg.stroke({ width: 1, color: 0x666666 });
                inputBg.fill(0xffffff);
                
                // Make checkbox interactive
                inputBg.interactive = true;
                inputBg.cursor = 'pointer';
                inputBg.on('pointerdown', () => this.handleCheckboxClick(field, inputBg));
                
              } else {
                // Text/number input representation
                inputBg.rect(0, 0, inputWidth, inputHeight);
                inputBg.stroke({ width: 1, color: 0x999999 });
                inputBg.fill(0xfafafa);
                
                // Make input interactive
                inputBg.interactive = true;
                inputBg.cursor = 'text';
                inputBg.on('pointerdown', () => this.handleInputClick(field, area, inputContainer));
              }
              
              inputContainer.addChild(inputBg);
              inputContainer.position.set(area.x + xOffset, area.y + 18);
              this.layoutContainer.addChild(inputContainer);
              
              // Add current value or placeholder text (non-checkbox only)
              if (field.inputType !== 'checkbox') {
                const displayText = field.value || field.placeholder;
                const textColor = field.value ? 0x333333 : 0x999999;
                const textStyle = field.value ? 'normal' : 'italic';
                
                const inputText = new Text({
                  text: displayText,
                  style: {
                    fontFamily: 'Arial',
                    fontSize: 7,
                    fill: textColor,
                    fontStyle: textStyle
                  }
                });
                
                inputText.position.set(3, 2);
                inputText.name = `field-text-${area.areaId}-${field.key}`;
                inputContainer.addChild(inputText);
              }
              
              // Move to next horizontal position
              xOffset += fieldWidth;
            }
            
          } else {
            // Other areas: Vertical column layout
            console.log(`📋 Using VERTICAL layout for area "${area.areaId}" with ${area.content.length} fields`);
            let yOffset = 10;
            
            for (const field of area.content) {
              // Create field label
              const fieldLabel = new Text({
                text: field.label + (field.required ? ' *' : ''),
                style: {
                  fontFamily: 'Arial',
                  fontSize: 9,
                  fill: 0x333333,
                  fontWeight: field.required ? 'bold' : 'normal'
                }
              });
              
              fieldLabel.position.set(area.x + 10, area.y + yOffset);
              fieldLabel.name = `field-label-${area.areaId}-${field.key}`;
              fieldLabel.interactive = false;
              this.layoutContainer.addChild(fieldLabel);
              
              // Create interactive input field representation
              const inputContainer = new Container();
              inputContainer.name = `field-container-${area.areaId}-${field.key}`;
              
              const inputBg = new Graphics();
              const inputWidth = Math.min(area.width - 20, 150);
              const inputHeight = field.inputType === 'checkbox' ? 16 : 20;
              
              // Different visual styles for different input types
              if (field.inputType === 'checkbox') {
                // Checkbox representation
                inputBg.rect(0, 0, 12, 12);
                inputBg.stroke({ width: 1, color: 0x666666 });
                inputBg.fill(0xffffff);
                
                // Make checkbox interactive
                inputBg.interactive = true;
                inputBg.cursor = 'pointer';
                inputBg.on('pointerdown', () => this.handleCheckboxClick(field, inputBg));
                
              } else {
                // Text/number input representation
                inputBg.rect(0, 0, inputWidth, inputHeight);
                inputBg.stroke({ width: 1, color: 0x999999 });
                inputBg.fill(0xfafafa);
                
                // Make input interactive
                inputBg.interactive = true;
                inputBg.cursor = 'text';
                inputBg.on('pointerdown', () => this.handleInputClick(field, area, inputContainer));
              }
              
              inputContainer.addChild(inputBg);
              inputContainer.position.set(area.x + 10, area.y + yOffset + 15);
              this.layoutContainer.addChild(inputContainer);
              
              // Add current value or placeholder text
              if (field.inputType !== 'checkbox') {
                const displayText = field.value || field.placeholder;
                const textColor = field.value ? 0x333333 : 0x999999;
                const textStyle = field.value ? 'normal' : 'italic';
                
                const inputText = new Text({
                  text: displayText,
                  style: {
                    fontFamily: 'Arial',
                    fontSize: 8,
                    fill: textColor,
                    fontStyle: textStyle
                  }
                });
                
                inputText.position.set(5, 3);
                inputText.name = `field-text-${area.areaId}-${field.key}`;
                inputContainer.addChild(inputText);
              }
              
              // Move to next field position
              yOffset += field.inputType === 'checkbox' ? 35 : 45;
              
              // Break if we're running out of space
              if (yOffset + 30 > area.height) break;
            }
          }
        } else if (area.content && typeof area.content === 'string' && area.content.trim()) {
          // Fallback to simple text rendering for non-array content
          const contentText = new Text({
            text: area.content,
            style: {
              fontFamily: 'Arial',
              fontSize: 10,
              fill: 0x666666,
              wordWrap: true,
              wordWrapWidth: area.width - 40,
              breakWords: true
            }
          });
          
          contentText.position.set(area.x + 20, area.y + 10);
          contentText.name = `layout-content-${area.areaId}`;
          contentText.interactive = false;
          this.layoutContainer.addChild(contentText);
        }
      }
    }

    console.log('🔒 PROTECTED layout structure rendered - cannot be erased by users');
  }

  /**
   * Handle click on text/number input field
   */
  private handleInputClick(field: any, area: any, inputContainer: Container): void {
    console.log(`🔤 Input clicked: ${field.key} (${field.inputType})`);
    
    // Find the text element within the container
    const textElement = inputContainer.getChildByName(`field-text-${area.areaId}-${field.key}`) as Text;
    if (!textElement) return;

    // Create a temporary HTML input for editing
    this.createTemporaryInput(field, area, inputContainer, textElement);
  }

  /**
   * Handle click on checkbox field
   */
  private handleCheckboxClick(field: any, checkboxBg: Graphics): void {
    console.log(`☑️ Checkbox clicked: ${field.key}`);
    
    // Toggle checkbox state
    field.checked = !field.checked;
    
    // Update visual appearance
    checkboxBg.clear();
    checkboxBg.rect(0, 0, 12, 12);
    checkboxBg.stroke({ width: 1, color: 0x666666 });
    checkboxBg.fill(field.checked ? 0x007acc : 0xffffff);
    
    // Add checkmark if checked
    if (field.checked) {
      checkboxBg.moveTo(2, 6);
      checkboxBg.lineTo(5, 9);
      checkboxBg.lineTo(10, 3);
      checkboxBg.stroke({ width: 2, color: 0xffffff });
    }
    
    console.log(`☑️ Checkbox ${field.key} is now: ${field.checked}`);
  }

  /**
   * Create temporary HTML input overlay for text editing
   */
  private createTemporaryInput(field: any, area: any, inputContainer: Container, textElement: Text): void {
    // Get the global position of the input container
    const globalPos = inputContainer.toGlobal({ x: 0, y: 0 });
    
    if (!this.app?.canvas) {
      console.error('Canvas element not available for input overlay');
      return;
    }
    
    const canvasRect = this.app.canvas.getBoundingClientRect();
    
    // Create HTML input element
    const input = document.createElement('input');
    input.type = field.inputType === 'number' ? 'number' : 'text';
    input.value = field.value || '';
    input.placeholder = field.placeholder;
    
    // Style the input to match the canvas element
    input.style.position = 'absolute';
    input.style.left = `${canvasRect.left + globalPos.x + 5}px`;
    input.style.top = `${canvasRect.top + globalPos.y + 3}px`;
    input.style.width = `${Math.min(area.width - 30, 140)}px`;
    input.style.height = '14px';
    input.style.fontSize = '8px';
    input.style.fontFamily = 'Arial';
    input.style.border = '1px solid #007acc';
    input.style.padding = '2px';
    input.style.zIndex = '1000';
    input.style.backgroundColor = '#ffffff';
    
    // Add to document
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    // Handle input completion
    const finishEditing = () => {
      const newValue = input.value.trim();
      
      // Update field value
      field.value = newValue;
      
      // Update text element
      textElement.text = newValue || field.placeholder;
      textElement.style.fill = newValue ? 0x333333 : 0x999999;
      textElement.style.fontStyle = newValue ? 'normal' : 'italic';
      
      // Remove HTML input
      document.body.removeChild(input);
      
      console.log(`🔤 Field ${field.key} updated to: "${newValue}"`);
    };
    
    // Event listeners
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        document.body.removeChild(input);
      }
    });
  }

  /**
   * Update canvas margins - this affects the overall canvas drawing area
   */
  public updateMargins(margins: { top: number; bottom: number; left: number; right: number }): void {
    console.log('📏 PixiCanvas: Updating margins', margins);
    
    // For now, we'll store the margins for future use
    // The main layout adjustment is handled by the LayoutManager
    // This method can be extended to add visual margin indicators if needed
    
    // Optional: Add visual margin guides
    this.renderMarginGuides(margins);
  }

  /**
   * Render visual margin guides on the canvas
   */
  private renderMarginGuides(margins: { top: number; bottom: number; left: number; right: number }): void {
    if (!this.app || !this.layoutContainer) return;

    // Remove existing margin guides
    const existingGuides = this.layoutContainer.children.filter(child => child.name?.startsWith('margin-guide'));
    existingGuides.forEach(guide => this.layoutContainer?.removeChild(guide));

    // Create margin guide graphics
    const marginGuides = new Graphics();
    marginGuides.name = 'margin-guides';

    // Draw margin boundaries with subtle lines
    const guideColor = 0xcccccc;
    const guideAlpha = 0.3;
    
    const canvasWidth = this.app.screen.width;
    const canvasHeight = this.app.screen.height;

    // Top margin line
    if (margins.top > 0) {
      marginGuides.moveTo(0, margins.top);
      marginGuides.lineTo(canvasWidth, margins.top);
    }

    // Bottom margin line  
    if (margins.bottom > 0) {
      marginGuides.moveTo(0, canvasHeight - margins.bottom);
      marginGuides.lineTo(canvasWidth, canvasHeight - margins.bottom);
    }

    // Left margin line
    if (margins.left > 0) {
      marginGuides.moveTo(margins.left, 0);
      marginGuides.lineTo(margins.left, canvasHeight);
    }

    // Right margin line
    if (margins.right > 0) {
      marginGuides.moveTo(canvasWidth - margins.right, 0);
      marginGuides.lineTo(canvasWidth - margins.right, canvasHeight);
    }

    marginGuides.stroke({ width: 1, color: guideColor, alpha: guideAlpha });
    marginGuides.interactive = false; // Prevent user interaction
    
    // Add to layout container so it appears behind user content but above background
    this.layoutContainer.addChildAt(marginGuides, 0);

    console.log('📏 PixiCanvas: Margin guides rendered');
  }
}
