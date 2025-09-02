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
        
        console.log(`🔍 High-Quality Zoom: ${Math.round(this.zoomLevel * 100)}%`);
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
     * Apply the zoom and pan transforms to the PIXI stage
     */
    private applyTransform(): void {
        // Use PIXI's built-in scaling and positioning for high quality
        this.stage.scale.set(this.zoomLevel);
        this.stage.position.set(this.panOffset.x, this.panOffset.y);
    }
    
    /**
     * Constrain panning to reasonable bounds
     */
    private constrainPan(): void {
        const maxPanX = (this.zoomLevel - 1) * this.app.screen.width / 2;
        const maxPanY = (this.zoomLevel - 1) * this.app.screen.height / 2;
        
        this.panOffset.x = Math.max(-maxPanX, Math.min(maxPanX, this.panOffset.x));
        this.panOffset.y = Math.max(-maxPanY, Math.min(maxPanY, this.panOffset.y));
    }
    
    /**
     * Convert screen coordinates to world coordinates (accounting for zoom/pan)
     */
    public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        return {
            x: (screenX - this.panOffset.x) / this.zoomLevel,
            y: (screenY - this.panOffset.y) / this.zoomLevel
        };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     */
    public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        return {
            x: worldX * this.zoomLevel + this.panOffset.x,
            y: worldY * this.zoomLevel + this.panOffset.y
        };
    }
    
    /**
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
}
