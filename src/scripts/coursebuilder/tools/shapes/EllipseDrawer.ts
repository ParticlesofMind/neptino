/**
 * Ellipse Shape Drawer
 * Handles drawing of ellipses with different radii
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class EllipseDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const radiusX = Math.abs(context.width) / 2;
        const radiusY = Math.abs(context.height) / 2;
        
        console.log(`🔶 SHAPES: Drawing ellipse at center (${Math.round(centerX)}, ${Math.round(centerY)}) with radii ${Math.round(radiusX)}x${Math.round(radiusY)}`);
        
        this.graphics.ellipse(centerX, centerY, radiusX, radiusY);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a circle by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}
