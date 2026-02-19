export type CanvasOrientation = "portrait" | "landscape";
export type CanvasSizeKey = "a4" | "us-letter" | "a3";

interface PageSizeDefinition {
  width: number; // millimeters
  height: number; // millimeters
}

const PAGE_SIZES_MM: Record<CanvasSizeKey, PageSizeDefinition> = {
  a4: { width: 210, height: 297 },
  "us-letter": { width: 215.9, height: 279.4 },
  a3: { width: 297, height: 420 },
};

export const DEFAULT_CANVAS_SIZE: CanvasSizeKey = "a4";
export const DEFAULT_CANVAS_ORIENTATION: CanvasOrientation = "portrait";
export const DEFAULT_CANVAS_WIDTH_PX = 1200;

export const DEFAULT_PAGE_MARGINS_MM = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
  unit: "mm" as const,
};

export interface PageSizeMillimeters {
  widthMm: number;
  heightMm: number;
}

export interface PagePixelDimensions extends PageSizeMillimeters {
  widthPx: number;
  heightPx: number;
  pixelsPerMillimeter: number;
}

export function resolvePageSizeMillimeters(
  size: CanvasSizeKey,
  orientation: CanvasOrientation,
): PageSizeMillimeters {
  const definition = PAGE_SIZES_MM[size] ?? PAGE_SIZES_MM[DEFAULT_CANVAS_SIZE];
  const swap = orientation === "landscape";
  const widthMm = swap ? definition.height : definition.width;
  const heightMm = swap ? definition.width : definition.height;

  return { widthMm, heightMm };
}

export function computePixelDimensions(
  size: CanvasSizeKey,
  orientation: CanvasOrientation,
  targetWidthPx = DEFAULT_CANVAS_WIDTH_PX,
): PagePixelDimensions {
  const { widthMm, heightMm } = resolvePageSizeMillimeters(size, orientation);
  const pixelsPerMillimeter = targetWidthPx / widthMm;
  const widthPx = Math.round(widthMm * pixelsPerMillimeter);
  const heightPx = Math.round(heightMm * pixelsPerMillimeter);

  return {
    widthMm,
    heightMm,
    widthPx,
    heightPx,
    pixelsPerMillimeter,
  };
}
