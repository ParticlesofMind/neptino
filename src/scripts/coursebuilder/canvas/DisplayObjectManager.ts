/**
 * DisplayObjectManager - Real Pixi Display Object Management
 * 
 * Responsibilities:
 * - Manage all Pixi display objects on the canvas
 * - Add/remove graphics, sprites, containers to correct layers
 * - Provide convenient methods for tools to create/manipulate objects
 * - Handle display object hierarchies and z-ordering
 * 
 * Target: ~200 lines
 */

import { Container, Graphics, Text } from 'pixi.js';

export class DisplayObjectManager {
  private rootContainer: Container;
  private allObjects: Map<string, any> = new Map();
  private idCounter: number = 0;

  // Legacy compatibility properties
  public root: Container;
  public objects: Set<any> = new Set();

  constructor(rootContainer: Container) {
    this.rootContainer = rootContainer;
    this.root = rootContainer; // Legacy alias
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('🖼️ DisplayObjectManager initialized'); } catch {}
  }

  /**
   * Get the root container (legacy interface)
   */
  public getRoot(): Container {
    return this.rootContainer;
  }

  /**
   * Get all objects as array (legacy interface)
   */
  public getObjects(): any[] {
    return Array.from(this.allObjects.values());
  }

  /**
   * Legacy add method (simplified interface)
   */
  public add(displayObject: any, parent?: Container): string {
    return this.addWithId(displayObject, this.generateId(), parent);
  }

  /**
   * Add a display object with specific ID
   */
  public addWithId(displayObject: any, id: string, parent?: Container): string {
    const targetParent = parent || this.rootContainer;
    
    // Add to parent container
    targetParent.addChild(displayObject);
    
    // Store reference
    this.allObjects.set(id, displayObject);
    try { (displayObject as any).__id = id; } catch {}
    
    // Legacy compatibility
    this.objects.add(displayObject);
    
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('➕ Added display object:', { id, type: displayObject.constructor.name, parentChildren: targetParent.children.length }); } catch {}
    // Notify UI layers panel
    try { document.dispatchEvent(new CustomEvent('displayObject:added', { detail: { id, object: displayObject } })); } catch {}
    
    return id;
  }

  /**
   * Remove a display object by ID
   */
  public remove(id: string | any): boolean {
    let displayObject: any;
    
    // Handle both ID and direct object removal
    if (typeof id === 'string') {
      displayObject = this.allObjects.get(id);
      if (!displayObject) {
        console.warn('⚠️ Cannot remove - display object not found:', id);
        return false;
      }
      this.allObjects.delete(id);
    } else {
      displayObject = id; // Direct object passed
      // Remove from map by finding the ID
      for (const [mapId, obj] of this.allObjects) {
        if (obj === displayObject) {
          this.allObjects.delete(mapId);
          break;
        }
      }
    }

    // Remove from parent
    if (displayObject.parent) {
      displayObject.parent.removeChild(displayObject);
    }

    // Legacy compatibility
    this.objects.delete(displayObject);
    
    // If this object represents an animation scene, destroy via scene to clean up ticker/state
    try {
      if ((displayObject as any).__sceneRef && typeof (displayObject as any).__sceneRef.destroy === 'function') {
        (displayObject as any).__sceneRef.destroy();
      } else {
        displayObject.destroy();
      }
    } catch {
      try { displayObject.destroy(); } catch {}
    }
    
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('🗑️ Removed display object:', { id: typeof id === 'string' ? id : 'direct', type: displayObject.constructor.name }); } catch {}
    try { document.dispatchEvent(new CustomEvent('displayObject:removed', { detail: { id } })); } catch {}
    
    return true;
  }

  /**
   * Get the ID for a given display object (if available)
   */
  public getIdForObject(obj: any): string | null {
    if (!obj) return null;
    if ((obj as any).__id) return (obj as any).__id;
    for (const [id, val] of this.allObjects.entries()) {
      if (val === obj) return id;
    }
    return null;
  }

  /**
   * Get a display object by ID
   */
  public get(id: string): any | null {
    return this.allObjects.get(id) || null;
  }

  /**
   * Clear all display objects
   */
  public clear(): void {
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('🧹 Clearing all display objects...'); } catch {}
    
    // Remove all objects
    for (const [, displayObject] of this.allObjects) {
      if (displayObject.parent) {
        displayObject.parent.removeChild(displayObject);
      }
      displayObject.destroy();
    }
    
    // Clear the map and legacy set
    this.allObjects.clear();
    this.objects.clear();
    
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('✅ All display objects cleared'); } catch {}
  }

  /**
   * Create a new Graphics object and add it
   */
  public createGraphics(parent?: Container): { graphics: Graphics; id: string } {
    const graphics = new Graphics();
    try { (graphics as any).eventMode = 'none'; (graphics as any).interactiveChildren = false; } catch {}
    const id = this.add(graphics, parent);
    
    return { graphics, id };
  }

  /**
   * Create a new Container and add it
   */
  public createContainer(parent?: Container): { container: Container; id: string } {
    const container = new Container();
    const id = this.add(container, parent);
    
    return { container, id };
  }

  /**
   * Create a new Text object and add it
   */
  public createText(text: string, style?: any, parent?: Container): { text: Text; id: string } {
    const textObj = new Text({ text, style });
    const id = this.add(textObj, parent);
    
    return { text: textObj, id };
  }

  /**
   * Move display object to front (top z-index in parent)
   */
  public bringToFront(id: string): boolean {
    const displayObject = this.get(id);
    if (!displayObject || !displayObject.parent) return false;
    
    const parent = displayObject.parent;
    parent.removeChild(displayObject);
    parent.addChild(displayObject);
    
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('⬆️ Brought to front:', id); } catch {}
    return true;
  }

  /**
   * Move display object to back (bottom z-index in parent)
   */
  public sendToBack(id: string): boolean {
    const displayObject = this.get(id);
    if (!displayObject || !displayObject.parent) return false;
    
    const parent = displayObject.parent;
    parent.removeChild(displayObject);
    parent.addChildAt(displayObject, 0);
    
    try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('⬇️ Sent to back:', id); } catch {}
    return true;
  }

  /** Move display object one step forward in z-order */
  public bringForward(id: string): boolean {
    const displayObject = this.get(id);
    if (!displayObject || !displayObject.parent) return false;
    const parent = displayObject.parent as Container;
    const idx = parent.getChildIndex ? parent.getChildIndex(displayObject) : parent.children.indexOf(displayObject);
    if (idx < 0) return false;
    const newIdx = Math.min(parent.children.length - 1, idx + 1);
    try {
      if (typeof parent.setChildIndex === 'function') parent.setChildIndex(displayObject, newIdx);
      else { parent.removeChild(displayObject); parent.addChildAt(displayObject, newIdx); }
      try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('⤴️ Brought forward:', { id, from: idx, to: newIdx }); } catch {}
      return true;
    } catch { return false; }
  }

  /** Move display object one step backward in z-order */
  public sendBackward(id: string): boolean {
    const displayObject = this.get(id);
    if (!displayObject || !displayObject.parent) return false;
    const parent = displayObject.parent as Container;
    const idx = parent.getChildIndex ? parent.getChildIndex(displayObject) : parent.children.indexOf(displayObject);
    if (idx < 0) return false;
    const newIdx = Math.max(0, idx - 1);
    try {
      if (typeof parent.setChildIndex === 'function') parent.setChildIndex(displayObject, newIdx);
      else { parent.removeChild(displayObject); parent.addChildAt(displayObject, newIdx); }
      try { if ((window as any).__NEPTINO_DEBUG_LOGS) console.log('⤵️ Sent backward:', { id, from: idx, to: newIdx }); } catch {}
      return true;
    } catch { return false; }
  }

  /**
   * Set visibility of display object
   */
  public setVisible(id: string, visible: boolean): boolean {
    const displayObject = this.get(id);
    if (!displayObject) return false;
    
    displayObject.visible = visible;
    return true;
  }

  /**
   * Set alpha (opacity) of display object
   */
  public setAlpha(id: string, alpha: number): boolean {
    const displayObject = this.get(id);
    if (!displayObject) return false;
    
    displayObject.alpha = Math.max(0, Math.min(1, alpha));
    return true;
  }

  /**
   * Set position of display object
   */
  public setPosition(id: string, x: number, y: number): boolean {
    const displayObject = this.get(id);
    if (!displayObject) return false;
    
    displayObject.x = x;
    displayObject.y = y;
    return true;
  }

  /**
   * Set scale of display object
   */
  public setScale(id: string, scaleX: number, scaleY?: number): boolean {
    const displayObject = this.get(id);
    if (!displayObject) return false;
    
    displayObject.scale.x = scaleX;
    displayObject.scale.y = scaleY ?? scaleX;
    return true;
  }

  /**
   * Set rotation of display object (in radians)
   */
  public setRotation(id: string, rotation: number): boolean {
    const displayObject = this.get(id);
    if (!displayObject) return false;
    
    displayObject.rotation = rotation;
    return true;
  }

  /**
   * Get all display objects in a parent
   */
  public getObjectsInParent(parent: Container): string[] {
    const objectIds: string[] = [];
    
    for (const [id, displayObject] of this.allObjects) {
      if (displayObject.parent === parent) {
        objectIds.push(id);
      }
    }
    
    return objectIds;
  }

  /**
   * Generate unique ID for display objects
   */
  private generateId(): string {
    return `obj_${++this.idCounter}_${Date.now()}`;
  }

  /**
   * Get debug info
   */
  public getDebugInfo(): any {
    const info = {
      totalObjects: this.allObjects.size,
      objectTypes: {} as Record<string, number>,
      rootChildren: this.rootContainer.children.length
    };
    
    // Count by type
    for (const displayObject of this.allObjects.values()) {
      const type = displayObject.constructor.name;
      info.objectTypes[type] = (info.objectTypes[type] || 0) + 1;
    }
    
    return info;
  }

  /**
   * Destroy the manager and clean up all objects
   */
  public destroy(): void {
    this.clear();
  }
}
