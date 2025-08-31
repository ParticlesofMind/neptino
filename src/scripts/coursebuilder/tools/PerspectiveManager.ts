/**
 * Perspective Manager
 * Manages canvas perspective controls: zoom, grid, reset view
 */

export class PerspectiveManager {
    private zoomLevel: number = 1;
    private gridEnabled: boolean = false;
    private minZoom: number = 0.1;
    private maxZoom: number = 5;
    private zoomStep: number = 0.1;
    
    private canvasContainer: HTMLElement | null = null;
    private canvas: HTMLElement | null = null;

    constructor() {
        this.initializePerspective();
        this.bindEvents();
    }

    /**
     * Initialize perspective controls
     */
    private initializePerspective(): void {
        this.canvasContainer = document.getElementById('canvas-container');
        this.canvas = this.canvasContainer?.querySelector('.canvas__placeholder') || null;
        
        if (!this.canvasContainer) {
            console.warn('Canvas container not found for perspective controls');
            return;
        }

        console.log('🔍 Perspective Manager initialized');
    }

    /**
     * Bind perspective control events
     */
    private bindEvents(): void {
        // Bind perspective tool events
        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.addEventListener('click', this.handlePerspectiveAction.bind(this));
        });

        // Bind mouse wheel zoom events
        if (this.canvasContainer) {
            this.canvasContainer.addEventListener('wheel', this.handleWheelZoom.bind(this), { passive: false });
        }

        // Bind keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    /**
     * Handle perspective tool actions
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
            case 'grid':
                this.toggleGrid(target);
                break;
            case 'reset':
                this.resetView();
                break;
            default:
                console.warn('Unknown perspective action:', action);
        }
    }

    /**
     * Handle mouse wheel zoom
     */
    private handleWheelZoom(event: WheelEvent): void {
        // Only zoom when Ctrl/Cmd is held
        if (!event.ctrlKey && !event.metaKey) return;

        event.preventDefault();
        
        const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.setZoom(this.zoomLevel + delta);
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
     * Zoom in
     */
    private zoomIn(): void {
        this.setZoom(this.zoomLevel + this.zoomStep);
    }

    /**
     * Zoom out
     */
    private zoomOut(): void {
        this.setZoom(this.zoomLevel - this.zoomStep);
    }

    /**
     * Set zoom level
     */
    private setZoom(newZoom: number): void {
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (clampedZoom === this.zoomLevel) return;
        
        this.zoomLevel = clampedZoom;
        this.applyZoom();
        
        // Update zoom level display if exists
        this.updateZoomDisplay();
        
        console.log(`🔍 Zoom level: ${Math.round(this.zoomLevel * 100)}%`);
    }

    /**
     * Apply zoom transformation
     */
    private applyZoom(): void {
        if (!this.canvas) return;

        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.canvas.style.transformOrigin = 'center center';
        
        // Update container scrolling to account for zoom
        if (this.canvasContainer) {
            this.canvasContainer.style.overflow = this.zoomLevel > 1 ? 'auto' : 'hidden';
        }
    }

    /**
     * Toggle grid display
     */
    private toggleGrid(button: HTMLElement): void {
        this.gridEnabled = !this.gridEnabled;
        
        // Update button state
        if (this.gridEnabled) {
            button.classList.add('perspective__item--active');
        } else {
            button.classList.remove('perspective__item--active');
        }
        
        // Apply grid styling to canvas
        this.applyGrid();
        
        console.log(`📐 Grid ${this.gridEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Apply grid styling
     */
    private applyGrid(): void {
        if (!this.canvasContainer) return;

        if (this.gridEnabled) {
            // Add grid background
            this.canvasContainer.style.backgroundImage = `
                linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px)
            `;
            this.canvasContainer.style.backgroundSize = '20px 20px';
            this.canvasContainer.style.backgroundPosition = 'center center';
        } else {
            // Remove grid background
            this.canvasContainer.style.backgroundImage = '';
            this.canvasContainer.style.backgroundSize = '';
            this.canvasContainer.style.backgroundPosition = '';
        }
    }

    /**
     * Reset view to default
     */
    private resetView(): void {
        this.setZoom(1);
        
        // Reset grid if enabled
        if (this.gridEnabled) {
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
        }
        
        // Reset scroll position
        if (this.canvasContainer) {
            this.canvasContainer.scrollTo(0, 0);
        }
        
        console.log('↩️ View reset to default');
    }

    /**
     * Update zoom display if a zoom indicator exists
     */
    private updateZoomDisplay(): void {
        const zoomDisplay = document.querySelector('.zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
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
        this.setZoom(zoom);
    }
    
    public enableGrid(): void {
        if (!this.gridEnabled) {
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
        }
    }
    
    public disableGrid(): void {
        if (this.gridEnabled) {
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
        }
    }
    
    /**
     * Cleanup method
     */
    public destroy(): void {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        if (this.canvasContainer) {
            this.canvasContainer.removeEventListener('wheel', this.handleWheelZoom.bind(this));
        }
        
        // Remove perspective tool event listeners
        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.removeEventListener('click', this.handlePerspectiveAction.bind(this));
        });
        
        console.log('🔍 Perspective Manager destroyed');
    }
}
