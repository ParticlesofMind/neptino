/**
 * Triangle Shape Drawer
 * Handles drawing of equilateral triangles
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class TriangleDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }

        // Equilateral triangle pointing up
        const topX = context.startX + context.width / 2;
        const topY = context.startY;
        const bottomLeftX = context.startX;
        const bottomLeftY = context.startY + context.height;
        const bottomRightX = context.startX + context.width;
        const bottomRightY = context.startY + context.height;

        this.graphics
            .moveTo(topX, topY)
            .lineTo(bottomLeftX, bottomLeftY)
            .lineTo(bottomRightX, bottomRightY)
            .closePath();

        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Equilateral triangle - width should equal height
        return {
            ...context,
            height: Math.abs(context.width) * (context.height >= 0 ? 1 : -1),
        };
    }
}
