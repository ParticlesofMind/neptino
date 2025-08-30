/**
 * Line Shape Drawer
 * Handles drawing of straight lines
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class LineDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, _fillStyle?: FillStyle): void {
        this.graphics
            .moveTo(context.startX, context.startY)
            .lineTo(context.currentX, context.currentY)
            .stroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // For lines, proportional means 45-degree angles
        const absWidth = Math.abs(context.width);
        const absHeight = Math.abs(context.height);
        const maxDim = Math.max(absWidth, absHeight);
        
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
            currentX: context.startX + (context.width >= 0 ? maxDim : -maxDim),
            currentY: context.startY + (context.height >= 0 ? maxDim : -maxDim),
        };
    }
    
    getMinimumSize(): number {
        return 1; // Lines can be very small
    }
}
