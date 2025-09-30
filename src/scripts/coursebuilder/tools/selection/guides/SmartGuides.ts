/**
 * Main smart guides system orchestrating all guide modules
 */

import { Container, Rectangle } from 'pixi.js';
import { GuideState, SnapObjectBounds, DistanceLabel, AlignmentGuide } from './types';
import { AlignmentDetector } from './AlignmentDetector';
import { DistanceCalculator } from './DistanceCalculator';
import { SpacingDetector } from './SpacingDetector';
import { GuideRenderer } from './GuideRenderer';
import { GUIDE_LIMITS } from './config';
import { snapManager } from '../../SnapManager';

export class SmartGuides {
  private alignmentDetector: AlignmentDetector;
  private distanceCalculator: DistanceCalculator;
  private spacingDetector: SpacingDetector;
  private renderer: GuideRenderer;
  private state: GuideState;
  private ui: Container | null = null;

  constructor() {
    this.alignmentDetector = new AlignmentDetector();
    this.distanceCalculator = new DistanceCalculator();
    this.spacingDetector = new SpacingDetector();
    this.renderer = new GuideRenderer();
    
    this.state = {
      isActive: false,
      draggedObject: null,
      nearbyObjects: [],
      lastRenderTime: 0,
      showDistanceLabels: false,
      activeGuides: []
    };
  }

  /**
   * Set the UI layer container (required by SelectionTool)
   */
  public setUILayer(container: Container): void {
    this.ui = container;
    this.renderer.initialize(container);
  }

  /**
   * Update guides during object manipulation (required by SelectionTool)
   */
  public update(container: Container, _selectedObjects: any[], draggedBounds: any): void {
    if (!this.ui) return;
    
    // Convert to our internal format
    const draggedObject = this.boundsToSnapObject(draggedBounds);
    const nearbyObjects = this.findNearbyObjects(container, draggedBounds);
    
    this.startGuides(draggedObject, nearbyObjects);
  }

  /**
   * Update resize guides (required by SelectionTool)
   */
  public updateResizeGuides(container: Container, selectedObjects: any[], bounds: any, _mode: string): void {
    // For resize operations, treat similar to regular update
    this.update(container, selectedObjects, bounds);
  }

  /**
   * Clear all guides (required by SelectionTool)
   */
  public clear(): void {
    this.stopGuides();
  }

  /**
   * Handle key down events (required by SelectionTool)
   */
  public handleKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Alt' || evt.key === 'Option') {
      this.setShowDistanceLabels(true);
    }
  }

  /**
   * Handle key up events (required by SelectionTool)
   */
  public handleKeyUp(evt: KeyboardEvent): void {
    if (evt.key === 'Alt' || evt.key === 'Option') {
      this.setShowDistanceLabels(false);
    }
  }

  /**
   * Start showing guides for a dragged object
   */
  public startGuides(
    draggedObject: SnapObjectBounds, 
    nearbyObjects: SnapObjectBounds[]
  ): void {
    this.state.isActive = true;
    this.state.draggedObject = draggedObject;
    this.state.nearbyObjects = nearbyObjects;
    this.updateGuides();
  }

  /**
   * Update guides during drag
   */
  public updateGuides(): void {
    if (!this.state.isActive || !this.state.draggedObject || !this.ui) return;

    const now = performance.now();
    if (now - this.state.lastRenderTime < GUIDE_LIMITS.MIN_RENDER_INTERVAL) {
      return;
    }
    this.state.lastRenderTime = now;

    this.renderer.clear();
    
    // Convert to Rectangle format for compatibility
    const draggedRect = this.convertToRectangle(this.state.draggedObject);
    const nearbyRects = this.state.nearbyObjects.map(obj => this.convertToRectangle(obj));

    // Generate alignment guides
    const alignmentGuides = this.alignmentDetector.generateAlignmentGuides(
      draggedRect,
      nearbyRects,
      this.ui
    );

    // Generate distance labels if Alt/Option is pressed
    const distanceLabels: DistanceLabel[] = this.state.showDistanceLabels
      ? this.distanceCalculator.generateDistanceLabels(
          draggedRect,
          nearbyRects
        )
      : [];

    // Generate equal spacing guides
    const spacingGroups = this.spacingDetector.detectEqualSpacing(
      draggedRect,
      nearbyRects
    );

    // Render all guides
    this.renderer.drawAlignmentGuides(alignmentGuides);
    this.renderer.drawDistanceLabels(distanceLabels);
    this.renderer.drawEqualSpacingGuides(spacingGroups);

    this.state.activeGuides = alignmentGuides;
  }

  /**
   * Convert bounds object to SnapObjectBounds
   */
  private boundsToSnapObject(bounds: any): SnapObjectBounds {
    return {
      x: bounds.x || 0,
      y: bounds.y || 0,
      width: bounds.width || 0,
      height: bounds.height || 0,
      centerX: (bounds.x || 0) + (bounds.width || 0) / 2,
      centerY: (bounds.y || 0) + (bounds.height || 0) / 2
    };
  }

  /**
   * Find nearby objects for guide calculations using SnapManager
   */
  private findNearbyObjects(container: Container, draggedBounds: any): SnapObjectBounds[] {
    const objects: SnapObjectBounds[] = [];
    
    if (!snapManager.isSmartEnabled()) {
      return objects;
    }

    // Use SnapManager to get object snap lines and bounds  
    snapManager.getCandidates({ 
      container,
      rect: new Rectangle(draggedBounds.x, draggedBounds.y, draggedBounds.width, draggedBounds.height),
      margin: 200 // Look for objects within 200px
    });

    // Get the DisplayObjectManager to access actual objects
    const dom = (window as any)._displayManager as { getObjects?: () => any[] } | undefined;
    const objectList = dom?.getObjects?.() || [];

    for (const obj of objectList) {
      if (!obj?.getBounds || obj.visible === false) continue;
      
      try {
        const bounds = obj.getBounds();
        
        // Skip the dragged object itself (rough bounds check)
        if (Math.abs(bounds.x - draggedBounds.x) < 1 && 
            Math.abs(bounds.y - draggedBounds.y) < 1 &&
            Math.abs(bounds.width - draggedBounds.width) < 1 &&
            Math.abs(bounds.height - draggedBounds.height) < 1) {
          continue;
        }

        // Convert to SnapObjectBounds format
        objects.push({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          centerX: bounds.x + bounds.width / 2,
          centerY: bounds.y + bounds.height / 2
        });
      } catch (e) {
        // Skip objects that can't provide bounds
        continue;
      }
    }
    
    return objects;
  }

  /**
   * Apply magnetic snapping based on active guides
   */
  public applyMagneticSnapping(position: { x: number; y: number }): { x: number; y: number } {
    // For now, return position unchanged - magnetic snapping would require SnapManager integration
    return position;
  }

  /**
   * Set distance label visibility (Alt/Option key state)
   */
  public setShowDistanceLabels(show: boolean): void {
    if (this.state.showDistanceLabels !== show) {
      this.state.showDistanceLabels = show;
      if (this.state.isActive) {
        this.updateGuides();
      }
    }
  }

  /**
   * Stop showing guides
   */
  public stopGuides(): void {
    this.state.isActive = false;
    this.state.draggedObject = null;
    this.state.nearbyObjects = [];
    this.state.activeGuides = [];
    this.renderer.clear();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopGuides();
    this.renderer.clear();
  }

  /**
   * Check if guides are currently active
   */
  public get isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get current alignment guides for external use
   */
  public getActiveGuides(): AlignmentGuide[] {
    return this.state.activeGuides;
  }

  /**
   * Convert SnapObjectBounds to PIXI Rectangle for compatibility
   */
  private convertToRectangle(bounds: SnapObjectBounds): Rectangle {
    return new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }
}