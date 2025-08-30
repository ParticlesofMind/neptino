/**
 * Text Tool Demo - Interactive Test
 * Demonstrates the drag-to-create text system functionality
 */

import { CanvasAPI } from '../../canvas/CanvasAPI.js';

export class TextToolDemo {
  private canvas: CanvasAPI | null = null;

  constructor() {}

  /**
   * Initialize the demo with canvas
   */
  public async init(containerSelector: string = '#canvas-container'): Promise<void> {
    try {
      // Initialize canvas
      this.canvas = new CanvasAPI(containerSelector);
      await this.canvas.init({
        width: 800,
        height: 600,
        backgroundColor: 0xffffff
      });

      // Set text tool as active
      this.canvas.setTool('text');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get canvas instance for external manipulation
   */
  public getCanvas(): CanvasAPI | null {
    return this.canvas;
  }

  /**
   * Demo specific text tool functionality
   */
  public showFeatures(): void {}

  /**
   * Test text tool programmatically
   */
  public async testTextTool(): Promise<void> {
    if (!this.canvas) {
      return;
    }

    // Test 1: Tool activation
    const activeTool = this.canvas.getActiveTool();

    // Test 2: Canvas ready state
    const isReady = this.canvas.isReady();

    // Test 3: Drawing layer access
    const drawingLayer = this.canvas.getDrawingLayer();
    this.showFeatures();
  }

  /**
   * Cleanup demo
   */
  public destroy(): void {
    // Canvas cleanup is handled by CanvasAPI
    this.canvas = null;
  }
}

// Auto-initialize demo when DOM is ready (if in browser environment)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize if we're on a page with canvas container
    if (document.querySelector('#canvas-container')) {
      try {
        const demo = new TextToolDemo();
        await demo.init();
        await demo.testTextTool();

        // Make demo globally accessible for manual testing
        (window as any).textToolDemo = demo;
      }
    }
  });
}
