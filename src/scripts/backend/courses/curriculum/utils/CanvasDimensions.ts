import {
  computePixelDimensions,
  DEFAULT_CANVAS_ORIENTATION,
  DEFAULT_CANVAS_SIZE,
  DEFAULT_PAGE_MARGINS_MM,
} from "../../../../coursebuilder/layout/PageSizeConfig";

const DEFAULT_LAYOUT = computePixelDimensions(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_ORIENTATION);

export class CanvasDimensions {
  private static readonly DEFAULT_DIMENSIONS = {
    width: DEFAULT_LAYOUT.widthPx,
    height: DEFAULT_LAYOUT.heightPx,
  };
  private static readonly DEFAULT_MARGINS = {
    top: DEFAULT_PAGE_MARGINS_MM.top * DEFAULT_LAYOUT.pixelsPerMillimeter,
    right: DEFAULT_PAGE_MARGINS_MM.right * DEFAULT_LAYOUT.pixelsPerMillimeter,
    bottom: DEFAULT_PAGE_MARGINS_MM.bottom * DEFAULT_LAYOUT.pixelsPerMillimeter,
    left: DEFAULT_PAGE_MARGINS_MM.left * DEFAULT_LAYOUT.pixelsPerMillimeter,
    unit: "px" as const,
  };

  /**
   * Get canvas dimensions from system or fallback to defaults
   */
  static getCanvasDimensions(): { width: number; height: number } {
    try {
      const dimensionManager = (window as any)?.canvasSystem?.dimensionManager;
      if (
        dimensionManager &&
        typeof dimensionManager.getCurrentDimensions === "function"
      ) {
        const dims = dimensionManager.getCurrentDimensions();
        if (
          CanvasDimensions.isValidPositiveNumber(dims?.width) &&
          CanvasDimensions.isValidPositiveNumber(dims?.height)
        ) {
          return { width: dims.width, height: dims.height };
        }
      }
    } catch {
      /* empty */
    }

    try {
      const api = (window as any)?.canvasAPI;
      if (api && typeof api.getDimensions === "function") {
        const dims = api.getDimensions();
        if (
          CanvasDimensions.isValidPositiveNumber(dims?.width) &&
          CanvasDimensions.isValidPositiveNumber(dims?.height)
        ) {
          return { width: dims.width, height: dims.height };
        }
      }
    } catch {
      /* empty */
    }

    return { ...CanvasDimensions.DEFAULT_DIMENSIONS };
  }

  /**
   * Get canvas margins from system or fallback to defaults
   */
  static resolveCanvasMargins(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit: string;
  } {
    const fallback = { ...CanvasDimensions.DEFAULT_MARGINS };
    const fallbackMargins = {
      top: fallback.top,
      right: fallback.right,
      bottom: fallback.bottom,
      left: fallback.left,
      unit: fallback.unit,
    };

    try {
      const marginManager =
        (window as any)?.canvasSystem?.marginManager ??
        (window as any)?.canvasMarginManager;

      if (marginManager && typeof marginManager.getMargins === "function") {
        const margins = marginManager.getMargins();
        if (
          margins &&
          CanvasDimensions.isValidPositiveNumber(margins.top) &&
          CanvasDimensions.isValidPositiveNumber(margins.right) &&
          CanvasDimensions.isValidPositiveNumber(margins.bottom) &&
          CanvasDimensions.isValidPositiveNumber(margins.left)
        ) {
          return {
            top: margins.top,
            right: margins.right,
            bottom: margins.bottom,
            left: margins.left,
            unit: typeof margins.unit === "string" ? margins.unit : "px",
          };
        }
      }
    } catch (error) {
      console.warn(
        "Unable to resolve canvas margins, using defaults instead:",
        error,
      );
    }

    return fallbackMargins;
  }

  private static isValidPositiveNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }
}
