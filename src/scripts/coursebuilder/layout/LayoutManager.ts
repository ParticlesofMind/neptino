/**
 * Layout Manager
 * Handles the creation and management of pedagogical layouts for canvases
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { 
  LayoutTemplate, 
  CourseLayout, 
  CanvasLayout, 
  RenderedBlock, 
  RenderedArea,
  LessonDuration,
  DEFAULT_BLOCKS,
  LESSON_DURATIONS
} from './LayoutTypes';

export class LayoutManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private currentLayout: CourseLayout | null = null;
  private layoutContainer: Container | null = null;
  private pixiApp: any = null; // Reference to PixiJS app for scaling

  constructor(canvasWidth: number = 794, canvasHeight: number = 1123, pixiApp?: any) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.pixiApp = pixiApp;
    
    console.log(`📐 LayoutManager created with dimensions: ${this.canvasWidth}x${this.canvasHeight}`);
  }

  /**
   * Update canvas dimensions (used when canvas is resized or scaled)
   */
  public updateDimensions(width: number, height: number, pixiApp?: any): void {
    console.log(`📐 Updating LayoutManager dimensions from ${this.canvasWidth}x${this.canvasHeight} to ${width}x${height}`);
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (pixiApp) {
      this.pixiApp = pixiApp;
    }
    
    // Recreate the current layout with new dimensions
    if (this.currentLayout) {
      const { courseId, templateId, scheduledSessions, lessonDuration } = this.currentLayout;
      const lessonDurationMinutes = lessonDuration.maxMinutes;
      this.createCourseLayout(courseId, templateId, scheduledSessions, lessonDurationMinutes);
    }
  }

  /**
   * Calculate the total number of canvases needed based on schedule and lesson duration
   */
  public calculateTotalCanvases(scheduledSessions: number, lessonDurationMinutes: number): number {
    const duration = this.determineLessonDuration(lessonDurationMinutes);
    return scheduledSessions * duration.canvasMultiplier;
  }

  /**
   * Determine lesson duration type based on minutes
   */
  private determineLessonDuration(minutes: number): LessonDuration {
    for (const duration of LESSON_DURATIONS) {
      if (minutes <= duration.maxMinutes) {
        return duration;
      }
    }
    return LESSON_DURATIONS[LESSON_DURATIONS.length - 1]; // Default to 'longer'
  }

  /**
   * Create a course layout from course configuration
   */
  public createCourseLayout(
    courseId: string,
    templateId: string,
    scheduledSessions: number,
    lessonDurationMinutes: number,
    customTemplate?: LayoutTemplate
  ): CourseLayout {
    const lessonDuration = this.determineLessonDuration(lessonDurationMinutes);
    const totalCanvases = this.calculateTotalCanvases(scheduledSessions, lessonDurationMinutes);

    // Generate individual canvas layouts
    const canvases: CanvasLayout[] = [];
    let canvasCounter = 1;

    for (let session = 1; session <= scheduledSessions; session++) {
      for (let canvasInSession = 1; canvasInSession <= lessonDuration.canvasMultiplier; canvasInSession++) {
        const canvasLayout = this.createCanvasLayout(
          session,
          canvasCounter,
          customTemplate
        );
        canvases.push(canvasLayout);
        canvasCounter++;
      }
    }

    this.currentLayout = {
      id: `layout-${courseId}`,
      courseId,
      templateId,
      totalCanvases,
      scheduledSessions,
      lessonDuration,
      canvases
    };

    console.log(`📐 Created course layout: ${scheduledSessions} sessions × ${lessonDuration.canvasMultiplier} canvases = ${totalCanvases} total canvases`);
    return this.currentLayout;
  }

  /**
   * Create layout for a single canvas
   */
  private createCanvasLayout(
    sessionNumber: number,
    canvasNumber: number,
    _template?: LayoutTemplate
  ): CanvasLayout {
    const blocks = DEFAULT_BLOCKS;
    const renderedBlocks: RenderedBlock[] = [];

    let currentY = 0;

    console.log(`📐 Creating canvas layout with dimensions: ${this.canvasWidth}x${this.canvasHeight}`);

    for (const block of blocks) {
      const blockHeight = (this.canvasHeight * block.heightPercentage) / 100;
      const areas: RenderedArea[] = [];

      // Create areas within the block if they exist
      if (block.canvasAreas) {
        const areaHeight = blockHeight / block.canvasAreas.length;
        let areaY = currentY;

        for (const area of block.canvasAreas) {
          areas.push({
            areaId: area.id,
            x: 0,
            y: areaY,
            width: this.canvasWidth,
            height: areaHeight
          });
          areaY += areaHeight;
        }
      }

      const renderedBlock: RenderedBlock = {
        blockId: block.id,
        x: 0,
        y: currentY,
        width: this.canvasWidth,
        height: blockHeight,
        areas
      };

      console.log(`📐 Block ${block.id}: x=${renderedBlock.x}, y=${renderedBlock.y}, w=${renderedBlock.width}, h=${renderedBlock.height}`);
      
      renderedBlocks.push(renderedBlock);
      currentY += blockHeight;
    }

    return {
      id: `canvas-${sessionNumber}-${canvasNumber}`,
      sessionNumber,
      canvasNumber,
      blocks: renderedBlocks
    };
  }

  /**
   * Render layout structure on the canvas (visual guides)
   */
  public renderLayoutStructure(container: Container, showLabels: boolean = true): Container {
    if (!this.currentLayout) {
      console.warn('No layout available to render');
      return container;
    }

    console.log(`📐 Rendering layout with manager dimensions: ${this.canvasWidth}x${this.canvasHeight}`);

    // Clear existing layout container
    if (this.layoutContainer) {
      container.removeChild(this.layoutContainer);
      this.layoutContainer.destroy();
    }

    this.layoutContainer = new Container();
    container.addChild(this.layoutContainer);

    // Get the first canvas layout as template (they're all the same structure)
    const canvasLayout = this.currentLayout.canvases[0];

    console.log(`📐 Canvas layout has ${canvasLayout.blocks.length} blocks:`);
    canvasLayout.blocks.forEach(block => {
      console.log(`📐 Block ${block.blockId}: ${block.width}x${block.height} at (${block.x}, ${block.y})`);
    });

    for (const block of canvasLayout.blocks) {
      this.renderBlock(block, showLabels);
    }

    console.log(`📐 Rendered layout structure with ${canvasLayout.blocks.length} blocks`);
    return this.layoutContainer;
  }

  /**
   * Render a single block with visual guides
   */
  private renderBlock(block: RenderedBlock, showLabels: boolean): void {
    if (!this.layoutContainer) return;

    console.log(`📐 Rendering block ${block.blockId}: ${block.width}x${block.height} at (${block.x}, ${block.y})`);

    // Create block outline
    const blockGraphics = new Graphics();
    blockGraphics.rect(block.x, block.y, block.width, block.height);
    blockGraphics.stroke({ width: 2, color: 0x6495ed, alpha: 0.8 }); // Make border more visible
    
    // Add subtle background tint for different blocks
    const blockColors = {
      header: 0xE3F2FD,    // Light blue
      program: 0xF3E5F5,   // Light purple  
      resources: 0xE8F5E8, // Light green
      content: 0xFFF3E0,   // Light orange
      assignment: 0xFCE4EC, // Light pink
      footer: 0xF5F5F5     // Light gray
    };
    
    const bgColor = blockColors[block.blockId as keyof typeof blockColors] || 0xF5F5F5;
    blockGraphics.beginFill(bgColor, 0.3); // Increase opacity
    blockGraphics.drawRect(block.x, block.y, block.width, block.height);
    blockGraphics.endFill();

    this.layoutContainer.addChild(blockGraphics);

    // Add block label if requested
    if (showLabels) {
      const blockLabel = new Text({
        text: block.blockId.charAt(0).toUpperCase() + block.blockId.slice(1),
        style: new TextStyle({
          fontFamily: 'Arial',
          fontSize: Math.max(16, block.height * 0.1), // Scale font with block size
          fill: 0x333333,
          fontWeight: 'bold'
        })
      });
      
      blockLabel.x = block.x + 10;
      blockLabel.y = block.y + 10;
      this.layoutContainer.addChild(blockLabel);
      
      console.log(`📐 Added label "${blockLabel.text}" at (${blockLabel.x}, ${blockLabel.y}) with font size ${blockLabel.style.fontSize}`);
    }

    // Render areas within the block
    for (const area of block.areas) {
      this.renderArea(area, showLabels);
    }
  }

  /**
   * Render a single area within a block
   */
  private renderArea(area: RenderedArea, showLabels: boolean): void {
    if (!this.layoutContainer) return;

    // Create area outline with dashed lines
    const areaGraphics = new Graphics();
    
    // Draw dashed border for areas
    const dashLength = 5;
    const gapLength = 3;
    
    // Top border
    for (let x = area.x; x < area.x + area.width; x += dashLength + gapLength) {
      const endX = Math.min(x + dashLength, area.x + area.width);
      areaGraphics.moveTo(x, area.y);
      areaGraphics.lineTo(endX, area.y);
    }
    
    // Bottom border
    for (let x = area.x; x < area.x + area.width; x += dashLength + gapLength) {
      const endX = Math.min(x + dashLength, area.x + area.width);
      areaGraphics.moveTo(x, area.y + area.height);
      areaGraphics.lineTo(endX, area.y + area.height);
    }
    
    // Left border
    for (let y = area.y; y < area.y + area.height; y += dashLength + gapLength) {
      const endY = Math.min(y + dashLength, area.y + area.height);
      areaGraphics.moveTo(area.x, y);
      areaGraphics.lineTo(area.x, endY);
    }
    
    // Right border
    for (let y = area.y; y < area.y + area.height; y += dashLength + gapLength) {
      const endY = Math.min(y + dashLength, area.y + area.height);
      areaGraphics.moveTo(area.x + area.width, y);
      areaGraphics.lineTo(area.x + area.width, endY);
    }

    areaGraphics.stroke({ width: 1, color: 0x999999, alpha: 0.5 });
    this.layoutContainer.addChild(areaGraphics);

    // Add area label if requested and area is large enough
    if (showLabels && area.height > 20) {
      const areaLabel = new Text({
        text: area.areaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        style: new TextStyle({
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x888888,
          fontStyle: 'italic'
        })
      });
      
      areaLabel.x = area.x + 15;
      areaLabel.y = area.y + area.height / 2 - 5;
      this.layoutContainer.addChild(areaLabel);
    }
  }

  /**
   * Hide layout structure
   */
  public hideLayoutStructure(): void {
    if (this.layoutContainer && this.layoutContainer.parent) {
      this.layoutContainer.visible = false;
    }
  }

  /**
   * Show layout structure
   */
  public showLayoutStructure(): void {
    if (this.layoutContainer) {
      this.layoutContainer.visible = true;
    }
  }

  /**
   * Toggle layout structure visibility
   */
  public toggleLayoutStructure(): boolean {
    if (this.layoutContainer) {
      this.layoutContainer.visible = !this.layoutContainer.visible;
      return this.layoutContainer.visible;
    }
    return false;
  }

  /**
   * Get area at specific coordinates
   */
  public getAreaAtPosition(x: number, y: number, canvasIndex: number = 0): RenderedArea | null {
    if (!this.currentLayout || canvasIndex >= this.currentLayout.canvases.length) {
      return null;
    }

    const canvas = this.currentLayout.canvases[canvasIndex];
    
    for (const block of canvas.blocks) {
      for (const area of block.areas) {
        if (x >= area.x && x <= area.x + area.width &&
            y >= area.y && y <= area.y + area.height) {
          return area;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if an area allows specific content type
   */
  public canAreaAcceptContent(areaId: string, contentType: 'drawing' | 'media' | 'text'): boolean {
    const block = DEFAULT_BLOCKS.find(b => 
      b.canvasAreas?.some(a => a.id === areaId)
    );
    
    if (!block) return false;
    
    const area = block.canvasAreas?.find(a => a.id === areaId);
    if (!area) return false;

    switch (contentType) {
      case 'drawing': return area.allowsDrawing;
      case 'media': return area.allowsMedia;
      case 'text': return area.allowsText;
      default: return false;
    }
  }

  /**
   * Get current layout
   */
  public getCurrentLayout(): CourseLayout | null {
    return this.currentLayout;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.layoutContainer) {
      this.layoutContainer.destroy();
      this.layoutContainer = null;
    }
    this.currentLayout = null;
  }
}
