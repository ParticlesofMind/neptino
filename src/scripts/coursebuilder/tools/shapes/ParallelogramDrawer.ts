/**
 * Parallelogram Shape Drawer
 * Handles drawing of parallelogram shapes
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class ParallelogramDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        // Create parallelogram by skewing the rectangle
        const skew = width * 0.3; // 30% skew
        
        const points: number[] = [
            x + skew, y,           // Top left (skewed)
            x + width, y,          // Top right
            x + width - skew, y + height, // Bottom right (skewed)
            x, y + height          // Bottom left
        ];
        
        this.graphics.poly(points);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Parallelogram doesn't need proportional constraints
        return context;
    }
}