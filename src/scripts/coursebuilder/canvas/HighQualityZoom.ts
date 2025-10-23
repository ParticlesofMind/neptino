/**
 * High-Quality Zoom System
 * Implements proper PIXI-based zoom that maintains graphics quality at all zoom levels
 */

import { Application, Container } from 'pixi.js';
import { calculateFitZoom } from '../utils/canvasSizing';

export interface ZoomConfig {
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    smoothZoom: boolean;
}

export class HighQualityZoom {
    private app: Application;
    private stage: Container;
    private zoomLevel: number; // Will be set to fit-to-view zoom in constructor
    private config: ZoomConfig;
    private canvasElement: HTMLCanvasElement | null = null;
    private perspectiveButtons: HTMLElement[] = [];
    private perspectiveHandlers: Array<{ element: HTMLElement; handler: (event: Event) => void }> = [];
    private canvasWheelHandler: ((event: WheelEvent) => void) | null = null;
    private spacebarHandlers: {
        keyDown: (event: KeyboardEvent) => void;
        keyUp: (event: KeyboardEvent) => void;
        mouseDown: (event: MouseEvent) => void;
        mouseMove: (event: MouseEvent) => void;
        mouseUp: (event: MouseEvent) => void;
    } | null = null;
    private spacebarCursorBackup: string = '';
    private zoomCommandHandler: ((command: 'zoom-in' | 'zoom-out' | 'reset') => void) | null = null;
    
    // Pan offset for the zoomed view
    private panOffset: { x: number; y: number } = { x: 0, y: 0 };
    
    // Spacebar panning state
    private isSpacePressed: boolean = false;
    private isSpacePanning: boolean = false;
    
    constructor(app: Application, config: Partial<ZoomConfig> = {}) {
        this.app = app;
        this.stage = app.stage;
        
        this.config = {
            minZoom: 0.25, // 25% minimum zoom
            maxZoom: 5.0,  // 500% maximum zoom
            zoomStep: 0.2,
            smoothZoom: true,
            ...config
        };
        
        // Calculate initial zoom to fit canvas with borders visible (this becomes our "100%" zoom)
        this.zoomLevel = this.calculateFitToViewZoom();
        
        // Bind perspective tool events
        this.bindPerspectiveEvents();
    }
    
    /**
     * Calculate zoom level to fit the canvas with borders visible
     * This becomes our default "100%" zoom
     */
    private calculateFitToViewZoom(): number {
        const containerWidth = this.app.screen.width;
        const containerHeight = this.app.screen.height;
        
        // Use the existing calculateFitZoom function with appropriate padding
        // This will show the artboard (canvas content area) with borders visible
        const baseFitZoom = calculateFitZoom(containerWidth, containerHeight, 40); // 40px padding for better visibility
        
        // Zoom out a moderate amount by reducing the fit zoom by 35%
        // This creates good padding around the canvas without being too far
        const zoomedOutFitZoom = baseFitZoom * 0.65;
        
        console.log(`🎯 Calculated fit-to-view zoom: ${baseFitZoom.toFixed(3)} -> zoomed out: ${zoomedOutFitZoom.toFixed(3)} for container ${containerWidth}x${containerHeight}`);
        
        return zoomedOutFitZoom;
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
        if (centerX !== undefined && centerY !== undefined) {
            // Zoom around specific point (mouse position)
            this.setZoom(this.zoomLevel + this.config.zoomStep, centerX, centerY);
        } else {
            // Zoom and re-center (for toolbar button clicks)
            this.setZoom(this.zoomLevel + this.config.zoomStep);
            this.recenterCanvas();
        }
    }
    
    /**
     * Zoom out by one step
     */
    public zoomOut(centerX?: number, centerY?: number): void {
        if (centerX !== undefined && centerY !== undefined) {
            // Zoom around specific point (mouse position)
            this.setZoom(this.zoomLevel - this.config.zoomStep, centerX, centerY);
        } else {
            // Zoom and re-center (for toolbar button clicks)
            this.setZoom(this.zoomLevel - this.config.zoomStep);
            this.recenterCanvas();
        }
    }
    
    /**
     * Reset zoom to 100% (fit-to-view) and center the view
     */
    public resetZoom(): void {
        this.zoomLevel = this.calculateFitToViewZoom(); // 100% = fit-to-view zoom
        this.panOffset = this.calculateCenteredPanOffset();
        this.applyTransform();
    }

    /**
     * Calculate pan offset to center the canvas at current zoom level
     */
    private calculateCenteredPanOffset(): { x: number, y: number } {
        const app = this.app;
        const containerWidth = app.screen.width;
        const containerHeight = app.screen.height;
        
        // Canvas dimensions
        const canvasWidth = 1200;
        const canvasHeight = 1800;
        
        // At current zoom level, calculate the effective canvas size
        const effectiveCanvasWidth = canvasWidth * this.zoomLevel;
        const effectiveCanvasHeight = canvasHeight * this.zoomLevel;
        
        // Calculate true centering with smaller, more reasonable offsets
        const baseCenterX = (containerWidth - effectiveCanvasWidth) / 2;
        const baseCenterY = (containerHeight - effectiveCanvasHeight) / 2;
        
        // Much smaller offsets for fine-tuning, not dramatic repositioning
        const rightOffset = 0;  // Reduced from 150 - just a subtle shift right
        const downOffset = -300;   // Reduced from 50 - just account for top toolbar
        
        return { 
            x: baseCenterX + rightOffset, 
            y: baseCenterY + downOffset 
        };
    }

    /**
     * Re-center the canvas at the current zoom level
     */
    private recenterCanvas(): void {
        this.panOffset = this.calculateCenteredPanOffset();
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
        const containerWidth = this.app.screen.width;
        const containerHeight = this.app.screen.height;
        
        // Calculate the effective canvas size at current zoom
        const effectiveCanvasWidth = 1200 * this.zoomLevel;
        const effectiveCanvasHeight = 1800 * this.zoomLevel;
        
        // For very zoomed out views (smaller than container), allow more freedom but prevent going too far
        if (effectiveCanvasWidth < containerWidth && effectiveCanvasHeight < containerHeight) {
            // Allow some movement but keep the canvas reasonably visible
            const maxOffsetX = containerWidth * 0.3; // Allow 30% of container width offset
            const maxOffsetY = containerHeight * 0.3; // Allow 30% of container height offset
            
            this.panOffset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.panOffset.x));
            this.panOffset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.panOffset.y));
            return;
        }
        
        // For zoomed-in views, constrain to prevent losing the canvas entirely
        const overflowX = Math.max(0, (effectiveCanvasWidth - containerWidth) / 2);
        const overflowY = Math.max(0, (effectiveCanvasHeight - containerHeight) / 2);
        
        // Allow panning within reasonable bounds
        const maxPanX = overflowX + containerWidth * 0.2; // Extra 20% tolerance
        const maxPanY = overflowY + containerHeight * 0.2; // Extra 20% tolerance
        
        this.panOffset.x = Math.max(-maxPanX, Math.min(maxPanX, this.panOffset.x));
        this.panOffset.y = Math.max(-maxPanY, Math.min(maxPanY, this.panOffset.y));
    }
    
    /**
     * Update zoom display indicator in the UI
     */
    private updateZoomDisplay(): void {
        // Try to find and update the zoom display element
        const zoomDisplay = document.querySelector('.engine__perspective-zoom') as HTMLElement;
        
        if (zoomDisplay) {
            // Convert internal zoom level to display percentage
            // Fit-to-view zoom = 100% display, proportional scaling for other levels
            const fitToViewZoom = this.calculateFitToViewZoom();
            const displayPercent = Math.round((this.zoomLevel / fitToViewZoom) * 100);
            zoomDisplay.textContent = `${displayPercent}%`;
            
            // Update title with helpful information
            if (this.zoomLevel > fitToViewZoom) {
                zoomDisplay.title = `Zoomed to ${displayPercent}% - Mouse wheel scrolls around canvas, Ctrl/Cmd+wheel zooms`;
            } else {
                zoomDisplay.title = `${displayPercent}% zoom - Ctrl/Cmd+wheel to zoom in`;
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
        
        // Handle pan when zoomed above fit-to-view level (above "100%")
        const fitToViewZoom = this.calculateFitToViewZoom();
        if (this.zoomLevel > fitToViewZoom) {
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
     * Public method to re-center the canvas at current zoom level
     */
    public centerCanvas(): void {
        this.recenterCanvas();
        console.log('🎯 Canvas re-centered at current zoom level');
    }

    /**
     * Grab tool activation state
     */
    private isGrabToolActive: boolean = false;
    private grabKeyHandler: ((event: KeyboardEvent) => void) | null = null;
    private grabKeyUpHandler: ((event: KeyboardEvent) => void) | null = null;
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
        this.grabKeyUpHandler = keyUpHandler;
        
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

        if (this.grabKeyUpHandler) {
            document.removeEventListener('keyup', this.grabKeyUpHandler);
            this.grabKeyUpHandler = null;
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
        const buttons = Array.from(document.querySelectorAll('[data-perspective]:not([data-snap-anchor])')) as HTMLElement[];
        buttons.forEach(button => {
            const handler = (event: Event) => {
                event.preventDefault();
                const target = event.currentTarget as HTMLElement;
                const action = target.getAttribute('data-perspective');

                switch (action) {
                    case 'zoom-in':
                        if (this.zoomCommandHandler) {
                            this.zoomCommandHandler('zoom-in');
                        } else {
                            this.zoomIn();
                        }
                        break;
                    case 'zoom-out':
                        if (this.zoomCommandHandler) {
                            this.zoomCommandHandler('zoom-out');
                        } else {
                            this.zoomOut();
                        }
                        break;
                    case 'reset':
                        if (this.zoomCommandHandler) {
                            this.zoomCommandHandler('reset');
                        } else {
                            this.resetView();
                        }
                        break;
                    case 'grab':
                        this.toggleGrabTool(target);
                        break;
                    default:
                        console.warn('Unknown perspective action:', action);
                }
            };

            button.addEventListener('click', handler);
            this.perspectiveButtons.push(button);
            this.perspectiveHandlers.push({ element: button, handler });
        });

        this.canvasElement = this.app.view as HTMLCanvasElement;

        // Handle global spacebar + mouse drag panning
        this.bindSpacebarPanning();
    }

    /**
     * Allow external controllers to handle zoom commands (e.g., unified zoom manager)
     */
    public setZoomCommandHandler(handler: ((command: 'zoom-in' | 'zoom-out' | 'reset') => void) | null): void {
        this.zoomCommandHandler = handler;
    }

    /**
     * Bind spacebar + mouse drag panning functionality
     */
    private bindSpacebarPanning(): void {
        let panStart = { x: 0, y: 0 };
        this.spacebarCursorBackup = '';

        const keyDownHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space' && !event.repeat) {
                // Don't prevent spacebar default behavior when typing in form inputs
                const activeElement = document.activeElement;
                const isFormInput = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.tagName === 'SELECT' ||
                    (activeElement as HTMLElement).isContentEditable
                );
                
                if (!isFormInput) {
                    // Prevent spacebar from scrolling the page when not in form inputs
                    event.preventDefault();
                }
                
                if (!this.isSpacePressed) {
                    this.isSpacePressed = true;
                    // Store original cursor and change to grab
                    this.spacebarCursorBackup = document.body.style.cursor;
                    document.body.style.cursor = 'grab';
                }
            }
        };

        const keyUpHandler = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                this.isSpacePressed = false;
                this.isSpacePanning = false;
                // Restore original cursor
                document.body.style.cursor = this.spacebarCursorBackup;
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
                document.body.style.cursor = this.isSpacePressed ? 'grab' : this.spacebarCursorBackup;
            }
        };

        // Add event listeners
        document.addEventListener('keydown', keyDownHandler, { capture: true });
        document.addEventListener('keyup', keyUpHandler, { capture: true });
        document.addEventListener('mousedown', mouseDownHandler, { capture: true });
        document.addEventListener('mousemove', mouseMoveHandler, { capture: true });
        document.addEventListener('mouseup', mouseUpHandler, { capture: true });

        this.spacebarHandlers = {
            keyDown: keyDownHandler,
            keyUp: keyUpHandler,
            mouseDown: mouseDownHandler,
            mouseMove: mouseMoveHandler,
            mouseUp: mouseUpHandler
        };

        console.log('🎯 Spacebar + mouse drag panning enabled');
    }



    /**
     * Reset zoom and pan to defaults
     */
    private resetView(): void {
        this.zoomLevel = this.calculateFitToViewZoom(); // 100% = fit-to-view zoom
        this.panOffset = this.calculateCenteredPanOffset();
        this.applyTransform();
        console.log('🔍 View reset to 100% (fit-to-view zoom)');
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
            button.classList.remove('engine__perspective-item--active');
        } else {
            this.activateGrabTool();
            button.classList.add('engine__perspective-item--active');
        }
    }

    /**
     * Clean up all listeners and state for this zoom manager instance
     */
    public destroy(): void {
        // Remove perspective button handlers
        this.perspectiveHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.perspectiveButtons.forEach(button => {
            if (button.getAttribute('data-perspective') === 'grab') {
                button.classList.remove('engine__perspective-item--active');
            }
        });
        this.perspectiveHandlers = [];
        this.perspectiveButtons = [];

        // Remove canvas wheel handler
        if (this.canvasElement && this.canvasWheelHandler) {
            this.canvasElement.removeEventListener('wheel', this.canvasWheelHandler);
        }
        this.canvasWheelHandler = null;
        this.canvasElement = null;

        // Remove spacebar-based handlers
        if (this.spacebarHandlers) {
            document.removeEventListener('keydown', this.spacebarHandlers.keyDown, true);
            document.removeEventListener('keyup', this.spacebarHandlers.keyUp, true);
            document.removeEventListener('mousedown', this.spacebarHandlers.mouseDown, true);
            document.removeEventListener('mousemove', this.spacebarHandlers.mouseMove, true);
            document.removeEventListener('mouseup', this.spacebarHandlers.mouseUp, true);
            this.spacebarHandlers = null;
        }

        // Reset cursor state if we were mid-pan
        if (this.isSpacePressed || this.isSpacePanning) {
            document.body.style.cursor = this.spacebarCursorBackup || '';
        }

        this.isSpacePressed = false;
        this.isSpacePanning = false;

        // Ensure grab tool listeners are removed
        if (this.isGrabToolActive) {
            this.deactivateGrabTool();
        } else {
            if (this.grabKeyHandler) {
                document.removeEventListener('keydown', this.grabKeyHandler);
                this.grabKeyHandler = null;
            }
            if (this.grabKeyUpHandler) {
                document.removeEventListener('keyup', this.grabKeyUpHandler);
                this.grabKeyUpHandler = null;
            }
            if (this.grabMouseHandler) {
                document.removeEventListener('mousemove', this.grabMouseHandler);
                this.grabMouseHandler = null;
            }
        }

        // Restore cursor if grab was active
        document.body.style.cursor = this.spacebarCursorBackup || '';
        this.zoomCommandHandler = null;
    }
}
