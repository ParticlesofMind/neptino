/**
 * Square Shape Drawer
 * Handles drawing of squares (always proportional rectangles)
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class SquareDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const size = Math.min(Math.abs(context.width), Math.abs(context.height));
        
        this.graphics.rect(x, y, size, size);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Square is always proportional - use the smaller dimension
        const minDim = Math.min(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? minDim : -minDim,
            height: context.height >= 0 ? minDim : -minDim,
        };
    }
}