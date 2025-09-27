/**
 * Tool Coordinator
 * Unified management system for all coursebuilder tools
 * Enforces "only one tool active at a time" rule between drawing and perspective tools
 */

export class ToolCoordinator {
    private activeToolType: 'drawing' | 'perspective' | null = null;
    private activeDrawingTool: string | null = null;
    private activePerspectiveTool: string | null = null;
    private toolStateManager: any = null;
    private perspectiveManager: any = null;

    constructor() {
        this.initializeReferences();
    }

    /**
     * Initialize references to other managers
     */
    private initializeReferences(): void {
        // Get references from global window (they're set during app initialization)
        this.toolStateManager = (window as any).toolStateManager;
        this.perspectiveManager = (window as any).perspectiveManager;

        if (!this.toolStateManager) {
            // Delay warning to allow for initialization race conditions
            setTimeout(() => {
                if (!this.toolStateManager) {
                    console.warn('⚠️ ToolCoordinator: ToolStateManager not found on window');
                }
            }, 1000);
        }
        if (!this.perspectiveManager) {
            // Delay warning to allow for initialization race conditions  
            setTimeout(() => {
                if (!this.perspectiveManager) {
                    console.warn('⚠️ ToolCoordinator: PerspectiveManager not found on window');
                }
            }, 1000);
        }
    }

    /**
     * Set drawing tool as active
     * Automatically deactivates any active perspective tools
     */
    public setDrawingTool(tool: string): void {

        // If perspective tool is active, deactivate it
        if (this.activeToolType === 'perspective') {
            this.deactivatePerspectiveTools();
        }

        // Update state
        this.activeToolType = 'drawing';
        this.activeDrawingTool = tool;
        this.activePerspectiveTool = null;

    }

    /**
     * Set perspective tool as active  
     * Automatically deactivates any active drawing tools
     */
    public setPerspectiveTool(tool: string): void {

        // If drawing tool is active, deactivate it
        if (this.activeToolType === 'drawing') {
            this.deactivateDrawingTools();
        }

        // Update state
        this.activeToolType = 'perspective';
        this.activePerspectiveTool = tool;
        this.activeDrawingTool = null;

    }

    /**
     * Deactivate all drawing tools
     */
    private deactivateDrawingTools(): void {
        
        if (this.toolStateManager && typeof this.toolStateManager.deactivateAllDrawingTools === 'function') {
            this.toolStateManager.deactivateAllDrawingTools();
        } else {
            // Fallback: Direct UI manipulation
            document.querySelectorAll('[data-tool]').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('engine__tools-item--active');
            });
        }
    }

    /**
     * Deactivate all perspective tools
     */
    private deactivatePerspectiveTools(): void {
        
        if (this.perspectiveManager && typeof this.perspectiveManager.deactivateGrabTool === 'function') {
            this.perspectiveManager.deactivateGrabTool();
        }

        // Also deactivate other perspective tools if needed (grid, etc.)
        document.querySelectorAll('[data-perspective]').forEach(btn => {
            if (btn.getAttribute('data-perspective') !== 'zoom-in' && 
                btn.getAttribute('data-perspective') !== 'zoom-out' && 
                btn.getAttribute('data-perspective') !== 'reset') {
                btn.classList.remove('engine__perspective-item--active');
            }
        });
    }

    /**
     * Get current active tool information
     */
    public getActiveToolInfo(): {
        type: 'drawing' | 'perspective' | null;
        drawingTool: string | null;
        perspectiveTool: string | null;
    } {
        return {
            type: this.activeToolType,
            drawingTool: this.activeDrawingTool,
            perspectiveTool: this.activePerspectiveTool
        };
    }

    /**
     * Check if a specific tool type is active
     */
    public isToolTypeActive(type: 'drawing' | 'perspective'): boolean {
        return this.activeToolType === type;
    }

    /**
     * Reset all tools to default state
     */
    public resetAllTools(): void {
        
        this.deactivateDrawingTools();
        this.deactivatePerspectiveTools();
        
        this.activeToolType = 'drawing';
        this.activeDrawingTool = 'selection';
        this.activePerspectiveTool = null;

        // Set drawing tools back to selection
        if (this.toolStateManager && typeof this.toolStateManager.setTool === 'function') {
            this.toolStateManager.setTool('selection');
        }

    }

    /**
     * Debug method to log current state
     */
    public debugState(): void {
        console.log('🔍 COORDINATOR STATE:', {
            activeToolType: this.activeToolType,
            activeDrawingTool: this.activeDrawingTool,
            activePerspectiveTool: this.activePerspectiveTool,
            hasToolStateManager: !!this.toolStateManager,
            hasPerspectiveManager: !!this.perspectiveManager
        });
    }

    /**
     * Update references if managers are reinitialized
     */
    public updateReferences(): void {
        this.initializeReferences();
    }
}
