import {
  computePixelDimensions,
  DEFAULT_CANVAS_ORIENTATION,
  DEFAULT_CANVAS_SIZE,
  type CanvasOrientation,
  type CanvasSizeKey,
} from "./PageSizeConfig";

export interface CanvasDimensionState {
  width: number;
  height: number;
  widthMm: number;
  heightMm: number;
  pixelsPerMillimeter: number;
  canvasSize: CanvasSizeKey;
  orientation: CanvasOrientation;
}

type DimensionListener = (state: CanvasDimensionState) => void;

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

export const canvasDimensionManager = new CanvasDimensionManager();
