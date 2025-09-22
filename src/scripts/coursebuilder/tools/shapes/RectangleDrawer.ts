/**
 * Rectangle Shape Drawer
 * Handles drawing of rectangles and rounded rectangles
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class RectangleDrawer extends BaseShapeDrawer {
    private cornerRadius: number = 0;
    
    setCornerRadius(radius: number): void {
        this.cornerRadius = Math.max(0, radius);
    }
    
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        
        if (this.cornerRadius > 0) {
            // Rounded rectangle
            this.graphics.roundRect(
                context.startX,
                context.startY,
                context.width,
                context.height,
                this.cornerRadius
            );
        } else {
            // Standard rectangle
            this.graphics.rect(
                context.startX,
                context.startY,
                context.width,
                context.height
            );
        }
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a square by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}
