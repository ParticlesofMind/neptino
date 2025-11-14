import {
  computePixelDimensions,
  DEFAULT_CANVAS_ORIENTATION,
  DEFAULT_CANVAS_SIZE,
  type CanvasOrientation,
  type CanvasSizeKey,
} from "./PageSizeConfig";
import { UnitConverter, type MarginValues } from "../utils/UnitConverter";
import { DEFAULT_PAGE_MARGINS_MM } from "./PageSizeConfig";

export interface CanvasDimensionState {
  width: number;
  height: number;
  widthMm: number;
  heightMm: number;
  pixelsPerMillimeter: number;
  canvasSize: CanvasSizeKey;
  orientation: CanvasOrientation;
}

export interface CanvasMarginState {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: "px";
}

type DimensionListener = (state: CanvasDimensionState) => void;
type MarginListener = (margins: CanvasMarginState) => void;

class CanvasDimensionManager {
  private state: CanvasDimensionState;
  private listeners = new Set<DimensionListener>();

  constructor() {
    this.state = this.computeState(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_ORIENTATION);
  }

  private computeState(
    canvasSize: CanvasSizeKey,
    orientation: CanvasOrientation,
  ): CanvasDimensionState {
    const { widthPx, heightPx, widthMm, heightMm, pixelsPerMillimeter } = computePixelDimensions(
      canvasSize,
      orientation,
    );

    return {
      width: widthPx,
      height: heightPx,
      widthMm,
      heightMm,
      pixelsPerMillimeter,
      canvasSize,
      orientation,
    };
  }

  public getState(): CanvasDimensionState {
    return { ...this.state };
  }

  public onChange(listener: DimensionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public applyPageLayout(options: {
    canvas_size?: CanvasSizeKey;
    orientation?: CanvasOrientation;
  }): void {
    const canvasSize = options.canvas_size ?? this.state.canvasSize;
    const orientation = options.orientation ?? this.state.orientation;

    if (canvasSize === this.state.canvasSize && orientation === this.state.orientation) {
      return;
    }

    this.state = this.computeState(canvasSize, orientation);
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn("CanvasDimensionManager listener error:", error);
      }
    });
  }
}

class CanvasMarginManager {
  private margins: CanvasMarginState;
  private listeners = new Set<MarginListener>();
  private dimensionManager: CanvasDimensionManager;

  constructor(dimensionManager: CanvasDimensionManager) {
    this.dimensionManager = dimensionManager;
    this.margins = this.initializeDefaultMargins();
    
    // Update margins when dimensions change
    dimensionManager.onChange(() => {
      this.margins = this.initializeDefaultMargins();
      this.notify();
    });
  }

  private initializeDefaultMargins(): CanvasMarginState {
    const dimensionState = this.dimensionManager.getState();
    const pixelsPerMillimeter = dimensionState.pixelsPerMillimeter;

    return {
      top: DEFAULT_PAGE_MARGINS_MM.top * pixelsPerMillimeter,
      right: DEFAULT_PAGE_MARGINS_MM.right * pixelsPerMillimeter,
      bottom: DEFAULT_PAGE_MARGINS_MM.bottom * pixelsPerMillimeter,
      left: DEFAULT_PAGE_MARGINS_MM.left * pixelsPerMillimeter,
      unit: "px" as const,
    };
  }

  public setMargins(margins: MarginValues): void {
    this.margins = this.convertToPixels(margins);
    this.notify();
  }

  public setMarginsFromPageLayout(layout: {
    margins: { top: number; right: number; bottom: number; left: number; unit?: "mm" | "cm" | "inches" };
  }): void {
    this.setMargins({
      top: layout.margins.top,
      right: layout.margins.right,
      bottom: layout.margins.bottom,
      left: layout.margins.left,
      unit: this.normalizeLayoutUnit(layout.margins.unit),
    });
  }

  public getMargins(): CanvasMarginState {
    return { ...this.margins };
  }

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

    const dimensionState = this.dimensionManager.getState();
    const pixelsPerMillimeter = dimensionState.pixelsPerMillimeter;

    return {
      top: marginsInMm.top * pixelsPerMillimeter,
      right: marginsInMm.right * pixelsPerMillimeter,
      bottom: marginsInMm.bottom * pixelsPerMillimeter,
      left: marginsInMm.left * pixelsPerMillimeter,
      unit: "px" as const,
    };
  }

  private normalizeLayoutUnit(unit: "mm" | "cm" | "inches" | undefined): "mm" | "cm" | "inches" {
    return unit === "cm" ? "cm" : unit === "inches" ? "inches" : "mm";
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

export const canvasDimensionManager = new CanvasDimensionManager();
export const canvasMarginManager = new CanvasMarginManager(canvasDimensionManager);

try {
  (window as any).canvasMarginManager = canvasMarginManager;
} catch {
  /* ignore */
}

export default canvasMarginManager;

