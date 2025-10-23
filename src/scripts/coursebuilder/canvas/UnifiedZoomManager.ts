/**
 * UnifiedZoomManager - Manages zoom across all canvases simultaneously
 * 
 * Responsibilities:
 * - Coordinate zoom levels across all active canvases
 * - Provide unified zoom controls (wheel, keyboard shortcuts)
 * - Maintain consistent zoom state across canvas switches
 * - Handle zoom-to-fit functionality for all canvases
 * 
 * Target: ~200 lines
 */

import { Application } from 'pixi.js';
import { HighQualityZoom } from './HighQualityZoom';

export interface UnifiedZoomConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  smoothZoom: boolean;
}

export class UnifiedZoomManager {
  private zoomLevel: number = 1.0;
  private config: UnifiedZoomConfig;
  private canvasZoomManagers: Map<string, HighQualityZoom> = new Map();
  private activeCanvasId: string | null = null;
  private isInitialized: boolean = false;
  
  // Event handlers for cleanup
  private wheelHandler: ((event: WheelEvent) => void) | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Callback for zoom changes
  private onZoomChangeCallback: ((zoom: number) => void) | null = null;

  constructor(config: Partial<UnifiedZoomConfig> = {}) {
    this.config = {
      minZoom: 0.1,  // 10% minimum zoom
      maxZoom: 5.0,  // 500% maximum zoom
      zoomStep: 0.2,
      smoothZoom: true,
      ...config
    };
  }

  /**
   * Initialize the unified zoom manager
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.warn('⚠️ UnifiedZoomManager already initialized');
      return;
    }

    this.setupGlobalEventHandlers();
    this.isInitialized = true;
    console.log('🎯 UnifiedZoomManager initialized');
  }

  /**
   * Register a canvas with its zoom manager
   */
  public registerCanvas(canvasId: string, _app: Application, zoomManager: HighQualityZoom): void {
    this.canvasZoomManagers.set(canvasId, zoomManager);
    
    // Set initial zoom level
    zoomManager.setZoom(this.zoomLevel);
    
    console.log(`🎯 Registered canvas ${canvasId} with unified zoom`);
  }

  /**
   * Unregister a canvas
   */
  public unregisterCanvas(canvasId: string): void {
    this.canvasZoomManagers.delete(canvasId);
    console.log(`🎯 Unregistered canvas ${canvasId} from unified zoom`);
  }

  /**
   * Set the active canvas (for zoom center calculations)
   */
  public setActiveCanvas(canvasId: string): void {
    this.activeCanvasId = canvasId;
  }

  /**
   * Set callback for zoom changes
   */
  public setOnZoomChange(callback: (zoom: number) => void): void {
    this.onZoomChangeCallback = callback;
  }

  /**
   * Set zoom level for all canvases
   */
  public setZoom(zoom: number, centerX?: number, centerY?: number): void {
    const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
    
    if (clampedZoom === this.zoomLevel) return;
    
    this.zoomLevel = clampedZoom;
    
    // Apply zoom to all registered canvases
    this.canvasZoomManagers.forEach((zoomManager, canvasId) => {
      try {
        zoomManager.setZoom(clampedZoom, centerX, centerY);
      } catch (error) {
        console.warn(`⚠️ Failed to set zoom for canvas ${canvasId}:`, error);
      }
    });
    
    // Notify about zoom change for spacing updates
    if (this.onZoomChangeCallback) {
      this.onZoomChangeCallback(this.zoomLevel);
    }
    
    console.log(`🎯 Unified zoom set to ${(clampedZoom * 100).toFixed(1)}% across ${this.canvasZoomManagers.size} canvases`);
  }

  /**
   * Zoom in by one step
   */
  public zoomIn(centerX?: number, centerY?: number): void {
    const newZoom = this.zoomLevel + this.config.zoomStep;
    this.setZoom(newZoom, centerX, centerY);
  }

  /**
   * Zoom out by one step
   */
  public zoomOut(centerX?: number, centerY?: number): void {
    const newZoom = this.zoomLevel - this.config.zoomStep;
    this.setZoom(newZoom, centerX, centerY);
  }

  /**
   * Reset zoom to fit-to-viewport
   */
  public resetZoom(): void {
    // Calculate fit-to-viewport zoom based on active canvas
    const activeZoomManager = this.activeCanvasId ? this.canvasZoomManagers.get(this.activeCanvasId) : null;
    if (activeZoomManager) {
      // Use the active canvas's fit-to-view calculation
      const fitZoom = this.calculateFitToViewZoom(activeZoomManager);
      this.setZoom(fitZoom);
    } else {
      // Default to 100% if no active canvas
      this.setZoom(1.0);
    }
  }

  /**
   * Calculate fit-to-view zoom level
   */
  private calculateFitToViewZoom(_zoomManager: HighQualityZoom): number {
    // This would need to be implemented based on the HighQualityZoom's fit-to-view logic
    // For now, return a reasonable default
    return 0.5; // 50% zoom to fit
  }

  /**
   * Get current zoom level
   */
  public getZoomLevel(): number {
    return this.zoomLevel;
  }

  /**
   * Setup global event handlers for unified zoom
   */
  private setupGlobalEventHandlers(): void {
    // Wheel event handler
    this.wheelHandler = (event: WheelEvent) => {
      // Only handle wheel events on canvas elements
      const target = event.target as HTMLElement;
      if (!target || !target.closest('canvas')) {
        return;
      }

      // Check if this is a zoom event (Ctrl/Cmd + wheel)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? -this.config.zoomStep : this.config.zoomStep;
        const newZoom = this.zoomLevel + delta;
        this.setZoom(newZoom, event.clientX, event.clientY);
      }
    };

    // Keyboard event handler
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            this.zoomIn();
            break;
          case '-':
            event.preventDefault();
            this.zoomOut();
            break;
          case '0':
            event.preventDefault();
            this.resetZoom();
            break;
        }
      }
    };

    // Add event listeners
    document.addEventListener('wheel', this.wheelHandler, { passive: false });
    document.addEventListener('keydown', this.keyHandler);

    console.log('🎯 Global zoom event handlers set up');
  }

  /**
   * Handle wheel event from a specific canvas
   */
  public handleWheel(event: WheelEvent, clientX: number, clientY: number): boolean {
    // Check if this is a zoom event (Ctrl/Cmd + wheel)
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? -this.config.zoomStep : this.config.zoomStep;
      const newZoom = this.zoomLevel + delta;
      this.setZoom(newZoom, clientX, clientY);
      
      return true; // Event handled
    }
    
    return false; // Event not handled
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      initialized: this.isInitialized,
      zoomLevel: this.zoomLevel,
      activeCanvasId: this.activeCanvasId,
      registeredCanvases: Array.from(this.canvasZoomManagers.keys()),
      config: this.config
    };
  }

  /**
   * Destroy the unified zoom manager
   */
  public destroy(): void {
    // Remove event listeners
    if (this.wheelHandler) {
      document.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Clear canvas references
    this.canvasZoomManagers.clear();
    
    // Reset state
    this.isInitialized = false;
    this.activeCanvasId = null;
    this.zoomLevel = 1.0;
    
    console.log('🎯 UnifiedZoomManager destroyed');
  }
}
