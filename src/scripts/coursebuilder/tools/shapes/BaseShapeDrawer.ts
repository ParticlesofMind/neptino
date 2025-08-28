/**
 * Base Shape Drawer
 * Abstract base class for all shape drawing implementations
 */

import { Graphics } from "pixi.js";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export abstract class BaseShapeDrawer {
    protected graphics: Graphics;
    
    constructor(graphics: Graphics) {
        this.graphics = graphics;
    }
    
    /**
     * Draw the shape with the given context and styles
     */
    abstract draw(
        context: ShapeDrawingContext, 
        strokeStyle: StrokeStyle, 
        fillStyle?: FillStyle
    ): void;
    
    /**
     * Apply proportional constraints to the drawing context
     */
    abstract applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext;
    
    /**
     * Get the minimum size required for the shape to be visible
     */
    getMinimumSize(): number {
        return 5;
    }
    
    /**
     * Check if the shape dimensions are valid for drawing
     */
    protected isValidSize(context: ShapeDrawingContext): boolean {
        const minSize = this.getMinimumSize();
        return Math.abs(context.width) >= minSize && Math.abs(context.height) >= minSize;
    }
    
    /**
     * Apply fill style to the graphics object
     */
    protected applyFill(fillStyle?: FillStyle): void {
        if (fillStyle) {
            this.graphics.fill(fillStyle);
        }
    }
    
    /**
     * Apply stroke style to the graphics object
     */
    protected applyStroke(strokeStyle: StrokeStyle): void {
        this.graphics.stroke(strokeStyle);
    }
}
