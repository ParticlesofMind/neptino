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

    console.log('✅ Canvas initialization completed successfully');

  } catch (error) {
    console.error('❌ Canvas initialization failed:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');
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
