/**
 * ModifyTool - Timeline-sensitive object property modification in animate mode
 * Uses implicit keyframes: changes apply from the current time forward only.
 * When you modify a property at time T, it affects the object from T onwards but not before.
 */

import { Point, Container, FederatedPointerEvent } from 'pixi.js';
import { BaseTool } from '../../tools/ToolInterface';
import { animationState } from '../AnimationState';
import { Scene } from '../Scene';
import { colorToNumber, detectToolType } from '../../tools/selection/SelectionUtils';

interface PropertyChangePoint {
  time: number; // 0-1 (relative to scene duration)
  properties: {
    fillColor?: string;
    strokeColor?: string;
    color?: string; // for text/brush
    size?: number; // for stroke width, brush size
    strokeWidth?: number;
    scale?: { x: number; y: number };
    rotation?: number; // in radians
    alpha?: number; // opacity 0-1
  };
}

interface ObjectModificationData {
  objectId: string;
  changePoints: PropertyChangePoint[]; // Property changes that apply from their time forward
  originalProperties: any; // backup of original object state
}

export class ModifyTool extends BaseTool {
  private selectedObject: Container | null = null;
  private currentScene: Scene | null = null;
  private modificationData: Map<string, ObjectModificationData> = new Map();
  
  constructor() {
    super('modify', 'pointer');
  }

  onActivate(): void {
    console.log('🎨 ModifyTool activated - Timeline-sensitive property modification enabled');
    this.setupKeyboardListeners();
  }

  onDeactivate(): void {
    this.selectedObject = null;
    this.currentScene = null;
    this.removeKeyboardListeners();
  }

  onPointerDown(event: FederatedPointerEvent, _container: Container): void {
    const globalPt = event.global;
    
    // Find the scene at this location - use global coordinates
    this.currentScene = animationState.findSceneAt(globalPt);
    if (!this.currentScene) {
      this.selectedObject = null;
      this.updateUI();
      return;
    }

    // Find object within the scene
    this.selectedObject = this.findObjectInScene(globalPt, this.currentScene);
    if (this.selectedObject) {
      console.log('🎨 ModifyTool: Selected object for modification');
      this.ensureObjectData(this.selectedObject);
    } else {
      console.log('🎨 ModifyTool: No object selected');
    }
    
    this.updateUI();
  }

  onPointerMove(_event: FederatedPointerEvent, _container: Container): void {
    // No drag behavior needed for modify tool
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    // Selection complete
  }

  updateSettings(_settings: any): void {
    // ModifyTool settings are handled via UI panels
  }

  /**
   * Set an implicit keyframe at the current timeline position
   * This creates a keyframe that affects the object from this time forward only
   */
  public setImplicitKeyframeAtCurrentTime(properties: any): void {
    if (!this.selectedObject || !this.currentScene) return;

    const objectId = this.getObjectId(this.selectedObject);
    const currentTime = this.currentScene.getTime(); // 0-1
    
    const data = this.modificationData.get(objectId);
    if (!data) return;

    // Find existing change point at current time or create new one
    let changePoint = data.changePoints.find(cp => Math.abs(cp.time - currentTime) < 0.001);
    
    if (changePoint) {
      // Update existing change point with new properties
      Object.assign(changePoint.properties, properties);
    } else {
      // Create new change point
      changePoint = {
        time: currentTime,
        properties: { ...properties }
      };
      data.changePoints.push(changePoint);
      data.changePoints.sort((a, b) => a.time - b.time);
    }
    
    console.log(`🎨 ModifyTool: Set implicit keyframe at time ${currentTime.toFixed(3)} for object ${objectId}`);
    
    // Apply the changes immediately to see the effect
    this.applyPropertiesAtTime(this.selectedObject, currentTime);
    
    // Notify that object has been modified
    this.notifyObjectModified(this.selectedObject, objectId);
  }

  /**
   * Remove change point at current time
   */
  public removeChangePointAtCurrentTime(): void {
    if (!this.selectedObject || !this.currentScene) return;

    const objectId = this.getObjectId(this.selectedObject);
    const currentTime = this.currentScene.getTime();
    
    const data = this.modificationData.get(objectId);
    if (!data) return;

    const initialLength = data.changePoints.length;
    data.changePoints = data.changePoints.filter(cp => Math.abs(cp.time - currentTime) > 0.01);
    
    if (data.changePoints.length < initialLength) {
      console.log(`🎨 ModifyTool: Removed change point at time ${currentTime.toFixed(3)} for object ${objectId}`);
      this.applyPropertiesAtTime(this.selectedObject, currentTime);
      this.notifyObjectModified(this.selectedObject, objectId);
    }
  }

  /**
   * Get all change points for the currently selected object
   */
  public getCurrentObjectChangePoints(): PropertyChangePoint[] {
    if (!this.selectedObject) return [];
    
    const objectId = this.getObjectId(this.selectedObject);
    const data = this.modificationData.get(objectId);
    return data ? [...data.changePoints] : [];
  }

  /**
   * Check if there's a change point near the current time
   */
  public hasChangePointNearCurrentTime(tolerance: number = 0.01): boolean {
    if (!this.selectedObject || !this.currentScene) return false;
    
    const objectId = this.getObjectId(this.selectedObject);
    const currentTime = this.currentScene.getTime();
    const data = this.modificationData.get(objectId);
    
    if (!data) return false;
    
    return data.changePoints.some(cp => Math.abs(cp.time - currentTime) <= tolerance);
  }

  /**
   * Apply property modifications based on current timeline position
   * This method is called during animation playback
   */
  public updateObjectPropertiesForTime(object: Container, time: number): void {
    const objectId = this.getObjectId(object);
    const data = this.modificationData.get(objectId);
    if (!data || data.changePoints.length === 0) return;

    this.applyPropertiesAtTime(object, time);
  }

  /**
   * Get the currently selected object
   */
  public getSelectedObject(): Container | null {
    return this.selectedObject;
  }

  /**
   * Get the current scene
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  private findObjectInScene(globalPoint: Point, scene: Scene): Container | null {
    const contentContainer = scene.getContentContainer();
    if (!contentContainer) return null;

    const sceneLocal = contentContainer.toLocal(globalPoint);
    return this.searchInContainer(contentContainer, sceneLocal);
  }

  private searchInContainer(container: Container, localPoint: Point): Container | null {
    // Search from top to bottom (reverse order for proper hit testing)
    const children = [...container.children].reverse();
    
    for (const child of children) {
      if (!child.visible || child.alpha <= 0) continue;
      
      const childLocal = child.toLocal(localPoint, container);
      const bounds = child.getLocalBounds();
      
      if (childLocal.x >= bounds.x && childLocal.x <= bounds.x + bounds.width &&
          childLocal.y >= bounds.y && childLocal.y <= bounds.y + bounds.height) {
        // Check if this child has children (is a group/container)
        if (child.children && child.children.length > 0) {
          const nested = this.searchInContainer(child as Container, childLocal);
          if (nested) return nested;
        }
        
        // Skip scene-internal objects (handles, etc.)
        if ((child as any).name?.includes('Handle') || (child as any).name?.includes('Anchor')) {
          continue;
        }
        
        return child as Container;
      }
    }
    
    return null;
  }

  private ensureObjectData(object: Container): void {
    const objectId = this.getObjectId(object);
    
    if (!this.modificationData.has(objectId)) {
      // Store original properties for restoration
      const originalProperties = this.captureObjectProperties(object);
      
      const data: ObjectModificationData = {
        objectId,
        changePoints: [],
        originalProperties
      };
      
      this.modificationData.set(objectId, data);
      console.log(`🎨 ModifyTool: Initialized modification data for object ${objectId}`);
    }
  }

  private captureObjectProperties(object: Container): any {
    const props: any = {
      scale: { x: object.scale.x, y: object.scale.y },
      rotation: object.rotation,
      alpha: object.alpha
    };

    // Capture tool-specific properties based on object type
    const toolType = detectToolType(object);
    const meta = (object as any).__meta || {};
    
    switch (toolType) {
      case 'brush':
        props.color = meta.color;
        props.size = meta.size;
        break;
      case 'pen':
        props.strokeColor = meta.strokeColor;
        props.fillColor = meta.fillColor;
        props.size = meta.size;
        break;
      case 'shapes':
        props.strokeColor = meta.strokeColor;
        props.fillColor = meta.fillColor;
        props.strokeWidth = meta.strokeWidth;
        break;
      case 'text':
        props.color = meta.color;
        props.fontSize = meta.fontSize;
        break;
    }
    
    return props;
  }

  private applyPropertiesAtTime(object: Container, time: number): void {
    const objectId = this.getObjectId(object);
    const data = this.modificationData.get(objectId);
    if (!data) return;

    const changePoints = data.changePoints;
    if (changePoints.length === 0) {
      // No change points - use original properties
      this.applyPropertiesToObject(object, data.originalProperties);
      return;
    }

    // Find the most recent change point at or before the current time
    let activeChangePoint: PropertyChangePoint | null = null;
    
    for (let i = changePoints.length - 1; i >= 0; i--) {
      const cp = changePoints[i];
      if (cp.time <= time) {
        activeChangePoint = cp;
        break;
      }
    }

    let targetProperties: any = { ...data.originalProperties };

    if (activeChangePoint) {
      // Apply all properties from the most recent change point
      // This creates the "implicit keyframe" behavior - changes stick from the time they're applied
      Object.assign(targetProperties, activeChangePoint.properties);
    }

    // Apply the computed properties to the object
    this.applyPropertiesToObject(object, targetProperties);
  }



  private applyPropertiesToObject(object: Container, properties: any): void {
    try {
      // Apply universal properties
      if (properties.scale) {
        object.scale.set(properties.scale.x, properties.scale.y);
      }
      if (properties.rotation !== undefined) {
        object.rotation = properties.rotation;
      }
      if (properties.alpha !== undefined) {
        object.alpha = properties.alpha;
      }

      // Apply tool-specific properties
      const toolType = detectToolType(object);
      const meta = (object as any).__meta || {};
      
      switch (toolType) {
        case 'brush':
          if (properties.color && properties.color !== meta.color) {
            this.restyleBrush(object, meta, { color: properties.color, size: properties.size });
          } else if (properties.size && properties.size !== meta.size) {
            this.restyleBrush(object, meta, { size: properties.size });
          }
          break;
        case 'pen':
          const penChanges: any = {};
          if (properties.strokeColor) penChanges.strokeColor = properties.strokeColor;
          if (properties.fillColor) penChanges.fillColor = properties.fillColor;
          if (properties.size) penChanges.size = properties.size;
          if (Object.keys(penChanges).length > 0) {
            this.restylePen(object, meta, penChanges);
          }
          break;
        case 'shapes':
          const shapeChanges: any = {};
          if (properties.strokeColor) shapeChanges.strokeColor = properties.strokeColor;
          if (properties.fillColor) shapeChanges.fillColor = properties.fillColor;
          if (properties.strokeWidth) shapeChanges.strokeWidth = properties.strokeWidth;
          if (Object.keys(shapeChanges).length > 0) {
            this.restyleShape(object, meta, shapeChanges);
          }
          break;
        case 'text':
          if (properties.color || properties.fontSize) {
            this.restyleText(object, properties);
          }
          break;
      }
      
    } catch (error) {
      console.warn('🎨 ModifyTool: Error applying properties to object:', error);
    }
  }

  // Styling methods adapted from SelectionStyling
  private restyleBrush(gfx: any, meta: any, settings: any): void {
    if (!meta || !meta.points || meta.points.length < 2) return;
    const color = colorToNumber(settings.color) ?? colorToNumber(meta.color) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear(); 
    gfx.moveTo(meta.points[0].x, meta.points[0].y);
    for (let i = 1; i < meta.points.length; i++) { 
      const p = meta.points[i]; 
      gfx.lineTo(p.x, p.y); 
    }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    meta.size = width; 
    meta.color = typeof settings.color === 'string' ? settings.color : meta.color; 
    gfx.__meta = meta;
  }

  private restylePen(gfx: any, meta: any, settings: any): void {
    if (!meta || !meta.nodes || meta.nodes.length < 2) return;
    const color = colorToNumber(settings.strokeColor || settings.color) ?? colorToNumber(meta.strokeColor) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear(); 
    const nodes = meta.nodes as Array<{ x: number; y: number }>;
    gfx.moveTo(nodes[0].x, nodes[0].y); 
    for (let i = 1; i < nodes.length; i++) { 
      const p = nodes[i]; 
      gfx.lineTo(p.x, p.y); 
    }
    if (meta.closed) { 
      gfx.lineTo(nodes[0].x, nodes[0].y); 
      gfx.closePath(); 
      const fillCandidate = (settings.fillColor !== undefined) ? settings.fillColor : meta.fillColor; 
      const fillNum = colorToNumber(fillCandidate); 
      if (fillNum !== undefined) { 
        gfx.fill({ color: fillNum }); 
      } 
    }
    gfx.stroke({ width, color, cap: 'round', join: 'round' }); 
    meta.size = width; 
    meta.strokeColor = typeof (settings.strokeColor || settings.color) === 'string' ? (settings.strokeColor || settings.color) : meta.strokeColor; 
    gfx.__meta = meta;
  }

  private restyleShape(gfx: any, meta: any, settings: any): void {
    const strokeColor = colorToNumber(settings.strokeColor || settings.color) ?? colorToNumber(meta.strokeColor) ?? 0x000000;
    const strokeWidth = Math.max(1, (settings.strokeWidth ?? meta.strokeWidth ?? 2) as number);
    const fillColorNum = colorToNumber(settings.fillColor !== undefined ? settings.fillColor : meta.fillColor);
    const fillEnabled = settings.fillEnabled === true || (fillColorNum !== undefined) || meta.fillEnabled === true;
    const x = meta.x ?? meta.startX ?? 0; 
    const y = meta.y ?? meta.startY ?? 0; 
    const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0)); 
    const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));
    
    gfx.clear();
    
    switch (meta.shapeType) {
      case 'rectangle': { gfx.rect(x, y, w, h); break; }
      case 'circle': { 
        const cx = x + w / 2; 
        const cy = y + h / 2; 
        const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; 
        gfx.ellipse(cx, cy, radius, radius); 
        break; 
      }
      case 'ellipse': { 
        const cx = x + w / 2; 
        const cy = y + h / 2; 
        gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2)); 
        break; 
      }
      // Add other shape types as needed
      default: { gfx.rect(x, y, w, h); }
    }
    
    if (fillEnabled && fillColorNum !== undefined) { 
      gfx.fill({ color: fillColorNum }); 
    }
    gfx.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });
    
    meta.strokeWidth = strokeWidth; 
    meta.strokeColor = settings.strokeColor || settings.color || meta.strokeColor; 
    if ('fillColor' in settings) meta.fillColor = settings.fillColor; 
    if ('fillEnabled' in settings) meta.fillEnabled = settings.fillEnabled; 
    if ('fillColor' in settings && settings.fillEnabled === undefined) { 
      meta.fillEnabled = (fillColorNum !== undefined); 
    } 
    gfx.__meta = meta;
  }

  private restyleText(container: any, settings: any): void {
    try { 
      const children = container.children || []; 
      const textObj = children.find((c: any) => c.constructor?.name === 'Text'); 
      if (!textObj) return; 
      if (settings.color) { 
        textObj.style.fill = settings.color; 
      } 
      if (settings.fontSize) { 
        textObj.style.fontSize = settings.fontSize; 
      } 
    } catch (error) {
      console.warn('Error restyling text:', error);
    }
  }

  private getObjectId(object: Container): string {
    let objectId = (object as any).objectId;
    if (!objectId) {
      objectId = `modify_obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      (object as any).objectId = objectId;
    }
    return objectId;
  }

  private notifyObjectModified(object: Container, objectId: string): void {
    try {
      document.dispatchEvent(new CustomEvent('displayObject:updated', { 
        detail: { id: objectId, object } 
      }));
    } catch (error) {
      console.warn('Error notifying object modification:', error);
    }
  }

  private updateUI(): void {
    // Dispatch event to update modify tool UI panel
    try {
      const detail = { 
        hasSelection: !!this.selectedObject,
        objectType: this.selectedObject ? detectToolType(this.selectedObject) : null,
        currentTime: this.currentScene ? this.currentScene.getTime() : 0
      };
      
      console.log('🎨 ModifyTool: Dispatching UI update event:', detail);
      
      document.dispatchEvent(new CustomEvent('modify:selection:changed', { detail }));
    } catch (error) {
      console.warn('Error updating modify tool UI:', error);
    }
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private removeKeyboardListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedObject || !this.currentScene) return;

    switch (event.key) {
      case 'k':
      case 'K':
        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          // This will be triggered from the UI when user sets properties
          console.log('🎨 ModifyTool: Property change shortcut pressed (properties must be set via UI)');
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (event.shiftKey) {
          event.preventDefault();
          this.removeChangePointAtCurrentTime();
        }
        break;
    }
  };

  /**
   * Static method to update all objects with modifications during animation playback
   */
  static updateAllObjectsForTime(_time: number): void {
    // This will be called by the Scene during animation playback
    // For now, it's a placeholder - the actual implementation will be integrated
    // with the scene's animation loop
  }
}