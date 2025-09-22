/**
 * Circle Shape Drawer
 * Handles drawing of perfect circles
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class CircleDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        // Perfect circle using the larger dimension
        const radius = Math.max(Math.abs(context.width), Math.abs(context.height)) / 2;
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        
        
        this.graphics.circle(centerX, centerY, radius);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Circle is always proportional, no change needed
        return context;
    }
}
