/**
 * Arrow Shape Drawer
 * Handles drawing of arrows with arrowheads
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class ArrowDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, _fillStyle?: FillStyle): void {
        const dx = context.currentX - context.startX;
        const dy = context.currentY - context.startY;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);
        
        
        // Arrow head size
        const headLength = Math.min(20, length * 0.3);
        const headAngle = Math.PI / 6; // 30 degrees
        
        // Draw line
        this.graphics
            .moveTo(context.startX, context.startY)
            .lineTo(context.currentX, context.currentY)
            .stroke(strokeStyle);
        
        // Draw arrow head
        const headX1 = context.currentX - headLength * Math.cos(angle - headAngle);
        const headY1 = context.currentY - headLength * Math.sin(angle - headAngle);
        const headX2 = context.currentX - headLength * Math.cos(angle + headAngle);
        const headY2 = context.currentY - headLength * Math.sin(angle + headAngle);
        
        this.graphics
            .moveTo(context.currentX, context.currentY)
            .lineTo(headX1, headY1)
            .moveTo(context.currentX, context.currentY)
            .lineTo(headX2, headY2)
            .stroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // For arrows, proportional means 45-degree angles
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
        return 10; // Arrows need to be big enough to show the arrowhead
    }
}
