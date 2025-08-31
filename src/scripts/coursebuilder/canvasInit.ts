/**
 * Canvas Initialization Test
 * Simple test to verify our new canvas system works and connects to UI
 */

import { CanvasAPI } from './canvas/CanvasAPI';
import { ToolStateManager } from './ui/ToolStateManager';
import { UIEventHandler } from './ui/UIEventHandler';
import { toolColorManager } from './tools/ToolColorManager';
import { TextTool } from './tools/text/TextTool';
import { SimplePerspectiveManager } from './tools/SimplePerspectiveManager';
import { LayoutDemo } from './layout/LayoutDemo';

console.log('📦 CanvasAPI import successful:', CanvasAPI);

// Global canvas instance for testing

let canvasAPI: CanvasAPI | null = null;
let toolStateManager: ToolStateManager | null = null;
let uiEventHandler: UIEventHandler | null = null;
let perspectiveManager: SimplePerspectiveManager | null = null;
let layoutDemo: LayoutDemo | null = null;

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
            backgroundColor: 0xffffff,
        });

        console.log('✅ Canvas initialized!');

        // Initialize Layout System
        console.log('📐 Initializing layout system...');
        layoutDemo = new LayoutDemo(canvasAPI);
        await layoutDemo.demo();
        console.log('✅ Layout system initialized and demo applied!');

                // Initialize Perspective Manager (zoom/pan controls)
        console.log('🔍 Initializing perspective controls...');
        perspectiveManager = new SimplePerspectiveManager();
        console.log('✅ SimplePerspectiveManager initialized with zoom/pan controls');

        // Update canvas reference in perspective manager now that canvas is created
        if (perspectiveManager && 'updateCanvasReference' in perspectiveManager) {
            (perspectiveManager as any).updateCanvasReference();
        }

        // Initialize UI system with clean architecture
        console.log('🎛️ Connecting UI to canvas...');
        toolStateManager = new ToolStateManager();
        
        // Wait a bit to ensure DOM is fully ready before binding events
        await new Promise(resolve => setTimeout(resolve, 200));
        
        uiEventHandler = new UIEventHandler(toolStateManager);
        console.log('✅ UIEventHandler created and events bound');
        
        // Expose UIEventHandler on window for Select2 integration
        (window as any).uiEventHandler = uiEventHandler;

        // Initialize color selectors for all tools
        console.log('🎨 Initializing tool color selectors...');
        toolColorManager.init();

        // Listen for color selector changes
        document.addEventListener('toolColorChange', (event: Event) => {
            const customEvent = event as CustomEvent;
            const { tool, hex } = customEvent.detail;
            console.log(`🎨 Color selector change for ${tool}: ${hex}`);
            if (canvasAPI) {
                canvasAPI.setToolColor(hex);
            }
        });

        // Clean architecture: All UI events are handled through ToolStateManager
        // No callbacks needed - ToolStateManager directly manages canvas state
        
        console.log('✅ UI connected to canvas with clean architecture');

        console.log('🔍 Zoom/pan perspective controls initialized and ready');

        // Make available globally for debugging
        (window as any).canvasAPI = canvasAPI;
        (window as any).toolStateManager = toolStateManager;
        (window as any).toolColorManager = toolColorManager;
        (window as any).perspectiveManager = perspectiveManager;
        (window as any).layoutDemo = layoutDemo;
        
        // Expose TextTool for font debugging
        (window as any).TextTool = TextTool;
        console.log('🔧 TextTool exposed globally for debugging - use TextTool.debugReinitializeFonts() to reload fonts');
        console.log('🔧 Debug commands: perspectiveManager.debugGrid(), perspectiveManager.forceEnableGrid()');

        // Wait for canvas to be fully ready before getting info
        const waitForCanvas = async (maxAttempts: number = 5, delay: number = 100): Promise<void> => {
            for (let i = 0; i < maxAttempts; i++) {
                if (canvasAPI && canvasAPI.isReady()) {
                    try {
                        console.log('📊 Canvas info:', canvasAPI.getCanvasInfo());
                        return;
                    } catch (infoError) {
                        console.warn(`⚠️ Attempt ${i + 1}: Could not get canvas info:`, infoError);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            console.warn('⚠️ Canvas info unavailable after all attempts - canvas may still be initializing');
        };

        // Try to get canvas info with retry logic
        await waitForCanvas();

        // Final synchronization check after everything is initialized
        console.log('🔍 Performing final tool synchronization check...');
        if (toolStateManager && canvasAPI) {
            const uiTool = toolStateManager.getCurrentTool();
            const canvasTool = canvasAPI.getActiveTool();
            console.log(`Final sync check - UI: "${uiTool}", Canvas: "${canvasTool}"`);
            
            if (uiTool !== canvasTool) {
                console.warn('⚠️ Final sync mismatch detected - correcting...');
                canvasAPI.setTool(uiTool);
            }
            
            // Force a sync verification
            toolStateManager.forceSyncVerification();
        }

        console.log('✅ Canvas initialization completed successfully');
    } catch (error) {
        console.error('❌ Canvas initialization failed:', error);
        console.error(
            '❌ Error stack:',
            error instanceof Error ? error.stack : 'No stack available',
        );
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
