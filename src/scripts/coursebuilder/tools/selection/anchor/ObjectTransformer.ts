/**
 * Object Transformer
 * Handles the actual transformation of canvas objects based on scale calculations
 */

import { Rectangle, Point, Container } from "pixi.js";
import { ScaleCalculationResult } from "./ScaleCalculator";

export interface TransformOperation {
  object: Container;
  originalBounds: Rectangle;
  newBounds: Rectangle;
  scaleFactorX: number;
  scaleFactorY: number;
  anchorPoint: Point;
}

export interface TransformResult {
  success: boolean;
  transformedObjects: Container[];
  failedObjects: Container[];
  error?: string;
}

export class ObjectTransformer {
  
  /**
   * Apply scale transformation to multiple objects
   */
  public static transformObjects(
    objects: Container[],
    scaleResult: ScaleCalculationResult,
    anchorPoint: Point
  ): TransformResult {
    const transformedObjects: Container[] = [];
    const failedObjects: Container[] = [];

    if (!scaleResult.isValidScale) {
      return {
        success: false,
        transformedObjects: [],
        failedObjects: objects,
        error: "Invalid scale calculation result"
      };
    }

    for (const object of objects) {
      try {
        const success = this.transformSingleObject(
          object,
          scaleResult.scaleFactorX,
          scaleResult.scaleFactorY,
          anchorPoint
        );

        if (success) {
          transformedObjects.push(object);
        } else {
          failedObjects.push(object);
        }
      } catch (error) {
        console.warn("Failed to transform object:", error);
        failedObjects.push(object);
      }
    }

    return {
      success: transformedObjects.length > 0,
      transformedObjects,
      failedObjects,
      error: failedObjects.length > 0 ? `${failedObjects.length} objects failed to transform` : undefined
    };
  }

  /**
   * Transform a single object with anchored scaling
   */
  private static transformSingleObject(
    object: Container,
    scaleFactorX: number,
    scaleFactorY: number,
    anchorPoint: Point
  ): boolean {
    try {
      // Store original transform properties
      const originalTransform = {
        x: object.x,
        y: object.y,
        scaleX: object.scale.x,
        scaleY: object.scale.y
      };

      // Calculate new position based on anchor point
      const relativeX = originalTransform.x - anchorPoint.x;
      const relativeY = originalTransform.y - anchorPoint.y;

      // Apply scaling to position and scale
      object.x = anchorPoint.x + (relativeX * scaleFactorX);
      object.y = anchorPoint.y + (relativeY * scaleFactorY);
      object.scale.x = originalTransform.scaleX * scaleFactorX;
      object.scale.y = originalTransform.scaleY * scaleFactorY;

      return true;
    } catch (error) {
      console.error("Error transforming object:", error);
      return false;
    }
  }

  /**
   * Apply scale transformation to object bounds (for preview/calculation)
   */
  public static transformBounds(
    bounds: Rectangle,
    scaleFactorX: number,
    scaleFactorY: number,
    anchorPoint: Point
  ): Rectangle {
    const newWidth = bounds.width * scaleFactorX;
    const newHeight = bounds.height * scaleFactorY;

    // Calculate new position based on anchor point
    const relativeX = bounds.x - anchorPoint.x;
    const relativeY = bounds.y - anchorPoint.y;

    const newX = anchorPoint.x + (relativeX * scaleFactorX);
    const newY = anchorPoint.y + (relativeY * scaleFactorY);

    return new Rectangle(newX, newY, newWidth, newHeight);
  }

  /**
   * Preview transformation without applying it
   */
  public static previewTransform(
    objects: Container[],
    scaleResult: ScaleCalculationResult,
    anchorPoint: Point
  ): Rectangle[] {
    const previewBounds: Rectangle[] = [];

    for (const object of objects) {
      const bounds = object.getBounds();
      const originalBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
      const transformedBounds = this.transformBounds(
        originalBounds,
        scaleResult.scaleFactorX,
        scaleResult.scaleFactorY,
        anchorPoint
      );
      previewBounds.push(transformedBounds);
    }

    return previewBounds;
  }

  /**
   * Validate that objects can be transformed
   */
  public static canTransformObjects(objects: Container[]): boolean {
    if (!objects || objects.length === 0) {
      return false;
    }

    return objects.every(object => {
      try {
        // Check if object has required properties for transformation
        return object && 
               object.scale && 
               typeof object.x === 'number' && 
               typeof object.y === 'number' &&
               typeof object.scale.x === 'number' &&
               typeof object.scale.y === 'number';
      } catch {
        return false;
      }
    });
  }

  /**
   * Calculate combined bounds of multiple objects
   */
  public static getCombinedBounds(objects: Container[]): Rectangle {
    if (!objects || objects.length === 0) {
      return new Rectangle(0, 0, 0, 0);
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const object of objects) {
      try {
        const bounds = object.getBounds();
        const originalBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
        minX = Math.min(minX, originalBounds.x);
        minY = Math.min(minY, originalBounds.y);
        maxX = Math.max(maxX, originalBounds.x + originalBounds.width);
        maxY = Math.max(maxY, originalBounds.y + originalBounds.height);
      } catch (error) {
        console.warn("Failed to get bounds for object:", error);
      }
    }

    // Handle case where no valid bounds were found
    if (minX === Infinity) {
      return new Rectangle(0, 0, 0, 0);
    }

    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Revert transformation (undo functionality)
   */
  public static revertTransform(
    transformOperations: TransformOperation[]
  ): boolean {
    let success = true;

    for (const operation of transformOperations) {
      try {
        // Reset to original bounds/position
        const { object, originalBounds } = operation;
        
        object.x = originalBounds.x;
        object.y = originalBounds.y;
        object.scale.x = originalBounds.width / object.width;
        object.scale.y = originalBounds.height / object.height;
      } catch (error) {
        console.error("Failed to revert transform:", error);
        success = false;
      }
    }

    return success;
  }

  /**
   * Apply uniform scaling to maintain aspect ratio
   */
  public static applyUniformScaling(
    objects: Container[],
    uniformScale: number,
    anchorPoint: Point
  ): TransformResult {
    const transformedObjects: Container[] = [];
    const failedObjects: Container[] = [];

    for (const object of objects) {
      try {
        const originalX = object.x;
        const originalY = object.y;

        // Calculate new position based on anchor point
        const relativeX = originalX - anchorPoint.x;
        const relativeY = originalY - anchorPoint.y;

        object.x = anchorPoint.x + (relativeX * uniformScale);
        object.y = anchorPoint.y + (relativeY * uniformScale);
        object.scale.x *= uniformScale;
        object.scale.y *= uniformScale;

        transformedObjects.push(object);
      } catch (error) {
        console.warn("Failed to apply uniform scaling:", error);
        failedObjects.push(object);
      }
    }

    return {
      success: transformedObjects.length > 0,
      transformedObjects,
      failedObjects
    };
  }
}
