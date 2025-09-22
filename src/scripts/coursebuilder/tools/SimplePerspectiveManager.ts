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
    private userZoomLocked: boolean = false; // stop auto-fit after user changes zoom
    private readonly ZOOM_STEP = 0.2; // 20%
    private readonly MIN_ZOOM = 0.2; // 20%
    private readonly MAX_ZOOM = 2.0; // 200%
    // GRAB_THRESHOLD removed - panning now works at any zoom level
    
    // Pan state
    private isPanMode: boolean = false;
    private isPanning: boolean = false;
    private panStart: { x: number; y: number } = { x: 0, y: 0 };
    private panOffset: { x: number; y: number } = { x: 0, y: 0 };
    private gridEnabled: boolean = false;
    
    // Spacebar pan state
    private isSpacebarPressed: boolean = false;
    private isSpacebarPanning: boolean = false;
    private wasToolActiveBeforeSpacebar: string | null = null;
    
    // Middle mouse button pan state
    private isMiddleMousePanning: boolean = false;
    
    // Grid overlay element
    private gridOverlay: HTMLElement | null = null;

    // Bound methods to prevent multiple event listener issues
    private boundKeyboardHandler = this.handleKeyboardShortcuts.bind(this);
    private boundKeyupHandler = this.handleKeyup.bind(this);

    constructor() {
        this.initializePerspective();
        this.bindEvents();
    }

    /**
     * Initialize perspective controls
     */
    private initializePerspective(): void {
        this.canvasContainer = document.getElementById('canvas-container');
        
        // Debug browser and page state
        console.log('🌐 Browser/Page Debug:', {
            devicePixelRatio: window.devicePixelRatio,
            outerWidth: window.outerWidth,
            innerWidth: window.innerWidth,
            visualViewport: window.visualViewport ? {
                width: window.visualViewport.width,
                height: window.visualViewport.height,
                scale: window.visualViewport.scale
            } : 'not supported',
            documentElement: {
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth
            }
        });
        
        if (this.canvasContainer) {
            // Make canvas container focusable for keyboard shortcuts
            this.canvasContainer.setAttribute('tabindex', '0');
            
            // Focus canvas container when clicked to enable keyboard shortcuts
            this.canvasContainer.addEventListener('click', () => {
                this.canvasContainer?.focus();
            });
            
            console.log('🎨 Canvas container found and configured for focus');
        }
        
        if (!this.canvasContainer) {
            console.warn('Canvas container not found for perspective controls');
            return;
        }

        // Find the canvas when it gets mounted
        this.findCanvas();
        
        // Initialize zoom display
        setTimeout(() => this.updateZoomDisplay(), 100); // Small delay to ensure DOM is ready

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
                console.log('🎨 Canvas found and interactions set up:', {
                    canvas: this.canvas.tagName,
                    canvasClass: this.canvas.className,
                    canvasId: this.canvas.id,
                    containerClass: this.canvasContainer.className,
                    containerId: this.canvasContainer.id
                });
                // On first mount, if canvas is wider than its container, fit it down
                setTimeout(() => {
                    try { this.fitToContainer(); } catch {}
                }, 50);
            } else {
                console.log('🔍 Canvas not found yet, retrying in 100ms...');
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

        // Prevent context menu and middle mouse default behavior on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault(); // Prevent middle mouse default behavior
        });
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
        // Bind perspective tool buttons (exclude grid button which is handled by SnapMenu)
        document.querySelectorAll('[data-perspective]:not([data-snap-anchor])').forEach(element => {
            element.addEventListener('click', this.handlePerspectiveAction.bind(this));
        });

        // Remove any existing keyboard listeners to prevent duplicates
        document.removeEventListener('keydown', this.boundKeyboardHandler, true);
        document.removeEventListener('keyup', this.boundKeyupHandler, true);
        
        // Keyboard shortcuts - use bound method to maintain context
        // Use capture phase to intercept before browser default zoom handling
        document.addEventListener('keydown', this.boundKeyboardHandler, { capture: true, passive: false });
        document.addEventListener('keyup', this.boundKeyupHandler, { capture: true, passive: false });
        
        console.log('⌨️ Keyboard shortcuts bound for zoom controls');
        
        // Note: Wheel zoom is bound directly to canvas in setupCanvasInteractions()
        // Refit on window resize if user hasn't adjusted zoom manually
        window.addEventListener('resize', () => {
            if (!this.userZoomLocked) {
                this.fitToContainer();
            }
        });
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
                // Grid button is now handled by SnapMenu system
                // Don't handle it here to avoid conflicts
                console.log('Grid button clicked - handled by SnapMenu system');
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

        // Handle spacebar for temporary pan mode
        if (event.code === 'Space') {
            if (!this.isSpacebarPressed) {
                this.activateSpacebarPan();
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const isCtrlOrCmd = event.ctrlKey || event.metaKey;

        // Handle all possible zoom in shortcuts
        if (isCtrlOrCmd && (
            event.key === '+' || 
            event.key === '=' || 
            event.code === 'NumpadAdd' ||
            event.code === 'Equal' ||
            event.code === 'NumpadEqual'
        )) {
            console.log('🔍 Zoom in shortcut detected');
            event.preventDefault();
            event.stopPropagation();
            this.zoomIn();
            return;
        }

        // Handle all possible zoom out shortcuts
        if (isCtrlOrCmd && (
            event.key === '-' || 
            event.code === 'NumpadSubtract' ||
            event.code === 'Minus'
        )) {
            console.log('🔍 Zoom out shortcut detected');
            event.preventDefault();
            event.stopPropagation();
            this.zoomOut();
            return;
        }

        // Handle reset view shortcut
        if (isCtrlOrCmd && (event.key === '0' || event.code === 'Numpad0' || event.code === 'Digit0')) {
            event.preventDefault();
            event.stopPropagation();
            this.resetView();
            return;
        }

        // Handle grid toggle shortcut
        if (isCtrlOrCmd && event.shiftKey && event.key === 'g') {
            event.preventDefault();
            event.stopPropagation();
            const gridButton = document.querySelector('[data-perspective="grid"]') as HTMLElement;
            if (gridButton) this.toggleGrid(gridButton);
            return;
        }
    }

    /**
     * Handle keyup events (mainly for spacebar release)
     */
    private handleKeyup(event: KeyboardEvent): void {
        // Only handle spacebar release for pan mode
        if (event.code === 'Space' && this.isSpacebarPressed) {
            this.deactivateSpacebarPan();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * Activate temporary spacebar pan mode
     */
    private activateSpacebarPan(): void {
        if (this.isSpacebarPressed) return; // Already active
        
        this.isSpacebarPressed = true;
        
        // Store the currently active tool
        const toolStateManager = (window as any).toolStateManager;
        if (toolStateManager) {
            this.wasToolActiveBeforeSpacebar = toolStateManager.getCurrentTool();
        }
        
        // Temporarily disable drawing events
        const canvasAPI = (window as any).canvasAPI;
        if (canvasAPI && typeof canvasAPI.disableDrawingEvents === 'function') {
            canvasAPI.disableDrawingEvents();
        }
        
        // Change cursor to grab
        this.updateCanvasCursor('grab');
        
        console.log('🖐️ Spacebar pan mode activated');
    }

    /**
     * Deactivate spacebar pan mode and restore previous tool
     */
    private deactivateSpacebarPan(): void {
        if (!this.isSpacebarPressed) return; // Not active
        
        this.isSpacebarPressed = false;
        this.isSpacebarPanning = false;
        
        // Restore cursor
        this.updateCanvasCursor('');
        
        // Re-enable drawing events
        const canvasAPI = (window as any).canvasAPI;
        if (canvasAPI && typeof canvasAPI.enableDrawingEvents === 'function') {
            canvasAPI.enableDrawingEvents();
        }
        
        // Restore the previous tool
        if (this.wasToolActiveBeforeSpacebar) {
            const toolStateManager = (window as any).toolStateManager;
            if (toolStateManager && typeof toolStateManager.setTool === 'function') {
                toolStateManager.setTool(this.wasToolActiveBeforeSpacebar);
            }
            this.wasToolActiveBeforeSpacebar = null;
        }
        
        console.log('🖐️ Spacebar pan mode deactivated');
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
            
            // No constraints - unlimited panning freedom!
            
            this.applyTransform();
        }
        
        // If not zoomed and no Ctrl/Cmd, let normal scroll behavior happen
    }

    /**
     * Zoom in by 20%
     */
    private zoomIn(): void {
        const newZoom = Math.min(this.MAX_ZOOM, this.zoomLevel + this.ZOOM_STEP);
        this.setZoom(newZoom, true);
    }

    /**
     * Zoom out by 20%
     */
    private zoomOut(): void {
        const newZoom = Math.max(this.MIN_ZOOM, this.zoomLevel - this.ZOOM_STEP);
        this.setZoom(newZoom, true);
    }

    /**
     * Set specific zoom level
     */
    public setZoom(newZoom: number, fromUser: boolean = false): void {
        if (newZoom === this.zoomLevel) return;

        this.zoomLevel = newZoom;
        this.applyTransform();
        this.updatePanAvailability();
        this.updateZoomDisplay();
        if (fromUser) this.userZoomLocked = true;

        console.log(`🔍 Zoom: ${Math.round(this.zoomLevel * 100)}%`);
    }

    /**
     * Reset view to 100% zoom and center
     */
    private resetView(): void {
        this.zoomLevel = 1.0;
        this.panOffset = { x: 0, y: 0 };
        this.userZoomLocked = false;
        
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
     * Public: update internal canvas reference after external canvas recreation
     */
    public updateCanvasReference(): void {
        this.findCanvasIfNeeded();
        // Apply a fit once after update as well
        setTimeout(() => { try { this.fitToContainer(); } catch {} }, 60);
    }

    /**
     * Fit the canvas display into its container by reducing zoom when needed (non-destructive).
     * Keeps world units unchanged; only CSS transform scale is adjusted.
     */
    public fitToContainer(padding: number = 24): void {
        if (!this.canvas || !this.canvasContainer) return;
        const cRect = this.canvas.getBoundingClientRect();
        const hostRect = this.canvasContainer.getBoundingClientRect();
        const availW = Math.max(10, hostRect.width - padding * 2);
        const availH = Math.max(10, hostRect.height - padding * 2);
        const scaleW = availW / cRect.width;
        const scaleH = availH / cRect.height;
        const target = Math.min(scaleW, scaleH, 1); // never upscale above 100%
        const clamped = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, target));
        this.setZoom(clamped);
        // Center after fit
        this.panOffset = { x: 0, y: 0 };
        this.applyTransform();
    }

    /**
     * Apply zoom and pan transforms via CSS custom properties (not direct style manipulation)
     */
    private applyTransform(): void {
        if (!this.canvas || !this.canvasContainer) {
            console.warn('🚨 Cannot apply transform - canvas or container missing:', {
                canvas: !!this.canvas,
                canvasContainer: !!this.canvasContainer
            });
            return;
        }

        // Apply transform directly without CSS custom properties
        const transform = `scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
        this.canvas.style.transform = transform;
        
        console.log('🎨 Transform applied:', {
            element: this.canvas.tagName,
            classes: this.canvas.className,
            zoom: this.zoomLevel,
            panX: this.panOffset.x,
            panY: this.panOffset.y,
            transform: transform
        });
        
        // Update container state via BEM modifier classes
        if (this.zoomLevel > 1.0) {
            this.canvasContainer.classList.add('canvas--zoomed');
        } else {
            this.canvasContainer.classList.remove('canvas--zoomed');
        }
        
        // Update grid overlay to match zoom level
        this.updateGridOverlay();
    }

    /**
     * Toggle pan mode (now works at any zoom level)
     */
    private togglePanMode(button: HTMLElement): void {
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
     * Update pan mode availability - now always available
     */
    private updatePanAvailability(): void {
        const grabButton = document.querySelector('[data-perspective="grab"]') as HTMLElement;
        if (!grabButton) return;

        // Pan mode is now always available at any zoom level
        grabButton.style.opacity = '1';
        grabButton.title = 'Pan mode';
    }

    /**
     * Handle mouse down for panning
     */
    private handleMouseDown(event: MouseEvent): void {
        // Handle middle mouse button panning (button 1)
        if (event.button === 1) {
            this.isMiddleMousePanning = true;
            this.isPanning = true;
            this.panStart = { x: event.clientX, y: event.clientY };
            this.updateCanvasCursor('grabbing');
            event.preventDefault();
            return;
        }

        // Handle spacebar pan mode (works at any zoom level)
        if (this.isSpacebarPressed) {
            this.isSpacebarPanning = true;
            this.isPanning = true; // Set this so mouse move works correctly
            this.panStart = { x: event.clientX, y: event.clientY };
            this.updateCanvasCursor('grabbing');
            event.preventDefault();
            return;
        }

        // Handle regular grab tool (now works at any zoom level)
        if (!this.isPanMode) return;

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
        // Handle spacebar panning (requires both spacebar pressed AND mouse dragging)
        if ((this.isSpacebarPanning || this.isMiddleMousePanning) && this.isPanning) {
            const deltaX = (event.clientX - this.panStart.x) / this.zoomLevel;
            const deltaY = (event.clientY - this.panStart.y) / this.zoomLevel;

            this.panOffset.x += deltaX;
            this.panOffset.y += deltaY;

            // No constraints - unlimited panning!

            this.panStart = { x: event.clientX, y: event.clientY };
            this.applyTransform();

            event.preventDefault();
            return;
        }

        // Handle regular grab tool panning
        if (!this.isPanning || !this.isPanMode) return;

        const deltaX = (event.clientX - this.panStart.x) / this.zoomLevel;
        const deltaY = (event.clientY - this.panStart.y) / this.zoomLevel;

        this.panOffset.x += deltaX;
        this.panOffset.y += deltaY;

        // No constraints - unlimited grab tool panning!

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
            
            // If we were middle mouse panning, stop completely
            if (this.isMiddleMousePanning) {
                this.isMiddleMousePanning = false;
                this.updateCanvasCursor('');
            }
            // If we were spacebar panning, stop dragging but maintain spacebar mode
            else if (this.isSpacebarPanning) {
                this.isSpacebarPanning = false; // Stop spacebar panning when mouse released
                this.updateCanvasCursor(this.isSpacebarPressed ? 'grab' : '');
            } else {
                // Regular grab tool - restore appropriate cursor
                this.updateCanvasCursor(this.isPanMode ? 'grab' : '');
            }
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
     * External API: set grid enabled state and synchronize overlay
     */
    public setGridEnabled(enabled: boolean): void {
        this.findCanvasIfNeeded();
        this.gridEnabled = !!enabled;
        this.applyGridStyling();

        // Sync UI button states for both legacy and new snap button
        const legacyBtn = document.querySelector('[data-perspective="grid"]') as HTMLElement | null;
        const snapBtn = document.querySelector('[data-snap="grid"]') as HTMLElement | null;
        if (legacyBtn) legacyBtn.classList.toggle('perspective__item--active', this.gridEnabled);
        if (snapBtn) snapBtn.classList.toggle('perspective__item--active', this.gridEnabled);
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
        if (!this.gridOverlay || !this.canvas || !this.canvasContainer) return;
        
        // Calculate grid size based on zoom level to maintain visual consistency
        const gridSize = Math.max(2, 20 / this.zoomLevel);

        // Position overlay relative to container using accurate DOM geometry
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const top = Math.max(0, canvasRect.top - containerRect.top);
        const left = Math.max(0, canvasRect.left - containerRect.left);
        const width = canvasRect.width;
        const height = canvasRect.height;

        // Style the overlay to match canvas position and size
        this.gridOverlay.style.cssText = `
            position: absolute;
            top: ${top}px;
            left: ${left}px;
            width: ${width}px;
            height: ${height}px;
            pointer-events: none;
            z-index: 10;
            background-image: 
                linear-gradient(rgba(59,130,246,0.35) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59,130,246,0.35) 1px, transparent 1px);
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
        // Try multiple times with slight delays to handle DOM timing issues
        const tryUpdateZoomDisplay = (attempt: number = 1, maxAttempts: number = 3): void => {
            // Debug: log DOM inspection
            const perspectiveContainer = document.querySelector('.engine__perspective');
            const allZoomDisplays = document.querySelectorAll('.zoom-display, .engine__zoom-display');
            
            // Try multiple selectors for backward compatibility
            const zoomDisplay = document.querySelector('.zoom-display, .engine__zoom-display') as HTMLElement;
            
            if (zoomDisplay) {
                const zoomPercent = Math.round(this.zoomLevel * 100);
                zoomDisplay.textContent = `${zoomPercent}%`;
                
                // Update title to show scroll instructions when zoomed
                if (this.zoomLevel > 1.0) {
                    zoomDisplay.title = `Zoomed to ${zoomPercent}% - Mouse wheel scrolls around canvas, Ctrl/Cmd+wheel zooms`;
                } else {
                    zoomDisplay.title = `${zoomPercent} zoom - Ctrl/Cmd+wheel to zoom in`;
                }
                
                console.log(`📊 Zoom display updated: ${zoomPercent}%`);
            } else if (attempt < maxAttempts) {
                // If element not found and we haven't reached max attempts, try again after a short delay
                console.log(`🔍 Zoom display not found (attempt ${attempt}/${maxAttempts}), retrying...`);
                setTimeout(() => tryUpdateZoomDisplay(attempt + 1, maxAttempts), 50);
            } else {
                // Only show debug info and warning on final attempt
                console.log('� DOM Debug:', {
                    perspectiveContainer: !!perspectiveContainer,
                    allZoomDisplays: allZoomDisplays.length,
                    zoomDisplays: Array.from(allZoomDisplays).map(el => ({
                        class: el.className,
                        text: el.textContent,
                        parent: el.parentElement?.className
                    }))
                });
                console.warn('�🚨 Zoom display element not found after multiple attempts (tried .zoom-display, .engine__zoom-display)');
            }
        };
        
        tryUpdateZoomDisplay();
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
        
        // Remove event listeners using the same bound method and options
        document.removeEventListener('keydown', this.boundKeyboardHandler, true);
        document.removeEventListener('keyup', this.boundKeyupHandler, true);
        
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
