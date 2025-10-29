/**
 * CanvasMarginManager - lightweight margin state for the simple canvas.
 */

import { UnitConverter, type MarginValues } from "../utils/UnitConverter";

export interface CanvasMarginState {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: "px";
}

type MarginListener = (margins: CanvasMarginState) => void;

class CanvasMarginManager {
  private margins: CanvasMarginState = {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    unit: "px",
  };

  private listeners = new Set<MarginListener>();

  /**
   * Set pixel-based margins directly.
   */
  public setMargins(margins: MarginValues): void {
    const resolved = UnitConverter.marginsToPixels({
      top: margins.top,
      right: margins.right,
      bottom: margins.bottom,
      left: margins.left,
      unit: margins.unit ?? "px",
    });

    this.margins = {
      top: resolved.top,
      right: resolved.right,
      bottom: resolved.bottom,
      left: resolved.left,
      unit: "px",
    };

    this.notify();
  }

  /**
   * Apply margins provided from the page layout settings panel.
   */
  public setMarginsFromPageLayout(layout: {
    margins: { top: number; right: number; bottom: number; left: number; unit: "mm" | "cm" | "inches" };
  }): void {
    this.setMargins({
      top: layout.margins.top,
      right: layout.margins.right,
      bottom: layout.margins.bottom,
      left: layout.margins.left,
      unit: layout.margins.unit === "mm" ? "mm" : layout.margins.unit,
    });
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
