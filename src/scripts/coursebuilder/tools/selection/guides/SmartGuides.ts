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
import { snapManager } from './SnapManager';

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
      activeGuides: [],
      referenceMode: 'canvas',
      suppressed: false
    };
  }

  /**
   * Set the UI layer container (required by SelectionTool)
   */
  public setUILayer(container: Container): void {
    this.ui = container;
    this.renderer.initialize(container);
    const prefs = snapManager.getPrefs();
    this.renderer.setTheme(prefs.theme || 'auto');
  }

  /**
   * Update guides during object manipulation (required by SelectionTool)
   */
  public update(container: Container, _selectedObjects: any[], draggedBounds: any): void {
    if (!this.ui) {
      console.warn('⚠️ SmartGuides UI layer not set');
      return;
    }

    if (this.state.suppressed || snapManager.isTemporarilyDisabled()) {
      if (this.state.isActive) {
        this.clear();
      }
      return;
    }
    
    // Get current reference mode from SnapManager
    const prefs = snapManager.getPrefs();
    this.renderer.setTheme(prefs.theme || 'auto');
    const referenceMode = prefs.referenceMode || 'canvas';
    
    // Always render grid first if "Show Grid" is enabled (independent of reference mode)
    if (prefs.showGrid) {
      this.renderGrid(prefs.gridSpacing || 20, prefs.gridStyle, prefs.theme);
    }
    
    // Handle different reference modes
    switch (referenceMode) {
      case 'canvas':
        this.handleCanvasReference(container, draggedBounds);
        break;
      case 'object':
        this.handleObjectReference(container, draggedBounds);
        break;
      case 'grid':
        this.handleGridReference(container, draggedBounds);
        break;
      default:
        console.warn('⚠️ Unknown reference mode:', referenceMode);
        this.handleCanvasReference(container, draggedBounds); // fallback
    }
  }

  /**
   * Handle Canvas Reference mode - guides extend across entire canvas
   */
  private handleCanvasReference(container: Container, draggedBounds: any): void {
    const draggedObject = this.boundsToSnapObject(draggedBounds);
    const nearbyObjects = this.findNearbyObjects(container, draggedBounds);
    
    // In canvas mode, we show both object-to-object and canvas alignment guides
    // with full canvas extension
    this.startGuides(draggedObject, nearbyObjects, 'canvas');
  }

  /**
   * Handle Object Reference mode - guides limited to objects being aligned
   */
  private handleObjectReference(container: Container, draggedBounds: any): void {
    const draggedObject = this.boundsToSnapObject(draggedBounds);
    const nearbyObjects = this.findNearbyObjects(container, draggedBounds);
    
    // In object mode, we only show object-to-object guides with limited extension
    this.startGuides(draggedObject, nearbyObjects, 'object');
  }

  /**
   * Handle Grid Reference mode - snap to grid without guide lines
   */
  // eslint-disable-next-line no-unused-vars
  private handleGridReference(_container: Container, _draggedBounds: any): void {
    console.log('📐 Grid Reference mode - snap to grid positions');
    
    // In grid mode, we don't show alignment guides, just the grid (which is handled globally)
    // Grid snapping is handled by SnapManager.snapPoint(), not visual guides
    // The grid itself is rendered globally when showGrid is enabled
    
    // Clear any existing alignment guides since we don't show lines in grid mode
    this.clear();
  }

  /**
   * Render grid overlay
   */
  private renderGrid(
    spacing?: number,
    style?: 'dots' | 'lines' | 'hybrid',
    theme?: 'auto' | 'light' | 'dark'
  ): void {
    if (!this.ui) return;

    const prefs = snapManager.getPrefs();
    const effectiveSpacing = spacing ?? prefs.gridSpacing ?? 20;
    const effectiveStyle = style ?? prefs.gridStyle ?? 'dots';
    const effectiveTheme = theme ?? prefs.theme ?? 'auto';

    // Get canvas dimensions
    const candidateResult = snapManager.getCandidates();
    const dims = candidateResult.dims;

    this.renderer.renderGrid(
      this.ui,
      dims.width,
      dims.height,
      effectiveSpacing,
      effectiveStyle,
      effectiveTheme
    );
  }

  /**
   * Update resize guides (required by SelectionTool)
   */
  // eslint-disable-next-line no-unused-vars
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
   * Show or hide the grid based on current settings
   */
  public updateGrid(): void {
    if (!this.ui) return;
    
    const prefs = snapManager.getPrefs();
    
    if (prefs.showGrid) {
      this.renderGrid(prefs.gridSpacing || 20);
    } else {
      // Clear only the grid, don't touch other guides
      this.renderer.clearGrid();
    }
  }

  /**
   * Handle key down events (required by SelectionTool)
   */
  public handleKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Alt' || evt.key === 'Option') {
      this.setShowDistanceLabels(true);
    }

    if (evt.key === 'Control' || evt.key === 'Meta' || evt.ctrlKey || evt.metaKey) {
      this.setSuppressed(true);
    }
  }

  /**
   * Handle key up events (required by SelectionTool)
   */
  public handleKeyUp(evt: KeyboardEvent): void {
    if (evt.key === 'Alt' || evt.key === 'Option') {
      this.setShowDistanceLabels(false);
    }

    if (evt.key === 'Control' || evt.key === 'Meta' || (!evt.ctrlKey && !evt.metaKey)) {
      this.setSuppressed(false);
    }
  }

  /**
   * Start showing guides for a dragged object
   */
  public startGuides(
    draggedObject: SnapObjectBounds, 
    nearbyObjects: SnapObjectBounds[],
    referenceMode: 'canvas' | 'object' | 'grid' = 'canvas'
  ): void {
    this.state.isActive = true;
    this.state.draggedObject = draggedObject;
    this.state.nearbyObjects = nearbyObjects;
    this.state.referenceMode = referenceMode;
    
    this.updateGuides();
  }

  /**
   * Update guides during drag
   */
  public updateGuides(): void {
    if (!this.state.isActive || !this.state.draggedObject || !this.ui) {
      return;
    }

    const now = performance.now();
    if (now - this.state.lastRenderTime < GUIDE_LIMITS.MIN_RENDER_INTERVAL) {
      return;
    }
    this.state.lastRenderTime = now;
    this.renderer.clear();
    
    const referenceMode = this.state.referenceMode || 'canvas';
    
    // Convert to Rectangle format for compatibility
    const draggedRect = this.convertToRectangle(this.state.draggedObject);
    const nearbyRects = this.state.nearbyObjects.map(obj => this.convertToRectangle(obj));
    // Generate guides based on reference mode
    let alignmentGuides: AlignmentGuide[] = [];
    
    switch (referenceMode) {
      case 'canvas':
        // Canvas mode: Show both object and canvas guides with full extension
        alignmentGuides = this.alignmentDetector.generateAlignmentGuides(
          draggedRect,
          nearbyRects,
          this.ui,
          'canvas'
        );
        break;
        
      case 'object':
        // Object mode: Only object-to-object guides with limited extension
        alignmentGuides = this.alignmentDetector.generateObjectOnlyGuides(
          draggedRect,
          nearbyRects,
          'object'
        );
        break;
        
      case 'grid': {
        // Grid mode: No guides, just grid if enabled
        const prefs = snapManager.getPrefs();
        if (prefs.showGrid) {
          this.renderGrid(prefs.gridSpacing, prefs.gridStyle, prefs.theme);
        }
        return; // Exit early, no other guides needed
      }
    }

    // Generate distance labels if Alt/Option is pressed (not for grid mode)
    const distanceLabels: DistanceLabel[] = this.state.showDistanceLabels
      ? this.distanceCalculator.generateDistanceLabels(
          draggedRect,
          nearbyRects
        )
      : [];

    // Generate equal spacing guides (not for grid mode)
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

    try {
      // Try to get objects from DisplayObjectManager first
      const dom = (window as any)._displayManager as { getObjects?: () => any[] } | undefined;
      let objectList = dom?.getObjects?.() || [];
      
      // Fallback: try to get objects from container children
      if (objectList.length === 0) {
        objectList = this.getObjectsFromContainer(container);
      }

      for (const obj of objectList) {
        if (!obj?.getBounds || obj.visible === false) continue;
        
        try {
          const bounds = obj.getBounds();
          
          // Skip the dragged object itself (with some tolerance for floating point precision)
          if (this.isSameObject(bounds, draggedBounds)) {
            continue;
          }

          // Convert to SnapObjectBounds format
          const snapObj = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            centerX: bounds.x + bounds.width / 2,
            centerY: bounds.y + bounds.height / 2
          };
          
          objects.push(snapObj);
        } catch (e) {
          // Skip objects that can't provide bounds
          continue;
        }
      }
    } catch (error) {
      console.error('❌ Error in findNearbyObjects:', error);
    }

    const MAX_OBJECTS = 12;
    const detectionRadius = 300;
    const targetCenterX = draggedBounds.x + draggedBounds.width / 2;
    const targetCenterY = draggedBounds.y + draggedBounds.height / 2;

    const scored = objects
      .filter(obj => {
        const dx = obj.centerX - targetCenterX;
        const dy = obj.centerY - targetCenterY;
        return Math.hypot(dx, dy) <= detectionRadius;
      })
      .map(obj => {
        const dx = obj.centerX - targetCenterX;
        const dy = obj.centerY - targetCenterY;
        const distance = Math.hypot(dx, dy);
        const widthRatio = obj.width > 0 && draggedBounds.width > 0
          ? Math.max(obj.width / draggedBounds.width, draggedBounds.width / obj.width)
          : 1;
        const heightRatio = obj.height > 0 && draggedBounds.height > 0
          ? Math.max(obj.height / draggedBounds.height, draggedBounds.height / obj.height)
          : 1;
        const sizePenalty = Math.max(widthRatio, heightRatio);
        const score = distance * sizePenalty;
        return { obj, score };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_OBJECTS)
      .map(entry => entry.obj);

    return scored;
  }

  /**
   * Get objects from container hierarchy (fallback method)
   */
  private getObjectsFromContainer(container: Container): any[] {
    const objects: any[] = [];
    
    const traverseContainer = (cont: Container) => {
      for (const child of cont.children) {
        if (child.visible && typeof child.getBounds === 'function' && 
            (child as any).__toolType !== 'ui' && // Skip UI elements
            !(child as any).__isGuide) { // Skip guide graphics
          objects.push(child);
        }
        
        // Recursively check child containers
        if (child instanceof Container) {
          traverseContainer(child);
        }
      }
    };
    
    traverseContainer(container);
    return objects;
  }

  /**
   * Check if two bounds represent the same object
   */
  private isSameObject(bounds1: any, bounds2: any): boolean {
    const tolerance = 2; // Allow some tolerance for floating point precision
    return Math.abs(bounds1.x - bounds2.x) < tolerance && 
           Math.abs(bounds1.y - bounds2.y) < tolerance &&
           Math.abs(bounds1.width - bounds2.width) < tolerance &&
           Math.abs(bounds1.height - bounds2.height) < tolerance;
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

  private setSuppressed(flag: boolean): void {
    if (this.state.suppressed === flag) {
      return;
    }

    this.state.suppressed = flag;
    snapManager.setTemporaryDisabled(flag);

    if (flag) {
      this.clear();
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
    this.renderer.destroy();
  }

  /**
   * Debug method to test smart guides manually
   */
  public debugTest(): void {
    console.log('🧪 Testing Smart Guides System');
    console.log('State:', this.state);
    console.log('UI Layer:', this.ui);
    console.log('Renderer initialized:', !!this.renderer);
    
    if (!this.ui) {
      console.error('❌ UI layer not set - call setUILayer first');
      return;
    }
    
    // Create a test scenario
    const testBounds = { x: 100, y: 100, width: 50, height: 50 };
    const testContainer = this.ui.parent as Container;
    
    if (testContainer) {
      this.update(testContainer, [], testBounds);
      console.log('✅ Test update called');
    } else {
      console.error('❌ Could not find container for test');
    }
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