/**
 * Canvas Scroll Navigation
 * Handles vertical scroll navigation controls for multi-canvas view
 */

export class CanvasScrollNav {
  private currentCanvas: number = 1;
  private totalCanvases: number = 225; // Will be updated dynamically
  private inputElement: HTMLInputElement | null = null;
  private totalElement: HTMLElement | null = null;
  private onNavigateCallback: ((canvasIndex: number) => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.inputElement = document.querySelector('.engine__scroll-input');
    this.totalElement = document.querySelector('.engine__scroll-total');

    if (!this.inputElement) {
      console.warn('Canvas scroll input not found');
      return;
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    // First canvas button
    const firstBtn = document.querySelector('[data-scroll="first"]');
    firstBtn?.addEventListener('click', () => this.goToFirst());

    // Previous canvas button
    const prevBtn = document.querySelector('[data-scroll="prev"]');
    prevBtn?.addEventListener('click', () => this.goToPrevious());

    // Next canvas button
    const nextBtn = document.querySelector('[data-scroll="next"]');
    nextBtn?.addEventListener('click', () => this.goToNext());

    // Last canvas button
    const lastBtn = document.querySelector('[data-scroll="last"]');
    lastBtn?.addEventListener('click', () => this.goToLast());

    // Input field
    if (this.inputElement) {
      this.inputElement.addEventListener('change', (e) => this.handleInputChange(e));
      this.inputElement.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    }
  }

  private goToFirst(): void {
    this.navigateToCanvas(1);
  }

  private goToPrevious(): void {
    if (this.currentCanvas > 1) {
      this.navigateToCanvas(this.currentCanvas - 1);
    }
  }

  private goToNext(): void {
    if (this.currentCanvas < this.totalCanvases) {
      this.navigateToCanvas(this.currentCanvas + 1);
    }
  }

  private goToLast(): void {
    this.navigateToCanvas(this.totalCanvases);
  }

  private handleInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    if (isNaN(value) || value < 1 || value > this.totalCanvases) {
      input.value = this.currentCanvas.toString();
      return;
    }

    this.navigateToCanvas(value);
  }

  private handleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement;
      input.blur(); // Trigger change event
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.goToPrevious();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.goToNext();
    }
  }

  private navigateToCanvas(canvasNumber: number): void {
    // Clamp value
    const clampedNumber = Math.max(1, Math.min(canvasNumber, this.totalCanvases));
    
    this.currentCanvas = clampedNumber;
    this.updateDisplay();

    // Call callback if set
    if (this.onNavigateCallback) {
      // Convert to 0-based index
      this.onNavigateCallback(clampedNumber - 1);
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('canvas-navigate', {
      detail: { canvasIndex: clampedNumber - 1, canvasNumber: clampedNumber }
    }));

    console.log(`Navigating to canvas ${clampedNumber}`);
  }

  private updateDisplay(): void {
    if (this.inputElement) {
      this.inputElement.value = this.currentCanvas.toString();
    }
  }

  /**
   * Set the total number of canvases
   */
  public setTotalCanvases(total: number): void {
    this.totalCanvases = total;
    if (this.totalElement) {
      this.totalElement.textContent = total.toString();
    }
    if (this.inputElement) {
      this.inputElement.max = total.toString();
    }
  }

  /**
   * Set the current canvas (e.g., from external scroll events)
   */
  public setCurrentCanvas(canvasNumber: number): void {
    this.currentCanvas = Math.max(1, Math.min(canvasNumber, this.totalCanvases));
    this.updateDisplay();
  }

  /**
   * Set callback for navigation events
   */
  public setOnNavigate(callback: (canvasIndex: number) => void): void {
    this.onNavigateCallback = callback;
  }

  /**
   * Get current canvas number (1-based)
   */
  public getCurrentCanvas(): number {
    return this.currentCanvas;
  }

  /**
   * Get total canvases
   */
  public getTotalCanvases(): number {
    return this.totalCanvases;
  }
}

// Initialize on DOM ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const scrollNav = new CanvasScrollNav();
    (window as any).canvasScrollNav = scrollNav;
  });
}
