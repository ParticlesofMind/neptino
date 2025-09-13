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
        console.log('🎯 ToolCoordinator initialized - enforcing single tool rule');
    }

    /**
     * Initialize references to other managers
     */
    private initializeReferences(): void {
        // Get references from global window (they're set during app initialization)
        this.toolStateManager = (window as any).toolStateManager;
        this.perspectiveManager = (window as any).perspectiveManager;

        if (!this.toolStateManager) {
            console.warn('⚠️ ToolCoordinator: ToolStateManager not found on window');
        }
        if (!this.perspectiveManager) {
            console.warn('⚠️ ToolCoordinator: PerspectiveManager not found on window');
        }
    }

    /**
     * Set drawing tool as active
     * Automatically deactivates any active perspective tools
     */
    public setDrawingTool(tool: string): void {
        console.log(`🎯 COORDINATOR: Setting drawing tool to "${tool}"`);

        // If perspective tool is active, deactivate it
        if (this.activeToolType === 'perspective') {
            this.deactivatePerspectiveTools();
        }

        // Update state
        this.activeToolType = 'drawing';
        this.activeDrawingTool = tool;
        this.activePerspectiveTool = null;

        console.log(`✅ COORDINATOR: Drawing tool "${tool}" is now active`);
    }

    /**
     * Set perspective tool as active  
     * Automatically deactivates any active drawing tools
     */
    public setPerspectiveTool(tool: string): void {
        console.log(`🎯 COORDINATOR: Setting perspective tool to "${tool}"`);

        // If drawing tool is active, deactivate it
        if (this.activeToolType === 'drawing') {
            this.deactivateDrawingTools();
        }

        // Update state
        this.activeToolType = 'perspective';
        this.activePerspectiveTool = tool;
        this.activeDrawingTool = null;

        console.log(`✅ COORDINATOR: Perspective tool "${tool}" is now active`);
    }

    /**
     * Deactivate all drawing tools
     */
    private deactivateDrawingTools(): void {
        console.log('🔧 COORDINATOR: Deactivating drawing tools');
        
        if (this.toolStateManager && typeof this.toolStateManager.deactivateAllDrawingTools === 'function') {
            this.toolStateManager.deactivateAllDrawingTools();
        } else {
            // Fallback: Direct UI manipulation
            document.querySelectorAll('[data-tool]').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('tools__item--active');
            });
            console.log('🔧 COORDINATOR: Used fallback method to deactivate drawing tools');
        }
    }

    /**
     * Deactivate all perspective tools
     */
    private deactivatePerspectiveTools(): void {
        console.log('🔧 COORDINATOR: Deactivating perspective tools');
        
        if (this.perspectiveManager && typeof this.perspectiveManager.deactivateGrabTool === 'function') {
            this.perspectiveManager.deactivateGrabTool();
        }

        // Also deactivate other perspective tools if needed (grid, etc.)
        document.querySelectorAll('[data-perspective]').forEach(btn => {
            if (btn.getAttribute('data-perspective') !== 'zoom-in' && 
                btn.getAttribute('data-perspective') !== 'zoom-out' && 
                btn.getAttribute('data-perspective') !== 'reset') {
                btn.classList.remove('perspective__item--active');
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
        console.log('🔄 COORDINATOR: Resetting all tools to default state');
        
        this.deactivateDrawingTools();
        this.deactivatePerspectiveTools();
        
        this.activeToolType = 'drawing';
        this.activeDrawingTool = 'selection';
        this.activePerspectiveTool = null;

        // Set drawing tools back to selection
        if (this.toolStateManager && typeof this.toolStateManager.setTool === 'function') {
            this.toolStateManager.setTool('selection');
        }

        console.log('✅ COORDINATOR: All tools reset - selection tool active');
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
        console.log('🔄 COORDINATOR: References updated');
    }
}
