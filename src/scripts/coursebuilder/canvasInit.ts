/**
 * Canvas Initialization Test
 * Simple test to verify our new canvas system works and connects to UI
 */

import { CanvasAPI } from './canvas/CanvasAPI';
import { ToolStateManager } from './ui/ToolStateManager';
import { UIEventHandler } from './ui/UIEventHandler';

console.log('📦 CanvasAPI import successful:', CanvasAPI);

// Global canvas instance for testing
let canvasAPI: CanvasAPI | null = null;
let toolStateManager: ToolStateManager | null = null;
let uiEventHandler: UIEventHandler | null = null;

/**
 * Initialize canvas when coursebuilder page loads
 */
export async function initializeCanvas(): Promise<void> {
  try {
    console.log('🔍 Checking for canvas container...');
    
    // Check if we're on coursebuilder page with canvas container
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      console.log('📄 No canvas container found - skipping canvas init');
      return;
    }

    console.log('✅ Canvas container found:', canvasContainer);

    console.log('🎨 Starting canvas initialization...');
    
    // Create canvas API
    canvasAPI = new CanvasAPI('#canvas-container');
    console.log('✅ CanvasAPI instance created');
    
    // Initialize with A4 dimensions
    await canvasAPI.init({
      width: 794,
      height: 1123,
      backgroundColor: 0xffffff
    });

    console.log('✅ Canvas initialized successfully!');

    // Initialize UI system
    console.log('🎛️ Connecting UI to canvas...');
    toolStateManager = new ToolStateManager();
    uiEventHandler = new UIEventHandler(toolStateManager);

    // Connect UI tool changes to canvas
    uiEventHandler.setOnToolChange((toolName: string) => {
      console.log(`🔧 UI tool change: ${toolName}`);
      if (canvasAPI) {
        canvasAPI.setTool(toolName);
      }
    });

    // Connect UI color changes to canvas
    uiEventHandler.setOnColorChange((color: string) => {
      console.log(`🎨 UI color change: ${color}`);
      if (canvasAPI) {
        canvasAPI.setToolColor(color);
      }
    });

    // Connect UI tool settings changes to canvas
    uiEventHandler.setOnToolSettingsChange((toolName: string, settings: any) => {
      console.log(`⚙️ UI settings change: ${toolName}`, settings);
      if (canvasAPI) {
        canvasAPI.setToolSettings(toolName, settings);
      }
    });

    console.log('✅ UI connected to canvas');

    // Make available globally for debugging
    (window as any).canvasAPI = canvasAPI;
    (window as any).toolStateManager = toolStateManager;

    console.log('📊 Canvas info:', canvasAPI.getCanvasInfo());

    // Test if we can draw something simple on the canvas
    console.log('🧪 Testing drawing capability...');
    const drawingTest = canvasAPI.testDrawing();
    console.log('Drawing test result:', drawingTest ? 'SUCCESS' : 'FAILED');

    // Test direct drawing as backup
    testDirectDrawing(canvasAPI);

  } catch (error) {
    console.error('❌ Canvas initialization failed:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');
  }
}

/**
 * Test function - add a simple dot to verify canvas is working
 */
export function testCanvas(): void {
  if (!canvasAPI?.isReady()) {
    console.warn('Canvas not ready for testing');
    return;
  }

  const drawingLayer = canvasAPI.getDrawingLayer();
  if (!drawingLayer) {
    console.warn('Drawing layer not available');
    return;
  }

  // We'll add a simple test graphic here once we have events working
  console.log('🧪 Canvas test - drawing layer ready:', drawingLayer);
}

/**
 * Direct drawing test to verify the canvas can display graphics
 */
function testDirectDrawing(canvasAPI: CanvasAPI): void {
  const drawingLayer = canvasAPI.getDrawingLayer();
  if (!drawingLayer) {
    console.error('❌ No drawing layer available for test');
    return;
  }

  try {
    // Import Graphics from pixi.js to create a test circle
    import('pixi.js').then(({ Graphics }) => {
      const testCircle = new Graphics();
      testCircle.circle(100, 100, 20).fill(0xff0000); // Red circle at (100,100)
      drawingLayer.addChild(testCircle);
      
      console.log('✅ Direct drawing test: Added red circle to drawing layer');
      console.log('📊 Drawing layer children count:', drawingLayer.children.length);
    });
  } catch (error) {
    console.error('❌ Direct drawing test failed:', error);
  }
}

/**
 * Initialize canvas when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded - attempting canvas initialization...');
  // Small delay to ensure coursebuilder page is fully loaded
  setTimeout(initializeCanvas, 100);
});

// Also try immediate initialization in case DOM is already loaded
if (document.readyState === 'loading') {
  console.log('📄 Document still loading - waiting for DOMContentLoaded');
} else {
  console.log('📄 Document already loaded - initializing canvas immediately');
  setTimeout(initializeCanvas, 100);
}
