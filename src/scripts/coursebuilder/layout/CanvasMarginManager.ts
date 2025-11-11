/**
 * CanvasMarginManager - lightweight margin state for the simple canvas.
 */

import { canvasDimensionManager } from "./CanvasDimensionManager";
import { UnitConverter, type MarginValues } from "../utils/UnitConverter";
import { DEFAULT_PAGE_MARGINS_MM } from "./PageSizeConfig";

export interface CanvasMarginState {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: "px";
}

type MarginListener = (margins: CanvasMarginState) => void;

class CanvasMarginManager {
  // Initialize with database defaults (in mm), converted to pixels
  // These match the course_layout defaults: top: 33.87mm, bottom: 29.63mm, left/right: 25.4mm
  private margins: CanvasMarginState = this.initializeDefaultMargins();

  private listeners = new Set<MarginListener>();

  /**
   * Initialize default margins from PageSizeConfig defaults, converted to pixels
   */
  private initializeDefaultMargins(): CanvasMarginState {
    // Get pixelsPerMillimeter from dimension manager (will use defaults if not yet initialized)
    const dimensionState = canvasDimensionManager.getState();
    const pixelsPerMillimeter = dimensionState.pixelsPerMillimeter;

    // Convert database defaults (in mm) to pixels
    const defaults = {
      top: DEFAULT_PAGE_MARGINS_MM.top * pixelsPerMillimeter,
      right: DEFAULT_PAGE_MARGINS_MM.right * pixelsPerMillimeter,
      bottom: DEFAULT_PAGE_MARGINS_MM.bottom * pixelsPerMillimeter,
      left: DEFAULT_PAGE_MARGINS_MM.left * pixelsPerMillimeter,
      unit: "px" as const,
    };

    console.log("📐 CanvasMarginManager: Initializing with defaults:", {
      defaultsMm: DEFAULT_PAGE_MARGINS_MM,
      pixelsPerMillimeter,
      defaultsPx: defaults,
    });

    return defaults;
  }

  /**
   * Set pixel-based margins directly.
   */
  public setMargins(margins: MarginValues): void {
    const resolved = this.convertToPixels(margins);
    this.margins = resolved;

    this.notify();
  }

  /**
   * Apply margins provided from the page layout settings panel.
   */
  public setMarginsFromPageLayout(layout: {
    margins: { top: number; right: number; bottom: number; left: number; unit: "mm" | "cm" | "inches" };
  }): void {
    console.log("📐 CanvasMarginManager: Setting margins from page layout:", layout.margins);
    this.setMargins({
      top: layout.margins.top,
      right: layout.margins.right,
      bottom: layout.margins.bottom,
      left: layout.margins.left,
      unit: layout.margins.unit === "mm" ? "mm" : layout.margins.unit,
    });
    const finalMargins = this.getMargins();
    console.log("📐 CanvasMarginManager: Final margins in pixels:", finalMargins);
  }

  /**
   * Retrieve the current margins in pixels.
   */
  public getMargins(): CanvasMarginState {
    return { ...this.margins };
  }

  /**
   * Subscribe to margin change events.
   */
  public onChange(listener: MarginListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private convertToPixels(margins: MarginValues): CanvasMarginState {
    const unit = margins.unit ?? "px";
    if (unit === "px") {
      return {
        top: margins.top,
        right: margins.right,
        bottom: margins.bottom,
        left: margins.left,
        unit: "px",
      };
    }

    const marginsInMm = UnitConverter.convertMargins(
      {
        top: margins.top,
        right: margins.right,
        bottom: margins.bottom,
        left: margins.left,
        unit,
      },
      unit,
      "mm",
    );

    const dimensionState = canvasDimensionManager.getState();
    const pixelsPerMillimeter = dimensionState.pixelsPerMillimeter;

    const result = {
      top: marginsInMm.top * pixelsPerMillimeter,
      right: marginsInMm.right * pixelsPerMillimeter,
      bottom: marginsInMm.bottom * pixelsPerMillimeter,
      left: marginsInMm.left * pixelsPerMillimeter,
      unit: "px" as const,
    };

    console.log("📐 CanvasMarginManager: Converting margins:", {
      input: margins,
      marginsInMm,
      pixelsPerMillimeter,
      result,
    });

    return result;
  }

  private notify(): void {
    const snapshot = this.getMargins();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn("CanvasMarginManager listener error:", error);
      }
    });
    try {
      (window as any).canvasMargins = snapshot;
    } catch {
      /* ignore */
    }
  }
}

export const canvasMarginManager = new CanvasMarginManager();

try {
  (window as any).canvasMarginManager = canvasMarginManager;
} catch {
  /* ignore */
}

export default canvasMarginManager;
