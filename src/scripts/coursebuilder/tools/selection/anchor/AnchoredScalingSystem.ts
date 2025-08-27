/**
 * Anchored Scaling System
 * Main integration point for professional object scaling with anchor points
 */

import { Point, Rectangle, Container } from "pixi.js";
import { AnchorPointManager } from "./AnchorPointManager";
import { ScaleConstraintManager, ScaleConstraints } from "./ScaleConstraintManager";
import { ScaleCalculator, ScaleCalculationInput, HandlePosition } from "./ScaleCalculator";
import { ObjectTransformer, TransformResult } from "./ObjectTransformer";

export type AnchorStrategy = 'opposite_corner' | 'center' | 'custom';

export interface AnchoredScaleOptions {
  strategy: AnchorStrategy;
  constraints?: Partial<ScaleConstraints>;
  maintainAspectRatio?: boolean;
  respectCanvasBounds?: boolean;
  previewMode?: boolean;
}

export interface AnchoredScaleResult {
  success: boolean;
  transformResult?: TransformResult;
  previewBounds?: Rectangle[];
  anchorPoint: Point;
  error?: string;
}

export class AnchoredScalingSystem {
  
  /**
   * Perform anchored scaling on selected objects
   */
  public static scaleObjects(
    objects: Container[],
    handlePosition: HandlePosition,
    mousePosition: Point,
    startMousePosition: Point,
    options: AnchoredScaleOptions
  ): AnchoredScaleResult {
    try {
      // Validate inputs
      if (!this.validateInputs(objects, handlePosition, mousePosition, startMousePosition)) {
        return {
          success: false,
          anchorPoint: new Point(0, 0),
          error: "Invalid input parameters"
        };
      }

      // Get combined bounds of all objects
      const combinedBounds = ObjectTransformer.getCombinedBounds(objects);
      
      // Calculate anchor point based on strategy
      const anchorPointData = AnchorPointManager.getAnchorPoint(handlePosition, combinedBounds);
      const anchorPoint = new Point(anchorPointData.x, anchorPointData.y);

      // Create scale constraints
      const constraints = ScaleConstraintManager.createDefaultConstraints();
      if (options.constraints) {
        Object.assign(constraints, options.constraints);
      }

      // Override aspect ratio constraint if specified
      if (options.maintainAspectRatio !== undefined) {
        constraints.maintainAspectRatio = options.maintainAspectRatio;
      }

      // Override canvas bounds constraint if specified
      if (options.respectCanvasBounds !== undefined) {
        constraints.respectCanvasBounds = options.respectCanvasBounds;
      }

      // Calculate new scale
      const scaleInput: ScaleCalculationInput = {
        originalBounds: combinedBounds,
        mousePosition,
        startMousePosition,
        handlePosition,
        anchorPoint,
        constraints
      };

      const scaleResult = ScaleCalculator.calculateNewBounds(scaleInput);

      if (!scaleResult.isValidScale) {
        return {
          success: false,
          anchorPoint,
          error: "Scale calculation resulted in invalid bounds"
        };
      }

      // Apply constraints
      const constrainedBounds = ScaleConstraintManager.applyConstraints(
        combinedBounds,
        scaleResult.newBounds,
        constraints,
        anchorPoint.x,
        anchorPoint.y
      );

      // Update scale result with constrained bounds
      scaleResult.newBounds = constrainedBounds;

      // Handle preview mode
      if (options.previewMode) {
        const previewBounds = ObjectTransformer.previewTransform(
          objects,
          scaleResult,
          anchorPoint
        );

        return {
          success: true,
          previewBounds,
          anchorPoint
        };
      }

      // Apply transformation to objects
      const transformResult = ObjectTransformer.transformObjects(
        objects,
        scaleResult,
        anchorPoint
      );

      return {
        success: transformResult.success,
        transformResult,
        anchorPoint,
        error: transformResult.error
      };

    } catch (error) {
      console.error("Anchored scaling failed:", error);
      return {
        success: false,
        anchorPoint: new Point(0, 0),
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Scale objects uniformly while maintaining aspect ratio
   */
  public static uniformScale(
    objects: Container[],
    uniformScaleFactor: number,
    options: Partial<AnchoredScaleOptions> = {}
  ): AnchoredScaleResult {
    try {
      if (!objects || objects.length === 0 || uniformScaleFactor <= 0) {
        return {
          success: false,
          anchorPoint: new Point(0, 0),
          error: "Invalid parameters for uniform scaling"
        };
      }

      const combinedBounds = ObjectTransformer.getCombinedBounds(objects);
      
      // Get center point as anchor for uniform scaling
      const anchorPointData = AnchorPointManager.getAnchorPoint('center', combinedBounds);
      const anchorPoint = new Point(anchorPointData.x, anchorPointData.y);

      // Handle preview mode
      if (options.previewMode) {
        const previewBounds = objects.map(obj => {
          const bounds = obj.getBounds();
          const objectBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
          return ScaleCalculator.applyUniformScale(objectBounds, anchorPoint, uniformScaleFactor);
        });

        return {
          success: true,
          previewBounds,
          anchorPoint
        };
      }

      // Apply uniform scaling
      const transformResult = ObjectTransformer.applyUniformScaling(
        objects,
        uniformScaleFactor,
        anchorPoint
      );

      return {
        success: transformResult.success,
        transformResult,
        anchorPoint,
        error: transformResult.error
      };

    } catch (error) {
      console.error("Uniform scaling failed:", error);
      return {
        success: false,
        anchorPoint: new Point(0, 0),
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Validate input parameters
   */
  private static validateInputs(
    objects: Container[],
    handlePosition: HandlePosition,
    mousePosition: Point,
    startMousePosition: Point
  ): boolean {
    if (!objects || objects.length === 0) {
      console.warn("No objects provided for scaling");
      return false;
    }

    if (!ObjectTransformer.canTransformObjects(objects)) {
      console.warn("Objects cannot be transformed");
      return false;
    }

    if (!handlePosition) {
      console.warn("No handle position provided");
      return false;
    }

    if (!mousePosition || !startMousePosition) {
      console.warn("Invalid mouse position data");
      return false;
    }

    return true;
  }

  /**
   * Create default scaling options
   */
  public static createDefaultOptions(strategy: AnchorStrategy = 'opposite_corner'): AnchoredScaleOptions {
    return {
      strategy,
      maintainAspectRatio: false,
      respectCanvasBounds: true,
      previewMode: false,
      constraints: {}
    };
  }

  /**
   * Create options for maintaining aspect ratio
   */
  public static createAspectRatioOptions(strategy: AnchorStrategy = 'opposite_corner'): AnchoredScaleOptions {
    return {
      strategy,
      maintainAspectRatio: true,
      respectCanvasBounds: true,
      previewMode: false,
      constraints: {}
    };
  }

  /**
   * Create options for preview mode
   */
  public static createPreviewOptions(strategy: AnchorStrategy = 'opposite_corner'): AnchoredScaleOptions {
    return {
      strategy,
      maintainAspectRatio: false,
      respectCanvasBounds: true,
      previewMode: true,
      constraints: {}
    };
  }

  /**
   * Check if shift key should enable aspect ratio constraint
   */
  public static shouldMaintainAspectRatio(
    isShiftPressed: boolean,
    handlePosition: HandlePosition
  ): boolean {
    const handleType = (['tl', 'tr', 'bl', 'br'] as HandlePosition[]).includes(handlePosition) 
      ? 'corner' as const 
      : 'edge' as const;
    
    return ScaleConstraintManager.shouldMaintainAspectRatio(isShiftPressed, handleType);
  }

  /**
   * Get recommended anchor strategy for handle position
   */
  public static getRecommendedAnchorStrategy(): AnchorStrategy {
    // For professional scaling, opposite corner is typically preferred
    return 'opposite_corner';
  }
}
