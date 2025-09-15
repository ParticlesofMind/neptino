/**
 * Canvas Initialization 
 * Initialize canvas system with proper dimensions and clean architecture
 */

import { CanvasAPI } from './canvas/CanvasAPI';
import { ToolStateManager } from './ui/ToolStateManager';
import { UIEventHandler } from './ui/UIEventHandler';
import { toolColorManager } from './tools/ToolColorManager';
import { TextTool } from './tools/text/TextTool';
import { SimplePerspectiveManager } from './tools/SimplePerspectiveManager';
import { snapManager } from './tools/SnapManager';
import { bindSnapMenu } from './tools/SnapMenu';
import { CanvasLayoutManager } from './ui/CanvasLayoutManager';
import { ToolCoordinator } from './ui/ToolCoordinator';
import { initializeAnimationUI } from './animation/AnimationUI';
import { animationState } from './animation/AnimationState';
import { LayersPanel } from './ui/LayersPanel';

// Canvas dimensions - centralized in one place (4:3 aspect ratio)
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1200;

console.log('📦 CanvasAPI import successful:', CanvasAPI);

// Global canvas instance
let canvasAPI: CanvasAPI | null = null;
let toolStateManager: ToolStateManager | null = null;
let uiEventHandler: UIEventHandler | null = null;
let perspectiveManager: SimplePerspectiveManager | null = null;
let layoutManager: CanvasLayoutManager | null = null;
let toolCoordinator: ToolCoordinator | null = null;
let layersPanel: LayersPanel | null = null;

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

        // Log canvas dimensions info
        const dpr = window.devicePixelRatio || 1;
        console.log(`📱 Device Pixel Ratio: ${dpr}x`);
        console.log(`🖥️ Viewport: ${window.innerWidth}×${window.innerHeight}`);
        console.log(`📄 Canvas: ${CANVAS_WIDTH}×${CANVAS_HEIGHT} (4:3 aspect ratio)`);

        // Initialize with fixed dimensions
        await canvasAPI.init({
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: 0xffffff,
        });

        console.log('✅ Canvas initialized!');

        // Initialize Canvas Layout Manager
        console.log('📐 Initializing canvas layout manager...');
        layoutManager = new CanvasLayoutManager('#canvas-container');
        layoutManager.setupResponsiveLayout(); // Auto-select layout based on viewport
        console.log('✅ Canvas layout manager initialized!');

        // Initialize Perspective Manager (zoom/pan controls)
        console.log('🔍 Initializing perspective controls...');
        perspectiveManager = new SimplePerspectiveManager();
        console.log('✅ SimplePerspectiveManager initialized with zoom/pan controls');

        // Update canvas reference in perspective manager now that canvas is created
        if (perspectiveManager && 'updateCanvasReference' in perspectiveManager) {
            (perspectiveManager as any).updateCanvasReference();
        }

        // Bind minimal snap menu UI to perspective tools
        try { 
            bindSnapMenu(perspectiveManager); 
            // Initialize snap manager with saved state
            snapManager.initialize();
        } catch (error) {
            console.warn('Failed to initialize snap menu:', error);
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

        // Initialize animation UI (animate-mode tools and options)
        try { initializeAnimationUI(toolStateManager); } catch (e) { console.warn('⚠️ Failed to init AnimationUI', e); }

        // Initialize Tool Coordinator for unified tool management
        console.log('🎯 Initializing Tool Coordinator...');
        toolCoordinator = new ToolCoordinator();
        console.log('✅ ToolCoordinator initialized - enforcing single tool rule');

        // Initialize Layers Panel (UI for layer ordering/visibility)
        console.log('🧱 Initializing Layers panel...');
        layersPanel = new LayersPanel();
        (window as any).layersPanel = layersPanel;
        layersPanel.refresh();
        console.log('✅ Layers panel ready');

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

        // Make available globally for debugging and demos
        (window as any).canvasAPI = canvasAPI;
        (window as any).toolStateManager = toolStateManager;
        (window as any).toolColorManager = toolColorManager;
        (window as any).perspectiveManager = perspectiveManager;
        (window as any).layoutManager = layoutManager;
        (window as any).toolCoordinator = toolCoordinator;
        
        // Expose TextTool for font debugging
        (window as any).TextTool = TextTool;
        console.log('🔧 TextTool exposed globally for debugging - use TextTool.debugReinitializeFonts() to reload fonts');
        console.log('🔧 Debug commands: perspectiveManager.debugGrid(), perspectiveManager.forceEnableGrid()');
        console.log('🎯 Tool Coordinator commands: toolCoordinator.debugState(), toolCoordinator.resetAllTools()');
        console.log('📐 Canvas commands: showCanvasInfo(), resizeCanvas()');
        console.log('📐 Layout commands: toggleCanvasLayout(), useGridLayout(), useCompactLayout(), useAutoLayout()');

        // Add layout manager debug commands
        if (layoutManager) {
            layoutManager.addDebugCommands();
        }

        // Initialize animation state with app + layers
        try {
            const app = canvasAPI.getApp();
            const uiLayer = canvasAPI.getLayer('ui');
            const dm = (window as any)._displayManager || null;
            if (app && uiLayer) {
                animationState.init({ app, uiLayer, displayManager: dm });
            }
        } catch (e) { console.warn('⚠️ Failed to init animationState', e); }

        // Add global debug commands
        (window as any).showCanvasInfo = () => {
            if (canvasAPI) {
                const info = canvasAPI.getCanvasInfo();
                const canvas = document.querySelector('canvas');
                const style = canvas ? window.getComputedStyle(canvas) : null;
                
                console.log('🖼️ Canvas Analysis:', {
                    pixi: info,
                    htmlCanvas: {
                        width: canvas?.width,
                        height: canvas?.height,
                        cssWidth: style?.width,
                        cssHeight: style?.height
                    },
                    devicePixelRatio: window.devicePixelRatio,
                    screenSize: {
                        width: window.screen.width,
                        height: window.screen.height
                    },
                    expectedDimensions: {
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        aspectRatio: '4:3'
                    }
                });
            }
        };

        // Simple canvas resize command
        (window as any).resizeCanvas = (width?: number, height?: number) => {
            if (!canvasAPI) {
                console.warn('⚠️ Canvas not initialized');
                return;
            }

            const newWidth = width || CANVAS_WIDTH;
            const newHeight = height || CANVAS_HEIGHT;
            
            console.log(`📐 Resizing canvas to ${newWidth}×${newHeight}`);
            canvasAPI.resize(newWidth, newHeight);
            console.log(`✅ Canvas resized to ${newWidth}×${newHeight}`);
        };

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
