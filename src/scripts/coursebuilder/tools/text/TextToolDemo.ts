/**
 * Text Tool Demo - Interactive Test
 * Demonstrates the drag-to-create text system functionality
 */

import { CanvasAPI } from '../../canvas/CanvasAPI.js';

export class TextToolDemo {
  private canvas: CanvasAPI | null = null;

  constructor() {
    console.log('📝 TextToolDemo initialized');
  }

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
      
      console.log('📝 TextToolDemo ready! Try these interactions:');
      console.log('1. 🖱️  Drag on canvas to create text areas');
      console.log('2. 📝  Click text areas to activate and type');
      console.log('3. ⌨️  Use arrow keys to navigate cursor');
      console.log('4. 🔤  Type to add text content');
      console.log('5. 🖱️  Click outside to deactivate text areas');
      
    } catch (error) {
      console.error('❌ Failed to initialize TextToolDemo:', error);
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
  public showFeatures(): void {
    console.log('📝 Text Tool Features:');
    console.log('• Drag-to-create: Draw rectangles to define text areas');
    console.log('• Visual borders: Blue borders indicate text area boundaries');
    console.log('• Blinking cursor: Shows current text insertion point');
    console.log('• Keyboard input: Full text editing with navigation keys');
    console.log('• Text wrapping: Automatic line wrapping within boundaries');
    console.log('• Multiple areas: Create and manage multiple text areas');
    console.log('• Boundary protection: Cannot create in margin areas');
    console.log('• State management: Active/inactive text area states');
  }

  /**
   * Test text tool programmatically
   */
  public async testTextTool(): Promise<void> {
    if (!this.canvas) {
      console.warn('Canvas not initialized');
      return;
    }

    console.log('📝 Running automated text tool tests...');
    
    // Test 1: Tool activation
    const activeTool = this.canvas.getActiveTool();
    console.log(`✅ Active tool: ${activeTool}`);
    
    // Test 2: Canvas ready state
    const isReady = this.canvas.isReady();
    console.log(`✅ Canvas ready: ${isReady}`);
    
    // Test 3: Drawing layer access
    const drawingLayer = this.canvas.getDrawingLayer();
    console.log(`✅ Drawing layer available: ${drawingLayer !== null}`);

    console.log('📝 Manual testing required for interaction features');
    this.showFeatures();
  }

  /**
   * Cleanup demo
   */
  public destroy(): void {
    // Canvas cleanup is handled by CanvasAPI
    this.canvas = null;
    console.log('📝 TextToolDemo destroyed');
  }
}

// Auto-initialize demo when DOM is ready (if in browser environment)
// Disable auto-initialize in production. Opt-in via window.__TEXT_TOOL_DEMO__ or ?textDemo=1
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const enabled = (window as any).__TEXT_TOOL_DEMO__ === true || /(?:^|[?&])textDemo=1(?:&|$)/.test(location.search);
      if (!enabled) return;
      if (!document.querySelector('#canvas-container')) return;
      console.log('📝 Auto-initializing TextToolDemo (opt-in)...');
      const demo = new TextToolDemo();
      await demo.init();
      await demo.testTextTool();
      (window as any).textToolDemo = demo;
    } catch (error) {
      console.error('❌ Failed to auto-initialize demo:', error);
    }
  });
}
