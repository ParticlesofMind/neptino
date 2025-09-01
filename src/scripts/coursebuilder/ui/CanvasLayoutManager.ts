/**
 * Canvas Layout Manager
 * Handles different layout modes for the canvas and perspective tools
 */

export class CanvasLayoutManager {
  private canvasContainer: HTMLElement | null = null;

  constructor(containerSelector: string = '#canvas-container') {
    this.canvasContainer = document.querySelector(containerSelector);
    
    if (!this.canvasContainer) {
      console.warn(`⚠️ Canvas container '${containerSelector}' not found`);
    }
  }

  /**
   * Switch to grid layout (default)
   * Perspective tools in separate column
   */
  public useGridLayout(): void {
    if (!this.canvasContainer) return;

    this.canvasContainer.classList.remove('engine__canvas--compact');
    this.canvasContainer.classList.add('engine__canvas--grid');
    
    console.log('📐 Canvas layout: Grid mode (perspective tools in separate column)');
  }

  /**
   * Switch to compact layout
   * Perspective tools overlaid on canvas area
   */
  public useCompactLayout(): void {
    if (!this.canvasContainer) return;

    this.canvasContainer.classList.remove('engine__canvas--grid');
    this.canvasContainer.classList.add('engine__canvas--compact');
    
    console.log('📐 Canvas layout: Compact mode (perspective tools overlaid)');
  }

  /**
   * Toggle between grid and compact layouts
   */
  public toggleLayout(): void {
    if (!this.canvasContainer) return;

    const isGrid = this.canvasContainer.classList.contains('engine__canvas--grid');
    
    if (isGrid) {
      this.useCompactLayout();
    } else {
      this.useGridLayout();
    }
  }

  /**
   * Auto-select layout based on viewport width
   */
  public useAutoLayout(): void {
    const viewportWidth = window.innerWidth;
    
    // Use compact layout on smaller screens (less than 1200px)
    if (viewportWidth < 1200) {
      this.useCompactLayout();
    } else {
      this.useGridLayout();
    }
    
    console.log(`📐 Canvas layout: Auto mode (${viewportWidth < 1200 ? 'compact' : 'grid'} for ${viewportWidth}px viewport)`);
  }

  /**
   * Get current layout mode
   */
  public getCurrentLayout(): 'grid' | 'compact' | 'none' {
    if (!this.canvasContainer) return 'none';

    if (this.canvasContainer.classList.contains('engine__canvas--grid')) {
      return 'grid';
    } else if (this.canvasContainer.classList.contains('engine__canvas--compact')) {
      return 'compact';
    } else {
      return 'none';
    }
  }

  /**
   * Set up responsive layout changes
   */
  public setupResponsiveLayout(): void {
    // Initial layout based on current viewport
    this.useAutoLayout();

    // Listen for window resize
    window.addEventListener('resize', () => {
      this.useAutoLayout();
    });

    console.log('📐 Canvas responsive layout setup complete');
  }

  /**
   * Add debug commands to window for testing
   */
  public addDebugCommands(): void {
    (window as any).canvasLayoutManager = this;
    (window as any).toggleCanvasLayout = () => this.toggleLayout();
    (window as any).useGridLayout = () => this.useGridLayout();
    (window as any).useCompactLayout = () => this.useCompactLayout();
    (window as any).useAutoLayout = () => this.useAutoLayout();
    
    console.log('🔧 Canvas layout debug commands added:');
    console.log('  - toggleCanvasLayout() - Toggle between grid and compact');
    console.log('  - useGridLayout() - Force grid layout');
    console.log('  - useCompactLayout() - Force compact layout');
    console.log('  - useAutoLayout() - Auto-select based on viewport');
  }
}
