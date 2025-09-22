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
import { CANVAS_WIDTH, CANVAS_HEIGHT, calculateFitZoom } from './utils/canvasSizing';
import { runFullValidation } from './utils/canvasSizingValidation';
import { initializeCanvasSystem, validateCanvasSystem } from './utils/canvasSystemInit';
import { canvasDimensionManager } from './utils/CanvasDimensionManager';


// Global canvas instance
let canvasAPI: CanvasAPI | null = null;
let toolStateManager: ToolStateManager | null = null;
let uiEventHandler: UIEventHandler | null = null;
let perspectiveManager: SimplePerspectiveManager | null = null;
let layoutManager: CanvasLayoutManager | null = null;
let toolCoordinator: ToolCoordinator | null = null;
let layersPanel: LayersPanel | null = null;

// Global flag to prevent multiple initializations
let isInitializing = false;

/**
 * Initialize canvas when coursebuilder page loads
 */
export async function initializeCanvas(): Promise<void> {
    try {

        // Initialize the consolidated canvas system first
        initializeCanvasSystem();

        // Check if we're on coursebuilder page with canvas container
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) {
            return;
        }

        // Prevent multiple initializations
        if (isInitializing) {
            return;
        }
        
        if (canvasAPI && canvasAPI.isReady()) {
            return;
        }

        isInitializing = true;


        // Create canvas API
        canvasAPI = new CanvasAPI('#canvas-container');

        // Log canvas dimensions info
        const dpr = window.devicePixelRatio || 1;
        
        // Get consistent canvas dimensions from CanvasDimensionManager
        const dimensions = canvasDimensionManager.getCurrentDimensions();
        const canvasWidth = dimensions.width;  // 1200
        const canvasHeight = dimensions.height; // 1800

        // Initialize with calculated dimensions
        await canvasAPI.init({
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: 0xffffff,
        });

        // Make canvas dimensions available to global functions
        (window as any).currentCanvasWidth = canvasWidth;
        (window as any).currentCanvasHeight = canvasHeight;


        // Initialize Canvas Layout Manager
        layoutManager = new CanvasLayoutManager('#canvas-container');
        layoutManager.setupResponsiveLayout(); // Auto-select layout based on viewport

        // Initialize Perspective Manager (zoom/pan controls)
        perspectiveManager = new SimplePerspectiveManager();

        // Update canvas reference in perspective manager now that canvas is created
        if (perspectiveManager && 'updateCanvasReference' in perspectiveManager) {
            (perspectiveManager as any).updateCanvasReference();
            
            // Apply calculated initial zoom for optimal canvas viewing
            const containerElement = document.querySelector('#canvas-container') as HTMLElement;
            if (containerElement && containerElement.clientWidth > 0 && containerElement.clientHeight > 0) {
                const initialZoom = calculateFitZoom(
                    containerElement.clientWidth,
                    containerElement.clientHeight
                );
                
                // Apply the zoom through the perspective manager
                if ('setZoom' in perspectiveManager) {
                    (perspectiveManager as any).setZoom?.(initialZoom);
                }
            } else {
                console.warn('⚠️ Container element not found or has zero dimensions, skipping initial zoom');
            }
            
            // Fit canvas view into container once on init so it never starts oversized
            try { (perspectiveManager as any).fitToContainer?.(); } catch (error) {
                console.warn('⚠️ Failed to fit canvas to container:', error);
            }
        } else {
            console.warn('⚠️ Perspective manager not available or missing updateCanvasReference method');
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
        toolStateManager = new ToolStateManager();
        
        // Wait a bit to ensure DOM is fully ready before binding events
        await new Promise(resolve => setTimeout(resolve, 200));
        
        uiEventHandler = new UIEventHandler(toolStateManager);
        
        // Expose UIEventHandler on window for Select2 integration
        (window as any).uiEventHandler = uiEventHandler;

        // Initialize animation UI (animate-mode tools and options)
        try { initializeAnimationUI(toolStateManager); } catch (e) { console.warn('⚠️ Failed to init AnimationUI', e); }

        // Initialize Tool Coordinator for unified tool management
        toolCoordinator = new ToolCoordinator();

        // Initialize Layers Panel (UI for layer ordering/visibility)
        layersPanel = new LayersPanel();
        (window as any).layersPanel = layersPanel;
        layersPanel.refresh();

        // Initialize color selectors for all tools
        toolColorManager.init();

        // Listen for color selector changes
        document.addEventListener('toolColorChange', (event: Event) => {
            const customEvent = event as CustomEvent;
            const { tool, hex } = customEvent.detail;
            if (canvasAPI) {
                canvasAPI.setToolColor(hex);
            }
        });

        // Clean architecture: All UI events are handled through ToolStateManager
        // No callbacks needed - ToolStateManager directly manages canvas state
        


        // Make available globally for debugging and demos
        (window as any).canvasAPI = canvasAPI;
        (window as any).toolStateManager = toolStateManager;
        (window as any).toolColorManager = toolColorManager;
        (window as any).perspectiveManager = perspectiveManager;
        (window as any).layoutManager = layoutManager;
        (window as any).toolCoordinator = toolCoordinator;
        
        // Expose TextTool for font debugging
        (window as any).TextTool = TextTool;

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
                        aspectRatio: '2:3'
                    }
                });
            }
        };

        // Canvas sizing validation
        (window as any).validateCanvasSizing = () => {
            const validation = runFullValidation();
            
            if (validation.isValid) {
            } else {
                console.error('❌ Canvas sizing validation failed');
            }
            
            if (validation.errors.length > 0) {
                console.error('Errors:', validation.errors);
            }
            
            if (validation.warnings.length > 0) {
                console.warn('Warnings:', validation.warnings);
            }
            
            return validation;
        };

        // Canvas system validation (new consolidated validation)
        (window as any).validateCanvasSystem = () => {
            const validation = validateCanvasSystem();
            
            if (validation.isValid) {
            } else {
                console.error('❌ Canvas system validation failed');
                console.error('Issues:', validation.issues);
                if (validation.recommendations.length > 0) {
                    console.warn('Recommendations:', validation.recommendations);
                }
            }
            
            return validation;
        };

        // Simple canvas resize command
        (window as any).resizeCanvas = (width?: number, height?: number) => {
            if (!canvasAPI) {
                console.warn('⚠️ Canvas not initialized');
                return;
            }

            const newWidth = width || CANVAS_WIDTH;
            const newHeight = height || CANVAS_HEIGHT;
            
            canvasAPI.resize(newWidth, newHeight);
        };

        // Performance diagnostics command
        (window as any).canvasDiagnostics = () => {
            if (!canvasAPI) {
                console.warn('⚠️ Canvas not initialized');
                return null;
            }
            const diagnostics = canvasAPI.getPerformanceDiagnostics();
            console.table(diagnostics);
            return diagnostics;
        };

        // Wait for canvas to be fully ready before getting info
        const waitForCanvas = async (maxAttempts: number = 5, delay: number = 100): Promise<void> => {
            for (let i = 0; i < maxAttempts; i++) {
                if (canvasAPI && canvasAPI.isReady()) {
                    try {
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
        if (toolStateManager && canvasAPI) {
            const uiTool = toolStateManager.getCurrentTool();
            const canvasTool = canvasAPI.getActiveTool();
            
            if (uiTool !== canvasTool) {
                console.warn('⚠️ Final sync mismatch detected - correcting...');
                canvasAPI.setTool(uiTool);
            }
            
            // Force a sync verification
            toolStateManager.forceSyncVerification();
        }

        // PerfHUD disabled by default to keep UI clean and avoid layout overlays in production.
        // To enable for debugging, call window.installPerfHUD?.()

        isInitializing = false;
    } catch (error) {
        console.error('❌ Canvas initialization failed:', error);
        console.error(
            '❌ Error stack:',
            error instanceof Error ? error.stack : 'No stack available',
        );
        isInitializing = false;
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
if (document.readyState === 'loading') {
} else {
    setTimeout(initializeCanvas, 100);
}
