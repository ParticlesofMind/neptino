/**
 * High-Quality Zoom System
 * Implements proper PIXI-based zoom that maintains graphics quality at all zoom levels
 */

import { Application, Container } from 'pixi.js';

export interface ZoomConfig {
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    smoothZoom: boolean;
}

export class HighQualityZoom {
    private app: Application;
    private stage: Container;
    private zoomLevel: number = 1.0;
    private config: ZoomConfig;
    
    // Pan offset for the zoomed view
    private panOffset: { x: number; y: number } = { x: 0, y: 0 };
    
    // Spacebar panning state
    private isSpacePressed: boolean = false;
    private isSpacePanning: boolean = false;
    
    constructor(app: Application, config: Partial<ZoomConfig> = {}) {
        this.app = app;
        this.stage = app.stage;
        
        this.config = {
            minZoom: 0.2,
            maxZoom: 5.0, // Allow higher zoom for detailed work
            zoomStep: 0.2,
            smoothZoom: true,
            ...config
        };
        
        // Bind perspective tool events
        this.bindPerspectiveEvents();
    }
    
    /**
     * Set zoom level using PIXI stage scaling (maintains quality)
     */
    public setZoom(newZoom: number, centerX?: number, centerY?: number): void {
        const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, newZoom));
        
        if (clampedZoom === this.zoomLevel) return;
        
        // Calculate zoom center point (default to canvas center)
        const zoomCenterX = centerX ?? this.app.screen.width / 2;
        const zoomCenterY = centerY ?? this.app.screen.height / 2;
        
        // Calculate position adjustment to zoom around the center point
        const zoomDelta = clampedZoom / this.zoomLevel;
        const newPanX = zoomCenterX - (zoomCenterX - this.panOffset.x) * zoomDelta;
        const newPanY = zoomCenterY - (zoomCenterY - this.panOffset.y) * zoomDelta;
        
        // Update zoom and pan
        this.zoomLevel = clampedZoom;
        this.panOffset.x = newPanX;
        this.panOffset.y = newPanY;
        
        this.applyTransform();
        
    }
    
    /**
     * Zoom in by one step
     */
    public zoomIn(centerX?: number, centerY?: number): void {
        this.setZoom(this.zoomLevel + this.config.zoomStep, centerX, centerY);
    }
    
    /**
     * Zoom out by one step
     */
    public zoomOut(centerX?: number, centerY?: number): void {
        this.setZoom(this.zoomLevel - this.config.zoomStep, centerX, centerY);
    }
    
    /**
     * Reset zoom to 100% and center the view
     */
    public resetZoom(): void {
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        this.applyTransform();
    }
    
    /**
     * Pan the view by the specified offset
     */
    public pan(deltaX: number, deltaY: number): void {
        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;
        this.constrainPan();
        this.applyTransform();
    }
    
    /**
     * Set absolute pan position
     */
    public setPan(x: number, y: number): void {
        this.panOffset.x = x;
        this.panOffset.y = y;
        this.constrainPan();
        this.applyTransform();
    }
    
    /**
     * Apply the zoom and pan transforms to the entire stage (camera-like zoom)
     */
    private applyTransform(): void {
        // Scale the entire stage for camera-like zoom behavior
        // This affects all layers: background (margins), drawing content, and UI overlays
        this.stage.scale.set(this.zoomLevel);
        this.stage.position.set(this.panOffset.x, this.panOffset.y);
        
        // Update zoom display in UI
        this.updateZoomDisplay();
        
        console.log(`🎯 Applied transform: zoom=${this.zoomLevel.toFixed(3)}, pan=(${this.panOffset.x.toFixed(1)}, ${this.panOffset.y.toFixed(1)})`);
    }    /**
     * Constrain panning to reasonable bounds
     */
    private constrainPan(): void {
        const maxPanX = (this.zoomLevel - 1) * this.app.screen.width / 2;
        const maxPanY = (this.zoomLevel - 1) * this.app.screen.height / 2;
        
        this.panOffset.x = Math.max(-maxPanX, Math.min(maxPanX, this.panOffset.x));
        this.panOffset.y = Math.max(-maxPanY, Math.min(maxPanY, this.panOffset.y));
    }
    
    /**
     * Update zoom display indicator in the UI
     */
    private updateZoomDisplay(): void {
        // Try to find and update the zoom display element
        const zoomDisplay = document.querySelector('.engine__zoom-display') as HTMLElement;
        
        if (zoomDisplay) {
            // Convert zoom level to percentage (1.0 = 100%)
            const zoomPercent = Math.round(this.zoomLevel * 100);
            zoomDisplay.textContent = `${zoomPercent}%`;
            
            // Update title with helpful information
            if (this.zoomLevel > 1.0) {
                zoomDisplay.title = `Zoomed to ${zoomPercent}% - Mouse wheel scrolls around canvas, Ctrl/Cmd+wheel zooms`;
            } else {
                zoomDisplay.title = `${zoomPercent}% zoom - Ctrl/Cmd+wheel to zoom in`;
            }
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates (accounting for stage zoom/pan)
     */
    public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        // Use PIXI's built-in coordinate conversion for accuracy
        return this.stage.toLocal({ x: screenX, y: screenY });
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        // Use PIXI's built-in coordinate conversion for accuracy
        const global = this.stage.toGlobal({ x: worldX, y: worldY });
        return { x: global.x, y: global.y };
    }    /**
     * Get current zoom level
     */
    public getZoom(): number {
        return this.zoomLevel;
    }
    
    /**
     * Get current pan offset
     */
    public getPan(): { x: number; y: number } {
        return { ...this.panOffset };
    }

    /**
     * Compatibility: Set drawing layer (no-op since we zoom entire stage)
     */
    public setDrawingLayer(_drawingLayer: Container): void {
        // No-op: We zoom the entire stage, not individual layers
        console.log('🎯 Stage-based zoom active (not layer-specific)');
    }
    
    /**
     * Handle mouse wheel zoom
     */
    public handleWheel(event: WheelEvent, mouseX: number, mouseY: number): boolean {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            
            if (event.deltaY < 0) {
                this.zoomIn(mouseX, mouseY);
            } else {
                this.zoomOut(mouseX, mouseY);
            }
            return true;
        }
        
        // Handle pan when zoomed
        if (this.zoomLevel > 1.0) {
            event.preventDefault();
            this.pan(-event.deltaX / this.zoomLevel, -event.deltaY / this.zoomLevel);
            return true;
        }
        
        return false;
    }

    // =============================================================================
    // COMPATIBILITY METHODS - For existing code that expects SimplePerspectiveManager API
    // =============================================================================

    /**
     * Compatibility: Get zoom level (alias for getZoom)
     */
    public getZoomLevel(): number {
        return this.zoomLevel;
    }

    /**
     * Compatibility: Set zoom level (alias for setZoom)
     */
    public setZoomLevel(zoom: number): void {
        this.setZoom(zoom);
    }

    /**
     * Compatibility: Update canvas reference (no-op for HighQualityZoom)
     */
    public updateCanvasReference(): void {
        // No-op: HighQualityZoom gets canvas reference from PIXI app
        console.log('🎯 Canvas reference updated (HighQualityZoom)');
    }

    /**
     * Compatibility: Fit canvas to container
     */
    public fitToContainer(): void {
        // Reset to default zoom that fits content
        this.resetZoom();
        console.log('🎯 Canvas fitted to container (HighQualityZoom)');
    }

    /**
     * Grab tool activation state
     */
    private isGrabToolActive: boolean = false;
    private grabKeyHandler: ((event: KeyboardEvent) => void) | null = null;
    private grabMouseHandler: ((event: MouseEvent) => void) | null = null;

    /**
     * Compatibility: Activate grab tool (spacebar + drag)
     */
    public activateGrabTool(): void {
        if (this.isGrabToolActive) return;
        
        this.isGrabToolActive = true;
        document.body.style.cursor = 'grab';
        
        // Set up spacebar grab functionality
        let isSpacePressed = false;
        
        this.grabKeyHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space' && !event.repeat) {
                event.preventDefault();
                isSpacePressed = true;
                document.body.style.cursor = 'grabbing';
                
                // Add mouse move handler for dragging
                this.grabMouseHandler = (moveEvent: MouseEvent) => {
                    if (isSpacePressed && moveEvent.buttons === 1) { // Left mouse button pressed while space is held
                        // Pan the drawing layer content
                        this.pan(moveEvent.movementX, moveEvent.movementY);
                    }
                };
                document.addEventListener('mousemove', this.grabMouseHandler);
            }
        };
        
        const keyUpHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                isSpacePressed = false;
                document.body.style.cursor = 'grab';
                if (this.grabMouseHandler) {
                    document.removeEventListener('mousemove', this.grabMouseHandler);
                    this.grabMouseHandler = null;
                }
            }
        };
        
        document.addEventListener('keydown', this.grabKeyHandler);
        document.addEventListener('keyup', keyUpHandler);
        
        console.log('🎯 Grab tool activated (spacebar + drag)');
    }

    /**
     * Compatibility: Deactivate grab tool
     */
    public deactivateGrabTool(): void {
        if (!this.isGrabToolActive) return;
        
        this.isGrabToolActive = false;
        document.body.style.cursor = 'default';
        
        if (this.grabKeyHandler) {
            document.removeEventListener('keydown', this.grabKeyHandler);
            this.grabKeyHandler = null;
        }
        
        if (this.grabMouseHandler) {
            document.removeEventListener('mousemove', this.grabMouseHandler);
            this.grabMouseHandler = null;
        }
        
        console.log('🎯 Grab tool deactivated');
    }

    /**
     * Compatibility: Check if grab tool is active
     */
    public isGrabActive(): boolean {
        return this.isGrabToolActive;
    }

    /**
     * Bind perspective tool button events
     */
    private bindPerspectiveEvents(): void {
        // Handle perspective tool button clicks
        document.querySelectorAll('[data-perspective]:not([data-snap-anchor])').forEach(button => {
            button.addEventListener('click', (event: Event) => {
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
                        this.toggleGrabTool(target);
                        break;
                    default:
                        console.warn('Unknown perspective action:', action);
                }
            });
        });

        // Handle wheel zoom on canvas
        const canvas = this.app.view as HTMLCanvasElement;
        if (canvas) {
            canvas.addEventListener('wheel', (event: WheelEvent) => {
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    
                    const rect = canvas.getBoundingClientRect();
                    const centerX = event.clientX - rect.left;
                    const centerY = event.clientY - rect.top;
                    
                    if (event.deltaY < 0) {
                        this.zoomIn(centerX, centerY);
                    } else {
                        this.zoomOut(centerX, centerY);
                    }
                }
            }, { passive: false });
        }

        // Handle global spacebar + mouse drag panning
        this.bindSpacebarPanning();
    }

    /**
     * Bind spacebar + mouse drag panning functionality
     */
    private bindSpacebarPanning(): void {
        let panStart = { x: 0, y: 0 };
        let originalCursor = '';

        const keyDownHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space' && !event.repeat) {
                // Prevent spacebar from scrolling the page
                event.preventDefault();
                
                if (!this.isSpacePressed) {
                    this.isSpacePressed = true;
                    // Store original cursor and change to grab
                    originalCursor = document.body.style.cursor;
                    document.body.style.cursor = 'grab';
                }
            }
        };

        const keyUpHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                this.isSpacePressed = false;
                this.isSpacePanning = false;
                // Restore original cursor
                document.body.style.cursor = originalCursor;
            }
        };

        const mouseDownHandler = (event: MouseEvent) => {
            if (this.isSpacePressed && event.button === 0) { // Left mouse button
                event.preventDefault();
                this.isSpacePanning = true;
                panStart = { x: event.clientX, y: event.clientY };
                document.body.style.cursor = 'grabbing';
            }
        };

        const mouseMoveHandler = (event: MouseEvent) => {
            if (this.isSpacePanning && this.isSpacePressed) {
                event.preventDefault();
                
                const deltaX = (event.clientX - panStart.x) / this.zoomLevel;
                const deltaY = (event.clientY - panStart.y) / this.zoomLevel;
                
                this.panOffset.x += deltaX;
                this.panOffset.y += deltaY;
                
                this.applyTransform();
                
                panStart = { x: event.clientX, y: event.clientY };
            }
        };

        const mouseUpHandler = () => {
            if (this.isSpacePanning) {
                this.isSpacePanning = false;
                document.body.style.cursor = this.isSpacePressed ? 'grab' : originalCursor;
            }
        };

        // Add event listeners
        document.addEventListener('keydown', keyDownHandler, { capture: true });
        document.addEventListener('keyup', keyUpHandler, { capture: true });
        document.addEventListener('mousedown', mouseDownHandler, { capture: true });
        document.addEventListener('mousemove', mouseMoveHandler, { capture: true });
        document.addEventListener('mouseup', mouseUpHandler, { capture: true });

        console.log('🎯 Spacebar + mouse drag panning enabled');
    }



    /**
     * Reset zoom and pan to defaults
     */
    private resetView(): void {
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        this.applyTransform();
        console.log('🔍 View reset to 100%');
    }

    /**
     * Check if spacebar panning is currently active
     */
    public isSpacebarPanningActive(): boolean {
        return this.isSpacePressed || this.isSpacePanning;
    }

    /**
     * Toggle grab tool on/off
     */
    private toggleGrabTool(button: HTMLElement): void {
        if (this.isGrabToolActive) {
            this.deactivateGrabTool();
            button.classList.remove('engine__item--active');
        } else {
            this.activateGrabTool();
            button.classList.add('engine__item--active');
        }
    }
}
