/**
 * CanvasNavigation - UI Controls for Multi-Canvas Navigation
 * 
 * Responsibilities:
 * - Page navigation controls (previous/next buttons)
 * - Page counter display (e.g., "Page 3 of 12")
 * - Canvas thumbnail preview
 * - Quick jump to specific canvas
 * - Integration with MultiCanvasManager
 * 
 * Target: ~250 lines
 */

import { MultiCanvasManager, CanvasContainer } from './MultiCanvasManager';

export interface NavigationConfig {
  showThumbnails?: boolean;
  showPageCounter?: boolean;
  showQuickJump?: boolean;
  thumbnailSize?: { width: number; height: number };
}

export class CanvasNavigation {
  private multiCanvasManager: MultiCanvasManager | null = null;
  private container: HTMLElement | null = null;
  private config: NavigationConfig;
  private currentCanvasIndex: number = 0;
  private totalCanvases: number = 0;

  // UI Elements
  private prevButton: HTMLButtonElement | null = null;
  private nextButton: HTMLButtonElement | null = null;
  private pageCounter: HTMLElement | null = null;
  private thumbnailContainer: HTMLElement | null = null;
  private quickJumpSelect: HTMLSelectElement | null = null;

  constructor(config: NavigationConfig = {}) {
    this.config = {
      showThumbnails: true,
      showPageCounter: true,
      showQuickJump: true,
      thumbnailSize: { width: 80, height: 60 },
      ...config
    };
  }

  /**
   * Initialize the navigation UI
   */
  public initialize(containerId: string, multiCanvasManager: MultiCanvasManager): void {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Navigation container '${containerId}' not found`);
    }

    this.multiCanvasManager = multiCanvasManager;
    this.createNavigationUI();
    this.setupEventListeners();
    this.updateNavigationState();
  }

  /**
   * Create the navigation UI elements
   */
  private createNavigationUI(): void {
    if (!this.container) return;

    // Clear existing content
    this.container.innerHTML = '';

    // Create navigation wrapper
    const navWrapper = document.createElement('div');
    navWrapper.className = 'canvas-navigation';
    navWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    `;

    // Previous button
    this.prevButton = document.createElement('button');
    this.prevButton.innerHTML = '← Previous';
    this.prevButton.className = 'nav-button nav-prev';
    this.prevButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    navWrapper.appendChild(this.prevButton);

    // Page counter
    if (this.config.showPageCounter) {
      this.pageCounter = document.createElement('div');
      this.pageCounter.className = 'page-counter';
      this.pageCounter.style.cssText = `
        font-size: 14px;
        color: #495057;
        font-weight: 500;
        min-width: 120px;
        text-align: center;
      `;
      navWrapper.appendChild(this.pageCounter);
    }

    // Next button
    this.nextButton = document.createElement('button');
    this.nextButton.innerHTML = 'Next →';
    this.nextButton.className = 'nav-button nav-next';
    this.nextButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #007bff;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    navWrapper.appendChild(this.nextButton);

    // Quick jump select
    if (this.config.showQuickJump) {
      this.quickJumpSelect = document.createElement('select');
      this.quickJumpSelect.className = 'quick-jump-select';
      this.quickJumpSelect.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        background: white;
        font-size: 14px;
        min-width: 120px;
      `;
      navWrapper.appendChild(this.quickJumpSelect);
    }

    // Thumbnail container
    if (this.config.showThumbnails) {
      this.thumbnailContainer = document.createElement('div');
      this.thumbnailContainer.className = 'thumbnail-container';
      this.thumbnailContainer.style.cssText = `
        display: flex;
        gap: 8px;
        overflow-x: auto;
        max-width: 300px;
        padding: 8px;
        background: white;
        border-radius: 4px;
        border: 1px solid #e9ecef;
      `;
      
      const thumbnailWrapper = document.createElement('div');
      thumbnailWrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      `;
      
      const thumbnailLabel = document.createElement('div');
      thumbnailLabel.textContent = 'Thumbnails';
      thumbnailLabel.style.cssText = `
        font-size: 12px;
        color: #6c757d;
        font-weight: 500;
      `;
      
      thumbnailWrapper.appendChild(thumbnailLabel);
      thumbnailWrapper.appendChild(this.thumbnailContainer);
      navWrapper.appendChild(thumbnailWrapper);
    }

    this.container.appendChild(navWrapper);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.multiCanvasManager) return;

    // Previous button
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => {
        this.multiCanvasManager!.navigateToPrevious();
      });
    }

    // Next button
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => {
        this.multiCanvasManager!.navigateToNext();
      });
    }

    // Quick jump select
    if (this.quickJumpSelect) {
      this.quickJumpSelect.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        const canvasId = target.value;
        if (canvasId) {
          this.multiCanvasManager!.showCanvas(canvasId);
        }
      });
    }

    // Subscribe to navigation changes
    this.multiCanvasManager.onNavigationChange((canvasId: string) => {
      this.updateNavigationState();
    });
  }

  /**
   * Update navigation state and UI
   */
  private updateNavigationState(): void {
    if (!this.multiCanvasManager) return;

    const currentCanvas = this.multiCanvasManager.getCurrentCanvas();
    const allCanvases = this.multiCanvasManager.getAllCanvases();
    
    this.currentCanvasIndex = this.multiCanvasManager.getCurrentCanvasIndex();
    this.totalCanvases = this.multiCanvasManager.getCanvasCount();

    // Update page counter
    if (this.pageCounter) {
      this.pageCounter.textContent = `Page ${this.currentCanvasIndex} of ${this.totalCanvases}`;
    }

    // Update button states
    if (this.prevButton) {
      this.prevButton.disabled = this.currentCanvasIndex <= 1;
      this.prevButton.style.opacity = this.prevButton.disabled ? '0.5' : '1';
    }

    if (this.nextButton) {
      this.nextButton.disabled = this.currentCanvasIndex >= this.totalCanvases;
      this.nextButton.style.opacity = this.nextButton.disabled ? '0.5' : '1';
    }

    // Update quick jump select
    this.updateQuickJumpSelect();

    // Update thumbnails
    this.updateThumbnails();
  }

  /**
   * Update quick jump select options
   */
  private updateQuickJumpSelect(): void {
    if (!this.quickJumpSelect || !this.multiCanvasManager) return;

    this.quickJumpSelect.innerHTML = '';
    
    const allCanvases = this.multiCanvasManager.getAllCanvases();
    const currentCanvas = this.multiCanvasManager.getCurrentCanvas();

    allCanvases.forEach(canvasContainer => {
      const option = document.createElement('option');
      option.value = canvasContainer.canvasRow.id;
      option.textContent = `Lesson ${canvasContainer.canvasRow.lesson_number} - Page ${canvasContainer.canvasRow.canvas_index}`;
      
      if (currentCanvas && canvasContainer.canvasRow.id === currentCanvas.canvasRow.id) {
        option.selected = true;
      }
      
      this.quickJumpSelect!.appendChild(option);
    });
  }

  /**
   * Update thumbnail previews
   */
  private updateThumbnails(): void {
    if (!this.thumbnailContainer || !this.multiCanvasManager) return;

    this.thumbnailContainer.innerHTML = '';
    
    const allCanvases = this.multiCanvasManager.getAllCanvases();
    const currentCanvas = this.multiCanvasManager.getCurrentCanvas();

    allCanvases.forEach(canvasContainer => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'canvas-thumbnail';
      thumbnail.style.cssText = `
        width: ${this.config.thumbnailSize!.width}px;
        height: ${this.config.thumbnailSize!.height}px;
        border: 2px solid ${canvasContainer.isActive ? '#007bff' : '#e9ecef'};
        border-radius: 4px;
        background: #f8f9fa;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #6c757d;
        position: relative;
      `;

      // Add page number
      const pageNumber = document.createElement('div');
      pageNumber.textContent = `${canvasContainer.canvasRow.canvas_index}`;
      pageNumber.style.cssText = `
        font-weight: bold;
        font-size: 12px;
      `;
      thumbnail.appendChild(pageNumber);

      // Add lesson number
      const lessonNumber = document.createElement('div');
      lessonNumber.textContent = `L${canvasContainer.canvasRow.lesson_number}`;
      lessonNumber.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 8px;
        background: #6c757d;
        color: white;
        padding: 1px 3px;
        border-radius: 2px;
      `;
      thumbnail.appendChild(lessonNumber);

      // Add click handler
      thumbnail.addEventListener('click', () => {
        this.multiCanvasManager!.showCanvas(canvasContainer.canvasRow.id);
      });

      this.thumbnailContainer.appendChild(thumbnail);
    });
  }

  /**
   * Show/hide navigation
   */
  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NavigationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.container) {
      this.createNavigationUI();
      this.setupEventListeners();
      this.updateNavigationState();
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      initialized: !!this.container && !!this.multiCanvasManager,
      config: this.config,
      currentCanvasIndex: this.currentCanvasIndex,
      totalCanvases: this.totalCanvases,
      hasPrevButton: !!this.prevButton,
      hasNextButton: !!this.nextButton,
      hasPageCounter: !!this.pageCounter,
      hasThumbnails: !!this.thumbnailContainer,
      hasQuickJump: !!this.quickJumpSelect
    };
  }

  /**
   * Destroy the navigation UI
   */
  public destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.multiCanvasManager = null;
    this.container = null;
    this.prevButton = null;
    this.nextButton = null;
    this.pageCounter = null;
    this.thumbnailContainer = null;
    this.quickJumpSelect = null;
  }
}


