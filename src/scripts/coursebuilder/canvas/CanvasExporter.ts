/**
 * CanvasExporter - Export utilities for Virtual Canvas
 * 
 * Provides utilities to export clean canvas content without virtual world elements,
 * focusing only on the artboard bounds for final output.
 * 
 * Features:
 * - Strip out-of-bounds content for clean exports
 * - Export only artboard area (1200x1800)
 * - Multiple export formats (PNG, JPG, JSON)
 * - Object filtering and validation
 */

import { Application, Container, RenderTexture, Sprite, Rectangle } from 'pixi.js';
import { VirtualCanvas } from './VirtualCanvas';
import { ARTBOARD_WIDTH, ARTBOARD_HEIGHT } from '../utils/canvasSizing';

export interface ExportOptions {
  format?: 'png' | 'jpg' | 'json';
  quality?: number; // For JPG exports (0-1)
  includeMetadata?: boolean;
  stripOutOfBounds?: boolean;
  artboardOnly?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: string | object;
  error?: string;
  metadata?: {
    dimensions: { width: number; height: number };
    objectCount: number;
    exportTime: number;
    format: string;
  };
}

export class CanvasExporter {
  private app: Application;
  private virtualCanvas: VirtualCanvas;

  constructor(app: Application, virtualCanvas: VirtualCanvas) {
    this.app = app;
    this.virtualCanvas = virtualCanvas;
  }

  /**
   * Export canvas as image (PNG/JPG)
   */
  public async exportImage(options: ExportOptions = {}): Promise<ExportResult> {
    const startTime = performance.now();
    
    try {
      const {
        format = 'png',
        quality = 0.9,
        artboardOnly = true,
        stripOutOfBounds = true
      } = options;

      // Get objects to export
      const objectsToExport = artboardOnly 
        ? this.virtualCanvas.getArtboardObjects()
        : this.getAllVisibleObjects();

      if (stripOutOfBounds && !artboardOnly) {
        // Filter objects that intersect with artboard
        const artboardBounds = this.virtualCanvas.getArtboardBounds();
        objectsToExport.filter(obj => this.isObjectInBounds(obj, artboardBounds));
      }

      // Create temporary render texture
      const renderTexture = RenderTexture.create({
        width: ARTBOARD_WIDTH,
        height: ARTBOARD_HEIGHT,
        resolution: this.app.renderer.resolution
      });

      // Create temporary container for export
      const exportContainer = new Container();
      
      // Clone and add objects to export container
      const artboardBounds = this.virtualCanvas.getArtboardBounds();
      
      for (const obj of objectsToExport) {
        const clonedObj = this.cloneDisplayObject(obj);
        
        // Adjust position to artboard coordinates
        clonedObj.x = obj.x - artboardBounds.x;
        clonedObj.y = obj.y - artboardBounds.y;
        
        exportContainer.addChild(clonedObj);
      }

      // Render to texture
      this.app.renderer.render(exportContainer, { renderTexture });

      // Extract image data
      const canvas = this.app.renderer.extract.canvas(renderTexture);
      if (!canvas) {
        throw new Error('Failed to extract canvas from render texture');
      }
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const imageData = canvas?.toDataURL ? canvas.toDataURL(mimeType, quality) : '';

      // Cleanup
      exportContainer.destroy({ children: true });
      renderTexture.destroy(true);

      const exportTime = performance.now() - startTime;

      return {
        success: true,
        data: imageData,
        metadata: {
          dimensions: { width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT },
          objectCount: objectsToExport.length,
          exportTime,
          format
        }
      };

    } catch (error) {
      console.error('❌ Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Export canvas as JSON data
   */
  public exportJSON(options: ExportOptions = {}): ExportResult {
    const startTime = performance.now();
    
    try {
      const {
        includeMetadata = true,
        artboardOnly = true,
        stripOutOfBounds = true
      } = options;

      // Get objects to export
      const objectsToExport = artboardOnly 
        ? this.virtualCanvas.getArtboardObjects()
        : this.getAllVisibleObjects();

      // Serialize objects
      const serializedObjects = objectsToExport.map(obj => this.serializeDisplayObject(obj));

      // Filter by bounds if requested
      const artboardBounds = this.virtualCanvas.getArtboardBounds();
      const filteredObjects = stripOutOfBounds 
        ? serializedObjects.filter(obj => this.isSerializedObjectInBounds(obj, artboardBounds))
        : serializedObjects;

      // Build export data
      const exportData: any = {
        version: '1.0',
        artboard: {
          width: ARTBOARD_WIDTH,
          height: ARTBOARD_HEIGHT,
          x: artboardBounds.x,
          y: artboardBounds.y
        },
        objects: filteredObjects
      };

      if (includeMetadata) {
        exportData.metadata = {
          exportTime: new Date().toISOString(),
          objectCount: filteredObjects.length,
          virtualCanvas: this.virtualCanvas.getStats()
        };
      }

      const exportTime = performance.now() - startTime;

      return {
        success: true,
        data: exportData,
        metadata: {
          dimensions: { width: ARTBOARD_WIDTH, height: ARTBOARD_HEIGHT },
          objectCount: filteredObjects.length,
          exportTime,
          format: 'json'
        }
      };

    } catch (error) {
      console.error('❌ JSON export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown JSON export error'
      };
    }
  }

  /**
   * Get all visible objects from virtual canvas
   */
  private getAllVisibleObjects(): Container[] {
    const worldContainer = this.virtualCanvas.getWorldContainer();
    const visibleObjects: Container[] = [];
    
    worldContainer.children.forEach(child => {
      if (child.visible && child instanceof Container) {
        visibleObjects.push(child);
      }
    });
    
    return visibleObjects;
  }

  /**
   * Check if object intersects with bounds
   */
  private isObjectInBounds(obj: Container, bounds: Rectangle): boolean {
    try {
      const objBounds = obj.getBounds();
      const objRect = new Rectangle(
        objBounds.minX,
        objBounds.minY,
        objBounds.maxX - objBounds.minX,
        objBounds.maxY - objBounds.minY
      );
      return bounds.intersects(objRect);
    } catch (error) {
      // If bounds calculation fails, include object
      return true;
    }
  }

  /**
   * Check if serialized object is in bounds
   */
  private isSerializedObjectInBounds(obj: any, bounds: Rectangle): boolean {
    if (!obj.x || !obj.y || !obj.width || !obj.height) {
      return true; // Include if we can't determine bounds
    }
    
    const objRect = new Rectangle(obj.x, obj.y, obj.width, obj.height);
    return bounds.intersects(objRect);
  }

  /**
   * Clone a display object for export
   */
  private cloneDisplayObject(obj: Container): Container {
    try {
      // Create a basic clone - this is a simplified version
      const clone = new Container();
      
      // Copy basic properties
      clone.x = obj.x;
      clone.y = obj.y;
      clone.rotation = obj.rotation;
      clone.scale.copyFrom(obj.scale);
      clone.alpha = obj.alpha;
      clone.visible = obj.visible;
      
      // Copy children recursively (simplified)
      obj.children.forEach(child => {
        if (child instanceof Container) {
          const childClone = this.cloneDisplayObject(child);
          clone.addChild(childClone);
        } else {
          // Handle other display object types
          try {
            const anyChild = child as any;
            if (anyChild.texture) {
              // Likely a Sprite
              const spriteClone = new Sprite(anyChild.texture);
              spriteClone.x = anyChild.x || 0;
              spriteClone.y = anyChild.y || 0;
              if (anyChild.scale) {
                spriteClone.scale.copyFrom(anyChild.scale);
              }
              spriteClone.rotation = anyChild.rotation || 0;
              spriteClone.alpha = anyChild.alpha || 1;
              clone.addChild(spriteClone);
            }
          } catch (error) {
            console.warn('Failed to clone child object:', error);
          }
        }
        // Add more object types as needed
      });
      
      return clone;
    } catch (error) {
      console.warn('Failed to clone object, using empty container:', error);
      return new Container();
    }
  }

  /**
   * Serialize display object to JSON
   */
  private serializeDisplayObject(obj: Container): any {
    try {
      const bounds = obj.getBounds();
      
      return {
        type: obj.constructor.name,
        x: obj.x,
        y: obj.y,
        rotation: obj.rotation,
        scaleX: obj.scale.x,
        scaleY: obj.scale.y,
        alpha: obj.alpha,
        visible: obj.visible,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        bounds: {
          minX: bounds.minX,
          minY: bounds.minY,
          maxX: bounds.maxX,
          maxY: bounds.maxY
        },
        children: obj.children.length,
        // Add object-specific properties
        ...(this.getObjectSpecificProperties(obj))
      };
    } catch (error) {
      console.warn('Failed to serialize object:', error);
      return {
        type: 'Unknown',
        error: 'Serialization failed'
      };
    }
  }

  /**
   * Get object-specific properties for serialization
   */
  private getObjectSpecificProperties(obj: Container): any {
    const props: any = {};
    
    // Add Sprite-specific properties
    if (obj instanceof Sprite) {
      props.texture = {
        width: obj.texture.width,
        height: obj.texture.height,
        baseTexture: {
          width: obj.texture.baseTexture.width,
          height: obj.texture.baseTexture.height
        }
      };
    }
    
    // Add Text-specific properties
    if ('text' in obj && typeof (obj as any).text === 'string') {
      props.text = (obj as any).text;
      props.style = (obj as any).style || {};
    }
    
    return props;
  }

  /**
   * Export artboard bounds as image
   */
  public async exportArtboard(): Promise<ExportResult> {
    return this.exportImage({
      format: 'png',
      artboardOnly: true,
      stripOutOfBounds: true
    });
  }

  /**
   * Export full virtual canvas for debugging
   */
  public async exportFullCanvas(): Promise<ExportResult> {
    return this.exportImage({
      format: 'png',
      artboardOnly: false,
      stripOutOfBounds: false
    });
  }

  /**
   * Get export preview (smaller version for UI)
   */
  public async getPreview(maxSize: number = 200): Promise<ExportResult> {
    const result = await this.exportArtboard();
    
    if (!result.success || !result.data) {
      return result;
    }
    
    try {
      // Create preview by scaling down the image
      const img = new Image();
      img.src = result.data as string;
      
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          resolve({
            success: true,
            data: canvas.toDataURL('image/png'),
            metadata: {
              dimensions: { width: canvas.width, height: canvas.height },
              objectCount: result.metadata?.objectCount || 0,
              exportTime: performance.now(),
              format: 'png-preview'
            }
          });
        };
        
        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to create preview'
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        error: 'Preview generation failed'
      };
    }
  }
}