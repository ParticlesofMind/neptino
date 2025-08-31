/**
 * ViewportManager - Advanced Canvas Viewport with pixi-viewport
 * 
 * Integrates pixi-viewport library to provide:
 * - Zoom in/out with mouse wheel and buttons
 * - Pan/drag when zoomed in
 * - Reset to default view 
 * - Smooth interactions and boundaries
 * 
 * Replaces the basic PerspectiveManager with advanced camera controls
 */

import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export class ViewportManager {
    private viewport: Viewport | null = null;
    private app: Application | null = null;
    private canvasContainer: HTMLElement | null = null;
    
    // Viewport settings
    private worldWidth: number = 2000;
    private worldHeight: number = 2000;
    private screenWidth: number = 800;
    private screenHeight: number = 600;
    
    // State tracking
    private gridEnabled: boolean = false;
    private isDragMode: boolean = false;
    
    // Constants
    private readonly ZOOM_MIN = 0.1;
    private readonly ZOOM_MAX = 5.0;
    private readonly ZOOM_STEP = 0.1;

    constructor() {
        this.initializeViewport();
        this.bindUIEvents();
    }

    /**
     * Initialize viewport controls and bind to DOM elements
     */
    private initializeViewport(): void {
        this.canvasContainer = document.getElementById('canvas-container');
        
        if (!this.canvasContainer) {
            console.warn('Canvas container not found for viewport controls');
            return;
        }

        console.log('🔍 ViewportManager initialized');
    }

    /**
     * Setup viewport after PIXI app is available
     */
    public setupViewport(app: Application): void {
        this.app = app;
        
        // Get canvas dimensions for screen size
        const canvas = app.canvas;
        this.screenWidth = canvas.width;
        this.screenHeight = canvas.height;
        
        // Create viewport with pixi-viewport
        this.viewport = new Viewport({
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            events: app.renderer.events
        });

        // Add viewport to the stage (replacing or wrapping existing content)
        app.stage.addChild(this.viewport);

        // Configure viewport plugins
        this.configureViewportPlugins();
        
        // Set initial position to center of world
        this.centerView();

        console.log('✅ Pixi-Viewport created and configured');
        console.log(`📐 Screen: ${this.screenWidth}x${this.screenHeight}, World: ${this.worldWidth}x${this.worldHeight}`);
    }

    /**
     * Configure pixi-viewport plugins for desired behavior
     */
    private configureViewportPlugins(): void {
        if (!this.viewport) return;

        // Enable drag (pan) functionality
        this.viewport.drag({
            wheel: false, // We'll handle wheel zoom separately
        });

        // Enable wheel zoom with nice settings
        this.viewport.wheel({
            smooth: 3, // Smooth wheel scrolling
        });

        // Enable pinch-to-zoom for touch devices
        this.viewport.pinch();

        // Add deceleration for smooth feel
        this.viewport.decelerate({
            friction: 0.88, // How quickly panning slows down
            bounce: 0.8, // Bounce when hitting world edges
            minSpeed: 0.01 // Minimum speed before stopping
        });

        // Clamp to world boundaries with some padding
        this.viewport.clamp({
            left: -this.worldWidth * 0.1,
            right: this.worldWidth * 1.1,
            top: -this.worldHeight * 0.1,
            bottom: this.worldHeight * 1.1
        });

        // Set zoom limits
        this.viewport.clampZoom({
            minScale: this.ZOOM_MIN,
            maxScale: this.ZOOM_MAX
        });

        console.log('⚙️ Viewport plugins configured');
    }

    /**
     * Bind UI button events and keyboard shortcuts
     */
    private bindUIEvents(): void {
        // Bind perspective tool buttons
        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.addEventListener('click', this.handlePerspectiveAction.bind(this));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
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
                this.toggleDragMode(target);
                break;
            case 'grid':
                this.toggleGrid(target);
                break;
            default:
                console.warn('Unknown viewport action:', action);
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
            case ' ':
                // Space bar for temporary grab/pan mode
                if (!isCtrlOrCmd && !event.repeat) {
                    event.preventDefault();
                    this.setTemporaryDragMode(true);
                }
                break;
        }
    }

    /**
     * Zoom in by step amount
     */
    private zoomIn(): void {
        if (!this.viewport) return;
        
        const currentZoom = this.viewport.scaled;
        const newZoom = Math.min(this.ZOOM_MAX, currentZoom + this.ZOOM_STEP);
        
        this.viewport.zoomPercent(newZoom / currentZoom, true); // Smooth zoom
        this.updateZoomDisplay(newZoom);
        
        console.log(`🔍 Zoom in: ${Math.round(newZoom * 100)}%`);
    }

    /**
     * Zoom out by step amount
     */
    private zoomOut(): void {
        if (!this.viewport) return;
        
        const currentZoom = this.viewport.scaled;
        const newZoom = Math.max(this.ZOOM_MIN, currentZoom - this.ZOOM_STEP);
        
        this.viewport.zoomPercent(newZoom / currentZoom, true); // Smooth zoom
        this.updateZoomDisplay(newZoom);
        
        console.log(`🔍 Zoom out: ${Math.round(newZoom * 100)}%`);
    }

    /**
     * Reset viewport to default view (100% zoom, centered)
     */
    private resetView(): void {
        if (!this.viewport) return;

        // Reset zoom to 100%
        this.viewport.setZoom(1, true); // Smooth transition
        
        // Center the view
        this.centerView();
        
        // Reset grid if enabled
        if (this.gridEnabled) {
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
        }
        
        // Reset drag mode
        if (this.isDragMode) {
            const grabButton = document.querySelector('[data-perspective="grab"]') as HTMLElement;
            if (grabButton) this.toggleDragMode(grabButton);
        }
        
        this.updateZoomDisplay(1.0);
        console.log('↩️ View reset to default');
    }

    /**
     * Center viewport on the content
     */
    private centerView(): void {
        if (!this.viewport) return;
        
        this.viewport.moveCenter(this.worldWidth / 2, this.worldHeight / 2);
    }

    /**
     * Toggle drag/pan mode (grab tool)
     */
    private toggleDragMode(button: HTMLElement): void {
        if (!this.viewport) return;

        this.isDragMode = !this.isDragMode;
        
        if (this.isDragMode) {
            button.classList.add('perspective__item--active');
            // Enable drag mode
            this.viewport.plugins.resume('drag');
            
            // Change cursor to grab
            if (this.canvasContainer) {
                this.canvasContainer.style.cursor = 'grab';
            }
        } else {
            button.classList.remove('perspective__item--active');
            // Keep drag enabled but change cursor
            this.viewport.plugins.resume('drag');
            
            // Reset cursor
            if (this.canvasContainer) {
                this.canvasContainer.style.cursor = '';
            }
        }
        
        console.log(`✋ Grab mode ${this.isDragMode ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set temporary drag mode (e.g., while space is held)
     */
    private setTemporaryDragMode(enabled: boolean): void {
        if (!this.viewport || !this.canvasContainer) return;

        if (enabled) {
            this.canvasContainer.style.cursor = 'grabbing';
            // Enable more liberal dragging temporarily  
            this.viewport.plugins.resume('drag');
        } else {
            // Restore previous state
            this.canvasContainer.style.cursor = this.isDragMode ? 'grab' : '';
            this.viewport.plugins.resume('drag');
        }
    }

    /**
     * Toggle grid display (CSS-based for now)
     */
    private toggleGrid(button: HTMLElement): void {
        this.gridEnabled = !this.gridEnabled;
        
        // Update button state
        if (this.gridEnabled) {
            button.classList.add('perspective__item--active');
        } else {
            button.classList.remove('perspective__item--active');
        }
        
        // Apply grid styling to container
        this.applyGridStyling();
        
        console.log(`📐 Grid ${this.gridEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Apply or remove grid styling
     */
    private applyGridStyling(): void {
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
     * Update zoom display indicator
     */
    private updateZoomDisplay(zoomLevel: number): void {
        const zoomDisplay = document.querySelector('.zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
        }
    }

    /**
     * Get the viewport instance for advanced operations
     */
    public getViewport(): Viewport | null {
        return this.viewport;
    }

    /**
     * Get current zoom level
     */
    public getZoomLevel(): number {
        return this.viewport?.scaled || 1.0;
    }

    /**
     * Set zoom level programmatically
     */
    public setZoomLevel(zoom: number, smooth: boolean = true): void {
        if (!this.viewport) return;
        
        const clampedZoom = Math.max(this.ZOOM_MIN, Math.min(this.ZOOM_MAX, zoom));
        this.viewport.setZoom(clampedZoom, smooth);
        this.updateZoomDisplay(clampedZoom);
    }

    /**
     * Check if grid is enabled
     */
    public isGridEnabled(): boolean {
        return this.gridEnabled;
    }

    /**
     * Move existing drawing layer content to viewport
     */
    public migrateDrawingLayer(drawingLayer: Container): void {
        if (!this.viewport || !drawingLayer) return;

        // Move all children from drawing layer to viewport
        while (drawingLayer.children.length > 0) {
            const child = drawingLayer.children[0];
            this.viewport.addChild(child);
        }

        console.log('🔄 Drawing layer content migrated to viewport');
    }

    /**
     * Cleanup method
     */
    public destroy(): void {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        document.querySelectorAll('[data-perspective]').forEach(element => {
            element.removeEventListener('click', this.handlePerspectiveAction.bind(this));
        });

        // Destroy viewport
        if (this.viewport) {
            this.viewport.destroy();
            this.viewport = null;
        }
        
        console.log('🔍 ViewportManager destroyed');
    }
}
