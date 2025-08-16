/**
 * Shared Resources for Drawing Tools
 * Contains color palettes, stroke sizes, and other shared constants
 */

// Beautiful, desaturated color palette extracted from project variables
export const PROFESSIONAL_COLORS = [
 "#1f2937", // Gray-800 - Dark charcoal
 "#4b5563", // Gray-600 - Medium gray
 "#5083f1", // Primary blue - Professional
 "#3b82f6", // Student blue - Clear sky
 "#059669", // Teacher green - Forest
 "#10b981", // Success green - Emerald
 "#f59e0b", // Accent amber - Warm
 "#ef4444", // Error red - Clear red
 "#8b5cf6", // Purple - Creative
 "#06b6d4", // Cyan - Fresh
 "#84cc16", // Lime - Energetic
 "#f97316", // Orange - Vibrant
 "#ec4899", // Pink - Accent
 "#6b7280", // Gray-500 - Neutral
 "#374151", // Gray-700 - Deep gray
 "#d1d5db", // Gray-300 - Light gray
];

// Authentic highlighter colors (marker-style pastels with slight saturation)
export const HIGHLIGHTER_COLORS = [
 "#ffef3e", // Classic highlighter yellow
 "#90ee90", // Light green
 "#ffb3ba", // Light pink
 "#87ceeb", // Sky blue
 "#dda0dd", // Plum
 "#ffd700", // Gold
 "#98fb98", // Pale green
 "#ffa07a", // Light salmon
 "#d3d3d3", // Light gray
 "#f0e68c", // Khaki
];

// Stroke sizes for different tools
export const STROKE_SIZES = {
 PEN: [1, 2, 3, 5, 8, 12],
 HIGHLIGHTER: [8, 12, 16, 24, 32],
 SHAPES: [1, 2, 4, 6, 8, 12],
 ERASER: [10, 15, 20, 30, 40, 60],
};

// Text sizes
export const TEXT_SIZES = [8, 10, 12, 14, 16, 18, 24, 32, 48, 64];

// Font families
export const FONT_FAMILIES = [
 "Inter",
 "Arial",
 "Helvetica",
 "Times New Roman",
 "Georgia",
 "Courier New",
];

/**
 * Convert hex color to PIXI number format
 */
export function hexToNumber(hex: string): number {
 return parseInt(hex.replace("#", ""), 16);
}

/**
 * Get a professional color by index
 */
export function getProfessionalColor(index: number): string {
 return PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length];
}

/**
 * Create a color palette element for UI
 */
export function createColorPaletteElement(
 selectedColor: string,
 onColorSelect: (color: string) => void,
): HTMLElement {
 const palette = document.createElement("div");
 palette

 PROFESSIONAL_COLORS.forEach((color) => {
 const colorElement = document.createElement("div");
 colorElement
 if (color === selectedColor) {
 colorElement
 }
 colorElement.title = color;
 colorElement.dataset.color = color;
 // Set background color via CSS custom property for better maintainability
 colorElement.style.setProperty("", color);

 colorElement.addEventListener("click", () => {
 // Update active state
 palette.querySelectorAll('elements').forEach((el) => {
 el
 });
 colorElement

 onColorSelect(color);
 });

 palette.appendChild(colorElement);
 });

 return palette;
}

/**
 * Create a stroke size selector
 */
export function createStrokeSizeSelector(
 sizes: number[],
 selectedSize: number,
 onSizeSelect: (size: number) => void,
 unit: string = "px",
): HTMLElement {
 const container = document.createElement("div");
 container

 const slider = document.createElement("input");
 slider.type = "range";
 slider.min = Math.min(...sizes).toString();
 slider.max = Math.max(...sizes).toString();
 slider.value = selectedSize.toString();

 const valueDisplay = document.createElement("span");
 valueDisplay
 valueDisplay.textContent = `${selectedSize}${unit}`;

 slider.addEventListener("input", () => {
 const newSize = parseInt(slider.value);
 valueDisplay.textContent = `${newSize}${unit}`;
 onSizeSelect(newSize);
 });

 container.appendChild(slider);
 container.appendChild(valueDisplay);

 return container;
}

/**
 * Selection and transformation constants
 */
export const SELECTION_CONSTANTS = {
 HANDLE_SIZE: 6,
 HANDLE_COLOR: 0x3b82f6, // Brighter blue for handles
 SELECTION_COLOR: 0x3b82f6, // Brighter blue for selection
 SELECTION_ALPHA: 0.9, // More opaque selection outline
 SELECTION_LINE_WIDTH: 2,
 MARQUEE_FILL_ALPHA: 0.25, // Much more visible fill (25% instead of 10%)
 MARQUEE_STROKE_ALPHA: 0.9, // More opaque stroke
 HIT_TOLERANCE: 8,
 SNAP_TOLERANCE: 10,
};

/**
 * Pen tool constants for node-based drawing
 */
export const PEN_CONSTANTS = {
 NODE_SIZE: 4,
 NODE_COLOR: 0x5083f1,
 NODE_STROKE_WIDTH: 1,
 PATH_CLOSE_TOLERANCE: 8,
 PREVIEW_LINE_ALPHA: 0.5,
};

/**
 * Text tool constants
 */
export const TEXT_CONSTANTS = {
 MIN_TEXT_AREA_SIZE: { width: 100, height: 30 },
};

/**
 * Highlighter tool constants for authentic marker experience
 */
export const HIGHLIGHTER_CONSTANTS = {
 FIXED_OPACITY: 0.4, // Authentic marker transparency
 OVERLAP_OPACITY: 0.6, // When strokes overlap
 MIN_DISTANCE: 3, // Minimum distance between points for smoothing
 TEXTURE_VARIATION: 0.1, // Slight opacity variation for texture
 MARKER_TIP_STYLE: "round", // Always round like real markers
 STROKE_SMOOTHING: true, // Enable stroke smoothing
};
