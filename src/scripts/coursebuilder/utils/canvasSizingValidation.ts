/**
 * Canvas Sizing Validation Utilities
 * Comprehensive validation and error detection for canvas sizing system
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, calculateFitZoom } from './canvasSizing';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Validate the entire canvas sizing system for consistency and potential failure points
 */
export function validateCanvasSizing(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {}
  };

  // Check constant values
  if (!Number.isFinite(CANVAS_WIDTH) || CANVAS_WIDTH <= 0) {
    result.errors.push(`CANVAS_WIDTH is invalid: ${CANVAS_WIDTH}`);
    result.isValid = false;
  }

  if (!Number.isFinite(CANVAS_HEIGHT) || CANVAS_HEIGHT <= 0) {
    result.errors.push(`CANVAS_HEIGHT is invalid: ${CANVAS_HEIGHT}`);
    result.isValid = false;
  }

  // Check aspect ratio
  const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  if (aspectRatio < 0.5 || aspectRatio > 2.0) {
    result.warnings.push(`Unusual aspect ratio: ${aspectRatio.toFixed(3)} (${CANVAS_WIDTH}×${CANVAS_HEIGHT})`);
  }

  result.metadata.canvasDimensions = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio };

  return result;
}

/**
 * Validate container dimensions and zoom calculation
 */
export function validateContainerSizing(containerElement: HTMLElement | null): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {}
  };

  if (!containerElement) {
    result.errors.push('Container element is null');
    result.isValid = false;
    return result;
  }

  const containerWidth = containerElement.clientWidth;
  const containerHeight = containerElement.clientHeight;

  result.metadata.containerDimensions = { width: containerWidth, height: containerHeight };

  // Validate container dimensions
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    result.errors.push(`Container width is invalid: ${containerWidth}`);
    result.isValid = false;
  }

  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    result.errors.push(`Container height is invalid: ${containerHeight}`);
    result.isValid = false;
  }

  // Check if container is too small
  if (containerWidth < 200 || containerHeight < 200) {
    result.warnings.push(`Container is very small: ${containerWidth}×${containerHeight}`);
  }

  // Test zoom calculation
  if (result.isValid) {
    try {
      const zoom = calculateFitZoom(containerWidth, containerHeight);
      result.metadata.calculatedZoom = zoom;

      if (zoom < 0.1) {
        result.warnings.push(`Calculated zoom is very small: ${zoom.toFixed(3)}`);
      }

      if (zoom === 0.2) {
        result.warnings.push('Zoom clamped to minimum (0.2) - container may be too small');
      }

      if (zoom === 1.0) {
        result.warnings.push('Zoom clamped to maximum (1.0) - container may be too large');
      }

    } catch (error) {
      result.errors.push(`Zoom calculation failed: ${error}`);
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Validate PIXI application and canvas element
 */
export function validateCanvasElement(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {}
  };

  // Check for canvas element
  const canvas = document.querySelector('#pixi-canvas') as HTMLCanvasElement;
  if (!canvas) {
    result.errors.push('PIXI canvas element not found');
    result.isValid = false;
    return result;
  }

  result.metadata.canvasElement = {
    tagName: canvas.tagName,
    id: canvas.id,
    width: canvas.width,
    height: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    style: {
      width: canvas.style.width,
      height: canvas.style.height,
      transform: canvas.style.transform
    }
  };

  // Validate canvas dimensions
  if (canvas.width !== CANVAS_WIDTH) {
    result.errors.push(`Canvas width mismatch: expected ${CANVAS_WIDTH}, got ${canvas.width}`);
    result.isValid = false;
  }

  if (canvas.height !== CANVAS_HEIGHT) {
    result.errors.push(`Canvas height mismatch: expected ${CANVAS_HEIGHT}, got ${canvas.height}`);
    result.isValid = false;
  }

  // Check CSS dimensions
  const cssWidth = parseInt(canvas.style.width) || canvas.clientWidth;
  const cssHeight = parseInt(canvas.style.height) || canvas.clientHeight;

  if (cssWidth !== CANVAS_WIDTH) {
    result.warnings.push(`Canvas CSS width differs from canvas width: ${cssWidth} vs ${CANVAS_WIDTH}`);
  }

  if (cssHeight !== CANVAS_HEIGHT) {
    result.warnings.push(`Canvas CSS height differs from canvas height: ${cssHeight} vs ${CANVAS_HEIGHT}`);
  }

  return result;
}

/**
 * Validate perspective manager integration
 */
export function validatePerspectiveManager(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    metadata: {}
  };

  const perspectiveManager = (window as any).perspectiveManager;
  if (!perspectiveManager) {
    result.errors.push('Perspective manager not found on window object');
    result.isValid = false;
    return result;
  }

  // Check for required methods
  const requiredMethods = ['getZoomLevel', 'setZoom', 'setZoomLevel'];
  for (const method of requiredMethods) {
    if (typeof perspectiveManager[method] !== 'function') {
      result.errors.push(`Perspective manager missing method: ${method}`);
      result.isValid = false;
    }
  }

  if (result.isValid) {
    try {
      const zoomLevel = perspectiveManager.getZoomLevel();
      result.metadata.currentZoom = zoomLevel;

      if (!Number.isFinite(zoomLevel) || zoomLevel <= 0) {
        result.errors.push(`Invalid zoom level: ${zoomLevel}`);
        result.isValid = false;
      }

    } catch (error) {
      result.errors.push(`Error getting zoom level: ${error}`);
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Run all validation checks and return comprehensive report
 */
export function runFullValidation(): ValidationResult {
  const results = [
    validateCanvasSizing(),
    validateContainerSizing(document.querySelector('#canvas-container')),
    validateCanvasElement(),
    validatePerspectiveManager()
  ];

  const combined: ValidationResult = {
    isValid: results.every(r => r.isValid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
    metadata: results.reduce((acc, r, i) => ({ ...acc, [`check${i + 1}`]: r.metadata }), {})
  };

  return combined;
}

/**
 * Expose validation function on window for debugging
 */
if (typeof window !== 'undefined') {
  (window as any).validateCanvasSizing = runFullValidation;
}