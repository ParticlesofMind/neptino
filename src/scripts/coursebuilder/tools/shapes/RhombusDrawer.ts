/**
 * Rhombus Shape Drawer
 * Handles drawing of rhombus (diamond) shapes
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class RhombusDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const halfWidth = Math.abs(context.width) / 2;
        const halfHeight = Math.abs(context.height) / 2;
        
        const points: number[] = [
            centerX, centerY - halfHeight, // Top
            centerX + halfWidth, centerY, // Right
            centerX, centerY + halfHeight, // Bottom
            centerX - halfWidth, centerY  // Left
        ];
        
        this.graphics.poly(points);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a square rhombus by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}