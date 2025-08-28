/**
 * Graphics Quality Utility
 * Provides functions for creating high-quality graphics objects
 */

import { Graphics } from 'pixi.js';

/**
 * Create a high-quality Graphics object with optimal settings
 */
export function createHighQualityGraphics(): Graphics {
    const graphics = new Graphics();
    
    // Modern PixiJS doesn't have direct resolution property on Graphics
    // Quality is handled by the renderer resolution setting we already configured
    
    return graphics;
}

/**
 * Apply quality settings to existing graphics object  
 */
export function enhanceGraphicsQuality(graphics: Graphics): Graphics {
    // In modern PixiJS v8+, Graphics quality is primarily controlled by:
    // 1. Renderer resolution (already set in PixiApp)
    // 2. Proper coordinate alignment to avoid sub-pixel rendering
    
    return graphics;
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
