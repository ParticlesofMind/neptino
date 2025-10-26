export class CanvasDimensions {
  private static readonly DEFAULT_DIMENSIONS = { width: 1200, height: 1800 };
  private static readonly DEFAULT_MARGINS = {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
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

