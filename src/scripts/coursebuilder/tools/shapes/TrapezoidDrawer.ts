/**
 * Trapezoid Shape Drawer
 * Handles drawing of trapezoid shapes
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class TrapezoidDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        // Create trapezoid with narrower top
        const topWidth = width * 0.6; // Top is 60% of bottom width
        const sideOffset = (width - topWidth) / 2;
        
        const points: number[] = [
            x + sideOffset, y,           // Top left
            x + sideOffset + topWidth, y, // Top right
            x + width, y + height,       // Bottom right
            x, y + height                // Bottom left
        ];
        
        this.graphics.poly(points);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Trapezoid doesn't need proportional constraints
        return context;
    }
}