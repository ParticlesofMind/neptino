/**
 * Canvas Navigator
 * Manages navigation between multiple canvases and provides thumbnail TOC functionality
 */

import { CourseLayout, CanvasLayout } from './LayoutTypes';

interface CanvasThumbnail {
  id: string;
  sessionNumber: number;
  canvasNumber: number;
  element: HTMLElement;
  isActive: boolean;
}

export class CanvasNavigator {
  private courseLayout: CourseLayout | null = null;
  private thumbnails: CanvasThumbnail[] = [];
  private currentCanvasIndex: number = 0;
  private tocContainer: HTMLElement | null = null;
  private onCanvasChangeCallback: ((canvasIndex: number) => void) | null = null;

  constructor(tocContainerId: string = 'coursebuilder__toc') {
    this.tocContainer = document.getElementById(tocContainerId);
    if (!this.tocContainer) {
      console.warn(`TOC container with id "${tocContainerId}" not found`);
    }
  }

  /**
   * Initialize navigator with course layout
   */
  public init(courseLayout: CourseLayout): void {
    this.courseLayout = courseLayout;
    this.currentCanvasIndex = 0;
    this.generateThumbnails();
    this.renderTOC();
    
    console.log(`🧭 Canvas Navigator initialized with ${courseLayout.totalCanvases} canvases`);
  }

  /**
   * Set callback for canvas change events
   */
  public onCanvasChange(callback: (canvasIndex: number) => void): void {
    this.onCanvasChangeCallback = callback;
  }

  /**
   * Generate thumbnail data for all canvases
   */
  private generateThumbnails(): void {
    if (!this.courseLayout) return;

    this.thumbnails = [];
    
    for (let i = 0; i < this.courseLayout.canvases.length; i++) {
      const canvas = this.courseLayout.canvases[i];
      
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
    const canvasInSession = ((canvas.canvasNumber - 1) % this.courseLayout!.lessonDuration.canvasMultiplier) + 1;
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
    if (!this.courseLayout) return 'Canvas';
    
    const multiplier = this.courseLayout.lessonDuration.canvasMultiplier;
    
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
    if (!this.tocContainer) {
      console.warn('TOC container not available');
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
        ${this.courseLayout!.totalCanvases} canvases across ${this.courseLayout!.scheduledSessions} sessions
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
        Canvas ${this.currentCanvasIndex + 1} of ${this.courseLayout!.totalCanvases}
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
    if (!this.courseLayout || index < 0 || index >= this.courseLayout.canvases.length) {
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
    if (this.courseLayout && this.currentCanvasIndex < this.courseLayout.canvases.length - 1) {
      this.navigateToCanvas(this.currentCanvasIndex + 1);
    }
  }

  /**
   * Update visual state of active canvas
   */
  private updateActiveCanvas(index: number): void {
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
      currentIndicator.textContent = `Canvas ${index + 1} of ${this.courseLayout!.totalCanvases}`;
    }
    
    // Update navigation button states
    const prevBtn = this.tocContainer?.querySelector('.canvas-nav-btn--prev') as HTMLButtonElement;
    const nextBtn = this.tocContainer?.querySelector('.canvas-nav-btn--next') as HTMLButtonElement;
    
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === this.courseLayout!.totalCanvases - 1;
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
    if (!this.courseLayout) return null;
    return this.courseLayout.canvases[this.currentCanvasIndex] || null;
  }

  /**
   * Jump to specific session
   */
  public navigateToSession(sessionNumber: number): void {
    if (!this.courseLayout) return;

    const firstCanvasOfSession = this.courseLayout.canvases.find(
      canvas => canvas.sessionNumber === sessionNumber
    );
    
    if (firstCanvasOfSession) {
      const index = this.courseLayout.canvases.indexOf(firstCanvasOfSession);
      this.navigateToCanvas(index);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.thumbnails = [];
    this.courseLayout = null;
    this.currentCanvasIndex = 0;
    this.onCanvasChangeCallback = null;
    
    if (this.tocContainer) {
      this.tocContainer.innerHTML = '';
    }
  }
}
