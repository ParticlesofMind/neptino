/**
 * Unified Layout Manager
 * Handles creation, management, and navigation of pedagogical layouts for canvases
 * Combines LayoutManager + CanvasNavigator + PixiJS Layout v3 features
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

// Navigation types
interface CanvasThumbnail {
  id: string;
  sessionNumber: number;
  canvasNumber: number;
  element: HTMLElement;
  isActive: boolean;
}

export class LayoutManager {
  // Layout properties
  private canvasWidth: number;
  private canvasHeight: number;
  private currentLayout: CourseLayout | null = null;
  private layoutContainer: Container | null = null;
  
  // Navigation properties  
  private thumbnails: CanvasThumbnail[] = [];
  private currentCanvasIndex: number = 0;
  private tocContainer: HTMLElement | null = null;
  private onCanvasChangeCallback: ((canvasIndex: number) => void) | null = null;

  constructor(canvasWidth: number = 794, canvasHeight: number = 1123, tocContainerId: string = 'coursebuilder__toc') {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Initialize navigation
    this.tocContainer = document.getElementById(tocContainerId);
    if (!this.tocContainer) {
      console.warn(`TOC container with id "${tocContainerId}" not found`);
    }
    
    console.log(`📐 LayoutManager created with dimensions: ${this.canvasWidth}x${this.canvasHeight}`);
  }

  /**
   * Update canvas dimensions (used when canvas is resized or scaled)
   */
  public updateDimensions(width: number, height: number): void {
    console.log(`📐 Updating LayoutManager dimensions from ${this.canvasWidth}x${this.canvasHeight} to ${width}x${height}`);
    this.canvasWidth = width;
    this.canvasHeight = height;
    
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

    // Auto-initialize navigation
    this.initNavigation(this.currentLayout);

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

  // ========================================
  // NAVIGATION METHODS (formerly CanvasNavigator)
  // ========================================

  /**
   * Set callback for canvas change events
   */
  public onCanvasChange(callback: (canvasIndex: number) => void): void {
    this.onCanvasChangeCallback = callback;
  }

  /**
   * Initialize navigation with course layout
   */
  public initNavigation(courseLayout: CourseLayout): void {
    this.currentLayout = courseLayout;
    this.currentCanvasIndex = 0;
    this.generateThumbnails();
    this.renderTOC();
    
    console.log(`🧭 Navigation initialized with ${courseLayout.totalCanvases} canvases`);
  }

  /**
   * Generate thumbnail data for all canvases
   */
  private generateThumbnails(): void {
    if (!this.currentLayout) return;

    this.thumbnails = [];
    
    for (let i = 0; i < this.currentLayout.canvases.length; i++) {
      const canvas = this.currentLayout.canvases[i];
      
      const thumbnail: CanvasThumbnail = {
        id: canvas.id,
        sessionNumber: canvas.sessionNumber,
        canvasNumber: canvas.canvasNumber,
        element: this.createThumbnailElement(canvas, i),
        isActive: i === 0
      };
      
      this.thumbnails.push(thumbnail);
    }
  }

  /**
   * Create HTML element for a canvas thumbnail
   */
  private createThumbnailElement(canvas: CanvasLayout, index: number): HTMLElement {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'canvas-thumbnail';
    thumbnail.dataset.canvasIndex = index.toString();
    
    // Create thumbnail preview (simplified layout representation)
    const preview = document.createElement('div');
    preview.className = 'canvas-thumbnail__preview';
    
    // Add blocks as colored segments
    let currentHeight = 0;
    for (const block of canvas.blocks) {
      const blockElement = document.createElement('div');
      blockElement.className = `canvas-thumbnail__block canvas-thumbnail__block--${block.blockId}`;
      
      const heightPercent = (block.height / 1123) * 100; // Assuming A4 height
      blockElement.style.height = `${heightPercent}%`;
      blockElement.style.top = `${currentHeight}%`;
      currentHeight += heightPercent;
      
      preview.appendChild(blockElement);
    }
    
    thumbnail.appendChild(preview);
    
    // Add label
    const label = document.createElement('div');
    label.className = 'canvas-thumbnail__label';
    
    // Determine canvas type based on position within session
    const canvasInSession = ((canvas.canvasNumber - 1) % this.currentLayout!.lessonDuration.canvasMultiplier) + 1;
    const canvasTypeName = this.getCanvasTypeName(canvasInSession);
    
    label.innerHTML = `
      <div class="canvas-thumbnail__session">Session ${canvas.sessionNumber}</div>
      <div class="canvas-thumbnail__type">${canvasTypeName}</div>
      <div class="canvas-thumbnail__number">${canvas.canvasNumber}</div>
    `;
    
    thumbnail.appendChild(label);
    
    // Add click handler
    thumbnail.addEventListener('click', () => {
      this.navigateToCanvas(index);
    });
    
    return thumbnail;
  }

  /**
   * Get descriptive name for canvas based on its position in session
   */
  private getCanvasTypeName(canvasInSession: number): string {
    if (!this.currentLayout) return 'Canvas';
    
    const multiplier = this.currentLayout.lessonDuration.canvasMultiplier;
    
    if (multiplier === 1) return 'Main';
    if (multiplier === 2) {
      return canvasInSession === 1 ? 'Intro' : 'Main';
    }
    if (multiplier === 4) {
      const names = ['Intro', 'Content A', 'Content B', 'Wrap-up'];
      return names[canvasInSession - 1] || `Canvas ${canvasInSession}`;
    }
    if (multiplier === 8) {
      const names = ['Intro', 'Warm-up', 'Content A', 'Activity A', 'Content B', 'Activity B', 'Review', 'Wrap-up'];
      return names[canvasInSession - 1] || `Canvas ${canvasInSession}`;
    }
    
    return `Canvas ${canvasInSession}`;
  }

  /**
   * Render the table of contents
   */
  private renderTOC(): void {
    if (!this.tocContainer || !this.currentLayout) {
      console.warn('TOC container not available or no layout');
      return;
    }

    // Clear existing content
    this.tocContainer.innerHTML = '';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'canvas-toc__header';
    header.innerHTML = `
      <h3>Canvas Navigation</h3>
      <div class="canvas-toc__summary">
        ${this.currentLayout.totalCanvases} canvases across ${this.currentLayout.scheduledSessions} sessions
      </div>
    `;
    this.tocContainer.appendChild(header);
    
    // Add navigation controls
    const controls = document.createElement('div');
    controls.className = 'canvas-toc__controls';
    controls.innerHTML = `
      <button class="canvas-nav-btn canvas-nav-btn--prev" title="Previous Canvas">
        <span class="canvas-nav-btn__icon">←</span>
      </button>
      <span class="canvas-nav-current">
        Canvas ${this.currentCanvasIndex + 1} of ${this.currentLayout.totalCanvases}
      </span>
      <button class="canvas-nav-btn canvas-nav-btn--next" title="Next Canvas">
        <span class="canvas-nav-btn__icon">→</span>
      </button>
    `;
    this.tocContainer.appendChild(controls);
    
    // Add event listeners for navigation buttons
    const prevBtn = controls.querySelector('.canvas-nav-btn--prev') as HTMLButtonElement;
    const nextBtn = controls.querySelector('.canvas-nav-btn--next') as HTMLButtonElement;
    
    prevBtn.addEventListener('click', () => this.navigateToPrevious());
    nextBtn.addEventListener('click', () => this.navigateToNext());
    
    // Add scrollable thumbnails container
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'canvas-toc__scroll';
    
    const thumbnailsContainer = document.createElement('div');
    thumbnailsContainer.className = 'canvas-toc__thumbnails';
    
    // Add all thumbnails
    for (const thumbnail of this.thumbnails) {
      thumbnailsContainer.appendChild(thumbnail.element);
    }
    
    scrollContainer.appendChild(thumbnailsContainer);
    this.tocContainer.appendChild(scrollContainer);
    
    // Set initial active state
    this.updateActiveCanvas(0);
  }

  /**
   * Navigate to specific canvas by index
   */
  public navigateToCanvas(index: number): void {
    if (!this.currentLayout || index < 0 || index >= this.currentLayout.canvases.length) {
      console.warn(`Invalid canvas index: ${index}`);
      return;
    }

    const previousIndex = this.currentCanvasIndex;
    this.currentCanvasIndex = index;
    
    this.updateActiveCanvas(index);
    this.scrollToActiveThumbnail();
    
    // Trigger callback
    if (this.onCanvasChangeCallback) {
      this.onCanvasChangeCallback(index);
    }
    
    console.log(`🧭 Navigated from canvas ${previousIndex + 1} to canvas ${index + 1}`);
  }

  /**
   * Navigate to previous canvas
   */
  public navigateToPrevious(): void {
    if (this.currentCanvasIndex > 0) {
      this.navigateToCanvas(this.currentCanvasIndex - 1);
    }
  }

  /**
   * Navigate to next canvas
   */
  public navigateToNext(): void {
    if (this.currentLayout && this.currentCanvasIndex < this.currentLayout.canvases.length - 1) {
      this.navigateToCanvas(this.currentCanvasIndex + 1);
    }
  }

  /**
   * Update visual state of active canvas
   */
  private updateActiveCanvas(index: number): void {
    if (!this.currentLayout) return;

    // Update thumbnail states
    for (let i = 0; i < this.thumbnails.length; i++) {
      const thumbnail = this.thumbnails[i];
      thumbnail.isActive = i === index;
      
      if (thumbnail.isActive) {
        thumbnail.element.classList.add('canvas-thumbnail--active');
      } else {
        thumbnail.element.classList.remove('canvas-thumbnail--active');
      }
    }
    
    // Update navigation counter
    const currentIndicator = this.tocContainer?.querySelector('.canvas-nav-current');
    if (currentIndicator) {
      currentIndicator.textContent = `Canvas ${index + 1} of ${this.currentLayout.totalCanvases}`;
    }
    
    // Update navigation button states
    const prevBtn = this.tocContainer?.querySelector('.canvas-nav-btn--prev') as HTMLButtonElement;
    const nextBtn = this.tocContainer?.querySelector('.canvas-nav-btn--next') as HTMLButtonElement;
    
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === this.currentLayout.totalCanvases - 1;
  }

  /**
   * Scroll TOC to show active thumbnail
   */
  private scrollToActiveThumbnail(): void {
    const activeThumbnail = this.thumbnails[this.currentCanvasIndex];
    if (!activeThumbnail) return;

    const scrollContainer = this.tocContainer?.querySelector('.canvas-toc__scroll');
    if (!scrollContainer) return;

    // Calculate scroll position to center the active thumbnail
    const thumbnailElement = activeThumbnail.element;
    const containerHeight = scrollContainer.clientHeight;
    const thumbnailTop = thumbnailElement.offsetTop;
    const thumbnailHeight = thumbnailElement.offsetHeight;
    
    const scrollTop = thumbnailTop - (containerHeight / 2) + (thumbnailHeight / 2);
    
    scrollContainer.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth'
    });
  }

  /**
   * Get current canvas index
   */
  public getCurrentCanvasIndex(): number {
    return this.currentCanvasIndex;
  }

  /**
   * Get current canvas layout
   */
  public getCurrentCanvas(): CanvasLayout | null {
    if (!this.currentLayout) return null;
    return this.currentLayout.canvases[this.currentCanvasIndex] || null;
  }

  /**
   * Jump to specific session
   */
  public navigateToSession(sessionNumber: number): void {
    if (!this.currentLayout) return;

    const firstCanvasOfSession = this.currentLayout.canvases.find(
      canvas => canvas.sessionNumber === sessionNumber
    );
    
    if (firstCanvasOfSession) {
      const index = this.currentLayout.canvases.indexOf(firstCanvasOfSession);
      this.navigateToCanvas(index);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clean up layout resources
    if (this.layoutContainer) {
      this.layoutContainer.destroy();
      this.layoutContainer = null;
    }
    
    // Clean up navigation resources
    this.thumbnails = [];
    this.currentCanvasIndex = 0;
    this.onCanvasChangeCallback = null;
    
    if (this.tocContainer) {
      this.tocContainer.innerHTML = '';
    }
    
    this.currentLayout = null;
  }
}
