/**
 * Anchored Scaling Module
 * Export all components for professional object scaling with anchor points
 */

// Main system integration
export { AnchoredScalingSystem } from './AnchoredScalingSystem';
export type { AnchoredScaleOptions, AnchoredScaleResult, AnchorStrategy } from './AnchoredScalingSystem';

// Core components
export { AnchorPointManager } from './AnchorPointManager';
export type { AnchorPoint } from './AnchorPointManager';

export { ScaleConstraintManager } from './ScaleConstraintManager';
export type { ScaleConstraints } from './ScaleConstraintManager';

export { ScaleCalculator } from './ScaleCalculator';
export type { 
  HandlePosition, 
  ScaleCalculationInput, 
  ScaleCalculationResult 
} from './ScaleCalculator';

export { ObjectTransformer } from './ObjectTransformer';
export type { 
  TransformOperation, 
  TransformResult 
} from './ObjectTransformer';

/**
 * Quick usage examples:
 * 
 * // Basic anchored scaling with default options
 * const result = AnchoredScalingSystem.scaleObjects(
 *   selectedObjects,
 *   'br', // bottom-right handle
 *   mousePosition,
 *   startMousePosition,
 *   AnchoredScalingSystem.createDefaultOptions()
 * );
 * 
 * // Aspect ratio constrained scaling
 * const aspectResult = AnchoredScalingSystem.scaleObjects(
 *   selectedObjects,
 *   'br',
 *   mousePosition,
 *   startMousePosition,
 *   AnchoredScalingSystem.createAspectRatioOptions()
 * );
 * 
 * // Preview mode (no actual transformation)
 * const preview = AnchoredScalingSystem.scaleObjects(
 *   selectedObjects,
 *   'br',
 *   mousePosition,
 *   startMousePosition,
 *   AnchoredScalingSystem.createPreviewOptions()
 * );
 * 
 * // Uniform scaling
 * const uniformResult = AnchoredScalingSystem.uniformScale(
 *   selectedObjects,
 *   1.5 // 50% larger
 * );
 */
