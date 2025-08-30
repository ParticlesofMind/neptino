/**
 * Canvas Initialization Test
 * Simple test to verify our new canvas system works and connects to UI
 */

import { CanvasAPI } from './canvas/CanvasAPI';
import { ToolStateManager } from './ui/ToolStateManager';
import { UIEventHandler } from './ui/UIEventHandler';
import { toolColorManager } from './tools/ToolColorManager';
import { TextTool } from './tools/text/TextTool';

// Global canvas instance for testing
let canvasAPI: CanvasAPI | null = null;
let toolStateManager: ToolStateManager | null = null;
let uiEventHandler: UIEventHandler | null = null;

/**
 * Initialize canvas when coursebuilder page loads
 */
export async function initializeCanvas(): Promise<void> {
    try {
        // Check if we're on coursebuilder page with canvas container
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            return;
        }

        // Create canvas API
        canvasAPI = new CanvasAPI('#canvas-container');

        // Initialize with A4 dimensions
        await canvasAPI.init({
            width: 794,
            height: 1123,
            backgroundColor: 0xffffff,
        });

        toolStateManager = new ToolStateManager();

        // Wait a bit to ensure DOM is fully ready before binding events
        await new Promise(resolve => setTimeout(resolve, 200));

        uiEventHandler = new UIEventHandler(toolStateManager);

        // Expose UIEventHandler on window for Select2 integration
        (window as any).uiEventHandler = uiEventHandler;

        toolColorManager.init();

        // Listen for color selector changes
        document.addEventListener('toolColorChange', (event: Event) => {
            const customEvent = event as CustomEvent;
            const { tool, hex } = customEvent.detail;
            if (canvasAPI) {
                canvasAPI.setToolColor(hex);
            }
        });

        // Make available globally for debugging
        (window as any).canvasAPI = canvasAPI;
        (window as any).toolStateManager = toolStateManager;
        (window as any).toolColorManager = toolColorManager;

        // Expose TextTool for font debugging
        (window as any).TextTool = TextTool;

        // Wait for canvas to be fully ready before getting info
        const waitForCanvas = async (maxAttempts: number = 5, delay: number = 100): Promise<void> => {
            for (let i = 0; i < maxAttempts; i++) {
                if (canvasAPI && canvasAPI.isReady()) {
                    try {
                        return;
                    }
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        };

        // Try to get canvas info with retry logic
        await waitForCanvas();

        if (toolStateManager && canvasAPI) {
            const uiTool = toolStateManager.getCurrentTool();
            const canvasTool = canvasAPI.getActiveTool();

            if (uiTool !== canvasTool) {
                canvasAPI.setTool(uiTool);
            }

            // Force a sync verification
            toolStateManager.forceSyncVerification();
        }
    }
}

/**
 * Initialize canvas when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure coursebuilder page is fully loaded
    setTimeout(initializeCanvas, 100);
});

// Also try immediate initialization in case DOM is already loaded
if (document.readyState === 'loading') {} else {
    setTimeout(initializeCanvas, 100);
}
