/**
 * Simple Perspective Manager
 * Non-intrusive zoom and pan controls that work with existing canvas architecture
 * 
 * Features:
 * - Zoom in/out by 20% steps (100% to 200%)
 * - Reset to 100% zoom
 * - Pan/grab only when zoomed in (≥120%)
 * - Doesn't affect canvas dimensions, tools, or boundaries
 * - Works by applying CSS transforms to the canvas element
 */

export class SimplePerspectiveManager {
    private canvas: HTMLCanvasElement | null = null;
    private canvasContainer: HTMLElement | null = null;
    
    // Zoom settings
    private zoomLevel: number = 1.0; // 100%
    private readonly ZOOM_STEP = 0.2; // 20%
    private readonly MIN_ZOOM = 0.2; // 20%
    private readonly MAX_ZOOM = 2.0; // 200%
    private readonly GRAB_THRESHOLD = 1.2; // 120%
    
    // Pan state
    private isPanMode: boolean = false;
    private isPanning: boolean = false;
    private panStart: { x: number; y: number } = { x: 0, y: 0 };
    private panOffset: { x: number; y: number } = { x: 0, y: 0 };
    private gridEnabled: boolean = false;
    
    // Grid overlay element
    private gridOverlay: HTMLElement | null = null;

    constructor() {
        this.initializePerspective();
        this.bindEvents();
    }

    /**
     * Initialize perspective controls
     */
    private initializePerspective(): void {
        this.canvasContainer = document.getElementById('canvas-container');
        
        if (!this.canvasContainer) {
            console.warn('Canvas container not found for perspective controls');
            return;
        }

        // Find the canvas when it gets mounted
        this.findCanvas();

        console.log('🔍 Simple Perspective Manager initialized');
    }

    /**
     * Find and reference the canvas element
     */
    private findCanvas(): void {
        if (this.canvasContainer) {
            this.canvas = this.canvasContainer.querySelector('canvas');
            if (this.canvas) {
                this.setupCanvasInteractions();
                console.log('🎨 Canvas found and interactions set up');
            } else {
                // Try again later if canvas not found
                setTimeout(() => this.findCanvas(), 100);
            }
        }
    }

    /**
     * Set up canvas-specific interactions
     */
    private setupCanvasInteractions(): void {
        if (!this.canvas) return;

        // Mouse events for panning
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Mouse wheel zoom on canvas only
        this.canvas.addEventListener('wheel', this.handleWheelZoom.bind(this), { passive: false });

        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Find canvas if not already found
     */
    private findCanvasIfNeeded(): void {
        if (!this.canvas && this.canvasContainer) {
            this.canvas = this.canvasContainer.querySelector('canvas');
            if (this.canvas) {
                this.setupCanvasInteractions();
                console.log('🎨 Canvas reference updated for grid functionality');
            } else {
                console.warn('🚨 Canvas element not found for grid functionality');
            }
        }
    }

    /**
     * Bind UI events
     */
    private bindEvents(): void {
        // Bind perspective tool buttons
        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.addEventListener('click', this.handlePerspectiveAction.bind(this));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Note: Wheel zoom is bound directly to canvas in setupCanvasInteractions()
    }

    /**
     * Handle perspective tool button clicks
     */
    private handlePerspectiveAction(event: Event): void {
        event.preventDefault();
        
        const target = event.currentTarget as HTMLElement;
        const action = target.getAttribute('data-perspective');

        switch (action) {
            case 'zoom-in':
                this.zoomIn();
                break;
            case 'zoom-out':
                this.zoomOut();
                break;
            case 'reset':
                this.resetView();
                break;
            case 'grab':
                this.togglePanMode(target);
                break;
            case 'grid':
                this.toggleGrid(target);
                break;
            default:
                console.warn('Unknown perspective action:', action);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    private handleKeyboardShortcuts(event: KeyboardEvent): void {
        // Only handle shortcuts when canvas is focused or no specific element is focused
        const activeElement = document.activeElement;
        const isInputElement = activeElement instanceof HTMLInputElement || 
                              activeElement instanceof HTMLTextAreaElement ||
                              activeElement instanceof HTMLSelectElement;
        
        if (isInputElement) return;

        const isCtrlOrCmd = event.ctrlKey || event.metaKey;

        switch (event.key) {
            case '+':
            case '=':
                if (isCtrlOrCmd) {
                    event.preventDefault();
                    this.zoomIn();
                }
                break;
            case '-':
                if (isCtrlOrCmd) {
                    event.preventDefault();
                    this.zoomOut();
                }
                break;
            case '0':
                if (isCtrlOrCmd) {
                    event.preventDefault();
                    this.resetView();
                }
                break;
            case 'g':
                if (isCtrlOrCmd && event.shiftKey) {
                    event.preventDefault();
                    const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
                    if (gridButton) this.toggleGrid(gridButton);
                }
                break;
        }
    }

    /**
     * Handle mouse wheel zoom and scroll
     */
    private handleWheelZoom(event: WheelEvent): void {
        // Handle zoom when Ctrl/Cmd is held
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            
            if (event.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
            return;
        }

        // Handle normal scrolling when zoomed in (like grab tool)
        if (this.zoomLevel > 1.0) {
            event.preventDefault();
            
            const scrollSpeed = 2;
            const deltaX = event.deltaX * scrollSpeed;
            const deltaY = event.deltaY * scrollSpeed;
            
            // Update pan offset to simulate scrolling
            this.panOffset.x -= deltaX / this.zoomLevel;
            this.panOffset.y -= deltaY / this.zoomLevel;
            
            // Apply reasonable boundaries to prevent scrolling too far
            this.constrainPanOffset();
            
            this.applyTransform();
        }
        
        // If not zoomed and no Ctrl/Cmd, let normal scroll behavior happen
    }

    /**
     * Constrain pan offset to reasonable boundaries based on zoom level
     */
    private constrainPanOffset(): void {
        if (!this.canvas || !this.canvasContainer) return;
        
        // Calculate reasonable boundaries based on zoom level
        const maxOffset = (this.zoomLevel - 1) * 200; // Allow more movement when more zoomed
        
        this.panOffset.x = Math.max(-maxOffset, Math.min(maxOffset, this.panOffset.x));
        this.panOffset.y = Math.max(-maxOffset, Math.min(maxOffset, this.panOffset.y));
    }

    /**
     * Zoom in by 20%
     */
    private zoomIn(): void {
        const newZoom = Math.min(this.MAX_ZOOM, this.zoomLevel + this.ZOOM_STEP);
        this.setZoom(newZoom);
    }

    /**
     * Zoom out by 20%
     */
    private zoomOut(): void {
        const newZoom = Math.max(this.MIN_ZOOM, this.zoomLevel - this.ZOOM_STEP);
        this.setZoom(newZoom);
    }

    /**
     * Set specific zoom level
     */
    private setZoom(newZoom: number): void {
        if (newZoom === this.zoomLevel) return;

        this.zoomLevel = newZoom;
        this.applyTransform();
        this.updatePanAvailability();
        this.updateZoomDisplay();

        console.log(`🔍 Zoom: ${Math.round(this.zoomLevel * 100)}%`);
    }

    /**
     * Reset view to 100% zoom and center
     */
    private resetView(): void {
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        
        // Reset pan mode if active
        if (this.isPanMode) {
            const grabButton = document.querySelector('[data-perspective="grab"]') as HTMLElement;
            if (grabButton) this.togglePanMode(grabButton);
        }

        // Reset grid if enabled
        if (this.gridEnabled) {
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
        }

        this.applyTransform();
        this.updatePanAvailability();
        this.updateZoomDisplay();

        console.log('↩️ View reset to 100%');
    }

    /**
     * Apply zoom and pan transforms to canvas
     */
    private applyTransform(): void {
        if (!this.canvas || !this.canvasContainer) return;

        const transform = `scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
        this.canvas.style.transform = transform;
        this.canvas.style.transformOrigin = 'center center';
        
        // Update container overflow behavior based on zoom level
        if (this.zoomLevel > 1.0) {
            // When zoomed in, ensure we can see the overflow but hide scrollbars
            // since we're handling scrolling manually
            this.canvasContainer.style.overflow = 'hidden';
        } else {
            // At normal zoom, restore default overflow behavior
            this.canvasContainer.style.overflow = 'auto';
        }
        
        // Update grid overlay to match zoom level
        this.updateGridOverlay();
    }

    /**
     * Toggle pan mode (only available when zoomed in ≥120%)
     */
    private togglePanMode(button: HTMLElement): void {
        if (this.zoomLevel < this.GRAB_THRESHOLD) {
            console.log(`📱 Pan mode requires at least ${Math.round(this.GRAB_THRESHOLD * 100)}% zoom`);
            return;
        }

        this.isPanMode = !this.isPanMode;

        if (this.isPanMode) {
            button.classList.add('perspective__item--active');
            this.updateCanvasCursor('grab');
            
            // 🎯 UNIFIED TOOL MANAGEMENT: Notify coordinator about perspective tool selection
            const toolCoordinator = (window as any).toolCoordinator;
            if (toolCoordinator && typeof toolCoordinator.setPerspectiveTool === 'function') {
                toolCoordinator.setPerspectiveTool('grab');
            }
            
            // 🎯 SOLUTION 1: Deactivate drawing tools when grab is activated
            this.deactivateDrawingTools();
        } else {
            button.classList.remove('perspective__item--active');
            this.updateCanvasCursor('');
            
            // 🎯 CRITICAL: Reactivate drawing tools when grab is turned off
            this.reactivateDrawingTools();
        }

        console.log(`✋ Pan mode ${this.isPanMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Deactivate pan mode (public method for external calls)
     */
    public deactivateGrabTool(): void {
        if (this.isPanMode) {
            const grabButton = document.querySelector('[data-perspective="grab"]') as HTMLElement;
            if (grabButton) {
                this.isPanMode = false;
                grabButton.classList.remove('perspective__item--active');
                this.updateCanvasCursor('');
                
                // 🎯 CRITICAL: Reactivate drawing tools when grab is deactivated
                this.reactivateDrawingTools();
                
                console.log('✋ Grab mode deactivated by external tool selection');
            }
        }
    }

    /**
     * Reactivate drawing tools when grab tool is deactivated
     */
    private reactivateDrawingTools(): void {
        const toolStateManager = (window as any).toolStateManager;
        if (toolStateManager) {
            // Get the last active drawing tool or default to selection
            const lastTool = toolStateManager.getCurrentTool() || 'selection';
            
            // CRITICAL: Re-enable canvas drawing events first
            const canvasAPI = (window as any).canvasAPI;
            if (canvasAPI) {
                if (typeof canvasAPI.enableDrawingEvents === 'function') {
                    canvasAPI.enableDrawingEvents();
                    console.log('✅ CANVAS: Drawing events re-enabled');
                }
                
                // Then reactivate the canvas with the drawing tool
                if (typeof canvasAPI.setTool === 'function') {
                    canvasAPI.setTool(lastTool);
                    console.log(`🎨 CANVAS: Drawing tools reactivated with tool: ${lastTool}`);
                }
            }
            
            // Update UI to show the active tool
            const toolButton = document.querySelector(`[data-tool="${lastTool}"]`);
            if (toolButton) {
                // Clear all active states first
                document.querySelectorAll('[data-tool]').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Set the current tool as active
                toolButton.classList.add('active');
                console.log(`🔧 UI: Reactivated drawing tool button: ${lastTool}`);
            }
        }
    }

    /**
     * Deactivate all drawing tools when grab tool is activated
     * Enforces "only one tool active at a time" rule
     */
    private deactivateDrawingTools(): void {
        const toolStateManager = (window as any).toolStateManager;
        if (toolStateManager && typeof toolStateManager.deactivateAllDrawingTools === 'function') {
            toolStateManager.deactivateAllDrawingTools();
            console.log('🔧 GRAB: Deactivated all drawing tools');
        } else {
            // Fallback: Direct UI manipulation if toolStateManager method not available
            document.querySelectorAll('[data-tool]').forEach(btn => {
                btn.classList.remove('active');
            });
            console.log('🔧 GRAB: Deactivated drawing tools (fallback method)');
        }
    }

    /**
     * Check if grab tool is currently active
     */
    public isGrabToolActive(): boolean {
        return this.isPanMode;
    }

    /**
     * Update pan mode availability based on zoom level
     */
    private updatePanAvailability(): void {
        const grabButton = document.querySelector('[data-perspective="grab"]') as HTMLElement;
        if (!grabButton) return;

        if (this.zoomLevel < this.GRAB_THRESHOLD) {
            // Disable pan mode if zoom is too low
            if (this.isPanMode) {
                this.isPanMode = false;
                grabButton.classList.remove('perspective__item--active');
                this.updateCanvasCursor('');
            }
            
            // Visual indication that grab is unavailable
            grabButton.style.opacity = '0.5';
            grabButton.title = `Pan mode (requires ≥${Math.round(this.GRAB_THRESHOLD * 100)}% zoom)`;
        } else {
            // Enable grab button
            grabButton.style.opacity = '1';
            grabButton.title = 'Pan mode';
        }
    }

    /**
     * Handle mouse down for panning
     */
    private handleMouseDown(event: MouseEvent): void {
        if (!this.isPanMode || this.zoomLevel < this.GRAB_THRESHOLD) return;

        this.isPanning = true;
        this.panStart = { x: event.clientX, y: event.clientY };
        this.updateCanvasCursor('grabbing');

        // Prevent default to avoid interfering with drawing tools
        event.preventDefault();
    }

    /**
     * Handle mouse move for panning
     */
    private handleMouseMove(event: MouseEvent): void {
        if (!this.isPanning || !this.isPanMode) return;

        const deltaX = (event.clientX - this.panStart.x) / this.zoomLevel;
        const deltaY = (event.clientY - this.panStart.y) / this.zoomLevel;

        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;

        // Apply the same constraints as wheel scrolling
        this.constrainPanOffset();

        this.panStart = { x: event.clientX, y: event.clientY };
        this.applyTransform();

        event.preventDefault();
    }

    /**
     * Handle mouse up for panning
     */
    private handleMouseUp(): void {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCanvasCursor(this.isPanMode ? 'grab' : '');
        }
    }

    /**
     * Update canvas cursor
     */
    private updateCanvasCursor(cursor: string): void {
        if (this.canvas) {
            this.canvas.style.cursor = cursor;
        }
    }

    /**
     * Toggle grid display
     */
    private toggleGrid(button: HTMLElement): void {
        // Ensure we have the latest canvas reference
        this.findCanvasIfNeeded();
        
        this.gridEnabled = !this.gridEnabled;
        
        // Update button state
        if (this.gridEnabled) {
            button.classList.add('perspective__item--active');
        } else {
            button.classList.remove('perspective__item--active');
        }
        
        // Apply grid styling to canvas
        this.applyGridStyling();
        
        console.log(`📐 Grid ${this.gridEnabled ? 'enabled' : 'disabled'} - Canvas found: ${!!this.canvas}`);
    }

    /**
     * Apply or remove grid styling using overlay approach
     */
    private applyGridStyling(): void {
        if (!this.canvas) {
            console.warn('🚨 No canvas found for grid styling');
            return;
        }

        if (this.gridEnabled) {
            this.createGridOverlay();
        } else {
            this.removeGridOverlay();
        }
    }

    /**
     * Create grid overlay element
     */
    private createGridOverlay(): void {
        // Remove existing overlay first
        this.removeGridOverlay();
        
        if (!this.canvas || !this.canvasContainer) return;

        // Create grid overlay div
        this.gridOverlay = document.createElement('div');
        this.gridOverlay.className = 'canvas-grid-overlay';
        
        this.updateGridOverlayStyles();
        
        // Insert overlay into the canvas container
        this.canvasContainer.appendChild(this.gridOverlay);
        
        console.log('📐 Grid overlay created and positioned over canvas');
    }

    /**
     * Update grid overlay styles to match current zoom and canvas position
     */
    private updateGridOverlayStyles(): void {
        if (!this.gridOverlay || !this.canvas) return;
        
        // Calculate grid size based on zoom level to maintain visual consistency
        const gridSize = Math.max(2, 20 / this.zoomLevel);
        
        // Style the overlay to match canvas position and size
        this.gridOverlay.style.cssText = `
            position: absolute;
            top: ${this.canvas.offsetTop}px;
            left: ${this.canvas.offsetLeft}px;
            width: ${this.canvas.offsetWidth}px;
            height: ${this.canvas.offsetHeight}px;
            pointer-events: none;
            z-index: 10;
            background-image: 
                linear-gradient(rgba(100, 100, 100, 0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(100, 100, 100, 0.4) 1px, transparent 1px);
            background-size: ${gridSize}px ${gridSize}px;
            background-position: 0 0;
            background-repeat: repeat;
            transform: scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px);
            transform-origin: center center;
        `;
    }

    /**
     * Update grid overlay to match current zoom/pan state
     */
    private updateGridOverlay(): void {
        if (this.gridEnabled && this.gridOverlay) {
            this.updateGridOverlayStyles();
        }
    }

    /**
     * Remove grid overlay
     */
    private removeGridOverlay(): void {
        if (this.gridOverlay && this.gridOverlay.parentNode) {
            this.gridOverlay.parentNode.removeChild(this.gridOverlay);
            this.gridOverlay = null;
            console.log('📐 Grid overlay removed');
        }
    }

    /**
     * Update zoom display indicator
     */
    private updateZoomDisplay(): void {
        const zoomDisplay = document.querySelector('.zoom-display') as HTMLElement;
        if (zoomDisplay) {
            const zoomPercent = Math.round(this.zoomLevel * 100);
            zoomDisplay.textContent = `${zoomPercent}%`;
            
            // Update title to show scroll instructions when zoomed
            if (this.zoomLevel > 1.0) {
                zoomDisplay.title = `Zoomed to ${zoomPercent}% - Mouse wheel scrolls around canvas, Ctrl/Cmd+wheel zooms`;
            } else {
                zoomDisplay.title = `${zoomPercent} zoom - Ctrl/Cmd+wheel to zoom in`;
            }
        }
    }

    /**
     * Public API methods
     */
    public getZoomLevel(): number {
        return this.zoomLevel;
    }

    public isGridEnabled(): boolean {
        return this.gridEnabled;
    }

    public setZoomLevel(zoom: number): void {
        const clampedZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, zoom));
        this.setZoom(clampedZoom);
    }

    /**
     * Debug method to check grid status and force apply
     */
    public debugGrid(): any {
        this.findCanvasIfNeeded();
        const gridSize = this.gridEnabled ? Math.max(2, 20 / this.zoomLevel) : 0;
        const status = {
            canvasContainer: !!this.canvasContainer,
            canvas: !!this.canvas,
            gridEnabled: this.gridEnabled,
            gridOverlay: !!this.gridOverlay,
            zoomLevel: this.zoomLevel,
            calculatedGridSize: gridSize,
            canvasStyles: this.canvas ? {
                offsetTop: this.canvas.offsetTop,
                offsetLeft: this.canvas.offsetLeft,
                offsetWidth: this.canvas.offsetWidth,
                offsetHeight: this.canvas.offsetHeight,
                transform: this.canvas.style.transform
            } : null,
            overlayInDOM: this.gridOverlay ? this.gridOverlay.parentNode !== null : false,
            overlayTransform: this.gridOverlay ? this.gridOverlay.style.transform : null
        };
        console.log('🔍 Grid Debug Status:', status);
        return status;
    }

    /**
     * Force enable grid for debugging
     */
    public forceEnableGrid(): void {
        this.findCanvasIfNeeded();
        this.gridEnabled = true;
        this.applyGridStyling();
        
        // Update button state
        const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
        if (gridButton) {
            gridButton.classList.add('perspective__item--active');
        }
        
        console.log('🔧 Grid force enabled for debugging');
    }

    /**
     * Cleanup method
     */
    public destroy(): void {
        // Remove grid overlay
        this.removeGridOverlay();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        if (this.canvasContainer) {
            this.canvasContainer.removeEventListener('wheel', this.handleWheelZoom.bind(this));
        }

        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
            this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
            this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
        }

        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.removeEventListener('click', this.handlePerspectiveAction.bind(this));
        });
        
        console.log('🔍 Simple Perspective Manager destroyed');
    }
}
