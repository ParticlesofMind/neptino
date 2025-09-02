/**
 * Graphics Quality Utility
 * Provides functions for creating high-quality graphics objects
 */

import { Graphics, Text } from 'pixi.js';

/**
 * Create a high-quality Graphics object with optimal settings
 */
export function createHighQualityGraphics(): Graphics {
    const graphics = new Graphics();
    
    // Apply high-quality settings
    enhanceGraphicsQuality(graphics);
    
    return graphics;
}

/**
 * Apply quality settings to existing graphics object  
 */
export function enhanceGraphicsQuality(graphics: Graphics): Graphics {
    // In modern PixiJS v8+, Graphics quality is primarily controlled by:
    // 1. Renderer resolution (already set in PixiApp)
    // 2. Proper coordinate alignment to avoid sub-pixel rendering
    // 3. Anti-aliasing settings (controlled by renderer)
    
    return graphics;
}

/**
 * Create high-quality Text object with optimal settings
 */
export function createHighQualityText(text: string, style: any): Text {
    // Ensure text is rendered at high resolution
    const textObj = new Text({
        text,
        style: {
            ...style,
            // Force higher resolution for text rendering
            resolution: Math.max(window.devicePixelRatio || 1, 2)
        }
    });
    
    return textObj;
}

/**
 * Align coordinates to pixel boundaries to avoid blur
 */
export function alignToPixel(value: number): number {
    return Math.round(value);
}

/**
 * Align a point to pixel boundaries
 */
export function alignPointToPixel(x: number, y: number): { x: number; y: number } {
    return {
        x: Math.round(x),
        y: Math.round(y)
    };
}

/**
 * Align a rectangle to pixel boundaries
 */
export function alignRectToPixel(x: number, y: number, width: number, height: number): { x: number; y: number; width: number; height: number } {
    const alignedX = Math.round(x);
    const alignedY = Math.round(y);
    return {
        x: alignedX,
        y: alignedY,
        width: Math.round(x + width) - alignedX,
        height: Math.round(y + height) - alignedY
    };
}

/**
 * Scale stroke width appropriately for zoom level
 * Prevents stroke widths from becoming too thick when zoomed in via CSS transforms
 */
export function getScaledStrokeWidth(originalWidth: number, zoomLevel: number): number {
    // If using CSS transforms for zoom, we need to compensate
    // by reducing the stroke width proportionally
    return Math.max(0.5, originalWidth / zoomLevel);
}

/**
 * Apply high-quality settings to graphics based on current zoom level
 */
export function optimizeGraphicsForZoom(graphics: Graphics, zoomLevel: number): Graphics {
    // For very high zoom levels, we might want to adjust rendering settings
    if (zoomLevel > 1.5) {
        // Apply additional quality enhancements for high zoom
        enhanceGraphicsQuality(graphics);
    }
    
    return graphics;
}
